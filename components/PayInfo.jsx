'use client';
import {useContact} from './ContactContext';import {fmt} from '../lib/rules.js';import {fmtStamp} from '../lib/format.js';
const tel=p=>'tel:'+p.replace(/[^\d+]/g,'');
export function ContactLine({className=''}){
 const c=useContact();if(!c.phone&&!c.email)return null;
 return <span className={className}>{c.phone&&<a href={tel(c.phone)} className="underline underline-offset-4">{c.phone}</a>}{c.phone&&c.email&&' · '}{c.email&&<a href={'mailto:'+c.email} className="underline underline-offset-4">{c.email}</a>}</span>}
/** "How to pay" panel: the downpayment, its deadline, the payment channels and who to ask. */
export default function PayInfo({id,down,dueBy}){
 const c=useContact(),reach=!!(c.phone||c.email);
 return <section aria-label="How to pay" className="mt-6 max-w-md rounded-md border border-tile/55 bg-surface p-4 text-sm">
  <h3 className="text-lg font-semibold leading-snug">Pay {fmt(down)}{dueBy?<> by {fmtStamp(dueBy)}</>:' within 48 hours'}</h3>
  <p className="mt-1 text-ash">This secures your dates. Quote reference <b className="text-ink">{id}</b> when you pay. Requests with no downpayment by then are released.</p>
  {c.payments.length>0
   ?<ul className="mt-3 space-y-1">{c.payments.map((p,i)=><li key={i}><b>{p.method}</b>: {p.account}{p.number&&<> · <span className="font-mono">{p.number}</span></>}</li>)}</ul>
   :<p className="mt-3 rounded-md bg-fog px-3 py-2">{reach?'Payment details are not listed online yet. Contact the hotel with your reference to arrange the downpayment.':'The hotel will contact you on the email and mobile number you gave to arrange the downpayment.'}</p>}
  {reach&&<p className="mt-3 text-ash">Questions? <ContactLine/></p>}</section>}
