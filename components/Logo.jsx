// Bella Vista logo (supplied November 2026): the house in front of three mountains, with "BELLA VISTA" and "HOTELS AND EVENTS PLACE" beneath.
// Both artworks are single-colour SVGs used as CSS masks, so the logo carries no colour of its own and always takes one that contrasts with where it sits:
//  - by default `--logo` (pine on paper; pale sage inside any `.on-dark` area, both set in app/globals.css), so it follows the page automatically;
//  - `accent` overrides it, and accent="currentColor" follows the surrounding text colour.
// `LogoMark` is the house and mountains alone. `LogoFull` is the complete artwork, name included. `Logo` is the compact lockup for bars and headers:
// the mark plus the live "Bella Vista / Hotel & Events Place" wordmark, because the name inside the full artwork is too small to read at bar height.
// `Logo large` is the full artwork (staff sign-in). The ratios below are the artworks' width / height (tests/logo.test.mjs keeps them in step with the files).
const MARK={url:'/brand/logo-mark.svg',ratio:1.8365},FULL={url:'/brand/logo.svg',ratio:1.3412};
const NAME='Bella Vista Hotel & Events Place';
function Art({art,className,accent,decorative}){
 const u=`url(${art.url})`;
 return <span role={decorative?undefined:'img'} aria-label={decorative?undefined:NAME} aria-hidden={decorative?true:undefined} className={'inline-block shrink-0 bg-current '+className}
  style={{aspectRatio:art.ratio,color:accent||'var(--logo)',WebkitMaskImage:u,maskImage:u,WebkitMaskSize:'contain',maskSize:'contain',WebkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',WebkitMaskPosition:'center',maskPosition:'center',WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}/>}
export const LogoMark=({className='h-12',accent,decorative})=><Art art={MARK} className={className} accent={accent} decorative={decorative}/>;
export const LogoFull=({className='h-32',accent})=><Art art={FULL} className={className} accent={accent}/>;
export default function Logo({className='',large=false,accent}){
 if(large)return <span className={'inline-flex '+className}><LogoFull className="h-32 sm:h-36" accent={accent}/></span>;
 return <span className={'inline-flex items-center gap-2 sm:gap-2.5 '+className}><LogoMark className="h-7 sm:h-10" accent={accent} decorative/>
  {' '}<span className="flex flex-col whitespace-nowrap leading-none"><span className="font-display text-[1.375rem] font-semibold sm:text-[1.75rem] tracking-[-.005em]">Bella Vista</span>{' '}
   <span className="mt-1 text-[.6875rem] font-medium sm:text-xs tracking-[.02em] opacity-75">Hotel &amp; Events Place</span></span></span>}
