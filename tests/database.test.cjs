const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { migrate } = require('drizzle-orm/pglite/migrator');
const { NextRequest } = require('next/server');
const { createLoader } = require('./load-app.cjs');
const schema = createLoader()('src/db/schema.ts');

async function fixture(t) {
  const client = new PGlite();
  t.after(() => client.close());
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  const load = createLoader({ '@/db': { db }, '@/lib/require-session': { requireSession: async () => ({ user: { id: 'fixture' } }) }, 'next/cache': { revalidatePath() {} } });
  return { client, db, load };
}

test('baseline instala banco vazio e snapshots correspondem ao schema atual', async (t) => {
  const { client } = await fixture(t);
  assert.equal((await client.query('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0].n, 3);
  const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api');
  const snapshot = JSON.parse(fs.readFileSync('drizzle/meta/0002_snapshot.json', 'utf8'));
  assert.deepEqual(await generateMigration(snapshot, generateDrizzleJson(schema, snapshot.id)), []);
});

test('upgrade preserva dados e não reaplica baseline em banco já migrado', async (t) => {
  const client = new PGlite(); t.after(() => client.close());
  await client.exec(fs.readFileSync('drizzle/0000_initial_baseline.sql', 'utf8'));
  await client.exec(fs.readFileSync('drizzle/0001_weekly_tv_schedules.sql', 'utf8'));
  await client.exec(`CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key, hash text not null, created_at bigint);
    INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('existing',1788652800000);
    INSERT INTO "user"(id,name,email) VALUES('legacy','Legacy','legacy@example.invalid');
    INSERT INTO account(id,user_id,account_id,provider_id) VALUES('account','legacy','legacy','credential');
    INSERT INTO tv(name,pairing_code) VALUES('TV existente','ABCD-2345');`);
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
  assert.equal((await client.query('select issuer from account')).rows[0].issuer, 'local:credential');
  assert.equal((await client.query('select name, device_token_hash from tv')).rows[0].name, 'TV existente');
  assert.equal((await client.query('select device_token_hash from tv')).rows[0].device_token_hash, null);
  assert.equal((await client.query('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0].n, 2);
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
  assert.equal((await client.query('select count(*)::int as n from tv')).rows[0].n, 1);
});

test('ações reais preservam playlists, rejeitam reordenação inválida e propagam exclusão', async (t) => {
  const { db, load } = await fixture(t);
  const actions = load('src/actions/playlist.ts');
  const [content] = await db.insert(schema.media).values({name:'Imagem',type:'image',url:'data:image/png;base64,AA==',duration:10}).returning();
  const a = await actions.createPlaylist('A'); const b = await actions.createPlaylist('B');
  const first = await actions.addItemToPlaylist(a.id, content.id);
  const second = await actions.addItemToPlaylist(a.id, content.id);
  const foreign = await actions.addItemToPlaylist(b.id, content.id);
  await assert.rejects(actions.reorderPlaylistItems(a.id, [first.id, foreign.id]));
  await actions.removeItemFromPlaylist(foreign.id, a.id);
  assert.equal((await actions.getPlaylistWithItems(b.id)).items.length, 1);
  await actions.reorderPlaylistItems(a.id, [second.id, first.id]);
  assert.equal((await actions.getPlaylistWithItems(a.id)).items[0].id, second.id);
  const before = (await actions.getPlaylistWithItems(a.id)).version;
  await load('src/actions/media.ts').deleteMedia(content.id);
  const after = await actions.getPlaylistWithItems(a.id);
  assert.equal(after.version, before + 1); assert.equal(after.items.length, 0);
  assert.equal((await actions.getPlaylistWithItems(b.id)).items.length, 0);
});

test('agenda rejeita sobreposição e exclusões preservam as cascatas esperadas', async (t) => {
  const { db, load } = await fixture(t);
  const p = await load('src/actions/playlist.ts').createPlaylist('Agenda');
  const device = await load('src/actions/tv.ts').createTv({ name: 'Teste' });
  const actions = load('src/actions/schedule.ts');
  const input = { tvId:device.id,playlistId:p.id,name:'Manhã',days:[1],startMinute:540,endMinute:600 };
  assert.equal((await actions.saveSchedule(input)).ok, true);
  assert.equal((await actions.saveSchedule({...input,name:'Conflito',startMinute:570})).ok, false);
  assert.equal((await actions.saveSchedule({...input,name:'Seguinte',startMinute:600,endMinute:660})).ok, true);
  await load('src/actions/playlist.ts').deletePlaylist(p.id);
  assert.equal((await db.select().from(schema.tvSchedule)).length, 0);
  assert.equal((await db.select().from(schema.tv)).length, 1);
});

test('token protege pareamento/config/heartbeat e revogação invalida o acesso', async (t) => {
  const { load } = await fixture(t);
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = 'isolated-test-secret-with-at-least-32-characters';
  t.after(() => { if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET; else process.env.BETTER_AUTH_SECRET = previousSecret; });
  const pair = load('src/app/api/player/pair/route.ts');
  const registration = await (await pair.POST(new NextRequest('http://localhost/api/player/pair',{method:'POST'}))).json();
  const url = `http://localhost/api/player/pair?tvId=${registration.tvId}`;
  assert.equal((await pair.GET(new NextRequest(url))).status, 401);
  const headers = { Authorization: `Bearer ${registration.token}` };
  assert.equal((await pair.GET(new NextRequest(url,{headers}))).status, 200);
  const tvActions = load('src/actions/tv.ts');
  await tvActions.pairTvByCode(registration.code,'TV segura');
  const config = load('src/app/api/player/config/route.ts');
  const configUrl = `http://localhost/api/player/config?tvId=${registration.tvId}`;
  assert.equal((await config.GET(new NextRequest(configUrl))).status, 401);
  assert.equal((await config.GET(new NextRequest(configUrl,{headers}))).status, 200);
  const heartbeat = load('src/app/api/player/heartbeat/route.ts');
  const beat = (h) => heartbeat.POST(new NextRequest('http://localhost/api/player/heartbeat',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({tvId:registration.tvId})}));
  assert.equal((await beat({})).status, 401); assert.equal((await beat(headers)).status, 200);
  await tvActions.revokeTvAccess(registration.tvId);
  assert.equal((await config.GET(new NextRequest(configUrl,{headers}))).status, 401);
  assert.equal((await pair.GET(new NextRequest(url))).status, 401);
});

test('migração de TV antiga exige compatibilidade e nunca reemite token após migração', async (t) => {
  const { load } = await fixture(t);
  const previous = process.env.PLAYER_ALLOW_LEGACY_AUTH;
  t.after(() => { if(previous === undefined) delete process.env.PLAYER_ALLOW_LEGACY_AUTH; else process.env.PLAYER_ALLOW_LEGACY_AUTH=previous; });
  const tv = await load('src/actions/tv.ts').createTv({name:'Antiga'});
  const pair = load('src/app/api/player/pair/route.ts');
  const token = load('src/lib/device-token.ts').newDeviceToken();
  const request = () => new NextRequest(`http://localhost/api/player/pair?tvId=${tv.id}`,{headers:{'x-player-upgrade':'1',Authorization:`Bearer ${token}`}});
  process.env.PLAYER_ALLOW_LEGACY_AUTH='false'; assert.equal((await pair.GET(request())).status,401);
  process.env.PLAYER_ALLOW_LEGACY_AUTH='true';
  assert.equal((await pair.GET(request())).status,200);
  // Simulate a lost response: same token can retry after the atomic claim.
  assert.equal((await pair.GET(request())).status,200);
  assert.equal((await pair.GET(new NextRequest(`http://localhost/api/player/pair?tvId=${tv.id}`))).status,401);
});

test('limite de registro é compartilhado entre instâncias e expira no banco', async (t) => {
  const { load, client, db } = await fixture(t);
  const previous = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = 'isolated-test-secret-with-at-least-32-characters';
  t.after(() => { if(previous===undefined) delete process.env.BETTER_AUTH_SECRET; else process.env.BETTER_AUTH_SECRET=previous; });
  const a = load('src/lib/player-registration.ts');
  const b = createLoader({'@/db':{db}})('src/lib/player-registration.ts');
  for(let i=0;i<30;i++) assert.equal(await (i%2?a:b).allowPlayerRegistration(new Headers()),true);
  assert.equal(await a.allowPlayerRegistration(new Headers({'x-forwarded-for':'spoofed'})),false);
  await client.exec("UPDATE player_rate_limit SET expires_at=now()-interval '1 second'");
  assert.equal(await b.allowPlayerRegistration(new Headers()),true);
});
