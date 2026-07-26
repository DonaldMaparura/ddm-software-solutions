/**
 * Copy template demo builds into /demos/<id>/ with paths rewritten for static hosting
 * (GitHub Pages). Re-run after template exports change: npm run sync:demos
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  statSync,
} from 'fs';
import { join, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { rewriteRootPaths, injectBridge } from '../server/demo-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IDEAS = join(ROOT, '..');
const OUT = join(ROOT, 'demos');

const SKIP_DIR = new Set([
  'node_modules',
  '.git',
  '.idea',
  '.next',
  '.firebase',
  '.github',
  'dist-ssr',
  'scripts',
  'admin', // marketplace demos leave staff admin out
]);

const SKIP_FILE = /^(qa-|lighthouse-|website-generation|\.|.*\.iml$|package-lock\.json$|package\.json$)/i;

const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

/** Asset / tooling folders — not app routes for Next.js path rewriting. */
const NON_ROUTE_DIRS = new Set([
  '_next',
  'assets',
  'images',
  'img',
  'css',
  'js',
  'photos',
  'public',
  'media',
  'fonts',
  'static',
  'brand',
  'icons',
  'favicon',
  'api',
  'scripts',
]);

const TEMPLATES = JSON.parse(readFileSync(join(ROOT, 'js', 'templates.json'), 'utf8'));

function shouldSkipName(name, isDir) {
  if (isDir) return SKIP_DIR.has(name);
  if (SKIP_FILE.test(name)) return true;
  if (/\.(md|map)$/i.test(name) && !name.toLowerCase().includes('readme')) return false;
  if (/\.md$/i.test(name)) return true;
  return false;
}

/** Discover page segments (about, services, book/family, …) from a static export root. */
function collectAppRoutes(rootDir, prefix = '') {
  const routes = [];
  if (!existsSync(rootDir)) return routes;
  for (const ent of readdirSync(rootDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.') || ent.name.startsWith('_')) continue;
    if (NON_ROUTE_DIRS.has(ent.name)) continue;
    if (ent.name === '404' || ent.name === 'admin') continue;
    const segment = prefix ? `${prefix}/${ent.name}` : ent.name;
    const dir = join(rootDir, ent.name);
    if (existsSync(join(dir, 'index.html'))) routes.push(segment);
    routes.push(...collectAppRoutes(dir, segment));
  }
  return routes;
}

function walkCopy(src, dest, slug, stats, routes) {
  mkdirSync(dest, { recursive: true });
  for (const ent of readdirSync(src, { withFileTypes: true })) {
    if (shouldSkipName(ent.name, ent.isDirectory())) continue;
    const from = join(src, ent.name);
    const to = join(dest, ent.name);
    if (ent.isDirectory()) {
      walkCopy(from, to, slug, stats, routes);
      continue;
    }
    const ext = extname(ent.name).toLowerCase();
    if (TEXT_EXT.has(ext)) {
      let content = readFileSync(from, 'utf8');
      content = rewriteRootPaths(content, slug, { routes });
      if (ext === '.html') content = injectBridge(content, slug);
      writeFileSync(to, content, 'utf8');
      stats.rewritten += 1;
    } else {
      copyFileSync(from, to);
      stats.copied += 1;
    }
    stats.bytes += statSync(from).size;
  }
}

function sourceDir(tpl) {
  const base = join(IDEAS, tpl.projectPath);
  return tpl.entry === '.' ? base : join(base, tpl.entry);
}

mkdirSync(OUT, { recursive: true });
const demos = TEMPLATES.filter((t) => t.demo && t.entry != null);
let ok = 0;
let fail = 0;

for (const tpl of demos) {
  const src = sourceDir(tpl);
  const dest = join(OUT, tpl.id);
  if (!existsSync(join(src, 'index.html'))) {
    console.warn(`SKIP ${tpl.id}: no index.html at ${relative(IDEAS, src)}`);
    fail += 1;
    continue;
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  const routes = collectAppRoutes(src);
  const stats = { copied: 0, rewritten: 0, bytes: 0 };
  walkCopy(src, dest, tpl.id, stats, routes);
  const mb = (stats.bytes / (1024 * 1024)).toFixed(1);
  const routeNote = routes.length ? ` [${routes.join(', ')}]` : '';
  console.log(`OK   ${tpl.id}: ${stats.rewritten} text + ${stats.copied} binary (~${mb} MB)${routeNote}`);
  ok += 1;
}

console.log(`\nSynced ${ok} demos (${fail} skipped) → demos/`);
