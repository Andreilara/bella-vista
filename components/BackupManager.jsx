'use client';
import LoadingSkeleton from './LoadingSkeleton';
import {useEffect,useRef,useState} from 'react';
// Admin > Settings > Backup and restore: download everything as one .zip, and load such a file on this or another device.
const when=v=>{const d=new Date(v);return isNaN(d)?'an unknown time':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
async function call(url,opts){const r=await fetch(url,opts);if(r.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('bv:unauth'));return{ok:r.ok,j:await r.json().catch(()=>({}))}}

export default function BackupManager(){
 const [info,setInfo]=useState(null),[file,setFile]=useState(null),[pv,setPv]=useState(null),[sure,setSure]=useState(false),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[done,setDone]=useState(null),input=useRef();
 const [loadError,setLoadError]=useState('');
 const load=async()=>{
  setLoadError('');
  try{const {ok,j}=await call('/api/backup?info=1');if(!ok)throw Error();setInfo(j)}
  catch{setLoadError('Could not load backup settings.')}
 };
 useEffect(()=>{load()},[]);
 const choose=async e=>{const f=e.target.files?.[0];setErr('');setPv(null);setSure(false);setFile(null);if(!f)return;
  if(!/\.zip$/i.test(f.name))return setErr('Choose the .zip file you downloaded from Backup.');
  if(info.maxRestoreBytes&&f.size>info.maxRestoreBytes){input.current.value='';return setErr('This backup is too large for browser restore. Use the server restore command.')}
  setBusy(true);
  try{
   const {ok,j}=await call('/api/backup?dry=1',{method:'POST',headers:{'Content-Type':'application/zip'},body:f});
   if(ok){setFile(f);setPv(j)}else throw Error(j.error||'That file could not be read.');
  }catch(error){setErr(error.message);if(input.current)input.current.value=''}
  finally{setBusy(false)}
 };
 const restore=async()=>{setErr('');setBusy(true);
  try{
   const {ok,j}=await call('/api/backup',{method:'POST',headers:{'Content-Type':'application/zip'},body:file});
   if(ok){setDone(j);setPv(null);setFile(null);setTimeout(()=>window.location.assign('/admin'),4000)}else setErr(j.error||'The restore failed.');
  }catch{setErr('Could not verify the restore. Sign in again and check your data.')}
  finally{setBusy(false)}
 };
 if(!info&&loadError)return <section className="mt-14"><h2 className="font-display h-md">Backup and restore</h2><p role="alert">{loadError}</p><button className="pill mt-3" onClick={load}>Retry</button></section>;
 if(!info)return <LoadingSkeleton label="Loading backup information" className="mt-14"/>;
 if(done)return <section className="mt-14 border-t border-line pt-10" aria-labelledby="bk-h"><h2 id="bk-h" className="font-display h-md">Backup and restore</h2>
  <div role="status" className="card mt-4 p-5"><p className="font-semibold text-emerald-800">Restored.</p>
   <p className="mt-2 text-sm text-ash">{plural(done.bookings,'booking')} restored. Sign in again to continue.</p>
   <a href="/admin" className="btn mt-4">Go to sign in</a></div></section>;
 return <section className="mt-14 border-t border-line pt-10" aria-labelledby="bk-h">
  <h2 id="bk-h" className="font-display h-md">Backup and restore</h2>
  <div className="card mt-5 p-5"><h3 className="text-lg font-semibold">1. Download a backup</h3>
   <p className="mt-1 text-sm text-ash">{info.last?`Last downloaded ${when(info.last.at)}.`:'No backup downloaded yet.'}</p>
   <a href="/api/backup" download onClick={()=>setTimeout(load,3000)} className="btn mt-4">Download backup</a>
   <p className="mt-3 text-xs text-ash">Keep this file private.</p></div>
  <div className="card mt-5 p-5"><h3 className="text-lg font-semibold">2. Restore from a backup</h3>
   <label className="field-label mt-4" htmlFor="bk-file">Backup file (.zip)</label>
   <input id="bk-file" ref={input} type="file" accept=".zip,application/zip" disabled={busy} onChange={choose} className="mt-1 block w-full max-w-md text-sm"/>
   {busy&&!pv&&<p role="status" className="mt-3 text-sm text-ash">Checking the file…</p>}
   {pv&&<div className="mt-4 rounded-md border border-line bg-fog/50 p-4"><p className="font-semibold">Backup from {when(pv.madeAt)}</p>
    <p className="mt-2 text-sm">{plural(pv.bookings,'booking')}, {plural(pv.staff,'staff account')}, {plural(pv.reviews,'review')}</p>
    <p className="mt-3 text-sm font-medium text-red-700">Restoring replaces current site data and signs everyone out.</p>
    <label className="field-check-label mt-3 min-h-11"><input type="checkbox" checked={sure} onChange={e=>setSure(e.target.checked)} className="mt-1 h-4 w-4"/><span>Confirm data replacement</span></label>
    <button type="button" disabled={!sure||busy} onClick={restore} className="btn mt-3">{busy?'Restoring…':'Restore backup'}</button></div>}
   <p role="alert" className="mt-3 text-sm font-medium text-red-700">{err}</p></div></section>}
