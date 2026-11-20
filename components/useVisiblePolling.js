'use client';

import {useEffect} from 'react';

export default function useVisiblePolling(refresh, interval) {
 useEffect(() => {
  let active = true;
  let pending = false;
  let timer;

  async function poll() {
   clearTimeout(timer);
   if (!active || pending || document.hidden) return;
   pending = true;
   try {
    await refresh();
   } finally {
    pending = false;
    if (active && !document.hidden) timer = setTimeout(poll, interval);
   }
  }

  document.addEventListener('visibilitychange', poll);
  poll();
  return () => {
   active = false;
   clearTimeout(timer);
   document.removeEventListener('visibilitychange', poll);
  };
 }, [refresh, interval]);
}
