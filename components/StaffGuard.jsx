'use client';
import {useEffect} from 'react';import {usePathname} from 'next/navigation';
export const STAFF_FLAG='bv_staff';
/** Signs staff out when they move from the staff area to the guest portal. In-page navigation and the Back button never reach the
 *  server (so the middleware can't see them), which is why the browser also asks. The flag is only set while a staff member is signed in. */
export default function StaffGuard(){
 const path=usePathname();
 useEffect(()=>{if(!path||path.startsWith('/admin'))return;
  let on=null;try{on=sessionStorage.getItem(STAFF_FLAG)}catch{}if(!on)return;
  try{sessionStorage.removeItem(STAFF_FLAG)}catch{}
  fetch('/api/admin?reason=guest-portal',{method:'DELETE',keepalive:true}).catch(()=>{})},[path]);
 return null}
