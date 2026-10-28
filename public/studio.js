import { initMotion, initServiceMotion, animateProjectLayout } from './motion.js';

const dialog = document.querySelector('#contact-dialog');
document.querySelectorAll('[data-contact]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
const menu = document.querySelector('#mobile-menu');
const menuButton = document.querySelector('.menu-btn');
menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기'); menu.hidden = !open; });
menu.querySelectorAll('a,button').forEach(link => link.addEventListener('click', () => { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '메뉴 열기'); }));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  animateProjectLayout(() => {
  document.querySelectorAll('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-category]').forEach(project => { project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter; });
  document.querySelector('.work-grid').classList.toggle('filtered', button.dataset.filter !== 'all');
  });
}));
initServiceMotion();
const clock = () => { document.querySelector('#seoul-time').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()); };
clock(); setInterval(clock, 1000);
document.querySelector('#brief-form').addEventListener('submit', event => { event.preventDefault(); const brief = document.querySelector('#brief').value.trim(); if (!brief) return; document.querySelector('#brief-preview').textContent = `프로젝트 브리프\n\n${brief}`; document.querySelector('#brief-form').hidden = true; document.querySelector('#brief-result').hidden = false; });
document.querySelector('#copy-brief').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.querySelector('#brief-preview').textContent); document.querySelector('#copy-status').textContent = '브리프를 복사했습니다.'; } catch { document.querySelector('#copy-status').textContent = '위 브리프 내용을 선택해 복사해주세요.'; } });


initMotion();
