// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navMenu.addEventListener('click', (e) => {
    if (e.target.matches('a')) {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== Gallery loader (group by year, sort by date) =====
const rootEl = document.getElementById('gallery-root');
const filterEl = document.getElementById('year-filter');
let renderedYears = [];

async function loadGallery() {
  try {
    const res = await fetch('assets/img/iron-heads/images.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('No images.json yet');
    const images = await res.json();
    if (!Array.isArray(images) || images.length === 0) {
      rootEl.innerHTML = '<p class="muted">No images yet. Run <code>import-gallery.ps1</code> or use the Add images button above.</p>';
      return;
    }

    const items = images.map((it) => {
      let date = it.date ? new Date(it.date) : null;
      if (!date || isNaN(date)) date = null;
      if (!date && it.src) {
        const m = it.src.match(/(20\d{2})[-_]?(\d{2})?[-_]?(\d{2})?/);
        if (m) {
          const y = parseInt(m[1], 10);
          const mo = m[2] ? parseInt(m[2], 10) : 1;
          const d = m[3] ? parseInt(m[3], 10) : 1;
          date = new Date(Date.UTC(y, mo - 1, d));
        }
      }
      const year = it.year || (date ? date.getUTCFullYear() : 'Unsorted');
      return { src: it.src, alt: it.alt || '', caption: it.caption || it.alt || '', date: date ? date.toISOString() : null, year };
    });

    const byYear = new Map();
    for (const it of items) {
      const y = it.year;
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(it);
    }

    const years = Array.from(byYear.keys());
    years.sort((a, b) => {
      if (a === 'Unsorted') return 1; if (b === 'Unsorted') return -1; return Number(b) - Number(a);
    });
    renderedYears = years;

    // Populate filter dropdown
    if (filterEl) {
      // Clear except the first option
      filterEl.innerHTML = '<option value="all">All years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
      // If URL has ?year=YYYY preselect
      const params = new URLSearchParams(location.search);
      const qYear = params.get('year');
      if (qYear && years.includes(Number(qYear)) || years.includes(qYear)) {
        filterEl.value = qYear;
      }
    }

    // Build DOM
    rootEl.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (const y of years) {
      const section = document.createElement('section');
      section.className = 'year-block';
      section.dataset.year = String(y);
      const h = document.createElement('h3'); h.className = 'year-heading'; h.textContent = String(y); section.appendChild(h);

      const photos = byYear.get(y).slice().sort((p1, p2) => {
        if (p1.date && p2.date && p1.date !== p2.date) return new Date(p1.date) - new Date(p2.date);
        return (p1.src || '').localeCompare(p2.src || '');
      });

      const grid = document.createElement('div'); grid.className = 'gallery-grid';
      for (const img of photos) {
        const fig = document.createElement('figure');
        const image = document.createElement('img'); image.loading = 'lazy'; image.src = img.src; image.alt = img.alt; image.width = 800; image.height = 600; fig.appendChild(image);
        if (img.caption) { const cap = document.createElement('figcaption'); cap.textContent = img.caption; fig.appendChild(cap); }
        fig.addEventListener('click', () => openLightbox(img.src, img.caption || ''));
        grid.appendChild(fig);
      }
      section.appendChild(grid);
      frag.appendChild(section);
    }

    rootEl.appendChild(frag);
    applyFilter();
  } catch (e) {
    rootEl.innerHTML = '<p class="muted">No images yet. Run <code>import-gallery.ps1</code> or use the Add images button above.</p>';
  }
}

// Filter logic
function applyFilter() {
  const val = filterEl ? filterEl.value : 'all';
  const blocks = document.querySelectorAll('.year-block');
  blocks.forEach(b => {
    b.style.display = (val === 'all' || b.dataset.year === String(val)) ? '' : 'none';
  });
}
if (filterEl) filterEl.addEventListener('change', () => {
  // update query param
  const params = new URLSearchParams(location.search);
  if (filterEl.value === 'all') params.delete('year'); else params.set('year', filterEl.value);
  const newUrl = `${location.pathname}?${params.toString()}`.replace(/\?$/, '');
  history.replaceState(null, '', newUrl);
  applyFilter();
});

// Simple lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeBtn = document.querySelector('.lightbox-close');
function openLightbox(src, caption) { lightboxImg.src = src; lightboxImg.alt = caption; lightboxCaption.textContent = caption; lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden', 'false'); }
function closeLightbox() { lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden', 'true'); }
closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// Client-side add images (preview only)
const fileInput = document.getElementById('file-input');
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const unsorted = document.querySelector('.year-block[data-year="Unsorted"] .gallery-grid') || document.querySelector('#gallery-root');
    const frag = document.createDocumentFragment();
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const fig = document.createElement('figure');
      const image = document.createElement('img'); image.src = url; image.alt = file.name; image.loading = 'lazy';
      fig.appendChild(image);
      const cap = document.createElement('figcaption'); cap.textContent = file.name; fig.appendChild(cap);
      fig.addEventListener('click', () => openLightbox(url, file.name));
      frag.appendChild(fig);
    });
    if (unsorted && unsorted.prepend) unsorted.prepend(frag);
  });
}

loadGallery();
