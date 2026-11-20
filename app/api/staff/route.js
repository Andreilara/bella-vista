import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import {listStaff,createStaff,listResets} from '../../../lib/staff.js';
export const dynamic='force-dynamic';
export async function GET(){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});return NextResponse.json({staff:listStaff(),resets:listResets()})}
export async function POST(req){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 let b;try{b=await req.json()}catch{b={}}const r=createStaff(b||{},a.staff.username);return r.error?NextResponse.json({error:r.error},{status:400}):NextResponse.json({staff:listStaff(),resets:listResets()})}
