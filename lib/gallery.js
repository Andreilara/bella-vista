// Gallery photos come from staff uploads, the public folder, and bundled concept images.
//  1. Legacy staff uploads. The files live in data/gallery (or GALLERY_DIR) and their title, category and order live in the database.
//  2. Files dropped into /public/gallery named <category>-<title>.jpg (the original method). They are listed after the uploaded ones.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {getDb,audit} from './db.js';
import {conceptPhotos,retiredDemoPhotos} from './concept-photos.js';

export const GALLERY_CATS=['Cover','Rooms','Family Rooms','Event Hall','Events','Grounds','Dining'];
/** Where each category appears, so nothing an administrator uploads goes unseen. Every photo not used in a slot below also appears in the Gallery. */
export const CAT_WHERE={Cover:'The large arch picture at the top of the home page (the first Cover photo)',Rooms:'The Standard Rooms row and the Standard Rooms page',
 'Family Rooms':'The Family Rooms row and the Family Rooms page','Event Hall':'The Event Hall row and the Event Hall page',Events:'The Event Hall page, and its row if there is no Event Hall photo',
 Grounds:'The House section','Dining':'The House section if there is no Grounds photo; otherwise the Gallery'};
export const MAX_PHOTO_BYTES=8*1024*1024;export const MAX_PHOTOS=60;
const TYPES={jpg:'image/jpeg',png:'image/png',webp:'image/webp'};
const dir=()=>process.env.GALLERY_DIR||path.join(process.cwd(),'data','gallery');
export const galleryDir=dir;
/** The only file names this module ever creates (16 hex characters and a known extension). Backup and restore use it too. */
export const PHOTO_NAME=/^[a-f0-9]{16}\.(jpg|png|webp)$/;
const q=(sql,...p)=>getDb().prepare(sql).all(...p),one=(sql,...p)=>getDb().prepare(sql).get(...p);
const t=(v,n)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);

/** Which image type a file really is, from its first bytes (the file name and the browser's claim are not trusted). */
export function sniff(buf){
 if(buf.length>12&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return'jpg';
 if(buf.length>12&&buf.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return'png';
 if(buf.length>12&&buf.toString('latin1',0,4)==='RIFF'&&buf.toString('latin1',8,12)==='WEBP')return'webp';
 return null}

const item=r=>({id:r.id,src:'/api/photo/'+r.file,cat:r.cat,title:r.title,managed:true});
export const managedPhotos=()=>q('SELECT * FROM gallery ORDER BY sort,id').map(item);

// ---- photos dropped into /public/gallery (original method) ----
const EXT=/\.(jpe?g|png|webp|avif)$/i;
const CATS={cover:'Cover',hero:'Cover',rooms:'Rooms',room:'Rooms',std:'Rooms',standard:'Rooms',fam:'Family Rooms',family:'Family Rooms',hall:'Event Hall',events:'Events',event:'Events',grounds:'Grounds',garden:'Grounds',views:'Grounds',exterior:'Grounds',dining:'Dining'};
export function folderPhotos(){
 let files;try{files=fs.readdirSync(path.join(process.cwd(),'public','gallery'))}catch{return[]}
 return files.filter(f=>EXT.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(f=>{
  const [pre,...rest]=f.replace(EXT,'').split(/[-_\s]+/),known=CATS[pre.toLowerCase()],cat=known||'Gallery',words=(known?rest:[pre,...rest]).filter(w=>!/^\d+$/.test(w)).join(' ');
  return{src:'/gallery/'+encodeURIComponent(f),cat,title:words?words[0].toUpperCase()+words.slice(1):cat}})}

/** Everything the website shows, in order. The first photo in the Cover category is the hero picture on the home page. */
export function galleryPhotos(){
 let managed=[];
 try{managed=managedPhotos()}catch(e){console.error(e)}
 return [...managed.filter(photo=>!retiredDemoPhotos.has(photo.src)),...folderPhotos(),...conceptPhotos];
}

// ---- changes (administrators only; the API routes check the role) ----
export function addPhoto({buffer,cat,title},by='admin'){
 if(!buffer||!buffer.length)return{error:'Choose a photo to upload.',code:400};
 if(buffer.length>MAX_PHOTO_BYTES)return{error:'That photo is larger than 8 MB. Resize it (squoosh.app is free) and try again.',code:400};
 const ext=sniff(buffer);if(!ext)return{error:'Only JPG, PNG or WebP photos can be uploaded.',code:400};
 if(!GALLERY_CATS.includes(cat))return{error:'Choose a category.',code:400};
 if(one('SELECT COUNT(*) n FROM gallery').n>=MAX_PHOTOS)return{error:`The gallery is limited to ${MAX_PHOTOS} uploaded photos. Delete one first.`,code:400};
 const name=t(title,80)||cat,file=crypto.randomBytes(8).toString('hex')+'.'+ext;
 fs.mkdirSync(dir(),{recursive:true});fs.writeFileSync(path.join(dir(),file),buffer);
 const sort=(one('SELECT MAX(sort) m FROM gallery').m||0)+1,r=getDb().prepare('INSERT INTO gallery(file,cat,title,sort,created_at) VALUES(?,?,?,?,?)').run(file,cat,name,sort,Date.now());
 audit(by,'gallery.added',String(r.lastInsertRowid),`${cat} | ${name}`);return{ok:true,id:Number(r.lastInsertRowid)}}

export function updatePhoto(id,{title,cat},by='admin'){
 const r=one('SELECT * FROM gallery WHERE id=?',id);if(!r)return{error:'Photo not found.',code:404};
 const n=title===undefined?r.title:t(title,80)||r.cat,c=cat===undefined?r.cat:cat;
 if(!GALLERY_CATS.includes(c))return{error:'Choose a category.',code:400};
 getDb().prepare('UPDATE gallery SET title=?,cat=? WHERE id=?').run(n,c,id);audit(by,'gallery.edited',String(id),`${c} | ${n}`);return{ok:true}}

/** how: 'cover' (first photo, also the home-page hero), 'earlier' or 'later' (swap with the neighbour). */
export function movePhoto(id,how,by='admin'){
 const rows=q('SELECT id,sort FROM gallery ORDER BY sort,id'),i=rows.findIndex(r=>r.id===id);if(i<0)return{error:'Photo not found.',code:404};
 let order=rows.map(r=>r.id);const [me]=order.splice(i,1);
 if(how==='cover')order.unshift(me);else if(how==='earlier')order.splice(Math.max(0,i-1),0,me);else if(how==='later')order.splice(Math.min(order.length,i+1),0,me);else return{error:'Unknown move.',code:400};
 const d=getDb(),up=d.prepare('UPDATE gallery SET sort=? WHERE id=?');order.forEach((x,k)=>up.run(k+1,x));   // renumber, so order is always 1..n
 audit(by,'gallery.moved',String(id),how);return{ok:true}}

/** Makes a photo the home-page cover: it moves into the Cover category and to the front of the order. */
export function setCover(id,by='admin'){
 const r=one('SELECT * FROM gallery WHERE id=?',id);if(!r)return{error:'Photo not found.',code:404};
 getDb().prepare('UPDATE gallery SET cat=? WHERE id=?').run('Cover',id);return movePhoto(id,'cover',by)}

export function deletePhoto(id,by='admin'){
 const r=one('SELECT * FROM gallery WHERE id=?',id);if(!r)return{error:'Photo not found.',code:404};
 getDb().prepare('DELETE FROM gallery WHERE id=?').run(id);try{fs.unlinkSync(path.join(/* turbopackIgnore: true */ dir(),r.file))}catch{}
 audit(by,'gallery.deleted',String(id),`${r.cat} | ${r.title}`);return{ok:true}}

/** For the file route: only names this module generated are served (16 hex characters and a known extension), so no path can be forged. */
export function photoFile(name){
 const m=PHOTO_NAME.exec(String(name));if(!m)return null;
 const file=path.join(/* turbopackIgnore: true */ dir(),name);return fs.existsSync(/* turbopackIgnore: true */ file)?{file,type:TYPES[m[1]]}:null}
