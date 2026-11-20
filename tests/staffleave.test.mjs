import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {shouldClearStaffCookie,isPrefetch,STAFF_COOKIE} from '../lib/staffLeave.js';
const H=o=>({get:k=>o[k]??null});
test('visiting a guest page clears a staff session',()=>{assert.equal(shouldClearStaffCookie({hasCookie:true,headers:H({})}),true);assert.equal(shouldClearStaffCookie({hasCookie:false,headers:H({})}),false)});
test('link prefetches never sign staff out',()=>{
 for(const h of [{'next-router-prefetch':'1'},{purpose:'prefetch'},{'x-middleware-prefetch':'1'}]){assert.equal(isPrefetch(H(h)),true);assert.equal(shouldClearStaffCookie({hasCookie:true,headers:H(h)}),false)}
 assert.equal(isPrefetch(H({rsc:'1'})),false)});            // a real soft navigation (RSC request without the prefetch header) does count
test('the middleware cookie name matches the one the login sets',()=>{
 assert.equal(STAFF_COOKIE,'bv_admin');assert.match(fs.readFileSync('lib/auth.js','utf8'),/COOKIE='bv_admin'/)});
test('middleware matcher: guest pages yes; staff area, API, assets and files no',()=>{
 const src=fs.readFileSync('proxy.js','utf8'),m=src.match(/matcher:\['([^']+)'\]/)[1].replace(/\\\\/g,'\\'),re=new RegExp('^'+m+'$');
 for(const p of ['/','/terms','/privacy','/my-booking','/voucher/BV-1A2B3C4D','/rooms/standard-rooms','/rooms/event-hall','/opengraph-image'])assert.ok(re.test(p),'should match '+p);
 for(const p of ['/admin','/admin/reports','/admin/staff','/api/admin','/api/bookings','/_next/static/chunks/a.js','/_next/image','/logo.svg','/gallery/rooms-a.jpg','/sitemap.xml','/robots.txt','/icon.svg'])assert.ok(!re.test(p),'should NOT match '+p)});
