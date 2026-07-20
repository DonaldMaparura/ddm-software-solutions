/** Shared demo path rewrite + customizer bridge injection (used by server + sync). */

/**
 * @param {string} content
 * @param {string} slug
 * @param {{ routes?: string[] }} [options] - App page segments (e.g. ['about','services']) for Next.js JS bundles
 */
export function rewriteRootPaths(content, slug, options = {}) {
  const prefix = `/demos/${slug}`;
  const routes = Array.isArray(options.routes) ? options.routes : [];

  // Next export already built with basePath/assetPrefix for this demo — don't double-prefix routes.
  const preBuiltBase =
    content.includes(`basePath:"${prefix}"`) ||
    content.includes(`basePath:'${prefix}'`) ||
    content.includes(`basePath="${prefix}"`) ||
    content.includes(`"${prefix}/_next/"`) ||
    content.includes(`'${prefix}/_next/'`) ||
    content.includes(`/${slug}/_next/`);

  // Only rewrite root-absolute paths (preceded by non-path chars), never nested
  // segments like /_next/static/css/ or /demos/slug/_next/.
  const atRoot = `(?<![A-Za-z0-9._-])`;

  let out = content
    // Vite preload/dynamic import base: function(e){return"/"+e}
    .replace(/function\((\w+)\)\{return"\/"\+\1\}/g, `function($1){return"${prefix}/"+$1}`)
    .replace(/\((\w+)\)=>"\/"\+\1/g, `($1)=>"${prefix}/"+$1}`);

  const folders = [
    '/_next/',
    '/assets/',
    '/images/',
    '/img/',
    '/css/',
    '/js/',
    '/photos/',
    '/public/',
    '/gallery/',
    '/media/',
    '/fonts/',
    '/static/',
    '/brand/',
  ];
  for (const folder of folders) {
    out = out.replace(new RegExp(`${atRoot}${folder.replace(/\//g, '\\/')}`, 'g'), `${prefix}${folder}`);
  }

  const files = [
    '/logo.png',
    '/logo.jpg',
    '/logo.jpeg',
    '/logo.webp',
    '/logo.svg',
    '/favicon.ico',
    '/favicon.svg',
    '/icon.svg',
    '/icon.png',
    '/manifest.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
  ];
  for (const file of files) {
    out = out.replace(new RegExp(`${atRoot}${file.replace(/\./g, '\\.')}`, 'g'), `${prefix}${file}`);
  }

  // When the app was not built with basePath, teach Next's client router about /demos/<slug>.
  // Prefer patching basePath (Link keeps href:"/about"). Only rewrite route strings if we
  // could not patch basePath — never do both, or paths double-prefix.
  if (!preBuiltBase) {
    const beforeBase = out;
    out = out
      .replace(/basePath:\s*""/g, `basePath:"${prefix}"`)
      .replace(/basePath:\s*''/g, `basePath:'${prefix}'`)
      .replace(/basePath=""/g, `basePath="${prefix}"`)
      .replace(/basePath=''/g, `basePath='${prefix}'`)
      .replace(/this\.basePath=""/g, `this.basePath="${prefix}"`)
      .replace(/this\.basePath=''/g, `this.basePath='${prefix}'`);
    const patchedBase = out !== beforeBase;

    if (!patchedBase) {
      const sortedRoutes = [...routes].filter(Boolean).sort((a, b) => b.length - a.length);
      for (const route of sortedRoutes) {
        const esc = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(
          new RegExp(`(["'])/${esc}(/)?\\1`, 'g'),
          (match, q, slash) => `${q}${prefix}/${route}${slash || ''}${q}`,
        );
      }
      // Home links only (href="/" / href:"/") — not bare "/" comparisons used by isActive
      out = out.replace(/(href|src|action|to)=(["'`])\/\2/g, `$1=$2${prefix}/$2`);
      out = out.replace(/(href|to):\s*(["'])\/\2/g, `$1:$2${prefix}/$2`);
    } else {
      // Static HTML still has href="/"; Next won't fix that until hydration
      out = out.replace(/(href|src|action)=(["'`])\/\2/g, `$1=$2${prefix}/$2`);
    }
  }

  // General absolute href/src/action — skip bare "/" and already /demos/...
  out = out
    .replace(/(href|src|action)=(["'`])\/(?!\/|["'`]|demos\/)/g, `$1=$2${prefix}/`)
    .replace(/url\(\s*(['"`]?)\/(?!\/|['"`]|demos\/)/g, `url($1${prefix}/`);

  // Safety: collapse accidental double prefixes
  out = out.replaceAll(`${prefix}${prefix}`, prefix);
  out = out.replace(new RegExp(`(/demos/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}){2,}`, 'g'), prefix);
  return out;
}

export const CUSTOMIZER_BRIDGE = `
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

export function demoBaseNavScript(slug) {
  const prefix = `/demos/${slug}`;
  return `<script id="ddm-demo-base-nav">(function(){
  var BASE=${JSON.stringify(prefix)};
  function rewrite(href){
    if(!href || href.charAt(0)!=='/') return null;
    if(href.indexOf('//')===0) return null;
    if(href.charAt(0)==='#') return null;
    var path=href, hash='', query='';
    var hi=path.indexOf('#');
    if(hi>=0){ hash=path.slice(hi); path=path.slice(0,hi); }
    var qi=path.indexOf('?');
    if(qi>=0){ query=path.slice(qi); path=path.slice(0,qi); }
    if(path.indexOf(BASE)===0){
      if(path!==BASE && path!==BASE+'/' && path.charAt(path.length-1)!=='/') path+='/';
      return path + query + hash;
    }
    if(path.indexOf('/demos/')===0) return null;
    if(path!=='/' && path.charAt(path.length-1)!=='/') path+='/';
    return BASE + (path==='/' ? '/' : path) + query + hash;
  }
  document.addEventListener('click', function(e){
    if(e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a=e.target && e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    var target=a.getAttribute('target');
    if(target && target!=='_self') return;
    var next=rewrite(a.getAttribute('href'));
    if(!next) return;
    e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    else e.stopPropagation();
    location.assign(next);
  }, true);
})();</script>`;
}

export function injectBridge(html, slug) {
  if (html.includes('ddm-customizer-bridge') && html.includes('ddm-demo-base-nav')) return html;
  let inject = '';
  if (!html.includes('ddm-customizer-bridge')) inject += CUSTOMIZER_BRIDGE;
  if (slug && !html.includes('ddm-demo-base-nav')) inject += demoBaseNavScript(slug);
  if (!inject) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, inject + '</head>');
  return inject + html;
}
