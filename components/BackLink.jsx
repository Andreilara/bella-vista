import Link from 'next/link';

export default function BackLink({href,onClick,children='Back to website',direction='left',className=''}){
 const style='tap group -ml-1 gap-2 rounded-md px-1 text-sm font-semibold text-tile transition-colors hover:text-tilehi '+className;
 const motion=direction==='up'?'group-hover:-translate-y-0.5':'group-hover:-translate-x-0.5';
 const content=<><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={'shrink-0 transition-transform duration-200 motion-reduce:transition-none '+motion}>
  <path d={direction==='up'?'M12 19V5M5 12l7-7 7 7':'M19 12H5M11 6l-6 6 6 6'}/>
 </svg><span>{children}</span></>;
 return href
  ?<Link href={href} onClick={onClick} className={style}>{content}</Link>
  :<button type="button" onClick={onClick} className={style}>{content}</button>;
}
