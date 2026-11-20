'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import useVisiblePolling from '../../../components/useVisiblePolling';
import BookingPanel from '../../../components/BookingPanel';
import {api} from '../../../lib/adminClient.js';
import {fmtShort} from '../../../lib/format.js';
import {TYPES,today,addDays,nightsBetween,expired} from '../../../lib/rules.js';

const LABELS={pending:'Pending',confirmed:'Confirmed',completed:'Completed',expired:'Expired'};
const shortDay=new Intl.DateTimeFormat('en-PH',{weekday:'short',timeZone:'UTC'});
const monthName=new Intl.DateTimeFormat('en-PH',{month:'long',year:'numeric',timeZone:'UTC'});
const asDate=day=>new Date(day+'T00:00:00Z');
const weekend=day=>[0,6].includes(asDate(day).getUTCDay());
const unitCount=Object.values(TYPES).reduce((count,type)=>count+type.units.length,0);

export default function Timeline(){
 const current=today();
 const [start,setStart]=useState(()=>addDays(current,-3));
 const [dayCount,setDayCount]=useState(28);
 const [rows,setRows]=useState(null);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState(null);
 const bookingTrigger=useRef(null),detailsHeading=useRef(null);
 const closeDetails=()=>{
  setSelected(null);
  bookingTrigger.current?.focus();
 };
 useEffect(()=>{
  detailsHeading.current?.focus();
 },[selected]);

 const load=useCallback(async()=>{
  try{
   const response=await api('/api/bookings?all=1');
   if(!response.ok)throw Error();
   setRows((await response.json()).bookings);
   setError('');
  }catch{setError('Could not load reservations.')}
 },[]);
 useEffect(()=>{
  const media=matchMedia('(max-width: 767px)');
  const update=()=>setDayCount(media.matches?10:28);
  update();media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 useVisiblePolling(load,5000);

 if(!rows&&!error)return <LoadingSkeleton label="Loading timeline" variant="timeline" className="staff-page"/>;
 const step=dayCount===10?5:14;
 const end=addDays(start,dayCount);
 const days=Array.from({length:dayCount},(_,index)=>addDays(start,index));
 const months=[];
 for(const day of days){
  const key=day.slice(0,7),last=months.at(-1);
  if(last?.key===key)last.span++;
  else months.push({key,span:1,label:monthName.format(asDate(day))});
 }
 const bookings=(rows||[]).filter(row=>row.status!=='cancelled');
 const visible=bookings.filter(row=>row.in<end&&row.out>start);
 const chosen=bookings.find(row=>row.id===selected);
 const occupied=new Set(bookings.filter(row=>row.in<=current&&current<row.out&&!expired(row)).map(row=>row.unit)).size;
 const shift=days=>setStart(value=>addDays(value,days));

 return <main className="staff-page timeline-page">
  <header className="timeline-heading">
   <h1 className="font-display h-lg">Timeline</h1>
   {rows&&<p><strong>{occupied} / {unitCount}</strong> units reserved today</p>}
  </header>
  {error&&<p className="mt-4 text-sm text-red-700" role="alert">{error} <button className="lnk" onClick={load}>Retry</button></p>}
  {rows&&<section className="timeline-shell" aria-label="Reservation calendar">
   <div className="timeline-toolbar">
    <h2 className="font-display h-sm" aria-live="polite">{fmtShort(start)} – {fmtShort(days.at(-1))}</h2>
    <div className="timeline-controls">
     <button type="button" onClick={()=>shift(-step)} aria-label={'Back '+step+' days'}>‹</button>
     <button type="button" onClick={()=>setStart(addDays(current,-3))}>Today</button>
     <button type="button" onClick={()=>shift(step)} aria-label={'Forward '+step+' days'}>›</button>
    </div>
    <label className="field-label timeline-jump">Jump to <input className="fld" type="date" value={start} onChange={event=>{if(event.target.value)setStart(event.target.value)}}/></label>
   </div>
   <div className="timeline-scroll" tabIndex={0} role="region" aria-label="Room and date grid">
    <div className="timeline-grid" style={{'--timeline-days':dayCount}}>
     <div className="timeline-row timeline-dates">
      <div className="timeline-unit">Unit</div>
      <div className="timeline-days">
       {months.map(month=><span key={month.key} className="timeline-month" style={{gridColumn:'span '+month.span}}>{month.label}</span>)}
       {days.map(day=><div key={day} className="timeline-day" data-today={day===current} data-weekend={weekend(day)} aria-current={day===current?'date':undefined}>
        <span>{shortDay.format(asDate(day))}</span><strong>{Number(day.slice(-2))}</strong>
       </div>)}
      </div>
     </div>
     {Object.entries(TYPES).map(([key,type])=><div key={key} className="timeline-group">
      <h3>{type.name}</h3>
      {type.units.map(unit=><div key={unit} className="timeline-row">
       <div className="timeline-unit">{unit}</div>
       <div className="timeline-days timeline-lane">
        {days.map(day=><span key={day} className="timeline-day" data-today={day===current} data-weekend={weekend(day)} aria-hidden="true"/>)}
        {visible.filter(row=>row.unit===unit).map(row=>{
         const from=row.in>start?row.in:start,to=row.out<end?row.out:end;
         const status=expired(row)?'expired':row.status;
         return <button key={row.id} type="button" className="timeline-booking" data-status={status}
          aria-pressed={row.id===selected} aria-controls={row.id===selected?'timeline-booking-details':undefined}
          title={row.name+' · '+row.in+' to '+row.out+' · '+LABELS[status]}
          aria-label={row.name+', '+unit+', '+row.in+' to '+row.out+', '+LABELS[status]}
          style={{left:(nightsBetween(start,from)/dayCount)*100+'%',width:(nightsBetween(from,to)/dayCount)*100+'%'}}
          onClick={event=>{bookingTrigger.current=event.currentTarget;if(selected===row.id)closeDetails();else setSelected(row.id)}}>
          <span>{row.name}</span>
         </button>;
        })}
       </div>
      </div>)}
     </div>)}
    </div>
   </div>
   <div className="timeline-footer">
    <ul aria-label="Reservation statuses">{Object.entries(LABELS).map(([status,label])=><li key={status}><i data-status={status} aria-hidden="true"/>{label}</li>)}</ul>
    {!visible.length&&<p>No reservations in this range.</p>}
   </div>
  </section>}
  {chosen&&<div id="timeline-booking-details" className="timeline-details"><h2 ref={detailsHeading} tabIndex={-1} className="font-display h-sm scroll-mt-24 px-5 pt-5 md:px-8">Booking details</h2><BookingPanel key={chosen.id} id={chosen.id} onChange={load} onClose={closeDetails}/></div>}
 </main>;
}
