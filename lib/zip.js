// A small ZIP writer and reader with no dependencies (Node's built-in zlib only). Used by the backup and restore feature.
// Not a general-purpose ZIP library: no encryption, no ZIP64 (files up to 4 GB), entries are stored or deflated.
import zlib from 'node:zlib';
const LFH=0x04034b50,CDH=0x02014b50,EOCD=0x06054b50,U32=0xffffffff;

const dosStamp=d=>{const y=Math.max(d.getFullYear(),1980);return{time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((y-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}};

/** files: [{name, data: Buffer}] -> Buffer holding a .zip */
export function makeZip(files,when=new Date()){
 const {time,date}=dosStamp(when),parts=[],central=[];let offset=0;
 if(files.length>65535)throw new Error('Too many files for a zip.');
 for(const f of files){
  const name=Buffer.from(f.name,'utf8'),raw=Buffer.from(f.data),crc=zlib.crc32(raw)>>>0;
  let data=raw,method=0;
  if(raw.length>64){const z=zlib.deflateRawSync(raw,{level:6});if(z.length<raw.length){data=z;method=8}}   // photos are already compressed, so they stay stored
  if(offset+30+name.length+data.length>U32)throw new Error('The backup is larger than a zip file can hold (4 GB).');
  const h=Buffer.alloc(30);
  h.writeUInt32LE(LFH,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x0800,6);h.writeUInt16LE(method,8);h.writeUInt16LE(time,10);h.writeUInt16LE(date,12);
  h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(name.length,26);
  const c=Buffer.alloc(46);
  c.writeUInt32LE(CDH,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x0800,8);c.writeUInt16LE(method,10);c.writeUInt16LE(time,12);c.writeUInt16LE(date,14);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
  parts.push(h,name,data);central.push(c,name);offset+=30+name.length+data.length}
 const cd=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(EOCD,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...parts,cd,end])}

/**
 * Reads the table of contents of a zip held in memory. Returns a Map of name -> {size, read(maxBytes)}.
 * read() inflates one entry on demand, refuses anything bigger than maxBytes (zip bombs) and checks the CRC.
 * Throws on anything that is not a well-formed, unencrypted zip.
 */
export function readZip(buf,{maxEntries=1000}={}){
 let e=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-22-65535);i--)if(buf.readUInt32LE(i)===EOCD){e=i;break}
 if(e<0)throw new Error('Not a zip file');
 const n=buf.readUInt16LE(e+10),cdSize=buf.readUInt32LE(e+12),cdOff=buf.readUInt32LE(e+16);
 if(n>maxEntries)throw new Error('Too many files in the zip');
 if(cdOff+cdSize>e)throw new Error('Damaged zip');
 const out=new Map();let p=cdOff;
 for(let i=0;i<n;i++){
  if(p+46>buf.length||buf.readUInt32LE(p)!==CDH)throw new Error('Damaged zip');
  const flags=buf.readUInt16LE(p+8),method=buf.readUInt16LE(p+10),crc=buf.readUInt32LE(p+16),csize=buf.readUInt32LE(p+20),usize=buf.readUInt32LE(p+24),
   nl=buf.readUInt16LE(p+28),xl=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lho=buf.readUInt32LE(p+42),name=buf.toString('utf8',p+46,p+46+nl);
  p+=46+nl+xl+cl;
  if(flags&1)throw new Error('Encrypted zips are not supported');
  out.set(name,{size:usize,read(maxBytes=64*1048576){
   if(usize>maxBytes)throw new Error('A file in the zip is too large');
   if(lho+30>buf.length||buf.readUInt32LE(lho)!==LFH)throw new Error('Damaged zip');
   const start=lho+30+buf.readUInt16LE(lho+26)+buf.readUInt16LE(lho+28),raw=buf.subarray(start,start+csize);
   if(raw.length!==csize)throw new Error('Damaged zip');
   const data=method===0?Buffer.from(raw):method===8?zlib.inflateRawSync(raw,{maxOutputLength:Math.max(usize,1)}):null;
   if(!data||data.length!==usize||(zlib.crc32(data)>>>0)!==crc)throw new Error('Damaged zip');
   return data}})}
 return out}
