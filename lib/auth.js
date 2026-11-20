import {cookies} from 'next/headers';import {findSession} from './staff.js';
export const COOKIE='bv_admin';
/** The signed-in staff member (or null). */
export const currentStaff=async()=>{const t=(await cookies()).get(COOKIE)?.value;return t?findSession(t):null};
/** Gate for API routes: need() = any staff, need('admin') = administrators only. Returns {staff} or {code,error}. */
export async function need(role){const s=await currentStaff();if(!s)return{code:401,error:'Unauthorized'};if(role&&s.role!==role)return{code:403,error:'You do not have permission to do that.'};return{staff:s}}
