import {NextResponse} from 'next/server';import {revalidatePath} from 'next/cache';import {need,COOKIE} from '../../../lib/auth';import limit from '../../../lib/limit';import {ip} from '../../../lib/ip.js';
import {createBackup,previewBackup,restoreBackup,backupInfo,markBackup,readTursoSafetyCopy,MAX_BACKUP_BYTES} from '../../../lib/backup.js';
import {usesTurso} from '../../../lib/db.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
// Browsers say where a request came from; anything started by another website is refused (the sign-in cookie is SameSite=Lax, this is a second lock).
const crossSite=req=>req.headers.get('sec-fetch-site')==='cross-site';
const browserLimit=()=>process.env.VERCEL==='1'?4*1024*1024:MAX_BACKUP_BYTES;
const download=(buffer,filename)=>{
 let offset=0;
 const stream=new ReadableStream({pull(controller){
  if(offset>=buffer.length){controller.close();return}
  const chunk=buffer.subarray(offset,offset+64*1024);
  offset+=chunk.length;controller.enqueue(chunk);
 }});
 return new Response(stream,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store'}});
};
// Administrators only. GET downloads a backup (?info=1 returns the last-backup note and counts instead).
export async function GET(req){const a=await need('admin');if(a.error)return err(a.error,a.code);if(crossSite(req))return err('Forbidden',403);
 const params=new URL(req.url).searchParams;
 if(params.get('info'))return NextResponse.json({...backupInfo(),maxRestoreBytes:browserLimit()});
 const safety=params.get('safety');
 if(safety){
  if(!usesTurso()||!/^before-restore-[\dTZ-]+-[a-f\d-]{36}\.zip$/.test(safety))return err('Backup not found.',404);
  const buffer=readTursoSafetyCopy(safety);
  return buffer?download(buffer,safety):err('Backup not found.',404);
 }
 if(limit('backup:'+a.staff.username,20,36e5))return err('Too many backups in a short time. Try again later.',429);
 let b;try{b=createBackup()}catch(e){console.error(e);return err('The backup could not be created. Try again.',500)}
 markBackup(a.staff.username);
 return download(b.buffer,b.filename)}
// POST: the raw .zip as the request body. ?dry=1 only checks the file and reports what is in it; without it the data is replaced.
export async function POST(req){const a=await need('admin');if(a.error)return err(a.error,a.code);if(crossSite(req))return err('Forbidden',403);
 if(limit('restore:'+ip(req),10,36e5))return err('Too many attempts. Try again later.',429);
 const max=browserLimit(),tooLarge='This backup is too large for browser restore. Use the server restore command.';
 if(+req.headers.get('content-length')>max)return err(tooLarge,413);
 const buf=Buffer.from(await req.arrayBuffer());if(!buf.length)return err('Choose a backup file first.',400);if(buf.length>max)return err(tooLarge,413);
 if(new URL(req.url).searchParams.get('dry')){const p=previewBackup(buf);return p.error?err(p.error,p.code):NextResponse.json(p)}
 const r=restoreBackup(buf,a.staff.username);if(r.error)return err(r.error,r.code);
 revalidatePath('/','layout');   // cached pages pick up the restored settings and reviews
 const res=NextResponse.json(r);res.cookies.delete(COOKIE);return res}   // every session was cleared; the browser's cookie goes too
