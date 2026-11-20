const YEAR=60*60*24*365;
const PROD=process.env.NODE_ENV==='production';
// Security headers for every page. The policy allows only this site's own scripts, styles, images and fonts (Next.js needs inline scripts and styles, so 'unsafe-inline' stays), and forbids framing, so the staff sign-in cannot be embedded in another site.
// It is switched on for the production build only: `next dev` needs eval and websockets.
const CSP=["default-src 'self'","script-src 'self' 'unsafe-inline'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self'","connect-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
const SECURITY=[{key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'},{key:'Cross-Origin-Opener-Policy',value:'same-origin'},...(PROD?[{key:'Content-Security-Policy',value:CSP},{key:'Strict-Transport-Security',value:'max-age=15552000'}]:[])];
export default{
 reactStrictMode:true,poweredByHeader:false,compress:true,
 // Gallery photos are resized and served as AVIF/WebP automatically (install sharp for the fastest conversion).
 serverExternalPackages:['libsql'],
 outputFileTracingExcludes:{'/*':['./data/**','./.env*','./.vercel/**','./.next/npm-audit-cache/**']},
 images:{formats:['image/avif','image/webp'],deviceSizes:[640,828,1080,1280,1600,1920],qualities:[50,74,75,76,82,84,85,86,88,90,92],minimumCacheTTL:60*60*24*30},
 async headers(){return[
  {source:'/:path*',headers:SECURITY},
  {source:'/fonts/:path*',headers:[{key:'Cache-Control',value:`public, max-age=${YEAR}, immutable`}]},
  {source:'/brand/:path*',headers:[{key:'Cache-Control',value:'public, max-age=604800, stale-while-revalidate=2592000'}]},
  {source:'/gallery/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, stale-while-revalidate=604800'}]}]}};
