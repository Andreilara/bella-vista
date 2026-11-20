import {NextResponse} from 'next/server';import {need} from '../../../../../lib/auth';import {reschedule} from '../../../../../lib/bookings.js';
export const dynamic='force-dynamic';
export async function POST(req,{params}){const a=await need();if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 let b;try{b=await req.json()}catch{b=null}if(!b||typeof b!=='object')return NextResponse.json({error:'Bad request'},{status:400});
 const r=reschedule((await params).id,{in:b.in,out:b.out,unit:b.unit},a.staff.username);return r.error?NextResponse.json({error:r.error},{status:r.code||400}):NextResponse.json(r)}
