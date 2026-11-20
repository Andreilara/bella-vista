import {NextResponse} from 'next/server';import {cookies} from 'next/headers';import {COOKIE,currentStaff} from '../../../lib/auth';import limit from '../../../lib/limit';import {login,logout,bootstrap,listStaff,pendingResetCount} from '../../../lib/staff.js';import {audit,pendingBookingCount,pendingReviewCount} from '../../../lib/db.js';import {ip} from '../../../lib/ip.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
export async function GET(){const s=await currentStaff();if(!s)return err('Unauthorized',401);let resets=0,reviews=0,bookings=0;try{bookings=pendingBookingCount()}catch{}if(s.role==='admin'){try{resets=pendingResetCount()}catch{}try{reviews=pendingReviewCount()}catch{}}return NextResponse.json({ok:true,staff:s,resets,counts:{bookings,reviews,resets}})}
export async function POST(req){
 if(limit('login:'+ip(req),8,9e5))return err('Too many attempts. Try again in 15 minutes.',429);
 let b;try{b=await req.json()}catch{b={}}
 bootstrap();if(!listStaff().length)return err('No staff account exists. Set ADMIN_PASSCODE on the server.',503);
 const r=login(b?.username,b?.password);
 if(!r){try{audit('unknown','admin.login_failed',null,`username "${String(b?.username||'').slice(0,30)}" from ${ip(req)}`)}catch{}return err('Incorrect username or password.',401)}
 try{audit(r.staff.username,'admin.login',null,'from '+ip(req))}catch{}
 const res=NextResponse.json({ok:true,staff:r.staff});res.cookies.set(COOKIE,r.token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:r.maxAge});return res}
export async function DELETE(req){const s=await currentStaff(),t=(await cookies()).get(COOKIE)?.value,auto=(req?.url?new URL(req.url).searchParams.get('reason'):null)==='guest-portal';
 if(s){try{audit(s.username,'admin.logout',null,auto?'signed out automatically on returning to the guest portal':'')}catch{}}if(t)logout(t);const res=NextResponse.json({ok:true});res.cookies.delete(COOKIE);return res}
