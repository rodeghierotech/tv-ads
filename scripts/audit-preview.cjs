// Disposable audit environment. Does not read .env or connect to the configured database.
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { drizzle } = require('drizzle-orm/pglite');
const { migrate } = require('drizzle-orm/pglite/migrator');
const { spawn } = require('node:child_process');
const { createLoader } = require('../tests/load-app.cjs');

(async () => {
  const client = new PGlite();
  const schema = createLoader()('src/db/schema.ts');
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  const { betterAuth } = await import('better-auth');
  const { drizzleAdapter } = await import('better-auth/adapters/drizzle');
  const secret = 'disposable-audit-only-secret-at-least-32-characters';
  const auth = betterAuth({ secret, baseURL:'http://localhost:3100', database:drizzleAdapter(db,{provider:'pg'}), emailAndPassword:{enabled:true} });
  await auth.api.signUpEmail({body:{email:'audit@example.invalid',password:'Audit-local-only-2026!',name:'Auditoria local'}});
  const [playlist] = await db.insert(schema.playlist).values({name:'Playlist de teste'}).returning();
  const [media] = await db.insert(schema.media).values({name:'Imagem de teste',type:'image',duration:2,url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK3cAAAAASUVORK5CYII='}).returning();
  await db.insert(schema.playlistItem).values({playlistId:playlist.id,mediaId:media.id,order:0});
  const [tv] = await db.insert(schema.tv).values({name:'TV de auditoria',location:'Ambiente descartável',pairingCode:'ABCD-2345',playlistId:playlist.id}).returning();
  await db.insert(schema.tvSchedule).values({name:'Manhã de teste',tvId:tv.id,playlistId:playlist.id,days:[1,2,3,4,5],startMinute:540,endMinute:720});
  const socket = new PGLiteSocketServer({db:client,host:'127.0.0.1',port:55432,maxConnections:1});
  await socket.start();
  const child = spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3100'],{
    windowsHide:true,stdio:'inherit',env:{...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:55432/postgres',DATABASE_POOL_MAX:'1',BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:'http://localhost:3100',VERCEL:'',PLAYER_ALLOW_LEGACY_AUTH:'true'},
  });
  let stopping=false;
  const stop = async () => { if(stopping)return; stopping=true; child.kill(); await socket.stop(); await client.close(); };
  process.on('SIGINT',()=>void stop()); process.on('SIGTERM',()=>void stop());
  child.on('exit',()=>void stop());
  child.on('error',error=>{console.error(error.message);void stop();process.exitCode=1;});
  console.log('Auditoria descartável: http://localhost:3100 — audit@example.invalid / Audit-local-only-2026!');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
