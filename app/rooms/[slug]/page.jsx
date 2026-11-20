import Link from 'next/link';import {notFound} from 'next/navigation';import {PAGES} from '../../../lib/site';import {fmt} from '../../../lib/rules';import {galleryPhotos} from '../../../lib/gallery.js';import {roomPhotos} from '../../../lib/photos.js';import Photo from '../../../components/Photo';
const find=s=>PAGES.find(p=>p.slug===s);
const CTA={std:'Reserve Standard Rooms',fam:'Reserve Family Rooms',hall:'Reserve the Event Hall'};
const safe=(f,d)=>{try{return f()}catch(e){console.error(e);return d}};
export const generateStaticParams=()=>PAGES.map(p=>({slug:p.slug}));
export async function generateMetadata({params}){const p=find((await params).slug);return p?{title:p.title,description:p.desc,alternates:{canonical:'/rooms/'+p.slug}}:{}}
export default async function Room({ params }) {
  const p = find((await params).slug);
  if (!p) notFound();
  const photos = safe(galleryPhotos, []);
  const [lead, ...more] = roomPhotos(photos, p.type);
  const reserve = '/?stay=' + p.type + '#reserve';
  const facts = [
    ['Capacity', p.cap],
    [p.type === 'hall' ? 'Venue' : 'Rooms', p.units],
    ['Check-in', '2:00 PM'],
    ['Check-out', '12:00 noon'],
  ];

  return <main className="room-detail">
    <div className="wrap">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 text-sm text-ash">
        <Link href="/" className="tap hover:underline">Bella Vista</Link><span aria-hidden="true">/</span>
        <Link href="/#rooms" className="tap hover:underline">Rooms &amp; Hall</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{p.h1}</span>
      </nav>
      <header className="detail-intro"><h1 className="h-sec">{p.h1}</h1><p>{p.body}</p></header>

      {lead && <div className={'detail-photos' + (more.length > 1 ? ' has-pair' : '')}>
        <Photo p={lead} priority sizes={more.length > 1 ? '(min-width:768px) 67vw, 100vw' : '100vw'} className="detail-lead"/>
        {more.length > 1 && more.slice(0, 2).map(photo => <Photo key={photo.src} p={photo} sizes="(min-width:768px) 30vw, 50vw" className="detail-inset"/>)}
      </div>}

      <div className="detail-body">
        <section aria-labelledby="stay-details">
          <h2 id="stay-details" className="font-display h-lg">{p.type === 'hall' ? 'Venue details' : 'Stay details'}</h2>
          <dl className="detail-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <Link href="/terms" className="lnk tap mt-3 text-sm font-semibold text-tile">Booking and cancellation terms</Link>
        </section>
        <aside className="detail-booking on-dark" aria-label="Rate and reservation">
          <p className="detail-rate"><strong>{fmt(p.rate)}</strong><span>per night</span></p>
          <p className="detail-fee">{p.extra}</p>
          <Link href={reserve} className="btn-light">{CTA[p.type]}</Link>
        </aside>
      </div>

      {(more.length === 1 || more.length > 2) && <section className="detail-more" aria-labelledby="more-photos">
        <h2 id="more-photos" className="font-display h-md">More photos</h2>
        <div>{(more.length === 1 ? more : more.slice(2)).map(photo => <Photo key={photo.src} p={photo} sizes="(min-width:768px) 40vw, 100vw" className="aspect-[4/3] rounded-lg"/>)}</div>
      </section>}

      <section className="detail-related" aria-labelledby="other-spaces">
        <h2 id="other-spaces" className="font-display h-md">Also at Bella Vista</h2>
        <ul>{PAGES.filter(item => item.slug !== p.slug).map(item => {
          const [image] = roomPhotos(photos, item.type);
          return <li key={item.slug}><Link href={'/rooms/' + item.slug} className="detail-related-link group">
            {image && <Photo p={image} sizes="(min-width:768px) 24vw, 35vw" className="detail-related-photo"/>}
            <span><span className="block font-display h-sm">{item.h1}</span><span className="mt-1 block text-sm text-ash">{fmt(item.rate)} per night</span></span>
            <span aria-hidden="true" className="go-arrow">→</span>
          </Link></li>;
        })}</ul>
      </section>
    </div>
  </main>;
}
