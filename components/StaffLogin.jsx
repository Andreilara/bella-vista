'use client';
import {useState} from 'react';import BackLink from './BackLink';import Logo from './Logo';
// Staff sign-in. Visible labels (not just placeholders), a show-password toggle, and "Forgot password?",
// which does not email anyone: it flags the request on the administrator's Staff page so an administrator can set a new password.
const Eye=({off})=><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{off&&<path d="M4 4l16 16"/>}</svg>;
export default function StaffLogin({onSignedIn}){
 const [mode,setMode]=useState('in'),[u,setU]=useState(''),[pw,setPw]=useState(''),[show,setShow]=useState(false),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 const go=m=>{setMode(m);setErr('');setSent(false);setShow(false)};
 const post=async(url,body)=>{try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{ok:r.ok,j:await r.json().catch(()=>({}))}}catch{return{ok:false,j:{error:'Could not reach the server. Check your connection and try again.'}}}};
 const signIn=async e=>{e.preventDefault();setErr('');setBusy(true);const {ok,j}=await post('/api/admin',{username:u,password:pw});setBusy(false);
  if(ok){setPw('');onSignedIn(j.staff)}else setErr(j.error||'Sign-in failed.')};
 const forgot=async e=>{e.preventDefault();setErr('');setBusy(true);const {ok,j}=await post('/api/admin/reset-request',{username:u});setBusy(false);if(ok)setSent(true);else setErr(j.error||'Request failed.')};
 return <main className="staff-signin"><div className="staff-signin-frame"><div className="staff-signin-brand on-dark"><BackLink href="/"/><Logo large/></div><div className="staff-signin-form">
  {mode==='in'?<form onSubmit={signIn} noValidate>
   <h1 className="font-display h-lg">Staff sign in</h1>
   <label className="field-label mt-5" htmlFor="st-user">Username</label>
   <input id="st-user" autoFocus value={u} onChange={e=>setU(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} className="fld mt-1"/>
   <label className="field-label mt-6" htmlFor="st-pass">Password</label>
   <div className="relative mt-1"><input id="st-pass" type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" autoCapitalize="none" spellCheck={false} className="fld !pr-12"/>
    <button type="button" onClick={()=>setShow(s=>!s)} aria-pressed={show} aria-label="Show password" className="absolute right-0 top-0 grid h-full w-12 place-items-center rounded-md text-ash hover:text-ink"><Eye off={show}/></button></div>
   <p className="mt-3 min-h-[1.25rem] text-sm font-medium text-red-700" role="alert">{err}</p>
   <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1"><button disabled={busy} className="btn px-7">{busy?'Signing in…':'Sign in'}</button>
    <button type="button" onClick={()=>go('forgot')} className="tap lnk text-sm text-tile">Forgot password?</button></div></form>
  :<form onSubmit={forgot} noValidate>
   <h1 className="font-display h-md">Forgot your password?</h1>
   <p className="mt-3 text-sm text-ash">Enter your username to request a password reset from an administrator.</p>
   {sent?<div role="status" className="card mt-5 p-4 text-sm"><b>Request sent.</b> An administrator can review your request.</div>
   :<><label className="field-label mt-5" htmlFor="st-fuser">Username</label>
    <input id="st-fuser" autoFocus value={u} onChange={e=>setU(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} className="fld mt-1"/>
    <p className="mt-3 min-h-[1.25rem] text-sm font-medium text-red-700" role="alert">{err}</p>
    <button disabled={busy||!u.trim()} className="btn mt-3 px-7">{busy?'Sending…':'Request a reset'}</button></>}
   <p className="mt-6"><BackLink onClick={()=>go('in')}>Back to sign in</BackLink></p></form>}
 </div></div></main>}
