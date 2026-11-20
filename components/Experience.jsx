'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {LazyMotion,domAnimation} from 'framer-motion';
import {TYPES,fmt} from '../lib/rules';
import {useContact} from './ContactContext';
import Gallery from './Gallery';
import LazyOnView from './LazyOnView';
import BackLink from './BackLink';
import {useReservationDraft} from './ReservationDraft';
import Reviews from './Reviews';
import RoomsShowcase from './RoomsShowcase';
import Logo,{LogoFull} from './Logo';
import Photo from './Photo';
import Image from 'next/image';
import HeroArt from './HeroArt';
import LoadingSkeleton from './LoadingSkeleton';

// Below the fold: the booking form (with its calendar and planner) and the Terms dialog load only when needed.
function BookingSkeleton(){return <LoadingSkeleton label="Loading availability" variant="booking"/>}
const Booking=dynamic(()=>import('./Booking'),{ssr:false,loading:()=><BookingSkeleton/>});

const Terms=dynamic(()=>import('./Terms'),{ssr:false});

const mapsUrl=a=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('Bella Vista Hotel & Events Place, '+a);

// Footer contact icons: outline SVGs in a round chip, decorative (the text beside each one says what it is).
const FOOT_ICON={pin:<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
 phone:<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>,
 mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>};
const FootChip=({k})=><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-paper/25 text-glow transition-colors group-hover:border-paper/60"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">{FOOT_ICON[k]}</svg></span>;
export default function Experience({photos={},reviews=[],reviewStats}){
 const {draft,submission}=useReservationDraft();
 const {hero=null,house=null,rooms={},rest=[]}=photos,hasGallery=rest.length>0;
 const rating=reviewStats?.average?.toFixed(1);
 const count=reviewStats?.count??0;
 const verifiedStays=count+' verified '+(count===1?'stay':'stays');
 const [pick,setPick]=useState(null),[terms,setTerms]=useState(false),[termsEver,setTermsEver]=useState(false),[menu,setMenu]=useState(false),[active,setActive]=useState(''),[solid,setSolid]=useState(false);
 const [openReservation,setOpenReservation]=useState(false);
 const menuRef=useRef(null),menuButton=useRef(null),CONTACT=useContact();
 const NAV=[['The House','#about'],['Rooms','#rooms'],...(hasGallery?[['Gallery','#gallery']]:[]),['Guest notes','#reviews']];

 const go=(e,sel)=>{
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();
  const target=document.querySelector(sel);if(!target)return;
  if(location.hash!==sel)history.pushState(null,'',sel);
  target.tabIndex=-1;target.focus({preventScroll:true});
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
 };
 const toSection=(e,sel)=>{setMenu(false);go(e,sel)};

 // Keep reservation links working on arrival, but start refreshed pages at the hero.
 useLayoutEffect(()=>{
  if(location.hash!=='#reserve'||new URLSearchParams(location.search).get('reserve')==='1'||performance.getEntriesByType('navigation')[0]?.type!=='reload')return;
  const restoration=history.scrollRestoration;
  history.scrollRestoration='manual';
  history.replaceState(history.state,'',location.pathname+location.search);
  const scrollToTop=()=>window.scrollTo({top:0,behavior:'instant'});
  scrollToTop();
  const frame=requestAnimationFrame(()=>{
   scrollToTop();
   history.scrollRestoration=restoration;
  });
  return ()=>{cancelAnimationFrame(frame);history.scrollRestoration=restoration};
 },[]);

 useEffect(()=>{
  const url=new URL(location.href);
  if(url.searchParams.get('reserve')!=='1')return;
  url.searchParams.delete('reserve');
  history.replaceState(history.state,'',url);
  const section=document.getElementById('reserve');
  setOpenReservation(true);
  section.focus({preventScroll:true});
  section.scrollIntoView({block:'start',behavior:'instant'});
 },[]);

 // A room page's Reserve link arrives as /?stay=std#reserve: preselect that stay type.
 useEffect(()=>{if(draft.current||submission)return;const s=new URLSearchParams(location.search).get('stay');if(Object.hasOwn(TYPES,s))setPick({type:s,t:Date.now()})},[]);
 // Cover scrolling content as soon as it starts moving behind the fixed header.
 useLayoutEffect(()=>{
  const sync=()=>setSolid(window.scrollY>0);
  sync();
  window.addEventListener('scroll',sync,{passive:true});
  return()=>window.removeEventListener('scroll',sync);
 },[]);
 useEffect(()=>{if(!menu)return;
  const outside=e=>{if(!menuRef.current?.contains(e.target)&&!menuButton.current?.contains(e.target))setMenu(false)};
  const escape=e=>{if(e.key==='Escape'){setMenu(false);menuButton.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[menu]);
 // Which section is on screen, for the underline in the top navigation.
 useEffect(()=>{const ids=['about','rooms','gallery','reviews','reserve'],els=ids.map(i=>document.getElementById(i)).filter(Boolean);if(!els.length||!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)setActive(e.target.id)})},{rootMargin:'-45% 0px -50% 0px'});els.forEach(el=>io.observe(el));return()=>io.disconnect()},[]);

 return <LazyMotion features={domAnimation}><main className="home-type relative">
  <a href="#top" onClick={e=>{go(e,'#top');document.getElementById('top')?.focus({preventScroll:true})}} className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-paper">Skip to main content</a>
  <nav aria-label="Primary" className={'home-header fixed inset-x-0 top-0 z-40 w-full max-w-[100vw] border-b pt-[max(.75rem,env(safe-area-inset-top))] md:pt-3 '+(solid?'border-line bg-paper text-ink shadow-nav':'on-dark border-transparent bg-transparent text-paper')}>
   <div className="wrap flex items-center justify-between gap-2 pb-3">
    <a href="#top" onClick={e=>go(e,'#top')} aria-label="Bella Vista Hotel & Events Place, back to top" className="flex items-center"><Logo/></a>
    <div className="flex shrink-0 items-center gap-2 text-[.9375rem] md:gap-7">
     {NAV.filter(([l])=>l!=='Guest notes').map(([l,h])=><a key={h} className={'navlink hidden md:block'+(active===h.slice(1)?' is-on':'')} aria-current={active===h.slice(1)?'location':undefined} href={h} onClick={e=>go(e,h)}>{l}</a>)}
     <Link href="/my-booking" className="navlink hidden md:block">My booking</Link>
     <a href="#reserve" onClick={e=>go(e,'#reserve')} className={solid?'btn':'btn-light'}>Reserve</a>
     <button ref={menuButton} type="button" onClick={()=>setMenu(!menu)} aria-label={menu?"Close menu":"Open menu"} aria-expanded={menu} aria-controls="mobile-menu" className={"mobile-toggle grid h-11 w-11 shrink-0 place-items-center rounded-md border md:hidden "+(solid?"border-ink/55":"border-paper/60")}><span aria-hidden="true"/><span aria-hidden="true"/></button></div></div>
   <div ref={menuRef} id="mobile-menu" aria-hidden={!menu} className={"mobile-dropdown md:hidden "+(menu?"is-open":"")}>
    {NAV.map(([l,h],i)=><a key={h} style={{"--item":i}} tabIndex={menu?undefined:-1} href={h} aria-current={active===h.slice(1)?"location":undefined} onClick={e=>toSection(e,h)}>{l}</a>)}
    <Link style={{"--item":NAV.length}} tabIndex={menu?undefined:-1} href="/my-booking" onClick={()=>setMenu(false)}>My booking</Link>
   </div></nav>

  <section id="top" data-enter tabIndex={-1} className="on-dark relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-night text-paper outline-none">
   <div className={"hero-media -z-20"+(hero?" has-cover":"")}>{hero?<Image src={hero.src} alt={hero.alt??hero.title+" at Bella Vista Hotel & Events Place"} fill priority sizes="max(100vw, 150svh)" quality={86} className={"hero-zoom object-cover"+(hero.src==='/experience/foothill-exterior.webp'?" hero-foothill":"")}/>:<HeroArt/>}</div>
   <div aria-hidden="true" className="hero-shade absolute inset-0 -z-10"/>
   <div className="wrap hotel-hero-content relative pb-12 pt-[calc(8rem+env(safe-area-inset-top))] md:pb-16 md:pt-40">
    <h1 className="rise"><span className="hero-title">Bella Vista</span><span className="sr-only">: </span><span className="hero-sub">A quiet stay at the <em>mountain foothills.</em></span></h1>
    <div className="hotel-hero-actions rise rise-2"><a href="#rooms" onClick={e=>go(e,"#rooms")} className="hero-btn-solid hero-liquid-button"><span>See rooms and rates</span><span className="hero-liquid-arrow" aria-hidden="true"><i/></span></a>
     <div className="hero-stay-info"><p>Rooms from <strong>{fmt(TYPES.std.rate)}</strong> per night</p>
      {rating&&<a href="#reviews" onClick={e=>toSection(e,'#reviews')} className="hero-rating" aria-label={rating+' out of 5 from '+verifiedStays+'. Read guest notes.'}><span aria-hidden="true">★</span> {rating} from {verifiedStays}</a>}
     </div>
    </div>
   </div></section>

  <section id="about" className="bg-surface py-20 md:py-28"><div className="wrap">
   <div className="house-story">
    <Photo p={house} sizes="(min-width:768px) 52vw, 100vw" quality={88} className="house-photo"/>
    <div className="house-copy"><h2 className="h-sec">The House</h2>
     <p className="t-lead mt-5">A family resthouse at the mountain foothills.</p>
     <p className="mt-4 max-w-md text-base text-ash">Bella Vista began as a family-owned resthouse in 2021. As more guests came for quiet getaways and intimate celebrations, it grew into a boutique hotel and events venue. Today, we welcome families, travelers, and corporate groups with warm Filipino hospitality.</p>
    </div>
   </div>
   <div className="house-visit"><dl><div><dt>Check-in</dt><dd>2:00 PM</dd></div><div><dt>Check-out</dt><dd>12:00 noon</dd></div><div><dt>Open</dt><dd>Every day</dd></div></dl>
    {CONTACT.address&&<div className="house-address"><span>{CONTACT.address}</span><a href={mapsUrl(CONTACT.address)} target="_blank" rel="noopener noreferrer" className="lnk tap font-semibold text-tile">Get directions</a></div>}
   </div></div></section>

  <RoomsShowcase photos={rooms} onBook={(event,type)=>{setPick({type,t:Date.now()});go(event,"#reserve")}}/>

  <Gallery photos={rest}/>

  <Reviews reviews={reviews} rating={rating} count={count}/>

  <section id="reserve" tabIndex={-1} className="booking-section bg-paper py-16 md:py-24"><div className="wrap"><header className="reserve-intro"><div><h2 className="h-sec">Reserve your stay</h2><p className="mt-3 max-w-xl text-base text-ash">Check availability and see your total before sending a request. We hold your dates for 48 hours while you arrange the downpayment.</p></div><Link href="/my-booking" className="lnk tap font-semibold text-tile">Find an existing reservation</Link></header>
   <LazyOnView force={openReservation||!!pick||!!draft.current||!!submission} fallback={<BookingSkeleton/>}><Booking pick={pick} onTerms={()=>{setTermsEver(true);setTerms(true)}}/></LazyOnView></div></section>

  <footer className="hotel-footer on-dark text-paper">
   <div className="wrap">
    <div className="hotel-footer-main">
     <div className="hotel-footer-brand"><LogoFull className="hotel-footer-logo" accent="#f0dfbe"/></div>
     <nav className="hotel-footer-links" aria-label="Explore Bella Vista">
      <h2>Explore</h2>
      <a href="#about" onClick={e=>go(e,"#about")}>The House</a>
      <a href="#rooms" onClick={e=>go(e,"#rooms")}>Rooms &amp; Hall</a>
      {hasGallery&&<a href="#gallery" onClick={e=>go(e,"#gallery")}>Gallery</a>}
      <Link href="/my-booking">My booking</Link>
     </nav>
     {(CONTACT.phone||CONTACT.email||CONTACT.address)&&<section className="hotel-footer-contact" aria-labelledby="footer-contact-title">
      <h2 id="footer-contact-title">Visit &amp; contact</h2>
      <address>
       {CONTACT.address&&<a href={mapsUrl(CONTACT.address)} target="_blank" rel="noopener noreferrer" className="group"><FootChip k="pin"/><span>{CONTACT.address}</span></a>}
       {CONTACT.phone&&<a href={"tel:"+CONTACT.phone.replace(/[^\d+]/g,"")} className="group"><FootChip k="phone"/><span>{CONTACT.phone}</span></a>}
       {CONTACT.email&&<a href={"mailto:"+CONTACT.email} className="group"><FootChip k="mail"/><span>{CONTACT.email}</span></a>}
      </address>
     </section>}
    </div>
    <div className="hotel-footer-bottom">
     <p>© 2026 Bella Vista Hotel &amp; Events Place</p>
     <nav aria-label="Policies and staff"><Link href="/terms">Terms &amp; Conditions</Link><Link href="/privacy">Privacy</Link><Link href="/admin" rel="nofollow">Staff</Link></nav>
     <BackLink href="#top" direction="up" onClick={e=>{go(e,"#top");document.getElementById("top")?.focus({preventScroll:true})}} className="hotel-footer-top">Back to top</BackLink>
    </div>
   </div>
  </footer>

  {termsEver&&<Terms open={terms} onClose={()=>setTerms(false)}/>}</main></LazyMotion>}
