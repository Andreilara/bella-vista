'use client';

import LoadingSkeleton from '../../../components/LoadingSkeleton';
import {useEffect,useState} from 'react';
import {fmt,today,addDays} from '../../../lib/rules.js';
import {api} from '../../../lib/adminClient.js';
import {fmtDate} from '../../../lib/format.js';

const DAY=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STATUSES=['pending','confirmed','completed','cancelled','expired'];
const monthEnd=(year,month)=>new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);

function presets(){
 const date=today(),year=+date.slice(0,4),month=+date.slice(5,7);
 const [lastYear,lastMonth]=month===1?[year-1,12]:[year,month-1];
 const monthStart=(y,m)=>y+'-'+String(m).padStart(2,'0')+'-01';
 return [
  ['This month',monthStart(year,month),monthEnd(year,month)],
  ['Last month',monthStart(lastYear,lastMonth),monthEnd(lastYear,lastMonth)],
  ['Next 90 days',date,addDays(date,90)],
  ['This year',year+'-01-01',year+'-12-31'],
  ['Last year',year-1+'-01-01',year-1+'-12-31']
 ];
}

function RevenueChart({months}){
 const first=months.findIndex(month=>month.revenue>0);
 const plottedMonths=first<0?[]:months.slice(first);
 const max=Math.max(1,...plottedMonths.map(month=>month.revenue));
 return <section className="report-section" aria-labelledby="monthly-revenue">
  <h2 id="monthly-revenue" className="font-display h-md">Monthly revenue</h2>
  {plottedMonths.length>0?<div className="report-chart-scroll" key={plottedMonths[0].m} tabIndex={0} aria-label="Monthly revenue chart">
   <ul className="report-chart">
    {plottedMonths.map(month=>{
     const label=new Date(month.m+'-01T00:00:00Z').toLocaleDateString('en-PH',{month:'short',year:'2-digit',timeZone:'UTC'});
     return <li key={month.m}>
      <span className="report-chart-value">{month.revenue?fmt(month.revenue):'—'}</span>
      <span className="report-plot"><span aria-hidden="true" className="bar" style={{height:(month.revenue/max)*100+'%'}}/></span>
      <span className="report-chart-label">{label}</span>
     </li>;
    })}
   </ul>
  </div>:<p className="report-empty">No confirmed revenue in this period.</p>}
 </section>;
}

export default function Reports(){
 const ranges=presets();
 const [[from,to],setRange]=useState(()=>[ranges[3][1],ranges[3][2]]);
 const [result,setResult]=useState(null);
 const range=new URLSearchParams({from,to}).toString();
 const valid=Boolean(from&&to&&from<=to);
 const current=result?.range===range?result:null;
 const data=current?.data;
 const error=!valid?'Choose a valid date range.':current?.error;

 useEffect(()=>{
  if(!valid)return;
  let active=true;
  api('/api/reports?'+range).then(async response=>{
   const payload=await response.json();
   if(active)setResult(response.ok?{range,data:payload}:{range,error:payload.error||'Could not load reports.'});
  }).catch(()=>{if(active)setResult({range,error:'Could not load reports. Try again.'})});
  return()=>{active=false};
 },[range,valid]);

 const totals=data?.totals;
 const maxCheckIns=data?Math.max(1,...data.weekdays):1;
 return <main className="staff-page rpt hotel-report">
  <header className="report-header">
   <div><h1 className="font-display h-lg">Reports</h1><p className="text-sm text-ash">By check-in date</p></div>
   <div className="report-export noprint">
    {valid&&<a className="pill" href={'/api/reports/export?'+range}>Export CSV</a>}
    <button type="button" className="pill" onClick={()=>print()} disabled={!data}>Print / save PDF</button>
   </div>
  </header>
  <div className="report-controls noprint">
   <div className="report-presets" aria-label="Date presets" role="group">{ranges.map(([label,start,end])=><button key={label} type="button" aria-pressed={from===start&&to===end} onClick={()=>setRange([start,end])}>{label}</button>)}</div>
   <div className="report-dates"><label className="field-stack">From<input type="date" className="fld" value={from} onChange={event=>setRange([event.target.value,to])}/></label>
    <label className="field-stack">To<input type="date" className="fld" min={from} value={to} onChange={event=>setRange([from,event.target.value])}/></label></div>
  </div>

  {error?<p className="mt-5 text-red-700" role="alert">{error}</p>:!data?<LoadingSkeleton label="Loading reports" variant="reports" className="mt-5"/>:
  <>
   <section className="report-statement on-dark" aria-labelledby="report-statement-title">
    <div className="report-statement-lead">
     <h2 id="report-statement-title" className="font-display h-md">Revenue</h2>
     <p className="report-amount">{fmt(totals.revenue)}</p>
     <p className="report-period">{fmtDate(from)} – {fmtDate(to)}</p>
     <p className="report-period">Confirmed and completed bookings</p>
    </div>
    <dl className="report-statement-lines">
     <div><dt>Collected <span>Payments minus refunds</span></dt><dd>{fmt(totals.collected)}</dd></div>
     <div><dt>Still owed <span>Confirmed and completed</span></dt><dd>{fmt(totals.outstanding)}</dd></div>
     <div><dt>Pending value <span>{totals.pending} awaiting downpayment</span></dt><dd>{fmt(totals.pipeline)}</dd></div>
     {totals.fines>0&&<div><dt>Fines and charges</dt><dd>{fmt(totals.fines)}</dd></div>}
    </dl>
   </section>

   <div className="report-analysis">
    <RevenueChart months={data.months}/>
    <section className="report-section" aria-labelledby="report-occupancy">
     <h2 id="report-occupancy" className="font-display h-md">Occupancy</h2>
     <p className="report-occupancy-value">{data.occupancy.pct}%</p>
     <p className="text-sm text-ash">{data.occupancy.bookedNights} of {data.occupancy.availableNights} unit-nights booked</p>
     <dl className="report-ledger">
      <div><dt>Bookings</dt><dd>{totals.bookings}</dd></div>
      <div><dt>Average booking value</dt><dd>{fmt(totals.avgValue)}</dd></div>
      <div><dt>Average stay</dt><dd>{totals.avgNights} nights</dd></div>
      <div><dt>Cancellation rate</dt><dd>{totals.cancelRate}%</dd></div>
     </dl>
    </section>
   </div>

   <section className="report-section report-facilities" aria-labelledby="report-facilities">
    <h2 id="report-facilities" className="font-display h-md">By facility</h2>
    <ul>{data.byType.map(facility=><li key={facility.type}>
     <h3>{facility.name}</h3><dl><div><dt>Revenue</dt><dd>{fmt(facility.revenue)}</dd></div><div><dt>Bookings</dt><dd>{facility.bookings}</dd></div><div><dt>Nights</dt><dd>{facility.nights}</dd></div><div><dt>Occupancy</dt><dd>{facility.occupancy}%</dd></div></dl>
    </li>)}</ul>
   </section>

   <div className="report-activity">
    <section className="report-section" aria-labelledby="report-status">
     <h2 id="report-status" className="font-display h-md">Booking status</h2>
     {totals.bookings?<dl className="report-ledger">{STATUSES.map(status=><div key={status}><dt className="capitalize"><i className="report-status-marker" data-status={status} aria-hidden="true"/>{status}</dt><dd>{totals[status]}</dd></div>)}</dl>:<p className="report-empty">No bookings in this period.</p>}
    </section>
    <section className="report-section" aria-labelledby="report-weekday">
     <h2 id="report-weekday" className="font-display h-md">Check-ins by weekday</h2>
     <dl className="report-weekdays">{data.weekdays.map((count,index)=><div key={DAY[index]}><dt>{DAY[index]}</dt><span aria-hidden="true"><i className="bar" style={{width:100*count/maxCheckIns+'%'}}/></span><dd>{count}</dd></div>)}</dl>
    </section>
    <section className="report-section" aria-labelledby="report-events">
     <h2 id="report-events" className="font-display h-md">Event Hall occasions</h2>
     {Object.keys(data.events).length?<dl className="report-ledger">{Object.entries(data.events).sort((a,b)=>b[1]-a[1]).map(([event,count])=><div key={event}><dt>{event}</dt><dd>{count}</dd></div>)}</dl>:<p className="report-empty">No occasions recorded in this period.</p>}
    </section>
   </div>
  </>}
 </main>;
}
