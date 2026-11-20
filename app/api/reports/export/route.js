import {NextResponse} from 'next/server';import {need} from '../../../../lib/auth';import {listBookings,ledgerTotals,audit} from '../../../../lib/db.js';import {toCsv} from '../../../../lib/reports.js';import {rangeFrom} from '../../../../lib/range.js';
export const dynamic='force-dynamic';
export async function GET(req){const a=await need('admin');if(a.error)return NextResponse.json({error:a.error},{status:a.code});
 const {from,to}=rangeFrom(req.url),rows=listBookings().filter(b=>b.in>=from&&b.in<=to);
 audit(a.staff.username,'report.export',null,`${from} to ${to}, ${rows.length} rows`);
 return new NextResponse(toCsv(rows,ledgerTotals()),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="bella-vista-bookings-${from}_to_${to}.csv"`}})}
