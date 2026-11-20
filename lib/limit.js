import {createHash} from 'node:crypto';
import {getDb,usesTurso} from './db.js';

const m=new Map();
let nextCleanup=0;
export default function limit(k,max,ms){
 const n=Date.now();
 if(usesTurso()){
  const db=getDb(),key=createHash('sha256').update(k).digest('hex');
  const result=db.prepare(`INSERT INTO rate_limits(key,count,until) VALUES (?,1,?)
   ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE MIN(count+1,?) END,
   until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count`).get(key,n+ms,n,max+1,n);
  if(n>=nextCleanup){
   db.prepare('DELETE FROM rate_limits WHERE until<=?').run(n);
   nextCleanup=n+60000;
  }
  return result.count>max;
 }
 const e=m.get(k);
 if(n>=nextCleanup){for(const [key,item] of m)if(item.t<=n)m.delete(key);nextCleanup=n+60000}
 if(!e||n>=e.t){m.set(k,{n:1,t:n+ms});return false}
 return ++e.n>max;
}
