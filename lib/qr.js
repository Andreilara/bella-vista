// Tiny dependency-free QR encoder: byte mode, error-correction level M, versions 1-10 (up to ~213 characters).
const EC=[0,10,16,26,18,24,16,18,22,22,26],NB=[0,1,1,1,2,2,4,4,4,5,5];
const ALIGN=[[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
{let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]}
const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
function rsRem(data,n){let g=[1];for(let i=0;i<n;i++){const t=new Array(g.length+1).fill(0);g.forEach((c,j)=>{t[j]^=c;t[j+1]^=mul(c,EXP[i])});g=t}
 const r=new Array(n).fill(0);for(const b of data){const f=b^r.shift();r.push(0);for(let i=0;i<n;i++)r[i]^=mul(g[i+1],f)}return r}
const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];

export function qrMatrix(text){
 const data=[...Buffer.from(String(text),'utf8')],cc=v=>v<10?8:16;let v=1;
 for(;v<=10;v++)if(4+cc(v)+8*data.length<=(Math.floor(raw(v)/8)-EC[v]*NB[v])*8)break;
 if(v>10)throw new Error('Text too long for QR code');
 const total=Math.floor(raw(v)/8),ec=EC[v],nb=NB[v],dcw=total-ec*nb,bits=[],put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
 put(4,4);put(data.length,cc(v));data.forEach(b=>put(b,8));put(0,Math.min(4,dcw*8-bits.length));while(bits.length%8)bits.push(0);
 for(let p=0xEC;bits.length<dcw*8;p^=0xEC^0x11)put(p,8);
 const cw=[];for(let i=0;i<bits.length;i+=8)cw.push(parseInt(bits.slice(i,i+8).join(''),2));
 const short=nb-total%nb,sl=Math.floor(total/nb)-ec,blocks=[];let k=0;
 for(let i=0;i<nb;i++){const d=cw.slice(k,k+sl+(i<short?0:1));k+=d.length;blocks.push({d,e:rsRem(d,ec)})}
 const out=[];for(let i=0;i<=sl;i++)blocks.forEach(b=>{if(i<b.d.length)out.push(b.d[i])});for(let i=0;i<ec;i++)blocks.forEach(b=>out.push(b.e[i]));

 const n=v*4+17,mk=()=>Array.from({length:n},()=>new Array(n).fill(0)),base=mk(),F=mk();
 const fn=(x,y,dark)=>{if(x>=0&&y>=0&&x<n&&y<n){base[y][x]=dark?1:0;F[y][x]=1}};
 for(let i=0;i<n;i++){fn(6,i,i%2===0);fn(i,6,i%2===0)}
 for(const[cx,cy]of[[3,3],[n-4,3],[3,n-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));fn(cx+dx,cy+dy,d!==2&&d!==4)}
 const al=ALIGN[v],last=al.length-1;
 al.forEach((ax,i)=>al.forEach((ay,j)=>{if((i===0&&j===0)||(i===0&&j===last)||(i===last&&j===0))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)fn(ax+dx,ay+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
 const fmt=(m,mask)=>{let r=mask;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((mask<<10)|r)^0x5412,s=(x,y,i)=>{m[y][x]=(b>>>i)&1};
  for(let i=0;i<=5;i++)s(8,i,i);s(8,7,6);s(8,8,7);s(7,8,8);for(let i=9;i<15;i++)s(14-i,8,i);
  for(let i=0;i<8;i++)s(n-1-i,8,i);for(let i=8;i<15;i++)s(8,n-15+i,i);m[n-8][8]=1};
 fmt(base,0);for(let i=0;i<=8;i++){F[8][i]=1;F[i][8]=1}for(let i=0;i<8;i++){F[8][n-1-i]=1;F[n-1-i][8]=1}F[n-8][8]=1;
 if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(v<<12)|r;for(let i=0;i<18;i++){const a=n-11+i%3,c=Math.floor(i/3),bit=(b>>>i)&1;fn(a,c,bit);fn(c,a,bit)}}
 k=0;for(let right=n-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){const x=right-j,y=((right+1)&2)===0?n-1-vert:vert;if(!F[y][x]&&k<out.length*8){base[y][x]=(out[k>>>3]>>>(7-(k&7)))&1;k++}}}

 const penalty=m=>{let p=0;
  for(let pass=0;pass<2;pass++)for(let a=0;a<n;a++){let run=1;const line=[];for(let b=0;b<n;b++){const c=pass?m[b][a]:m[a][b];line.push(c);if(b){if(c===line[b-1]){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
   const s=line.join('');for(const pat of['10111010000','00001011101']){let i=-1;while((i=s.indexOf(pat,i+1))>=0)p+=40}}
  for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=m[y][x];if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])p+=3}
  const dark=m.reduce((s,r)=>s+r.reduce((a,b)=>a+b,0),0);return p+Math.max(0,Math.ceil(Math.abs(dark*20-n*n*10)/(n*n))-1)*10};
 let best,bp=Infinity;
 MASKS.forEach((f,mask)=>{const m=base.map(r=>r.slice());for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&f(x,y))m[y][x]^=1;fmt(m,mask);const p=penalty(m);if(p<bp){bp=p;best=m}});
 return best}

export function qrSvg(text,{margin=4,dark='#000',light='#fff'}={}){
 const m=qrMatrix(text),n=m.length;let d='';m.forEach((r,y)=>r.forEach((c,x)=>{if(c)d+=`M${x+margin} ${y+margin}h1v1h-1z`}));
 const s=n+2*margin;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="Booking QR code"><rect width="${s}" height="${s}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`}
