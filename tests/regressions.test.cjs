const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Compile pure TypeScript modules with the installed compiler, without another runtime dependency.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const { parseTime, resolveWeeklySchedule, findScheduleConflicts } = require('../src/lib/scheduling.ts');
const { isExactItemOrder, idSchema, nameSchema } = require('../src/lib/validation.ts');
const { mediaKind } = require('../src/lib/media-validation.ts');
const { fetchJsonWithTimeout } = require('../src/lib/fetch-with-timeout.ts');
const slot = { id: 'a', tvId: 'tv', playlistId: 'p', name: 'Manhã', days: [1], startMinute: 540, endMinute: 600 };

function loadWithMocks(relativePath, mocks) {
  const path = require('node:path');
  const Module = require('node:module');
  const filename = path.resolve(__dirname, relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}

test('config omite mídias somente quando ID e versão coincidem; clientes antigos recebem playlist', async () => {
  const { NextRequest } = require('next/server');
  let reads = 0;
  const current = { id: 'playlist-a', version: 3, items: [] };
  const { GET } = loadWithMocks('../src/app/api/player/config/route.ts', {
    '@/lib/validation': { idSchema },
    '@/db': { db: { query: {
      tv: { findFirst: async () => ({ paired: true, playlistId: current.id, deviceTokenHash: null }) },
      playlist: { findFirst: async () => current },
    }, select: () => ({ from: () => ({ where: async () => [] }) }) } },
    '@/db/schema': { tv: { id: 'id' }, tvSchedule: { tvId: 'tvId' }, playlist: { id: 'id' } },
    '@/lib/scheduling': { resolveWeeklySchedule },
    '@/lib/playlist-data': { readPlaylistWithItems: async () => { reads++; return current; } },
    '@/lib/device-token': require('../src/lib/device-token.ts'),
  });
  const base = 'http://localhost/api/player/config?tvId=550e8400-e29b-41d4-a716-446655440000';
  const unchangedResponse = await GET(new NextRequest(base + '&knownPlaylist=playlist-a:3'));
  const unchanged = await unchangedResponse.json();
  assert.equal(unchanged.unchanged, true);
  assert.equal('playlist' in unchanged, false);
  assert.equal(reads, 0);
  assert.equal(unchangedResponse.headers.get('cache-control'), 'no-store');
  assert.ok(unchanged.serverNow);
  for (const suffix of ['', '&knownPlaylist=playlist-a:2', '&knownPlaylist=playlist-b:3']) {
    const payload = await (await GET(new NextRequest(base + suffix))).json();
    assert.deepEqual(payload.playlist, current);
  }
  assert.equal(reads, 3);
});

test('todas as ações administrativas exigem sessão antes de consultar ou alterar dados', async () => {
  const mocks = {
    '@/db': { db: new Proxy({}, { get() { throw new Error('Banco acessado antes da sessão'); } }) },
    '@/db/schema': {},
    '@/lib/require-session': { requireSession: async () => { throw new Error('LOGIN_REQUIRED'); } },
    '@/lib/validation': require('../src/lib/validation.ts'),
    '@/lib/playlist-data': {}, '@/lib/media-storage': {},
    '@/lib/media-validation': require('../src/lib/media-validation.ts'),
    '@/lib/pairing': {}, '@/lib/tv-status': {},
    '@/lib/player-registration': {}, '@/lib/device-token': {},
    '@/lib/scheduling': require('../src/lib/scheduling.ts'),
    'next/cache': { revalidatePath() { throw new Error('Revalidação sem sessão'); } },
  };
  let checked = 0;
  for (const name of ['tv', 'media', 'playlist', 'schedule']) {
    const actions = loadWithMocks(`../src/actions/${name}.ts`, mocks);
    for (const action of Object.values(actions)) {
      await assert.rejects(action(), /LOGIN_REQUIRED/);
      checked++;
    }
  }
  assert.equal(checked, 20);
});

test('horários rejeitam valores inválidos e permitem meia-noite no fim', () => {
  assert.equal(parseTime('24:00'), 1440);
  assert.equal(parseTime('09:30'), 570);
  for (const value of ['24:01', '9:00', '12:60', '', 'NaN']) assert.ok(Number.isNaN(parseTime(value)));
});
test('agenda usa São Paulo, início inclusivo e fim exclusivo', () => {
  assert.equal(resolveWeeklySchedule([slot], new Date('2026-09-07T11:59:59Z')).active, null);
  const start = resolveWeeklySchedule([slot], new Date('2026-09-07T12:00:00Z'));
  assert.equal(start.active.id, 'a');
  assert.equal(start.nextChangeAt, '2026-09-07T13:00:00.000Z');
  const end = resolveWeeklySchedule([slot], new Date('2026-09-07T13:00:00Z'));
  assert.equal(end.active, null);
  assert.equal(end.nextChangeAt, '2026-09-14T12:00:00.000Z');
});
test('bloco até 24:00 termina no dia seguinte e agenda vazia não tem próxima troca', () => {
  const result = resolveWeeklySchedule([{ ...slot, days: [0], startMinute: 1380, endMinute: 1440 }], new Date('2026-09-07T02:30:00Z'));
  assert.equal(result.nextChangeAt, '2026-09-07T03:00:00.000Z');
  assert.deepEqual(resolveWeeklySchedule([], new Date()), { active: null, next: null, nextChangeAt: null });
});
test('conflitos respeitam TV, dias, edição e blocos adjacentes', () => {
  const candidate = { ...slot, id: 'b', startMinute: 599, endMinute: 660 };
  assert.equal(findScheduleConflicts(candidate, [slot]).length, 1);
  for (const changes of [{ startMinute: 600 }, { tvId: 'other' }, { days: [2] }, { id: 'a' }]) {
    assert.equal(findScheduleConflicts({ ...candidate, ...changes }, [slot]).length, 0);
  }
});
test('reordenação rejeita duplicatas, omissões e itens de outra playlist', () => {
  assert.ok(isExactItemOrder(['a', 'b'], ['b', 'a']));
  for (const order of [['a'], ['a', 'a'], ['a', 'c'], ['a', 'b', 'c']]) assert.equal(isExactItemOrder(['a', 'b'], order), false);
  assert.ok(isExactItemOrder([], []));
});
test('validação rejeita IDs, nomes vazios e MIME ativo/não suportado', () => {
  assert.equal(idSchema.safeParse('invalid').success, false);
  assert.equal(nameSchema.safeParse('   ').success, false);
  assert.equal(nameSchema.parse(' Sala '), 'Sala');
  assert.equal(mediaKind('image/svg+xml'), null);
  assert.equal(mediaKind('text/html'), null);
  assert.equal(mediaKind('video/mp4'), 'video');
});
test('timeout continua ativo durante leitura do corpo JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({ ok: true, status: 200,
    json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
  }));
  await assert.rejects(fetchJsonWithTimeout('http://example.invalid', {}, 20), /aborted/);
});
test('JSON e cancelamento externo preservam comportamento', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    if (signal.aborted) throw new Error('aborted');
    return { ok: true, status: 200, json: async () => ({ paired: true }) };
  });
  assert.deepEqual(await fetchJsonWithTimeout('http://example.invalid'), { ok: true, status: 200, data: { paired: true } });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchJsonWithTimeout('http://example.invalid', { signal: controller.signal }), /aborted/);
});
