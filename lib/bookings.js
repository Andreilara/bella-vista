// Business-logic layer shared by the API routes. Every write runs inside one DB transaction.
import crypto from 'node:crypto';
import {mailConfigured,sendMail} from './mail.js';
import * as MAIL from './mailTemplates.js';
import {getContact} from './settings.js';
import {TYPES,EVENTS,PENDING_MS,quote,validate,validGuest,normalizePhone,isFree,cancelInfo,today,fmt,expired,checkoutReached} from './rules.js';
import {tx,token,newRef,activeBookings,conflictingUnit,getBooking,getGroup,findForGuest,insertBookings,findActiveByEmail,setGroupStatus,markCancelled,updateBookingRow,audit,reviewFor,insertReview,getDb,insertEntry,ledgerFor,groupMoney} from './db.js';

const STATUSES=['pending','confirmed','cancelled','completed'],KINDS=['payment','refund','charge'],METHODS=['Cash','GCash','Bank transfer','Other'],SOURCES=['walk-in','phone'];
const clean=(s,n)=>String(s??'').trim().slice(0,n),sum=(a,k)=>a.reduce((s,r)=>s+r[k],0);
class Stop extends Error{constructor(e){super(e.error);this.e=e}}   // aborts a transaction with a user-facing error

/** What a booking group owes and has paid. balance = total + fines/charges - paid. */
export const totalsOf=(rows,m={paid:0,charges:0})=>{const total=sum(rows,'total'),down=sum(rows,'down');return{total,down,charges:m.charges,paid:m.paid,due:total+m.charges,balance:total+m.charges-m.paid,downShort:Math.max(0,down-m.paid)}};

// ---- creating reservations ----
function createIn(b,{actor='guest',source='online',staff=false}={}){
 const e0=validGuest(b,{staff});if(e0)return{error:e0};
 const items=[{type:b.type,unit:b.unit,guests:b.guests}];
 if(Array.isArray(b.rooms)&&b.rooms.length){
  if(b.type!=='hall')return{error:'Extra rooms can only be added to an Event Hall booking.'};
  if(b.rooms.length>6)return{error:'You can add up to 6 rooms to an event.'};
  for(const r of b.rooms){if(!r||!['std','fam'].includes(r.type))return{error:'Choose a valid room to add.'};items.push({type:r.type,unit:r.unit,guests:r.guests})}}
 const units=new Set();
 for(const item of items){
  const error=validate({...item,in:b.in,out:b.out});
  if(error)return{error};
  if(units.has(item.unit))return{error:'That unit is already booked for these dates.'};
  units.add(item.unit);
 }
 const d=getDb();
 if(conflictingUnit(d,[...units],b.in,b.out))return{error:'That unit is already booked for these dates.'};
 const ref=newRef(),tk=token(),at=Date.now(),rows=items.map((it,i)=>{const g=Number(it.guests),q=quote(it.type,g,b.in,b.out);
  return{id:i?`${ref}-${i}`:ref,group:ref,token:tk,type:it.type,unit:it.unit,in:b.in,out:b.out,guests:g,name:clean(b.name,80),email:clean(b.email,120),phone:staff?clean(b.phone,30):normalizePhone(b.phone),total:q.total,down:q.down,status:'pending',source,event:i||b.type!=='hall'||!EVENTS.includes(b.event)?'':b.event,notes:i?'':clean(b.notes,500),at}});
 insertBookings(d,rows);
 const total=sum(rows,'total'),down=sum(rows,'down');
 audit(actor,'booking.created',ref,`${source} | ${rows.map(r=>r.unit).join(', ')} | ${b.in} to ${b.out} | ${rows[0].name} | total ${total}`);
 return{id:ref,token:tk,total,down,dueBy:at+PENDING_MS,in:b.in,out:b.out,unit:rows[0].unit,status:'pending',items:rows.map(r=>({id:r.id,unit:r.unit,type:r.type,total:r.total,down:r.down}))}}
/** Email a guest about their booking. Never throws and never blocks the request: a mail problem must not undo a booking. */
export function notify(kind,group){
 if(!mailConfigured())return Promise.resolve();
 return Promise.resolve().then(()=>{const s=summarize(getGroup(group));if(!s||!s.email)return;return sendMail({to:s.email,...MAIL[kind](s,getContact())})}).catch(e=>console.error('notify failed',e));}
export const createReservation=(b,o)=>{
 const r=tx(()=>createIn(b,o));
 if(r.id&&!o?.staff&&(o?.source||'online')==='online'){
  r.emailing=mailConfigured();
  if(r.emailing){
   const deliver=()=>notify('received',r.id);
   if(o?.scheduleNotification)o.scheduleNotification(deliver);
   else void deliver();
  }
 }
 return r};
/** Re-send a guest their upcoming booking references. Same answer whether or not the address has bookings, so it cannot be used to probe for guests. */
export async function recoverReferences(email){
 if(!mailConfigured())return{ok:false,reason:'off'};
 const rows=findActiveByEmail(email);if(!rows.length)return{ok:true};
 const groups=[...new Set(rows.map(r=>r.group))],list=groups.map(g=>summarize(getGroup(g))).filter(Boolean);
 await sendMail({to:String(email).trim(),...MAIL.recover(list,getContact())});return{ok:true}}

// ---- status changes ----
function statusIn(id,status,actor){
 if(!STATUSES.includes(status))return{error:'Invalid status',code:400};
 const b=getBooking(id);if(!b)return{error:'Not found',code:404};
 if(status===b.status)return{ok:true,changed:false,booking:b};
 const allowed={pending:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
 if(!allowed[b.status]?.includes(status))return{error:'That status change is not available.',code:400};
 if(status==='confirmed'&&expired(b))return{error:'The hold expired. Create a new reservation for available dates.',code:400};
 if(status==='completed'&&!checkoutReached(b.out))return{error:'A stay can only be completed from 12:00 noon on the check-out date.',code:400};
 const rows=getGroup(b.group),t=totalsOf(rows,groupMoney(b.group));
 if(status==='confirmed'&&b.status!=='confirmed'&&t.downShort>0)return{error:`Record the downpayment first: ${fmt(t.downShort)} still to receive.`,code:400};
 if(!['cancelled'].includes(status)){const others=activeBookings().filter(x=>x.group!==b.group);
  if(status!=='completed')for(const r of rows)if(!isFree(r.unit,r.in,r.out,others))return{error:`${r.unit} is now booked by another guest.`,code:409}}
 const from=b.status;setGroupStatus(getDb(),b.group,status);
 if(status==='cancelled')markCancelled(getDb(),b.group,cancelInfo(b).refundable);
 audit(actor,'booking.status',b.group,`${from} to ${status}${rows.length>1?` (${rows.length} units)`:''}`);
 return{ok:true,changed:from!==status,booking:getBooking(id)}}
export const changeStatus=(id,status,actor='admin')=>{const r=tx(()=>statusIn(id,status,actor));if(r.ok&&r.changed&&status==='confirmed')void notify('confirmed',r.booking.group);return r};

// ---- payments, refunds and charges ----
function entryIn(id,e,actor){
 const b=getBooking(id);if(!b)return{error:'Not found',code:404};
 if(!KINDS.includes(e.kind))return{error:'Choose payment, refund or charge.',code:400};
 const amount=Number(e.amount);if(!Number.isInteger(amount)||amount<1||amount>1e7)return{error:'Enter a whole-peso amount greater than zero.',code:400};
 const method=clean(e.method,30),ref=clean(e.ref,60),note=clean(e.note,200);
 if(e.kind!=='charge'&&!METHODS.includes(method))return{error:'Choose how it was paid.',code:400};
 if(e.kind==='charge'&&!note)return{error:'Describe the charge, for example "No-smoking fine".',code:400};
 if(e.kind==='payment'&&b.status==='cancelled')return{error:'This booking is cancelled. Record a refund instead.',code:400};
 if(e.kind==='payment'&&expired(b))return{error:'The hold expired. Create a new reservation before recording payment.',code:400};
 if(e.kind==='charge'&&!['confirmed','completed'].includes(b.status))return{error:'Charges can be added once a booking is confirmed.',code:400};
 const m=groupMoney(b.group);if(e.kind==='refund'&&amount>m.paid)return{error:`Only ${fmt(m.paid)} has been received, so it cannot be refunded.`,code:400};
 insertEntry(getDb(),{group:b.group,kind:e.kind,amount,method:e.kind==='charge'?'':method,ref,note,by:actor});
 audit(actor,'ledger.'+e.kind,b.group,`${fmt(amount)}${method&&e.kind!=='charge'?' via '+method:''}${ref?' ref '+ref:''}${note?' | '+note:''}`);
 return{ok:true}}
/** Record money in/out or a charge. With confirm:true, a pending booking is confirmed once the downpayment is covered. */
export const addEntry=(id,e,actor='admin')=>{const r=addEntryTx(id,e,actor);if(r.confirmed)void notify('confirmed',getBooking(id).group);return r};
const addEntryTx=(id,e,actor)=>tx(()=>{
 const r=entryIn(id,e,actor);if(r.error)return r;
 let confirmed=false;const b=getBooking(id);
 if(e.confirm&&e.kind==='payment'&&b.status==='pending'){const s=statusIn(id,'confirmed',actor);confirmed=!!s.ok;if(s.error&&s.code===409)return{ok:true,confirmed:false,warning:s.error}}
 return{ok:true,confirmed}});

// ---- staff-created bookings (walk-in / phone), optional first payment ----
export function walkIn(b,actor){
 try{return tx(()=>{
  const r=createIn(b,{actor,source:SOURCES.includes(b.source)?b.source:'walk-in',staff:true});if(r.error)return r;
  const p=b.payment;if(p&&Number(p.amount)>0){const x=entryIn(r.id,{...p,kind:'payment'},actor);if(x.error)throw new Stop(x);
   const s=statusIn(r.id,'confirmed',actor);if(s.ok)r.status='confirmed'}
  return r})}catch(e){if(e instanceof Stop)return e.e;throw e}}

// ---- rescheduling (new dates, or a different unit for a single-unit booking) ----
export const reschedule=(id,{in:a,out,unit},actor='admin')=>tx(()=>{
 const b=getBooking(id);if(!b)return{error:'Not found',code:404};
 if(!['pending','confirmed'].includes(b.status))return{error:'Only pending or confirmed bookings can be rescheduled.',code:400};
 if(expired(b))return{error:'The hold expired. Create a new reservation for available dates.',code:400};
 const rows=getGroup(b.group),others=activeBookings().filter(x=>x.group!==b.group),changes=[],acc=[],d=getDb();
 for(const r of rows){const u=rows.length===1&&unit?unit:r.unit,e=validate({type:r.type,unit:u,in:a,out,guests:r.guests},[...others,...acc]);
  if(e)return{error:e,code:/booked/.test(e)?409:400};acc.push({unit:u,in:a,out,status:'pending'});
  const q=quote(r.type,r.guests,a,out);changes.push({id:r.id,unit:u,in:a,out,total:q.total,down:q.down})}
 const shortfall=sum(changes,'down')-groupMoney(b.group).paid;
 if(b.status==='confirmed'&&shortfall>0)return{error:`Record the additional downpayment first: ${fmt(shortfall)} still to receive.`,code:400};
 for(const change of changes)updateBookingRow(d,change.id,change);
 audit(actor,'booking.rescheduled',b.group,`${b.in} to ${b.out}  ->  ${a} to ${out}${rows.length===1&&unit&&unit!==b.unit?`, unit ${b.unit} to ${unit}`:''}`);
 return{ok:true}});

// ---- reading ----
export function detail(id){
 const b=getBooking(id);if(!b)return null;const rows=getGroup(b.group),m=groupMoney(b.group),p=rows.find(r=>r.id===r.group)||rows[0],t=totalsOf(rows,m);
 return{group:b.group,rows:rows.map(({token,...r})=>r),ledger:ledgerFor(b.group),totals:t,status:p.status,
  refund:p.status==='cancelled'&&t.paid>0?{amount:t.paid,refundable:!!p.refundable}:null}}

/** Shape a booking group for the guest-facing lookup and voucher. */
export function summarize(rows){
 if(!rows.length)return null;
 const p=rows.find(r=>r.id===r.group)||rows[0],t=totalsOf(rows,groupMoney(p.group)),rv=reviewFor(p.group),charges=ledgerFor(p.group).filter(x=>x.kind==='charge');
 const status=expired(p)?'expired':p.status;
 return{id:p.group,token:p.token,status,name:p.name,email:p.email,phone:p.phone,in:p.in,out:p.out,event:p.event,notes:p.notes,created:p.at,
  total:t.total,down:t.down,paid:t.paid,charges:charges.map(c=>({label:c.note,amount:c.amount})),chargesTotal:t.charges,balance:t.balance,downReceived:t.downShort===0,
  units:rows.map(r=>({id:r.id,unit:r.unit,type:r.type,typeName:TYPES[r.type].name,guests:r.guests,total:r.total})),
  cancel:['pending','confirmed'].includes(status)?cancelInfo(p):null,canCancel:['pending','confirmed'].includes(status)&&p.in>=today(),
  refund:p.status==='cancelled'&&t.paid>0?{amount:t.paid,refundable:!!p.refundable}:null,
  dueBy:status==='pending'?p.at+PENDING_MS:null,canReview:status==='completed'&&!rv,review:rv?{rating:rv.rating,text:rv.text,status:rv.status}:null}}

export const lookup=(ref,email)=>summarize(findForGuest(ref,email));
export function voucher(ref,tk){
 const rows=getGroup(String(ref).toUpperCase());if(!rows.length)return null;
 const a=Buffer.from(String(tk||'')),b=Buffer.from(rows[0].token);
 return a.length===b.length&&crypto.timingSafeEqual(a,b)?summarize(rows):null}

/** A guest cancels online. Refundable if made at least 3 days before check-in (the hotel then arranges the refund). */
export function cancelByGuest(ref,email){
 const rows=findForGuest(ref,email);if(!rows.length)return{error:'No booking found for that reference and email.',code:404};
 const p=rows.find(r=>r.id===r.group)||rows[0];
 if(expired(p)||!['pending','confirmed'].includes(p.status))return{error:'This booking can no longer be cancelled online.',code:400};
 if(p.in<today())return{error:'This stay has already started. Please contact the hotel.',code:400};
 const r=changeStatus(p.id,'cancelled','guest');if(r.error)return r;
 audit('guest','booking.guest_cancelled',p.group,cancelInfo(p).refundable?'refundable (3+ days before check-in)':'non-refundable (under 3 days)');
 return{ok:true,summary:lookup(ref,email)}}

export function submitReview({id,email,rating,text}){
 const s=lookup(id,email);if(!s)return{error:'No booking found for that reference and email.',code:404};
 if(s.status!=='completed')return{error:'You can review your stay once it is completed.',code:400};
 if(s.review)return{error:'You have already reviewed this stay. Thank you!',code:409};
 const r=Number(rating),t=clean(text,600);
 if(!Number.isInteger(r)||r<1||r>5)return{error:'Choose a rating from 1 to 5.',code:400};
 if(t.length<10)return{error:'Please write at least a short sentence (10 characters).',code:400};
 const [first,...rest]=s.name.split(/\s+/),name=rest.length?`${first} ${rest[rest.length-1][0].toUpperCase()}.`:first;
 const review={rating:r,text:t,status:'pending'};
 insertReview({booking:s.id,name,...review});audit('guest','review.submitted',s.id,`${r} stars`);
 return{ok:true,review}}
