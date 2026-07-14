/**
 * Shop page — filters, product grid, enquiry modal
 */

function initShopPage() {
  const grid = document.getElementById('shop-grid');
  const filtersEl = document.getElementById('shop-filters');
  if (!grid || typeof SHOP_PRODUCTS === 'undefined') return;

  let activeFilter = 'all';
  const modal = createShopModal();

  function renderProducts(filter) {
    const items = filter === 'all'
      ? SHOP_PRODUCTS
      : SHOP_PRODUCTS.filter((p) => p.category === filter);

    grid.innerHTML = items.map((p, i) => `
      <button type="button" class="shop-card shop-product bg-white rounded-2xl overflow-hidden shadow-sm reveal visible text-left"
        data-id="${p.id}" style="transition-delay:${(i % 5) * 0.05}s">
        <div class="shop-img-wrap aspect-square p-3 sm:p-4 flex items-center justify-center">
          <img src="${p.image}" alt="${p.brand} ${p.title}" class="max-h-full max-w-full object-contain" loading="lazy">
        </div>
        <div class="p-3 sm:p-4 border-t border-cream-dark">
          <p class="text-teal text-xs font-bold uppercase tracking-wide">${p.brand}</p>
          <h3 class="font-bold text-charcoal text-xs sm:text-sm leading-snug mt-1">${p.title}</h3>
          <p class="text-slate text-xs mt-1">${p.subtitle} · ${p.size}</p>
        </div>
      </button>
    `).join('');

    grid.querySelectorAll('.shop-product').forEach((card) => {
      card.addEventListener('click', () => {
        const product = SHOP_PRODUCTS.find((p) => p.id === Number(card.dataset.id));
        if (product) openShopModal(modal, product);
      });
    });
  }

  if (filtersEl) {
    filtersEl.innerHTML = SHOP_FILTERS.map((f) => `
      <button type="button" class="shop-filter${f.id === 'all' ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>
    `).join('');

    filtersEl.querySelectorAll('.shop-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        filtersEl.querySelectorAll('.shop-filter').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(activeFilter);
      });
    });
  }

  renderProducts(activeFilter);
}

function createShopModal() {
  let modal = document.getElementById('shop-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'shop-modal';
  modal.className = 'shop-modal';
  modal.innerHTML = `
    <div class="shop-modal-panel shadow-2xl">
      <button type="button" class="shop-modal-close absolute top-4 right-4 w-10 h-10 rounded-full bg-cream flex items-center justify-center text-charcoal hover:bg-cream-dark z-10" aria-label="Close">&times;</button>
      <div class="shop-img-wrap p-6 sm:p-8 flex items-center justify-center min-h-[220px]">
        <img src="" alt="" class="shop-modal-img max-h-56 object-contain">
      </div>
      <div class="p-6 sm:p-8 pt-0">
        <p class="shop-modal-brand text-teal text-sm font-bold uppercase tracking-wide"></p>
        <h2 class="shop-modal-title font-display text-2xl text-charcoal mt-1"></h2>
        <p class="shop-modal-subtitle text-slate font-medium mt-1"></p>
        <p class="shop-modal-desc text-slate text-sm mt-4 leading-relaxed"></p>
        <p class="text-xs text-slate mt-4">Available in-clinic · Mon–Fri 08:00–19:00</p>
        <div class="flex flex-wrap gap-3 mt-6">
          <a href="tel:0125655485" class="btn-primary px-6 py-3 rounded-full font-bold text-sm">Call to Enquire</a>
          <a href="#" class="shop-modal-wa border-2 border-teal text-teal px-6 py-3 rounded-full font-bold text-sm hover:bg-teal hover:text-white transition-all">WhatsApp</a>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  modal.querySelector('.shop-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });

  return modal;
}

function openShopModal(modal, product) {
  const msg = encodeURIComponent(`Hi, I'd like to enquire about: ${product.brand} ${product.title} (${product.subtitle}, ${product.size})`);
  modal.querySelector('.shop-modal-img').src = product.image;
  modal.querySelector('.shop-modal-img').alt = `${product.brand} ${product.title}`;
  modal.querySelector('.shop-modal-brand').textContent = product.brand;
  modal.querySelector('.shop-modal-title').textContent = product.title;
  modal.querySelector('.shop-modal-subtitle').textContent = `${product.subtitle} · ${product.size}`;
  modal.querySelector('.shop-modal-desc').textContent = product.desc;
  modal.querySelector('.shop-modal-wa').href = `https://wa.me/27762073640?text=${msg}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('DOMContentLoaded', initShopPage);
