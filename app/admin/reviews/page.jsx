'use client';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import {useCallback,useEffect,useState} from 'react';import Link from 'next/link';
import {api} from '../../../lib/adminClient.js';import {fmtStamp} from '../../../lib/format.js';import {Stars} from '../../../components/Reviews.jsx';
const TABS=['pending','approved','rejected','all'];
export default function ReviewsAdmin(){
 const [rows,setRows]=useState(null),[tab,setTab]=useState('pending'),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setError('');
  try{
   const response=await api('/api/reviews');
   if(!response.ok)throw Error();
   setRows((await response.json()).reviews);
  }catch{setError('Could not load reviews.')}
 },[]);
 useEffect(()=>{load()},[load]);
 const update=async(id,options)=>{
  try{if(!(await api('/api/reviews/'+id,options)).ok)throw Error();await load()}
  catch{setError('Could not update the review.')}
 };
 const set=(id,status)=>update(id,{method:'PATCH',body:JSON.stringify({status})});
 const del=id=>{if(confirm('Delete this review permanently?'))void update(id,{method:'DELETE'})};
 if(error&&!rows)return <main className="staff-page"><h1 className="font-display h-lg">Guest reviews</h1><p role="alert">{error}</p><button className="pill mt-3" onClick={load}>Retry</button></main>;
 if(!rows)return <LoadingSkeleton label="Loading reviews" className="mx-auto max-w-6xl p-6 md:p-12"/>;const n=s=>rows.filter(r=>r.status===s).length,shown=rows.filter(r=>tab==='all'||r.status===tab);
 return <main className="staff-page"><h1 className="font-display h-lg">Guest reviews</h1>
  {error&&<p className="mt-3 text-red-700" role="alert">{error} <button className="lnk" onClick={load}>Refresh</button></p>}
  <div className="mt-8 flex flex-wrap gap-2">{TABS.map(k=><button key={k} aria-pressed={tab===k} onClick={()=>setTab(k)} className={'pill !px-4 !py-2 text-sm capitalize '+(tab===k?'border-tile bg-tile text-white':'hover:bg-ink hover:text-paper')}>{k} ({k==='all'?rows.length:n(k)})</button>)}</div>
  <ul className="mt-6 space-y-4">{shown.map(r=><li key={r.id} className="rounded-md border border-line bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Stars n={r.rating}/><span className="text-xs text-ash">{fmtStamp(r.at)} · <Link className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0" href={'/admin?ref='+r.booking}>{r.booking}</Link></span></div>
   <p className="mt-3">“{r.text}”</p><p className="mt-2 text-sm text-ash">{r.name}</p>
   <div className="mt-4 flex flex-wrap gap-2 text-sm">{r.status!=='approved'&&<button onClick={()=>set(r.id,'approved')} className="min-h-11 rounded-md bg-emerald-500/20 px-4 py-1.5 text-emerald-800">Approve &amp; publish</button>}{r.status!=='rejected'&&<button onClick={()=>set(r.id,'rejected')} className="min-h-11 rounded-md bg-amber-500/20 px-4 py-1.5 text-amber-800">{r.status==='approved'?'Unpublish':'Reject'}</button>}<button onClick={()=>del(r.id)} className="min-h-11 rounded-md bg-red-500/20 px-4 py-1.5 text-red-700">Delete</button><span className="ml-auto self-center text-xs capitalize text-ash">{r.status}</span></div></li>)}
  {!shown.length&&<li className="rounded-md border border-line bg-surface p-8 text-center text-ash">Nothing here.</li>}</ul></main>}
