const $ = selector => document.querySelector(selector);
const query = $('#query');
const element = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
function showUsage(data) {
  $('#usage').textContent = `이번 서버 실행: AI 호출 ${data.calls}회 / 완료 ${data.completed}회 / 실패 ${data.failed}회 · 입력 ${data.inputTokens} 토큰 · 출력 ${data.outputTokens} 토큰`;
}
async function status() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    $('#setup').textContent = data.configured ? `AI 설정 완료 · ${data.model} · 호출 상한 ${data.maxCalls}회` : 'AI 키 미설정: .env에 GEMINI_API_KEY를 입력하고 서버를 다시 시작하세요. 공개 데이터 확인은 가능합니다.';
    showUsage(data);
  } catch { $('#setup').textContent = '서버 연결을 확인하세요.'; }
}
$('#examples').addEventListener('click', event => {
  if (event.target.tagName === 'BUTTON') { query.value = event.target.textContent; query.focus(); }
});
$('#search-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('#submit').disabled = true;
  $('#results').replaceChildren();
  $('#results').setAttribute('aria-busy', 'true');
  $('#message').textContent = '공개 데이터를 확인하고 AI가 관련 프로젝트를 찾고 있습니다…';
  try {
    const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.value }), signal: AbortSignal.timeout(90000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    $('#message').textContent = data.message || (data.matches.length ? '검색 결과입니다.' : '관련 사례를 확인할 수 없습니다.');
    for (const item of data.matches) {
      const card = element('article', '');
      if (item.thumbnail) {
        const img = document.createElement('img'); img.src = item.thumbnail; img.alt = item.title; img.loading = 'lazy';
        img.addEventListener('error', () => img.remove()); card.append(img);
      }
      card.append(element('h2', item.title), element('p', item.reason), element('blockquote', `공개 설명 근거: ${item.evidence}`));
      const link = element('a', '상세 페이지 보기 ↗'); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; card.append(link);
      $('#results').append(card);
    }
  } catch (error) { $('#message').textContent = error.name === 'TimeoutError' ? '요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.' : error.message || '검색에 실패했습니다.'; }
  finally { $('#submit').disabled = false; $('#results').setAttribute('aria-busy', 'false'); await status(); }
});
$('#load-data').addEventListener('click', async () => {
  $('#load-data').disabled = true; $('#data-status').textContent = '데이터를 불러오는 중…'; $('#catalog').replaceChildren();
  try {
    const response = await fetch('/api/projects'); const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    $('#data-status').textContent = `${data.count}개 프로젝트 연결 완료 (AI 호출 없음)`;
    for (const item of data.projects) {
      const li = document.createElement('li'); const link = element('a', item.title); link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link); $('#catalog').append(li);
    }
  } catch (error) { $('#data-status').textContent = error.message; }
  finally { $('#load-data').disabled = false; }
});
await status();
