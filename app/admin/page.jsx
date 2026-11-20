'use client';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import useVisiblePolling from '../../components/useVisiblePolling';
import {AnimatePresence,motion,useReducedMotion} from "framer-motion";
import {useCallback,useEffect,useRef,useState} from 'react';import Link from 'next/link';
import {fmtDate} from '../../lib/format.js';
import {TYPES,fmt,today,expired,live as liveBookings} from '../../lib/rules.js';import {api} from '../../lib/adminClient.js';import {useStaff} from '../../components/StaffContext';import BookingPanel from '../../components/BookingPanel';import useFocusTrap from '../../components/useFocusTrap';
const C={pending:'bg-amber-100 text-amber-900',confirmed:'bg-emerald-100 text-emerald-900',cancelled:'bg-red-100 text-red-900',completed:'bg-sky-100 text-sky-900',expired:'bg-ink/10 text-ash'};
export default function Dashboard(){
 const reduceMotion=useReducedMotion();
 const me=useStaff(),[data,setData]=useState(null),[q,setQ]=useState(''),[st,setSt]=useState('all'),[open,setOpen]=useState(null),dlg=useRef(null);
 const [loadError,setLoadError]=useState(false),[lastUpdated,setLastUpdated]=useState(null);
 useFocusTrap(dlg,!!open,{onEscape:()=>setOpen(null)});
 const load=useCallback(async()=>{try{
   const response=await api('/api/bookings?all=1');
   if(!response.ok)throw Error();
   setData(await response.json());
   setLastUpdated(new Date());
   setLoadError(false);
  }catch{setLoadError(true)}},[]);
 useEffect(()=>{const ref=new URLSearchParams(location.search).get('ref');if(ref)setQ(ref); // a voucher's QR code opens /admin?ref=BV-XXXX
 },[]);
 useVisiblePolling(load,5000);
 const loadWarning=loadError&&<div className="my-4 flex flex-wrap items-center gap-3 text-sm">
  <p role="alert">{data?'Could not refresh bookings. Last updated at '+lastUpdated?.toLocaleTimeString()+'.':'Could not load bookings.'}</p>
  <button type="button" className="pill" onClick={load}>Retry</button>
 </div>;
 if(!data&&loadError)return <main className="staff-page"><h1 className="font-display h-lg">Dashboard</h1>{loadWarning}</main>;
 if(!data)return <LoadingSkeleton label="Loading dashboard" className="mx-auto max-w-6xl p-6 md:p-12"/>;
 const rows=data.bookings,money=data.money,t=today(),live=liveBookings(rows),stat=b=>expired(b)?'expired':b.status;
 const groupSizes=new Map();
 for(const booking of rows)groupSizes.set(booking.group,(groupSizes.get(booking.group)||0)+1);
 const paidOf=b=>b.id===b.group?(money[b.group]?.paid||0):null,refundDue=b=>b.id===b.group&&b.status==='cancelled'&&b.refundable===true&&paidOf(b)>0;
 const rev=k=>rows.filter(b=>['confirmed','completed'].includes(b.status)&&(!k||b.type===k)).reduce((s,b)=>s+b.total,0);
 const arrivals=live.filter(b=>b.in===t).length,departures=live.filter(b=>b.out===t).length,needle=q.trim().toLowerCase(),refunds=rows.filter(refundDue);
 const shown=[...rows].filter(b=>(st==='all'||(st==='refund due'?refundDue(b):stat(b)===st))&&(!needle||[b.id,b.group,b.name,b.email,b.phone,b.unit,b.event].join(' ').toLowerCase().includes(needle))).sort((a,b)=>b.at-a.at);
 const inUse=new Map();
 for(const booking of live){
  if(booking.in<=t&&t<booking.out&&!inUse.has(booking.unit))inUse.set(booking.unit,booking);
 }
 const available=Object.values(TYPES).reduce((count,type)=>count+type.units.filter(unit=>!inUse.has(unit)).length,0);
 const pending=rows.filter(booking=>stat(booking)==="pending").length;
 const filter=status=>{setSt(status);document.getElementById("reservation-queue")?.scrollIntoView({block:"start"})};
 return <main className="staff-page desk-page">{loadWarning}
  <header className="desk-header"><div><h1 className="font-display h-lg">Dashboard</h1><p className="text-sm text-ash">{fmtDate(t)}</p></div><Link href="/admin/new" className="btn">New booking</Link></header>
  <div className="desk-overview">
   <section className="desk-shift on-dark" aria-labelledby="shift-heading">
    <h2 id="shift-heading" className="font-display h-md">Today at Bella Vista</h2>
    <dl>{[["Check-ins",arrivals],["Check-outs",departures],["Available units",available]].map(([label,count])=><div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
    <div className="desk-followups"><button type="button" onClick={()=>filter("pending")}><span>Pending reservations</span><strong>{pending}</strong></button>
     {refunds.length>0&&<button type="button" onClick={()=>filter("refund due")}><span>Refunds due ({refunds.length})</span><strong>{fmt(refunds.reduce((sum, booking)=>sum+paidOf(booking),0))}</strong></button>}</div>
   </section>
   <section className="desk-register staff-panel" aria-labelledby="room-register-heading">
    <h2 id="room-register-heading" className="font-display h-md">Room register</h2>
    <ul>{Object.values(TYPES).map(type=><li className="desk-room-group" key={type.name}><h3>{type.name}</h3><ul>{type.units.map(unit=>{
     const booking=inUse.get(unit),status=booking?.status==="pending"?"Pending":booking?"Occupied":"Available";
     return <li key={unit}><div className="desk-unit">{booking?<button type="button" onClick={()=>setOpen(booking.id)} aria-label={"Manage booking for "+unit}>{unit}</button>:<span>{unit}</span>}<span className="desk-unit-status" data-state={status.toLowerCase()}>{status}</span></div></li>;
    })}</ul></li>)}</ul>
   </section>
  </div>
  <section id="reservation-queue" className="desk-queue" aria-labelledby="reservation-queue-heading">
   <div className="desk-queue-heading"><h2 id="reservation-queue-heading" className="font-display h-md">Reservations <span className="text-base text-ash">({shown.length})</span></h2>
    <div className="desk-filters"><label className="field-stack">Search reservations<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Reference, guest, or unit" className="fld text-sm"/></label>
     <label className="field-stack">Status<select value={st} onChange={e=>setSt(e.target.value)} className="fld text-sm">{["all","pending","confirmed","completed","cancelled","expired","refund due"].map(status=><option key={status} value={status}>{status==="all"?"All statuses":status}</option>)}</select></label></div></div>
  <ul className="mt-4 space-y-3 md:hidden">{shown.map(b=>{const s=stat(b),n=groupSizes.get(b.group),paid=paidOf(b);return <li key={b.id} className={'rounded-md border border-line bg-surface p-4 '+(needle&&needle===b.id.toLowerCase()?'bg-tile/10':'')}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{b.id}{b.source!=='online'&&<span className="ml-2 rounded-md border border-tile/40 px-2 py-0.5 text-[.7rem] font-normal text-tile">{b.source}</span>}{n>1&&<span className="ml-2 rounded-md border border-ink/55 px-2 py-0.5 text-[.7rem] font-normal text-ash">package · {n}</span>}</p><p className="mt-1 text-lg leading-tight">{b.name}</p></div>
     <span className={'shrink-0 rounded-md px-3 py-1 text-xs '+C[s]}>{s}</span></div>
    <p className="mt-2 text-sm text-ash">{b.unit} · {b.in} to {b.out} · {b.guests} guest{b.guests===1?'':'s'}</p>
    <p className="mt-1 text-sm">{fmt(b.total)}{paid!==null&&<span className={paid>0?' text-emerald-800':' text-ash'}> · paid {fmt(paid)}</span>}{refundDue(b)&&<span className="text-amber-800"> · refund due</span>}</p>
    {(b.event||b.notes)&&<p className="mt-2 text-sm text-tile">{b.event&&<b className="font-medium">{b.event}. </b>}{b.notes}</p>}
    <p className="mt-1 break-all text-xs text-ash">{[b.email,b.phone].filter(Boolean).join(' · ')}</p>
    <button onClick={()=>setOpen(b.id)} className="mt-3 min-h-11 w-full rounded-md border border-ink/55 text-sm hover:bg-ink hover:text-paper">Manage booking</button></li>})}
   {!shown.length&&<li className="rounded-md border border-line bg-surface p-8 text-center text-ash">{rows.length?'No reservations match.':'No reservations yet.'}</li>}</ul>
  <div className="staff-table mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[53.75rem] text-left text-sm"><thead className="text-ash"><tr>{['Ref','Guest','Unit','Stay','Pax','Total / paid','Status',''].map(h=><th key={h} className="p-3 font-normal">{h||<span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>
   {shown.map(b=>{const s=stat(b),n=groupSizes.get(b.group),paid=paidOf(b);return <tr key={b.id} className={'border-t border-line '+(needle&&needle===b.id.toLowerCase()?'bg-tile/10':'')}><td className="p-3 font-medium">{b.id}{b.source!=='online'&&<span className="ml-2 rounded-md border border-tile/40 px-2 py-0.5 text-[.65rem] font-normal text-tile">{b.source}</span>}{n>1&&<span className="ml-2 rounded-md border border-ink/55 px-2 py-0.5 text-[.65rem] font-normal text-ash" title="Event package: actions apply to every unit in it">package · {n}</span>}</td>
    <td className="p-3">{b.name}<br/><span className="text-xs text-ash">{[b.email,b.phone].filter(Boolean).join(' · ')}</span>{(b.event||b.notes)&&<p className="mt-1 max-w-xs text-xs text-tile">{b.event&&<b className="font-medium">{b.event}. </b>}{b.notes}</p>}</td>
    <td className="p-3">{b.unit}</td><td className="p-3">{b.in} to {b.out}</td><td className="p-3">{b.guests}</td><td className="p-3">{fmt(b.total)}{paid!==null&&<span className={'block text-xs '+(paid>0?'text-emerald-800':'text-ash')}>paid {fmt(paid)}</span>}</td>
    <td className="p-3"><span className={'rounded-md px-3 py-1 text-xs '+C[s]}>{s}</span>{refundDue(b)&&<span className="mt-1 block text-xs text-amber-800">refund due</span>}</td>
    <td className="p-3"><button onClick={()=>setOpen(b.id)} className="rounded-md border border-ink/55 px-4 py-1.5 text-xs hover:bg-ink hover:text-paper">Manage</button></td></tr>})}
   {!shown.length&&<tr><td colSpan={8} className="p-8 text-center text-ash">{rows.length?'No reservations match.':'No reservations yet.'}</td></tr>}</tbody></table></div></section>
  {me.role==="admin"&&<section className="desk-revenue staff-panel" aria-labelledby="desk-revenue-heading"><div><h2 id="desk-revenue-heading" className="font-display h-md">Revenue by facility</h2><p className="mt-1 text-xl font-semibold tabular-nums">{fmt(rev())}</p><p className="text-sm text-ash">Confirmed and completed bookings</p></div><dl>{Object.entries(TYPES).map(([key,type])=><div key={key}><dt>{type.name}</dt><dd>{fmt(rev(key))}</dd></div>)}</dl></section>}
  <AnimatePresence>{open&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduceMotion?0:.18}} ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Manage booking" className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 md:p-4" onClick={()=>setOpen(null)}><motion.div initial={{y:reduceMotion?0:8}} animate={{y:0}} transition={{duration:reduceMotion?0:.2,ease:[.22,.61,.36,1]}} onClick={e=>e.stopPropagation()} className="mx-auto min-h-full max-w-3xl border-line bg-paper md:my-8 md:min-h-0 md:border"><BookingPanel id={open} onChange={load} onClose={()=>setOpen(null)}/></motion.div></motion.div>}</AnimatePresence></main>}
