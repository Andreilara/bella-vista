import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
process.env.DB_PATH=':memory:';process.env.GALLERY_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'bv-gal-'));process.env.BACKUP_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'bv-bak-'));
import test from 'node:test';import assert from 'node:assert/strict';
import {getDb,insertBooking,tx,listBookings,getSetting,listAudit} from '../lib/db.js';
import {createStaff,listStaff,login,findSession} from '../lib/staff.js';
import {saveContact,getContact} from '../lib/settings.js';
import {addPhoto,deletePhoto,managedPhotos,photoFile} from '../lib/gallery.js';
import {createBackup,previewBackup,restoreBackup,backupInfo,markBackup} from '../lib/backup.js';
import {makeZip,readZip} from '../lib/zip.js';
const {DatabaseSync}=process.getBuiltinModule('node:sqlite');

const JPG=n=>Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(64,n)]);
const book=(id,unit='A',name='Guest')=>tx(d=>insertBooking(d,{id,group:id,token:'t'+id,type:'std',unit,in:'2027-01-10',out:'2027-01-12',guests:2,name,email:'g@example.com',phone:'+639171234567',total:5000,down:1500,at:Date.now()}));
const files=()=>fs.readdirSync(process.env.GALLERY_DIR).sort();

test('zip: round trip, compression, and damage is detected',()=>{
 const big=Buffer.from('hello world '.repeat(500)),bin=Buffer.from([0,1,2,3,255,254]);
 const z=readZip(makeZip([{name:'a.txt',data:big},{name:'b/c.bin',data:bin},{name:'empty',data:Buffer.alloc(0)}]));
 assert.deepEqual([...z.keys()],['a.txt','b/c.bin','empty']);assert.ok(z.get('a.txt').read().equals(big));assert.ok(z.get('b/c.bin').read().equals(bin));assert.equal(z.get('empty').read().length,0);
 const raw=makeZip([{name:'a.txt',data:big}]);assert.ok(raw.length<big.length);
 const bad=Buffer.from(raw);bad[40]^=0xff;assert.throws(()=>readZip(bad).get('a.txt').read());
 assert.throws(()=>readZip(Buffer.from('definitely not a zip file at all, just text')));
 assert.throws(()=>readZip(makeZip([{name:'a.txt',data:big}])).get('a.txt').read(100),/too large/)});

test('a backup holds operational data without gallery records, image files or sessions',()=>{
 getDb();createStaff({username:'boss',name:'Boss',role:'admin',password:'long-password-1'},'system');
 book('BV-AAAA0001','A','Maria Santos');addPhoto({buffer:JPG(1),cat:'Rooms',title:'Room A'});addPhoto({buffer:JPG(2),cat:'Cover',title:'Front'});
 saveContact({phone:'0917 123 4567',email:'hotel@example.com',address:'Nagcarlan',payments:[{method:'GCash',account:'Bella Vista',number:'0917'}]});
 assert.ok(login('boss','long-password-1'));assert.equal(getDb().prepare('SELECT COUNT(*) n FROM sessions').get().n,1);
 const {buffer,filename,manifest}=createBackup();
 assert.match(filename,/^bella-vista-backup-\d{4}-\d\d-\d\d\.zip$/);assert.equal(manifest.bookings,1);assert.ok(!Object.hasOwn(manifest,'photos'));
 const z=readZip(buffer);assert.deepEqual([...z.keys()],['backup.json','bella-vista.db']);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bv-chk-')),f=path.join(tmp,'x.db');fs.writeFileSync(f,z.get('bella-vista.db').read());
 const s=new DatabaseSync(f);assert.equal(s.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);assert.equal(s.prepare('SELECT COUNT(*) n FROM bookings').get().n,1);assert.equal(s.prepare('SELECT COUNT(*) n FROM gallery').get().n,0);s.close();
 assert.equal(getDb().prepare('SELECT COUNT(*) n FROM sessions').get().n,1,'the live sessions are untouched')});

test('restore brings back operational data and leaves existing gallery data alone',()=>{
 const {buffer}=createBackup(),before=listBookings(),photoFiles=files(),staffBefore=listStaff().map(s=>s.username);
 // change everything after the backup was taken
 book('BV-BBBB0002','B','Later Guest');deletePhoto(managedPhotos()[0].id);addPhoto({buffer:JPG(9),cat:'Dining',title:'Newer'});
 saveContact({phone:'0999',email:'',address:'Elsewhere',payments:[]});createStaff({username:'newbie',name:'New',role:'frontdesk',password:'another-pass-1'},'boss');
 assert.notDeepEqual(files(),photoFiles);
 const currentFiles=files(),currentPhotos=managedPhotos();
 const token=login('boss','long-password-1').token;assert.ok(findSession(token));
 const r=restoreBackup(buffer,'boss');assert.ok(r.ok,r.error);assert.equal(r.bookings,1);assert.ok(!Object.hasOwn(r,'photos'));
 assert.deepEqual(listBookings(),before);assert.equal(listBookings().find(b=>b.id==='BV-AAAA0001').name,'Maria Santos');
 assert.equal(getContact().address,'Nagcarlan');assert.equal(getContact().payments[0].method,'GCash');
 assert.deepEqual(listStaff().map(s=>s.username),staffBefore);
 assert.deepEqual(files(),currentFiles);
 assert.deepEqual(managedPhotos(),currentPhotos);
 assert.equal(managedPhotos().length,2);for(const p of managedPhotos())assert.ok(photoFile(p.src.split('/').pop()),'every listed photo has its file');
 assert.equal(findSession(token),null,'everyone is signed out after a restore');assert.ok(login('boss','long-password-1'),'the restored account signs in');
 assert.ok(listAudit({q:'backup.restored'}).length>=1);
 assert.ok(fs.readdirSync(process.env.BACKUP_DIR).some(f=>/^before-restore-.*\.zip$/.test(f)),'a safety copy of the replaced data was saved')});

test('the safety copy can itself be restored (undo)',()=>{
 book('BV-CCCC0003','C','Third');const dir=process.env.BACKUP_DIR,[newest]=fs.readdirSync(dir).sort().slice(-1);
 const r=restoreBackup(fs.readFileSync(path.join(dir,newest)),'boss');assert.ok(r.ok,r.error);
 assert.ok(listBookings().some(b=>b.id==='BV-BBBB0002'),'the booking made after the first backup came back with the safety copy')});

test('only the last three safety copies are kept',()=>{
 const {buffer}=createBackup();for(let i=0;i<5;i++)assert.ok(restoreBackup(buffer,'boss').ok);
 assert.equal(fs.readdirSync(process.env.BACKUP_DIR).filter(f=>/^before-restore-/.test(f)).length,3)});

test('preview reports what is inside and changes nothing',()=>{
 const {buffer}=createBackup(),n=listBookings().length;book('BV-DDDD0004','D','Fourth');const p=previewBackup(buffer);
 assert.ok(p.ok);assert.equal(p.bookings,n);assert.ok(!Object.hasOwn(p,'photos'));assert.ok(p.staff>=1);assert.ok(p.madeAt);
 assert.equal(listBookings().length,n+1,'nothing was restored');assert.equal(getDb().prepare('PRAGMA database_list').all().filter(r=>r.name==='bk').length,0)});

test('files that are not a good backup are refused, and nothing changes',()=>{
 const n=listBookings().length,ok=createBackup().buffer,z=readZip(ok);
 const manifest=z.get('backup.json').read(),db=z.get('bella-vista.db').read();
 const cases={
  'random bytes':Buffer.from('this is not a backup'),
  'an empty zip':makeZip([]),
  'a zip of something else':makeZip([{name:'notes.txt',data:Buffer.from('hi')}]),
  'no manifest':makeZip([{name:'bella-vista.db',data:db}]),
  'wrong format':makeZip([{name:'backup.json',data:Buffer.from('{"format":"other"}')},{name:'bella-vista.db',data:db}]),
  'a database that is not sqlite':makeZip([{name:'backup.json',data:manifest},{name:'bella-vista.db',data:Buffer.from('x'.repeat(5000))}])};
 for(const [what,buf] of Object.entries(cases)){const r=restoreBackup(buf,'boss');assert.ok(r.error,what);assert.equal(r.code,400,what);assert.equal(previewBackup(buf).ok,undefined,what)}
 assert.equal(listBookings().length,n);assert.equal(getDb().prepare('PRAGMA database_list').all().filter(r=>r.name==='bk').length,0)});

test('a backup from a newer version, or with no administrator, is refused',()=>{
 const z=readZip(createBackup().buffer),manifest=z.get('backup.json').read(),db=z.get('bella-vista.db').read(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bv-chk-'));
 const edit=sql=>{const f=path.join(tmp,Math.random()+'.db');fs.writeFileSync(f,db);const s=new DatabaseSync(f);s.exec(sql);s.close();return makeZip([{name:'backup.json',data:manifest},{name:'bella-vista.db',data:fs.readFileSync(f)}])};
 assert.match(restoreBackup(edit('PRAGMA user_version=99'),'boss').error,/newer version/);
 assert.match(restoreBackup(edit("UPDATE staff SET role='frontdesk'"),'boss').error,/no active administrator/);
 assert.ok(login('boss','long-password-1'),'the real administrator is still there')});

test('names inside the zip cannot reach outside the gallery folder',()=>{
 const z=readZip(createBackup().buffer),parts=[{name:'backup.json',data:z.get('backup.json').read()},{name:'bella-vista.db',data:z.get('bella-vista.db').read()},
  {name:'gallery/../../evil.jpg',data:JPG(5)},{name:'../evil.txt',data:Buffer.from('x')},{name:'gallery/sub/0123456789abcdef.jpg',data:JPG(5)}];
 const r=restoreBackup(makeZip(parts),'boss');assert.ok(r.ok,r.error);
 assert.ok(!fs.existsSync(path.join(process.env.GALLERY_DIR,'..','evil.jpg')));assert.ok(!files().includes('evil.jpg'));assert.ok(!files().includes('0123456789abcdef.jpg'))});

test('legacy backup image entries are ignored while operational data is restored',()=>{
 const z=readZip(createBackup().buffer);
 const manifest={...JSON.parse(z.get('backup.json').read()),photos:1,missingPhotos:0};
 const backup=makeZip([{name:'backup.json',data:Buffer.from(JSON.stringify(manifest))},
  {name:'bella-vista.db',data:z.get('bella-vista.db').read()},
  {name:'gallery/0123456789abcdef.jpg',data:Buffer.from('retired image data')}]);
 const currentFiles=files(),currentPhotos=managedPhotos();
 const r=restoreBackup(backup,'boss');assert.ok(r.ok,r.error);
 assert.deepEqual(files(),currentFiles);assert.deepEqual(managedPhotos(),currentPhotos);
});

test('the last-backup note and counts are available for Settings',()=>{
 markBackup('boss');const i=backupInfo();assert.equal(i.last.by,'boss');assert.ok(i.last.at>0);assert.ok(i.bookings>=1)});
