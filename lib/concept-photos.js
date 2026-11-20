// Bundled imagery for the fictional property. Staff uploads take precedence.
export const conceptPhotos=[
 ['Cover','foothill-exterior','Foothill exterior','A tropical hillside guesthouse framed by trees'],
 ['Grounds','house-entrance','House entrance','A timber entrance with volcanic-stone walls'],
 ['Rooms','standard-room','Standard Room','A queen bed beside a window overlooking tropical greenery'],
 ['Family Rooms','family-room','Family Room','Two queen beds with olive throws beneath a timber window'],
 ['Event Hall','event-hall','Event Hall','An intimate reception setup beneath timber trusses'],
 ['Grounds','firepit-lounge','Firepit Lounge','Woven chairs around a stone firepit at dusk'],
 ['Events','garden-lawn-ceremony','Garden Lawn Ceremony','Wooden chairs and a flower-covered arbor on the lawn'],
 ['Events','field-house-celebration','Field House Celebration','A timber pavilion with long tables and string lights for an evening celebration'],
 ['Grounds','garden-path','Garden path','A pebble path through the guesthouse garden'],
 ['Rooms','standard-room-detail','Bedside details','A ceramic lamp beside an ivory-linen bed'],
 ['Family Rooms','family-room-detail','Family Room window','A timber window seat overlooking the foothills'],
 ['Event Hall','hall-table','Event Hall table setting','A linen table set with ceramics and tropical foliage'],
].map(([cat,file,title,description])=>({
 cat,src:'/experience/'+file+'.webp',title,alt:'Bella Vista concept image. '+description,
}));

// Retire the original demo set from guest pages while retaining uploads in the admin library.
export const retiredDemoPhotos=new Set([
 '5225edd4608c6b10','179b9ba165c2cec0','8025f99ca5619259','47737cfd9e1ddafa',
 '77392d23259a4492','c0a44f47dc112bf3','3ba42322f3c77a00','2d160229296d27ad',
 'cabd8e0c60948f8d','3e9b6a56fa3715bf','b1f7442506721d65','08ada64c1220731c',
 '98b8af6a7ec294b8','4178ed1ee5e5008f','298a90c8d6a2d95e','61c89363f45c1f93',
].map(file=>'/api/photo/'+file+'.jpg'));
