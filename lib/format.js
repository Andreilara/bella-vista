export const fmtDate=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-PH',{weekday:'short',year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
export const fmtShort=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-PH',{month:'short',day:'numeric',timeZone:'UTC'});
export const fmtStamp=ms=>new Date(ms).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'});
