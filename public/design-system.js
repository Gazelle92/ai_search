import { initMotion } from './motion.js';

const response = await fetch('/design-tokens.json');
const { tokens } = await response.json();
const element = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
for (const [name, value] of Object.entries(tokens).filter(([key]) => key.startsWith('space-')).sort((a,b) => parseFloat(a[1])-parseFloat(b[1]))) {
  const button = element('button', ''); button.type = 'button'; button.className = 'space-row';
  const bar = element('span', ''); bar.className = 'space-bar'; bar.style.width = value;
  const size = element('span', value); size.className = 'space-size';
  button.append(element('code', `--${name}`), bar, size);
  button.addEventListener('click', async () => { try { await navigator.clipboard.writeText(`var(--${name})`); document.querySelector('#token-status').textContent = `var(--${name}) 복사 완료`; } catch { document.querySelector('#token-status').textContent = `복사할 값: var(--${name})`; } });
  document.querySelector('#space-scale').append(button);
}
for (const name of ['paper','ink','accent','secondary','line']) {
  const item = element('div', ''); item.className = 'color-item';
  const swatch = element('span', ''); swatch.className = 'swatch'; swatch.style.backgroundColor = tokens[`color-${name}`];
  item.append(swatch, element('span', name), element('code', tokens[`color-${name}`]));
  document.querySelector('#color-scale').append(item);
}
document.querySelector('#sample-button').addEventListener('click', () => { document.querySelector('#sample-status').textContent = '기준 버튼입니다. 같은 토큰을 실제 시안에서도 사용합니다.'; });
initMotion();
