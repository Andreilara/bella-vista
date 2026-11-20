import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeTurso,openTurso,getDb,getSetting,setSetting,listAudit} from '../lib/db.js';
import {createStaff} from '../lib/staff.js';
import {createBackup,previewBackup,restoreBackup,readTursoSafetyCopy} from '../lib/backup.js';
import limit from '../lib/limit.js';

test('hosted driver path retains rollback ZIPs and shares rate limit state',()=>{
 const folder=mkdtempSync(join(tmpdir(),'bv-hosted-test-'));
 process.env.DB_PROVIDER='turso';
 process.env.TURSO_DATABASE_URL=pathToFileURL(join(folder,'test.db')).href;
 process.env.TURSO_AUTH_TOKEN='local-test-only';
 try{
  const setup=openTurso();
  try{
   initializeTurso(setup);
   setup.exec('ALTER TABLE audit_log RENAME COLUMN action TO action_temp');
   setup.exec('ALTER TABLE audit_log RENAME COLUMN action_temp TO ACTION');
  }finally{setup.close()}
  assert.ok(createStaff({username:'audit',name:'Audit',role:'admin',password:'test-password-123'},'test').ok);
  assert.equal(limit('test',2,10000),false);
  assert.equal(limit('test',2,10000),false);
  assert.equal(limit('test',2,10000),true);
  setSetting('audit-test','original');
  const {buffer}=createBackup();
  assert.equal(previewBackup(buffer).ok,true);
  setSetting('audit-test','modified');
  const restored=restoreBackup(buffer,'test');
  assert.equal(restored.ok,true,restored.error);
  assert.equal(getSetting('audit-test'),'original');
  assert.equal(listAudit()[0].action,'backup.restored');
  const safety=readTursoSafetyCopy(restored.safetyCopy);
  assert.ok(safety);
  assert.equal(restoreBackup(safety,'test').ok,true);
  assert.equal(getSetting('audit-test'),'modified');
 }finally{
  try{getDb().close()}finally{
   try{rmSync(folder,{recursive:true,force:true,maxRetries:3})}
   catch(error){if(process.platform!=='win32'||!['EBUSY','EPERM'].includes(error.code))throw error}
  }
 }
});
