// Query vocabulary and matching rules preserved from the supplied standalone file.
export function prepareCatalog(records) { return records.map((d, i) => ({ ...d, i, hay: [d.art,d.item,d.comp,d.desc,d.fin,d.cat,d.note].join(' ').toLowerCase() })); }
const LEX = [
  [['트윌','능직','twill'], 'wv','트윌'], [['립스탑','립스톱','ripstop','rip'], 'wv','립스탑'],
  [['자카드','쟈가드','jacquard','jqd'], 'wv','자카드'], [['도비','dobby'], 'wv','도비'],
  [['평직','plain'], 'wv','평직'], [['스트라이프','줄무늬','stripe'], 'wv','스트라이프'], [['새틴','satin'], 'wv','새틴'],
  [['t400'], 'yn','T400'], [['t800'], 'yn','T800'], [['타슬란','taslan'], 'yn','타슬란'], [['듀스포','dewspo'], 'yn','듀스포'],
  [['하이엘라스틱','high elastic'], 'yn','하이엘라스틱'], [['하이스트레치','high stretch'], 'yn','하이스트레치'],
  [['dty'], 'yn','DTY'], [['aty'], 'yn','ATY'], [['실키','silk'], 'yn','실키'], [['메모리','memory'], 'yn','메모리'],
  [['나일론','nylon'], 'compHas','NYLON'], [['스판','spandex'], 'compHas','SP'], [['wool','울혼방','울 혼방','울혼','모직'], 'compHas','W'],
  [['스트레치','stretch'], 'txt','stretch'],
  [['발수','wr'], 'ft','발수(WR)'], [['하이포라','hypora'], 'ft','하이포라'],
  [['다운프루프','다운 프루프','down proof','downproof'], 'ft','다운프루프'],
  [['코팅','coating','c/t'], 'coat','코팅(C/T)'],
  [['오일시레'], 'ft','오일시레'], [['시레','cire'], 'cire','시레/오일시레'],
  [['피치','peach'], 'ft','피치'], [['크링클','쭈글','crumple'], 'ft','크링클'], [['워싱','washing'], 'ft','워싱'],
  [['엠보','embo'], 'ft','엠보'], [['프린트','나염','print'], 'print','프린트'], [['흡한','속건','wicking'], 'dry','흡한속건/속건'],
  [['밀키','milk'], 'ft','밀키코팅'],
  [['무광','매트','f/d','풀덜'], 'lu','무광(F/D)'], [['반광','s/d','세미덜'], 'lu','반광(S/D)'],
  [['칼라북','컬러북'], 'cb','칼라북 있음'],
];
// 업계 상식 기반 규칙은 넣지 않음: 엑셀에 적힌 값으로만 검색
const USE_HINTS = [];
const STRETCH_YN = ['T400','T800','하이엘라스틱','하이스트레치'];

export function parseQuery(q) {
  const conds = []; const hints = []; let rest = ' ' + q.toLowerCase() + ' ';
  const take = k => { rest = rest.split(k).join(' '); };
  // 숫자 조건
  let m;
  const G = '(?:g|그람|gsm|g\\/㎡|g\\/sqm)';
  if ((m = rest.match(new RegExp('(\\d+)\\s*' + G + '?\\s*[~\\-]\\s*(\\d+)\\s*' + G)))) { conds.push({t:'gmin',v:+m[1]},{t:'gmax',v:+m[2]}); take(m[0]); }
  while ((m = rest.match(new RegExp('(\\d+)\\s*' + G + '\\s*(이하|미만|아래|이상|초과|넘는|위)?')))) {
    const n = +m[1], w = m[2] || '';
    if (/이하|미만|아래/.test(w)) conds.push({t:'gmax',v:n});
    else if (/이상|초과|넘는|위/.test(w)) conds.push({t:'gmin',v:n});
    else conds.push({t:'gmin',v:Math.round(n*0.85)},{t:'gmax',v:Math.round(n*1.15)});
    take(m[0]);
  }
  if ((m = rest.match(/(\d{2})\s*(인치|inch|")/))) { conds.push({t:'wmin',v:+m[1]},{t:'wmax',v:+m[1]}); take(m[0]); }
  while ((m = rest.match(/\b(\d{2,3})\s*d\b/))) { conds.push({t:'den',v:+m[1]}); take(m[0]); }
  if ((m = rest.match(/\b(2[4-8])-([2-4])\b/))) { conds.push({t:'sec',v:m[0]}); take(m[0]); }
  else if ((m = rest.match(/(2[4-8])\s*번?\s*(차트|차트함|함)/))) { conds.push({t:'box',v:m[1]}); take(m[0]); }
  // 품번
  const arts = rest.match(/\b[a-z]{2,4}-[a-z]{0,3}\d{3,}[a-z0-9\-]*/g) || [];
  arts.forEach(a => { conds.push({t:'art',v:a}); take(a); });
  // 사전
  for (const [keys, t, v] of LEX) {
    const hit = keys.find(k => /^[a-z0-9\/ ]+$/.test(k) ? new RegExp('(^|[^a-z0-9])' + k.replace('/','\\/') + '($|[^a-z0-9])').test(rest) : rest.includes(k));
    if (hit) { if (!conds.some(c => c.t===t && c.v===v)) conds.push({t, v}); keys.forEach(k => { if (!/^[a-z0-9\/ ]+$/.test(k)) take(k); }); take(hit); }
  }
  for (const [keys, label, fn] of USE_HINTS) {
    const hit = keys.find(k => rest.includes(k));
    if (hit) { hints.push({label, fn}); keys.forEach(take); }
  }
  // 남은 영문/숫자 토큰은 텍스트 검색
  const words = (rest.match(/[a-z0-9][a-z0-9\/\.]*/g) || []).filter(w => w.length >= 2);
  const leftover = (rest.match(/[가-힣]{2,}/g) || []).filter(w => !/^(원단|가공|원사|혼용|혼방|중에|이고|있고|되어|된거|사이|위주|건데|폭인|함에|조직|찾아|만들|으로|에서|있는|좋은|추천|보여|해줘|주세요|이상|이하|정도|같은|싶어|원해|있는|것|거)/.test(w));
  return { conds, hints, words, leftover };
}

function condLabel(c) {
  const L = { gmin:'중량 ≥ #g', gmax:'중량 ≤ #g', wmin:'폭 ≥ #"', wmax:'폭 ≤ #"', den:'#D 원사', sec:'차트함 #', box:'차트함 #', art:'품번 #', compHas:'혼용 #' }[c.t];
  return L ? L.replace('#', String(c.v).toUpperCase()) : String(c.v);
}

export function passCond(d, c) {
  switch (c.t) {
    case 'wv': case 'yn': case 'ft': return d[c.t].includes(c.v);
    case 'lu': return d.lu === c.v;
    case 'compHas': return c.v === 'SP' ? /SP|SO/.test(d.comp) : d.comp.includes(c.v);
    case 'txt': return d.hay.includes(c.v);
    case 'coat': return d.ft.some(t => /코팅|하이포라|다운프루프/.test(t));
    case 'cire': return d.ft.some(t => t.includes('시레'));
    case 'print': return d.ft.some(t => t.includes('프린트'));
    case 'dry': return d.ft.some(t => /흡한|속건/.test(t));
    case 'cb': return d.cb;
    case 'gmin': return d.g != null && d.g >= c.v;
    case 'gmax': return d.g != null && d.g <= c.v;
    case 'wmin': return d.w != null && d.w >= c.v;
    case 'wmax': return d.w != null && d.w <= c.v;
    case 'den': return d.den.includes(c.v);
    case 'sec': return d.sec === c.v;
    case 'box': return d.box === c.v;
    case 'art': return d.art.toLowerCase().includes(c.v) || d.note.toLowerCase().includes(c.v);
  }
  return true;
}

// ---------- 후보 좁히기 (AI에 보낼 목록을 줄이는 용도, 화면에는 안 보임) ----------
export function searchCatalog(DATA, q) {
  if (!q) return { res: DATA.map(d => ({ d, s: 0 })) };
  const p = parseQuery(q);
  if (!p.conds.length && !p.words.length) return { res: [] };
  const out = [];
  for (const d of DATA) {
    if (!p.conds.every(c => passCond(d, c))) continue;
    let s = 0;
    for (const w of p.words) if (d.hay.includes(w)) s += 1;
    if (p.words.length && !s) continue;
    out.push({ d, s });
  }
  out.sort((a, b) => b.s - a.s);
  return { res: out };
}
