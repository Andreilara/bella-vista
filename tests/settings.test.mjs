process.env.DB_PATH=':memory:';
import test from 'node:test';import assert from 'node:assert/strict';
import {getContact,saveContact,setupStatus,hasContact} from '../lib/settings.js';
import {listAudit} from '../lib/db.js';

test('contact details start empty and are hidden until staff fill them in',()=>{
 const c=getContact();assert.deepEqual(c,{phone:'',email:'',address:'',payments:[]});assert.equal(hasContact(c),false)});
test('saving contact details trims, stores and logs them',()=>{
 const r=saveContact({phone:' 0917 123 4567 ',email:'hello@bellavista.ph',address:'Brgy. Example',payments:[{method:'GCash',account:'Bella Vista Hotel',number:'0917 123 4567'},{method:'',account:'',number:''}]},'admin');
 assert.ok(r.ok);const c=getContact();assert.equal(c.phone,'0917 123 4567');assert.equal(c.payments.length,1);assert.equal(c.payments[0].method,'GCash');
 assert.ok(listAudit().some(a=>a.action==='settings.contact'&&a.actor==='admin'))});
test('bad contact details are refused with a clear message',()=>{
 assert.match(saveContact({phone:'call me'}).error,/Phone can only contain/);
 assert.match(saveContact({email:'nope'}).error,/complete email/);
 assert.match(saveContact({payments:[{method:'GCash',account:''}]}).error,/Payment option 1/);
 assert.match(saveContact({payments:Array(9).fill({method:'a',account:'b'})}).error,/up to 8/)});
test('the setup checklist reflects what is configured',()=>{
 const s=setupStatus();assert.equal(s.contact,true);assert.equal(s.payments,true);assert.equal(s.email,false);assert.equal(typeof s.password,'boolean')});
