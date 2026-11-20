// Optional email. Nothing is sent unless SMTP_URL is set (e.g. smtps://user:pass@smtp.example.com:465), and a failed send never breaks a booking.
// MAIL_FROM sets the sender, e.g. "Bella Vista <reservations@yourdomain.com>". MAIL_MODE=json keeps messages in memory (used by the tests).
import nodemailer from 'nodemailer';
let tp;const sent=[];
function transport(){
 if(tp!==undefined)return tp;
 if(process.env.SMTP_URL)tp=nodemailer.createTransport(process.env.SMTP_URL);
 else if(process.env.MAIL_MODE==='json')tp=nodemailer.createTransport({jsonTransport:true});
 else tp=null;
 return tp}
export const mailConfigured=()=>!!transport();
export async function sendMail({to,subject,text,html}){
 const t=transport();if(!t)return{ok:false,skipped:true};
 try{const info=await t.sendMail({from:process.env.MAIL_FROM||'Bella Vista <no-reply@localhost>',to,subject,text,html});
  if(process.env.MAIL_MODE==='json')sent.push(JSON.parse(info.message));return{ok:true}}
 catch(e){console.error('Email could not be sent:',e.message);return{ok:false}}}
/** Messages captured in MAIL_MODE=json (tests only). */
export const sentMessages=()=>sent;
