import Experience from '../components/Experience';import {pickPhotos} from '../lib/photos.js';import {SITE,PAGES} from '../lib/site';import {galleryPhotos} from '../lib/gallery.js';import {approvedReviews,approvedReviewStats} from '../lib/db.js';
export const revalidate=60; // cached HTML, rebuilt at most once a minute (and instantly when a review is approved)
const safe=(f,d)=>{try{return f()}catch(e){console.error(e);return d}};
const ld={'@context':'https://schema.org','@type':'Hotel',name:'Bella Vista Hotel & Events Place',url:SITE,logo:SITE+'/brand/logo.svg',description:'Eco-chic boutique hotel and events venue at the scenic foothills of the mountains.',foundingDate:'2021',checkinTime:'14:00',checkoutTime:'12:00',priceRange:'₱3,500–₱15,000',numberOfRooms:6,
 amenityFeature:[{'@type':'LocationFeatureSpecification',name:'Event hall for up to 40 guests',value:true},{'@type':'LocationFeatureSpecification',name:'Open Monday to Sunday',value:true}],
 containsPlace:PAGES.filter(p=>p.type!=='hall').map(p=>({'@type':'HotelRoom',name:p.h1,url:SITE+'/rooms/'+p.slug,description:p.desc}))};
export default function Page(){
 const reviews=safe(()=>approvedReviews(9),[]).map(({id,name,rating,text})=>({id,name,rating,text}));
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(ld)}}/><Experience photos={pickPhotos(safe(galleryPhotos,[]))} reviews={reviews} reviewStats={safe(approvedReviewStats,{count:0,average:null})}/></>;
}
