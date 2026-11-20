// Local SQLite for development and Turso for hosted deployments.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Libsql from 'libsql';
import {PENDING_MS,today} from './rules.js';
// Loaded at runtime (Node 22.3+) so the Next.js bundler never has to resolve the node:sqlite scheme.
const {DatabaseSync}=process.getBuiltinModule('node:sqlite');

const SCHEMA=`
CREATE TABLE IF NOT EXISTS bookings(
 id TEXT PRIMARY KEY, group_id TEXT NOT NULL, token TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('std','fam','hall')), unit TEXT NOT NULL,
 check_in TEXT NOT NULL, check_out TEXT NOT NULL CHECK(check_out>check_in),
 guests INTEGER NOT NULL CHECK(guests>0), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
 total INTEGER NOT NULL, down INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),
 event TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_bookings_unit ON bookings(unit,check_in,check_out);
CREATE INDEX IF NOT EXISTS ix_bookings_group ON bookings(group_id);
CREATE INDEX IF NOT EXISTS ix_bookings_out ON bookings(check_out);
CREATE TABLE IF NOT EXISTS audit_log(
 id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, actor TEXT NOT NULL,
 action TEXT NOT NULL, ref TEXT, detail TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS reviews(
 id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), text TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at INTEGER NOT NULL);`;

const V2_TABLES=`
CREATE TABLE IF NOT EXISTS ledger(
 id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL, at INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('payment','refund','charge')), amount INTEGER NOT NULL CHECK(amount>0),
 method TEXT NOT NULL DEFAULT '', ref TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', staff_name TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS ix_ledger_group ON ledger(group_id);
CREATE TABLE IF NOT EXISTS staff(
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','frontdesk')), pass TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, last_login INTEGER);
CREATE TABLE IF NOT EXISTS sessions(
 token TEXT PRIMARY KEY, staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);`;

const V4_TABLES=`
CREATE TABLE IF NOT EXISTS gallery(
 id INTEGER PRIMARY KEY AUTOINCREMENT, file TEXT NOT NULL UNIQUE, cat TEXT NOT NULL, title TEXT NOT NULL,
 sort INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reset_requests(
 id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
 requested_at INTEGER NOT NULL, handled_at INTEGER, handled_by TEXT);`;

export const BACKUP_TABLES=['bookings','audit_log','reviews','ledger','staff','settings','reset_requests'];
export const SCHEMA_VERSION=4;
const SAFETY_TABLE=`CREATE TABLE IF NOT EXISTS backup_safety_chunks(
 name TEXT NOT NULL, part INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(name,part));`;
const RATE_LIMIT_TABLE=`
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS ix_rate_limits_until ON rate_limits(until);`;

// Versioned migrations (PRAGMA user_version). v1 = original tables, v2 = payments ledger, staff accounts, walk-in source, cancellation record, v3 = settings (editable contact and payment details),
// v4 = gallery photos managed in Admin > Settings, and staff password-reset requests.
function migrate(d){
 const v=d.prepare('PRAGMA user_version').get().user_version;if(v>=SCHEMA_VERSION)return;
 if(v<2)migrateV2(d);
 d.exec('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)');d.exec(V4_TABLES);d.exec(`PRAGMA user_version=${SCHEMA_VERSION}`)}
function migrateV2(d){
 const cols=d.prepare('PRAGMA table_info(bookings)').all().map(c=>c.name),add=(n,def)=>{if(!cols.includes(n))d.exec(`ALTER TABLE bookings ADD COLUMN ${n} ${def}`)};
 add('source',"TEXT NOT NULL DEFAULT 'online'");add('cancelled_at','INTEGER');add('refundable','INTEGER');
 d.exec(V2_TABLES)}

let db;
export const usesTurso=()=>process.env.DB_PROVIDER==='turso'||(process.env.VERCEL==='1'&&!process.env.DB_PATH);
export function openTurso(){
 const {TURSO_DATABASE_URL:url,TURSO_AUTH_TOKEN:authToken}=process.env;
 if(!url||!authToken)throw new Error('Turso requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
 return new Libsql(url,{authToken});
}
export function initializeDatabase(connection){
 connection.exec(SCHEMA);
 migrate(connection);
}
export function initializeTurso(connection){
 connection.exec(SCHEMA);
 migrateV2(connection);
 connection.exec('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);');
 connection.exec(V4_TABLES);
 connection.exec(SAFETY_TABLE);
 connection.exec(RATE_LIMIT_TABLE);
}
export function getDb(){
 if(db)return db;
 if(usesTurso()){
  const connection=openTurso();
  try{connection.prepare('SELECT 1 FROM settings LIMIT 1').get()}
  catch(error){connection.close();throw error}
  db=connection;return db;
 }
 const file=process.env.DB_PATH||path.join(process.cwd(),'data','bella-vista.db');
 if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});
 const connection=new DatabaseSync(file);
 try{
  connection.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  initializeDatabase(connection);importLegacyJson(connection);
 }catch(error){connection.close();throw error}
 db=connection;return db}

// One-time import of the old data/bookings.json (pre-SQLite versions).
function importLegacyJson(d){
 const f=path.join(process.cwd(),'data','bookings.json');
 if(process.env.DB_PATH===':memory:'||!fs.existsSync(f)||d.prepare('SELECT COUNT(*) n FROM bookings').get().n)return;
 let list;try{list=JSON.parse(fs.readFileSync(f,'utf8'))}catch{return}
 const ins=d.prepare('INSERT OR IGNORE INTO bookings(id,group_id,token,type,unit,check_in,check_out,guests,name,email,phone,total,down,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 d.exec('BEGIN');
 try{for(const b of list)ins.run(b.id,b.id,token(),b.type,b.unit,b.in,b.out,b.guests,b.name,b.email,b.phone,b.total,b.down,b.status||'pending',b.at||Date.now(),b.at||Date.now());
  d.exec('COMMIT');fs.renameSync(f,f+'.migrated')}catch(e){d.exec('ROLLBACK');throw e}}

export const token=()=>crypto.randomBytes(12).toString('hex');
export const newRef=()=>'BV-'+crypto.randomUUID().slice(0,8).toUpperCase();

/** Run fn inside one transaction (BEGIN IMMEDIATE blocks concurrent writers, so check-then-insert cannot double-book). */
export function tx(fn){const d=getDb();d.exec('BEGIN IMMEDIATE');
 try{const r=fn(d);d.exec('COMMIT');return r}catch(e){try{d.exec('ROLLBACK')}catch{}throw e}}

const row=r=>r&&{id:r.id,group:r.group_id,token:r.token,type:r.type,unit:r.unit,in:r.check_in,out:r.check_out,guests:r.guests,name:r.name,email:r.email,phone:r.phone,total:r.total,down:r.down,status:r.status,event:r.event,notes:r.notes,source:r.source,at:r.created_at,updated:r.updated_at,cancelledAt:r.cancelled_at,refundable:r.refundable==null?null:!!r.refundable};
const q=(sql,...p)=>getDb().prepare(sql).all(...p);

// ---- bookings ----
// Open work for the staff badges: bookings still awaiting a decision (and not lapsed), and reviews awaiting moderation.
export const pendingBookingCount=()=>q("SELECT COUNT(DISTINCT group_id) n FROM bookings WHERE status='pending' AND check_out>=? AND created_at>=?",today(),Date.now()-PENDING_MS)[0]?.n||0;
export const pendingReviewCount=()=>q("SELECT COUNT(*) n FROM reviews WHERE status='pending'")[0]?.n||0;
export const listBookings=()=>q('SELECT * FROM bookings ORDER BY created_at DESC,id').map(row);
// Only stays that have not ended can block a new booking, so years of history are never loaded for availability checks.
export const activeBookings=()=>q("SELECT * FROM bookings WHERE status!='cancelled' AND check_out>=? AND NOT(status='pending' AND created_at<?)",today(),Date.now()-PENDING_MS).map(row);
export function conflictingUnit(db,units,checkIn,checkOut){
 const placeholders=units.map(()=>'?').join(',');
 return db.prepare(`SELECT unit FROM bookings WHERE unit IN (${placeholders})
  AND check_in<? AND check_out>? AND status!='cancelled'
  AND NOT(status='pending' AND created_at<?) LIMIT 1`)
  .get(...units,checkOut,checkIn,Date.now()-PENDING_MS)?.unit;
}
// The public availability feed (polled by every visitor): three columns, current and future stays only.
export const busyList=()=>q("SELECT unit,check_in,check_out FROM bookings WHERE status!='cancelled' AND check_out>=? AND NOT(status='pending' AND created_at<?)",today(),Date.now()-PENDING_MS).map(r=>({unit:r.unit,in:r.check_in,out:r.check_out}));
/** A cheap fingerprint of everything the staff screens show; changes whenever a booking or payment changes. Used as an ETag. */
export const dataVersion=()=>{const d=getDb(),b=d.prepare('SELECT COUNT(*) n,MAX(updated_at) u FROM bookings').get(),l=d.prepare('SELECT COUNT(*) n,MAX(id) m FROM ledger').get();return`W/"${b.n}-${b.u}-${l.n}-${l.m}"`};
export const getSetting=k=>{const r=getDb().prepare('SELECT value FROM settings WHERE key=?').get(k);return r?r.value:null};
export const setSetting=(k,v)=>getDb().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,v);
/** A guest's upcoming, still-active bookings (used to re-send their references). */
export const findActiveByEmail=email=>q("SELECT * FROM bookings WHERE lower(email)=? AND status IN ('pending','confirmed') AND check_out>=? AND NOT(status='pending' AND created_at<?) ORDER BY created_at DESC,id LIMIT 30",String(email).trim().toLowerCase(),today(),Date.now()-PENDING_MS).map(row);
export const getBooking=id=>row(getDb().prepare('SELECT * FROM bookings WHERE id=?').get(id));
export const getGroup=g=>q('SELECT * FROM bookings WHERE group_id=? ORDER BY id',g).map(row);
export const findForGuest=(ref,email)=>q('SELECT * FROM bookings WHERE (id=? OR group_id=?) AND lower(email)=? ORDER BY id',String(ref).trim().toUpperCase(),String(ref).trim().toUpperCase(),String(email).trim().toLowerCase()).map(row);
export function insertBookings(db,rows){
 const values=rows.map(()=>'(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
 db.prepare(`INSERT INTO bookings(id,group_id,token,type,unit,check_in,check_out,guests,name,email,phone,total,down,status,event,notes,created_at,updated_at,source) VALUES ${values}`)
  .run(...rows.flatMap(b=>[b.id,b.group,b.token,b.type,b.unit,b.in,b.out,b.guests,b.name,b.email,b.phone,b.total,b.down,b.status||'pending',b.event||'',b.notes||'',b.at,b.at,b.source||'online']));
}
export const insertBooking=(db,booking)=>insertBookings(db,[booking]);
export const setGroupStatus=(d,group,status)=>d.prepare('UPDATE bookings SET status=?,updated_at=? WHERE group_id=?').run(status,Date.now(),group);

// ---- audit log ----
export const audit=(actor,action,ref,detail='')=>getDb().prepare('INSERT INTO audit_log(at,actor,action,ref,detail) VALUES(?,?,?,?,?)').run(Date.now(),actor,action,ref??null,String(detail).slice(0,500));
export function listAudit({limit=100,offset=0,q:s=''}={}){
 const like='%'+String(s).trim().replace(/[\\%_]/g,m=>'\\'+m)+'%';
 return q("SELECT id,at,actor,action AS audit_action,ref,detail FROM audit_log WHERE actor LIKE ? ESCAPE '\\' OR action LIKE ? ESCAPE '\\' OR ref LIKE ? ESCAPE '\\' OR detail LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT ? OFFSET ?",like,like,like,like,Math.min(+limit||100,500),Math.max(+offset||0,0))
  .map(({audit_action,...row})=>({...row,action:audit_action}))}

// ---- reviews ----
const rev=r=>r&&{id:r.id,booking:r.booking_id,name:r.name,rating:r.rating,text:r.text,status:r.status,at:r.created_at};
export const reviewFor=bookingId=>rev(getDb().prepare('SELECT * FROM reviews WHERE booking_id=?').get(bookingId));
export const approvedReviews=(n=12)=>q("SELECT * FROM reviews WHERE status='approved' ORDER BY created_at DESC LIMIT ?",n).map(rev);
export const approvedReviewStats=()=>({...getDb().prepare("SELECT COUNT(*) count, AVG(rating) average FROM reviews WHERE status='approved'").get()});
export const allReviews=()=>q('SELECT * FROM reviews ORDER BY created_at DESC').map(rev);
export const insertReview=r=>getDb().prepare('INSERT INTO reviews(booking_id,name,rating,text,status,created_at) VALUES(?,?,?,?,?,?)').run(r.booking,r.name,r.rating,r.text,r.status||'pending',r.at||Date.now());
export const updateReview=(id,status)=>getDb().prepare('UPDATE reviews SET status=? WHERE id=?').run(status,id).changes;
export const deleteReview=id=>getDb().prepare('DELETE FROM reviews WHERE id=?').run(id).changes;
export const getReview=id=>rev(getDb().prepare('SELECT * FROM reviews WHERE id=?').get(id));

export const markCancelled=(d,group,refundable)=>d.prepare('UPDATE bookings SET cancelled_at=?,refundable=? WHERE group_id=?').run(Date.now(),refundable?1:0,group);
export const updateBookingRow=(d,id,b)=>d.prepare('UPDATE bookings SET unit=?,check_in=?,check_out=?,total=?,down=?,updated_at=? WHERE id=?').run(b.unit,b.in,b.out,b.total,b.down,Date.now(),id);

// ---- payments ledger: payment (money in), refund (money out), charge (fine or extra owed by the guest) ----
const led=r=>r&&{id:r.id,group:r.group_id,at:r.at,kind:r.kind,amount:r.amount,method:r.method,ref:r.ref,note:r.note,by:r.staff_name};
export const insertEntry=(d,e)=>d.prepare('INSERT INTO ledger(group_id,at,kind,amount,method,ref,note,staff_name) VALUES(?,?,?,?,?,?,?,?)').run(e.group,e.at||Date.now(),e.kind,e.amount,e.method||'',e.ref||'',e.note||'',e.by);
export const ledgerFor=g=>q('SELECT * FROM ledger WHERE group_id=? ORDER BY id',g).map(led);
const SUMS="SUM(CASE kind WHEN 'payment' THEN amount WHEN 'refund' THEN -amount ELSE 0 END) paid,SUM(CASE kind WHEN 'charge' THEN amount ELSE 0 END) charges";
export const groupMoney=g=>{const r=getDb().prepare(`SELECT ${SUMS} FROM ledger WHERE group_id=?`).get(g);return{paid:r.paid||0,charges:r.charges||0}};
export const ledgerTotals=()=>Object.fromEntries(q(`SELECT group_id,${SUMS} FROM ledger GROUP BY group_id`).map(r=>[r.group_id,{paid:r.paid||0,charges:r.charges||0}]));
