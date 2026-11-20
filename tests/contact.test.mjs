process.env.DB_PATH=':memory:';
import test from 'node:test';import assert from 'node:assert/strict';
import {validEmail,emailProblem,cleanEmail,cleanPhone,normalizePhone,validGuest,today,addDays} from '../lib/rules.js';
import {createReservation} from '../lib/bookings.js';import {listBookings} from '../lib/db.js';

test('valid email formats are accepted',()=>{for(const e of ['example@gmail.com','Maria@Mail.com','a.b-c_d+tag@sub.domain.co.ph','x@y.io','user_@x.com'])assert.ok(validEmail(e),e)});
test('incomplete or malformed emails are rejected',()=>{
 for(const e of ['','abc','a@','@gmail.com','a@b','a@b.','a@.com','a..b@x.com','.a@x.com','a.@x.com','a@x..com','a@x.c','a b@x.com','a@-x.com','a@x-.com','a@@x.com','a@x.com.','a@b@c.com','ñ@x.com','a'.repeat(121)+'@x.com'])assert.equal(validEmail(e),false,JSON.stringify(e))});
test('email hints say what is still missing',()=>{
 assert.equal(emailProblem(''),'');assert.equal(emailProblem('a@gmail.com'),'');
 assert.match(emailProblem('ana'),/Add an @/);assert.match(emailProblem('@gmail.com'),/before the @/);assert.match(emailProblem('ana@'),/domain after/);assert.match(emailProblem('ana@gmail'),/Finish the domain/);assert.match(emailProblem('ana@gmail.c'),/End the domain/)});
test('email typing clean-up removes only unusable characters and extra @',()=>{
 assert.deepEqual(cleanEmail('ana smith@@gm ail.com!'),{v:'anasmith@gmail.com',changed:true});
 assert.deepEqual(cleanEmail('example@gmail.com'),{v:'example@gmail.com',changed:false});
 assert.equal(cleanEmail('a'.repeat(200)).v.length,120);assert.equal(cleanEmail('ñandú@x.com').v,'and@x.com')});
test('phone clean-up: digits only, max 10, no leading 0, pasted +63 removed',()=>{
 const t=(raw,v,why)=>assert.deepEqual(cleanPhone(raw),{v,why},JSON.stringify(raw));
 t('9123456789','9123456789','');t('912','912','');t('','','');
 t('abc912','912','chars');t('9-1 2.3()4','91234','chars');t('+9123','9123','chars');
 t('09123456789','9123456789','zero');t('0912','912','zero');t('00912345678901','9123456789','zero');
 t('912345678912345','9123456789','long');t('9123456789012','9123456789','long');
 t('+63 912 345 6789','9123456789','prefix');t('639123456789','9123456789','prefix');t('+63','','prefix');
 t('6391','6391','')});   // a short run starting 63 is just digits being typed
test('phone numbers normalise to +63 and 10 digits, anything else is refused',()=>{
 for(const p of ['9123456789','09123456789','+63 912 345 6789','639123456789','(0912) 345-6789'])assert.equal(normalizePhone(p),'+63 9123456789',p);
 for(const p of ['','912345678','abc','0912345','+63','12'])assert.equal(normalizePhone(p),'',JSON.stringify(p))});
test('the server enforces the same rules and stores the +63 format',()=>{
 const base={name:'Ana Cruz',type:'std',unit:'Room A',in:addDays(today(),9),out:addDays(today(),10),guests:2};
 assert.match(createReservation({...base,email:'ana@x.com',phone:'912345'}).error,/10-digit mobile number after \+63/);
 assert.match(createReservation({...base,email:'ana@x',phone:'9123456789'}).error,/valid email address/);
 assert.match(createReservation({...base,email:'ana@x.com',phone:'not a number'}).error,/10-digit/);
 assert.equal(listBookings().length,0);                                                   // nothing half-saved
 const r=createReservation({...base,email:'ana@x.com',phone:'+639123456789'});assert.ok(r.id);assert.equal(listBookings()[0].phone,'+63 9123456789');
 const r2=createReservation({...base,unit:'Room B',email:'ana@x.com',phone:'09123456789'});assert.ok(r2.id);assert.equal(listBookings().find(b=>b.id===r2.id).phone,'+63 9123456789')});
test('front-desk (staff) bookings stay flexible: any phone of 7+ digits, email optional but valid when given',()=>{
 assert.equal(validGuest({name:'W',email:'',phone:'0917123'},{staff:true}),'');
 assert.match(validGuest({name:'W',email:'bad',phone:'0917123'},{staff:true}),/valid email/);assert.match(validGuest({name:'W',email:'',phone:'123'},{staff:true}),/mobile/)});

test('customer bookings reject missing, blank and non-text full names',()=>{
 for(const name of [undefined,'',' \t ',42,{}])assert.match(validGuest({name,email:'guest@example.com',phone:'9123456789'}),/full name/i);
});
