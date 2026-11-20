'use client';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import {useEffect,useState} from 'react';
import {api} from '../../../lib/adminClient.js';import BackupManager from '../../../components/BackupManager';
const blank={method:'',account:'',number:''};
const withPaymentRow=contact=>({...contact,payments:contact.payments.length?contact.payments:[{...blank}]});
export default function SettingsPage(){
 const [c,setC]=useState(null),[err,setErr]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{api('/api/settings').then(async response=>{
  const result=await response.json();
  if(response.ok)setC(withPaymentRow(result.contact));
  else setErr(result.error||'Could not load settings.');
 }).catch(()=>setErr('Could not load settings. Try again.'))},[]);
 if(!c&&err)return <main className="staff-page"><h1 className="font-display h-lg">Settings</h1><p role="alert" className="mt-4 text-red-700">{err}</p></main>;
 if(!c)return <LoadingSkeleton label="Loading settings" className="mx-auto max-w-6xl p-6 md:p-12"/>;
 const set=(k,v)=>{setOk('');setC(s=>({...s,[k]:v}))};
 const setPay=(i,k,v)=>{setOk('');setC(s=>({...s,payments:s.payments.map((p,j)=>j===i?{...p,[k]:v}:p)}))};
 const save=async e=>{e.preventDefault();if(busy)return;setErr('');setOk('');setBusy(true);
  try{const r=await api('/api/settings',{method:'PUT',body:JSON.stringify(c)}),j=await r.json();
  if(r.ok){setC(withPaymentRow(j.contact));setOk('Settings saved.')}else setErr(j.error||'Could not save settings.')}
  catch{setErr('Could not reach Bella Vista. Try again.')}
  finally{setBusy(false)}};
 return <main className="staff-page"><h1 className="font-display h-lg">Settings</h1>
  <form onSubmit={save} className="mt-6 grid gap-4">
   <section className="staff-panel"><h2 className="font-display h-md">Contact</h2><div className="staff-form-group mt-2">
   <div><label className="field-label" htmlFor="s-phone">Phone or mobile</label><input id="s-phone" className="fld mt-1 max-w-sm" inputMode="tel" autoComplete="off" value={c.phone} onChange={e=>set('phone',e.target.value)} placeholder="0917 123 4567"/></div>
   <div><label className="field-label" htmlFor="s-email">Email</label><input id="s-email" type="email" className="fld mt-1 max-w-sm" autoComplete="off" value={c.email} onChange={e=>set('email',e.target.value)} placeholder="reservations@yourdomain.com"/></div>
   <div className="sm:col-span-2"><label className="field-label" htmlFor="s-addr">Address</label><input id="s-addr" className="fld mt-1" autoComplete="off" value={c.address} onChange={e=>set('address',e.target.value)} placeholder="Street, barangay, town, province"/></div></div></section>
   <section className="staff-panel"><h2 className="font-display h-md">Payment methods</h2>
   <ul className="mt-4 space-y-4">{c.payments.map((p,i)=><li key={i} className="card p-4"><div className="grid gap-3 sm:grid-cols-3">
    <div><label className="field-label" htmlFor={'p-m'+i}>How to pay</label><input id={'p-m'+i} className="fld mt-1" value={p.method} onChange={e=>setPay(i,'method',e.target.value)} placeholder="GCash"/></div>
    <div><label className="field-label" htmlFor={'p-a'+i}>Account name</label><input id={'p-a'+i} className="fld mt-1" value={p.account} onChange={e=>setPay(i,'account',e.target.value)} placeholder="Bella Vista Hotel"/></div>
    <div><label className="field-label" htmlFor={'p-n'+i}>Number (optional)</label><input id={'p-n'+i} className="fld mt-1" value={p.number} onChange={e=>setPay(i,'number',e.target.value)} placeholder="0917 123 4567"/></div></div>
    <button type="button" onClick={()=>{setOk('');setC(s=>({...s,payments:s.payments.filter((_,j)=>j!==i)}))}} className="mt-3 min-h-11 text-sm text-red-700 underline underline-offset-4">Remove this option</button></li>)}</ul>
   {c.payments.length<8&&<button type="button" onClick={()=>{setOk('');setC(s=>({...s,payments:[...s.payments,{...blank}]}))}} className="pill mt-4">Add payment method</button>}</section>
   <div className="mt-1 flex flex-wrap items-center gap-4"><button disabled={busy} className="btn">{busy?'Saving…':'Save settings'}</button><span role="status" className="text-sm font-medium text-emerald-800">{ok}</span><span role="alert" className="text-sm font-medium text-red-700">{err}</span></div></form>
  <BackupManager/>
</main>}
