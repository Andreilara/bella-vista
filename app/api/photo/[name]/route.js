import fs from 'node:fs';import {photoFile} from '../../../../lib/gallery.js';
export const dynamic='force-dynamic';
// Serves uploaded gallery photos. Names are random and never reused, so browsers and the image optimiser may cache them for a year.
export async function GET(_req,{params}){
 const f=photoFile((await params).name);if(!f)return new Response('Not found',{status:404});
 return new Response(fs.readFileSync(f.file),{headers:{'Content-Type':f.type,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}})}
