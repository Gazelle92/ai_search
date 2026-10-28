const $ = id => document.getElementById(id);
let records = [];
let request = null;
let version = 0;
const element = (tag, text) => { const node = document.createElement(tag); node.textContent = String(text ?? ''); return node; };
function render(data) {
  $('count').textContent = `${data.length}개`;
  const fragment = document.createDocumentFragment();
  for (const record of data) {
    const row = document.createElement('tr'); row.id = `r${record.i}`;
    for (const key of ['sec','cat','pos','art','item','cr','desc','ww','fin','orig','cbr']) row.append(element('td', record[key]));
    fragment.append(row);
  }
  $('tb').replaceChildren(fragment);
}
async function status() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error();
    const data = await response.json();
    $('aiStatus').textContent = data.configured ? `AI 연결 준비 · ${data.model} · 이번 인스턴스 호출 ${data.usage.calls}/${data.maxCalls}회 · 입력 ${data.usage.inputTokens} / 출력 ${data.usage.outputTokens} 토큰` : 'AI 키 미설정: Vercel 환경변수에 GEMINI_API_KEY를 등록하고 Redeploy하세요.';
  } catch { $('aiStatus').textContent = '서버 상태를 확인하지 못했습니다. 연결 후 다시 시도하세요.'; }
}
$('f').addEventListener('submit', async event => {
  event.preventDefault();
  const query = $('q').value.trim();
  if (!query) { $('q').focus(); return; }
  if (request) return;
  const currentVersion = ++version;
  request = new AbortController();
  $('aiBtn').disabled = true; $('aiOut').hidden = false; $('aiOut').textContent = '원단 데이터를 바탕으로 추천하는 중…';
  try {
    const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.any([request.signal, AbortSignal.timeout(75000)]) });
    const data = await response.json();
    if (currentVersion !== version) return;
    if (!response.ok) throw new Error(data.message || '검색에 실패했습니다.');
    $('aiOut').replaceChildren(element('div', data.summary || (data.picks.length ? '추천 원단입니다.' : '데이터에서 확인 가능한 조건이 없습니다.')));
    if (data.picks.length) {
      const list = document.createElement('ol');
      for (const pick of data.picks) {
        const li = document.createElement('li'); li.append(element('b', pick.art), document.createTextNode(` ${pick.record.item} · ${pick.record.ww} · ${pick.record.fin} — ${pick.reason}`));
        list.append(li);
      }
      $('aiOut').append(list);
    }
    render(data.picks.map(pick => pick.record));
  } catch (error) {
    if (currentVersion === version) $('aiOut').textContent = error.name === 'TimeoutError' ? '요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.' : error.message || '검색에 실패했습니다.';
  } finally {
    if (currentVersion === version) { request = null; $('aiBtn').disabled = false; }
    await status();
  }
});
$('reset').addEventListener('click', () => {
  version++; request?.abort(); request = null; $('aiBtn').disabled = false; $('q').value = ''; $('aiOut').hidden = true; render(records); $('q').focus();
});
// Remove a legacy browser-saved key without reading or transmitting its value.
try { localStorage.removeItem('gemini_key'); } catch { /* Browser storage is optional. */ }
$('aiBtn').disabled = true;
try {
  const response = await fetch('/api/catalog'); if (!response.ok) throw new Error();
  records = (await response.json()).records; render(records); $('aiBtn').disabled = false;
} catch { $('count').textContent = '원단 목록을 불러오지 못했습니다. 페이지를 새로고침하세요.'; }
await status();
