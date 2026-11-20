import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import {walkIn} from '../../../lib/bookings.js';
export const dynamic='force-dynamic';
export async function POST(req){const a=await need();if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 let b;try{b=await req.json()}catch{b=null}if(!b||typeof b!=='object')return NextResponse.json({error:'Bad request'},{status:400});
 try{const r=walkIn(b,a.staff.username);return r.error?NextResponse.json({error:r.error},{status:r.code||(/already booked/.test(r.error)?409:400)}):NextResponse.json(r)}
 catch(e){console.error(e);return NextResponse.json({error:'Could not save the booking.'},{status:500})}}
