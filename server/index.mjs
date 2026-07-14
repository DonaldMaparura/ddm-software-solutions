import { createServer } from 'http';
import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, appendFileSync, createReadStream, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IDEAS = join(ROOT, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const val = trimmed.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const API_URL = (process.env.API_PUBLIC_URL || SITE_URL).replace(/\/$/, '');

const TEMPLATES = JSON.parse(readFileSync(join(ROOT, 'js', 'templates.json'), 'utf8'));

const DEMO_ROOTS = Object.fromEntries(
  TEMPLATES.filter((t) => t.demo && t.entry != null).map((t) => {
    const base = join(IDEAS, t.projectPath);
    const dir = t.entry === '.' ? base : join(base, t.entry);
    return [t.id, dir];
  })
);

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
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function pfEnc(val) {
  return encodeURIComponent(String(val).trim())
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

function payfastSignature(data, passphrase) {
  const pairs = [];
  for (const key of Object.keys(data)) {
    if (key === 'signature') continue;
    const val = data[key];
    if (val === '' || val == null) continue;
    pairs.push(`${key}=${pfEnc(val)}`);
  }
  let str = pairs.join('&');
  if (passphrase) str += `&passphrase=${pfEnc(passphrase)}`;
  return createHash('md5').update(str).digest('hex');
}

function getPayfastConfig() {
  const sandbox = String(process.env.PAYFAST_SANDBOX).toLowerCase() === 'true';
  const host = sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za';
  return {
    merchantId: (process.env.PAYFAST_MERCHANT_ID || '').trim(),
    merchantKey: (process.env.PAYFAST_MERCHANT_KEY || '').trim(),
    passphrase: (process.env.PAYFAST_PASSPHRASE || '').trim(),
    processUrl: `${host}/eng/process`,
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function safeJoin(root, reqPath) {
  const cleaned = decodeURIComponent(reqPath.split('?')[0]).replace(/^\/+/, '');
  const full = join(root, cleaned || 'index.html');
  if (!full.startsWith(root)) return null;
  return full;
}

function serveFile(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404).end('Not found');
    return false;
  }
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
  return true;
}

/** Rewrite root-absolute asset URLs so Next/static demos work under /demos/<slug>/ */
function rewriteRootPaths(content, slug) {
  const prefix = `/demos/${slug}`;
  return content
    .replace(/(href|src|action)=(["'])\/(?!\/)/g, `$1=$2${prefix}/`)
    .replace(/(href|src|action)=(["'])\.\.\//g, `$1=$2${prefix}/`)
    .replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${prefix}/`)
    .replace(/(["'])\/_next\//g, `$1${prefix}/_next/`)
    .replace(/(["'])\/assets\//g, `$1${prefix}/assets/`)
    .replace(/(["'])\/images\//g, `$1${prefix}/images/`)
    .replace(/(["'])\/img\//g, `$1${prefix}/img/`)
    .replace(/(["'])\/css\//g, `$1${prefix}/css/`)
    .replace(/(["'])\/js\//g, `$1${prefix}/js/`)
    .replace(/(["'])\/public\//g, `$1${prefix}/public/`);
}

const CUSTOMIZER_BRIDGE = `
<style id="ddm-customizer-style">
:root{--ddm-primary:#0a0a0a;--ddm-accent:#2563eb;--ddm-bg:#ffffff;--ddm-text:#111111;--ddm-font:Inter,system-ui,sans-serif}
#ddm-preview-badge{position:fixed;z-index:2147483646;left:12px;bottom:12px;padding:8px 12px;border-radius:8px;background:#0a0a0a;color:#fff;font:600 12px/1.3 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:min(280px,70vw)}
.ddm-hide-section{display:none!important}
</style>
<script id="ddm-customizer-bridge">
(function(){
  var lastTheme=null;
  var originals={};

  function textOf(el){
    return (el && (el.innerText||el.textContent)||'').replace(/\\s+/g,' ').trim();
  }

  function setLeafText(el, value){
    if(!el || !value) return;
    if(!el.children || el.children.length===0){ el.textContent=value; return; }
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node=walker.nextNode();
    if(node){ node.nodeValue=value; return; }
    el.textContent=value;
  }

  function first(sel){ return document.querySelector(sel); }
  function all(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function stash(key, el){
    if(!el || originals[key]!=null) return;
    originals[key]=textOf(el);
  }

  function apply(theme){
    if(!theme) return;
    lastTheme=theme;
    try{ sessionStorage.setItem('ddm-live-theme', JSON.stringify(theme)); }catch(e){}

    var root=document.documentElement;
    root.style.setProperty('--ddm-primary', theme.primaryColor||'#0a0a0a');
    root.style.setProperty('--ddm-accent', theme.accentColor||'#2563eb');
    root.style.setProperty('--ddm-bg', theme.bgColor||'#ffffff');
    root.style.setProperty('--ddm-text', theme.textColor||'#111111');
    root.style.setProperty('--ddm-font', theme.fontFamily||'Inter, system-ui, sans-serif');

    var s=document.getElementById('ddm-live-style');
    if(!s){ s=document.createElement('style'); s.id='ddm-live-style'; document.head.appendChild(s); }
    s.textContent=[
      'html,body{background:var(--ddm-bg)!important;color:var(--ddm-text)!important;font-family:var(--ddm-font)!important}',
      'h1,h2,h3,h4,.logo,[class*="brand"],[class*="logo"] span,[class*="title"]{color:var(--ddm-primary)!important}',
      'a{color:var(--ddm-accent)}',
      'button,.btn,[class*="btn"],[class*="Btn"],[class*="cta"],[class*="Cta"],input[type="submit"],a[class*="button"]{background:var(--ddm-accent)!important;border-color:var(--ddm-accent)!important;color:#fff!important}',
      theme.showHeader===false?'header,nav,[class*="navbar"],[class*="Navbar"],[class*="header"]:not(#ddm-preview-badge){display:none!important}':'',
      theme.showFooter===false?'footer,[class*="footer"],[class*="Footer"]{display:none!important}':'',
      theme.showHero===false?'[class*="hero"],[class*="Hero"],section:first-of-type{display:none!important}':'',
      theme.showAbout===false?'[id*="about"],[class*="about"],[class*="About"]{display:none!important}':'',
      theme.showContact===false?'[id*="contact"],[class*="contact"],[class*="Contact"]{display:none!important}':''
    ].filter(Boolean).join('\\n');

    var brand=first('header a,[class*="brand"] a,[class*="logo"] a,nav a,a[class*="logo"],a[class*="brand"]');
    stash('brand', brand);
    if(brand && theme.bizName){
      var brandImg=brand.querySelector('img');
      if(brandImg && theme.logoDataUrl){ brandImg.src=theme.logoDataUrl; brandImg.alt=theme.bizName; }
      else setLeafText(brand, theme.bizName);
    }
    if(theme.logoDataUrl){
      var logoImg=first('header img, nav img, [class*="logo"] img, img[alt*="ogo" i]');
      if(logoImg){ logoImg.src=theme.logoDataUrl; if(theme.bizName) logoImg.alt=theme.bizName; }
    }

    var h1=first('h1');
    stash('h1', h1);
    if(h1 && theme.headline) setLeafText(h1, theme.headline);

    var heroP=first('h1 + p, [class*="hero"] p, section p, main p');
    stash('heroP', heroP);
    if(heroP && theme.subtext) setLeafText(heroP, theme.subtext);

    if(theme.tagline){
      var tag=first('[class*="tagline"],[class*="subtitle"], header p, nav p');
      stash('tag', tag);
      if(tag) setLeafText(tag, theme.tagline);
    }

    if(theme.ctaLabel){
      var cta=first('a.btn, a[class*="btn"], button, [class*="cta"] a, [class*="hero"] a, [class*="Hero"] a');
      stash('cta', cta);
      if(cta) setLeafText(cta, theme.ctaLabel);
    }

    if(theme.aboutText){
      var about=first('#about p, [id*="about"] p, [class*="about"] p, [class*="About"] p');
      stash('about', about);
      if(about) setLeafText(about, theme.aboutText);
    }

    if(theme.navLabels){
      var labels=theme.navLabels.split(',').map(function(x){return x.trim();}).filter(Boolean);
      var links=all('header nav a, nav a, [class*="nav"] a').filter(function(a){
        return textOf(a) && textOf(a).length<28 && !a.querySelector('img');
      }).slice(0, labels.length);
      links.forEach(function(a,i){ if(labels[i]) setLeafText(a, labels[i]); });
    }

    if(theme.phone){
      all('a[href^="tel:"]').forEach(function(a){ a.href='tel:'+theme.phone.replace(/\\s+/g,''); setLeafText(a, theme.phone); });
    }
    if(theme.email){
      all('a[href^="mailto:"]').forEach(function(a){ a.href='mailto:'+theme.email; setLeafText(a, theme.email); });
    }

    var badge=document.getElementById('ddm-preview-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.id='ddm-preview-badge';
      document.body.appendChild(badge);
    }
    badge.textContent='Previewing edits · '+(theme.bizName||'Your brand');
  }

  window.addEventListener('message', function(e){
    if(!e.data || e.data.type!=='ddm-theme') return;
    apply(e.data.theme||{});
  });

  try{
    var stored=sessionStorage.getItem('ddm-live-theme');
    if(stored) apply(JSON.parse(stored));
  }catch(e){}

  setInterval(function(){
    if(lastTheme) apply(lastTheme);
  }, 1500);

  try{ if(window.parent!==window) window.parent.postMessage({type:'ddm-demo-ready'}, '*'); }catch(e){}
  document.addEventListener('DOMContentLoaded', function(){
    try{ if(window.parent!==window) window.parent.postMessage({type:'ddm-demo-ready'}, '*'); }catch(e){}
  });
})();
</script>`;

function injectBridge(html) {
  if (html.includes('ddm-customizer-bridge')) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, CUSTOMIZER_BRIDGE + '</head>');
  return CUSTOMIZER_BRIDGE + html;
}

function serveDemoFile(res, filePath, slug) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  if (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.mjs' || ext === '.json') {
    let content = readFileSync(filePath, 'utf8');
    content = rewriteRootPaths(content, slug);
    if (ext === '.html') content = injectBridge(content);
    const buf = Buffer.from(content, 'utf8');
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
    });
    res.end(buf);
    return;
  }

  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
}

function demoSlugFromReferer(req) {
  const ref = req.headers.referer || req.headers.referrer || '';
  const m = String(ref).match(/\/demos\/([^/]+)\//);
  return m ? m[1] : null;
}

function ensureDataDir() {
  const dir = join(__dirname, 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function logOrder(order) {
  const dir = ensureDataDir();
  const file = join(dir, 'orders.jsonl');
  appendFileSync(file, JSON.stringify({ ...order, at: new Date().toISOString() }) + '\n');
}

async function handlePayfastPrepare(req, res) {
  const cfg = getPayfastConfig();
  if (!cfg.merchantId || !cfg.merchantKey) {
    return sendJson(res, 503, { error: 'PayFast is not configured.' });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' });
  }

  const email = String(body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJson(res, 400, { error: 'Valid email is required for PayFast.' });
  }

  const templateId = String(body.templateId || '').trim();
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return sendJson(res, 404, { error: 'Template not found.' });

  const mode = ['customise', 'hosting'].includes(body.mode) ? body.mode : 'purchase';
  let amount = Number(template.price);
  if (mode === 'customise') amount = Number(template.customisePrice);
  if (mode === 'hosting') amount = Number(template.hostingPrice || 1999);
  if (!(amount > 0)) return sendJson(res, 400, { error: 'Invalid amount.' });

  const paymentId = `DDM-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const firstName = String(body.firstName || '').trim().slice(0, 100);
  const lastName = String(body.lastName || '').trim().slice(0, 100);
  const customNotes = String(body.customNotes || '').trim().slice(0, 255);

  const itemLabels = {
    purchase: 'Website template',
    customise: 'Customised template',
    hosting: 'Full website hosting & revamp',
  };

  const fields = {
    merchant_id: cfg.merchantId,
    merchant_key: cfg.merchantKey,
    return_url: `${SITE_URL}/order-complete.html?ref=${encodeURIComponent(paymentId)}`,
    cancel_url: `${SITE_URL}/checkout.html?id=${encodeURIComponent(templateId)}&cancelled=1`,
    notify_url: `${API_URL}/api/payfast/notify`,
  };
  if (firstName) fields.name_first = firstName;
  if (lastName) fields.name_last = lastName;
  fields.email_address = email.slice(0, 255);
  fields.m_payment_id = paymentId;
  fields.amount = amount.toFixed(2);
  fields.item_name = `${itemLabels[mode] || 'Website template'}: ${template.name}`.slice(0, 100);
  fields.item_description = (customNotes || `${template.industry} template — ${template.name}`).slice(0, 255);
  fields.custom_str1 = templateId.slice(0, 255);
  fields.custom_str2 = mode.slice(0, 255);
  fields.signature = payfastSignature(fields, cfg.passphrase);

  logOrder({
    paymentId,
    templateId,
    mode,
    amount,
    email,
    customNotes,
    status: 'prepared',
  });

  sendJson(res, 200, { action: cfg.processUrl, fields, paymentId });
}

async function handlePayfastNotify(req, res) {
  const raw = await readBody(req);
  const params = Object.fromEntries(new URLSearchParams(raw));
  const cfg = getPayfastConfig();
  const received = params.signature || '';
  const clone = { ...params };
  delete clone.signature;
  const calc = payfastSignature(clone, cfg.passphrase);
  if (received && received !== calc) {
    console.warn('[PayFast ITN] Bad signature');
    res.writeHead(400).end('bad signature');
    return;
  }
  logOrder({
    paymentId: params.m_payment_id,
    pfPaymentId: params.pf_payment_id,
    status: params.payment_status,
    amount: params.amount_gross,
    templateId: params.custom_str1,
    mode: params.custom_str2,
    source: 'itn',
  });
  console.log('[PayFast ITN]', params.payment_status, params.m_payment_id);
  res.writeHead(200).end('OK');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (req.method === 'POST' && path === '/api/payfast/prepare') {
      return await handlePayfastPrepare(req, res);
    }
    if (req.method === 'POST' && path === '/api/payfast/notify') {
      return await handlePayfastNotify(req, res);
    }
    if (req.method === 'GET' && path === '/api/templates') {
      return sendJson(res, 200, { templates: TEMPLATES });
    }
    if (req.method === 'GET' && path === '/api/health') {
      const cfg = getPayfastConfig();
      return sendJson(res, 200, {
        ok: true,
        payfast: !!(cfg.merchantId && cfg.merchantKey),
        demos: Object.keys(DEMO_ROOTS).length,
      });
    }

    // Fallback for absolute /_next assets requested from iframe
    if (path.startsWith('/_next/') || path.startsWith('/assets/') || path.startsWith('/images/')) {
      const slug = demoSlugFromReferer(req) || url.searchParams.get('demo');
      if (slug && DEMO_ROOTS[slug]) {
        const file = safeJoin(DEMO_ROOTS[slug], path);
        if (file && existsSync(file)) return serveDemoFile(res, file, slug);
      }
    }

    if (path.startsWith('/demos/')) {
      const rest = path.slice('/demos/'.length);
      const slug = rest.split('/')[0];
      const root = DEMO_ROOTS[slug];
      if (!root || !existsSync(root)) {
        res.writeHead(404).end('Demo not available');
        return;
      }
      let sub = rest.slice(slug.length) || '/';
      if (sub === '/' || sub === '') sub = '/index.html';
      let file = safeJoin(root, sub);
      if (!file) {
        res.writeHead(400).end('Bad path');
        return;
      }
      if (existsSync(file) && statSync(file).isDirectory()) {
        file = join(file, 'index.html');
      }
      return serveDemoFile(res, file, slug);
    }

    let rel = path === '/' ? '/index.html' : path;
    const file = safeJoin(ROOT, rel);
    if (!file) {
      res.writeHead(400).end('Bad path');
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      return serveFile(res, join(file, 'index.html'));
    }
    if (!existsSync(file)) {
      res.writeHead(404).end('Not found');
      return;
    }
    return serveFile(res, file);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`DDM site + PayFast + demos on http://localhost:${PORT}`);
  console.log(`Template demos: ${Object.keys(DEMO_ROOTS).length} mounted under /demos/<id>/`);
});
