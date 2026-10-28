// Shared Good Measure motion primitives. No dependencies or animation loop when idle.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let enabled = !reduced.matches;
let observer;
let artFrame = 0;
const animations = new Set();
const detailsState = new WeakMap();

const duration = (name, fallback) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;
const track = animation => {
  animations.add(animation);
  animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  return animation;
};
const readText = element => {
  const copy = element.cloneNode(true);
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  copy.querySelectorAll('.contact-arrow').forEach(arrow => arrow.remove());
  if (element.tagName === 'H1') [...copy.children].forEach(line => line.append('\n'));
  return copy.textContent.trim();
};

function prepareText(element) {
  if (element.dataset.motionReady) return;
  const text = readText(element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.textContent.trim() && !node.parentElement.closest('[data-no-split], .contact-arrow') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;
  const stagger = duration('--motion-word-stagger', 55);
  const cap = duration('--motion-stagger-cap', 440);
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const word of node.textContent.split(/(\s+)/u)) {
      if (!word) continue;
      if (/^\s+$/u.test(word)) { fragment.append(document.createTextNode(word)); continue; }
      // Keep word boundaries intact, including when animating individual characters.
      const mask = document.createElement('span');
      mask.className = 'motion-mask';
      mask.setAttribute('aria-hidden', 'true');
      const pieces = element.dataset.motion === 'chars' ? (segmenter ? [...segmenter.segment(word)].map(part => part.segment) : Array.from(word)) : [word];
      for (const piece of pieces) {
        const inner = document.createElement('span');
        inner.className = 'motion-word';
        inner.textContent = piece;
        inner.style.setProperty('--word-delay', `${Math.min(index++ * stagger, cap)}ms`);
        mask.append(inner);
      }
      fragment.append(mask);
    }
    node.replaceWith(fragment);
  }
  // One continuous accessible phrase; visual fragments remain silent to screen readers.
  for (const child of element.children) child.setAttribute('aria-hidden', 'true');
  const accessible = document.createElement('span');
  accessible.className = 'motion-sr';
  accessible.textContent = text;
  element.prepend(accessible);
  element.classList.add('motion-text');
  element.dataset.motionReady = 'true';
}

function reveal(element) {
  if (!enabled || element.classList.contains('is-revealed')) return;
  requestAnimationFrame(() => element.classList.add('is-revealed'));
}

export function replayMotion(scope = document) {
  if (!enabled) return;
  const elements = [...scope.querySelectorAll('[data-motion-ready]')];
  elements.forEach(element => element.classList.remove('is-revealed'));
  // A fresh frame keeps replay deterministic without text re-splitting.
  requestAnimationFrame(() => requestAnimationFrame(() => elements.forEach(reveal)));
}

export function animateProjectLayout(change) {
  const cards = [...document.querySelectorAll('.project')];
  const before = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
  change();
  if (!enabled) return;
  for (const card of cards.filter(item => !item.hidden)) {
    const after = card.getBoundingClientRect();
    const previous = before.get(card);
    card.querySelectorAll('[data-motion-ready]').forEach(item => item.classList.add('is-revealed'));
    track(card.animate(previous ? [
      { transform: `translate(${previous.left - after.left}px, ${previous.top - after.top}px)` },
      { transform: 'translate(0, 0)' },
    ] : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], {
      duration: duration('--motion-layout', 500), easing: 'cubic-bezier(.22,1,.36,1)',
    }));
  }
}

function toggleDetail(detail, open) {
  const previous = detailsState.get(detail);
  const height = detail.getBoundingClientRect().height;
  if (previous?.animation) previous.animation.cancel();
  if (!enabled) { detail.open = open; detail.style.removeProperty('overflow'); return; }
  detail.open = true;
  const summaryHeight = detail.querySelector('summary').getBoundingClientRect().height;
  const targetHeight = open ? detail.scrollHeight : summaryHeight;
  detail.style.overflow = 'clip';
  const animation = track(detail.animate([{ height: `${height}px` }, { height: `${targetHeight}px` }], {
    duration: duration('--motion-layout', 500), easing: 'cubic-bezier(.22,1,.36,1)',
  }));
  detailsState.set(detail, { open, animation });
  animation.onfinish = () => {
    if (detailsState.get(detail)?.animation !== animation) return;
    detail.open = open;
    detail.style.removeProperty('overflow');
    detailsState.set(detail, { open, animation: null });
  };
}

export function initServiceMotion() {
  const items = [...document.querySelectorAll('.service-list details')];
  for (const detail of items) {
    detailsState.set(detail, { open: detail.open, animation: null });
    detail.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      const open = !detailsState.get(detail).open;
      if (open) items.filter(item => item !== detail).forEach(item => {
        if (item.open) toggleDetail(item, false);
      });
      toggleDetail(detail, open);
    });
  }
}

function initRollLabels(root) {
  root.querySelectorAll('[data-roll]').forEach(button => {
    const textNode = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!textNode) return;
    const mask = document.createElement('span'); mask.className = 'roll-mask';
    const original = document.createElement('span'); original.textContent = textNode.textContent.trim();
    const duplicate = original.cloneNode(true); duplicate.className = 'roll-copy'; duplicate.setAttribute('aria-hidden', 'true');
    mask.append(original, duplicate); textNode.replaceWith(mask);
  });
}

function initPointerMotion(root) {
  root.querySelectorAll('[data-magnetic]').forEach(button => {
    let rect;
    button.addEventListener('pointerenter', () => { rect = button.getBoundingClientRect(); });
    button.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches || !rect) return;
      button.style.setProperty('--magnet-x', `${(event.clientX - rect.left - rect.width / 2) * .1}px`);
      button.style.setProperty('--magnet-y', `${(event.clientY - rect.top - rect.height / 2) * .12}px`);
    });
    button.addEventListener('pointerleave', () => { button.style.setProperty('--magnet-x', '0px'); button.style.setProperty('--magnet-y', '0px'); });
  });
  root.querySelectorAll('.project-image').forEach(image => {
    image.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches) return;
      const rect = image.getBoundingClientRect();
      image.style.setProperty('--hover-x', `${Math.max(64, Math.min(rect.width - 64, event.clientX - rect.left))}px`);
      image.style.setProperty('--hover-y', `${Math.max(64, Math.min(rect.height - 64, event.clientY - rect.top))}px`);
    });
    image.addEventListener('pointerleave', () => { image.style.removeProperty('--hover-x'); image.style.removeProperty('--hover-y'); });
  });
  const hero = root.querySelector('.hero');
  const art = root.querySelector('.hero-art');
  if (hero && art) {
    hero.addEventListener('pointermove', event => {
      if (!enabled || !finePointer.matches) return;
      cancelAnimationFrame(artFrame);
      artFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        art.style.setProperty('--pointer-x', `${((event.clientX - rect.left) / rect.width - .5) * 18}px`);
        art.style.setProperty('--pointer-y', `${((event.clientY - rect.top) / rect.height - .5) * 18}px`);
      });
    });
    hero.addEventListener('pointerleave', () => { cancelAnimationFrame(artFrame); art.style.setProperty('--pointer-x', '0px'); art.style.setProperty('--pointer-y', '0px'); });
  }
}

export function initMotion(root = document) {
  try { enabled = !reduced.matches && localStorage.getItem('good-measure:motion') !== 'off'; } catch { /* Storage is optional. */ }
  const elements = [...root.querySelectorAll('[data-motion]')];
  for (const element of elements) {
    if (['words', 'chars'].includes(element.dataset.motion)) prepareText(element);
    else element.dataset.motionReady = 'true';
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-in-view', entry.isIntersecting);
      if (entry.isIntersecting) reveal(entry.target);
        else if (entry.target.hasAttribute('data-motion-repeat')) entry.target.classList.remove('is-revealed');
      }
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
    elements.forEach(element => observer.observe(element));
    root.querySelectorAll('.ticker, .hero-art').forEach(element => observer.observe(element));
  } else elements.forEach(element => element.classList.add('is-revealed'));

  const preference = root.querySelector('[data-motion-toggle]');
  function syncPreference() {
    if (reduced.matches) enabled = false;
    document.documentElement.classList.toggle('motion-enabled', enabled);
    document.documentElement.classList.toggle('motion-off', !enabled);
    if (!enabled) {
      elements.forEach(element => element.classList.add('is-revealed'));
      animations.forEach(animation => animation.cancel());
      document.querySelectorAll('.service-list details').forEach(detail => {
        const state = detailsState.get(detail); if (state) { detail.open = state.open; detail.style.removeProperty('overflow'); }
      });
    }
    if (preference) {
      preference.textContent = enabled ? 'Motion: on' : 'Motion: off';
      preference.setAttribute('aria-pressed', String(enabled));
    }
  }
  preference?.addEventListener('click', () => {
    enabled = !enabled && !reduced.matches;
    try { localStorage.setItem('good-measure:motion', enabled ? 'on' : 'off'); } catch { /* No persistence required. */ }
    syncPreference();
  });
  reduced.addEventListener('change', () => {
    try { enabled = !reduced.matches && localStorage.getItem('good-measure:motion') !== 'off'; } catch { enabled = !reduced.matches; }
    syncPreference();
  });
  initRollLabels(root);
  initPointerMotion(root);
  syncPreference();
  root.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => {
    const target = root.querySelector(button.dataset.replay);
    if (target) replayMotion(target);
  }));

  const progress = root.querySelector('.scroll-progress');
  const hero = root.querySelector('.hero');
  const art = root.querySelector('.hero-art');
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    const range = document.documentElement.scrollHeight - innerHeight;
    progress?.style.setProperty('--scroll-progress', String(range > 0 ? Math.max(0, Math.min(1, scrollY / range)) : 0));
    if (enabled && finePointer.matches && hero && art) {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom >= 0) art.style.setProperty('--scroll-y', `${Math.min(28, Math.max(0, -rect.top * .05))}px`);
    }
  };
  const requestScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  new ResizeObserver(requestScroll).observe(document.body);
  updateScroll();
  return { replay: replayMotion };
}
