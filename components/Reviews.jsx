'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
const REVIEW_INTERVAL=5000;
export const Stars=({n,className=''})=><span role="img" aria-label={n+' out of 5 stars'} className={'tracking-[.1em] text-tile '+className}>{'★'.repeat(n)}<span className="text-ink/20">{'★'.repeat(5-n)}</span></span>;
export default function Reviews({reviews=[],rating,count=0}){
 const [index,setIndex]=useState(0);
 const [visible,setVisible]=useState(false),[reducedMotion,setReducedMotion]=useState(true);
 const [paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const carousel=useRef(null);
 const total=reviews.length;
 const current=reviews[index]||reviews[0];
 const move=offset=>setIndex(previous=>(previous+offset+total)%total);
 const autoplay=total>1&&visible&&!reducedMotion&&!paused&&!hovered&&!focused;

 useEffect(()=>{
  if(total<2)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>setReducedMotion(preference.matches);
  sync();
  preference.addEventListener('change',sync);
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.intersectionRatio>=.25),{threshold:.25});
  observer.observe(carousel.current);
  return()=>{
   preference.removeEventListener('change',sync);
   observer.disconnect();
  };
 },[total]);

 useEffect(()=>{
  if(!autoplay)return;
  const timer=setInterval(()=>{
   if(!document.hidden)setIndex(previous=>(previous+1)%total);
  },REVIEW_INTERVAL);
  return()=>clearInterval(timer);
 },[autoplay,index,total]);
 return <section id="reviews" className="bg-fog py-20 md:py-28"><div className="wrap">
  <div ref={carousel} className="review-layout"
   onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}}
   onPointerLeave={event=>{if(event.pointerType==='mouse')setHovered(false);}}
   onFocus={()=>setFocused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
   <div><h2 className="h-sec">Guest notes</h2>
   {rating&&<p className="mt-4 text-ash"><span className="font-display text-5xl text-ink">{rating}</span> / 5 · from {count} verified stay{count===1?"":"s"}</p>}
   {reviews.length>1&&<div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" aria-label="Previous review" onClick={()=>move(-1)} className="review-arrow">←</button><span className="text-sm tabular-nums text-ash">{index+1} / {reviews.length}</span><button type="button" aria-label="Next review" onClick={()=>move(1)} className="review-arrow">→</button>{!reducedMotion&&<button type="button" className="review-playback" onClick={()=>setPaused(value=>!value)}>{paused?'Play':'Pause'} reviews</button>}</div>}</div>
  {current?<div className="review-feature" aria-live={autoplay?'off':'polite'}><figure key={current.id} className="interface-enter min-w-0"><Stars n={current.rating}/><blockquote className="mt-4 break-words font-display text-[clamp(1.7rem,3.6vw,3.15rem)] leading-[1.14]">“{current.text}”</blockquote><figcaption className="mt-7 border-t border-line pt-4 text-ash"><strong className="text-ink">{current.name}</strong> · verified guest</figcaption></figure></div>
  :<p className="max-w-lg text-base text-ash">Be the first to share your stay. After your visit, use your booking reference to leave a review. Only verified guests can write one.</p>}</div>
  <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-10"><a href="#reserve" className="btn">Check availability</a><Link href="/my-booking" className="lnk tap text-base text-tile">Stayed with us? Share your review</Link></div></div></section>}
