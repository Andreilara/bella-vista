// Plain, readable booking emails (text plus a simple HTML version). All data comes from summarize() in bookings.js.
import {fmt,nightsBetween} from './rules.js';
import {fmtDate,fmtStamp} from './format.js';
import {SITE} from './site.js';

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const first=n=>String(n||'').trim().split(/\s+/)[0]||'there';
export const links=b=>({track:`${SITE}/my-booking?ref=${b.id}`,voucher:`${SITE}/voucher/${b.id}?t=${b.token}`});
const units=b=>b.units.map(u=>u.unit).join(', ');
const stay=b=>`${fmtDate(b.in)} (from 2:00 PM) to ${fmtDate(b.out)} (by 12:00 NN) · ${nightsBetween(b.in,b.out)} night${nightsBetween(b.in,b.out)===1?'':'s'}`;
const payText=(b,c)=>c.payments.length
 ?['How to pay your downpayment:',...c.payments.map(p=>`  ${p.method}: ${p.account}${p.number?' · '+p.number:''}`),`Please quote reference ${b.id} when you pay.`]
 :[`The hotel will contact you on the email and mobile number you gave to arrange your downpayment. Please quote reference ${b.id}.`];
const contactText=c=>[c.phone,c.email].filter(Boolean).length?['Questions? '+[c.phone,c.email].filter(Boolean).join(' · ')]:[];
const wrap=(title,lines,b)=>{ // lines: array of strings, '' = paragraph break
 const l=links(b);
 const html=`<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1e2420;max-width:560px"><h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>${lines.map(x=>x===''?'':`<p style="margin:0 0 12px">${esc(x).replace(/\n/g,'<br>')}</p>`).join('')}<p style="margin:16px 0 0"><a href="${esc(l.track)}" style="color:#2c5a42">View or cancel your booking</a> · <a href="${esc(l.voucher)}" style="color:#2c5a42">Open your voucher</a></p></div>`;
 return html};

export function received(b,c){
 const lines=[`Hi ${first(b.name)},`,`Thank you for choosing Bella Vista. We are holding your dates until ${fmtStamp(b.dueBy)}.`,
  `Reference: ${b.id}\nStay: ${units(b)}\n${stay(b)}\nTotal: ${fmt(b.total)}\nDownpayment (50%): ${fmt(b.down)}`,
  payText(b,c).join('\n'),
  'Your booking is confirmed once we receive the downpayment. Requests that are not paid by the deadline are released. Cancellations less than 3 days before check-in are non-refundable.',
  ...contactText(c)];
 const l=links(b);
 return{subject:`We've received your reservation ${b.id}`,text:lines.join('\n\n')+`\n\nView or cancel your booking: ${l.track}\nYour voucher: ${l.voucher}\n`,html:wrap('We’ve received your reservation',lines,b)}}

export function confirmed(b,c){
 const lines=[`Hi ${first(b.name)},`,'Your stay at Bella Vista is confirmed. We look forward to welcoming you.',
  `Reference: ${b.id}\nStay: ${units(b)}\n${stay(b)}\nBalance due at check-in: ${fmt(Math.max(0,b.balance))}`,
  'Please bring your voucher (printed or on your phone) to the front desk.',...contactText(c)];
 const l=links(b);
 return{subject:`Your stay is confirmed: ${b.id}`,text:lines.join('\n\n')+`\n\nView your booking: ${l.track}\nYour voucher: ${l.voucher}\n`,html:wrap('Your stay is confirmed',lines,b)}}

/** list = summaries of one guest's upcoming bookings */
export function recover(list,c){
 const body=list.map(b=>`${b.id} · ${units(b)} · ${fmtDate(b.in)} to ${fmtDate(b.out)} · ${b.status==='pending'?'awaiting downpayment':'confirmed'}\n${links(b).track}`);
 const lines=['Hi,','Here are your upcoming Bella Vista bookings. Open a link to see the details, cancel, or find your voucher.',...body,...contactText(c)];
 const html=`<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1e2420;max-width:560px"><h1 style="font-size:22px;margin:0 0 16px">Your Bella Vista bookings</h1><p>Open a link to see the details, cancel, or find your voucher.</p>${list.map(b=>`<p style="margin:0 0 12px"><b>${esc(b.id)}</b> · ${esc(units(b))}<br>${esc(fmtDate(b.in))} to ${esc(fmtDate(b.out))} · ${b.status==='pending'?'awaiting downpayment':'confirmed'}<br><a href="${esc(links(b).track)}" style="color:#2c5a42">View booking</a></p>`).join('')}</div>`;
 return{subject:'Your Bella Vista booking references',text:lines.join('\n\n')+'\n',html}}
