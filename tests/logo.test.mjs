import fs from 'node:fs';import path from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';
const root=path.join(import.meta.dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const svg=f=>{const s=read('public/brand/'+f),[,w,h]=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s)||[];return{s,ratio:w/h}};
const walk=d=>fs.readdirSync(path.join(root,d),{withFileTypes:true}).flatMap(e=>e.name==='node_modules'||e.name==='.next'?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);

test('the logo SVGs are one clean pine path each: no scripts, images or outside references',()=>{
 for(const f of ['logo.svg','logo-mark.svg']){const {s,ratio}=svg(f);
  assert.ok(ratio>1,f+' has a viewBox');assert.equal((s.match(/<path /g)||[]).length,1,f+' is a single path');assert.match(s,/fill-rule="evenodd"/);assert.match(s,/fill="#2a4a36"/);
  assert.doesNotMatch(s,/<script|<image|<foreignObject|href=|xlink|onload|<style/i,f);assert.ok(s.length<100_000,f+' is small')}});

test('the ratios in components/Logo.jsx match the files, so the mask never letterboxes',()=>{
 const src=read('components/Logo.jsx');
 const mark=/MARK=\{url:'\/brand\/logo-mark\.svg',ratio:([\d.]+)\}/.exec(src),full=/FULL=\{url:'\/brand\/logo\.svg',ratio:([\d.]+)\}/.exec(src);
 assert.ok(mark&&full);assert.ok(Math.abs(+mark[1]-svg('logo-mark.svg').ratio)<0.001);assert.ok(Math.abs(+full[1]-svg('logo.svg').ratio)<0.001)});

test('the logo takes its colour from the page: pine by default, sage on dark areas, and an accent can override it',()=>{
 const css=read('app/globals.css');assert.match(css,/:root\{--logo:#2a4a36\}/);assert.match(css,/\.on-dark\{--logo:#a8cdb3\}/);
 const src=read('components/Logo.jsx');assert.match(src,/color:accent\|\|'var\(--logo\)'/);assert.match(src,/bg-current/)});

test('every /brand/ file the code refers to exists, and nothing refers to the retired badge files',()=>{
 const files=[...walk('app'),...walk('components'),...walk('lib')].filter(f=>/\.(jsx?|mjs|css)$/.test(f));
 for(const f of files){const s=read(f);for(const m of s.matchAll(/\/brand\/([\w.-]+\.(?:svg|png))/g))assert.ok(fs.existsSync(path.join(root,'public/brand',m[1])),`${f} refers to missing /brand/${m[1]}`);
  assert.doesNotMatch(s,/logo-badge/,f)}
 for(const old of ['logo-badge.svg','logo-badge.png','logo-badge-light.svg','logo-badge-light.png','logo-badge-paper.svg'])assert.ok(!fs.existsSync(path.join(root,'public/brand',old)),old+' is gone')});

test('icons and the social image are PNGs of the expected size',()=>{
 const dim=p=>{const b=fs.readFileSync(path.join(root,p));assert.equal(b.toString('latin1',1,4),'PNG',p);return[b.readUInt32BE(16),b.readUInt32BE(20)]};
 assert.deepEqual(dim('app/opengraph-image.png'),[1200,630]);assert.deepEqual(dim('app/icon.png'),[512,512]);assert.deepEqual(dim('app/apple-icon.png'),[180,180]);assert.deepEqual(dim('public/brand/social-profile-800.png'),[800,800])});
