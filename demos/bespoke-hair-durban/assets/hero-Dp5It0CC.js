import{P as T,S as H,p as k,i as M,h as q,H as A,a as B}from"./images-data-je3FWEv8.js";const w=["Luxury hair wash and treatment at Bespoke Hair Durban","Expert hair styling and curls at Bespoke Hair Durban","Precision cut and finish at Bespoke Hair Durban","Luxury balayage and colour at Bespoke Hair Durban","Bespoke Hair Durban salon experience"];function x(i,n){const l=M(i),_=q(i),d=["hero__slide-img--pan-right","hero__slide-img--pan-left","hero__slide-img--pan-up"][n%3],c=n===0,s=c?"":' loading="lazy"',o=c?' fetchpriority="high"':"";return`
    <picture>
      <source type="image/webp" sizes="${A}" srcset="${_}">
      <img class="hero__slide-img ${d}" src="${l}" alt="${w[n]||"Bespoke Hair Durban"}" width="1920" height="1280" decoding="async"${s}${o}>
    </picture>`}function D(){const i=document.querySelector("#hero-carousel"),n=document.querySelector("#hero-dots"),l=document.querySelector("#hero-prev"),_=document.querySelector("#hero-next"),d=document.querySelector(".hero__media");if(!i||!n)return;const c=T.heroCarousel;let s=0,o=null;const v=6e3,$=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let S=0,m=0;i.innerHTML=c.map((e,t)=>`
    <div class="hero__slide${t===0?" hero__slide--active":""}" data-slide="${t}" role="group" aria-roledescription="slide" aria-label="Slide ${t+1} of ${c.length}">
      <div class="hero__slide-frame">
        ${x(e,t)}
      </div>
    </div>`).join(""),n.innerHTML=c.map((e,t)=>`
    <button type="button" class="hero__dot${t===0?" hero__dot--active":""}" data-dot="${t}" role="tab" aria-label="Go to slide ${t+1}" aria-selected="${t===0}"></button>`).join("");const b=i.querySelectorAll(".hero__slide"),E=n.querySelectorAll(".hero__dot");function u(e){s=(e+c.length)%c.length,b.forEach((t,p)=>{const L=p===s;if(t.classList.toggle("hero__slide--active",L),L){const y=t.querySelector(".hero__slide-img");y&&(y.style.animation="none",y.offsetWidth,y.style.animation="")}}),E.forEach((t,p)=>{t.classList.toggle("hero__dot--active",p===s),t.setAttribute("aria-selected",String(p===s))})}function h(){u(s+1)}function g(){u(s-1)}function a(){$||c.length<2||(f(),o=setInterval(h,v))}function f(){o&&(clearInterval(o),o=null)}n.addEventListener("click",e=>{const t=e.target.closest("[data-dot]");t&&(u(Number(t.dataset.dot)),a())}),l?.addEventListener("click",()=>{g(),a()}),_?.addEventListener("click",()=>{h(),a()});const r=i.closest(".hero");r?.addEventListener("mouseenter",f),r?.addEventListener("mouseleave",a),d&&(d.addEventListener("touchstart",e=>{S=e.changedTouches[0].screenX,m=e.changedTouches[0].screenY},{passive:!0}),d.addEventListener("touchend",e=>{const t=e.changedTouches[0].screenX-S,p=e.changedTouches[0].screenY-m;Math.abs(t)<40||Math.abs(t)<Math.abs(p)||(t<0?h():g(),a())},{passive:!0})),a()}function X(){const i=document.querySelector("#hero-services"),n=document.querySelector("#hero-services-track"),l=document.querySelector("#hero-services-dots"),_=document.querySelector("#hero-services-prev"),d=document.querySelector("#hero-services-next"),c=document.querySelector("#hero-services-viewport");if(!i||!n||!l)return;const s=H;let o=0,v=null;const $=5e3,S=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let m=0,b=0;n.innerHTML=s.map((r,e)=>`
    <a href="/demos/bespoke-hair-durban/services.html" class="hero-services__slide" data-service-slide="${e}" role="group" aria-roledescription="slide" aria-label="${r.title}, slide ${e+1} of ${s.length}">
      <article class="hero-service-card">
        <div class="hero-service-card__image">
          ${k(r.image,{alt:`${r.title} at Bespoke Hair Durban`,sizes:B})}
        </div>
        <div class="hero-service-card__body">
          <h3 class="hero-service-card__title">${r.title}</h3>
          <p class="hero-service-card__desc">${r.desc}</p>
          <div class="hero-service-card__meta">
            <span class="hero-service-card__price">${r.price}</span>
            <span class="hero-service-card__link">View</span>
          </div>
        </div>
      </article>
    </a>`).join(""),l.innerHTML=s.map((r,e)=>`
    <button type="button" class="hero-services__dot${e===0?" hero-services__dot--active":""}" data-service-dot="${e}" role="tab" aria-label="Go to ${s[e].title}" aria-selected="${e===0}"></button>`).join("");const E=l.querySelectorAll(".hero-services__dot");function u(r){o=(r+s.length)%s.length,n.style.transform=`translate3d(-${o*100}%, 0, 0)`,E.forEach((e,t)=>{e.classList.toggle("hero-services__dot--active",t===o),e.setAttribute("aria-selected",String(t===o))})}function h(){u(o+1)}function g(){u(o-1)}function a(){S||s.length<2||(f(),v=setInterval(h,$))}function f(){v&&(clearInterval(v),v=null)}l.addEventListener("click",r=>{const e=r.target.closest("[data-service-dot]");e&&(u(Number(e.dataset.serviceDot)),a())}),_?.addEventListener("click",()=>{g(),a()}),d?.addEventListener("click",()=>{h(),a()}),i.addEventListener("mouseenter",f),i.addEventListener("mouseleave",a),c?.addEventListener("touchstart",r=>{m=r.changedTouches[0].screenX,b=r.changedTouches[0].screenY},{passive:!0}),c?.addEventListener("touchend",r=>{const e=r.changedTouches[0].screenX-m,t=r.changedTouches[0].screenY-b;Math.abs(e)<35||Math.abs(e)<Math.abs(t)||(e<0?h():g(),a())},{passive:!0}),a()}export{D as initHeroCarousel,X as initHeroServicesCarousel};
