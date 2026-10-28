import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { prepareCatalog } from './catalog.js';
import { recommend } from './recommend.js';

const catalog = prepareCatalog(JSON.parse(readFileSync(new URL('../data/fabrics.json', import.meta.url), 'utf8')));
const files = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/style.css', ['style.css', 'text/css']], ['/app.js', ['app.js', 'text/javascript']]]);
const messages = {
  KEY_MISSING: 'AI 키 미설정: Vercel 환경변수에 GEMINI_API_KEY를 등록하고 Redeploy하세요. 로컬에서는 .env에 저장 후 재시작하세요.',
  INVALID_QUERY: '검색어를 1~500자로 입력하세요.', BAD_BODY: '요청 형식이나 크기가 올바르지 않습니다.',
  FORBIDDEN: '허용되지 않은 요청입니다.', BUSY: '다른 검색이 진행 중입니다. 잠시 후 다시 검색하세요.',
  RATE_LIMIT: '분당 호출 제한에 도달했습니다. 잠시 후 다시 검색하세요.', CALL_LIMIT: '이 서버 인스턴스의 호출 상한에 도달했습니다.',
  AI_AUTH: 'Gemini API 키 또는 프로젝트의 API 접근 권한을 확인하세요.',
  AI_MODEL: 'Gemini 모델을 사용할 수 없습니다. Vercel의 GEMINI_MODEL 값을 확인하고 Redeploy하세요.',
  AI_QUOTA: 'Gemini 사용량 한도에 도달했습니다. AI Studio에서 할당량을 확인하세요.',
  AI_BUSY: 'Gemini 서버가 혼잡합니다. 잠시 후 다시 시도하세요.',
  AI_REQUEST: 'Gemini가 요청 설정을 지원하지 않습니다. 모델 설정을 확인하세요.',
  AI_BLOCKED: 'AI가 이 요청에 답변하지 못했습니다. 원단 조건을 구체적으로 입력해주세요.',
  AI_INCOMPLETE: 'AI 답변이 완료되지 않았습니다. 검색 조건을 좁혀서 다시 시도하세요.',
  INVALID_RESULT: 'AI 추천이 원본 데이터 검증을 통과하지 못했습니다. 조건을 구체적으로 입력하고 다시 시도하세요.',
  AI_TIMEOUT: 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.',
  AI_ERROR: 'AI 연결에 실패했습니다. 잠시 후 다시 시도하세요.',
};
export function createHandler({ apiKey = process.env.GEMINI_API_KEY?.trim(), model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  maxCalls = Number(process.env.MAX_CALLS || 30), search = recommend, deployed = Boolean(process.env.VERCEL) } = {}) {
  if (!Number.isInteger(maxCalls) || maxCalls < 1) throw new Error('MAX_CALLS must be a positive integer');
  const usage = { calls: 0, completed: 0, failed: 0, inputTokens: 0, outputTokens: 0 };
  let busy = false;
  const times = [];
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const send = (status, payload) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); };
    const fail = (status, code) => send(status, { code, message: messages[code] });
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && files.has(url.pathname)) {
        const [name, type] = files.get(url.pathname);
        const content = await readFile(new URL(`../public/${name}`, import.meta.url));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(content);
      }
      if (req.method === 'GET' && url.pathname === '/api/status') return send(200, { configured: Boolean(apiKey), model, maxCalls, count: catalog.length, usage });
      if (req.method === 'GET' && url.pathname === '/api/catalog') return send(200, { records: catalog.map(({ hay, ...record }) => record) });
      if (req.method !== 'POST' || url.pathname !== '/api/search') return send(404, { message: '찾을 수 없습니다.' });
      const origin = `${deployed ? 'https' : 'http'}://${req.headers.host}`;
      if (!req.headers['content-type']?.startsWith('application/json') || req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== origin)) return fail(403, 'FORBIDDEN');
      let raw = '';
      if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      else for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 4096) return fail(413, 'BAD_BODY'); }
      if (Buffer.byteLength(raw) > 4096) return fail(413, 'BAD_BODY');
      let body;
      try { body = JSON.parse(raw); } catch { return fail(400, 'BAD_BODY'); }
      const query = typeof body?.query === 'string' ? body.query.trim() : '';
      if (!query || query.length > 500) return fail(400, 'INVALID_QUERY');
      if (!apiKey) return fail(503, 'KEY_MISSING');
      if (busy) return fail(429, 'BUSY');
      const now = Date.now(); while (times.length && times[0] <= now - 60000) times.shift();
      if (times.length >= 5) return fail(429, 'RATE_LIMIT');
      if (usage.calls >= maxCalls) return fail(429, 'CALL_LIMIT');
      busy = true; times.push(now); usage.calls++;
      try {
        const result = await search({ catalog, query, apiKey, model, onUsage: value => { usage.inputTokens += value.inputTokens; usage.outputTokens += value.outputTokens; } });
        usage.completed++; return send(200, { ...result, usage });
      } catch (error) {
        usage.failed++;
        const code = error.name === 'TimeoutError' ? 'AI_TIMEOUT' : Object.hasOwn(messages, error.message) ? error.message : 'AI_ERROR';
        return fail(502, code);
      } finally { busy = false; }
    } catch { if (!res.headersSent) fail(500, 'AI_ERROR'); else res.end(); }
  };
}
