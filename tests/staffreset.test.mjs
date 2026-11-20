process.env.DB_PATH=':memory:';process.env.ADMIN_PASSCODE='starting-pass-1';
import test from 'node:test';import assert from 'node:assert/strict';
import {createStaff,requestReset,listResets,pendingResetCount,dismissReset,updateStaff,changePassword,listStaff,login} from '../lib/staff.js';
import {listAudit} from '../lib/db.js';

const mk=(u)=>{createStaff({username:u,name:u.toUpperCase(),role:'frontdesk',password:'password-'+u});return listStaff().find(s=>s.username===u)};

test('a forgotten-password request shows up for the administrator, once per person',()=>{
 const a=mk('ana');assert.equal(pendingResetCount(),0);
 assert.deepEqual(requestReset('ana'),{ok:true});assert.deepEqual(requestReset(' ana '),{ok:true});
 const l=listResets();assert.equal(l.length,1);assert.equal(l[0].username,'ana');assert.equal(l[0].staffId,a.id);
 assert.ok(listAudit({q:'staff.reset_requested'}).length>=1)});
test('unknown and deactivated usernames get the same answer and create nothing',()=>{
 const n=pendingResetCount();assert.deepEqual(requestReset('nobody-here'),{ok:true});assert.deepEqual(requestReset(''),{ok:true});
 const b=mk('ben');updateStaff(b.id,{active:false},'admin');assert.deepEqual(requestReset('ben'),{ok:true});assert.equal(pendingResetCount(),n)});
test('the administrator setting a new password clears the request and signs the person out',()=>{
 const a=listStaff().find(s=>s.username==='ana'),s1=login('ana','password-ana');assert.ok(s1);
 assert.ok(updateStaff(a.id,{password:'brand-new-pass'},'admin').ok);
 assert.equal(listResets().length,0);assert.equal(login('ana','password-ana'),null);assert.ok(login('ana','brand-new-pass'));
 assert.ok(listAudit({q:'staff.password_reset'}).length>=1)});
test('the person can ask again after it was handled; the administrator can dismiss a request',()=>{
 requestReset('ana');assert.equal(listResets().length,1);const id=listResets()[0].id;dismissReset(id,'admin');assert.equal(listResets().length,0);
 requestReset('ana');assert.equal(listResets().length,1)});
test('remembering the old password and changing it yourself also clears a pending request',()=>{
 const a=listStaff().find(s=>s.username==='ana');assert.equal(listResets().length,1);
 assert.ok(changePassword(a.id,'brand-new-pass','another-new-pass').ok);assert.equal(listResets().length,0)});
