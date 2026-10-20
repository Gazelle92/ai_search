import * as prismic from '@prismicio/client';
import { convert } from 'html-to-text';

export function plainText(value) {
  const raw = typeof value === 'string' ? value : Array.isArray(value)
    ? value.map(block => typeof block?.text === 'string' ? block.text : '').join(' ') : '';
  return convert(raw, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }] }).replace(/\s+/g, ' ').trim();
}

export function safeImage(url) {
  try { return new URL(url).protocol === 'https:' ? url : null; } catch { return null; }
}

export function normalizeProjects(documents) {
  // Keep the exact Works.js fallback, descending comparator and stable tie order.
  return documents.slice().sort((a, b) => {
    const aOrder = a.data?.order ? Number(a.data.order) : 999999;
    const bOrder = b.data?.order ? Number(b.data.order) : 999999;
    return bOrder - aOrder;
  }).map((doc, index) => ({
    id: doc.id,
    ...Object.fromEntries(['title', 'client', 'project', 'service', 'description'].map(key => [key, plainText(doc.data?.[key])])),
    thumbnail: safeImage(doc.data?.list_thumbnail?.url),
    url: `https://www.hummman.com/works/${index + 1}`,
  }));
}

export async function getProjects() {
  const client = prismic.createClient('hummman-pt', {
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }),
  });
  const docs = await client.getAllByType('workpage');
  if (!docs.length) throw new Error('EMPTY_CATALOG');
  return normalizeProjects(docs);
}
