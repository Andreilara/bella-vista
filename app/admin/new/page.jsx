'use client';
import {useEffect,useState} from 'react';import Link from 'next/link';
import {TYPES,EVENTS,fmt,quote,today,addDays,isFree,validate} from '../../../lib/rules.js';import {api} from '../../../lib/adminClient.js';
import {useStaffDraft} from '../../../components/StaffContext';
const DEF={std:2,fam:4,hall:30},fld='w-full fld text-sm',Field=({label,children,className=''})=><label className={'field-stack '+className}>{label}{children}</label>;
export default function NewBooking(){
 const t=today(),[f,setF,clearDraft]=useStaffDraft('new-booking',{source:'walk-in',type:'std',unit:'',in:t,out:addDays(t,1),guests:2,name:'',phone:'',email:'',event:'',notes:'',pay:true,amount:'',method:'Cash',ref:''}),[busy,setBusy]=useState([]),[err,setErr]=useState(''),[done,setDone]=useState(null),[saving,setSaving]=useState(false);
 useEffect(()=>{fetch('/api/bookings').then(r=>r.json()).then(j=>setBusy(j.busy||[])).catch(()=>{})},[done]);
 const T=TYPES[f.type],set=(k,v)=>setF(x=>({...x,[k]:v})),free=f.in&&f.out&&f.in<f.out?T.units.filter(u=>isFree(u,f.in,f.out,busy)):[],unit=free.includes(f.unit)?f.unit:free[0]||'';
 const problem=!f.in||!f.out?'Enter both stay dates.':f.in>=f.out?'Check-out must be after check-in.':!unit?'No unit of this type is free for those dates.':validate({type:f.type,unit,in:f.in,out:f.out,guests:f.guests},busy),q=!problem?quote(f.type,+f.guests,f.in,f.out):null,amount=f.amount===''?(q?q.down:0):Number(f.amount);
 const submit=async e=>{e.preventDefault();if(saving||problem)return;setErr('');setSaving(true);
  try{const r=await api('/api/walkin',{method:'POST',body:JSON.stringify({source:f.source,type:f.type,unit,in:f.in,out:f.out,guests:+f.guests,name:f.name,phone:f.phone,email:f.email,event:f.type==='hall'?f.event:'',notes:f.notes,payment:f.pay&&amount>0?{amount,method:f.method,ref:f.ref}:undefined})}),j=await r.json();
  if(r.ok){clearDraft();setDone(j)}else setErr(j.error||'Could not save the booking.')}
  catch{setErr('Could not reach Bella Vista. Try again.')}
  finally{setSaving(false)}};
 if(done)return <main className="mx-auto max-w-xl p-6 py-16 md:p-12"><p className="text-sm font-medium text-tile">Saved</p><h1 className="mt-2 text-3xl font-semibold tracking-wide md:text-4xl">{done.id}</h1>
  <p className="mt-4 text-ash">{done.status==='confirmed'?'Booking confirmed: the downpayment was recorded.':'Booking saved as pending. Record the downpayment to confirm it.'} {done.items.map(i=>i.unit).join(', ')} · {done.in} to {done.out} · total {fmt(done.total)}.</p>
  <div className="mt-8 flex flex-wrap gap-3"><Link href={'/admin?ref='+done.id} className="rounded-md bg-tile px-6 py-3 text-sm text-white">Open booking</Link><button onClick={()=>{setDone(null)}} className="pill hover:bg-ink hover:text-paper">New booking</button></div></main>;
 return <main className="staff-page"><h1 className="font-display h-lg">New booking</h1>
  <form onSubmit={submit} className="mt-6 grid gap-4">
   <fieldset className="staff-panel staff-form-group"><legend className="sr-only">Stay</legend><h2 className="font-display h-sm sm:col-span-2">Stay</h2>
   <Field label="Booked via"><select value={f.source} onChange={e=>set('source',e.target.value)} className={fld+' bg-surface'}><option value="walk-in">Walk-in</option><option value="phone">Phone call</option></select></Field>
   <Field label="Facility"><select value={f.type} onChange={e=>setF(x=>({...x,type:e.target.value,guests:DEF[e.target.value],unit:''}))} className={fld+' bg-surface'}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v.name} · {fmt(v.rate)}/night</option>)}</select></Field>
   <Field label="Check-in"><input type="date" required value={f.in} min={t} aria-describedby={problem?"staff-stay-problem":undefined} onChange={e=>setF(x=>({...x,in:e.target.value,out:e.target.value&&x.out&&e.target.value>=x.out?addDays(e.target.value,1):x.out}))} className={fld}/></Field>
   <Field label="Check-out"><input type="date" required value={f.out} min={f.in?addDays(f.in,1):undefined} aria-describedby={problem?"staff-stay-problem":undefined} onChange={e=>setF(x=>({...x,out:e.target.value}))} className={fld}/></Field>
   {problem&&<p id="staff-stay-problem" role="status" className="text-sm text-amber-800 sm:col-span-2">{problem}</p>}
   <Field label={`Unit (${free.length} free)`}><select value={unit} onChange={e=>set('unit',e.target.value)} className={fld+' bg-surface'}>{free.length?free.map(u=><option key={u}>{u}</option>):<option value="">None free</option>}</select></Field>
   <Field label={`Guests (${T.min>1?`${T.min} to ${T.max}`:`up to ${T.max}`})`}><input type="number" required min={T.min} max={T.max} value={f.guests} onChange={e=>setF(x=>({...x,guests:e.target.value}))} className={fld}/></Field>
   {f.type==='hall'&&<Field label="Occasion" className="sm:col-span-2"><select value={f.event} onChange={e=>set('event',e.target.value)} className={fld+' bg-surface'}><option value="">Not specified</option>{EVENTS.map(e=><option key={e}>{e}</option>)}</select></Field>}
   </fieldset><fieldset className="staff-panel staff-form-group"><legend className="sr-only">Guest</legend><h2 className="font-display h-sm sm:col-span-2">Guest</h2>
   <Field label="Guest name"><input required value={f.name} onChange={e=>set('name',e.target.value)} autoComplete="off" className={fld}/></Field>
   <Field label="Mobile number"><input required type="tel" value={f.phone} onChange={e=>set('phone',e.target.value)} className={fld}/></Field>
   <Field label="Email (optional)" className="sm:col-span-2"><input type="email" value={f.email} onChange={e=>set('email',e.target.value)} className={fld}/></Field>
   <Field label="Notes (optional)" className="sm:col-span-2"><input value={f.notes} maxLength={500} onChange={e=>set('notes',e.target.value)} className={fld}/></Field>
   </fieldset><div className="staff-payment p-4"><h2 className="mb-2 font-display h-sm">Payment</h2><p className="text-sm">{q?<>Total <b className="font-sans text-xl font-medium">{fmt(q.total)}</b> · {q.n} night{q.n===1?'':'s'} · downpayment {fmt(q.down)}</>:<span>Complete the stay details to see the total.</span>}</p>
    <label className="field-check-label mt-4"><input type="checkbox" checked={f.pay} onChange={e=>set('pay',e.target.checked)}/>Record a payment</label>
    {f.pay&&<div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Amount (₱)"><input type="number" min="1" value={f.amount===''?(q?q.down:''):f.amount} onChange={e=>set('amount',e.target.value)} className={fld}/></Field><Field label="Paid by"><select value={f.method} onChange={e=>set('method',e.target.value)} className={fld+' bg-surface'}>{['Cash','GCash','Bank transfer','Other'].map(m=><option key={m}>{m}</option>)}</select></Field><Field label="Reference no."><input value={f.ref} onChange={e=>set('ref',e.target.value)} className={fld}/></Field></div>}</div>
   <div className="flex flex-wrap items-center gap-3"><button disabled={saving||!!problem} className="btn">{saving?'Saving…':'Save booking'}</button><span role="alert" className="ml-4 text-sm text-red-700">{err}</span></div></form></main>}
