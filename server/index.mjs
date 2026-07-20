import { createServer } from 'http';
import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, appendFileSync, createReadStream, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rewriteRootPaths, injectBridge } from './demo-utils.mjs';

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

const DEMO_IDEAS = Object.fromEntries(
  TEMPLATES.filter((t) => t.demo && t.entry != null).map((t) => {
    const base = join(IDEAS, t.projectPath);
    const dir = t.entry === '.' ? base : join(base, t.entry);
    return [t.id, dir];
  })
);

/** Prefer repo-vendored demos (GitHub Pages); fall back to IdeaProjects for local. */
function resolveDemo(slug) {
  const vendored = join(ROOT, 'demos', slug);
  if (existsSync(join(vendored, 'index.html'))) {
    return { root: vendored, preRewritten: true };
  }
  const ideas = DEMO_IDEAS[slug];
  if (ideas && existsSync(ideas)) {
    return { root: ideas, preRewritten: false };
  }
  return null;
}

const DEMO_SLUGS = [
  ...new Set([...Object.keys(DEMO_IDEAS), ...TEMPLATES.filter((t) => t.demo).map((t) => t.id)]),
];

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

function serveDemoFile(res, filePath, slug, preRewritten) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  if (!preRewritten && (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.mjs' || ext === '.json')) {
    let content = readFileSync(filePath, 'utf8');
    content = rewriteRootPaths(content, slug);
    if (ext === '.html') content = injectBridge(content, slug);
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
        demos: DEMO_SLUGS.filter((id) => resolveDemo(id)).length,
      });
    }

    // Fallback for absolute /_next assets requested from iframe
    if (path.startsWith('/_next/') || path.startsWith('/assets/') || path.startsWith('/images/')) {
      const slug = demoSlugFromReferer(req) || url.searchParams.get('demo');
      const demo = slug ? resolveDemo(slug) : null;
      if (demo) {
        const file = safeJoin(demo.root, path);
        if (file && existsSync(file)) return serveDemoFile(res, file, slug, demo.preRewritten);
      }
    }

    if (path.startsWith('/demos/')) {
      const rest = path.slice('/demos/'.length);
      const slug = rest.split('/')[0];
      const demo = resolveDemo(slug);
      if (!demo) {
        res.writeHead(404).end('Demo not available');
        return;
      }
      let sub = rest.slice(slug.length) || '/';
      if (sub === '/' || sub === '') sub = '/index.html';
      let file = safeJoin(demo.root, sub);
      if (!file) {
        res.writeHead(400).end('Bad path');
        return;
      }
      if (existsSync(file) && statSync(file).isDirectory()) {
        file = join(file, 'index.html');
      }
      return serveDemoFile(res, file, slug, demo.preRewritten);
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
  console.log(`Template demos: ${DEMO_SLUGS.filter((id) => resolveDemo(id)).length} mounted under /demos/<id>/`);
});
