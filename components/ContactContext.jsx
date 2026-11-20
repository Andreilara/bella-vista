'use client';
import {createContext,useContext} from 'react';
// The hotel's contact and payment details, read from the database in the root layout and shared with every client component.
const Ctx=createContext({phone:'',email:'',address:'',payments:[]});
export const ContactProvider=({value,children})=><Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useContact=()=>useContext(Ctx);
