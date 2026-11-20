process.env.DB_PATH=':memory:';
import test from 'node:test';import assert from 'node:assert/strict';
import {today,addDays} from '../lib/rules.js';
import {createReservation,changeStatus,addEntry,walkIn,reschedule,cancelByGuest,lookup,detail} from '../lib/bookings.js';
import {listBookings,ledgerTotals,listAudit} from '../lib/db.js';import {report,toCsv} from '../lib/reports.js';
const t=today(),d=n=>addDays(t,n),guest={name:'Ana Cruz',email:'ana@x.com',phone:'09171234567'};
const book=o=>createReservation({...guest,type:'std',unit:'Room A',in:d(20),out:d(22),guests:2,...o});
const pay=(id,amount,o={})=>addEntry(id,{kind:'payment',amount,method:'GCash',ref:'GC-1',...o},'maria');

test('a booking cannot be confirmed until the downpayment is received',()=>{
 const b=book();assert.equal(b.down,3500);
 assert.match(changeStatus(b.id,'confirmed').error,/3,500/);
 assert.ok(pay(b.id,1000).ok);assert.match(changeStatus(b.id,'confirmed').error,/2,500/);
 assert.ok(pay(b.id,2500).ok);assert.ok(changeStatus(b.id,'confirmed').ok);
 const x=detail(b.id);assert.equal(x.totals.paid,3500);assert.equal(x.totals.balance,3500);assert.equal(x.ledger.length,2)});
test('recording the downpayment with "confirm" confirms the booking in the same step',()=>{
 const b=book({unit:'Room B'});const r=pay(b.id,3500,{confirm:true});assert.equal(r.confirmed,true);assert.equal(detail(b.id).status,'confirmed');
 const c=book({unit:'Room C'});assert.equal(pay(c.id,100,{confirm:true}).confirmed,false);assert.equal(detail(c.id).status,'pending')});
test('payment, refund and charge validation',()=>{
 const b=book({unit:'FR1',type:'fam',guests:4,in:d(30),out:d(31)});
 assert.ok(pay(b.id,0).error);assert.ok(pay(b.id,-5).error);assert.ok(pay(b.id,10.5).error);assert.ok(addEntry(b.id,{kind:'payment',amount:100,method:'Bitcoin'},'m').error);
 assert.ok(addEntry(b.id,{kind:'bogus',amount:100,method:'Cash'},'m').error);assert.equal(addEntry('BV-NOPE',{kind:'payment',amount:1,method:'Cash'},'m').code,404);
 assert.match(addEntry(b.id,{kind:'charge',amount:2000,note:'No-smoking fine'},'m').error,/confirmed/);   // not confirmed yet
 pay(b.id,3000);changeStatus(b.id,'confirmed');
 assert.ok(addEntry(b.id,{kind:'charge',amount:2000},'m').error);                                        // needs a description
 assert.ok(addEntry(b.id,{kind:'charge',amount:2000,note:'No-smoking fine'},'m').ok);
 const x=detail(b.id).totals;assert.equal(x.charges,2000);assert.equal(x.balance,6000+2000-3000);
 assert.match(addEntry(b.id,{kind:'refund',amount:5000,method:'Cash'},'m').error,/Only/);
 assert.ok(addEntry(b.id,{kind:'refund',amount:500,method:'Cash',note:'overpaid'},'m').ok);assert.equal(detail(b.id).totals.paid,2500)});
test('cancelling records whether it was refundable, and shows what was paid',()=>{
 const far=book({unit:'Room A',in:d(40),out:d(41)});pay(far.id,3500,{confirm:true});changeStatus(far.id,'cancelled','maria');
 let x=detail(far.id);assert.deepEqual(x.refund,{amount:3500,refundable:true});
 const near=book({unit:'Room A',in:d(2),out:d(3)});pay(near.id,3500,{confirm:true});changeStatus(near.id,'cancelled','maria');
 assert.deepEqual(detail(near.id).refund,{amount:3500,refundable:false});
 assert.ok(addEntry(far.id,{kind:'refund',amount:3500,method:'GCash'},'maria').ok);assert.equal(detail(far.id).refund,null);
 assert.match(pay(far.id,10).error,/cancelled/)});
test('guest self-cancellation: refundable flag, once only, never after the stay started',()=>{
 const b=book({unit:'Room C',in:d(15),out:d(16)});pay(b.id,3500,{confirm:true});
 assert.equal(cancelByGuest(b.id,'wrong@x.com').code,404);
 const r=cancelByGuest(b.id.toLowerCase(),'ANA@x.com');assert.equal(r.summary.status,'cancelled');assert.deepEqual(r.summary.refund,{amount:3500,refundable:true});
 assert.match(cancelByGuest(b.id,guest.email).error,/no longer/);
 assert.ok(listAudit({q:'guest_cancelled'}).length>=1);
 const near=book({unit:'Room C',in:d(1),out:d(2)});assert.equal(cancelByGuest(near.id,guest.email).summary.refund,null);   // unpaid pending
 assert.equal(lookup(near.id,guest.email).status,'cancelled')});
test('reschedule: new dates re-priced, conflicts refused, packages move together',()=>{
 const b=book({unit:'Room A',in:d(50),out:d(52)}),other=book({unit:'Room A',in:d(60),out:d(62)});
 assert.equal(reschedule(b.id,{in:d(61),out:d(63)}).code,409);
 assert.ok(reschedule(b.id,{in:d(50),out:d(53)},'maria').ok);let r=listBookings().find(x=>x.id===b.id);assert.equal(r.total,10500);assert.equal(r.down,5250);
 assert.ok(reschedule(b.id,{in:d(50),out:d(53),unit:'Room B'}).ok);assert.equal(listBookings().find(x=>x.id===b.id).unit,'Room B');
 assert.ok(reschedule(b.id,{in:d(-3),out:d(-1)}).error);assert.ok(reschedule(b.id,{in:d(5),out:d(4)}).error);
 const h=createReservation({...guest,type:'hall',unit:'Event Hall',in:d(70),out:d(71),guests:30,rooms:[{type:'fam',unit:'FR2',guests:4}]});
 assert.ok(reschedule(h.id,{in:d(72),out:d(73)}).ok);assert.ok(listBookings().filter(x=>x.group===h.id).every(x=>x.in===d(72)&&x.out===d(73)));
 changeStatus(other.id,'cancelled');assert.match(reschedule(other.id,{in:d(80),out:d(81)}).error,/pending or confirmed/)});
test('walk-in bookings: no email needed, optional payment confirms, a bad payment rolls everything back',()=>{
 const w=walkIn({name:'Walk In',email:'',phone:'09170000000',type:'std',unit:'Room C',in:t,out:d(1),guests:2,source:'walk-in',payment:{amount:3500,method:'Cash'}},'maria');
 assert.equal(w.status,'confirmed');assert.equal(listBookings().find(x=>x.id===w.id).source,'walk-in');
 const before=listBookings().length;
 assert.ok(walkIn({name:'X Y',email:'',phone:'09170000000',type:'std',unit:'Room A',in:d(90),out:d(91),guests:2,payment:{amount:100,method:'Nope'}},'maria').error);
 assert.equal(listBookings().length,before);
 const ph=walkIn({name:'Phone Guest',email:'',phone:'09170000001',type:'fam',unit:'FR3',in:d(91),out:d(92),guests:4,source:'phone'},'maria');assert.equal(ph.status,'pending');
 assert.ok(walkIn({name:'',email:'',phone:'09170000001',type:'fam',unit:'FR3',in:d(95),out:d(96),guests:4},'maria').error)});
test('reports count money collected, fines and what is still owed',()=>{
 const m=ledgerTotals(),rows=listBookings(),y=t.slice(0,4);
 const r=report(rows,y+'-01-01',addDays(t,400).slice(0,4)+'-12-31',m);
 assert.ok(r.totals.collected>0);assert.ok(r.totals.fines>=2000);assert.ok(r.totals.outstanding>0);
 const csv=toCsv(rows.filter(x=>x.type==='fam'),m);assert.match(csv,/Paid \(package\)/);assert.match(csv,/,2500,2000,/)});
test('the ledger is audited with the staff member who did it',()=>{
 const a=listAudit({q:'ledger.payment'});assert.ok(a.length>3);assert.ok(a.every(x=>x.actor==='maria'||x.actor==='tester'||x.actor))});
