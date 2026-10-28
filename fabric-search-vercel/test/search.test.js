import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { prepareCatalog, searchCatalog } from '../lib/catalog.js';
import { recommend, selectCandidates, validateResult } from '../lib/recommend.js';
import { createHandler } from '../lib/handler.js';

const source = JSON.parse(readFileSync(new URL('../data/fabrics.json', import.meta.url)));
const catalog = prepareCatalog(source);
const fixture = prepareCatalog([
  { art: 'TEST-001', item: 'POLY TASLAN', comp: 'POLY 100%', cr: 'POLY 100%', desc: '75D*160D', ww: '57" 80G/SQM', fin: 'WR', ft: ['발수(WR)'], wv: [], yn: ['타슬란'], lu: '', den: [75,160], w: 57, g: 80, cat: 'TASLAN', note: '', orig: '', cbr: '', sec: '24-2', box: '24', pos: '1' },
  { art: 'TEST-002', item: 'NYLON', comp: 'NYLON 100%', cr: 'NYLON 100%', desc: '20D*20D', ww: '57" 120G/SQM', fin: '', ft: [], wv: [], yn: ['나일론'], lu: '', den: [20], w: 57, g: 120, cat: 'NYLON', note: '', orig: '', cbr: '', sec: '25-2', box: '25', pos: '2' },
]);
const pick = { art: 'TEST-001', reason: '발수 가공, 중량 80g', evidence: '57" 80G/SQM' };
test('catalog import retains all records, unique ART NO. and original specifications', () => {
  assert.equal(catalog.length, 668);
  assert.equal(new Set(catalog.map(record => record.art)).size, source.length);
  assert.deepEqual(catalog.map(({ i, hay, ...record }) => record), source);
});
test('original query vocabulary narrows candidates by actual fields', () => {
  assert.deepEqual(searchCatalog(fixture, '발수 100g 이하').res.map(row => row.d.art), ['TEST-001']);
  assert.deepEqual(selectCandidates(fixture, '나일론').map(row => row.art), ['TEST-002']);
  assert.equal(selectCandidates(fixture, '재고 알려줘').length, 2);
});
test('server rejects invented ART NO., duplicated picks, fabricated evidence and conflicting conditions', () => {
  assert.equal(validateResult({ summary: '추천', picks: [pick] }, fixture, '100g 이하').picks[0].record.art, 'TEST-001');
  for (const picks of [[{ ...pick, art: 'FAKE' }], [pick, pick], Array(7).fill(pick), [{ ...pick, evidence: '재고 100개' }]]) {
    assert.throws(() => validateResult({ summary: '추천', picks }, fixture, '100g 이하'), /INVALID_RESULT/);
  }
  assert.throws(() => validateResult({ summary: '추천', picks: [pick] }, fixture, '100g 이상'), /INVALID_RESULT/);
  assert.equal(validateResult({ summary: '재고는 데이터에 없음', picks: [] }, fixture, '재고').picks.length, 0);
});
test('Gemini adapter uses header credentials, structured output and real response usage', async () => {
  let usage;
  const result = await recommend({ catalog: fixture, query: '발수', apiKey: 'test-secret', model: 'gemini-3.5-flash-lite', onUsage: value => { usage = value; }, fetchImpl: async (url, options) => {
    assert.equal(url.includes('test-secret'), false);
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseJsonSchema.properties.picks.maxItems, 6);
    assert.equal(body.contents[0].parts[0].text.includes('TEST-002'), false);
    return { ok: true, json: async () => ({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, thoughtsTokenCount: 2 }, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ summary: '추천', picks: [pick] }) }] } }] }) };
  } });
  assert.equal(result.picks[0].art, 'TEST-001');
  assert.deepEqual(usage, { inputTokens: 100, outputTokens: 32 });
});
test('Gemini model, quota, unavailable and incomplete responses remain distinct', async () => {
  for (const [status, code] of [[404,'AI_MODEL'],[429,'AI_QUOTA'],[503,'AI_BUSY'],[403,'AI_AUTH']]) {
    await assert.rejects(recommend({ catalog: fixture, query: '발수', apiKey: 'test', model: 'test', fetchImpl: async () => ({ ok: false, status }) }), new RegExp(code));
  }
  await assert.rejects(recommend({ catalog: fixture, query: '발수', apiKey: 'test', model: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }) }) }), /AI_INCOMPLETE/);
});
test('Vercel handler accepts HTTPS parsed body and does not expose key or raw errors', async () => {
  const handler = createHandler({ apiKey: 'private-test', deployed: true, maxCalls: 1, search: async ({ onUsage }) => { onUsage({ inputTokens: 20, outputTokens: 5 }); return { summary: '없음', picks: [] }; } });
  async function invoke(url, method = 'GET', body, origin) {
    let code, output;
    await handler({ url, method, body, headers: { host: 'fabric.vercel.app', origin, 'content-type': 'application/json' } }, {
      setHeader() {}, writeHead(status) { code = status; }, end(value) { output = JSON.parse(value); },
    });
    return { code, output };
  }
  assert.equal((await invoke('/api/search', 'POST', { query: '발수' }, 'https://other.example')).code, 403);
  assert.equal((await invoke('/api/search', 'POST', { query: 'a'.repeat(501) })).code, 400);
  assert.equal((await invoke('/api/search', 'POST', { query: '발수' }, 'https://fabric.vercel.app')).code, 200);
  assert.equal((await invoke('/api/search', 'POST', { query: '발수' })).output.code, 'CALL_LIMIT');
  const status = await invoke('/api/status');
  assert.equal(status.output.usage.inputTokens, 20);
  assert.equal(JSON.stringify(status).includes('private-test'), false);
  assert.equal((await invoke('/.env')).code, 404);
});
test('standalone server serves assets and source data with key missing and makes no AI request', async () => {
  const server = http.createServer(createHandler({ apiKey: '', search: () => { throw new Error('must not run'); } }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await (await fetch(url)).text();
    assert.equal(page.includes('gkey'), false);
    assert.equal(page.includes('generativelanguage'), false);
    assert.equal(page.includes('src="/app.js"'), true);
    assert.equal((await (await fetch(`${url}/api/catalog`)).json()).records.length, source.length);
    assert.equal((await fetch(`${url}/style.css`)).status, 200);
    const response = await fetch(`${url}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '발수' }) });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'KEY_MISSING');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
