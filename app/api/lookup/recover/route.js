import {NextResponse} from 'next/server';import limit from '../../../../lib/limit';import {ip} from '../../../../lib/ip.js';import {validEmail} from '../../../../lib/rules.js';import {recoverReferences} from '../../../../lib/bookings.js';
export const dynamic='force-dynamic';
export async function POST(req){
 let b;try{b=await req.json()}catch{b={}}const email=String(b?.email||'').trim().toLowerCase();
 if(!validEmail(email))return NextResponse.json({error:'Enter the email address you booked with.'},{status:400});
 if(limit('recover-ip:'+ip(req),10,36e5)||limit('recover:'+email,3,36e5))return NextResponse.json({error:'Too many requests. Please try again later.'},{status:429});
 const r=await recoverReferences(email);return NextResponse.json(r)}
