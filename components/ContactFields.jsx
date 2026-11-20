'use client';
// Phone and email inputs for the customer portal: live clean-up of bad characters (only in the field being typed in),
// a fixed +63 prefix, and friendly real-time feedback. Rules live in lib/rules.js so the server enforces the same ones.
import {useLayoutEffect,useRef,useState} from 'react';
import {cleanEmail,cleanPhone,emailProblem,validEmail} from '../lib/rules.js';

const TONES={ok:'text-emerald-800',bad:'text-red-700',fix:'text-amber-800',mute:'text-ash'};
/** Keeps the caret where the user was typing even when characters were removed from the value. */
function useCaret(){const ref=useRef(null),pos=useRef(null);
 useLayoutEffect(()=>{const el=ref.current,p=pos.current;pos.current=null;if(el&&p!==null&&document.activeElement===el){try{el.setSelectionRange(p,p)}catch{}}});
 return[ref,p=>{pos.current=p}]}
const RED={borderColor:'#b91c1c'};   // inline, so the red underline wins over the page's focus styles
const Note=({id,tone,children})=><p id={id} aria-live="polite" className={'mt-1.5 min-h-[1.25rem] text-[.8125rem] md:text-xs '+TONES[tone]}>{children}</p>;
const PHONE_FIX={chars:'Only numbers are allowed here, so other characters were removed.',zero:'No leading 0 needed. +63 is already added.',prefix:'+63 is already added, so we removed it from what you typed.',long:'A mobile number has 10 digits after +63.'};

export function PhoneField({id='bv-phone',value,onChange,showErrors=false,label="Mobile number"}){
 const [touched,setTouched]=useState(false),[fix,setFix]=useState(''),[ref,keep]=useCaret(),n=value.length,show=touched||showErrors;
 const change=e=>{const raw=e.target.value,{v,why}=cleanPhone(raw),c=e.target.selectionStart??raw.length;keep(cleanPhone(raw.slice(0,c)).v.length);setFix(why);onChange(v)};
 let tone='mute',msg='Enter the 10 digits after +63, numbers only.';
 if(fix){tone='fix';msg=PHONE_FIX[fix]}
 else if(n===10){tone='ok';msg='✓ Looks good'}
 else if(n>0){tone=show?'bad':'mute';msg=`${n}/10 digits${show?'. A mobile number needs 10 digits, like 9123456789.':''}`}
 else if(showErrors){tone='bad';msg='Enter your 10-digit mobile number.'}
 return <div>
  <label className="field-label" htmlFor={id}>{label}</label>
  <div style={tone==='bad'?RED:undefined} className="mt-1 flex items-stretch rounded-md border border-ink/55 bg-surface transition-colors focus-within:border-tile focus-within:ring-1 focus-within:ring-tile">
   <span className="flex select-none items-center pl-3.5 pr-3 text-base text-ash" aria-hidden="true">+63</span><span className="my-3 w-px bg-ink/30" aria-hidden="true"/>
   <input ref={ref} id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9123456789" aria-invalid={tone==='bad'} aria-describedby={id+'-note'}
    value={value} onChange={change} onBlur={()=>setTouched(true)} className="min-w-0 flex-1 bg-transparent py-3 pl-3 pr-3 text-base tracking-wide outline-none"/></div>
  <Note id={id+'-note'} tone={tone}>{msg}</Note></div>}

/** `className` lets each page keep its own input styling (the booking form's .fld, or the dark lookup page). */
export function EmailField({id='bv-email',value,onChange,showErrors=false,className='fld',required=false,label="Email"}){
 const [touched,setTouched]=useState(false),[fix,setFix]=useState(false),[ref,keep]=useCaret(),hint=emailProblem(value),show=touched||showErrors;
 const change=e=>{const raw=e.target.value,{v,changed}=cleanEmail(raw),c=e.target.selectionStart??raw.length;keep(cleanEmail(raw.slice(0,c)).v.length);setFix(changed);onChange(v)};
 let tone='mute',msg='';
 if(fix){tone='fix';msg='Removed characters that can\u2019t be used in an email address.'}
 else if(value&&validEmail(value)){tone='ok';msg='✓ Looks good'}
 else if(value){tone=show?'bad':'mute';msg=hint}
 else if(showErrors){tone='bad';msg='Enter your email address, like example@gmail.com.'}
 const input=<input ref={ref} id={id} type="text" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={120} required={required} placeholder="example@gmail.com"
   aria-invalid={tone==='bad'} aria-describedby={id+'-note'} value={value} onChange={change} onBlur={()=>setTouched(true)} style={tone==='bad'?RED:undefined} className={className+' mt-1'}/>;
 return <><label className="field-label" htmlFor={id}>{label}</label>{input}
  <Note id={id+'-note'} tone={tone}>{msg}</Note></>}
