import {TYPES,addDays,nightsBetween,expired} from './rules.js';
const paid=b=>b.status==='confirmed'||b.status==='completed';
const UNITS=Object.values(TYPES).reduce((n,t)=>n+t.units.length,0);
const overlap=(b,from,endEx)=>{const a=b.in>from?b.in:from,z=b.out<endEx?b.out:endEx;return Math.max(0,nightsBetween(a,z))};
const wd=d=>new Date(d+'T00:00:00Z').getUTCDay();

/** Report over bookings whose check-in falls in [from,to] (inclusive, YYYY-MM-DD). Revenue = confirmed + completed. */
export function report(rows,from,to,money={}){
 const endEx=addDays(to,1),days=Math.max(1,nightsBetween(from,endEx)),sel=rows.filter(b=>b.in>=from&&b.in<=to).map(b=>expired(b)?{...b,status:'expired'}:b),pd=sel.filter(paid);
 const sum=(a,f=b=>b.total)=>a.reduce((s,b)=>s+f(b),0),cnt=s=>sel.filter(b=>b.status===s).length;
 const groupTotals=new Map();
 for(const booking of rows)groupTotals.set(booking.group,(groupTotals.get(booking.group)||0)+booking.total);
 const primary=sel.filter(b=>b.id===b.group),mo=b=>money[b.group]||{paid:0,charges:0},collected=primary.reduce((t,b)=>t+mo(b).paid,0),fines=primary.reduce((t,b)=>t+mo(b).charges,0),
  outstanding=primary.filter(paid).reduce((t,b)=>t+Math.max(0,(groupTotals.get(b.group)||0)+mo(b).charges-mo(b).paid),0);
 const nightsOf=a=>sum(a,b=>overlap(b,from,endEx)),bookedNights=nightsOf(rows.filter(paid));
 const months=[];for(let m=from.slice(0,7);m<=to.slice(0,7)&&months.length<62;){const x=pd.filter(b=>b.in.startsWith(m));months.push({m,bookings:x.length,revenue:sum(x)});const[y,mo]=m.split('-').map(Number);m=mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`}
 const byType=Object.entries(TYPES).map(([k,T])=>{const x=pd.filter(b=>b.type===k),n=nightsOf(rows.filter(b=>paid(b)&&b.type===k)),cap=T.units.length*days;return{type:k,name:T.name,bookings:x.length,revenue:sum(x),nights:n,occupancy:cap?Math.round(n/cap*1000)/10:0}});
 const upcomingOrStayed=b=>!['cancelled','expired'].includes(b.status);
 const events={};for(const b of sel)if(b.type==='hall'&&upcomingOrStayed(b)&&b.event)events[b.event]=(events[b.event]||0)+1;
 return{range:{from,to,days},
  totals:{bookings:sel.length,pending:cnt('pending'),confirmed:cnt('confirmed'),completed:cnt('completed'),cancelled:cnt('cancelled'),expired:cnt('expired'),revenue:sum(pd),pipeline:sum(sel.filter(b=>b.status==='pending')),
   collected,fines,outstanding,avgValue:pd.length?Math.round(sum(pd)/pd.length):0,avgNights:pd.length?Math.round(sum(pd,b=>nightsBetween(b.in,b.out))/pd.length*10)/10:0,cancelRate:sel.length?Math.round(cnt('cancelled')/sel.length*1000)/10:0},
  occupancy:{pct:Math.round(bookedNights/(UNITS*days)*1000)/10,bookedNights,availableNights:UNITS*days},
  byType,months,weekdays:[0,1,2,3,4,5,6].map(i=>sel.filter(b=>upcomingOrStayed(b)&&wd(b.in)===i).length),events}}

const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
export const toCsv=(rows,money={})=>['Ref,Package,Source,Unit,Type,Check-in,Check-out,Nights,Guests,Name,Email,Phone,Event,Notes,Total,Downpayment,Paid (package),Charges (package),Status,Created']
 .concat(rows.map(b=>[b.id,b.group,b.source,b.unit,TYPES[b.type]?.name,b.in,b.out,nightsBetween(b.in,b.out),b.guests,b.name,b.email,b.phone,b.event,b.notes,b.total,b.down,b.id===b.group?(money[b.group]?.paid||0):'',b.id===b.group?(money[b.group]?.charges||0):'',expired(b)?'expired':b.status,new Date(b.at).toISOString()].map(cell).join(','))).join('\r\n')+'\r\n';
