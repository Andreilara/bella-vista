import {createContext,useContext,useState} from 'react';
export const StaffCtx=createContext(null);
export const useStaff=()=>useContext(StaffCtx);

// Drafts belong to the authenticated shell and are discarded when its session ends.
export const StaffDraftsCtx=createContext(null);
export function useStaffDraft(key,initial){
 const [drafts,setDrafts]=useContext(StaffDraftsCtx);
 const [fallback]=useState(initial);
 function setDraft(update){
  setDrafts(previous=>({...previous,[key]:update(previous[key]??fallback)}));
 }
 function clearDraft(){
  setDrafts(previous=>{
   if(!Object.hasOwn(previous,key))return previous;
   const next={...previous};
   delete next[key];
   return next;
  });
 }
 return [drafts[key]??fallback,setDraft,clearDraft];
}
