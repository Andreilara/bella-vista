process.env.DB_PATH=':memory:';delete process.env.ADMIN_PASSCODE;
import test from 'node:test';import assert from 'node:assert/strict';
import {bootstrap,createStaff,login,findSession,logout,listStaff,updateStaff,changePassword} from '../lib/staff.js';import {listAudit,getDb} from '../lib/db.js';

test('first run creates the admin account from the default/env passcode',()=>{
 assert.equal(listStaff().length,1);const a=listStaff()[0];assert.equal(a.username,'admin');assert.equal(a.role,'admin');
 assert.ok(!JSON.stringify(a).includes('pass'));assert.equal(getDb().prepare('SELECT pass FROM staff').get().pass.includes('admin2026'),false)}); // hashed, not plain
test('login: right password works, wrong/unknown/inactive do not; sessions are stored hashed',()=>{
 assert.equal(login('admin','nope'),null);assert.equal(login('ghost','admin2026'),null);
 const r=login('ADMIN','admin2026');assert.ok(r.token.length>=64);assert.equal(findSession(r.token).username,'admin');assert.equal(findSession('garbage'),null);
 assert.equal(getDb().prepare('SELECT COUNT(*) n FROM sessions WHERE token=?').get(r.token).n,0);   // raw token never stored
 logout(r.token);assert.equal(findSession(r.token),null)});
test('creating staff: validation, duplicates, roles',()=>{
 assert.ok(createStaff({username:'a b',name:'X',role:'frontdesk',password:'longenough1'}).error);
 assert.ok(createStaff({username:'maria',name:'Maria',role:'boss',password:'longenough1'}).error);
 assert.ok(createStaff({username:'maria',name:'Maria',role:'frontdesk',password:'short'}).error);
 assert.ok(createStaff({username:'maria',name:'Maria',role:'frontdesk',password:'longenough1'},'admin').ok);
 assert.match(createStaff({username:'MARIA',name:'M2',role:'frontdesk',password:'longenough1'}).error,/taken/);
 assert.equal(login('maria','longenough1').staff.role,'frontdesk');assert.ok(listAudit({q:'staff.created'}).length>=1)});
test('deactivating ends sessions; the last administrator is protected',()=>{
 const m=listStaff().find(s=>s.username==='maria'),a=listStaff().find(s=>s.username==='admin'),s=login('maria','longenough1');
 assert.ok(updateStaff(m.id,{active:false},'admin').ok);assert.equal(findSession(s.token),null);assert.equal(login('maria','longenough1'),null);
 assert.match(updateStaff(a.id,{active:false},'admin').error,/administrator/);assert.match(updateStaff(a.id,{role:'frontdesk'},'admin').error,/administrator/);
 assert.ok(updateStaff(m.id,{active:true,role:'admin'},'admin').ok);assert.ok(updateStaff(a.id,{role:'frontdesk'},'maria').ok)});
test('password reset and change',()=>{
 const m=listStaff().find(s=>s.username==='maria'),s=login('maria','longenough1');
 assert.ok(updateStaff(m.id,{password:'brandnewpass'},'admin').ok);assert.equal(findSession(s.token),null);assert.equal(login('maria','longenough1'),null);assert.ok(login('maria','brandnewpass'));
 assert.ok(changePassword(m.id,'wrong','anotherpass1').error);assert.ok(changePassword(m.id,'brandnewpass','short').error);
 assert.ok(changePassword(m.id,'brandnewpass','anotherpass1').ok);assert.ok(login('maria','anotherpass1'))});
