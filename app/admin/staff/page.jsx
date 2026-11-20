'use client';

import LoadingSkeleton from '../../../components/LoadingSkeleton';
import {useEffect,useRef,useState} from 'react';
import {api} from '../../../lib/adminClient.js';
import {fmtStamp} from '../../../lib/format.js';
import {useStaff} from '../../../components/StaffContext';

const EMPTY={name:'',username:'',role:'frontdesk',password:''};

export default function StaffPage(){
 const me=useStaff(),dialog=useRef(null);
 const [rows,setRows]=useState(null),[resets,setResets]=useState([]);
 const [query,setQuery]=useState(''),[status,setStatus]=useState('all');
 const [editor,setEditor]=useState(null),[form,setForm]=useState(EMPTY),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(null),[formError,setFormError]=useState('');

 useEffect(()=>{
  let active=true;
  api('/api/staff').then(async response=>{
   const result=await response.json();
   if(!active)return;
   if(!response.ok){setNotice({error:result.error||'Could not load staff accounts.'});return}
   setRows(result.staff);setResets(result.resets||[]);
  }).catch(()=>{if(active)setNotice({error:'Could not load staff accounts.'})});
  return()=>{active=false};
 },[]);
 useEffect(()=>{dispatchEvent(new CustomEvent('bv:resets',{detail:resets.length}))},[resets]);
 useEffect(()=>{if(editor&&!dialog.current?.open)dialog.current?.showModal()},[editor]);

 function openEditor(person=null){
  setForm(EMPTY);setFormError('');setNotice(null);setEditor({person});
 }

 async function save(path,method,body,message,fromEditor=false){
  if(busy)return;
  setBusy(true);
  setNotice(null);setFormError('');
  try{
   const response=await api(path,{method,...(body?{body:JSON.stringify(body)}:{})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Could not save the change. Try again.');
   if(result.staff)setRows(result.staff);
   setResets(result.resets||[]);
   setNotice({message});
   if(fromEditor)dialog.current?.close();
  }catch(error){
   const text=error.message==='Failed to fetch'?'Could not reach Bella Vista. Try again.':error.message;
   if(fromEditor)setFormError(text);
   else setNotice({error:text});
  }finally{setBusy(false)}
 }

 if(!rows)return notice?<main className="staff-page"><h1 className="font-display h-lg">Staff accounts</h1><p role="alert" className="mt-4 text-red-700">{notice.error}</p></main>:<LoadingSkeleton label="Loading staff" className="staff-page"/>;

 const active=rows.filter(person=>person.active).length;
 const requested=new Set(resets.map(request=>request.staffId));
 const search=query.trim().toLocaleLowerCase();
 const visible=rows.filter(person=>(status==='all'||Boolean(person.active)===(status==='active'))&&
  (!search||[person.name,person.username,person.role==='admin'?'Administrator':'Front desk'].some(value=>value.toLocaleLowerCase().includes(search))));
 const updateForm=(e)=>setForm(previous=>({...previous,[e.target.name]:e.target.value}));

 return <main className="staff-page">
  <header className="staff-directory-header">
   <div><h1 className="font-display h-lg">Staff accounts</h1><p className="text-sm text-ash">{active} active · {rows.length-active} inactive</p></div>
   <button type="button" className="btn" onClick={()=>openEditor()}>Add staff member</button>
  </header>
  {notice&&<p role={notice.error?'alert':'status'} className={'staff-directory-notice '+(notice.error?'is-error':'')}>{notice.error||notice.message}</p>}

  {resets.length>0&&<section className="staff-reset-inbox" aria-labelledby="staff-reset-title">
   <h2 id="staff-reset-title" className="font-display h-md">Password reset requests <span className="text-base">({resets.length})</span></h2>
   <p className="mt-1 text-sm text-ash">Verify the staff member’s identity before resetting their password.</p>
   <ul>{resets.map(request=><li key={request.id}>
    <div><p className="font-semibold break-words">{request.name}</p><p className="text-sm text-ash">{request.username} · {fmtStamp(request.at)}</p></div>
    <div className="staff-directory-actions">
     <button className="btn" disabled={busy} onClick={()=>{const person=rows.find(entry=>entry.id===request.staffId);if(person)openEditor(person)}}>Reset password</button>
     <button className="pill" disabled={busy} onClick={()=>save('/api/staff/resets/'+request.id,'DELETE',null,'Request dismissed.')}>Dismiss</button>
    </div>
   </li>)}</ul>
  </section>}

  <section className="staff-directory staff-panel" aria-labelledby="staff-directory-title">
   <div className="staff-directory-toolbar">
    <h2 id="staff-directory-title" className="font-display h-md">Directory</h2>
    <div><label className="field-stack">Search staff<input type="search" className="fld" placeholder="Name, username, or role" value={query} onChange={e=>setQuery(e.target.value)}/></label>
     <label className="field-stack">Status<select className="fld" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
   </div>
   {visible.length?<ul className="staff-directory-list">{visible.map(person=>{
    const current=person.id===me.id;
    const initials=person.name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
    return <li key={person.id}>
     <div className="staff-directory-identity"><span aria-hidden="true" className="staff-directory-avatar">{initials}</span>
      <div><p className="font-semibold break-words">{person.name}{current&&<span className="ml-2 text-xs font-medium text-tile">You</span>}</p>
       <p className="text-sm text-ash break-words">{person.username}</p></div></div>
     <div className="staff-directory-access">
      <span className="staff-access-status" data-state={person.active?'active':'inactive'}>{person.active?'Active':'Inactive'}</span>
      {requested.has(person.id)&&<span className="staff-access-status" data-state="reset">Reset requested</span>}
      <label className="field-stack"><span>Role<span className="sr-only"> for {person.name}</span></span><select value={person.role} disabled={current||busy} className="fld"
       onChange={e=>save('/api/staff/'+person.id,'PATCH',{role:e.target.value},'Role updated.')}><option value="admin">Administrator</option><option value="frontdesk">Front desk</option></select></label>
     </div>
     <p className="staff-directory-signin"><span>Last sign-in</span>{person.lastLogin?fmtStamp(person.lastLogin):'Never'}</p>
     <div className="staff-directory-actions">
      <button className="pill" type="button" disabled={busy} onClick={()=>openEditor(person)}>Reset password</button>
      {!current&&<button className="pill" type="button" disabled={busy} onClick={()=>save('/api/staff/'+person.id,'PATCH',{active:!person.active},person.active?'Account deactivated.':'Account activated.')}>{person.active?'Deactivate':'Activate'}</button>}
     </div>
    </li>;
   })}</ul>:<div className="staff-directory-empty"><p>No staff match these filters.</p><button className="lnk tap text-tile" onClick={()=>{setQuery('');setStatus('all')}}>Clear filters</button></div>}
  </section>

  {editor&&<dialog ref={dialog} className="staff-directory-dialog" aria-labelledby="staff-editor-title" onClose={()=>setEditor(null)} onCancel={e=>{if(busy)e.preventDefault()}}>
   <form onSubmit={e=>{
    e.preventDefault();
    if(editor.person)save('/api/staff/'+editor.person.id,'PATCH',{password:form.password},'Password reset.',true);
    else save('/api/staff','POST',form,'Staff account created.',true);
   }}>
    <h2 id="staff-editor-title" className="font-display h-md">{editor.person?'Reset password':'Add staff member'}</h2>
    {editor.person&&<p className="mt-1 text-sm text-ash">{editor.person.name} will be signed out.</p>}
    <fieldset disabled={busy} className="staff-directory-fields">
     {!editor.person&&<>
      <label className="field-stack">Full name<input autoFocus name="name" required className="fld" value={form.name} onChange={updateForm}/></label>
      <label className="field-stack">Username<input name="username" required autoCapitalize="none" className="fld" value={form.username} onChange={updateForm}/></label>
      <label className="field-stack">Role<select name="role" className="fld" value={form.role} onChange={updateForm}><option value="frontdesk">Front desk</option><option value="admin">Administrator</option></select></label>
     </>}
     <label className="field-stack">{editor.person?'New password':'Starting password'}<input autoFocus={Boolean(editor.person)} name="password" required minLength={8} type="password" autoComplete="new-password" className="fld" aria-describedby="staff-password-help" value={form.password} onChange={updateForm}/></label>
     <p id="staff-password-help" className="text-sm text-ash">At least 8 characters.</p>
    </fieldset>
    {formError&&<p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
    <div className="staff-directory-actions mt-5">
     <button type="button" className="pill" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button>
     <button className="btn" disabled={busy}>{busy?'Saving…':editor.person?'Save new password':'Create account'}</button>
    </div>
   </form>
  </dialog>}
 </main>;
}
