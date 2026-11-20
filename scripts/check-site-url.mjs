// Runs before `npm run build`. A build with the placeholder address would publish wrong canonical links, sitemap, share preview and search data.
import {existsSync} from 'node:fs';
// Next.js reads these files itself, but only after this check; read them the same way (a value already in the environment wins).
for(const f of ['.env.production.local','.env.local','.env.production','.env'])if(existsSync(f)){try{process.loadEnvFile(f)}catch{}}
const host=process.env.VERCEL_PROJECT_PRODUCTION_URL;
const url=process.env.SITE_URL||process.env.NEXT_PUBLIC_SITE_URL||(host?'https://'+host:'');
let ok=false;try{
 const u=new URL(url);
 ok=u.protocol==='https:'&&u.hostname.includes('.')&&!/localhost|^127\.|(?:^|\.)example(?:\.|$)|^yourdomain\./i.test(u.hostname);
}catch{}
if(process.env.VERCEL==='1'&&(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN)){
 console.error('Build stopped: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for this Vercel environment.');
 process.exit(1);
}
if(ok||process.env.ALLOW_PLACEHOLDER_SITE==='1'){if(!ok)console.warn('\n! Building with the placeholder site address (ALLOW_PLACEHOLDER_SITE=1). Do not deploy this build.\n');process.exit(0)}
console.error(`
Build stopped: the site address is not set.

Set NEXT_PUBLIC_SITE_URL to your real address before building, for example:
  NEXT_PUBLIC_SITE_URL=https://yourhotel.com npm run build
(or put it in .env.local; see .env.example).

Only testing locally? Run: ALLOW_PLACEHOLDER_SITE=1 npm run build
`);process.exit(1)
