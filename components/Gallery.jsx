'use client';
import {useCallback,useEffect,useRef,useState} from 'react';import Image from 'next/image';import useFocusTrap from './useFocusTrap';
const FEATURED=['firepit-lounge','garden-lawn-ceremony','field-house-celebration'];
const ALT=' at Bella Vista Hotel & Events Place';
const Icon=({d,size=22})=><svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const CLOSE='M6 6l12 12M18 6L6 18',PREV='M15 5l-7 7 7 7',NEXT='M9 5l7 7-7 7',EXPAND='M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7';
export default function Gallery({photos=[]}){
 const [open,setOpen]=useState(null);
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(false);
 const back=useRef(null),touch=useRef(null),dlg=useRef(null),desktop=useRef(null);
 const total=photos.length,viewerOpen=open!==null;
 const columnCount=total>=6?3:total>=2?2:1,looping=total>=4;
 const columns=Array.from({length:columnCount},()=>[]);
 photos.forEach((photo,index)=>columns[index%columnCount].push({photo,index}));
 const featured=FEATURED.map(name=>photos.findIndex(photo=>photo.src==='/experience/'+name+'.webp')).filter(index=>index>=0);
 const preview=[...new Set([...featured,...photos.keys()])].slice(0,3);

 function openPhoto(event,index,copy=false){
  back.current=copy?desktop.current?.querySelector('[data-photo="'+index+'"]'):event.currentTarget;
  setOpen(index);
 }

 function startSwipe(event){
  touch.current=event.touches.length===1?event.touches[0]:null;
 }

 function endSwipe(event){
  const start=touch.current;
  touch.current=null;
  if(!start||event.touches.length||total<2)return;
  const end=event.changedTouches[0];
  const dx=end.clientX-start.clientX,dy=end.clientY-start.clientY;
  if(Math.abs(dx)>Math.max(50,Math.abs(dy)))step(dx<0?1:-1);
 }

 const close=useCallback(()=>{
  setOpen(null);
  requestAnimationFrame(()=>back.current?.focus({preventScroll:true}));
 },[]);
 const step=useCallback(direction=>setOpen(index=>index===null?null:(index+direction+total)%total),[total]);

 useEffect(()=>{
  if(!desktop.current||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));
  observer.observe(desktop.current);
  return()=>observer.disconnect();
 },[total]);


 useEffect(()=>{
  if(!viewerOpen)return;
  const onKeyDown=event=>{
   if(event.key==='Escape')close();
   else if(event.key==='ArrowRight')step(1);
   else if(event.key==='ArrowLeft')step(-1);
  };
  const root=document.documentElement,previousOverflow=root.style.overflow;
  root.style.overflow='hidden';
  window.addEventListener('keydown',onKeyDown);
  return()=>{
   window.removeEventListener('keydown',onKeyDown);
   root.style.overflow=previousOverflow;
  };
 },[viewerOpen,close,step]);

 useEffect(()=>{
  if(open!==null)document.getElementById('gv-t'+open)?.scrollIntoView({inline:'center',block:'nearest'});
 },[open]);
 useFocusTrap(dlg,viewerOpen,{restore:false});
 if(!photos.length)return null;
 const cur=open!==null?photos[open]:null;
 return <section id="gallery" className="gallery-section on-dark py-20 md:py-28"><div className="wrap">
  <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4"><h2 className="h-sec">Gallery</h2>
   <p className="gallery-description max-w-xs text-base">A look around the house, the rooms and the grounds. {photos.length>1?photos.length+' photographs.':''}</p></div>
  <div className="md:hidden">
  <div className="gallery-preview mt-8">
   {preview.map((index,position)=>{
    const photo=photos[index];
    return <button key={photo.src} type="button" className="gallery-preview-item group" onClick={event=>openPhoto(event,index)} aria-label={photo.title+', open larger photo'}>
     <span className="gallery-photo">
      <Image src={photo.src} alt="" fill sizes={position===0?'100vw':'65vw'} quality={85} className="object-cover"/>
      <span className="gallery-expand" aria-hidden="true"><Icon d={EXPAND} size={18}/></span>
     </span>
     <span className="gallery-photo-title">{photo.title}</span>
    </button>;
   })}
  </div>
  <div className="mt-7"><button className="btn" type="button" onClick={event=>openPhoto(event,preview[0])}>View all photos</button></div>
  </div>
  <div className="hidden md:block">
   <div className="mt-6 flex flex-wrap items-center gap-3">
    <button className="btn" type="button" onClick={event=>openPhoto(event,0)}>View all photos</button>
    {looping&&<button className="pill gallery-motion-control" type="button" onClick={()=>setPaused(value=>!value)}>{paused?'Play gallery':'Pause gallery'}</button>}
   </div>
   <div ref={desktop} className="gallery-desktop mt-8" data-loop={looping} data-playing={visible&&!paused&&!viewerOpen} style={{'--columns':columnCount}}>
    {columns.map((items,column)=><div key={column} className="gallery-track">
     {(looping?[false,true]:[false]).map(copy=><div key={String(copy)} className="gallery-strip" data-copy={copy} aria-hidden={copy||undefined}>
      {items.map(({photo,index})=><button key={photo.src} type="button" tabIndex={copy?-1:0} data-photo={copy?undefined:index} className="gallery-photo group" onClick={event=>openPhoto(event,index,copy)} aria-label={photo.title+', open larger photo'}>
       <Image src={photo.src} alt="" fill sizes="(min-width:1440px) 640px, (min-width:1024px) 46vw, 480px" quality={85} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"/>
       <span className="gallery-photo-title">{photo.title}</span>
       <span className="gallery-expand" aria-hidden="true"><Icon d={EXPAND} size={18}/></span>
      </button>)}
     </div>)}
    </div>)}
   </div>
  </div>
  {cur&&<div ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-label={cur.title+', photo viewer'} className="on-dark menu-in fixed inset-0 z-[60] grid grid-rows-[auto_minmax(0,1fr)_auto] bg-night text-paper" onClick={close}>
   <div onClick={e=>e.stopPropagation()} className="mx-auto flex w-full max-w-[87.5rem] items-start justify-between gap-4 px-4 pb-2 pt-[max(.75rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
    <p aria-live="polite" className="min-w-0"><span className="block truncate font-display h-sm">{cur.title}</span><span className="mt-0.5 block text-sm text-paper/75">{cur.cat&&cur.cat!=='Gallery'&&cur.cat!==cur.title?cur.cat+' · ':''}{open+1} of {photos.length}</span></p>
    <button autoFocus onClick={e=>{e.stopPropagation();close()}} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-paper/40 text-paper transition-colors hover:bg-paper hover:text-night"><Icon d={CLOSE}/></button></div>
   <div onClick={e=>e.stopPropagation()} onTouchStart={startSwipe} onTouchEnd={endSwipe} onTouchCancel={()=>{touch.current=null}} className="relative mx-auto min-h-0 w-full max-w-[87.5rem] touch-pan-y">
    <div className="absolute inset-y-0 inset-x-0 md:inset-x-24"><Image key={cur.src} src={cur.src} alt={cur.alt??cur.title+ALT} fill sizes="(min-width:1400px) 1208px, (min-width:768px) calc(100vw - 192px), 100vw" quality={92} priority className="menu-in object-contain"/></div>
    {photos.length>1&&<><button onClick={e=>{e.stopPropagation();step(-1)}} aria-label="Previous photo" className="gallery-viewer-arrow absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-paper/40 text-paper transition-colors hover:bg-paper hover:text-night md:left-8 md:h-12 md:w-12"><Icon d={PREV}/></button>
     <button onClick={e=>{e.stopPropagation();step(1)}} aria-label="Next photo" className="gallery-viewer-arrow absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-paper/40 text-paper transition-colors hover:bg-paper hover:text-night md:right-8 md:h-12 md:w-12"><Icon d={NEXT}/></button></>}</div>
   {photos.length>1&&<ul onClick={e=>e.stopPropagation()} aria-label="All photos" className="flex w-full gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-6 [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto">
    {photos.map((p,i)=><li key={p.src} className="shrink-0"><button id={'gv-t'+i} onClick={()=>setOpen(i)} aria-label={'Show '+p.title} aria-current={i===open?'true':undefined} className={'relative block h-14 w-[4.5rem] overflow-hidden bg-paper/10 transition-opacity duration-200 md:h-16 md:w-24 '+(i===open?'opacity-100 outline outline-2 outline-offset-2 outline-paper':'opacity-50 hover:opacity-100')}><Image src={p.src} alt="" fill sizes="96px" quality={50} className="object-cover"/></button></li>)}</ul>}
  </div>}</div></section>}
