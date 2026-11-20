'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {m,AnimatePresence,useReducedMotion} from 'framer-motion';import RangeCalendar from './RangeCalendar';import EventPlanner from './EventPlanner';import Link from 'next/link';import PayInfo from './PayInfo';import {PhoneField,EmailField} from './ContactFields';
import {TYPES,quote,validate,capacityProblem,dateProblem,validGuest,validEmail,isFree,today,addDays,fmt} from '../lib/rules.js';
import {fmtDate,fmtStamp} from '../lib/format.js';import {useContact} from './ContactContext';
import BackLink from './BackLink';
import {useReservationDraft} from './ReservationDraft';
const DEF={std:2,fam:4,hall:30},ease=[.25,.1,.25,1];
export default function Booking({pick,onTerms}){
 const t0=today(),reduceMotion=useReducedMotion();
 const {draft,submission,setSubmission,pending}=useReservationDraft();
 const sending=submission?.pending===true,done=submission?.result;
 const [f,setF]=useState(()=>draft.current?.fields??{type:'std',unit:'',in:addDays(t0,1),out:addDays(t0,2),guests:2,name:'',email:'',phone:'',event:'',notes:'',fr:0,sr:0});
 const [step,setStep]=useState(()=>draft.current?.step??0),[agree,setAgree]=useState(()=>draft.current?.agree??false),[err,setErr]=useState(''),[busy,setBusy]=useState([]);
 const [datesConfirmed,setDatesConfirmed]=useState(()=>draft.current?.datesConfirmed??false);
 useLayoutEffect(()=>{
  draft.current=done?null:{fields:f,step,agree,datesConfirmed};
 },[draft,f,step,agree,datesConfirmed,done]);
 const [availability,setAvailability]=useState('loading');
 const set=(k,v)=>setF(s=>({...s,[k]:v})),[tried,setTried]=useState(false);
 const load=async()=>{
  try{
   const response=await fetch('/api/bookings',{cache:'no-store'});
   if(!response.ok)throw Error();
   const result=await response.json();if(!Array.isArray(result.busy))throw Error();
   setBusy(result.busy);setAvailability('ready');
  }catch{setAvailability('error')}
 };
 useEffect(()=>{load();const i=setInterval(()=>{if(!document.hidden)load()},30000);return()=>clearInterval(i)},[]);
 const setType=k=>setF(s=>s.type===k?s:{...s,type:k,guests:capacityProblem(k,s.guests)?DEF[k]:s.guests});
 function selectDates(from,to,complete){
  setF(s=>({...s,in:from,out:to}));
  setDatesConfirmed(complete);
 }
 useEffect(()=>{if(!pick)return;if(pick.type)setType(pick.type);if(pick.in&&pick.out)selectDates(pick.in,pick.out,true)},[pick]);
 const T=TYPES[f.type];
 const free=useMemo(()=>T.units.filter(u=>isFree(u,f.in,f.out,busy)),[busy,f.type,f.in,f.out]);
 useEffect(()=>{if(!free.includes(f.unit))setF(s=>({...s,unit:free[0]||''}))},[free]);
 const availOf=k=>TYPES[k].units.some(u=>isFree(u,f.in,f.out,busy)),alt=Object.keys(TYPES).filter(k=>k!==f.type&&availOf(k)).map(k=>TYPES[k].name);
 const capacity=capacityProblem(f.type,f.guests);
 const stayProblem=capacity||dateProblem(f.in,f.out,t0)||(free.includes(f.unit)?'':'Choose an available unit.');
 const canContinue=availability==='ready'&&!stayProblem;
 const q=quote(f.type,+f.guests,f.in,f.out);
 const freeOf=k=>TYPES[k].units.filter(u=>isFree(u,f.in,f.out,busy)),famFree=freeOf('fam'),stdFree=freeOf('std'),isHall=f.type==='hall';
 const nFam=isHall?Math.min(f.fr,famFree.length):0,nStd=isHall?Math.min(f.sr,stdFree.length):0;
 const rooms=[...famFree.slice(0,nFam).map(unit=>({type:'fam',unit,guests:4})),...stdFree.slice(0,nStd).map(unit=>({type:'std',unit,guests:2}))],rq=rooms.map(r=>({...r,q:quote(r.type,r.guests,f.in,f.out)}));
 const grand=q.total+rq.reduce((a,r)=>a+r.q.total,0),grandDown=q.down+rq.reduce((a,r)=>a+r.q.down,0);
 const showMobileQuote=!done&&step<2&&canContinue&&(datesConfirmed||step===1)&&!dateProblem(f.in,f.out,t0)&&grand>0&&free.includes(f.unit);
 const next=()=>{if(step===0&&!canContinue)return;const e=step===0?'':validGuest(f);setErr(e);
  if(e&&step===1){setTried(true);   // send the person to the first field that needs fixing
   const id=!f.name.trim()?'bv-name':!validEmail(f.email)?'bv-email':'bv-phone';setTimeout(()=>document.getElementById(id)?.focus(),0)}
  if(!e)moveStep(step+1)};
 const errRef=useRef(null),contact=useContact(),[copied,setCopied]=useState('');
 useEffect(()=>{if(err&&step!==1)errRef.current?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})},[err]);   // keep the message in view on a long phone form
 const details=()=>done?[`Bella Vista reservation ${done.id}`,`${done.items.length>1?done.items.map(x=>x.unit).join(', '):done.unit}: ${done.in} to ${done.out}`,`Total ${fmt(done.total)}. Downpayment ${fmt(done.down)} due by ${fmtStamp(done.dueBy)}.`,
  ...(contact.payments.length?['Pay via:',...contact.payments.map(p=>`${p.method}: ${p.account}${p.number?' · '+p.number:''}`)]:[]),`Track or cancel: ${location.origin}/my-booking?ref=${done.id}`].join('\n'):'';
 const OK='Copied. Paste it into your notes or messages.';
 const copy=async()=>{const t=details();try{await navigator.clipboard.writeText(t);setCopied(OK)}catch{
  const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');setCopied(OK)}catch{setCopied('Could not copy. Please write down your reference.')}ta.remove()}};
 const canShare=typeof navigator!=='undefined'&&!!navigator.share,share=()=>navigator.share({title:'Bella Vista reservation',text:details()}).catch(()=>{});
 const submit=async()=>{if(pending.current)return;const problem=validate(f,busy);if(problem){setErr(problem);moveStep(0);return}if(!agree)return setErr('Please accept the Terms & Conditions to continue.');pending.current=true;setSubmission({pending:true});setErr('');
  try{const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,guests:+f.guests,phone:'+63'+f.phone,event:isHall?f.event:'',rooms,acceptedTerms:agree})});const d=await r.json();
   if(!r.ok){setErr(d.error||'Something went wrong.');if(/booked/.test(d.error||'')){load();setStep(0)}}else{draft.current=null;setSubmission({result:d,firstName:f.name.trim().split(/\s+/)[0]});load()}}catch{setErr('Network error. Please try again.')}finally{pending.current=false;setSubmission(current=>current?.pending?null:current)}};
 const reset=()=>{setCopied('');setSubmission(null);setStep(0);setAgree(false);setTried(false);setDatesConfirmed(false);setF(s=>({...s,name:'',email:'',phone:''}))};
 const focusNextStep=useRef(null);
 const moveStep=next=>{focusNextStep.current=String(next);setStep(next)};
 const stepHeading=node=>{
  if(!node||focusNextStep.current!==node.dataset.bookingStep)return;
  focusNextStep.current=null;
  node.focus();
 };
 const slide={initial:{opacity:0,y:reduceMotion?0:8},animate:{opacity:1,y:0},exit:{opacity:0},transition:{duration:reduceMotion?0:.22,ease}};
 const chip=on=>'rounded-md border px-4 py-3 text-sm font-medium transition-colors '+(on?'border-tile bg-tile text-white':'border-ink/55 bg-surface hover:border-ink');
 const stepBtn='h-11 w-11 rounded-md border border-ink/55 bg-surface text-xl transition-colors hover:bg-ink hover:text-paper disabled:opacity-40 disabled:cursor-not-allowed';
 return <div className={"reserve-layout"+(done?" is-complete":"")}>
  <div className="reserve-form">
   <ol className="reserve-steps" aria-label="Booking steps">{["Stay","Guest details","Review"].map((label,i)=><li key={label} data-state={i<step||done?"complete":i===step?"current":"upcoming"} aria-current={i===step&&!done?"step":undefined}><span aria-hidden="true">{i<step||done?"✓":i+1}</span>{label}</li>)}</ol>
   <AnimatePresence mode="wait">
   {done?<m.div key="done" {...slide} className="mt-10"><p className="text-sm font-semibold text-tile">Reservation received</p><h3 className="mt-2 font-display h-xl">Thank you, {submission.firstName}.</h3>
     <p className="mt-5 max-w-md text-ash">Your reference is <b className="text-ink">{done.id}</b>. We’re holding {done.items.length>1?done.items.length+' units ('+done.items.map(x=>x.unit).join(', ')+')':done.unit} ({done.in} to {done.out}) until <b className="text-ink">{fmtStamp(done.dueBy)}</b>. It’s confirmed once the {fmt(done.down)} downpayment is received.</p>
     <PayInfo id={done.id} down={done.down} dueBy={done.dueBy}/>
     <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={copy} className="btn">Copy reservation details</button>{canShare&&<button type="button" onClick={share} className="pill">Share</button>}</div>
     <p role="status" className="mt-2 min-h-[1.25rem] max-w-md text-sm text-ash">{copied}</p>
     <p className="mt-2 max-w-md text-sm text-ash">{done.emailing?<>We’ll email a copy to the address you entered. Keep your booking reference handy.</>:<>We can’t email you a copy yet, so keep your reference. You’ll need it with your email to find this booking later.</>} Cancellations under 3 days before check-in are non-refundable.</p>
     <div className="mt-6 flex flex-wrap gap-3"><Link href={'/voucher/'+done.id+'?t='+done.token+'&from=reservation'} className="pill">Open your voucher</Link><Link href={'/my-booking?ref='+done.id} className="pill">Track this booking</Link></div>
     <button onClick={reset} className="lnk mt-8 min-h-11 text-sm">Make another booking</button></m.div>
   :step===0?<m.div key="s0" {...slide} className="mt-2">
     <h3 ref={stepHeading} data-booking-step="0" tabIndex={-1} id="bv-type" className="reserve-heading">Choose your room or hall</h3>
     <div role="group" aria-labelledby="bv-type" className="reserve-options">{Object.entries(TYPES).map(([k,v])=><button key={k} type="button" aria-pressed={f.type===k} onClick={()=>setType(k)} className="reserve-option"><span className="reserve-option-name">{v.name}</span><span className="reserve-option-rate"><strong>{fmt(v.rate)}</strong> / night</span><span className="reserve-option-capacity">{v.min===1?"Up to "+v.max:v.min+"–"+v.max} guests</span>{availability==='ready'&&!availOf(k)&&<span className="text-xs font-semibold text-red-700">Fully booked</span>}</button>)}</div>
     {availability==='loading'&&<p role="status" className="mt-4 text-sm text-ash">Checking availability?</p>}
     {availability==='error'&&<p role="alert" className="mt-4 text-sm text-red-800">Could not check availability. <button type="button" onClick={load} className="lnk min-h-11">Retry</button></p>}
     {availability==='ready'&&!free.length&&<p role="status" className="mt-4 rounded-md border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{T.name} is fully booked for these dates. {alt.length?`${alt.join(' and ')} ${alt.length>1?'are':'is'} available: choose one above, or pick other dates below.`:'Pick other dates below.'}</p>}
     <div className="reserve-stay-grid"><div><h3 className="reserve-heading">Select your dates</h3><RangeCalendar from={f.in} to={f.out} units={T.units} busy={busy} onChange={selectDates}/></div><div className="reserve-stay-settings">
     <span className="field-label">Guests ({T.min>1?`${T.min} to ${T.max}`:`up to ${T.max}`}{f.type==='hall'?', 31–40 incur ₱500 each':f.type==='std'?', 3rd guest ₱1,000/night':''})</span>
     <div className="flex items-center gap-5 py-3"><button type="button" aria-label="Fewer guests" className={stepBtn} disabled={Number(f.guests)<=T.min&&f.guests!==""} onClick={()=>set('guests',Math.min(T.max,Math.max(T.min,(Number(f.guests)||T.min)-1)))}>−</button><input type="text" inputMode="numeric" aria-label="Guest count" aria-invalid={!!capacity} aria-describedby={capacity?"bv-capacity-error":undefined} className="fld w-16 px-1 text-center text-xl font-semibold" value={f.guests} onChange={e=>set("guests",e.target.value)}/><button type="button" aria-label="More guests" className={stepBtn} disabled={Number(f.guests)>=T.max} onClick={()=>set('guests',Math.max(T.min,Math.min(T.max,(Number(f.guests)||0)+1)))}>+</button></div>{capacity&&<p id="bv-capacity-error" role="status" className="text-sm text-red-800">{capacity}</p>}
     <span className="field-label mt-5">Available for your dates</span>
     <div className="mt-2 flex flex-wrap gap-2">{T.units.map(u=>{const ok=free.includes(u);return <button key={u} type="button" disabled={!ok} aria-pressed={f.unit===u} onClick={()=>set('unit',u)} className={f.unit===u?chip(true):ok?chip(false):'rounded-md border border-line px-4 py-3 text-sm text-ash line-through'}>{u}{!ok&&' · booked'}</button>})}</div>
     </div></div>{isHall&&<EventPlanner event={f.event} onEvent={v=>set('event',v)} fam={nFam} std={nStd} onFam={v=>set('fr',v)} onStd={v=>set('sr',v)} famFree={famFree.length} stdFree={stdFree.length}/>}
    </m.div>
   :step===1?<m.div key="s1" {...slide} className="reserve-details"><h3 ref={stepHeading} data-booking-step="1" tabIndex={-1} className="reserve-heading mb-5">Who’s staying?</h3><div><label className="field-label" htmlFor="bv-name">Full name</label><input id="bv-name" className="fld mt-1" autoComplete="name" required aria-invalid={tried&&!f.name.trim()} aria-describedby={tried&&!f.name.trim()?"bv-booking-error":undefined} value={f.name} onChange={e=>{set("name",e.target.value);setErr("")}}/></div>
     <div className="mt-5"><EmailField label="Email" id="bv-email" value={f.email} onChange={v=>{set('email',v);setErr('')}} showErrors={tried}/></div>
     <div className="mt-5"><PhoneField label="Mobile number" id="bv-phone" value={f.phone} onChange={v=>{set('phone',v);setErr('')}} showErrors={tried}/></div>
     <div className="mt-5"><label className="field-label" htmlFor="bv-notes">{isHall?"Event notes (optional)":"Special requests (optional)"}</label><textarea id="bv-notes" className="fld mt-1 min-h-[6.5rem] resize-y" maxLength={500} value={f.notes} onChange={e=>set("notes",e.target.value)}/></div>
     <p className="mt-4 text-sm text-ash">We use your name, email and mobile number only to manage this reservation. See our <Link href="/privacy" target="_blank" className="underline underline-offset-4">Privacy Notice</Link>.</p></m.div>
   :<m.div key="s2" {...slide} className="mt-6"><h3 ref={stepHeading} data-booking-step="2" tabIndex={-1} className="reserve-heading mb-3">Review your booking</h3><p className="font-display h-lg">{T.name}{f.unit!==T.name&&' · '+f.unit}</p>{rooms.length>0&&<p className="mt-1 text-ash">Plus {rooms.length} room{rooms.length>1?'s':''}: {rooms.map(r=>r.unit).join(', ')}</p>}{isHall&&f.event&&<p className="mt-1 text-ash">Occasion: {f.event}</p>}{f.notes&&<p className="mt-1 text-ash">Notes: {f.notes}</p>}<p className="mt-2 text-ash">{f.in} (from 2:00 PM) to {f.out} (by 12:00 NN) · {f.guests} guest{f.guests>1?'s':''}</p><p className="mt-1 break-words text-ash">{f.name} · {f.email} · +63 {f.phone}</p>
     <p className="mt-6 rounded-md border-l-4 border-tile bg-fog px-4 py-3 text-sm">We’ll hold these dates for 48 hours. Your booking is confirmed once we receive the <b>{fmt(grandDown)}</b> downpayment.</p>
     <label className="field-check-label mt-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#2c5a42]" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>I have read and agree to the <button type="button" onClick={onTerms} className="underline underline-offset-4">Terms &amp; Conditions</button>, including the 50% downpayment and the 3-day cancellation rule.</span></label></m.div>}
   </AnimatePresence>
   {!done&&<div id="bv-booking-error" ref={errRef} className="mt-6 min-h-[1.5rem] text-base font-medium text-red-700 md:mt-8 md:text-sm" role="alert">{err&&<span key={err} className="interface-enter block">{err}</span>}</div>}
   {!done&&<div className="reserve-actions">{step>0&&<BackLink onClick={()=>{setErr('');moveStep(step-1)}}>Back</BackLink>}
    {step<2?<button disabled={step===0&&!canContinue} className="btn reserve-continue flex-1 py-3.5 sm:flex-none sm:py-2.5" onClick={next}>Continue</button>:<button disabled={sending} className="btn flex-1 py-3.5 sm:flex-none sm:py-2.5" onClick={submit}>{sending?'Securing your dates…':'Request reservation'}</button>}</div>}
  </div>
  {!done&&<aside className={(step===2?"":"reserve-summary-desktop ")+"reserve-summary on-dark"} aria-label="Stay summary">
   <h3 className="font-display h-md">Your stay</h3><p className="mt-2 text-sm text-paper/80">{T.name}{f.unit&&f.unit!==T.name?" · "+f.unit:""}{!f.unit?" · No unit available":""}</p>
   <dl className="reserve-dates"><div><dt>Check-in</dt><dd>{fmtDate(f.in)}</dd></div><div><dt>Check-out</dt><dd>{fmtDate(f.out)}</dd></div></dl>
   <dl className="reserve-prices"><div><dt>{fmt(T.rate)} × {q.n} night{q.n===1?"":"s"}</dt><dd>{fmt(q.base)}</dd></div>{q.extra>0&&<div><dt>Extra guest fee</dt><dd>{fmt(q.extra)}</dd></div>}
    {rq.map(r=><div key={r.unit}><dt>{r.unit} · {r.q.n} night{r.q.n===1?"":"s"}</dt><dd>{fmt(r.q.total)}</dd></div>)}
    <div className="reserve-total"><dt>Total</dt><dd>{fmt(grand)}</dd></div><div><dt>Downpayment (50%)</dt><dd>{fmt(grandDown)}</dd></div><div><dt>Balance at check-in</dt><dd>{fmt(grand-grandDown)}</dd></div></dl></aside>}
  {showMobileQuote&&<div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-between gap-4 border-t border-line bg-paper px-5 pb-safe pt-3 md:-mx-12 md:px-12 lg:hidden" aria-live="polite">
   <div className="min-w-0"><p className="truncate text-[.8125rem] text-ash">{T.name}{f.unit&&f.unit!==T.name&&' · '+f.unit} · {q.n} night{q.n===1?'':'s'}{rooms.length>0&&` + ${rooms.length} room${rooms.length>1?'s':''}`}</p><p className="text-2xl font-semibold tracking-tight">{fmt(grand)}</p></div>
   <div className="shrink-0 text-right text-[.8125rem] text-ash"><p>50% downpayment</p><p className="text-base font-semibold text-ink">{fmt(grandDown)}</p></div></div>}</div>}
