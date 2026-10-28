import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = process.argv.slice(2).length ? process.argv.slice(2).map(p => path.resolve(p)) : [
  path.resolve(workspace, '../../hummman_website/src'),
  path.resolve(workspace, '../template_1/template_1/src'),
  path.resolve(workspace, '../hummman_intro/css'),
];
const excluded = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor']);
async function files(dir) {
  const result = [];
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...await files(full));
    else if (/\.(css|scss)$/.test(item.name)) {
      // Avoid counting a compiled CSS copy when its SCSS source is available.
      if (item.name.endsWith('.css') && await fs.access(full.replace(/\.css$/, '.scss')).then(() => true, () => false)) continue;
      result.push(full);
    }
  }
  return result;
}
const report = { method: 'Source declaration inventory, not computed layout. Comments stripped; compiled CSS duplicates excluded. Frequency is evidence, not a recommendation.', projects: [] };
for (const root of roots) {
  const label = path.basename(path.dirname(root));
  const entry = { project: label, files: 0, declarations: 0, fontSizes: [], spacing: [], breakpoints: [], families: [] };
  const counts = { fontSizes: new Map(), spacing: new Map(), breakpoints: new Map(), families: new Map() };
  const add = (group, value, file, line) => {
    const item = counts[group].get(value) || { value, count: 0, examples: [] };
    item.count++;
    if (item.examples.length < 3) item.examples.push({ file: path.relative(root, file).replaceAll('\\', '/'), line });
    counts[group].set(value, item);
  };
  try {
    for (const file of await files(root)) {
      entry.files++;
      let source = await fs.readFile(file, 'utf8');
      source = source.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' ')).replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      for (const match of source.matchAll(/\b(font-size|font-family|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|(?:row-|column-)?gap)\s*:\s*([^;{}]+)[;}]?/g)) {
        entry.declarations++;
        const line = source.slice(0, match.index).split('\n').length;
        const group = match[1] === 'font-size' ? 'fontSizes' : match[1] === 'font-family' ? 'families' : 'spacing';
        add(group, match[2].trim().replace(/\s+/g, ' '), file, line);
      }
      for (const match of source.matchAll(/@media\s*\((?:max|min)-width\s*:\s*([\d.]+px)\)/g)) {
        add('breakpoints', match[1], file, source.slice(0, match.index).split('\n').length);
      }
    }
    for (const group of Object.keys(counts)) entry[group] = [...counts[group].values()].sort((a, b) => b.count - a.count);
  } catch (error) { entry.error = error.code || 'READ_FAILED'; }
  report.projects.push(entry);
}
await fs.writeFile(path.join(workspace, 'design/source-audit.json'), JSON.stringify(report, null, 2) + '\n');
for (const entry of report.projects) console.log(`${entry.project}: ${entry.files} source files; font sizes ${entry.fontSizes.slice(0, 5).map(x => `${x.value}(${x.count})`).join(', ')}; breakpoints ${entry.breakpoints.map(x => x.value).join(', ')}`);
