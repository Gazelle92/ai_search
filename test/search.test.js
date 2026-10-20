import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProjects, plainText } from '../lib/projects.js';
import { validateResult, recommend } from '../lib/search.js';
import { createApp } from '../server.js';

const docs = [
  { id: 'low', data: { title: 'Low', order: '1' } },
  { id: 'game', data: { title: 'Game', order: '5', description: '<p>게임 회사 홈페이지</p>', service: 'Design, Development' } },
  { id: 'missing', data: { title: 'Missing' } },
];
const projects = normalizeProjects(docs);
test('matches legacy descending order including missing and zero fallback', () => {
  assert.deepEqual(projects.map(p => p.id), ['missing', 'game', 'low']);
  assert.equal(projects[1].url, 'https://www.hummman.com/works/2');
  assert.equal(normalizeProjects([{ id: 'zero', data: { order: 0 } }, ...docs])[0].id, 'zero');
});
test('normalizes HTML, entities, rich text and unsafe image URLs', () => {
  assert.equal(plainText('<p>A &amp; B</p><script>bad()</script>'), 'A & B');
  assert.equal(plainText([{ text: '안녕' }, { text: '세상' }]), '안녕 세상');
  assert.equal(normalizeProjects([{ id: 'x', data: { list_thumbnail: { url: 'javascript:alert(1)' } } }])[0].thumbnail, null);
});
test('rejects fabricated IDs, duplicate IDs, excess results and fabricated evidence', () => {
  const match = { id: 'game', reason: '게임 회사 사례', evidence: '게임 회사' };
  assert.equal(validateResult({ message: '', matches: [match] }, projects).matches[0].title, 'Game');
  for (const matches of [[{ ...match, id: 'fake' }], [match, match], [match, match, match, match], [{ ...match, evidence: '매출 200% 증가' }]]) {
    assert.throws(() => validateResult({ message: '', matches }, projects));
  }
  assert.equal(validateResult({ message: '확인 불가', matches: [] }, projects).matches.length, 0);
});
test('Gemini request excludes images and URLs, accounts usage and checks completion', async () => {
  let usage;
  const fakeFetch = async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-only');
    assert.equal(url.includes('test-only'), false);
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseJsonSchema.properties.matches.maxItems, 3);
    assert.equal(body.contents[0].parts[0].text.includes('https://'), false);
    return { ok: true, json: async () => ({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 }, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ message: '확인 불가', matches: [] }) }] } }] }) };
  };
  await recommend({ query: '비용?', projects, apiKey: 'test-only', model: 'gemini-3.5-flash-lite', fetchImpl: fakeFetch, onUsage: value => { usage = value; } });
  assert.deepEqual(usage, { inputTokens: 100, outputTokens: 20 });
  await assert.rejects(recommend({ query: 'test', projects, apiKey: 'test-only', model: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'incomplete' }) }) }), /AI_INCOMPLETE/);
});

async function withServer(options, callback) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, query) => fetch(`${url}/api/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
test('missing key and invalid input never call AI; secrets and env are not served', async () => {
  await withServer({ apiKey: '', loadProjects: async () => projects, search: () => { throw new Error('must not run'); } }, async url => {
    assert.equal((await post(url, '게임')).status, 503);
    assert.equal((await post(url, ' ')).status, 400);
    assert.equal((await post(url, 'a'.repeat(501))).status, 400);
    assert.equal((await fetch(`${url}/.env`)).status, 404);
    assert.equal((await (await fetch(`${url}/api/projects`)).json()).count, 3);
  });
});
test('request limit, failure state and usage are served without paid requests', async () => {
  await withServer({ apiKey: 'test-secret', maxCalls: 1, loadProjects: async () => projects, search: async ({ onUsage }) => {
    onUsage({ inputTokens: 12, outputTokens: 4 }); return { message: '없음', matches: [] };
  } }, async url => {
    assert.equal((await post(url, '게임')).status, 200);
    assert.equal((await post(url, '게임')).status, 429);
    const status = await (await fetch(`${url}/api/status`)).json();
    assert.equal(status.inputTokens, 12); assert.equal(status.calls, 1);
    assert.equal(JSON.stringify(status).includes('test-secret'), false);
  });
  await withServer({ apiKey: 'test', loadProjects: async () => { throw new Error('private detail'); } }, async url => {
    const response = await post(url, '게임'); assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'DATA_ERROR');
  });
  await withServer({ apiKey: 'test', loadProjects: async () => projects, search: async () => { throw new Error('secret detail'); } }, async url => {
    assert.equal((await (await post(url, '게임')).json()).code, 'AI_ERROR');
  });
});
