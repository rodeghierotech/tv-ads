const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-app.cjs');
const load = createLoader();
const security = load('src/lib/device-token.ts');
const { ensureDeviceToken } = load('src/lib/device-identity.ts');
const { playerConfigSchema } = load('src/lib/player-contract.ts');

test('tokens são aleatórios, vinculados ao hash e resistentes a downgrade', t => {
  const previous = process.env.PLAYER_ALLOW_LEGACY_AUTH;
  process.env.PLAYER_ALLOW_LEGACY_AUTH = 'true';
  t.after(()=>{if(previous===undefined)delete process.env.PLAYER_ALLOW_LEGACY_AUTH;else process.env.PLAYER_ALLOW_LEGACY_AUTH=previous;});
  const token = security.newDeviceToken(); const other = security.newDeviceToken();
  assert.notEqual(token, other);
  const hash = security.hashDeviceToken(token);
  assert.equal(security.deviceTokenMatches(token,hash),true);
  assert.equal(security.deviceTokenMatches(other,hash),false);
  assert.equal(security.playerAuthorized(new Headers(),hash),false);
  assert.equal(security.playerAuthorized(new Headers({Authorization:'Basic invalid'}),null),false);
  assert.equal(security.deviceTokenMatches(token,'not-hex'),false);
});

test('token proposto persiste antes da migração e é reutilizado após perda de resposta', () => {
  const entries = new Map();
  const storage = { getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value) };
  const token = ensureDeviceToken('existing-tv',storage);
  assert.match(token,/^[A-Za-z0-9_-]{43}$/);
  assert.equal(ensureDeviceToken('existing-tv',storage),token);
  assert.equal(entries.size,1);
});

test('respostas incompletas/malformadas não substituem a playlist', () => {
  for(const value of [{},null,{paired:true},{paired:true,playlist:{items:[]}},{paired:true,unchanged:true,serverNow:'bad',nextChangeAt:null}]) {
    assert.equal(playerConfigSchema.safeParse(value).success,false);
  }
  assert.equal(playerConfigSchema.safeParse({paired:true,playlist:null,serverNow:new Date().toISOString(),nextChangeAt:null}).success,true);
});

test('colisão de código tenta novamente sem consulta prévia e tem limite de tentativas', async () => {
  let attempts = 0;
  const db = { insert:()=>({values:()=>({onConflictDoNothing:()=>({returning:async()=>++attempts===2?[{id:'tv',pairingCode:'ABCD-2345'}]:[]})})}) };
  const registration = createLoader({'@/db':{db},'@/db/schema':{tv:{pairingCode:'code'}},'@/lib/pairing':{generatePairingCode:()=> 'ABCD-2345'}})('src/lib/player-registration.ts');
  assert.equal((await registration.registerTv({name:'TV'})).id,'tv');
  attempts=2;
  await assert.rejects(registration.registerTv({name:'TV'}),/gerar um código/);
  assert.equal(attempts,7);
});
