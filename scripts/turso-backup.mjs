import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createBackup,previewBackup,readTursoSafetyCopy,restoreBackup} from '../lib/backup.js';

const [operation,file,option]=process.argv.slice(2);
if(!['download','preview','restore','safety'].includes(operation)||!file||
   (operation==='restore'&&option!=='--confirm')||(operation==='safety'&&!option)){
 console.error('Usage: node scripts/turso-backup.mjs download|preview|restore <file.zip> [--confirm]');
 console.error('       node scripts/turso-backup.mjs safety <output.zip> <safety-copy-name>');
 process.exit(1);
}
for(const config of ['.env.local','.env'])if(existsSync(config))process.loadEnvFile(config);
process.env.DB_PROVIDER='turso';

if(operation==='download')writeFileSync(file,createBackup().buffer,{flag:'wx'});
if(operation==='safety'){
 const buffer=readTursoSafetyCopy(option);
 if(!buffer)throw new Error('Safety copy not found.');
 writeFileSync(file,buffer,{flag:'wx'});
}
if(operation==='preview'||operation==='restore'){
 const buffer=readFileSync(file);
 const result=operation==='preview'?previewBackup(buffer):restoreBackup(buffer,'backup-cli');
 if(!result.ok){console.error(result.error);process.exitCode=1}
 else console.log(result);
}
