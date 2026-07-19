/**
 * Capture template thumbnails with Playwright.
 * Usage: node scripts/capture-templates.mjs
 */
import { createServer } from 'http';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, statSync } from 'fs';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IDEAS = join(ROOT, '..');
const OUT = join(ROOT, 'img', 'templates');

mkdirSync(OUT, { recursive: true });

const TEMPLATES = [
  { id: '38-restaurant', path: '@38RESTAURANT', entry: null, fallbackShot: 'Screenshot 2026-06-12 222230.png' },
  { id: '1904-trattoria', path: '1904TrattoriaPonteVecchio', entry: 'out' },
  { id: 'bell-street-baguettes', path: 'Bell-Street-Baguettes', entry: 'out' },
  { id: 'blu-saffron', path: 'BluSaffron', entry: '.' },
  { id: 'bespoke-hair-durban', path: 'bespoke-hair-durban', entry: 'dist' },
  { id: 'bh-auto-centre', path: 'BH-auto-centre', entry: 'out' },
  { id: 'growth-gate-investments', path: 'growth-gate-investments', entry: 'public' },
  { id: 'lovcon', path: 'lovcon', entry: '.' },
  { id: 'mataya-media', path: 'Mataya-media', entry: '.' },
  { id: 'menin-motorsport', path: 'menin-motorsport-pretoria', entry: 'dist' },
  { id: 'on-the-avenue', path: 'OnTheAvenue', entry: 'out' },
  { id: 'pretoria-north-vet', path: 'PretoriaNorthVeterinaryClinic', entry: '.' },
  { id: 'rocklite-bricks', path: 'Rocklite-bricks', entry: 'out' },
  { id: 'spectrum', path: 'Spectrum', entry: '.' },
  { id: 'takealot-accounting', path: 'takealot-accounting', entry: null },
  { id: 'kings-school-midvaal', path: 'The-Kings-School-Midvaal', entry: '.' },
  { id: 'van-wyk-attorneys', path: 'Van-Wyk-Attorneys', entry: 'out' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      try {
        let rel = decodeURIComponent((req.url || '/').split('?')[0]);
        if (rel === '/') rel = '/index.html';
        const filePath = join(rootDir, rel.replace(/^\/+/, ''));
        if (!filePath.startsWith(rootDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          res.writeHead(404).end('missing');
          return;
        }
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500).end('err');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function makePlaceholder(id, title) {
  // Simple SVG thumbnail when no HTML demos exist
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <rect x="80" y="80" width="1120" height="640" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)"/>
  <text x="640" y="390" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="42" font-weight="700">${title}</text>
  <text x="640" y="450" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif" font-size="22">DDM Website Template</text>
</svg>`;
  const outPng = join(OUT, `${id}.png`);
  // Write SVG then convert via Playwright screenshot of data URL
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(`<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:100%;height:100%;object-fit:cover;margin:0"/>`, { waitUntil: 'load' });
  await page.screenshot({ path: outPng, type: 'png' });
  await browser.close();
  console.log('placeholder', id);
}

async function captureOne(browser, tpl) {
  const outFile = join(OUT, `${tpl.id}.png`);
  const projectRoot = join(IDEAS, tpl.path);

  if (tpl.fallbackShot) {
    const src = join(projectRoot, tpl.fallbackShot);
    if (existsSync(src)) {
      copyFileSync(src, outFile);
      console.log('copied fallback', tpl.id);
      return;
    }
  }

  if (tpl.entry == null) {
    await makePlaceholder(tpl.id, tpl.id.replace(/-/g, ' '));
    return;
  }

  const serveRoot = tpl.entry === '.' ? projectRoot : join(projectRoot, tpl.entry);
  if (!existsSync(join(serveRoot, 'index.html'))) {
    console.warn('missing index', tpl.id, serveRoot);
    await makePlaceholder(tpl.id, tpl.id.replace(/-/g, ' '));
    return;
  }

  const { server, port } = await startStaticServer(serveRoot);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: outFile, type: 'png', fullPage: false });
    console.log('captured', tpl.id);
  } catch (err) {
    console.error('fail', tpl.id, err.message);
    await makePlaceholder(tpl.id, tpl.id.replace(/-/g, ' '));
  } finally {
    await page.close();
    await new Promise((r) => server.close(r));
  }
}

async function main() {
  const only = process.argv.slice(2);
  const list = only.length ? TEMPLATES.filter((t) => only.includes(t.id)) : TEMPLATES;
  const browser = await chromium.launch({ headless: true });
  for (const tpl of list) {
    await captureOne(browser, tpl);
  }
  await browser.close();
  writeFileSync(join(OUT, '.capture-log.txt'), `captured ${new Date().toISOString()}\n`);
  console.log('done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
