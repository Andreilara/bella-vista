'use client';

import {useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {TYPES,fmt} from '../lib/rules';
import Image from 'next/image';
import {LogoMark} from './Logo';

const ROOMS = [
 {
  key: 'std', slug: 'standard-rooms', name: 'Standard Rooms', label: 'Standard',
  description: 'Two guests, three at most. Quiet, elegant and tucked into the hillside. A third guest adds ₱1,000 per night.',
  capacity: '2–3 guests', book: 'Book Standard Rooms',
 },
 {
  key: 'fam', slug: 'family-rooms', name: 'Family Rooms', label: 'Family',
  description: 'Room for four to five, with the full capacity included in one rate. Made for slow mornings together.',
  capacity: '4–5 guests', book: 'Book Family Rooms',
 },
 {
  key: 'hall', slug: 'event-hall', name: 'The Event Hall', label: 'Event Hall',
  description: 'Up to 30 guests at the base rate, and as many as 40 with ₱500 for each guest beyond 30.',
  capacity: '30–40 guests', book: 'Book the Event Hall',
 },
];

const roomAt=index=>ROOMS[(index%ROOMS.length+ROOMS.length)%ROOMS.length];

export default function RoomsShowcase({photos,onBook}){
 const [index,setIndex]=useState(0);
 const [settling,setSettling]=useState(false),[snapBack,setSnapBack]=useState(0);
 const track=useRef(null),gesture=useRef(null),suppressTap=useRef(false);
 const room=roomAt(index);

 useLayoutEffect(()=>{
  const carousel=track.current;
  const center=carousel.querySelector('[data-position="0"]');
  const transitions=[...carousel.getAnimations(),...center.getAnimations()]
   .filter(animation=>animation.transitionProperty==='transform');
  if(!transitions.length){
   setSettling(false);
   return;
  }
  let current=true;
  Promise.allSettled(transitions.map(animation=>animation.finished)).then(()=>{
   if(current)setSettling(false);
  });
  return ()=>{current=false;};
 },[index,snapBack]);

 function move(direction){
  setSettling(true);
  setIndex(current=>current+direction);
 }

 function selectRoom(key){
  if(room.key===key)return;
  move(roomAt(index+1).key===key?1:-1);
 }

 function startSwipe(event){
  if(event.touches.length!==1){
   endSwipe(event);
   return;
  }
  suppressTap.current=false;
  const touch=event.touches[0];
  gesture.current={x:touch.clientX,y:touch.clientY,time:event.timeStamp,horizontal:false};
 }

 function trackSwipe(event){
  const swipe=gesture.current;
  if(!swipe||event.touches.length!==1)return;
  const touch=event.touches[0];
  const distance=touch.clientX-swipe.x;
  if(!swipe.horizontal){
   const vertical=touch.clientY-swipe.y;
   if(Math.max(Math.abs(distance),Math.abs(vertical))<8)return;
   if(Math.abs(vertical)>=Math.abs(distance)){
    gesture.current=null;
    return;
   }
   swipe.horizontal=true;
   swipe.dragLimit=track.current.querySelector('[data-position="0"]').offsetWidth*.9;
   suppressTap.current=true;
   track.current.dataset.dragging='true';
  }
  const offset=Math.sign(distance)*Math.min(Math.abs(distance),swipe.dragLimit);
  track.current.style.transform=`translateX(${offset}px)`;
 }

 function endSwipe(event){
  const swipe=gesture.current;
  gesture.current=null;
  if(!swipe?.horizontal)return;
  delete track.current.dataset.dragging;
  track.current.style.removeProperty('transform');
  const distance=event.changedTouches[0].clientX-swipe.x;
  const quickFlick=Math.abs(distance)>=22&&Math.abs(distance)/Math.max(1,event.timeStamp-swipe.time)>.5;
  if(event.type==='touchend'&&(Math.abs(distance)>=44||quickFlick)){
   move(distance<0?1:-1);
  }else{
   setSettling(true);
   setSnapBack(current=>current+1);
  }
 }

 return <section id="rooms" className="rooms-editorial" aria-labelledby="rooms-title">
  <div className="wrap">
   <header className="rooms-editorial-header">
    <h2 id="rooms-title" className="h-sec">Rooms &amp; Hall</h2>
    <div className="rooms-editorial-controls" role="group" aria-label="Browse rooms and hall">
     <button type="button" onClick={()=>move(-1)} aria-label="Previous room or hall"><span aria-hidden="true" className="rooms-direction"/></button>
     <button type="button" onClick={()=>move(1)} aria-label="Next room or hall"><span aria-hidden="true" className="rooms-direction is-next"/></button>
    </div>
   </header>
   <p className="sr-only" aria-live="polite">{!settling&&room.name}</p>
   <div className="rooms-stage"
    onTouchStart={startSwipe} onTouchMove={trackSwipe} onTouchEnd={endSwipe} onTouchCancel={endSwipe}
    onPointerDown={event=>{if(event.pointerType!=='touch')suppressTap.current=false;}}
    onClickCapture={event=>{if(suppressTap.current&&event.detail>0)event.stopPropagation();}}>
   <ul ref={track} className="rooms-showcase" aria-label="Rooms and event hall">
    {[-2,-1,0,1,2].map(offset=>{
     const slideIndex=index+offset,space=roomAt(slideIndex),photo=photos[space.key];
     const inView=Math.abs(offset)<2,centered=offset===0;
     return <li key={slideIndex} className="rooms-photo" data-position={offset} style={{'--room-position':offset}}
      aria-hidden={!inView||undefined}>
      {photo?<Image src={photo.src} alt="" fill sizes="(min-width:1240px) 810px, (min-width:768px) 68vw, 145vw" quality={86} className="object-cover"/>:<LogoMark className="h-14" decorative/>}
      {inView&&!centered&&<button type="button" aria-label={'Bring into view: '+space.name}
       onClick={()=>move(offset)}/>}
     </li>;
    })}
   </ul>
   {!settling&&<h3 key={room.key} className="rooms-photo-title">{room.name}</h3>}
   </div>
   <div className="rooms-picker" role="group" aria-label="Choose a room or hall">
    {ROOMS.map(space=><button key={space.key} type="button"
     aria-current={space.key===room.key?true:undefined} aria-controls="rooms-photo-details"
     onClick={()=>selectRoom(space.key)}>{space.label}</button>)}
   </div>
   <div id="rooms-photo-details" data-settling={settling} className="rooms-photo-details">
    <div><p className="rooms-photo-description">{room.description}</p>
     <p className="rooms-photo-facts">{room.capacity} <span aria-hidden="true">·</span> {fmt(TYPES[room.key].rate)} per night</p></div>
     <div className="rooms-photo-links"><Link className="rooms-details-link" href={'/rooms/'+room.slug}>View full details</Link>
      <a className="rooms-book-link" href="#reserve" onClick={event=>onBook(event,room.key)}>{room.book}</a></div>
   </div>
  </div>
 </section>;
}
