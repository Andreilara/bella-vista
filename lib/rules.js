export const TYPES={std:{name:'Standard Room',units:['Room A','Room B','Room C'],rate:3500,min:2,max:3},fam:{name:'Family Room',units:['FR1','FR2','FR3'],rate:6000,min:4,max:5},hall:{name:'Event Hall',units:['Event Hall'],rate:15000,min:1,max:40}};
export const fmt=n=>'₱'+Number(n).toLocaleString('en-PH');
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'});
export const addDays=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const nightsBetween=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
export const extraFee=(t,g)=>t==='std'&&g>2?1000:t==='hall'&&g>30?(g-30)*500:0;
export function quote(t,g,a,b){const n=Math.max(0,nightsBetween(a,b))||0,e=extraFee(t,g),total=(TYPES[t].rate+e)*n;return{n,extra:e*n,base:TYPES[t].rate*n,total,down:Math.ceil(total/2)}}
export const isDateKey=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export const checkoutReached=(date,now=Date.now())=>now>=Date.parse(date+'T12:00:00+08:00');
export const isFree=(unit,a,b,list)=>!list.some(x=>x.unit===unit&&x.status!=='cancelled'&&x.in<b&&a<x.out);
export const PENDING_MS=48*36e5;
export const EVENTS=['Wedding','Reunion','Corporate','Birthday','Other'];
export const expired=b=>b.status==='pending'&&Date.now()-b.at>PENDING_MS;
export const live=a=>a.filter(x=>x.status!=='cancelled'&&!expired(x));
// Policy: cancellations made less than 3 days before check-in are non-refundable.
export const cancelInfo=b=>{const lastFreeDay=addDays(b.in,-3);return{lastFreeDay,refundable:nightsBetween(today(),lastFreeDay)>=0}};
export const MAX_STAY_NIGHTS=30, MAX_ADVANCE_DAYS=365;
export function dateProblem(a,b,t=today()){
 if(!isDateKey(a)||!isDateKey(b))return'Choose your dates.';
 if(a<t)return'Check-in cannot be in the past.';
 const nights=nightsBetween(a,b);
 if(nights<1)return'Check-out (12:00 NN) must fall after check-in (2:00 PM).';
 if(nights>MAX_STAY_NIGHTS)return'Stays are limited to 30 nights. Please contact us for longer.';
 if(a>addDays(t,MAX_ADVANCE_DAYS))return'Bookings open up to one year ahead.';
 return'';
}
export function capacityProblem(type,guests){
 const room=Object.hasOwn(TYPES,type)?TYPES[type]:null;
 if(!room)return 'Choose a room type.';
 if((typeof guests==='number'||(typeof guests==='string'&&/^\d+$/.test(guests)))&&
    Number.isInteger(Number(guests))&&Number(guests)>=room.min&&Number(guests)<=room.max)return '';
 return `Enter a whole number from ${room.min} to ${room.max} for ${room.name}.`;
}
export function validate(b,ex=[]){const T=Object.hasOwn(TYPES,b.type)?TYPES[b.type]:null;if(!T)return'Choose a room type.';
 const problem=dateProblem(b.in,b.out);if(problem)return problem;
 const capacity=capacityProblem(b.type,b.guests);if(capacity)return capacity;
 if(!T.units.includes(b.unit))return'Choose an available unit.';
 if(!isFree(b.unit,b.in,b.out,ex))return'That unit is already booked for these dates.';return''}
// ---- contact details: one definition shared by the booking form and the server ----
const EMAIL=/^[A-Za-z0-9_%+-](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
export const validEmail=s=>{s=String(s??'').trim();return s.length<=120&&EMAIL.test(s)&&!s.includes('..')};
/** A short, friendly hint about what is still missing from an email address ('' when it is valid or empty). */
export function emailProblem(v){v=String(v??'');if(!v||validEmail(v))return'';const at=v.indexOf('@');
 if(at<0)return'Add an @ and your email provider, like example@gmail.com.';if(at===0)return'Add your name before the @, like example@gmail.com.';
 const d=v.slice(at+1);if(!d)return'Add the domain after the @, like gmail.com.';if(!d.includes('.'))return'Finish the domain, like gmail.com.';
 if(/^\.|\.\.|\.$/.test(d)||!/[A-Za-z]{2,}$/.test(d))return'End the domain properly, like .com.';return'Use a valid format, like example@gmail.com.'}
/** Typing/paste cleanup for an email field: keeps only characters an email can contain, and a single @. */
export function cleanEmail(raw){const s=String(raw??''),o=s.replace(/[^A-Za-z0-9._%+\-@]/g,''),i=o.indexOf('@'),v=(i<0?o:o.slice(0,i+1)+o.slice(i+1).replace(/@/g,'')).slice(0,120);return{v,changed:v!==s}}
/** Typing/paste cleanup for the 10 digits that follow +63: digits only, no leading 0, no pasted +63, max 10. `why` says what was fixed. */
export function cleanPhone(raw){let d=String(raw??''),chars=false,prefix=false,zero=false,long=false;const only=d.replace(/\D/g,'');chars=only.length!==d.length;d=only;
 if(d.startsWith('63')&&(d.length>10||/^\s*\+\s*63/.test(String(raw)))){d=d.slice(2);prefix=true}if(d.startsWith('0')){d=d.replace(/^0+/,'');zero=true}if(d.length>10){d=d.slice(0,10);long=true}
 return{v:d,why:prefix?'prefix':zero?'zero':long?'long':chars?'chars':''}}
/** '+63 9123456789' for any way a Philippine mobile number may be written (9123456789, 09123456789, +63 912 345 6789); '' if it is not 10 digits after +63. */
export function normalizePhone(raw){const{v}=cleanPhone(raw);return v.length===10?'+63 '+v:''}
export const validGuest=(b,o={})=>{
 if(typeof b.name!=='string'||!b.name.trim())return'Please enter your full name.';
 const em=String(b.email||'').trim();if(!(o.staff&&!em)&&!validEmail(em))return'Enter a valid email address, like example@gmail.com.';
 if(o.staff){if(String(b.phone||'').replace(/\D/g,'').length<7)return'Enter a valid mobile number.'}
 else if(!normalizePhone(b.phone))return'Enter a 10-digit mobile number after +63, like 9123456789.';
 return''};
