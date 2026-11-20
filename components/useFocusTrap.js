'use client';
import {useEffect} from 'react';
const SEL='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const tabbables=root=>[...root.querySelectorAll(SEL)].filter(e=>e.getClientRects().length);
/**
 * Keyboard handling for a modal dialog: moves focus in when it opens, keeps Tab/Shift+Tab inside it,
 * closes on Escape, and (unless restore:false) hands focus back to whatever opened it.
 */
export default function useFocusTrap(ref,active,{onEscape,restore=true}={}){
 useEffect(()=>{
  if(!active)return;const root=ref.current;if(!root)return;const opener=document.activeElement;
  if(!root.contains(document.activeElement)){(tabbables(root)[0]||root).focus({preventScroll:true})}
  const key=e=>{
   if(e.key==='Escape'){if(onEscape){e.stopPropagation();onEscape()}return}
   if(e.key!=='Tab')return;
   const f=tabbables(root);if(!f.length){e.preventDefault();root.focus();return}
   const a=document.activeElement,first=f[0],last=f[f.length-1];
   if(e.shiftKey&&(a===first||!root.contains(a))){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&(a===last||!root.contains(a))){e.preventDefault();first.focus()}};
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);if(restore&&opener&&opener.isConnected&&opener!==document.body)opener.focus({preventScroll:true})};
 },[active]);   // eslint-disable-line react-hooks/exhaustive-deps
}
