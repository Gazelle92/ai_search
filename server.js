import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getProjects } from './lib/projects.js';
import { recommend } from './lib/search.js';

const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
assets.set('/studio', ['studio.html', 'text/html']);
assets.set('/studio.html', ['studio.html', 'text/html']);
assets.set('/studio.css', ['studio.css', 'text/css']);
assets.set('/studio.js', ['studio.js', 'text/javascript']);
assets.set('/motion.js', ['motion.js', 'text/javascript']);
assets.set('/motion.css', ['motion.css', 'text/css']);
assets.set('/design-system.html', ['design-system.html', 'text/html']);
assets.set('/design-system.css', ['design-system.css', 'text/css']);
assets.set('/design-system.js', ['design-system.js', 'text/javascript']);
assets.set('/design-tokens.css', ['design-tokens.css', 'text/css']);
assets.set('/design-tokens.json', ['design-tokens.json', 'application/json']);
for (const file of ['ttt.jpg', 'mucl.jpg', 'cosmax.jpg', 'tsf.jpg', 'chrome.svg', 'manrope.woff2']) {
  const type = file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.svg') ? 'image/svg+xml' : 'font/woff2';
  assets.set(`/concept/${file}`, [`concept/${file}`, type]);
}
const messages = {
  KEY_MISSING: '서버의 .env에 GEMINI_API_KEY를 설정하고 다시 시작하세요.',
  DATA_ERROR: 'Prismic 프로젝트를 불러오지 못했습니다. 잠시 후 다시 시도하세요.',
  INVALID_QUERY: '질문을 1~500자로 입력하세요.', INVALID_BODY: '올바른 JSON 요청이 필요합니다.',
  RATE_LIMIT: '호출 제한에 도달했습니다. 잠시 후 다시 시도하세요.',
  CALL_LIMIT: '이번 서버 실행의 AI 호출 상한에 도달했습니다.',
  BUSY: '다른 검색이 진행 중입니다. 완료 후 다시 시도하세요.',
  AI_RATE_LIMIT: 'Gemini 사용량 또는 호출 한도를 확인하세요.',
  AI_MODEL: '설정된 Gemini 모델을 사용할 수 없습니다. .env의 GEMINI_MODEL을 확인하세요.',
  AI_AUTH: 'Gemini API 키 또는 해당 프로젝트의 API 접근 권한을 확인하세요.',
  AI_BAD_REQUEST: 'Gemini가 요청 설정을 지원하지 않습니다. 모델과 응답 설정을 확인하세요.',
  AI_UNAVAILABLE: 'Gemini 서버가 일시적으로 혼잡합니다. 잠시 후 다시 검색하세요.',
  AI_INCOMPLETE: 'AI 응답이 완료되지 않았습니다. 질문을 줄이거나 다시 시도하세요.',
  INVALID_AI_RESULT: 'AI 추천의 프로젝트 ID 또는 원문 근거 검증에 실패했습니다. 다시 시도하세요.',
  AI_ERROR: 'AI 응답을 처리하지 못했습니다. API 키·결제·모델 설정을 확인하거나 다시 시도하세요.',
};

export function createHandler({ apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  maxCalls = Number(process.env.MAX_CALLS || 30), loadProjects = getProjects, search = recommend } = {}) {
  if (!Number.isInteger(maxCalls) || maxCalls < 1) throw new Error('MAX_CALLS must be a positive integer');
  const stats = { calls: 0, completed: 0, failed: 0, inputTokens: 0, outputTokens: 0 };
  const times = [];
  let busy = false;
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const fail = (res, status, code) => json(res, status, { code, message: messages[code] });
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https:; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && assets.has(path)) {
        const [file, type] = assets.get(path);
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        return res.end(await readFile(new URL(`./public/${file}`, import.meta.url)));
      }
      if (req.method === 'GET' && path === '/api/status') return json(res, 200, { configured: Boolean(apiKey), model, maxCalls, ...stats });
      if (req.method === 'GET' && path === '/api/projects') {
        try { const projects = await loadProjects(); return json(res, 200, { count: projects.length, projects }); }
        catch { return fail(res, 502, 'DATA_ERROR'); }
      }
      if (req.method !== 'POST' || path !== '/api/search') return json(res, 404, { message: '찾을 수 없습니다.' });
      // JSON-only same-origin requests prevent cross-site forms spending local API credits.
      const protocol = process.env.VERCEL ? 'https' : 'http';
      if (req.headers['sec-fetch-site'] === 'cross-site' || !req.headers['content-type']?.startsWith('application/json') ||
          (req.headers.origin && req.headers.origin !== `${protocol}://${req.headers.host}`)) return json(res, 403, { message: '허용되지 않은 요청입니다.' });
      let raw = '', bytes = 0;
      if (req.body !== undefined) {
        raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > 4096) return fail(res, 413, 'INVALID_BODY');
      } else for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) { fail(res, 413, 'INVALID_BODY'); return; }
        raw += chunk;
      }
      let body;
      try { body = JSON.parse(raw); } catch { return fail(res, 400, 'INVALID_BODY'); }
      const query = typeof body?.query === 'string' ? body.query.trim() : '';
      if (!query || query.length > 500) return fail(res, 400, 'INVALID_QUERY');
      if (!apiKey) return fail(res, 503, 'KEY_MISSING');
      if (busy) return fail(res, 429, 'BUSY');
      const now = Date.now();
      while (times.length && times[0] <= now - 60000) times.shift();
      if (times.length >= 5) return fail(res, 429, 'RATE_LIMIT');
      if (stats.calls >= maxCalls) return fail(res, 429, 'CALL_LIMIT');
      busy = true;
      try {
        let projects;
        try { projects = await loadProjects(); } catch { return fail(res, 502, 'DATA_ERROR'); }
        // Refuse unexpectedly large catalogs instead of silently truncating evidence.
        if (!projects.length || JSON.stringify(projects).length > 160000) return fail(res, 502, 'DATA_ERROR');
        times.push(Date.now()); stats.calls++;
        try {
          const result = await search({ query, projects, apiKey, model, onUsage: usage => {
            stats.inputTokens += usage.inputTokens; stats.outputTokens += usage.outputTokens;
          } });
          stats.completed++;
          return json(res, 200, { ...result, model, usage: { ...stats } });
        } catch (error) {
          stats.failed++;
          return fail(res, 502, Object.hasOwn(messages, error.message) ? error.message : 'AI_ERROR');
        }
      } finally { busy = false; }
    } catch { if (!res.headersSent) json(res, 500, { message: '요청 처리에 실패했습니다.' }); else res.end(); }
  };
}

export function createApp(options) {
  return http.createServer(createHandler(options));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3100);
  const server = createApp();
  server.requestTimeout = 10000;
  server.listen(port, '127.0.0.1', () => console.log(`AI portfolio demo: http://127.0.0.1:${port}`));
}
