import * as prismic from '@prismicio/client';
import { getProjects } from '../lib/projects.js';

// Public reads only. This script never loads .env or calls Gemini.
const client = prismic.createClient('hummman-pt');
const docs = await client.getAllByType('workpage');
console.log('Public field types:', Object.fromEntries(Object.entries(docs[0]?.data || {}).map(([key, value]) => [key, Array.isArray(value) ? 'array' : typeof value])));
const projects = await getProjects();
console.log(`Projects: ${projects.length}`);
for (const p of projects) console.log(`${p.title} | ${p.url}`);
for (const p of [projects[0], projects.find(p => /haegin/i.test(p.title))].filter(Boolean)) {
  const response = await fetch(p.url, { signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  console.log(`Public page: ${p.url} -> HTTP ${response.status}; title in initial HTML: ${html.includes(p.title)}`);
  if (!response.ok) process.exitCode = 1;
}
console.log('Note: client-rendered pages require browser verification of the selected title. HTTP 200 alone does not verify the mapping.');
