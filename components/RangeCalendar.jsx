'use client';
import {useEffect,useRef,useState} from 'react';
import {m,AnimatePresence} from 'framer-motion';
import {today,addDays,nightsBetween,isFree,dateProblem,MAX_ADVANCE_DAYS,MAX_STAY_NIGHTS} from '../lib/rules';
const WD=['Mo','Tu','We','Th','Fr','Sa','Su'],pad=n=>String(n).padStart(2,'0');
export default function RangeCalendar({from,to,onChange,units,busy}){
 const t0=today(),[y0,m0]=t0.split('-').map(Number);
 const [view,setView]=useState(()=>{const [y,mo]=from.split('-').map(Number);return{y,mo:mo-1}});
 useEffect(()=>{const [yy,mm]=from.split('-').map(Number);setView(v=>v.y===yy&&v.mo===mm-1?v:{y:yy,mo:mm-1})},[from]);   // follow dates set from outside (the hero availability check)
 const [picking,setPicking]=useState(false),[hover,setHover]=useState(null),[dir,setDir]=useState(1);
 const rangeFree=(a,b)=>units.some(u=>isFree(u,a,b,busy));
 const nightFull=d=>!rangeFree(d,addDays(d,1));
 const pendingFocus=useRef(null);
 const [focusedDay,setFocusedDay]=useState(null);
 const dis=d=>(!picking||d<=from)
  ?Boolean(dateProblem(d,addDays(d,1),t0))||nightFull(d)
  :Boolean(dateProblem(from,d,t0))||!rangeFree(from,d);
 const pick=d=>{if(!picking||d<=from){onChange(d,addDays(d,1),false);setPicking(true)}else{onChange(from,d,true);setPicking(false);setHover(null)}};
 const end=picking&&hover&&hover>from&&!dis(hover)?hover:to;
 const {y,mo}=view,first=(new Date(y,mo,1).getDay()+6)%7,dim=new Date(y,mo+1,0).getDate();
 const [lastYear,lastMonth]=addDays(t0,MAX_ADVANCE_DAYS+MAX_STAY_NIGHTS).split('-').map(Number);
 const go=n=>{setDir(n);const d=new Date(y,mo+n,1);setView({y:d.getFullYear(),mo:d.getMonth()})};
 // In the current month, leave out weeks that are entirely in the past so the first bookable date is on the first screen.
 const skip=y===y0&&mo===m0-1?Math.floor((first+(+t0.slice(8)-1))/7)*7:0;
 const cells=[...Array(first).fill(null),...Array.from({length:dim},(_,i)=>`${y}-${pad(mo+1)}-${pad(i+1)}`)].slice(skip);
 const lastDay=addDays(t0,MAX_ADVANCE_DAYS+MAX_STAY_NIGHTS);
 const tabDay=[focusedDay,from,t0].find(d=>d&&d>=t0&&d<=lastDay&&cells.includes(d))||cells.find(d=>d&&d>=t0&&d<=lastDay);
 const key=(event,day)=>{
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
  if(!offset)return;
  event.preventDefault();
  const next=addDays(day,offset);
  if(next<t0||next>lastDay)return;
  const target=event.currentTarget.parentElement.querySelector(`[data-d="${next}"]`);
  if(target){target.focus();return}
  const [year,month]=next.split('-').map(Number);
  pendingFocus.current=next;
  setFocusedDay(next);
  setDir(Math.sign(offset));
  setView({y:year,mo:month-1});
 };
 const n=nightsBetween(from,to),nav='h-11 w-11 rounded-md border border-ink/55 bg-surface text-xl transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-surface disabled:hover:text-ink';
 return <div className="reserve-calendar mt-3" onMouseLeave={()=>setHover(null)}>
  <div className="flex items-center justify-between"><button type="button" aria-label="Previous month" disabled={y*12+mo<=y0*12+m0-1} onClick={()=>go(-1)} className={nav}>‹</button>
   <p className="font-display h-md" aria-live="polite">{new Date(y,mo,1).toLocaleDateString('en',{month:'long',year:'numeric'})}</p>
   <button type="button" aria-label="Next month" disabled={y*12+mo>=lastYear*12+lastMonth-1} onClick={()=>go(1)} className={nav}>›</button></div>
  <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-ash">{WD.map(w=><span key={w} className="py-2">{w}</span>)}</div>
  <AnimatePresence mode="wait" initial={false}><m.div key={y+'-'+mo} initial={{opacity:0,x:dir*10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-dir*10}} transition={{duration:.15}} className="grid grid-cols-7">
   {cells.map((d,i)=>{if(!d)return <span key={'b'+i}/>;const off=dis(d),a=d===from,b=d===end,mid=d>from&&d<end;
    return <button key={d} type="button" data-d={d} ref={node=>{
     if(!node||pendingFocus.current!==d)return;
     pendingFocus.current=null;
     node.focus();
    }} tabIndex={d===tabDay?0:-1} onFocus={()=>setFocusedDay(d)} onKeyDown={e=>key(e,d)}
     disabled={d<t0||d>lastDay} aria-disabled={off||undefined} onClick={()=>{if(!off)pick(d)}} onMouseEnter={()=>setHover(d)} aria-pressed={a||b} aria-label={new Date(d+'T00:00').toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}
     className={'h-11 rounded-sm text-sm transition-colors duration-150 '+(a||b?'bg-tile font-semibold text-white ':mid?'bg-tile/15 ':'')+(off?(d<t0?'text-ash/40 ':'text-ash line-through '):!(a||b)?'hover:bg-ink/10 ':'')+(d===t0&&!a&&!b?'font-semibold underline underline-offset-4':'')}>{+d.slice(8)}</button>})}
  </m.div></AnimatePresence>
  <p className="mt-4 text-sm text-ash" aria-live="polite">{picking?'Now choose your check-out date (by 12:00 NN).':`${n} night${n===1?'':'s'} · check-in from 2:00 PM, check-out by 12:00 NN. Tap a date to change.`}</p></div>}
