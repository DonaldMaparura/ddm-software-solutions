/**
 * Finish remaining QA shots after CTA fix + regenerate key homepage shots.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'qa-screenshots');
const BASE = 'http://localhost:4173';
fs.mkdirSync(OUT, { recursive: true });

const defects = [];
const notes = [];

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await Promise.all(Array.from(document.images).map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 2000);
      });
    }));
  });
  await page.waitForTimeout(200);
}

async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log('SHOT', name);
}

async function overflow(page, key) {
  const r = await page.evaluate(() => {
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return { overflowX: sw > Math.ceil(window.innerWidth) + 1, sw, iw: window.innerWidth };
  });
  if (r.overflowX) defects.push(`Horizontal overflow ${key}: ${r.sw}>${r.iw}`);
  return r;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  // Re-capture homepage key views after CTA fix
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('ddm-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await overflow(page, 'home-1440');
  await shot(page, 'home-1440-full', true);

  await page.setViewportSize({ width: 1280, height: 800 });
  await waitReady(page);
  await shot(page, 'home-1280-viewport', false);
  await shot(page, 'home-1280-full', true);

  await page.evaluate(() => {
    localStorage.setItem('ddm-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await shot(page, 'home-1280-dark-viewport', false);
  await page.evaluate(() => {
    localStorage.setItem('ddm-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  await waitReady(page);
  await overflow(page, 'home-768');
  await shot(page, 'home-768-full', true);

  await page.setViewportSize({ width: 430, height: 932 });
  await waitReady(page);
  await overflow(page, 'home-430');

  // Menu a11y
  await page.click('#menuButton');
  await page.waitForTimeout(200);
  const menuColor = await page.evaluate(() => {
    const btn = document.querySelector('#mobileMenu a.btn-primary');
    const s = getComputedStyle(btn);
    return s.color;
  });
  if (menuColor !== 'rgb(255, 255, 255)') defects.push('Mobile CTA text not white after fix: ' + menuColor);
  await shot(page, 'home-430-menu-open', false);

  // Focus trap
  const links = page.locator('#mobileMenu a');
  const n = await links.count();
  await links.nth(n - 1).focus();
  await page.keyboard.press('Tab');
  const trap = await page.evaluate(() => {
    const menu = document.getElementById('mobileMenu');
    return menu.contains(document.activeElement);
  });
  if (!trap) defects.push('Focus trap failed');
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => document.getElementById('mobileMenu').hidden);
  if (!closed) defects.push('Escape did not close menu');
  const scrollOk = await page.evaluate(() => !document.body.classList.contains('menu-open'));
  if (!scrollOk) defects.push('Scroll lock not cleared');

  await shot(page, 'home-430-full', true);

  await page.setViewportSize({ width: 375, height: 812 });
  await waitReady(page);
  await overflow(page, 'home-375');
  await shot(page, 'home-375-viewport', false);
  await shot(page, 'home-375-full', true);

  // Remaining + refresh inner pages
  const pages = [
    ['services', '/services.html'],
    ['work', '/portfolio.html'],
    ['about', '/about.html'],
    ['industries', '/industries.html'],
    ['templates', '/templates.html'],
    ['contact', '/contact.html']
  ];

  for (const [name, url] of pages) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await overflow(page, `${name}-1280`);
    await shot(page, `${name}-1280-full`, true);
    if (name === 'contact') await shot(page, 'contact-1280-viewport', false);
    if (name === 'templates') {
      const cards = await page.locator('#templatesGrid .template-card').count();
      notes.push('template cards: ' + cards);
      if (cards < 1) defects.push('No template cards');
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await waitReady(page);
    await overflow(page, `${name}-375`);
    await shot(page, `${name}-375-full`, true);
    if (name === 'contact') {
      await shot(page, 'contact-375-viewport', false);
      await page.locator('#contact-form').scrollIntoViewIfNeeded();
      await shot(page, 'contact-375-form', false);
      const form = await page.evaluate(() => {
        const f = document.getElementById('contact-form');
        const ids = ['fname','fcompany','femail','fphone','fservice','fbudget','ftimeline','fpreferred','fmessage','submitBtn'];
        return {
          action: f?.getAttribute('action'),
          method: f?.getAttribute('method'),
          missing: ids.filter((id) => !document.getElementById(id)),
          width: f ? Math.round(f.getBoundingClientRect().width) : 0
        };
      });
      notes.push('contact form ' + JSON.stringify(form));
      if (form.action !== 'https://formspree.io/f/xzdelned') defects.push('Formspree endpoint wrong');
      if (form.missing.length) defects.push('Missing form fields: ' + form.missing.join(','));
    }
  }

  // No-JS
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const np = await ctx.newPage();
  await np.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const nojs = await np.evaluate(() => {
    const need = [
      'Build the software your business actually needs',
      'When standard software stops fitting the business',
      'Software designed to be used',
      'What does your business need software to do'
    ];
    const t = document.body.innerText;
    return {
      ok: need.every((x) => t.includes(x)),
      missing: need.filter((x) => !t.includes(x)),
      hiddenMotion: Array.from(document.querySelectorAll('[data-motion]')).some((el) => parseFloat(getComputedStyle(el).opacity) < 0.5)
    };
  });
  if (!nojs.ok) defects.push('No-JS missing: ' + nojs.missing.join(' | '));
  if (nojs.hiddenMotion) defects.push('No-JS motion content hidden');
  await np.screenshot({ path: path.join(OUT, 'home-1280-nojs-viewport.png'), fullPage: false });
  await ctx.close();

  // Internal link spot-check on home
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const internals = await page.evaluate(() =>
    [...new Set(Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')))]
      .filter((h) => h && !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('tel:') && !h.startsWith('#') && h !== '#')
  );
  for (const href of internals) {
    const url = new URL(href, BASE + '/').toString();
    const res = await page.request.get(url);
    if (res.status() >= 400) defects.push(`Broken internal ${href} -> ${res.status()}`);
  }

  // External project URLs (quick)
  for (const url of [
    'https://honamarketplace.com/',
    'https://propservice.web.app/',
    'https://elegantlaine.co.za/',
    'https://liberty-homes.co.za/'
  ]) {
    try {
      const res = await page.request.get(url, { timeout: 8000 });
      notes.push(`${url} -> ${res.status()}`);
    } catch (e) {
      notes.push(`${url} inconclusive: ${e.message}`);
    }
  }

  const report = {
    capturedAt: new Date().toISOString(),
    defects,
    notes,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).sort()
  };
  fs.writeFileSync(path.join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log('DEFECTS', defects.length, defects);
  console.log('NOTES', notes);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
