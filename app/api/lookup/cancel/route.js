import {NextResponse} from 'next/server';import limit from '../../../../lib/limit';import {cancelByGuest} from '../../../../lib/bookings.js';import {ip} from '../../../../lib/ip.js';
export const dynamic='force-dynamic';
export async function POST(req){
 if(limit('cancel:'+ip(req),5,9e5))return NextResponse.json({error:'Too many attempts. Please try again in a few minutes.'},{status:429});
 let b;try{b=await req.json()}catch{b={}}
 const r=b&&b.id&&b.email?cancelByGuest(b.id,b.email):{error:'Enter your reference and email.',code:400};
 return r.error?NextResponse.json({error:r.error},{status:r.code||400}):NextResponse.json(r.summary)}
