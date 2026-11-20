import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import {listBookings,ledgerTotals} from '../../../lib/db.js';import {report} from '../../../lib/reports.js';import {rangeFrom} from '../../../lib/range.js';
export const dynamic='force-dynamic';
export async function GET(req){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 const {from,to}=rangeFrom(req.url);return NextResponse.json(report(listBookings(),from,to,ledgerTotals()))}
