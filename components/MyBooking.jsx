'use client';
import {useLayoutEffect,useState} from 'react';import Link from 'next/link';
import {fmt,nightsBetween,validEmail} from '../lib/rules.js';import {fmtDate,fmtStamp} from '../lib/format.js';import Logo from './Logo';import {EmailField} from './ContactFields';import PayInfo,{ContactLine} from './PayInfo';import {useContact} from './ContactContext';import {Stars} from './Reviews';
import {useReservationDraft} from './ReservationDraft';
import BackLink from './BackLink';
const TONE={pending:'bg-amber-100 text-amber-900',confirmed:'bg-emerald-100 text-emerald-900',completed:'bg-sky-100 text-sky-900',cancelled:'bg-red-100 text-red-900',expired:'bg-fog text-ink'};
const post=(url,body)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const WORDS={pending:'Awaiting downpayment',confirmed:'Confirmed',completed:'Stay completed',cancelled:'Cancelled',expired:'Hold expired'};
/** "Lost your reference?" Emails the guest their upcoming booking links (needs email to be set up on the server). */
function RecoverRefs({defaultEmail}){
 const c=useContact(),[em,setEm]=useState(defaultEmail||''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const send=async e=>{e.preventDefault();setMsg('');if(!validEmail(em))return setMsg('err:Enter the email you booked with.');setBusy(true);
  try{const res=await post('/api/lookup/recover',{email:em}),j=await res.json();
   setMsg(!res.ok?'err:'+(j.error||'Please try again.'):j.ok===false?'off':'sent')}catch{setMsg('err:Connection problem. Please try again.')}setBusy(false)};
 return <details className="mt-6 rounded-md border border-line bg-surface px-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Lost your reference?</summary>
  <form onSubmit={send} className="pb-4"><p className="text-sm text-ash">We’ll email you the links to your upcoming bookings.</p>
   <label className="field-label mt-3" htmlFor="bv-recover-email">Email you booked with</label>
   <input id="bv-recover-email" type="email" autoComplete="email" value={em} onChange={e=>setEm(e.target.value)} className="fld mt-1"/>
   <button disabled={busy} className="pill mt-3 w-full sm:w-auto">{busy?'Sending…':'Email me my bookings'}</button>
   <p role="status" className={'mt-3 text-sm '+(msg.startsWith('err:')?'font-medium text-red-700':'text-ash')}>
    {msg==='sent'?'If that address has an upcoming booking, the links are on their way. Check your spam folder too.':msg==='off'?<>We can’t send email yet. {c.phone||c.email?<>Contact the hotel with your name and dates: <ContactLine/>.</>:'Ask the front desk, with your name and dates.'}</>:msg.replace(/^err:/,'')}</p></form></details>}
export default function MyBooking(){
 const {draft,lookup,submission}=useReservationDraft();
 const returnHref=(draft.current||submission)?'/#reserve':'/';
 const saved=lookup.current;
 const [id,setId]=useState(saved?.id??''),[email,setEmail]=useState(saved?.email??''),[r,setR]=useState(saved?.result??null),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 const [rate,setRate]=useState(saved?.rate??0),[text,setText]=useState(saved?.text??''),[rmsg,setRmsg]=useState(''),[ask,setAsk]=useState(false),[tried,setTried]=useState(false);
 const [matchedEmail,setMatchedEmail]=useState(saved?.matchedEmail??''),[action,setAction]=useState('');
 useLayoutEffect(()=>{
  const reference=new URLSearchParams(location.search).get('ref');
  if(reference&&reference!==lookup.current?.result?.id){setId(reference);setR(null);setMatchedEmail('');setRate(0);setText('')}
 },[lookup]);
 useLayoutEffect(()=>{
  lookup.current={id,email,result:r,rate,text,matchedEmail};
 },[lookup,id,email,r,rate,text,matchedEmail]);
 async function loadBooking(reference,address){
  const response=await post('/api/lookup',{id:reference,email:address}),result=await response.json();
  if(!response.ok)throw Error(result.error||'Could not find the booking.');
  return result;
 }
 const find=async event=>{
  event.preventDefault();if(busy||action)return;
  setErr('');setAsk(false);
  if(!validEmail(email)){setTried(true);setErr('Enter the email you booked with, like example@gmail.com.');return}
  setBusy(true);setR(null);
  try{setR(await loadBooking(id,email));setMatchedEmail(email);setRate(0);setText('');setRmsg('')}
  catch(error){setErr(error instanceof TypeError?'Connection problem. Please try again.':error.message)}
  finally{setBusy(false)}
 };
 const review=async event=>{
  event.preventDefault();if(action)return;
  setRmsg('');setAction('review');
  try{
   const response=await post('/api/reviews',{id:r.id,email:matchedEmail,rating:rate,text}),result=await response.json();
   if(response.ok)setR(previous=>({...previous,canReview:false,review:result.review}));
   else setRmsg(result.error||'Could not submit the review.');
  }catch{setRmsg('Connection problem. Please try again.')}
  finally{setAction('')}
 };
 const cancel=async()=>{
  if(action)return;
  setErr('');setAction('cancel');
  try{
   const response=await post('/api/lookup/cancel',{id:r.id,email:matchedEmail}),result=await response.json();
   if(response.ok){setR(result);setAsk(false)}else setErr(result.error||'Could not cancel the booking.');
  }catch{setErr('Connection problem. Please try again.')}
  finally{setAction('')}
 };
 const n=r?nightsBetween(r.in,r.out):0;
 const note='mt-4 rounded-md border-l-4 px-4 py-3 text-sm ';
 return <main className="mx-auto min-h-screen max-w-2xl px-5 pb-safe pt-[max(1.25rem,env(safe-area-inset-top))] md:px-6 md:py-16"><header className="flex justify-center"><Link href={returnHref} className="tap"><Logo/></Link></header>
  <div className="mt-5 md:mt-7"><BackLink href={returnHref}/></div>
  <h1 className="h-sec mt-1">Find your reservation</h1>
  <p className="mt-3 text-ash">Enter the reference from your confirmation (it looks like BV-1A2B3C4D) and the email you booked with.</p>
  <form onSubmit={find} className="lookup-panel card mt-8 grid gap-5 p-4 sm:grid-cols-2 sm:p-6"><div><label className="field-label" htmlFor="bv-lookup-reference">Booking reference</label><input id="bv-lookup-reference" required value={id} onChange={e=>setId(e.target.value)} autoCapitalize="characters" autoComplete="off" className="fld mt-1 font-normal uppercase"/></div>
   <div><EmailField label="Email" id="bv-lookup-email" showErrors={tried} value={email} onChange={setEmail}/></div>
   <div className="sm:col-span-2"><button disabled={busy||!!action} className="btn w-full px-8 py-4 text-base sm:w-auto sm:py-2.5 sm:text-[.9375rem]">{busy?'Searching…':'Find booking'}</button><span role="alert" className="mt-3 block text-sm font-medium text-red-700 sm:ml-4 sm:mt-0 sm:inline">{err}</span></div></form>
  <RecoverRefs defaultEmail={email}/>
  {r&&<section aria-live="polite" className="card mt-10 p-5 md:mt-12 md:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="break-all text-sm text-ash">{r.id}</p><h2 className="mt-1 break-words font-display h-lg">{r.name}</h2></div><span className={'rounded-md px-3 py-1.5 text-sm font-semibold '+TONE[r.status]}>{WORDS[r.status]}</span></div>
   <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-ash">Check-in</dt><dd>{fmtDate(r.in)} · from 2:00 PM</dd></div><div><dt className="text-ash">Check-out</dt><dd>{fmtDate(r.out)} · by 12:00 NN</dd></div>
    <div><dt className="text-ash">{r.units.length>1?'Units':'Unit'} · {n} night{n===1?'':'s'}</dt><dd>{r.units.map(u=><span key={u.id} className="block">{u.unit}{u.unit!==u.typeName&&<span className="text-ash"> ({u.typeName})</span>}</span>)}</dd></div>
    <div><dt className="text-ash">Payment</dt><dd>Total {fmt(r.total)}{r.chargesTotal>0&&<> + {fmt(r.chargesTotal)} fines &amp; charges</>}<span className="block text-ash">Paid {fmt(r.paid)}{r.status!=='cancelled'&&<> · balance {fmt(Math.max(0,r.balance))}</>}</span>{r.charges.map((c,i)=><span key={i} className="block text-red-700">{c.label}: {fmt(c.amount)}</span>)}</dd></div>{r.event&&<div><dt className="text-ash">Occasion</dt><dd>{r.event}</dd></div>}{r.notes&&<div><dt className="text-ash">Your requests</dt><dd>{r.notes}</dd></div>}</dl>
   {r.status==='pending'&&<><p className={note+'border-amber-600 bg-amber-50 text-amber-900'}>Your dates are held until <b>{fmtStamp(r.dueBy)}</b> (48 hours after booking).</p>{r.downReceived?<p className="mt-3 text-sm font-medium text-emerald-800">Downpayment received. We are confirming your booking.</p>:<PayInfo id={r.id} down={Math.max(0,r.down-r.paid)||r.down} dueBy={r.dueBy}/>}</>}
   {r.cancel&&<p className={note+(r.cancel.refundable?'border-emerald-600 bg-emerald-50 text-emerald-900':'border-red-600 bg-red-50 text-red-900')}>{r.cancel.refundable?<>Free cancellation until <b>{fmtDate(r.cancel.lastFreeDay)}</b>. After that, cancellations are non-refundable.</>:<>This booking is within 3 days of check-in, so a cancellation is <b>non-refundable</b>.</>}</p>}
   {r.canCancel&&<div className="mt-4">{!ask?<button onClick={()=>setAsk(true)} className="min-h-11 w-full rounded-md border border-red-700 px-6 py-2.5 text-base font-medium text-red-800 transition-colors hover:bg-red-700 hover:text-white sm:w-auto sm:text-sm">Cancel this booking</button>:<div role="alertdialog" className="rounded-md border border-red-700 bg-red-50 p-4 text-sm text-red-950"><p>{r.cancel?.refundable?(r.paid>0?`Cancel now? Your ${fmt(r.paid)} payment will be refunded by the hotel.`:'Cancel now? You have not paid anything yet.'):`Cancel now? This is within 3 days of check-in, so ${r.paid>0?fmt(r.paid)+' paid':'any payment'} is non-refundable.`}</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={!!action} onClick={cancel} className="min-h-11 rounded-md bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-800">{action==='cancel'?'Cancelling…':'Yes, cancel booking'}</button><button disabled={!!action} onClick={()=>setAsk(false)} className="min-h-11 px-3 font-medium">Keep it</button></div></div>}<ContactLine className="mt-3 block text-sm text-ash"/></div>}
   {r.refund&&<p className={note+(r.refund.refundable?'border-emerald-600 bg-emerald-50 text-emerald-900':'border-ink/55 bg-paper text-ash')}>{r.refund.refundable?`The hotel will refund your ${fmt(r.refund.amount)}. They will contact you about how.`:`This booking was cancelled under 3 days before check-in, so ${fmt(r.refund.amount)} is non-refundable.`}</p>}
   {r.status==='expired'&&<p className={note+'border-line bg-fog text-ink'}>Your hold expired and the dates were released. <Link href="/#reserve" className="underline">Check availability again</Link>.</p>}
   {!['cancelled','expired'].includes(r.status)&&<div className="mt-7"><Link href={`/voucher/${r.id}?t=${r.token}&from=lookup`} className="btn w-full py-4 text-base sm:w-auto sm:py-2.5 sm:text-[.9375rem]">Open voucher (print / save PDF)</Link></div>}
   {r.review&&<div className="mt-8 border-t border-line pt-6"><p className="text-sm text-ash">Your review · {r.review.status==='approved'?'published':r.review.status==='rejected'?'declined':'awaiting approval'}</p><Stars n={r.review.rating} className="mt-2 block"/><p className="mt-2">“{r.review.text}”</p></div>}
   {r.canReview&&<form onSubmit={review} className="mt-8 border-t border-line pt-6"><h3 className="font-display h-md">How was your stay?</h3>
    <p id="bv-review-rating" className="field-label mt-3">Rating</p>
    <div role="radiogroup" aria-labelledby="bv-review-rating" className="mt-1 flex gap-1">{[1,2,3,4,5].map(i=><label key={i} className="cursor-pointer">
      <input type="radio" className="peer sr-only" name="review-rating" value={i} checked={rate===i} onChange={()=>setRate(i)} aria-label={i+' star'+(i>1?'s':'')}/>
      <span aria-hidden="true" className={'grid h-12 w-12 place-items-center rounded text-3xl transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-tile '+(i<=rate?'text-tile':'text-ink/55 hover:text-tile')}>★</span>
     </label>)}</div>
    <label className="field-label mt-3" htmlFor="bv-review-text">Your review</label><textarea id="bv-review-text" required minLength={10} maxLength={600} rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder="Tell future guests about your stay…" className="fld mt-1 text-sm"/>
    <div className="mt-3 flex flex-wrap items-center gap-4"><button disabled={!rate||!!action} className="btn w-full px-7 py-4 text-base sm:w-auto sm:py-2.5 sm:text-[.9375rem]">{action==='review'?'Submitting…':'Submit review'}</button><span role="alert" className="text-sm font-medium text-red-700">{rmsg}</span></div><p className="mt-2 text-sm text-ash">Reviews are checked by our team before they appear. Only your first name and last initial are shown.</p></form>}</section>}</main>}
