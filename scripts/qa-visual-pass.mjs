/**
 * Visual QA capture + automated checks for the Master Brief redesign.
 * Does not submit forms or purchase via PayFast.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'qa-screenshots');
const BASE = process.env.DDM_QA_BASE || 'http://localhost:4173';

fs.mkdirSync(OUT, { recursive: true });

const report = {
  base: BASE,
  capturedAt: new Date().toISOString(),
  screenshots: [],
  defects: [],
  notes: [],
  consoleErrors: {},
  linkCheck: {},
  menuA11y: {},
  noJs: {},
  themes: {},
  images: {},
  overflow: {}
};

function note(msg) { report.notes.push(msg); console.log('NOTE:', msg); }
function defect(msg) { report.defects.push(msg); console.log('DEFECT:', msg); }

async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map((img) => {
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

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('ddm-theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

async function capture(page, name, options = {}) {
  const file = path.join(OUT, `${name}.png`);
  if (options.fullPage) {
    await page.screenshot({ path: file, fullPage: true });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  report.screenshots.push(name + '.png');
  console.log('SHOT:', name);
}

async function checkOverflow(page, key) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) > Math.ceil(window.innerWidth) + 1;
    const offenders = [];
    document.querySelectorAll('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth + 2 || rect.left < -2) {
        if (offenders.length < 8) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            className: (el.className || '').toString().slice(0, 80),
            right: Math.round(rect.right),
            left: Math.round(rect.left),
            width: Math.round(rect.width)
          });
        }
      }
    });
    return { overflowX, scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth), innerWidth: window.innerWidth, offenders };
  });
  report.overflow[key] = result;
  if (result.overflowX) defect(`Horizontal overflow on ${key} (scrollWidth=${result.scrollWidth}, inner=${result.innerWidth})`);
}

async function checkImages(page, key) {
  const imgs = await page.evaluate(() => Array.from(document.images).map((img) => ({
    src: img.currentSrc || img.src,
    naturalWidth: img.naturalWidth,
    complete: img.complete,
    alt: img.alt || ''
  })));
  const broken = imgs.filter((i) => !i.naturalWidth);
  report.images[key] = { total: imgs.length, broken: broken.map((b) => b.src) };
  if (broken.length) defect(`Broken images on ${key}: ${broken.map((b) => b.src).join(', ')}`);
}

async function checkHeroCollage(page) {
  const info = await page.evaluate(() => {
    const collage = document.querySelector('.hero-collage');
    if (!collage) return { present: false };
    const items = Array.from(collage.querySelectorAll('.collage-item')).map((el) => {
      const r = el.getBoundingClientRect();
      const img = el.querySelector('img');
      return {
        className: el.className,
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        imgW: img ? img.naturalWidth : 0,
        visible: r.width > 0 && r.height > 0
      };
    });
    const hona = items.find((i) => i.className.includes('collage-hona'));
    const others = items.filter((i) => !i.className.includes('collage-hona') && i.visible);
    const honaArea = hona ? hona.width * hona.height : 0;
    const otherArea = others.reduce((s, i) => s + i.width * i.height, 0);
    const collageRect = collage.getBoundingClientRect();
    return {
      present: true,
      items,
      honaDominant: honaArea >= otherArea * 0.9,
      honaArea,
      otherArea,
      collageWidth: Math.round(collageRect.width),
      overflow: collageRect.right > window.innerWidth + 2
    };
  });
  report.themes.collage = info;
  if (!info.present) defect('Hero collage missing on homepage');
  else {
    if (!info.honaDominant) defect('Hona may not be visually dominant in collage area math');
    if (info.overflow) defect('Hero collage overflows viewport');
    const broken = (info.items || []).filter((i) => i.visible && !i.imgW);
    if (broken.length) defect('Collage images failed to load');
  }
}

async function testMobileMenu(page) {
  const result = { open: false, escapeCloses: false, focusTrapped: false, scrollLocked: false, restoresScroll: false };
  const btn = page.locator('#menuButton');
  if (!(await btn.count())) {
    defect('Mobile menu button missing');
    report.menuA11y = result;
    return;
  }
  await btn.click();
  await page.waitForTimeout(150);
  const openState = await page.evaluate(() => ({
    expanded: document.getElementById('menuButton')?.getAttribute('aria-expanded') === 'true',
    menuHidden: document.getElementById('mobileMenu')?.hidden === true,
    bodyClass: document.body.classList.contains('menu-open'),
    overflow: getComputedStyle(document.body).overflow
  }));
  result.open = openState.expanded && !openState.menuHidden;
  result.scrollLocked = openState.bodyClass || openState.overflow === 'hidden';
  if (!result.open) defect('Mobile menu did not open');
  if (!result.scrollLocked) defect('Body scroll not locked while mobile menu open');

  // Focus trap: Tab from last link should wrap to first inside menu
  const links = page.locator('#mobileMenu a');
  const count = await links.count();
  if (count > 1) {
    await links.nth(count - 1).focus();
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      const menu = document.getElementById('mobileMenu');
      return {
        inMenu: !!(menu && el && menu.contains(el)),
        tag: el?.tagName,
        text: (el?.textContent || '').trim().slice(0, 40)
      };
    });
    result.focusTrapped = active.inMenu;
    if (!active.inMenu) defect('Mobile menu focus trap failed on Tab from last item');
  }

  // Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const closed = await page.evaluate(() => ({
    expanded: document.getElementById('menuButton')?.getAttribute('aria-expanded') === 'true',
    hidden: document.getElementById('mobileMenu')?.hidden === true,
    bodyClass: document.body.classList.contains('menu-open')
  }));
  result.escapeCloses = !closed.expanded && closed.hidden;
  result.restoresScroll = !closed.bodyClass;
  if (!result.escapeCloses) defect('Escape did not close mobile menu');
  if (!result.restoresScroll) defect('Body scroll not restored after menu close');

  report.menuA11y = result;
}

async function checkLinks(page, key) {
  const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')));
  const internal = [...new Set(hrefs.filter((h) => h && !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('tel:') && !h.startsWith('javascript:') && h !== '#' && !h.startsWith('#')))];
  const external = [...new Set(hrefs.filter((h) => h && (h.startsWith('http://') || h.startsWith('https://'))))];
  const brokenInternal = [];
  for (const href of internal) {
    const url = href.startsWith('/') ? BASE + href : new URL(href, BASE + '/').toString();
    try {
      const res = await page.request.get(url, { maxRedirects: 5 });
      if (res.status() >= 400) brokenInternal.push({ href, status: res.status() });
    } catch (e) {
      brokenInternal.push({ href, error: String(e.message || e) });
    }
  }
  // Spot-check key externals without purchase (short timeout; LinkedIn often blocks bots)
  const importantExternal = external.filter((u) =>
    /honamarketplace|propservice|elegantlaine|liberty-homes|wa\.me|formspree/i.test(u)
  );
  const externalResults = [];
  for (const url of importantExternal) {
    try {
      const res = await page.request.get(url, { maxRedirects: 5, timeout: 8000 });
      externalResults.push({ url, status: res.status() });
      if (res.status() >= 400) note(`External link status ${res.status()}: ${url}`);
    } catch (e) {
      externalResults.push({ url, error: String(e.message || e) });
      note(`External link check inconclusive: ${url}`);
    }
  }
  if (external.some((u) => /linkedin/i.test(u))) {
    note('LinkedIn URL present; skipped automated GET (bot protection common).');
  }
  report.linkCheck[key] = { brokenInternal, externalResults, internalCount: internal.length, externalCount: external.length };
  if (brokenInternal.length) defect(`Broken internal links on ${key}: ${JSON.stringify(brokenInternal)}`);
}

async function checkNoJs(browser) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const visibility = await page.evaluate(() => {
    const texts = [
      'Build the software your business actually needs',
      'When standard software stops fitting the business',
      'Software designed to be used',
      'Engineering capability from requirement to release',
      'What does your business need software to do'
    ];
    const bodyText = document.body.innerText;
    return {
      textsPresent: texts.every((t) => bodyText.includes(t)),
      missing: texts.filter((t) => !bodyText.includes(t)),
      honaImg: !!document.querySelector('.collage-hona img'),
      opacityHidden: Array.from(document.querySelectorAll('[data-motion]')).some((el) => {
        const o = getComputedStyle(el).opacity;
        return parseFloat(o) < 0.5;
      })
    };
  });
  report.noJs = visibility;
  if (!visibility.textsPresent) defect(`No-JS missing content: ${visibility.missing.join(' | ')}`);
  if (visibility.opacityHidden) defect('No-JS: data-motion content appears hidden by opacity');
  await page.screenshot({ path: path.join(OUT, 'home-1280-nojs-viewport.png'), fullPage: false });
  report.screenshots.push('home-1280-nojs-viewport.png');
  await context.close();
}

async function attachConsole(page, key) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (/fonts\.g|favicon|analytics|googletag/i.test(url)) return;
    errors.push('requestfailed: ' + url + ' ' + (req.failure()?.errorText || ''));
  });
  report.consoleErrors[key] = errors;
  return () => {
    if (errors.length) defect(`Console/network issues on ${key}: ${errors.slice(0, 5).join(' || ')}`);
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    colorScheme: 'light'
  });
  const page = await context.newPage();

  // ——— Homepage captures ———
  let finishConsole = await attachConsole(page, 'home');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await applyTheme(page, 'light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await checkHeroCollage(page);
  await checkImages(page, 'home-1440');
  await checkOverflow(page, 'home-1440');
  await capture(page, 'home-1440-full', { fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });
  await waitReady(page);
  await checkOverflow(page, 'home-1280');
  await capture(page, 'home-1280-viewport', { fullPage: false });
  await capture(page, 'home-1280-full', { fullPage: true });

  // Dark theme spot check (viewport only)
  await applyTheme(page, 'dark');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await capture(page, 'home-1280-dark-viewport', { fullPage: false });
  report.themes.darkCaptured = true;
  await applyTheme(page, 'light');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  await waitReady(page);
  await checkOverflow(page, 'home-768');
  await capture(page, 'home-768-full', { fullPage: true });

  await page.setViewportSize({ width: 430, height: 932 });
  await waitReady(page);
  await checkOverflow(page, 'home-430');
  await testMobileMenu(page);
  await page.locator('#menuButton').click();
  await page.waitForTimeout(200);
  await capture(page, 'home-430-menu-open', { fullPage: false });
  await page.keyboard.press('Escape');
  await capture(page, 'home-430-full', { fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await waitReady(page);
  await checkOverflow(page, 'home-375');
  await capture(page, 'home-375-viewport', { fullPage: false });
  await capture(page, 'home-375-full', { fullPage: true });
  finishConsole();

  await checkLinks(page, 'home');

  // ——— Inner pages: desktop 1280 + mobile 375 ———
  const inner = [
    ['services', '/services.html'],
    ['work', '/portfolio.html'],
    ['about', '/about.html'],
    ['industries', '/industries.html'],
    ['templates', '/templates.html'],
    ['contact', '/contact.html']
  ];

  for (const [name, url] of inner) {
    finishConsole = await attachConsole(page, name);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
    await applyTheme(page, 'light');
    await waitReady(page);
    await checkImages(page, `${name}-1280`);
    await checkOverflow(page, `${name}-1280`);
    await capture(page, `${name}-1280-full`, { fullPage: true });
    if (name === 'contact') {
      await capture(page, 'contact-1280-viewport', { fullPage: false });
      const formOk = await page.evaluate(() => {
        const form = document.getElementById('contact-form');
        if (!form) return { ok: false };
        const r = form.getBoundingClientRect();
        const fields = ['fname', 'fcompany', 'femail', 'fphone', 'fservice', 'fbudget', 'ftimeline', 'fpreferred', 'fmessage', 'submitBtn'];
        const missing = fields.filter((id) => !document.getElementById(id));
        return {
          ok: missing.length === 0 && r.width > 200,
          missing,
          width: Math.round(r.width),
          action: form.getAttribute('action'),
          method: form.getAttribute('method')
        };
      });
      report.themes.contactForm = formOk;
      if (!formOk.ok) defect(`Contact form incomplete: ${JSON.stringify(formOk)}`);
      if (formOk.action !== 'https://formspree.io/f/xzdelned') defect('Formspree endpoint changed');
    }
    if (name === 'templates') {
      const grid = await page.locator('#templatesGrid .template-card').count();
      report.themes.templateCards = grid;
      if (grid < 1) defect('Templates grid rendered zero cards');
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await waitReady(page);
    await checkOverflow(page, `${name}-375`);
    await capture(page, `${name}-375-full`, { fullPage: true });
    if (name === 'contact') {
      await capture(page, 'contact-375-viewport', { fullPage: false });
      // Scroll to form
      await page.locator('#contact-form').scrollIntoViewIfNeeded();
      await capture(page, 'contact-375-form', { fullPage: false });
    }
    finishConsole();
    await checkLinks(page, name);
  }

  await checkNoJs(browser);

  // Heading awkward breaks heuristic: very short last line in H1
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.setViewportSize({ width: 375, height: 812 });
  await waitReady(page);
  const headingCheck = await page.evaluate(() => {
    function lines(el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects());
      return rects.map((r) => ({ w: Math.round(r.width), t: Math.round(r.top) }));
    }
    const h1 = document.querySelector('h1');
    const ls = h1 ? lines(h1) : [];
    const last = ls[ls.length - 1];
    const max = ls.reduce((m, r) => Math.max(m, r.w), 0);
    return {
      text: h1?.textContent || '',
      lineCount: ls.length,
      lastWidth: last?.w || 0,
      maxWidth: max,
      orphanSuspect: last && max && last.w < max * 0.28 && last.w < 90
    };
  });
  report.themes.heading375 = headingCheck;
  if (headingCheck.orphanSuspect) note(`Possible awkward H1 wrap on 375: "${headingCheck.text}"`);

  fs.writeFileSync(path.join(OUT, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log('\nDEFECTS:', report.defects.length);
  report.defects.forEach((d) => console.log(' -', d));
  console.log('Screenshots in', OUT);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
