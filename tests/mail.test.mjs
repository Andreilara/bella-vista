process.env.DB_PATH=':memory:';process.env.MAIL_MODE='json';process.env.MAIL_FROM='Bella Vista <hello@bellavista.ph>';
import test from 'node:test';import assert from 'node:assert/strict';
import {createReservation,changeStatus,addEntry,recoverReferences,notify} from '../lib/bookings.js';
import {saveContact} from '../lib/settings.js';
import {sentMessages} from '../lib/mail.js';
import {setTimeout as delay} from 'node:timers/promises';
import {today,addDays} from '../lib/rules.js';

const base=(o={})=>({name:'Maria Santos',email:'maria@example.com',phone:'9171234567',type:'std',unit:'Room A',in:addDays(today(),20),out:addDays(today(),22),guests:2,...o});
const flush=()=>delay(50);
async function waitForMail(count){
 const deadline=Date.now()+3000;
 while(sentMessages().length<count&&Date.now()<deadline)await delay(15);
 assert.ok(sentMessages().length>=count,'Expected the background email to be captured');
}

test('a new online booking returns its hold deadline and emails the guest the payment details',async()=>{
 saveContact({phone:'0917 123 4567',payments:[{method:'GCash',account:'Bella Vista Hotel',number:'0917 000 1111'}]},'admin');
 const count=sentMessages().length;
 const r=createReservation(base());assert.ok(r.id);assert.ok(r.dueBy>Date.now());assert.equal(r.emailing,true);await waitForMail(count+1);
 const m=sentMessages().at(-1);assert.equal(m.to[0].address,'maria@example.com');assert.match(m.subject,new RegExp(r.id));
 assert.match(m.text,/GCash: Bella Vista Hotel · 0917 000 1111/);assert.match(m.text,/held? your dates until|holding your dates until/i);assert.match(m.text,new RegExp('/my-booking\\?ref='+r.id));assert.match(m.html,/View or cancel your booking/)});
test('booking returns its reference before the scheduled email runs',async()=>{
 const count=sentMessages().length;
 let deliver;
 const result=createReservation(base({in:addDays(today(),60),out:addDays(today(),61)}),{
  scheduleNotification:task=>{deliver=task}
 });
 assert.ok(result.id);
 assert.equal(result.emailing,true);
 assert.equal(sentMessages().length,count);
 await deliver();
 assert.match(sentMessages().at(-1).subject,new RegExp(result.id));
});
test('with no payment channels the email says the hotel will make contact (it does not invent details)',async()=>{
 saveContact({phone:'',payments:[]},'admin');const count=sentMessages().length;createReservation(base({unit:'Room B'}));await waitForMail(count+1);
 assert.match(sentMessages().at(-1).text,/hotel will contact you/)});
test('confirming a booking emails the guest once, not on a repeated confirm',async()=>{
 const count=sentMessages().length,r=createReservation(base({unit:'Room C'}));await waitForMail(count+1);const n0=sentMessages().length;
 addEntry(r.id,{kind:'payment',amount:r.down,method:'Cash',confirm:true},'admin');await waitForMail(n0+1);
 assert.equal(sentMessages().length,n0+1);assert.match(sentMessages().at(-1).subject,/confirmed/);
 changeStatus(r.id,'confirmed','admin');await flush();assert.equal(sentMessages().length,n0+1)});
test('staff-created bookings do not send the online-booking email',async()=>{
 const n0=sentMessages().length;createReservation(base({in:addDays(today(),40),out:addDays(today(),41)}),{staff:true,source:'walk-in'});await flush();assert.equal(sentMessages().length,n0)});
test('reference recovery emails the links, and answers the same for unknown addresses',async()=>{
 const count=sentMessages().length;
 createReservation(base({in:addDays(today(),50),out:addDays(today(),51),email:'recover@example.com'}));await waitForMail(count+1);const n0=sentMessages().length;
 assert.deepEqual(await recoverReferences('recover@example.com'),{ok:true});assert.equal(sentMessages().length,n0+1);assert.match(sentMessages().at(-1).text,/BV-/);
 assert.deepEqual(await recoverReferences('nobody@example.com'),{ok:true});assert.equal(sentMessages().length,n0+1)});
test('a mail failure never throws into the booking',async()=>{await assert.doesNotReject(notify('received','BV-DOESNOTEXIST'))});
