import {NextResponse} from 'next/server';import limit from '../../../lib/limit';import {lookup} from '../../../lib/bookings.js';import {ip} from '../../../lib/ip.js';
export const dynamic='force-dynamic';
export async function POST(req){
 if(limit('lookup:'+ip(req),10,9e5))return NextResponse.json({error:'Too many attempts. Please try again in a few minutes.'},{status:429});
 let b;try{b=await req.json()}catch{b={}}
 const r=b&&b.id&&b.email?lookup(b.id,b.email):null;
 return r?NextResponse.json(r):NextResponse.json({error:'We could not find a booking with that reference and email.'},{status:404})}
