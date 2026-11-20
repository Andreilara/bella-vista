import os from 'node:os';import fs from 'node:fs';import path from 'node:path';
process.env.DB_PATH=':memory:';process.env.GALLERY_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'bv-gal-'));
import test from 'node:test';import assert from 'node:assert/strict';
import {addPhoto,updatePhoto,movePhoto,deletePhoto,managedPhotos,galleryPhotos,photoFile,sniff,MAX_PHOTO_BYTES} from '../lib/gallery.js';
import {listAudit} from '../lib/db.js';

const JPG=()=>Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(64,1)]);
const PNG=()=>Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.alloc(64,1)]);
const WEBP=()=>Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.alloc(32,1)]);
const ids=()=>managedPhotos().map(p=>p.id);

test('only real JPG, PNG and WebP files are accepted, judged by their bytes not their name',()=>{
 assert.equal(sniff(JPG()),'jpg');assert.equal(sniff(PNG()),'png');assert.equal(sniff(WEBP()),'webp');
 assert.equal(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')),null);
 assert.equal(sniff(Buffer.from('MZ'+'x'.repeat(40))),null);
 assert.match(addPhoto({buffer:Buffer.from('<svg></svg>'+' '.repeat(30)),cat:'Rooms',title:'x'}).error,/JPG, PNG or WebP/)});
test('uploading stores the file, lists it, and writes the audit log',()=>{
 const r=addPhoto({buffer:JPG(),cat:'Rooms',title:'  Room   A at dusk '},'admin');assert.ok(r.ok);
 const p=managedPhotos()[0];assert.equal(p.title,'Room A at dusk');assert.equal(p.cat,'Rooms');assert.match(p.src,/^\/api\/photo\/[a-f0-9]{16}\.jpg$/);
 const f=photoFile(p.src.split('/').pop());assert.ok(f);assert.equal(f.type,'image/jpeg');assert.ok(fs.existsSync(f.file));
 assert.ok(listAudit({q:'gallery.added'}).length>=1)});
test('a blank title falls back to the category; a bad category or oversize file is refused',()=>{
 addPhoto({buffer:PNG(),cat:'Grounds',title:''});assert.equal(managedPhotos().at(-1).title,'Grounds');
 assert.match(addPhoto({buffer:JPG(),cat:'Pool party',title:'x'}).error,/category/i);
 assert.match(addPhoto({buffer:Buffer.concat([JPG(),Buffer.alloc(MAX_PHOTO_BYTES)]),cat:'Rooms',title:'big'}).error,/8 MB/)});
test('only generated file names are served, so paths cannot be forged',()=>{
 for(const bad of ['../../etc/passwd','..%2f..%2fx.jpg','abc.jpg','0123456789abcdef.svg','0123456789abcdef.jpg/../x','0123456789abcdef.jpg'])assert.equal(photoFile(bad),null,bad)});
test('cover, earlier and later reorder the gallery; the first photo is the cover',()=>{
 for(const t of ['One','Two','Three'])addPhoto({buffer:WEBP(),cat:'Dining',title:t});
 let [a,b,c]=ids().slice(-3);
 movePhoto(c,'cover');assert.equal(managedPhotos()[0].id,c);
 movePhoto(c,'later');assert.equal(managedPhotos()[1].id,c);
 movePhoto(c,'earlier');movePhoto(c,'earlier');assert.equal(managedPhotos()[0].id,c);   // already first: stays first
 movePhoto(a,'later');const order=ids();assert.equal(order.length,new Set(order).size);
 assert.equal(galleryPhotos()[0].id,managedPhotos()[0].id);assert.match(movePhoto(a,'sideways').error,/Unknown/);assert.equal(movePhoto(99999,'cover').code,404)});
test('editing changes title and category, and rejects an unknown category',()=>{
 const id=ids()[0];assert.ok(updatePhoto(id,{title:'Renamed',cat:'Events'}).ok);const p=managedPhotos()[0];assert.equal(p.title,'Renamed');assert.equal(p.cat,'Events');
 assert.match(updatePhoto(id,{cat:'Nope'}).error,/category/i)});
test('deleting removes the row and the file',()=>{
 const p=managedPhotos()[0],name=p.src.split('/').pop(),file=photoFile(name).file;assert.ok(deletePhoto(p.id).ok);
 assert.ok(!managedPhotos().some(x=>x.id===p.id));assert.ok(!fs.existsSync(file));assert.equal(photoFile(name),null);assert.equal(deletePhoto(p.id).code,404)});

import {pickPhotos,roomPhotos} from '../lib/photos.js';import {setCover,GALLERY_CATS} from '../lib/gallery.js';
test('the hero comes only from the Cover category and never steals a room photo',()=>{
 const all=[{src:'a',cat:'Rooms'},{src:'b',cat:'Cover'},{src:'c',cat:'Events'},{src:'d',cat:'Dining'},{src:'e',cat:'Cover'}];
 const r=pickPhotos(all);assert.equal(r.hero.src,'b');assert.equal(r.rooms.std.src,'a');assert.equal(r.rooms.hall.src,'c');assert.equal(r.house.src,'d');
 assert.deepEqual(r.rest.map(p=>p.src),['e']);assert.equal(pickPhotos([{src:'a',cat:'Rooms'}]).hero,null);
 assert.deepEqual(roomPhotos(all,'hall').map(p=>p.src),['c'])});
test('Use as cover moves a photo into the Cover category and to the front',()=>{
 assert.ok(GALLERY_CATS.includes('Cover'));addPhoto({buffer:JPG(),cat:'Dining',title:'Pick me'});const id=ids().at(-1);
 assert.ok(setCover(id).ok);const p=managedPhotos()[0];assert.equal(p.id,id);assert.equal(p.cat,'Cover')});
