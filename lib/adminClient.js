// fetch wrapper for staff pages: a 401 (expired session) sends the user back to the login screen.
export async function api(path,opts={}){
 const r=await fetch(path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
 if(typeof window!=='undefined'){if(r.status===401)window.dispatchEvent(new Event('bv:unauth'));else if((opts.method||'GET')!=='GET')window.dispatchEvent(new Event('bv:refresh'))}   // any change by staff refreshes the red dots
 return r}
