'use client';

import {useEffect} from 'react';

export default function TouchPress(){
 useEffect(()=>{
  let control=null,pointerId=null;
  function clear(){
   control?.removeAttribute('data-touch-pressed');
   control=null;
   pointerId=null;
  }
  function press(event){
   if(event.pointerType!=='touch'||!event.isPrimary||!(event.target instanceof Element))return;
   clear();
   const target=event.target.closest('button,[role="button"],a.btn,a.pill,a.btn-light,a.btn-ink,a.rooms-details-link,.staff-nav-link');
   if(!target||target.matches(':disabled,[aria-disabled="true"],.reserve-option'))return;
   control=target;
   pointerId=event.pointerId;
   control.setAttribute('data-touch-pressed','');
  }
  function release(event){
   if(event.pointerId===pointerId)clear();
  }
  document.addEventListener('pointerdown',press,true);
  document.addEventListener('pointerup',release,true);
  document.addEventListener('pointercancel',release,true);
  window.addEventListener('blur',clear);
  return ()=>{
   document.removeEventListener('pointerdown',press,true);
   document.removeEventListener('pointerup',release,true);
   document.removeEventListener('pointercancel',release,true);
   window.removeEventListener('blur',clear);
   clear();
  };
 },[]);
 return null;
}
