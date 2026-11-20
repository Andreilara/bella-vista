import {pathToFileURL} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('old data/bookings.json is imported once into SQLite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bv-')),lib=pathToFileURL(path.resolve('lib/db.js')).href;fs.mkdirSync(dir+'/data');
 fs.writeFileSync(dir+'/data/bookings.json',JSON.stringify([{id:'BV-OLD00001',type:'std',unit:'Room A',in:'2030-01-10',out:'2030-01-12',guests:2,name:'Old Guest',email:'o@x.com',phone:'0917123',total:7000,down:3500,status:'confirmed',at:1700000000000}]));
 const run=()=>spawnSync(process.execPath,['--no-warnings','--input-type=module','-e',`import {listBookings} from ${JSON.stringify(lib)};console.log(JSON.stringify(listBookings()))`],{cwd:dir,encoding:'utf8',env:{...process.env,DB_PATH:''}});
 const r=run();assert.equal(r.status,0,r.stderr);const rows=JSON.parse(r.stdout);assert.equal(rows.length,1);assert.equal(rows[0].id,'BV-OLD00001');assert.equal(rows[0].status,'confirmed');
 assert.ok(fs.existsSync(dir+'/data/bookings.json.migrated'));assert.ok(!fs.existsSync(dir+'/data/bookings.json'));assert.equal(JSON.parse(run().stdout).length,1)});

test('a database made by the previous version (schema v1) upgrades in place without losing data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bv-')),file=dir+'/old.db',lib=pathToFileURL(path.resolve('lib/db.js')).href;
 const mk=spawnSync(process.execPath,['--no-warnings','--input-type=module','-e',`
  const {DatabaseSync}=process.getBuiltinModule('node:sqlite');const d=new DatabaseSync(${JSON.stringify(file)});
  d.exec("CREATE TABLE bookings(id TEXT PRIMARY KEY, group_id TEXT NOT NULL, token TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('std','fam','hall')), unit TEXT NOT NULL, check_in TEXT NOT NULL, check_out TEXT NOT NULL CHECK(check_out>check_in), guests INTEGER NOT NULL CHECK(guests>0), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, total INTEGER NOT NULL, down INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')), event TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);CREATE TABLE audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, ref TEXT, detail TEXT NOT NULL DEFAULT '');CREATE TABLE reviews(id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL);");
  d.prepare("INSERT INTO bookings(id,group_id,token,type,unit,check_in,check_out,guests,name,email,phone,total,down,status,created_at,updated_at) VALUES('BV-V1000001','BV-V1000001','t','std','Room A','2030-02-01','2030-02-03',2,'Old V1','o@x.com','0917123',7000,3500,'confirmed',1,1)").run();`],{encoding:'utf8'});
 assert.equal(mk.status,0,mk.stderr);
 const run=()=>spawnSync(process.execPath,['--no-warnings','--input-type=module','-e',`import {listBookings,getDb,groupMoney} from ${JSON.stringify(lib)};const b=listBookings()[0];console.log(JSON.stringify({n:listBookings().length,id:b.id,source:b.source,refundable:b.refundable,ver:getDb().prepare('PRAGMA user_version').get().user_version,money:groupMoney('BV-V1000001')}))`],{encoding:'utf8',env:{...process.env,DB_PATH:file}});
 const r=run();assert.equal(r.status,0,r.stderr);const o=JSON.parse(r.stdout);assert.deepEqual(o,{n:1,id:'BV-V1000001',source:'online',refundable:null,ver:4,money:{paid:0,charges:0}});
 assert.equal(JSON.parse(run().stdout).ver,4)});   // running it again is harmless
test('upgrading to schema v4 adds the gallery and password-reset tables, and keeps an existing v3 database working',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bv-')),file=dir+'/v3.db',lib=pathToFileURL(path.resolve('lib/db.js')).href;
 const run=code=>spawnSync(process.execPath,['--no-warnings','--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,DB_PATH:file}});
 let r=run(`import {getDb} from ${JSON.stringify(lib)};const d=getDb();d.exec('DROP TABLE gallery;DROP TABLE reset_requests;PRAGMA user_version=3');console.log('ok')`);assert.equal(r.status,0,r.stderr);
 r=run(`import {getDb} from ${JSON.stringify(lib)};const d=getDb(),t=d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);console.log(JSON.stringify({g:t.includes('gallery'),r:t.includes('reset_requests'),v:d.prepare('PRAGMA user_version').get().user_version}))`);
 assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{g:true,r:true,v:4})});
