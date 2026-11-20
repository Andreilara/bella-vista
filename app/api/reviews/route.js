import {NextResponse} from 'next/server';import {need} from '../../../lib/auth';import limit from '../../../lib/limit';import {submitReview} from '../../../lib/bookings.js';import {allReviews} from '../../../lib/db.js';import {ip} from '../../../lib/ip.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
export async function GET(){const a=await need('admin');if(a.error)return err(a.error,a.code);return NextResponse.json({reviews:allReviews()})}
export async function POST(req){
 if(limit('review:'+ip(req),5,36e5))return err('Too many attempts. Please try again later.',429);
 let b;try{b=await req.json()}catch{b=null}if(!b||typeof b!=='object')return err('Bad request',400);
 const r=submitReview(b);return r.error?err(r.error,r.code||400):NextResponse.json(r)}
