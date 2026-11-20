import Image from 'next/image';import {LogoMark} from './Logo';
// One photograph in a flat, square-cornered frame. With no photo yet, a quiet frame holding the logo mark (no label, no pattern).
export default function Photo({p,sizes,priority=false,quality=84,className='',imgClass=''}){
 return <div className={'relative overflow-hidden bg-ink/[.06] shadow-soft '+className}>
  {p?<Image src={p.src} alt={p.alt??p.title+' at Bella Vista Hotel & Events Place'} fill sizes={sizes} priority={priority} quality={quality} className={'object-cover '+imgClass}/>
   :<div aria-hidden="true" className="grid h-full w-full place-items-center text-ink/25"><LogoMark className="h-14" accent="currentColor" decorative/></div>}</div>}
