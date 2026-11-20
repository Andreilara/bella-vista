import {SITE} from '../lib/site';
export const dynamic='force-dynamic';   // read the site address when the server runs, not when it was built
export default function robots(){return{rules:[{userAgent:'*',allow:'/',disallow:['/admin','/api/','/voucher/']}],sitemap:SITE+'/sitemap.xml'}}
