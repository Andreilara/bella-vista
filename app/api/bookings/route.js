import {after,NextResponse} from 'next/server';import {listBookings,busyList,ledgerTotals,dataVersion} from '../../../lib/db.js';import {need} from '../../../lib/auth';import limit from '../../../lib/limit';
import {createReservation} from '../../../lib/bookings.js';import {ip} from '../../../lib/ip.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
export async function GET(req){
 if(new URL(req.url).searchParams.get('all')){const a=await need();if(a.error)return err(a.error,a.code);
  // The staff screens poll every few seconds. If nothing changed since their last fetch, answer 304 and skip building ~1 MB of JSON.
  const v=dataVersion(),h={ETag:v,'Cache-Control':'private, no-cache'};if(req.headers.get('if-none-match')===v)return new NextResponse(null,{status:304,headers:h});
  return NextResponse.json({bookings:listBookings(),money:ledgerTotals()},{headers:h})}
 return NextResponse.json({busy:busyList()})}
export async function POST(req){
 if(limit('book:'+ip(req),10,36e5))return err('Too many requests. Please try again later.',429);
 let b;try{b=await req.json()}catch{b=null}if(!b||typeof b!=='object')return err('Bad request',400);
 if(b.acceptedTerms!==true)return err('Please accept the Terms & Conditions to continue.',400);
 try{const r=createReservation(b,{scheduleNotification:after});if(r.error)return err(r.error,/already booked/.test(r.error)?409:400);return NextResponse.json(r)}
 catch(e){console.error(e);return err('Could not save your reservation. Please try again.',500)}}
