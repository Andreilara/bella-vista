import {NextResponse} from 'next/server';import {revalidatePath} from 'next/cache';import {need} from '../../../lib/auth';import {getContact,saveContact,setupStatus} from '../../../lib/settings.js';import {mailConfigured} from '../../../lib/mail.js';
export const dynamic='force-dynamic';
const err=(error,status)=>NextResponse.json({error},{status});
// Staff only: the contact and payment details, plus what is still to set up.
export async function GET(){const a=await need('admin');if(a.error)return err(a.error,a.code);
 return NextResponse.json({contact:getContact(),setup:setupStatus(),mail:mailConfigured()})}
export async function PUT(req){const a=await need('admin');if(a.error)return err(a.error,a.code);
 let b;try{b=await req.json()}catch{b=null}if(!b||typeof b!=='object')return err('Bad request',400);
 const r=saveContact(b,a.staff.username);if(r.error)return err(r.error,r.code||400);revalidatePath('/','layout');   // cached pages pick up the new contact and payment details at once
 return NextResponse.json({contact:r.contact,setup:setupStatus(),mail:mailConfigured()})}
