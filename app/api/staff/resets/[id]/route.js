import {NextResponse} from 'next/server';import {need} from '../../../../../lib/auth';import {dismissReset,listResets} from '../../../../../lib/staff.js';
export const dynamic='force-dynamic';
export async function DELETE(_req,{params}){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 dismissReset(+(await params).id,a.staff.username);return NextResponse.json({resets:listResets()})}
