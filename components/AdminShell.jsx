'use client';
import LoadingSkeleton from './LoadingSkeleton';
import BackLink from './BackLink';
import {LayoutGroup,motion,useReducedMotion} from 'framer-motion';
import {useEffect,useState} from 'react';import Link from 'next/link';import {usePathname,useRouter} from 'next/navigation';import Logo from './Logo';import StaffLogin from './StaffLogin';import {StaffCtx,StaffDraftsCtx} from './StaffContext';import {STAFF_FLAG} from './StaffGuard';
const flag=on=>{try{on?sessionStorage.setItem(STAFF_FLAG,'1'):sessionStorage.removeItem(STAFF_FLAG)}catch{}};   // tells the guest side that a staff member is signed in
const GROUPS=[
 {label:'Operations',links:[['/admin','Dashboard','dashboard'],['/admin/timeline','Timeline','timeline'],['/admin/new','New booking','booking']]},
 {label:'Administration',adminOnly:true,links:[['/admin/reports','Reports','reports'],['/admin/reviews','Reviews','reviews'],['/admin/staff','Staff','staff'],['/admin/audit','Audit log','audit'],['/admin/settings','Settings','settings']]},
 {label:'Account',links:[['/admin/account','My account','account']]},
];
const ICONS={
 dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 timeline:'M3 7h18v14H3z M7 3v6 M17 3v6 M3 11h18 M7 15h4 M13 18h4',
 booking:'M3 7h18v14H3z M7 3v6 M17 3v6 M3 11h18 M12 14v4 M10 16h4',
 reports:'M4 4v16h16 M8 16v-4 M12 16V8 M16 16V5',
 reviews:'M4 4h16v12H9l-5 4V4z M8 8h8 M8 12h5',
 staff:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-4 M17 3a4 4 0 0 1 0 8',
 audit:'M5 4h14v17H5z M9 8h6 M9 12h6 M9 16h4',
 settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
 account:'M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
 logout:'M10 4H4v16h6 M9 12h12 M17 8l4 4-4 4',
 chevron:'m6 9 6 6 6-6',
};
function StaffIcon({name}){
 return <svg className="staff-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={ICONS[name]}/></svg>;
}
const ADMIN_ONLY=GROUPS.filter(group=>group.adminOnly).flatMap(group=>group.links.map(([href])=>href));
const isActive=(path,href)=>path===href||(href!=='/admin'&&path.startsWith(href+'/'));
export default function AdminShell({children}){
 const [menuOpen,setMenuOpen]=useState(false),draftState=useState({});
 const [,setDrafts]=draftState;
 const [me,setMe]=useState(undefined),[resets,setResets]=useState(0),[counts,setCounts]=useState({bookings:0,reviews:0}),path=usePathname(),router=useRouter(),reduceMotion=useReducedMotion();
 useEffect(()=>{fetch('/api/admin').then(async r=>{const ok=r.ok,j=ok?await r.json():null;flag(ok);setMe(ok?j.staff:null);setResets(j?.resets||0)}).catch(()=>setMe(null));const f=()=>{flag(false);setDrafts({});setMe(null)},g=e=>setResets(e.detail||0);addEventListener('bv:unauth',f);addEventListener('bv:resets',g);return()=>{removeEventListener('bv:unauth',f);removeEventListener('bv:resets',g)}},[]);
 // Red dots: bookings waiting for a decision (Dashboard, Timeline), reviews waiting for approval (Reviews) and password-reset requests (Staff). They clear when the item is handled.
 useEffect(()=>{if(!me)return;let live=true;const load=()=>fetch('/api/admin',{cache:'no-store'}).then(async r=>{if(!live)return;if(r.status===401){dispatchEvent(new Event('bv:unauth'));return}if(!r.ok)return;const j=await r.json();setResets(j.resets||0);setCounts({bookings:j.counts?.bookings||0,reviews:j.counts?.reviews||0})}).catch(()=>{});
  load();const t=setInterval(load,30000),v=()=>{if(document.visibilityState==='visible')load()};addEventListener('bv:refresh',load);document.addEventListener('visibilitychange',v);return()=>{live=false;clearInterval(t);removeEventListener('bv:refresh',load);document.removeEventListener('visibilitychange',v)}},[me,path]);
 useEffect(()=>setMenuOpen(false),[path,me]);
 const [sessionError,setSessionError]=useState('');
 const out=async()=>{
  setSessionError('');
  try{
   const response=await fetch('/api/admin',{method:'DELETE'});
   if(!response.ok)throw Error();
   flag(false);
   setDrafts({});
   if(path==='/admin'&&!location.search)setMe(null);
   else location.replace('/admin');
  }catch{setSessionError('Could not sign out. Try again.')}
 };
 // Going back to the guest portal signs staff out first, then navigates.
 const toGuest=async e=>{e.preventDefault();try{await fetch('/api/admin?reason=guest-portal',{method:'DELETE',keepalive:true})}catch{}flag(false);router.push('/')};
 if(me===undefined)return <LoadingSkeleton label="Checking staff session" variant="staff" tone="staff" className="mx-auto max-w-6xl p-6 md:p-12"/>;
 if(!me)return <StaffLogin onSignedIn={st=>{flag(true);if(path==='/admin'&&!location.search)setMe(st);else location.replace('/admin')}}/>;
 const indicator=<motion.span aria-hidden="true" layoutId="staff-active-tab" className="staff-indicator" transition={{duration:reduceMotion?0:.28,ease:[.22,.61,.36,1]}}/>;
 const admin=me.role==='admin',blocked=!admin&&ADMIN_ONLY.some(href=>isActive(path,href));
 const groups=GROUPS.filter(group=>admin||!group.adminOnly);
 const current=groups.flatMap(group=>group.links).find(([href])=>isActive(path,href));
 return <StaffCtx.Provider value={me}><StaffDraftsCtx.Provider value={draftState}>
  <div className="staff-shell">
   <header className="staff-rail on-dark noprint">
    <Link href="/" prefetch={false} onClick={toGuest} aria-label="Back to the Bella Vista website (signs you out)" className="staff-brand"><Logo/></Link>
    <button type="button" className="staff-menu-toggle" aria-controls="staff-navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>
     <span>{current&&<StaffIcon name={current[2]}/>} {current?.[1]||'Staff pages'}</span><StaffIcon name="chevron"/>
    </button>
    <LayoutGroup><motion.nav id="staff-navigation" data-open={menuOpen} aria-label="Staff" className="staff-navigation">
     {groups.map(({label,links})=><div key={label} className="staff-nav-group">
      <p className="staff-nav-label">{label}</p>
      <ul aria-label={label}>
      {links.map(([href,label,icon])=>{
      const active=isActive(path,href);
      const count=href==="/admin"||href==="/admin/timeline"?counts.bookings:href==="/admin/reviews"?counts.reviews:href==="/admin/staff"?resets:0;
      const item=href==="/admin/reviews"?"reviews":href==="/admin/staff"?"password reset requests":"bookings";
      return <li key={href}><Link href={href} aria-current={active?"page":undefined} className="staff-nav-link">
       {active&&indicator}<StaffIcon name={icon}/><span>{label}</span>{count>0&&<><span aria-hidden="true" className="staff-nav-count">{count}</span><span className="sr-only">, {count} pending {item}</span></>}
      </Link></li>;
     })}
      </ul>
     </div>)}
    </motion.nav></LayoutGroup>
    <div className="staff-session"><div className="staff-session-user"><span>{me.name}</span><span>{admin?"Administrator":"Front desk"}</span></div>
     <button type="button" onClick={out} className="staff-logout"><StaffIcon name="logout"/> Log out</button>{sessionError&&<p role="alert" className="text-xs">{sessionError}</p>}
    </div>
   </header>
   <div key={path} className="staff-content interface-enter">
    {blocked?<main className="staff-page"><h1 className="font-display h-lg">Administrators only</h1><BackLink href="/admin" className="mt-6">Back to dashboard</BackLink></main>:children}
   </div>
  </div>
 </StaffDraftsCtx.Provider></StaffCtx.Provider>;
}
