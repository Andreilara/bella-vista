import {existsSync} from 'node:fs';
import {initializeTurso,openTurso} from '../lib/db.js';

for(const file of ['.env.local','.env'])if(existsSync(file))process.loadEnvFile(file);
const target=openTurso();
try{
 initializeTurso(target);
 target.exec('BEGIN IMMEDIATE');
 try{target.prepare('SELECT 1 FROM settings LIMIT 1').get()}
 finally{target.exec('ROLLBACK')}
 console.log('Turso schema and transaction verified.');
}finally{target.close()}
