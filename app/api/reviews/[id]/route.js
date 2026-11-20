import {NextResponse} from 'next/server';import {revalidatePath} from 'next/cache';import {need} from '../../../../lib/auth';import {getReview,updateReview,deleteReview,audit} from '../../../../lib/db.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
export async function PATCH(req,{params}){const a=await need('admin');if(a.error)return err(a.error,a.code);
 let s;try{s=(await req.json()).status}catch{}if(!['pending','approved','rejected'].includes(s))return err('Invalid status',400);
 const r=getReview(+(await params).id);if(!r)return err('Not found',404);updateReview(r.id,s);audit(a.staff.username,'review.'+s,r.booking,`review #${r.id}`);revalidatePath('/'); /* the home page is cached, so refresh it now */return NextResponse.json({...r,status:s})}
export async function DELETE(_,{params}){const a=await need('admin');if(a.error)return err(a.error,a.code);
 const r=getReview(+(await params).id);if(!r)return err('Not found',404);deleteReview(r.id);audit(a.staff.username,'review.deleted',r.booking,`review #${r.id}`);revalidatePath('/');return NextResponse.json({ok:true})}
