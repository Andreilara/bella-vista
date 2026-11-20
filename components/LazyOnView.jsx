'use client';
import {useEffect,useRef,useState} from 'react';
/** Renders its children only once the placeholder is about to scroll into view (or `force` is set), so below-the-fold code and its data load later. */
export default function LazyOnView({children,minHeight=720,margin=900,force=false,fallback,onShow}){
 const ref=useRef(null),[on,setOn]=useState(false);
 useEffect(()=>{if(force)setOn(true)},[force]);
 useEffect(()=>{if(on){onShow?.();return}const el=ref.current;if(!el)return;
  if(!('IntersectionObserver' in window)){setOn(true);return}
  const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setOn(true);io.disconnect()}},{rootMargin:`${margin}px 0px`});io.observe(el);return()=>io.disconnect()},[on]);
 return <div ref={ref} style={on?undefined:{minHeight}}>{on?children:fallback}</div>}
