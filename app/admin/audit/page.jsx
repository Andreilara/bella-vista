'use client';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import {useCallback,useEffect,useRef,useState} from 'react';import Link from 'next/link';
import {api} from '../../../lib/adminClient.js';import {fmtStamp} from '../../../lib/format.js';
const PAGE=50,TONE={'booking.created':'text-emerald-800','booking.status':'text-amber-800','admin.login_failed':'text-red-700','review.deleted':'text-red-700'};
export default function Audit(){
 const requestId=useRef(0),[error,setError]=useState('');
 const [rows,setRows]=useState(null),[q,setQ]=useState(''),[more,setMore]=useState(false),[busy,setBusy]=useState(false);
 const load=useCallback(async(reset,offset=0)=>{
  const current=++requestId.current;
  setBusy(true);setError('');
  try{
   const response=await api('/api/audit?'+new URLSearchParams({limit:PAGE,offset,q}));
   const result=await response.json();
   if(current!==requestId.current)return;
   if(!response.ok){setError(result.error||'Could not load the audit log.');return}
   setRows(previous=>reset||!previous?result.entries:[...previous,...result.entries]);
   setMore(result.entries.length===PAGE);
  }catch{if(current===requestId.current)setError('Could not load the audit log. Try again.')}
  finally{if(current===requestId.current)setBusy(false)}
 },[q]);
 useEffect(()=>{
  setMore(false);
  const timer=setTimeout(()=>load(true),250);
  return()=>{clearTimeout(timer);requestId.current++};
 },[load]);
 return <main className="staff-page"><h1 className="font-display h-lg">Audit log</h1>
  <div className="staff-toolbar mt-6 flex flex-wrap items-end gap-4"><label className="field-stack w-full max-w-72">Filter audit log<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Action, reference, or detail" className="fld !py-2 text-sm"/></label><button onClick={()=>load(true)} className="pill !px-4 !py-2 text-sm hover:bg-ink hover:text-paper">Refresh</button></div>
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  {!rows?(!error&&<LoadingSkeleton label="Loading audit log" className="mt-4"/>):<div className="staff-table mt-4 overflow-x-auto"><table className="w-full min-w-[45rem] text-left text-sm"><thead className="text-ash"><tr>{['When (PH time)','Who','Action','Reference','Details'].map(h=><th key={h} className="p-3 font-normal">{h}</th>)}</tr></thead><tbody>
   {rows.map(a=><tr key={a.id} className="border-t border-line align-top"><td className="whitespace-nowrap p-3 text-ash">{fmtStamp(a.at)}</td><td className="p-3 capitalize">{a.actor}</td><td className={'p-3 font-mono text-xs '+(TONE[a.action]||'')}>{a.action}</td>
    <td className="p-3">{a.ref?.startsWith('BV-')?<Link className="underline underline-offset-4" href={'/admin?ref='+a.ref}>{a.ref}</Link>:a.ref||'·'}</td><td className="p-3 text-ash">{a.detail}</td></tr>)}
   {!rows.length&&<tr><td colSpan={5} className="p-8 text-center text-ash">No entries{q&&' match'}.</td></tr>}</tbody></table></div>}
  {more&&<button disabled={busy} onClick={()=>load(false,rows.length)} className="pill mt-6 hover:bg-ink hover:text-paper">{busy?'Loading…':'Load more'}</button>}</main>}
