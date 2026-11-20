import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import {changePassword} from '../../../lib/staff.js';import limit from '../../../lib/limit';
export const dynamic='force-dynamic';
export async function POST(req){const a=await need();if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 if(limit('pw:'+a.staff.id,5,9e5))return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
 let b;try{b=await req.json()}catch{b={}}const r=changePassword(a.staff.id,b?.current,b?.next);return r.error?NextResponse.json({error:r.error},{status:r.code||400}):NextResponse.json({ok:true})}
