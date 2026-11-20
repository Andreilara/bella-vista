// Backup and restore for Admin > Settings. The ZIP holds metadata and a database snapshot.
// Restoring replaces the data on this site with the backup's, in one transaction, after saving a safety copy of what was there.
// Sign-in sessions are never part of a backup. The .env file (passwords for email, ADMIN_PASSCODE) is not either.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getDb,audit,getSetting,setSetting,tx,usesTurso,initializeDatabase,BACKUP_TABLES,SCHEMA_VERSION} from './db.js';
import {makeZip,readZip} from './zip.js';
const {DatabaseSync}=process.getBuiltinModule('node:sqlite');

export const BACKUP_FORMAT='bella-vista-backup';
export const MAX_BACKUP_BYTES=600*1048576; // Allow older archives that also contain images.
const MAX_DB_BYTES=300*1048576,KEEP_SAFETY_COPIES=3;
// Parents before children, so restoring can insert in this order and delete in the reverse.
const TABLES=BACKUP_TABLES;
const cols=(db,table)=>db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
const has=(db,table)=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
function copyOperationalData(source,target){
 for(const table of TABLES){
  if(!has(source,table))continue;
  const from=new Map(cols(source,table).map(column=>[column.toLowerCase(),column]));
  const columns=cols(target,table).map(column=>from.get(column.toLowerCase())).filter(Boolean);
  if(!columns.length)continue;
  const names=columns.map(column=>`"${column}"`).join(',');
  const rows=source.prepare(`SELECT ${names} FROM ${table}`).all();
  const tuple=`(${columns.map(()=>'?').join(',')})`,batchSize=50;
  for(let start=0;start<rows.length;start+=batchSize){
   const batch=rows.slice(start,start+batchSize);
   const insert=target.prepare(`INSERT INTO ${table}(${names}) VALUES ${batch.map(()=>tuple).join(',')}`);
   insert.run(...batch.flatMap(row=>columns.map(column=>row[column])));
  }
 }
}

class BackupError extends Error{constructor(m,code=400){super(m);this.code=code}}
const sq=p=>p.replace(/'/g,"''");
const dbFile=()=>process.env.DB_PATH||path.join(process.cwd(),'data','bella-vista.db');
const tmpDir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'bv-backup-'));
const rm=d=>{try{fs.rmSync(d,{recursive:true,force:true})}catch{}};
const stamp=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;   // the server's local date, not UTC

/** Builds the backup. Returns {buffer, filename, manifest}. */
export function createBackup({inTransaction=false}={}){
 const d=getDb(),tmp=tmpDir(),snap=path.join(tmp,'snapshot.db');
 try{
  const remote=usesTurso();
  if(!remote)d.exec(`VACUUM main INTO '${sq(snap)}'`);
  const s=new DatabaseSync(snap);
  let manifest;
  try{
   if(remote){
    initializeDatabase(s);
    s.exec('BEGIN');
    try{
     if(inTransaction)copyOperationalData(d,s);
     else tx(()=>copyOperationalData(d,s));
     s.exec('COMMIT');
    }catch(error){s.exec('ROLLBACK');throw error}
   }else s.exec('PRAGMA journal_mode=DELETE; DELETE FROM sessions; DELETE FROM gallery; VACUUM');
   manifest={format:BACKUP_FORMAT,version:1,createdAt:new Date().toISOString(),schema:s.prepare('PRAGMA user_version').get().user_version,
    bookings:s.prepare('SELECT COUNT(DISTINCT group_id) n FROM bookings').get().n};
  }finally{s.close()}
  const buffer=makeZip([{name:'backup.json',data:Buffer.from(JSON.stringify(manifest,null,1))},{name:'bella-vista.db',data:fs.readFileSync(snap)}]);
  return{buffer,filename:`bella-vista-backup-${stamp()}.zip`,manifest}}
 finally{rm(tmp)}}

/** Called when an administrator downloads a backup, so Settings can show when one was last taken. */
export const markBackup=by=>{setSetting('last_backup',JSON.stringify({at:Date.now(),by}));try{audit(by,'backup.downloaded',null,'')}catch{}};
export function backupInfo(){
 let last=null;try{const raw=getSetting('last_backup');if(raw)last=JSON.parse(raw)}catch{}
 const d=getDb();return{last,bookings:d.prepare('SELECT COUNT(DISTINCT group_id) n FROM bookings').get().n}}

// Read the archive's database independently of the live connection.
function withBackup(buffer,fn){
 let zip,manifest,dbBytes;
 try{zip=readZip(buffer)}catch{throw new BackupError('That file is not a backup. Choose the .zip you downloaded from Settings > Backup.')}
 try{
  const m=zip.get('backup.json'),db=zip.get('bella-vista.db');if(!m||!db)throw 0;
  manifest=JSON.parse(m.read(1048576).toString('utf8'));if(manifest?.format!==BACKUP_FORMAT)throw 0;
  dbBytes=db.read(MAX_DB_BYTES);if(dbBytes.toString('latin1',0,15)!=='SQLite format 3')throw 0}
 catch{throw new BackupError('That file is not a Bella Vista backup, or it is damaged. Download a fresh backup and try again.')}
 const tmp=tmpDir(),file=path.join(tmp,'restore.db');let source;
 try{
  fs.writeFileSync(file,dbBytes);
  try{source=new DatabaseSync(file,{readOnly:true});source.exec('PRAGMA trusted_schema=OFF')}catch{throw new BackupError('The database inside this backup cannot be opened. Download a fresh backup and try again.')}
  try{if(!has(source,'bookings')||!has(source,'staff'))throw 0;if(source.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw 0}
  catch{throw new BackupError('The database inside this backup is damaged. Download a fresh backup and try again.')}
  const theirs=source.prepare('PRAGMA user_version').get().user_version;
  if(theirs>SCHEMA_VERSION)throw new BackupError('This backup was made by a newer version of the site. Update the site first, then restore it.');
  if(!source.prepare("SELECT COUNT(*) n FROM staff WHERE role='admin' AND active=1").get().n)throw new BackupError('This backup has no active administrator account, so restoring it would lock everyone out.');
  const count=t=>has(source,t)?source.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n:0;
  return fn({source,info:{madeAt:manifest.createdAt||null,
   bookings:source.prepare('SELECT COUNT(DISTINCT group_id) n FROM bookings').get().n,staff:count('staff'),reviews:count('reviews')}})}
 finally{try{source?.close()}finally{rm(tmp)}}}

const fail=e=>{if(e instanceof BackupError)return{error:e.message,code:e.code};console.error(e);return{error:'Something went wrong, so nothing was changed. Try again, or download a fresh backup first.',code:500}};

/** Checks an uploaded backup and says what is in it. Changes nothing. */
export function previewBackup(buffer){try{return withBackup(buffer,c=>({ok:true,...c.info}))}catch(e){return fail(e)}}

// Before a restore replaces anything, today's data is saved next to the database (data/backups), so a wrong choice can be undone. The last few are kept.
function safetyCopy(){
 const dir=process.env.BACKUP_DIR||(process.env.DB_PATH===':memory:'?null:path.join(path.dirname(dbFile()),'backups'));if(!dir)return null;
 const {buffer}=createBackup(),name=`before-restore-${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name),buffer);
 const old=fs.readdirSync(dir).filter(f=>/^before-restore-.*\.zip$/.test(f)).sort().slice(0,-KEEP_SAFETY_COPIES);for(const f of old)try{fs.unlinkSync(path.join(dir,f))}catch{}
 return name}

function storeTursoSafetyCopy(db){
 const name=`before-restore-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.zip`;
 const {buffer}=createBackup({inTransaction:true});
 const chunkSize=256*1024,insert=db.prepare('INSERT INTO backup_safety_chunks(name,part,data) VALUES (?,?,?)');
 for(let offset=0;offset<buffer.length;offset+=chunkSize)insert.run(name,offset/chunkSize,buffer.subarray(offset,offset+chunkSize));
 db.prepare('DELETE FROM backup_safety_chunks WHERE name NOT IN (SELECT DISTINCT name FROM backup_safety_chunks ORDER BY name DESC LIMIT ?)').run(KEEP_SAFETY_COPIES);
 return name;
}

export function readTursoSafetyCopy(name){
 const rows=getDb().prepare('SELECT data FROM backup_safety_chunks WHERE name=? ORDER BY part').all(name);
 return rows.length?Buffer.concat(rows.map(row=>Buffer.from(row.data))):null;
}

/** Restores operational data from the backup and signs everyone out. */
export function restoreBackup(buffer,by='admin'){
 try{return withBackup(buffer,({source,info})=>{
  let safety=null;
  if(!usesTurso()){try{safety=safetyCopy()}catch(e){console.error(e);throw new BackupError('Could not save a safety copy of the current data.',500)}}
  tx(d=>{
   if(usesTurso())safety=storeTursoSafetyCopy(d);
   d.exec('DELETE FROM sessions');
   for(const t of [...TABLES].reverse())d.exec(`DELETE FROM ${t}`);
   copyOperationalData(source,d);
  });
  try{audit(by,'backup.restored',null,`${info.bookings} booking(s), backup made ${info.madeAt||'at an unknown time'}`)}catch{}
  return{ok:true,...info,safetyCopy:safety}})}
 catch(e){return fail(e)}}
