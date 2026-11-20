process.env.DB_PATH=':memory:';
import test from 'node:test';import assert from 'node:assert/strict';
import {today,addDays,TYPES,capacityProblem,checkoutReached} from '../lib/rules.js';
import {createReservation,changeStatus,lookup,voucher,submitReview,addEntry,reschedule} from '../lib/bookings.js';
import {listBookings,busyList,listAudit,approvedReviews,updateReview,allReviews,getDb,getGroup,findActiveByEmail} from '../lib/db.js';
import {report,toCsv} from '../lib/reports.js';
import {rangeFrom} from '../lib/range.js';
import {qrMatrix} from '../lib/qr.js';
const t=today(),d=n=>addDays(t,n),guest={name:'Maria Santos',email:'Maria@Mail.com',phone:'09171234567'};
const pay=(id,amount,m='Cash')=>addEntry(id,{kind:'payment',amount,method:m},'tester');
const book=(o)=>createReservation({...guest,type:'std',unit:'Room A',in:d(10),out:d(12),guests:3,...o});

test('creates a booking with correct pricing and a reference',()=>{
 const r=book();assert.match(r.id,/^BV-[0-9A-F]{8}$/);assert.equal(r.total,9000);assert.equal(r.down,4500);assert.equal(listBookings().length,1)});
test('double booking is rejected, same-day turnover is allowed',()=>{
 assert.match(book({in:d(11),out:d(13)}).error,/already booked/);
 assert.ok(book({in:d(12),out:d(13)}).id);assert.equal(busyList().filter(b=>b.unit==='Room A').length,2)});
test('guest details and bad input are validated',()=>{
 assert.ok(book({name:''}).error);assert.ok(book({email:'nope'}).error);assert.ok(book({guests:4}).error);assert.ok(book({type:'zzz'}).error)});
test('event package: hall + rooms share one group, totals add up',()=>{
 const r=createReservation({...guest,type:'hall',unit:'Event Hall',in:d(30),out:d(31),guests:35,event:'Wedding',notes:'Garden setup',rooms:[{type:'fam',unit:'FR1',guests:4},{type:'std',unit:'Room B',guests:2}]});
 assert.equal(r.items.length,3);assert.equal(r.total,17500+6000+3500);assert.equal(r.down,8750+3000+1750);
 const rows=listBookings().filter(b=>b.group===r.id);assert.equal(rows.length,3);assert.equal(rows.find(x=>x.type==='hall').event,'Wedding');assert.equal(rows.find(x=>x.type==='hall').notes,'Garden setup')});
test('package rules: rooms only with the hall, no duplicate units, max 6',()=>{
 assert.match(book({unit:'Room C',rooms:[{type:'fam',unit:'FR1',guests:4}]}).error,/Event Hall/);
 const h={type:'hall',unit:'Event Hall',in:d(40),out:d(41),guests:30};
 assert.ok(createReservation({...guest,...h,rooms:[{type:'fam',unit:'FR2',guests:4},{type:'fam',unit:'FR2',guests:4}]}).error);
 assert.ok(createReservation({...guest,...h,rooms:[{type:'hall',unit:'Event Hall',guests:30}]}).error);
 assert.ok(createReservation({...guest,...h,rooms:Array(7).fill({type:'std',unit:'Room A',guests:2})}).error)});
test('status change applies to the whole package and is audited',()=>{
 const g=listBookings().find(b=>b.type==='hall'&&b.in===d(30)).group;
 assert.match(changeStatus(g+'-1','confirmed').error,/downpayment/);assert.ok(pay(g,13500).ok);assert.ok(changeStatus(g+'-1','confirmed').ok);
 assert.ok(listBookings().filter(b=>b.group===g).every(b=>b.status==='confirmed'));
 assert.ok(listAudit({q:'confirmed'}).some(a=>a.action==='booking.status'&&a.ref===g));
 assert.equal(changeStatus('BV-NOPE','confirmed').code,404);assert.equal(changeStatus(g,'weird').code,400)});
test('cancelled bookings cannot be reopened using the status endpoint',()=>{
 const a=book({unit:'Room C',in:d(50),out:d(52),guests:2});assert.ok(changeStatus(a.id,'cancelled').ok);
 const b=book({unit:'Room C',in:d(50),out:d(52),guests:2});assert.ok(b.id);
 assert.equal(changeStatus(a.id,'pending').code,400)});
test('guest lookup needs the right reference + email (case-insensitive) and returns cancellation info',()=>{
 const r=book({unit:'FR3',type:'fam',in:d(60),out:d(61),guests:4});
 const s=lookup(r.id.toLowerCase(),' maria@mail.COM ');assert.equal(s.total,6000);assert.equal(s.cancel.refundable,true);assert.equal(s.cancel.lastFreeDay,d(57));assert.ok(s.dueBy);
 assert.equal(lookup(r.id,'other@mail.com'),null);assert.equal(lookup('BV-00000000',guest.email),null);
 assert.equal(voucher(r.id,s.token).id,r.id);assert.equal(voucher(r.id,'wrong'),null);assert.equal(voucher(r.id,''),null)});
test('cancellation inside 3 days is flagged non-refundable',()=>{
 const r=book({unit:'FR1',type:'fam',in:d(2),out:d(3),guests:4});assert.equal(lookup(r.id,guest.email).cancel.refundable,false)});
test('checkout is reached at noon Philippine time',()=>{
 const date='2026-11-20';
 assert.equal(checkoutReached(date,Date.parse('2026-11-20T03:59:59Z')),false);
 assert.equal(checkoutReached(date,Date.parse('2026-11-20T04:00:00Z')),true);
});
test('reviews: only completed stays, once, moderated before they show',()=>{
 const r=book({unit:'Room B',in:d(70),out:d(71),guests:2});
 assert.match(submitReview({id:r.id,email:guest.email,rating:5,text:'Wonderful stay here'}).error,/completed/);
 assert.equal(changeStatus(r.id,'completed').code,400);
 pay(r.id,r.down);assert.ok(changeStatus(r.id,'confirmed').ok);
 assert.match(changeStatus(r.id,'completed').error,/check-out/);
 getDb().prepare('UPDATE bookings SET check_in=?,check_out=? WHERE id=?').run(d(-2),d(-1),r.id);
 assert.ok(changeStatus(r.id,'completed').ok);
 assert.ok(submitReview({id:r.id,email:'x@y.com',rating:5,text:'Wonderful stay here'}).error);
 assert.ok(submitReview({id:r.id,email:guest.email,rating:9,text:'Wonderful stay here'}).error);
 assert.ok(submitReview({id:r.id,email:guest.email,rating:5,text:'short'}).error);
 assert.ok(submitReview({id:r.id,email:guest.email,rating:5,text:'Wonderful stay here'}).ok);
 assert.match(submitReview({id:r.id,email:guest.email,rating:5,text:'Wonderful stay again'}).error,/already/);
 assert.equal(approvedReviews().length,0);const rv=allReviews()[0];assert.equal(rv.name,'Maria S.');
 updateReview(rv.id,'approved');assert.equal(approvedReviews().length,1);assert.equal(lookup(r.id,guest.email).review.status,'approved')});
test('every action left an audit trail',()=>{const acts=new Set(listAudit({limit:500}).map(a=>a.action));
 for(const a of ['booking.created','booking.status','review.submitted'])assert.ok(acts.has(a),a)});
test('reports: revenue, occupancy, months, event types',()=>{
 const rows=[{id:'1',group:'1',type:'std',unit:'Room A',in:'2026-01-10',out:'2026-01-12',guests:2,total:7000,status:'confirmed',event:'',at:0},
  {id:'2',group:'2',type:'hall',unit:'Event Hall',in:'2026-02-14',out:'2026-02-15',guests:30,total:15000,status:'completed',event:'Wedding',at:0},
  {id:'3',group:'3',type:'fam',unit:'FR1',in:'2026-02-20',out:'2026-02-23',guests:4,total:18000,status:'pending',event:'',at:Date.now()},
  {id:'4',group:'4',type:'std',unit:'Room B',in:'2026-02-01',out:'2026-02-02',guests:2,total:3500,status:'cancelled',event:'',at:0}];
 const r=report(rows,'2026-01-01','2026-02-28');
 assert.equal(r.totals.revenue,22000);assert.equal(r.totals.pipeline,18000);assert.equal(r.totals.bookings,4);assert.equal(r.totals.cancelRate,25);assert.equal(r.totals.avgValue,11000);
 assert.equal(r.range.days,59);assert.equal(r.occupancy.bookedNights,3);assert.equal(r.occupancy.availableNights,7*59);
 assert.deepEqual(r.months.map(m=>[m.m,m.revenue]),[['2026-01',7000],['2026-02',15000]]);
 assert.equal(r.events.Wedding,1);assert.equal(r.byType.find(x=>x.type==='hall').revenue,15000);
 assert.equal(report(rows,'2026-01-01','2026-01-31').totals.bookings,1)});
test('CSV export escapes quotes and blocks spreadsheet formulas',()=>{
 const c=toCsv([{id:'1',group:'1',unit:'Room A',type:'std',in:'2026-01-01',out:'2026-01-02',guests:2,name:'=HYPERLINK("x")',email:'a@b.c',phone:'1',event:'',notes:'he said "hi", ok',total:1,down:1,status:'pending',at:0}]);
 assert.ok(c.includes(`"'=HYPERLINK(""x"")"`));assert.ok(c.includes('"he said ""hi"", ok"'))});
test('QR matrix has finder patterns and a valid size',()=>{
 const m=qrMatrix('https://example.com/admin?ref=BV-12345678');assert.equal((m.length-17)%4,0);
 for(const[x,y]of[[0,0],[m.length-7,0],[0,m.length-7]]){assert.equal(m[y][x],1);assert.equal(m[y+3][x+3],1);assert.equal(m[y+1][x+1],0)}});
test('the database enforces its own constraints',()=>{
 assert.throws(()=>getDb().prepare("INSERT INTO bookings(id,group_id,token,type,unit,check_in,check_out,guests,name,email,phone,total,down,created_at,updated_at) VALUES('x','x','t','std','Room A','2026-05-02','2026-05-01',2,'n','e','p',1,1,0,0)").run())});

test('capacity minimums follow the spec: Standard 2-3, Family 4-5, hall up to 40',()=>{
 assert.match(book({unit:'Room C',in:d(80),out:d(81),guests:1}).error,/2 to 3/);
 assert.match(book({type:'fam',unit:'FR2',in:d(80),out:d(81),guests:3}).error,/4 to 5/);
 assert.ok(book({type:'fam',unit:'FR2',in:d(80),out:d(81),guests:4}).id);
 assert.ok(createReservation({...guest,type:'hall',unit:'Event Hall',in:d(80),out:d(81),guests:10}).id);
 assert.ok(createReservation({...guest,type:'hall',unit:'Event Hall',in:d(82),out:d(83),guests:41}).error)});

test('guest capacity accepts both boundaries and rejects malformed counts',()=>{
 for(const [type,{min,max}] of Object.entries(TYPES)){
  for(const guests of [min,String(max),Math.floor((min+max)/2)])assert.equal(capacityProblem(type,guests),'');
  for(const guests of [min-1,max+1,-1,min+0.5,'','1e0','invalid',true,null])assert.ok(capacityProblem(type,guests));
 }
 assert.match(book({unit:'Room C',in:d(84),out:d(85),guests:[2]}).error,/whole number/);
});

test('report ranges default invalid dates and sort a reversed valid range',()=>{
 const year=today().slice(0,4);
 assert.deepEqual(rangeFrom('https://example.test/?from=2026-13-01&to=2026-02-30'),{from:year+'-01-01',to:year+'-12-31'});
 assert.deepEqual(rangeFrom('https://example.test/?from=2026-03-01&to=2026-02-01'),{from:'2026-02-01',to:'2026-03-01'});
});

test('failed package move preserves every unit and confirmed moves require the revised deposit',()=>{
 const hall=createReservation({...guest,type:'hall',unit:'Event Hall',guests:30,in:d(100),out:d(101),rooms:[{type:'std',unit:'Room A',guests:2}]});
 assert.ok(hall.id);
 assert.ok(book({in:d(105),out:d(106)}).id);
 const before=getGroup(hall.id);
 assert.equal(reschedule(hall.id,{in:d(105),out:d(106)}).code,409);
 assert.deepEqual(getGroup(hall.id),before);
 assert.ok(pay(hall.id,hall.down).ok);
 assert.ok(changeStatus(hall.id,'confirmed').ok);
 assert.match(reschedule(hall.id,{in:d(100),out:d(102)}).error,/additional downpayment/);
 assert.ok(getGroup(hall.id).every(unit=>unit.out===d(101)));
});
test('expired holds are released and omitted from recovery and report pipeline',()=>{
 const hold=book({in:d(120),out:d(121)});
 getDb().prepare('UPDATE bookings SET created_at=? WHERE id=?').run(Date.now()-49*36e5,hold.id);
 assert.equal(lookup(hold.id,guest.email).status,'expired');
 assert.equal(lookup(hold.id,guest.email).dueBy,null);
 assert.ok(!findActiveByEmail(guest.email).some(row=>row.id===hold.id));
 assert.ok(!busyList().some(row=>row.in===d(120)&&row.unit==='Room A'));
 const result=report(getGroup(hold.id),d(120),d(121));
 assert.equal(result.totals.expired,1);assert.equal(result.totals.pipeline,0);
 assert.equal(report([],'2021-01-01','2025-12-31').months.at(-1).m,'2025-12');
});
