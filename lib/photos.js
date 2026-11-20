// Decides which gallery photo goes where, so no photograph is shown twice on the home page.
// The hero is the first photo in the Cover category (it never borrows a room or grounds photo). Then one photo per room type from its own
// category, then The House (Grounds, else Dining, else Events). Everything left over, including extra Cover photos, goes to the Gallery.
// A room slot stays empty rather than borrowing another room's photo. The Event Hall may fall back to Events photos, which have no other slot.
const ROOM_CAT={std:['Rooms'],fam:['Family Rooms'],hall:['Event Hall','Events']};
export function pickPhotos(all=[]){
 const used=new Set();
 const take=f=>{const p=all.find(x=>!used.has(x.src)&&f(x));if(p)used.add(p.src);return p||null};
 const hero=take(p=>p.cat==='Cover');
 const rooms={};for(const k of Object.keys(ROOM_CAT)){let p=null;for(const c of ROOM_CAT[k]){p=take(x=>x.cat===c);if(p)break}rooms[k]=p}
 const house=take(p=>p.cat==='Grounds')||take(p=>p.cat==='Dining')||take(p=>p.cat==='Events');
 const rest=all.filter(p=>!used.has(p.src));
 // Give the gallery a property view, an interior and a detail before continuing in staff order.
 const opening=[];
 for(const categories of [['Grounds','Cover'],['Rooms','Family Rooms','Event Hall'],['Dining','Events']]){
  const p=rest.find(photo=>!opening.includes(photo)&&categories.includes(photo.cat));
  if(p)opening.push(p);
 }
 const gallery=[...opening,...rest.filter(photo=>!opening.includes(photo))];
 return{hero,rooms,house,rest:gallery}}
export const roomPhotos=(all=[],type)=>{const cats=ROOM_CAT[type]||[];return cats.flatMap(c=>all.filter(p=>p.cat===c))};
