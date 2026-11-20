import {ReservationDraftProvider} from '../components/ReservationDraft';
import TouchPress from '../components/TouchPress';
import './fonts.css';import './globals.css';
import {SITE} from '../lib/site';import StaffGuard from '../components/StaffGuard';import {ContactProvider} from '../components/ContactContext';import {getContact} from '../lib/settings.js';
// Contact and payment details are edited by staff and read from the database. Pages are cached (the home page for 60 s); saving Settings clears the cache at once (see app/api/settings).
export const revalidate=60;   // every cached page re-reads the contact details at most once a minute, so a build made elsewhere never freezes old details
const title='Bella Vista Hotel & Events Place | Boutique Mountain Hotel',description='Eco-chic boutique hotel and events venue at the mountain foothills. Book direct: rooms from ₱3,500 a night, family rooms and an event hall for up to 40.';
export const metadata={metadataBase:new URL(SITE),title:{default:title,template:'%s | Bella Vista Hotel & Events Place'},description,
 keywords:['boutique hotel','mountain resort','events venue','event hall','family rooms','Philippines hotel reservation','Bella Vista'],
 alternates:{canonical:'/'},openGraph:{type:'website',siteName:'Bella Vista Hotel & Events Place',locale:'en_PH',url:'/',title,description},twitter:{card:'summary_large_image',title,description},robots:{index:true,follow:true},other:{'page-type':'place','site-kind':'other','page-kind':'place'}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f6f2e9',colorScheme:'light'};
const FONTS=['/fonts/manrope-latin-wght-normal.woff2','/fonts/cormorant-garamond-latin-wght-normal.woff2'];   // the two files the first screen needs
export default function RootLayout({children}){return <html lang="en-PH" data-type="place"><head>{FONTS.map(f=><link key={f} rel="preload" as="font" type="font/woff2" href={f} crossOrigin="anonymous"/>)}</head><body><ContactProvider value={getContact()}><ReservationDraftProvider>{children}</ReservationDraftProvider></ContactProvider><StaffGuard/><TouchPress/></body></html>}
