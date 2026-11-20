import {isDateKey,today} from './rules.js';
/** Read ?from&to from a URL, defaulting to the current calendar year; caps the span at 5 years. */
export function rangeFrom(url){const p=new URL(url).searchParams,y=today().slice(0,4);let from=isDateKey(p.get('from'))?p.get('from'):y+'-01-01',to=isDateKey(p.get('to'))?p.get('to'):y+'-12-31';
 if(from>to)[from,to]=[to,from];if(Date.parse(to)-Date.parse(from)>5*366*864e5)from=new Date(Date.parse(to)-5*365*864e5).toISOString().slice(0,10);return{from,to}}
