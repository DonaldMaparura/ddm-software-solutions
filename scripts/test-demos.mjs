/**
 * Playwright audit: load each /demos/<id>/ and fail on broken CSS/JS/fonts/images.
 * Usage: node scripts/test-demos.mjs [baseUrl]
 */
import { createServer } from 'http';
import { existsSync, readFileSync, createReadStream, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES = JSON.parse(readFileSync(join(ROOT, 'js', 'templates.json'), 'utf8'));
const DEMOS = TEMPLATES.filter((t) => t.demo).map((t) => t.id);
const OUT = join(ROOT, 'img', 'demo-qa');
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

function startStaticRoot() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      try {
        let rel = decodeURIComponent((req.url || '/').split('?')[0]);
        if (rel.endsWith('/')) rel += 'index.html';
        const filePath = join(ROOT, rel.replace(/^\/+/, ''));
        if (!filePath.startsWith(ROOT) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          res.writeHead(404).end('missing');
          return;
        }
        const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500).end('err');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function auditDemo(browser, baseUrl, id) {
  const url = `${baseUrl.replace(/\/$/, '')}/demos/${id}/`;
  const page = await browser.newPage();
  const failed = [];
  const imageFailed = [];

  page.on('response', (res) => {
    const u = res.url();
    const status = res.status();
    const type = res.request().resourceType();
    if (!/^https?:/i.test(u)) return;
    if (type === 'stylesheet' || type === 'script' || type === 'font' || /\.(css|js|mjs|woff2?)(\?|$)/i.test(u)) {
      if (status >= 400) failed.push({ u, status, type });
    }
    if (type === 'image' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(u)) {
      // Only flag same-origin demo asset failures (ignore flaky external CDNs)
      const sameOrigin = u.startsWith(baseUrl) || u.includes('/demos/');
      if (status >= 400 && sameOrigin && !/^https?:\/\/(images\.unsplash|cdn\.|img\.)/i.test(u)) {
        imageFailed.push({ u, status, type: 'image' });
      }
    }
  });

  page.on('pageerror', (err) => failed.push({ u: 'pageerror', status: 0, type: 'error', detail: String(err) }));

  let navError = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    if (!resp || resp.status() >= 400) navError = `nav ${resp ? resp.status() : 'null'}`;
  } catch (e) {
    navError = String(e.message || e);
  }

  await page.waitForTimeout(2000);

  const metrics = await page.evaluate(() => {
    const sheets = [...document.styleSheets];
    let sheetRules = 0;
    for (const s of sheets) {
      try { sheetRules += s.cssRules?.length || 0; } catch { /* cross-origin */ }
    }
    const body = document.body;
    const cs = body ? getComputedStyle(body) : null;
    const text = (body?.innerText || '').replace(/\s+/g, ' ').trim();
    const imgs = [...document.images];
    const brokenImgs = imgs.filter((img) => {
      if (!(img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0))) return false;
      const src = img.currentSrc || img.src || '';
      if (!src || src.endsWith('/')) return false;
      if (/unsplash\.com|images\.unsplash|googleapis|gstatic|facebook|instagram/i.test(src)) return false;
      return true;
    });
    const bgBroken = [];
    for (const el of [...document.querySelectorAll('*')].slice(0, 400)) {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') continue;
      // can't always check URL load; count as data
    }
    const r = body?.getBoundingClientRect();
    return {
      title: document.title,
      textLen: text.length,
      sheetCount: sheets.length,
      sheetRules,
      linkStyles: document.querySelectorAll('link[rel="stylesheet"]').length,
      bodyBg: cs?.backgroundColor || null,
      bodyFont: cs?.fontFamily?.slice(0, 60) || null,
      imgCount: imgs.length,
      brokenImgCount: brokenImgs.length,
      brokenImgSrc: brokenImgs.slice(0, 5).map((i) => i.currentSrc || i.src),
      bodyH: r?.height || 0,
      hasCustomizerBridge: !!document.getElementById('ddm-customizer-bridge'),
    };
  });

  await page.screenshot({ path: join(OUT, `${id}.png`), fullPage: false });
  await page.close();

  const cssFailed = failed.filter((f) => f.type === 'stylesheet' || /\.css(\?|$)/i.test(f.u || ''));
  const jsFailed = failed.filter((f) => f.type === 'script' || /\.js(\?|$)/i.test(f.u || ''));
  const fontFailed = failed.filter((f) => f.type === 'font' || /\.woff/i.test(f.u || ''));

  const problems = [];
  if (navError) problems.push(`navigation: ${navError}`);
  if (cssFailed.length) problems.push(`css 4xx: ${cssFailed.length} (${cssFailed[0]?.u})`);
  if (jsFailed.length) problems.push(`js 4xx: ${jsFailed.length} (${jsFailed[0]?.u})`);
  if (fontFailed.length) problems.push(`font 4xx: ${fontFailed.length}`);
  if (imageFailed.length) problems.push(`image 4xx: ${imageFailed.length} (${imageFailed[0]?.u})`);
  if (metrics.brokenImgCount > 0) {
    problems.push(`broken <img>: ${metrics.brokenImgCount} (${metrics.brokenImgSrc[0] || ''})`);
  }
  if (metrics.linkStyles === 0 && metrics.sheetCount === 0) problems.push('no stylesheets loaded');
  if (metrics.textLen < 40) problems.push(`almost no text (${metrics.textLen})`);
  if (metrics.linkStyles === 0) problems.push('zero link[rel=stylesheet]');
  if (metrics.bodyH < 200) problems.push(`short body height ${Math.round(metrics.bodyH)}`);

  return {
    id,
    url,
    ok: problems.length === 0,
    problems,
    failed: [...failed, ...imageFailed],
    metrics,
  };
}

async function main() {
  let baseUrl = process.argv[2] || process.env.DEMO_BASE_URL || '';
  let server = null;
  if (!baseUrl) {
    const started = await startStaticRoot();
    server = started.server;
    baseUrl = `http://127.0.0.1:${started.port}`;
    console.log(`Static root server: ${baseUrl}`);
  } else {
    console.log(`Using base URL: ${baseUrl}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const id of DEMOS) {
    process.stdout.write(`Auditing ${id}... `);
    const r = await auditDemo(browser, baseUrl, id);
    results.push(r);
    console.log(r.ok ? 'OK' : `FAIL: ${r.problems.join('; ')}`);
    if (!r.ok) {
      for (const f of r.failed.slice(0, 8)) {
        console.log(`   ${f.status} ${f.type} ${f.u || f.detail}`);
      }
      console.log(`   sheets=${r.metrics.linkStyles} imgs=${r.metrics.imgCount} brokenImgs=${r.metrics.brokenImgCount}`);
    }
  }
  await browser.close();
  if (server) server.close();

  writeFileSync(join(OUT, 'report.json'), JSON.stringify({ baseUrl, at: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots → img/demo-qa/`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => f.id).join(', '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
