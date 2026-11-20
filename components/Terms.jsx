'use client';
import {useRef} from 'react';
import {m,AnimatePresence} from 'framer-motion';
import useFocusTrap from './useFocusTrap';
import T from '../lib/terms';
export default function Terms({open,onClose}){
 const ref=useRef(null);useFocusTrap(ref,open,{onEscape:onClose});
 return <AnimatePresence>{open&&<m.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Terms and Conditions" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-5" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}} onClick={onClose}>
  <m.div onClick={e=>e.stopPropagation()} className="max-h-[85dvh] w-full max-w-xl overflow-auto rounded-md bg-surface p-6 text-ink md:p-10" initial={{y:12,opacity:0}} animate={{y:0,opacity:1}} exit={{y:8,opacity:0}} transition={{duration:.2}}>
   <p className="text-sm text-ash">Please read</p><h3 className="mt-1 font-display h-lg">Terms &amp; Conditions</h3>
   <ol className="mt-6 space-y-5">{T.map((t,i)=><li key={i} className="grid grid-cols-[2rem_1fr]"><span className="font-display text-tile">{i+1}</span><div><b className="font-semibold">{t[0]}</b><p className="mt-1 text-sm text-ash">{t[1]}</p></div></li>)}</ol>
   <button onClick={onClose} className="btn mt-8">Close</button></m.div></m.div>}</AnimatePresence>}
