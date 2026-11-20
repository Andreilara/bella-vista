'use client';

import {useRef,useState} from 'react';
import {api} from '../../../lib/adminClient.js';
import {useStaff} from '../../../components/StaffContext';

const EMPTY={current:'',next:'',again:''};

function PasswordField({name,label,value,onChange,help,invalid,inputRef}){
 const [visible,setVisible]=useState(false);
 const id='account-password-'+name;

 return <div className="account-field">
  <label className="field-label" htmlFor={id}>{label}</label>
  <div className="account-input">
   <input ref={inputRef} id={id} type={visible?'text':'password'} className="fld" required
    autoCapitalize="none" spellCheck={false} minLength={name==='next'?8:undefined}
    autoComplete={name==='current'?'current-password':'new-password'} value={value}
    onChange={e=>onChange(name,e.target.value)} aria-invalid={invalid||undefined}
    aria-describedby={help?id+'-help':undefined}/>
   <button type="button" onClick={()=>setVisible(!visible)} aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()}>
    {visible?'Hide':'Show'}
   </button>
  </div>
  {help&&<p id={id+'-help'} className={invalid?'text-sm text-red-700':'text-sm text-ash'}>{help}</p>}
 </div>;
}

export default function Account(){
 const me=useStaff();
 const [fields,setFields]=useState(EMPTY),[feedback,setFeedback]=useState(null);
 const [saving,setSaving]=useState(false),[mismatch,setMismatch]=useState(false),[formVersion,setFormVersion]=useState(0);
 const confirmation=useRef(null);
 const role=me.role==='admin'?'Administrator':'Front desk';
 const initials=Array.from((me.name||me.username).trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase()).slice(0,2).join('');
 const change=(key,value)=>{
  setFields(previous=>({...previous,[key]:value}));
  setFeedback(null);
  setMismatch(false);
 };

 async function save(event){
  event.preventDefault();
  if(saving)return;
  setFeedback(null);
  if(fields.next!==fields.again){
   setMismatch(true);
   confirmation.current?.focus();
   return;
  }

  setSaving(true);
  try{
   const response=await api('/api/account',{method:'POST',body:JSON.stringify({current:fields.current,next:fields.next})});
   const result=await response.json().catch(()=>({}));
   setFeedback({ok:response.ok,text:response.ok?'Your password has been changed.':result.error||'Could not change your password. Try again.'});
   if(response.ok){
    setFields(EMPTY);
    setFormVersion(version=>version+1);
   }
  }catch{
   setFeedback({ok:false,text:'Could not reach Bella Vista. Check your connection and try again.'});
  }finally{
   setSaving(false);
  }
 }

 return <main className="account-page">
  <header className="account-title">
   <h1 className="font-display h-xl">My account</h1>
  </header>
  <div className="account-layout">
   <section className="account-profile on-dark" aria-labelledby="account-profile-heading">
    <h2 id="account-profile-heading" className="account-profile-label">Staff profile</h2>
    <div className="account-identity">
     <span className="account-avatar" aria-hidden="true">{initials}</span>
     <p className="font-display h-md break-words">{me.name}</p>
    </div>
    <dl className="account-facts">
     <div><dt>Username</dt><dd>{me.username}</dd></div>
     <div><dt>Access level</dt><dd>{role}</dd></div>
    </dl>
   </section>
   <section className="account-security" aria-labelledby="account-security-heading">
    <header>
     <h2 id="account-security-heading" className="font-display h-md">Change password</h2>
    </header>
    <form onSubmit={save} aria-busy={saving}>
     <fieldset key={formVersion} disabled={saving} className="account-password-grid">
      <legend className="sr-only">Password details</legend>
      <PasswordField name="current" label="Current password" value={fields.current} onChange={change}/>
      <PasswordField name="next" label="New password" value={fields.next} onChange={change} help="Use at least 8 characters."/>
      <PasswordField name="again" label="Confirm new password" value={fields.again} onChange={change} inputRef={confirmation}
       invalid={mismatch} help={mismatch?'The new passwords do not match.':undefined}/>
     </fieldset>
     <div className="account-actions">
      {feedback&&<p role={feedback.ok?'status':'alert'} className={feedback.ok?'account-feedback is-success':'account-feedback'}>{feedback.text}</p>}
      <button type="submit" className="btn" disabled={saving}>{saving?'Saving password...':'Save new password'}</button>
     </div>
    </form>
   </section>
  </div>
 </main>;
}
