import {NextResponse} from 'next/server';import {need} from '../../../../lib/auth';import {changeStatus,detail} from '../../../../lib/bookings.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
export async function GET(_,{params}){const a=await need();if(a.error)return err(a.error,a.code);const d=detail((await params).id);return d?NextResponse.json(d):err('Not found',404)}
export async function PATCH(req,{params}){const a=await need();if(a.error)return err(a.error,a.code);
 let s;try{s=(await req.json()).status}catch{}
 const r=changeStatus((await params).id,s,a.staff.username);if(r.error)return err(r.error,r.code||400);return NextResponse.json(r.booking)}
