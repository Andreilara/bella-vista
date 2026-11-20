import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import {listAudit} from '../../../lib/db.js';
export const dynamic='force-dynamic';
export async function GET(req){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 const p=new URL(req.url).searchParams;return NextResponse.json({entries:listAudit({limit:p.get('limit')||100,offset:p.get('offset')||0,q:p.get('q')||''})})}
