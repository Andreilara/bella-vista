import {NextResponse} from 'next/server';import limit from '../../../../lib/limit';import {ip} from '../../../../lib/ip.js';import {requestReset} from '../../../../lib/staff.js';
export const dynamic='force-dynamic';
// A staff member who forgot their password asks here. The answer is always the same, so nobody can find out which usernames exist.
export async function POST(req){
 if(limit('reset:'+ip(req),5,9e5))return NextResponse.json({error:'Too many requests. Try again in 15 minutes.'},{status:429});
 let b;try{b=await req.json()}catch{b={}}
 const u=String(b?.username||'').trim();if(!u||u.length>40)return NextResponse.json({error:'Enter your username.'},{status:400});
 try{requestReset(u)}catch(e){console.error(e);return NextResponse.json({error:'Something went wrong. Please ask an administrator directly.'},{status:500})}
 return NextResponse.json({ok:true})}
