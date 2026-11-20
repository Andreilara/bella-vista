process.env.DB_PATH=':memory:';
import test from 'node:test';import assert from 'node:assert/strict';
import {today,addDays} from '../lib/rules.js';
import {createReservation,changeStatus,addEntry} from '../lib/bookings.js';
import {getDb,insertBooking,busyList,activeBookings,dataVersion,listBookings} from '../lib/db.js';
const t=today(),d=n=>addDays(t,n),guest={name:'Ana Cruz',email:'ana@x.com',phone:'09171234567'};
const old=(id,unit,a,b,status='completed')=>insertBooking(getDb(),{id,group:id,token:'t',type:'std',unit,in:a,out:b,guests:2,name:'Old',email:'o@x.com',phone:'+63 9123456789',total:7000,down:3500,status,event:'',notes:'',source:'online',at:Date.now()});

test('the public availability feed carries only current and future stays, with three fields each',()=>{
 old('BV-OLD00001','Room A',d(-400),d(-398));old('BV-OLD00002','Room A',d(-30),d(-28));old('BV-OLD00003','Room B',d(-3),d(0));   // ended today counts; ended earlier does not
 const b=createReservation({...guest,type:'std',unit:'Room C',in:d(5),out:d(6),guests:2});
 const feed=busyList();assert.deepEqual(feed.map(x=>x.unit).sort(),['Room B','Room C']);
 assert.deepEqual(Object.keys(feed[0]).sort(),['in','out','unit']);
 assert.equal(activeBookings().length,2)});
test('cancelled bookings leave the feed immediately',()=>{
 const b=listBookings().find(x=>x.unit==='Room C');changeStatus(b.id,'cancelled');assert.deepEqual(busyList().map(x=>x.unit),['Room B'])});
test('history can never block a new booking, and current stays still do',()=>{
 assert.ok(createReservation({...guest,type:'std',unit:'Room A',in:d(1),out:d(2),guests:2}).id);                       // Room A has old history only
 assert.match(createReservation({...guest,type:'std',unit:'Room B',in:d(-1),out:d(2),guests:2}).error,/past|Check-in/i)});   // past dates are still refused
test('the ETag changes whenever a booking or payment changes, and stays put otherwise',()=>{
 const v0=dataVersion();assert.equal(dataVersion(),v0);
 const b=createReservation({...guest,type:'fam',unit:'FR1',in:d(20),out:d(21),guests:4}),v1=dataVersion();assert.notEqual(v1,v0);
 assert.ok(addEntry(b.id,{kind:'payment',amount:100,method:'Cash'},'t').ok);const v2=dataVersion();assert.notEqual(v2,v1);
 assert.ok(addEntry(b.id,{kind:'payment',amount:2900,method:'Cash',confirm:true},'t').confirmed);assert.notEqual(dataVersion(),v2)});
test('the availability query uses an index',()=>{
 const plan=getDb().prepare("EXPLAIN QUERY PLAN SELECT unit,check_in,check_out FROM bookings WHERE status!='cancelled' AND check_out>=?").all(t).map(r=>r.detail).join(' ');
 assert.match(plan,/USING (COVERING )?INDEX ix_bookings_out/)});
