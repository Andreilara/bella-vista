// Staff accounts and sessions. Passwords are hashed with scrypt; session tokens are stored only as SHA-256 hashes.
import crypto from 'node:crypto';import {getDb,audit} from './db.js';
export const ROLES={admin:'Administrator',frontdesk:'Front desk'};
const SESSION_MS=8*36e5,sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const hash=(pw,salt=crypto.randomBytes(16).toString('hex'))=>salt+':'+crypto.scryptSync(pw,salt,32).toString('hex');
const same=(pw,stored)=>{const[salt,h]=String(stored).split(':'),a=Buffer.from(h||'','hex'),b=crypto.scryptSync(pw,salt||'',32);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const pub=r=>!r?null:{id:r.id,username:r.username,name:r.name,role:r.role,active:!!r.active,created:r.created_at,lastLogin:r.last_login};
const one=(sql,...p)=>getDb().prepare(sql).get(...p);

/** First run: create the 'admin' account. Its starting password is ADMIN_PASSCODE (or 'admin2026' outside production). */
export function bootstrap(){
 if(one('SELECT COUNT(*) n FROM staff').n)return;
 const pw=process.env.ADMIN_PASSCODE||(process.env.NODE_ENV==='production'?null:'admin2026');if(!pw)return;
 createStaff({username:'admin',name:'Administrator',role:'admin',password:pw},'system')}

/** True while the 'admin' account still has its starting password (ADMIN_PASSCODE, or the development default). */
export function usingStartingPassword(){
 const pw=process.env.ADMIN_PASSCODE||(process.env.NODE_ENV==='production'?null:'admin2026');if(!pw)return false;
 const r=one("SELECT pass FROM staff WHERE username='admin' AND active=1");return !!r&&same(pw,r.pass)}

export function createStaff({username,name,role,password},by='admin'){
 const u=String(username||'').trim(),n=String(name||'').trim().slice(0,60);
 if(!/^[a-z0-9._-]{3,30}$/i.test(u))return{error:'Username must be 3 to 30 letters, numbers, dots, dashes or underscores.'};
 if(!n)return{error:'Enter the staff member\u2019s name.'};if(!ROLES[role])return{error:'Choose a role.'};
 if(String(password||'').length<8&&by!=='system')return{error:'Password must be at least 8 characters.'};
 if(one('SELECT 1 x FROM staff WHERE username=?',u))return{error:'That username is already taken.'};
 const r=getDb().prepare('INSERT INTO staff(username,name,role,pass,created_at) VALUES(?,?,?,?,?)').run(u,n,role,hash(String(password)),Date.now());
 audit(by,'staff.created',u,`${ROLES[role]}: ${n}`);return{ok:true,id:Number(r.lastInsertRowid)}}

const DUMMY=hash('not-a-real-password');
export function login(username,password){
 bootstrap();const r=one('SELECT * FROM staff WHERE username=? AND active=1',String(username||'').trim()),ok=same(String(password||''),r?r.pass:DUMMY);
 if(!r||!ok)return null;
 const d=getDb(),token=crypto.randomBytes(32).toString('hex');
 d.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
 d.prepare('INSERT INTO sessions(token,staff_id,expires_at) VALUES(?,?,?)').run(sha(token),r.id,Date.now()+SESSION_MS);
 d.prepare('UPDATE staff SET last_login=? WHERE id=?').run(Date.now(),r.id);return{token,staff:pub(r),maxAge:SESSION_MS/1000}}
export const findSession=token=>pub(one('SELECT s.* FROM sessions x JOIN staff s ON s.id=x.staff_id WHERE x.token=? AND x.expires_at>? AND s.active=1',sha(String(token)),Date.now()));
export const logout=token=>getDb().prepare('DELETE FROM sessions WHERE token=?').run(sha(String(token)));

export const listStaff=()=>{bootstrap();return getDb().prepare('SELECT * FROM staff ORDER BY id').all().map(pub)};
// ---- password-reset requests ----
// There is no self-service reset and no email link: staff ask from the sign-in screen, an administrator sees the request on the Staff page and sets a new password.
export function requestReset(username){
 bootstrap();const r=one('SELECT * FROM staff WHERE username=? AND active=1',String(username||'').trim());
 if(!r)return{ok:true};   // the same answer for unknown names, so usernames cannot be probed
 if(one('SELECT 1 x FROM reset_requests WHERE staff_id=? AND handled_at IS NULL',r.id))return{ok:true};   // one open request per person
 getDb().prepare('INSERT INTO reset_requests(staff_id,requested_at) VALUES(?,?)').run(r.id,Date.now());
 audit('sign-in screen','staff.reset_requested',r.username);return{ok:true}}
export const listResets=()=>getDb().prepare('SELECT x.id,x.requested_at at,s.id staff_id,s.name,s.username FROM reset_requests x JOIN staff s ON s.id=x.staff_id WHERE x.handled_at IS NULL AND s.active=1 ORDER BY x.id').all().map(r=>({id:r.id,at:r.at,staffId:r.staff_id,name:r.name,username:r.username}));
export const pendingResetCount=()=>listResets().length;
export function dismissReset(id,by){
 const r=getDb().prepare('UPDATE reset_requests SET handled_at=?,handled_by=? WHERE id=? AND handled_at IS NULL').run(Date.now(),by,id);
 if(r.changes)audit(by,'staff.reset_dismissed',String(id));return{ok:true}}
const settle=(d,staffId,by)=>d.prepare('UPDATE reset_requests SET handled_at=?,handled_by=? WHERE staff_id=? AND handled_at IS NULL').run(Date.now(),by,staffId);
const admins=()=>one("SELECT COUNT(*) n FROM staff WHERE role='admin' AND active=1").n;
export function updateStaff(id,{active,role,password},by){
 const r=one('SELECT * FROM staff WHERE id=?',id);if(!r)return{error:'Not found',code:404};const d=getDb();
 if((active===false||(role&&role!=='admin'))&&r.role==='admin'&&r.active&&admins()<=1)return{error:'At least one active administrator is required.',code:400};
 if(role!==undefined){if(!ROLES[role])return{error:'Choose a role.',code:400};d.prepare('UPDATE staff SET role=? WHERE id=?').run(role,id);audit(by,'staff.role',r.username,`${r.role} to ${role}`)}
 if(active!==undefined){d.prepare('UPDATE staff SET active=? WHERE id=?').run(active?1:0,id);if(!active)d.prepare('DELETE FROM sessions WHERE staff_id=?').run(id);audit(by,active?'staff.activated':'staff.deactivated',r.username)}
 if(password!==undefined){if(String(password).length<8)return{error:'Password must be at least 8 characters.',code:400};d.prepare('UPDATE staff SET pass=? WHERE id=?').run(hash(String(password)),id);d.prepare('DELETE FROM sessions WHERE staff_id=?').run(id);settle(d,id,by);audit(by,'staff.password_reset',r.username)}
 return{ok:true}}
export function changePassword(id,current,next){
 const r=one('SELECT * FROM staff WHERE id=?',id);if(!r||!same(String(current||''),r.pass))return{error:'Your current password is incorrect.',code:400};
 if(String(next||'').length<8)return{error:'New password must be at least 8 characters.',code:400};
 getDb().prepare('UPDATE staff SET pass=? WHERE id=?').run(hash(String(next)),id);settle(getDb(),id,r.username);audit(r.username,'staff.password_changed',r.username);return{ok:true}}
