// Fills the database with realistic demo data so the dashboard, timeline, reports and reviews look alive.
//   npm run seed            (only if the database is empty)
//   npm run seed -- --reset (wipes bookings, reviews and the audit log first)
import {getDb,tx,insertBooking,newRef,token,audit,insertReview,insertEntry,markCancelled} from '../lib/db.js';import {createStaff,listStaff} from '../lib/staff.js';
import {TYPES,EVENTS,quote,today,addDays} from '../lib/rules.js';
if(process.env.NODE_ENV==='production'||process.env.VERCEL==='1'||process.env.DB_PROVIDER==='turso'){
 console.error('Demo seeding is only available against a local development database.');
 process.exit(1);
}
const db=getDb(),has=db.prepare('SELECT COUNT(*) n FROM bookings').get().n;
if(process.argv.includes('--reset'))db.exec('DELETE FROM bookings;DELETE FROM reviews;DELETE FROM audit_log;DELETE FROM ledger;');
else if(has){console.log(`Database already has ${has} bookings. Use "npm run seed -- --reset" to replace them with demo data.`);process.exit(0)}
let seed=20261111;const rnd=()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296,pick=a=>a[Math.floor(rnd()*a.length)],int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const NAMES=['Maria Santos','Jose Reyes','Ana Dela Cruz','Carlo Mendoza','Liza Bautista','Mark Villanueva','Grace Ramos','Paolo Garcia','Joy Navarro','Ben Aquino','Rica Castillo','Noel Torres','Tina Flores','Dan Rivera','Mica Soriano'];
const t=today(),rows=[],reviews=[];
for(const[type,T]of Object.entries(TYPES))for(const unit of T.units){
 let day=addDays(t,-240+int(0,20));
 while(day<addDays(t,75)){
  const nights=type==='hall'?1:int(1,type==='fam'?4:3),out=addDays(day,nights),guests=type==='hall'?int(30,40):type==='fam'?int(4,5):int(2,3),name=pick(NAMES),q=quote(type,guests,day,out),past=out<=t,ongoing=day<=t&&out>t;
  const roll=rnd(),status=past?(roll<.1?'cancelled':'completed'):ongoing?'confirmed':(roll<.2?'pending':roll<.9?'confirmed':'cancelled');
  const at=Date.now()-(past?int(15,90):int(0,12))*864e5-int(0,86400)*1e3,ref=newRef();
  if(status!=='cancelled'||rnd()<.6)rows.push({id:ref,group:ref,token:token(),type,unit,in:day,out,guests,name,email:name.toLowerCase().replace(/[^a-z]+/g,'.')+'@example.com',phone:'0917'+int(1000000,9999999),total:q.total,down:q.down,status:status==='pending'&&Date.now()-at>1728e5?'confirmed':status,source:type!=='hall'&&rnd()<.15?pick(['walk-in','phone']):'online',event:type==='hall'?pick(EVENTS):'',notes:type==='hall'&&rnd()<.5?'Garden setup and sound system, program starts 4 PM.':rnd()<.15?'Celebrating an anniversary.':'',at});
  day=addDays(out,type==='hall'?int(5,25):int(0,9))}}
const METHODS=['Cash','GCash','Bank transfer'];let refunds=0;
tx(d=>{rows.forEach(r=>{insertBooking(d,r);
 const m=()=>pick(METHODS),ref=()=>'REF'+int(100000,999999),hr=n=>r.at+n*36e5,ent=(kind,amount,note='',at=hr(2))=>insertEntry(d,{group:r.id,kind,amount,method:kind==='charge'?'':m(),ref:kind==='charge'?'':ref(),note,by:'seed',at});
 if(r.status==='confirmed')ent('payment',r.down);
 if(r.status==='completed'){ent('payment',r.down);const fine=rnd()<.08;if(fine)ent('charge',2000,'No-smoking fine',r.at+864e5);ent('payment',r.total-r.down+(fine?2000:0),'Balance at check-in',r.at+864e5*2)}
 if(r.status==='cancelled'&&rnd()<.7){const refundable=r.in>addDays(t,3)||rnd()<.5;ent('payment',r.down);markCancelled(d,r.id,refundable);if(refundable&&rnd()<.5)ent('refund',r.down,'Refund sent',r.at+864e5*3);else if(refundable)refunds++}
 else if(r.status==='cancelled')markCancelled(d,r.id,rnd()<.5)});
 const texts=['Peaceful mornings and a beautiful view. The staff were so kind and the room was spotless.','We held our family reunion in the hall. Everything was smooth and the grounds were lovely.','A quiet escape from the city. We slept so well and will definitely be back.','Great value for the family room. The kids loved the fresh mountain air.','Booking was easy and the downpayment process was clear. Highly recommended!','Our company outing went perfectly. Thank you to the whole Bella Vista team.','Cozy, clean, and the sunsets are unreal.','Lovely place for a small wedding. Our guests could not stop complimenting the venue.'];
 rows.filter(r=>r.status==='completed').slice(0,texts.length).forEach((r,i)=>{const[f,...rest]=r.name.split(' ');insertReview({booking:r.id,name:`${f} ${rest.pop()[0]}.`,rating:i%4===3?4:5,text:texts[i],status:i<6?'approved':'pending',at:Date.now()-i*864e5})});
 audit('system','seed.demo_data',null,`${rows.length} demo bookings created`)});
if(!listStaff().some(s=>s.username==='frontdesk'))createStaff({username:'frontdesk',name:'Front Desk',role:'frontdesk',password:'frontdesk2026'},'system');
console.log('Demo logins: admin / admin2026 (administrator) and frontdesk / frontdesk2026 (front desk). Change these before real use.');
console.log(`Seeded ${rows.length} bookings and ${db.prepare('SELECT COUNT(*) n FROM reviews').get().n} reviews.`);
