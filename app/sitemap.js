import {SITE,PAGES} from '../lib/site';
export const dynamic='force-dynamic';   // read the site address when the server runs, not when it was built
export default function sitemap(){const now=new Date();return[{url:SITE,lastModified:now,changeFrequency:'weekly',priority:1},...PAGES.map(p=>({url:SITE+'/rooms/'+p.slug,lastModified:now,changeFrequency:'monthly',priority:.8})),{url:SITE+'/privacy',lastModified:now,changeFrequency:'yearly',priority:.3},{url:SITE+'/terms',lastModified:now,changeFrequency:'yearly',priority:.3}]}
