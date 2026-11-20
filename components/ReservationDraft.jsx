'use client';

import {createContext,useContext,useRef,useState} from 'react';

const ReservationDraftContext=createContext(null);

export function ReservationDraftProvider({children}){
 const draft=useRef(null);
 const lookup=useRef(null);
 const [submission,setSubmission]=useState(null);
 const pending=useRef(false);
 return <ReservationDraftContext.Provider value={{draft,lookup,submission,setSubmission,pending}}>{children}</ReservationDraftContext.Provider>;
}

export const useReservationDraft=()=>useContext(ReservationDraftContext);
