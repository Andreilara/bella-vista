// Hotel contact and payment details. Staff edit them in Admin > Settings; lib/contact.js supplies the defaults until they do.
import {CONTACT as DEFAULTS} from './contact.js';
import {getSetting,setSetting,audit} from './db.js';
import {validEmail} from './rules.js';
import {usingStartingPassword} from './staff.js';
import {mailConfigured} from './mail.js';
import {galleryPhotos} from './gallery.js';

const t=(v,n)=>String(v??'').trim().slice(0,n);
const pay=p=>({method:t(p?.method,40),account:t(p?.account,80),number:t(p?.number,40)});
const shape=c=>({phone:t(c?.phone,40),email:t(c?.email,120),address:t(c?.address,200),payments:(Array.isArray(c?.payments)?c.payments:[]).slice(0,8).map(pay).filter(p=>p.method&&p.account)});

export function getContact(){
 let saved=null;try{const raw=getSetting('contact');if(raw)saved=JSON.parse(raw)}catch{}
 return shape(saved||DEFAULTS)}
export const hasContact=c=>!!(c.phone||c.email);

export function saveContact(input,by='admin'){
 const phone=t(input?.phone,40),email=t(input?.email,120),address=t(input?.address,200),list=Array.isArray(input?.payments)?input.payments:[];
 if(!/^[0-9+()\s.-]*$/.test(phone))return{error:'Phone can only contain numbers, spaces, + ( ) and dashes.',code:400};
 if(email&&!validEmail(email))return{error:'Enter a complete email address, or leave it empty.',code:400};
 if(list.length>8)return{error:'You can list up to 8 payment options.',code:400};
 const payments=[];
 for(const [i,raw] of list.entries()){const p=pay(raw);
  if(!p.method&&!p.account&&!p.number)continue;
  if(!p.method||!p.account)return{error:`Payment option ${i+1}: add both how to pay (for example GCash) and the account name.`,code:400};
  payments.push(p)}
 const contact={phone,email,address,payments};
 setSetting('contact',JSON.stringify(contact));audit(by,'settings.contact','',`${phone||'no phone'} | ${email||'no email'} | ${payments.length} payment option(s)`);
 return{ok:true,contact}}

/** What an administrator still needs to set up (drives the dashboard checklist). */
export function setupStatus(){
 const c=getContact();
 return{contact:hasContact(c),payments:c.payments.length>0,email:mailConfigured(),password:!usingStartingPassword(),photos:galleryPhotos().length>0}}
