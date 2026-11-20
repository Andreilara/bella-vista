import {NextResponse} from 'next/server';import {need} from '../../../../lib/auth';import {listStaff,updateStaff,listResets} from '../../../../lib/staff.js';
export const dynamic='force-dynamic';
export async function PATCH(req,{params}){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 let b;try{b=await req.json()}catch{b={}}const id=+(await params).id;
 if(id===a.staff.id&&(b.active===false||(b.role&&b.role!==a.staff.role)))return NextResponse.json({error:'You cannot deactivate or demote your own account.'},{status:400});
 const r=updateStaff(id,{active:b.active,role:b.role,password:b.password},a.staff.username);return r.error?NextResponse.json({error:r.error},{status:r.code||400}):NextResponse.json({staff:listStaff(),resets:listResets()})}
