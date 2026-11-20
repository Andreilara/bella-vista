import {NextResponse} from 'next/server';
import {STAFF_COOKIE,shouldClearStaffCookie} from './lib/staffLeave.js';
// Runs on guest-portal pages only (the matcher skips /admin, /api, /_next and any file with an extension).
// Opening any guest page, in any tab, removes the staff session cookie, so a staff member is signed out automatically.
export function proxy(req){
 const res=NextResponse.next();
 if(shouldClearStaffCookie({hasCookie:req.cookies.has(STAFF_COOKIE),headers:req.headers}))res.cookies.set(STAFF_COOKIE,'',{path:'/',maxAge:0});
 return res}
export const config={matcher:['/((?!admin|api|_next|.*\\..*).*)']};
