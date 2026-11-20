// The same restore, but on a real database file in WAL mode with every table holding rows (how the site really runs).
import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'bv-real-'));
process.env.DB_PATH=path.join(root,'data','bella-vista.db');process.env.GALLERY_DIR=path.join(root,'data','gallery');delete process.env.BACKUP_DIR;
fs.mkdirSync(path.join(root,'data'),{recursive:true});
import test from 'node:test';import assert from 'node:assert/strict';
import {getDb,insertBooking,insertEntry,insertReview,tx,setSetting,audit} from '../lib/db.js';
import {createStaff,requestReset,login} from '../lib/staff.js';
import {addPhoto,managedPhotos} from '../lib/gallery.js';
import {createBackup,restoreBackup} from '../lib/backup.js';

const JPG=n=>Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(64,n)]);
const TABLES=['bookings','audit_log','reviews','ledger','staff','settings','reset_requests'];
const snapshot=()=>Object.fromEntries(TABLES.map(t=>[t,getDb().prepare(`SELECT * FROM ${t} ORDER BY 1`).all().map(r=>({...r}))]));
const att=()=>getDb().prepare('PRAGMA database_list').all().map(r=>r.name).filter(n=>n!=='temp');

test('a real WAL database file round-trips operational tables, passes integrity checks, and leaves nothing attached',()=>{
 getDb();createStaff({username:'boss',name:'Boss',role:'admin',password:'long-password-1'},'system');createStaff({username:'desk',name:'Desk',role:'frontdesk',password:'desk-password-1'},'boss');
 for(const [id,unit] of [['BV-REAL0001','A'],['BV-REAL0002','B']])tx(d=>insertBooking(d,{id,group:id,token:'t'+id,type:'std',unit,in:'2027-02-01',out:'2027-02-03',guests:2,name:'Ñandú “Quote” O\'Brien',email:'g@example.com',phone:'+63',total:4000,down:1200,at:Date.now(),event:'wedding',notes:'late arrival'}));
 tx(d=>{insertEntry(d,{group:'BV-REAL0001',kind:'payment',amount:1200,method:'GCash',ref:'R1',note:'down',by:'desk'});insertEntry(d,{group:'BV-REAL0001',kind:'charge',amount:300,by:'desk'})});
 insertReview({booking:'BV-REAL0001',name:'Ñandú',rating:5,text:'Lovely stay',status:'approved'});
 setSetting('contact',JSON.stringify({phone:'0917',email:'',address:'x',payments:[]}));audit('boss','test.note',null,'hello');
 requestReset('desk');addPhoto({buffer:JPG(1),cat:'Cover',title:'One'});addPhoto({buffer:JPG(2),cat:'Rooms',title:'Two'});
 assert.ok(login('boss','long-password-1'));
 const before=snapshot(),{buffer}=createBackup();
 for(const t of TABLES)assert.ok(before[t].length>0,t+' has rows in this test');
 // wreck everything, then restore
 getDb().exec('DELETE FROM reset_requests;DELETE FROM ledger;DELETE FROM reviews;DELETE FROM bookings;DELETE FROM settings');
 tx(d=>insertBooking(d,{id:'BV-JUNK0001',group:'BV-JUNK0001',token:'x',type:'fam',unit:'F',in:'2027-03-01',out:'2027-03-02',guests:1,name:'Junk',email:'j@x.io',phone:'1',total:1,down:1,at:1}));
 const r=restoreBackup(buffer,'boss');assert.ok(r.ok,r.error);
 const after=snapshot();for(const t of TABLES){if(t==='audit_log')continue;assert.deepEqual(after[t],before[t],t)}
 assert.deepEqual(after.audit_log.slice(0,before.audit_log.length),before.audit_log,'old audit entries are all kept');assert.ok(after.audit_log.some(a=>a.action==='backup.restored'));
 assert.equal(getDb().prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(getDb().prepare('PRAGMA foreign_key_check').all(),[]);
 assert.deepEqual(att(),['main'],'the backup database is detached');assert.equal(getDb().prepare('PRAGMA journal_mode').get().journal_mode,'wal');
 assert.equal(managedPhotos().length,2);assert.equal(fs.readdirSync(process.env.GALLERY_DIR).length,2);
 const bdir=path.join(root,'data','backups');assert.equal(fs.readdirSync(bdir).length,1,'safety copy saved beside the database');
 // the site keeps working: new writes, a second restore, and the autoincrement counters carry on
 tx(d=>insertEntry(d,{group:'BV-REAL0002',kind:'payment',amount:500,by:'desk'}));assert.ok(restoreBackup(createBackup().buffer,'boss').ok);assert.deepEqual(att(),['main'])});

test('the downloaded backup opens as a plain sqlite file with no wal side files needed',()=>{
 const {buffer}=createBackup(),{readZip}=await_zip();const z=readZip(buffer),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bv-open-')),f=path.join(tmp,'b.db');
 fs.writeFileSync(f,z.get('bella-vista.db').read());const {DatabaseSync}=process.getBuiltinModule('node:sqlite'),s=new DatabaseSync(f,{readOnly:true});
 assert.equal(s.prepare('SELECT COUNT(*) n FROM bookings').get().n,2);s.close();assert.deepEqual(fs.readdirSync(tmp),['b.db'])});
import * as zipmod from '../lib/zip.js';const await_zip=()=>zipmod;
