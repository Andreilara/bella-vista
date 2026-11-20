'use client';
import LoadingSkeleton from './LoadingSkeleton';
import {useCallback,useEffect,useState} from 'react';
import {useStaffDraft} from './StaffContext';
import {TYPES,fmt,quote,nightsBetween,expired,checkoutReached} from '../lib/rules.js';import {fmtShort,fmtStamp} from '../lib/format.js';import {api} from '../lib/adminClient.js';
const METHODS=['Cash','GCash','Bank transfer','Other'],PRESETS=[['No-smoking fine',2000],['Damage / breakage',0],['Extra guest / late check-out',0],['Other',0]];
const TONE={pending:'bg-amber-100 text-amber-900',confirmed:'bg-emerald-100 text-emerald-900',cancelled:'bg-red-100 text-red-900',completed:'bg-sky-100 text-sky-900',expired:'bg-ink/10 text-ash'};
const fld='w-full fld text-sm';
const Field=({label,children})=><label className="field-stack">{label}{children}</label>;
/** Everything staff do to one booking: money in/out, fines, reschedule, approve/complete/cancel. */
export default function BookingPanel({id,onChange,onClose}){
 const [d,setD]=useState(null),[mode,setMode]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const [drafts,setDrafts]=useStaffDraft('booking:'+id,{});
 const [loadError,setLoadError]=useState('');
 const load=useCallback(async()=>{
  setLoadError('');
  try{
   const response=await api('/api/bookings/'+id);
   if(!response.ok)throw Error((await response.json()).error||'Could not load booking details.');
   setD(await response.json());
  }catch(error){setLoadError(error instanceof TypeError?'Could not load booking details.':error.message)}
 },[id]);
 useEffect(()=>{setD(null);setMode(null);setMsg('');load()},[load]);
 if(!d)return loadError?<div className="p-6"><p role="alert">{loadError}</p><button className="pill mt-3" onClick={load}>Retry</button>{onClose&&<button className="pill ml-2" onClick={onClose}>Close</button>}</div>:<LoadingSkeleton label="Loading booking details" className="p-6"/>;
 const p=d.rows.find(r=>r.id===r.group)||d.rows[0],t=d.totals,st=expired(p)?'expired':p.status,open=['pending','confirmed'].includes(p.status),single=d.rows.length===1,f=drafts[mode]||{};
 const setF=update=>setDrafts(all=>({...all,[mode]:update(all[mode])}));
 const set=(k,v)=>setF(x=>({...x,[k]:v}));
 const run=async(path,body,method='POST')=>{
  if(busy)return false;
  setBusy(true);setMsg('');
  try{
   const r=await api(path,{method,body:JSON.stringify(body)}),j=await r.json().catch(()=>({}));
   if(!r.ok){setMsg(j.error||'Something went wrong.');return false}
   await load();onChange?.();return j;
  }catch{setMsg('Could not verify the update. Refresh the booking before trying again.');return false}
  finally{setBusy(false)}
 };
 const status=async s=>{if(s==='cancelled'&&!confirm('Cancel this booking'+(d.rows.length>1?' and every unit in its package':'')+'?'))return;
  if(s==='completed'&&t.balance>0&&!confirm(`A balance of ${fmt(t.balance)} is unpaid. Mark as completed anyway?`))return;await run('/api/bookings/'+id,{status:s},'PATCH')};
 const start=m=>{if(busy)return;setMsg('');setMode(m);
  const initial={
   pay:{amount:String(t.downShort>0?t.downShort:Math.max(t.balance,0)),method:'Cash',ref:'',note:'',confirm:p.status==='pending'},
   charge:{preset:PRESETS[0][0],amount:'2000',note:PRESETS[0][0]},
   refund:{amount:String(Math.max(t.paid,0)),method:'Cash',ref:'',note:''},
   move:{in:p.in,out:p.out,unit:p.unit}
  };
  setDrafts(all=>all[m]?all:{...all,[m]:initial[m]});
 };
 const send=async e=>{e.preventDefault();
  const ok=mode==='move'?await run(`/api/bookings/${id}/reschedule`,{in:f.in,out:f.out,unit:single?f.unit:undefined}):await run(`/api/bookings/${id}/ledger`,{kind:mode==='pay'?'payment':mode,amount:Number(f.amount),method:f.method,ref:f.ref,note:f.note,confirm:!!f.confirm});
  if(ok){setDrafts(({[mode]:saved,...remaining})=>remaining);setMode(null);if(ok.warning)setMsg(ok.warning)}};
 const newTotal=mode==='move'&&nightsBetween(f.in||'',f.out||'')>0?d.rows.reduce((s,r)=>s+quote(r.type,r.guests,f.in,f.out).total,0):null;
 const Btn=({on,children,cls='border-ink/55 hover:bg-ink hover:text-paper',...x})=><button type="button" onClick={on} disabled={busy||x.disabled} {...x} className={'min-h-11 rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-40 '+cls}>{children}</button>;
 return <section className="p-5 pb-safe md:p-8" aria-live="polite">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-tile">{p.id} · {p.source}</p><h2 className="mt-1 font-display h-lg">{p.name}</h2><p className="mt-1 text-sm text-ash">{[p.email,p.phone].filter(Boolean).join(' · ')}</p></div>
   <div className="flex items-center gap-3"><span className={'rounded-md px-3 py-1 text-xs '+TONE[st]}>{st}</span>{onClose&&<button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center text-3xl leading-none text-ash hover:text-ink">×</button>}</div></div>
  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-ash">Stay</dt><dd>{fmtShort(p.in)} to {fmtShort(p.out)} · {nightsBetween(p.in,p.out)} night{nightsBetween(p.in,p.out)===1?'':'s'}</dd></div><div><dt className="text-ash">{d.rows.length>1?'Units in this package':'Unit'}</dt><dd>{d.rows.map(r=>r.unit).join(', ')}</dd></div><div><dt className="text-ash">Guests</dt><dd>{p.guests}{p.event&&` · ${p.event}`}</dd></div></dl>
  {p.notes&&<p className="mt-3 text-sm text-tile">Notes: {p.notes}</p>}
  <div className="mt-6 grid gap-px bg-line text-sm sm:grid-cols-4">{[['Total',fmt(t.total)],['Fines & charges',fmt(t.charges)],['Paid so far',fmt(t.paid)],['Balance due',fmt(Math.max(0,t.balance)),t.balance>0]].map(([a,b,hot])=><div key={a} className="bg-surface p-4"><p className="text-xs text-ash">{a}</p><p className={'mt-1 font-sans text-xl font-medium '+(hot?'text-amber-800':'')}>{b}</p></div>)}</div>
  <p className="mt-2 text-xs text-ash">Downpayment required: {fmt(t.down)} · {t.downShort===0?<span className="text-emerald-800">received</span>:<span className="text-amber-800">{fmt(t.downShort)} still to receive</span>}</p>
  {d.refund&&<p className={'mt-4 border-l-2 pl-4 text-sm '+(d.refund.refundable?'border-amber-600 text-amber-900':'border-ink/55 text-ash')}>{d.refund.refundable?`Cancelled 3+ days before check-in: ${fmt(d.refund.amount)} is due back to the guest. Record the refund once it is sent.`:`Cancelled under 3 days before check-in: ${fmt(d.refund.amount)} is non-refundable and kept by the hotel.`}</p>}
  <div className="mt-6 flex flex-wrap gap-2">{st==='pending'&&<Btn on={()=>status('confirmed')} disabled={t.downShort>0} title={t.downShort>0?'Record the downpayment first':''} cls="border-emerald-700 text-emerald-800 hover:bg-emerald-700 hover:text-white">Approve</Btn>}
   {p.status==='confirmed'&&checkoutReached(p.out)&&<Btn on={()=>status('completed')} cls="border-sky-700 text-sky-800 hover:bg-sky-700 hover:text-white">Mark completed</Btn>}
   {!['cancelled','expired'].includes(st)&&<Btn on={()=>start('pay')}>Record payment</Btn>}{['confirmed','completed'].includes(p.status)&&<Btn on={()=>start('charge')}>Add fine / charge</Btn>}{t.paid>0&&<Btn on={()=>start('refund')}>Record refund</Btn>}
   {open&&st!=='expired'&&<Btn on={()=>start('move')}>Reschedule</Btn>}{open&&<Btn on={()=>status('cancelled')} cls="border-red-700 text-red-800 hover:bg-red-700 hover:text-white">Cancel booking</Btn>}</div>
  {mode&&<form onSubmit={send} className="mt-5 grid gap-4 border border-ink/20 p-5 sm:grid-cols-2">
   <p className="font-medium sm:col-span-2">{{pay:'Record a payment',charge:'Add a fine or charge',refund:'Record a refund',move:'Reschedule this booking'}[mode]}</p>
   {mode==='move'?<><Field label="Check-in"><input type="date" required value={f.in} onChange={e=>set('in',e.target.value)} className={fld}/></Field><Field label="Check-out"><input type="date" required value={f.out} min={f.in} onChange={e=>set('out',e.target.value)} className={fld}/></Field>
     {single&&<Field label="Unit"><select value={f.unit} onChange={e=>set('unit',e.target.value)} className={fld+' bg-surface'}>{TYPES[p.type].units.map(u=><option key={u}>{u}</option>)}</select></Field>}
     <p className="self-end text-sm text-ash sm:col-span-2">{newTotal!==null?<>New total <b className="text-ink">{fmt(newTotal)}</b> (was {fmt(t.total)}). The downpayment is recalculated at 50%; payments already received stay on the booking.</>:'Pick valid dates.'}</p></>
   :<>{mode==='charge'&&<Field label="Type"><select value={f.preset} onChange={e=>{const x=PRESETS.find(q=>q[0]===e.target.value);setF(y=>({...y,preset:x[0],note:x[0]==='Other'?'':x[0],amount:x[1]?String(x[1]):y.amount}))}} className={fld+' bg-surface'}>{PRESETS.map(q=><option key={q[0]}>{q[0]}</option>)}</select></Field>}
     <Field label="Amount (₱)"><input type="number" min="1" step="1" required value={f.amount} onChange={e=>set('amount',e.target.value)} className={fld}/></Field>
     {mode!=='charge'&&<Field label="Paid by"><select value={f.method} onChange={e=>set('method',e.target.value)} className={fld+' bg-surface'}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field>}
     {mode!=='charge'&&<Field label="Reference no. (optional)"><input value={f.ref} maxLength={60} onChange={e=>set('ref',e.target.value)} className={fld} placeholder="GCash / bank reference"/></Field>}
     <Field label={mode==='charge'?'Description':'Note (optional)'}><input required={mode==='charge'} value={f.note} maxLength={200} onChange={e=>set('note',e.target.value)} className={fld}/></Field>
     {mode==='pay'&&p.status==='pending'&&<label className="field-check-label self-end"><input type="checkbox" checked={!!f.confirm} onChange={e=>set('confirm',e.target.checked)}/>Confirm the booking once the downpayment is covered</label>}</>}
   <div className="flex items-center gap-3 sm:col-span-2"><button disabled={busy||(mode==='move'&&newTotal===null)} className="rounded-md bg-tile px-6 py-2.5 text-sm text-white disabled:opacity-40">{busy?'Saving…':'Save'}</button><button type="button" onClick={()=>setMode(null)} className="text-sm text-ash hover:text-ink">Close form</button></div></form>}
  {msg&&<p role="alert" className="mt-4 text-sm text-red-700">{msg}</p>}
  <h3 className="mt-8 font-display h-md">Payments &amp; charges</h3>
  {d.ledger.length?<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[35rem] text-left text-sm"><tbody>{d.ledger.map(x=><tr key={x.id} className="border-t border-line"><td className="whitespace-nowrap py-2 pr-3 text-ash">{fmtStamp(x.at)}</td><td className="py-2 pr-3 capitalize">{x.kind}</td><td className="py-2 pr-3 text-ash">{[x.method,x.ref,x.note].filter(Boolean).join(' · ')}</td><td className={'py-2 pr-3 text-right font-medium '+(x.kind==='payment'?'text-emerald-800':x.kind==='refund'?'text-amber-800':'text-red-700')}>{x.kind==='payment'?'+':x.kind==='refund'?'−':''}{fmt(x.amount)}</td><td className="py-2 text-right text-xs text-ash">{x.by}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-sm text-ash">Nothing recorded yet.</p>}
  <p className="mt-3 text-xs text-ash">Entries can't be edited or deleted, so the record stays trustworthy. To correct a mistake, add a refund or a charge.</p></section>}
