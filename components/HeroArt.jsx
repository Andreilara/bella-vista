// Dusk at Bella Vista: a lit house on the foothills under a crescent moon. Shown in the hero until the first gallery photo is uploaded. Its stars, windows and fireflies animate (CSS, see globals.css).
const STARS=[[60,70],[120,40],[200,95],[260,50],[330,82],[410,48],[440,128],[92,152],[172,150],[300,152],[362,196],[40,214],[238,28],[456,204],[140,108],[22,120]];
export default function HeroArt(){
 return <svg viewBox="0 0 480 600" role="img" aria-label="Illustration: Bella Vista at dusk, a house with lit windows on the foothills under a crescent moon" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
  <rect width="480" height="600" fill="#14231b"/>
  {STARS.map(([x,y],i)=><circle key={i} className="tw" style={{'--d':(i*.47%3.6).toFixed(2)+'s','--o':i%2?.7:.95}} cx={x} cy={y} r={i%3?1.2:1.9} fill="#f6f2e9" opacity={i%2?.7:.95}/>)}
  <circle cx="356" cy="136" r="38" fill="#f1e7cf"/><circle cx="373" cy="125" r="34" fill="#14231b"/>
  <g className="cloud" fill="#3a6b52" opacity=".55"><rect x="40" y="196" width="130" height="7" rx="3.5"/><rect x="78" y="208" width="84" height="6" rx="3"/></g><g className="cloud cloud-b" fill="#3a6b52" opacity=".45"><rect x="270" y="214" width="150" height="7" rx="3.5"/></g>
  <path d="M0 330 70 272 142 312 232 238 322 304 402 258 480 304V600H0Z" fill="#2c5a42"/>
  <path d="M0 402 92 342 172 388 272 318 372 384 432 352 480 378V600H0Z" fill="#24503f"/>
  <path d="M0 468 110 414 214 452 330 402 430 446 480 428V600H0Z" fill="#17382b"/>
  {/* the house */}
  <path d="M178 520 150 600H350L322 520Z" fill="#f2b75b" opacity=".12"/>
  <path d="M146 420 190 376H310L354 420Z" fill="#2b1713"/><path d="M190 376H310" stroke="#4a2a22" strokeWidth="3"/>
  <rect x="160" y="420" width="180" height="52" fill="#1f2b25"/>
  {[176,206,236,266,296].map((x,i)=><g key={x} className="win" style={{'--d':(i*1.3)+'s'}}><rect x={x} y="430" width="20" height="30" fill="#f2b75b"/><path d={`M${x+10} 430v30M${x} 445h20`} stroke="#1f2b25" strokeWidth="1.6"/></g>)}
  <rect x="172" y="472" width="156" height="48" fill="#0d1a14"/>
  <path d="M238 520v-26a12 12 0 0 1 24 0v26Z" fill="#f2b75b" opacity=".9"/>
  {[184,214,284,310].map(x=><rect key={x} x={x} y="486" width="14" height="22" fill="#f2b75b" opacity=".55"/>)}
  {/* palm and trees */}
  <path d="M74 600Q84 530 104 478" fill="none" stroke="#0b1a14" strokeWidth="6" strokeLinecap="round"/>
  <g fill="none" stroke="#0b1a14" strokeWidth="4.5" strokeLinecap="round"><path d="M104 478Q72 452 36 474"/><path d="M104 478Q96 440 132 430"/><path d="M104 478Q136 456 168 476"/><path d="M104 478Q76 432 56 422"/><path d="M104 478Q126 438 150 438"/></g>
  <ellipse cx="410" cy="476" rx="52" ry="40" fill="#0d2219"/><ellipse cx="384" cy="492" rx="40" ry="30" fill="#0d2219"/>
  <path d="M0 548Q120 512 240 540T480 524V600H0Z" fill="#07140e"/>
  {[[132,512],[200,536],[334,528],[392,512],[444,540]].map(([x,y],i)=><circle key={i} className="ff" style={{'--d':(i*1.1)+'s','--x':(i%2?7:-7)+'px','--y':(-8-i*2)+'px'}} cx={x} cy={y} r="2.2" fill="#f2b75b" opacity=".9"/>)}
 </svg>}
