'use client';
export default function PrintButton({children='Print / save as PDF'}){return <button onClick={()=>print()} className="btn">{children}</button>}
