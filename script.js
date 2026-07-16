const body = document.body;
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.main-menu');
const menuBackdrop = document.querySelector('.menu-backdrop');
const menuClose = document.querySelector('[data-menu-close]');
const carousel = document.getElementById('project-carousel');
const prevButton = document.getElementById('project-prev');
const nextButton = document.getElementById('project-next');
const currentLabel = document.getElementById('carousel-current');
const totalLabel = document.getElementById('carousel-total');
const progress = document.getElementById('carousel-progress');
const chips = [...document.querySelectorAll('.chip')];
const allCards = [...carousel.querySelectorAll('.project-card')];

const numbers = {
  Monteazul: '51918833937',
  'El Sauce': '51916677834'
};

const pad = number => String(number).padStart(2, '0');
const visibleCards = () => allCards.filter(card => !card.classList.contains('hidden'));

let lastMenuFocus = null;

function setMenu(open) {
  const isMobileMenu = window.matchMedia('(max-width: 880px)').matches;
  const shouldOpen = Boolean(open && isMobileMenu);

  if (shouldOpen) lastMenuFocus = document.activeElement;

  menuToggle.setAttribute('aria-expanded', String(shouldOpen));
  menuToggle.setAttribute('aria-label', shouldOpen ? 'Cerrar menú' : 'Abrir menú');
  menu.classList.toggle('open', shouldOpen);
  menuBackdrop.classList.toggle('open', shouldOpen);
  menu.setAttribute('aria-hidden', String(isMobileMenu && !shouldOpen));
  body.classList.toggle('menu-open', shouldOpen);

  if (shouldOpen) {
    window.setTimeout(() => menuClose.focus(), 180);
  } else if (lastMenuFocus && document.contains(lastMenuFocus)) {
    lastMenuFocus.focus({ preventScroll: true });
    lastMenuFocus = null;
  }
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
menuClose.addEventListener('click', () => setMenu(false));
menuBackdrop.addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 80), { passive: true });

/* Carrusel infinito */
let loopCardCount = 0;
let loopSetWidth = 0;
let isRebuildingLoop = false;
let normalizeTimer = 0;
let autoplayTimer = 0;
let autoplayPaused = false;
let isPointerDown = false;
let pointerStartX = 0;
let startScrollLeft = 0;

function cardStep() {
  const card = visibleCards()[0];
  if (!card) return carousel.clientWidth;
  const styles = getComputedStyle(carousel);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '24') || 24;
  return card.getBoundingClientRect().width + gap;
}

function logicalCarouselIndex() {
  if (!loopCardCount) return 0;
  if (loopCardCount === 1 || !loopSetWidth) return 0;
  const rawIndex = Math.round((carousel.scrollLeft - loopSetWidth) / cardStep());
  return ((rawIndex % loopCardCount) + loopCardCount) % loopCardCount;
}

function updateCarouselStatus() {
  const total = loopCardCount || visibleCards().length || 1;
  const current = logicalCarouselIndex() + 1;
  currentLabel.textContent = pad(current);
  totalLabel.textContent = pad(total);
  progress.style.width = `${(current / total) * 100}%`;
}

function makeCarouselClone(card) {
  const clone = card.cloneNode(true);
  clone.classList.add('carousel-clone');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach(element => {
    element.tabIndex = -1;
  });
  return clone;
}

function removeCarouselClones() {
  carousel.querySelectorAll('.carousel-clone').forEach(clone => clone.remove());
}

function rebuildInfiniteCarousel(startIndex = 0) {
  isRebuildingLoop = true;
  window.clearTimeout(normalizeTimer);
  removeCarouselClones();

  const cards = visibleCards();
  loopCardCount = cards.length;
  loopSetWidth = 0;

  if (!cards.length) {
    carousel.scrollLeft = 0;
    isRebuildingLoop = false;
    updateCarouselStatus();
    restartAutoplay();
    return;
  }

  if (cards.length > 1) {
    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    cards.forEach(card => before.append(makeCarouselClone(card)));
    cards.forEach(card => after.append(makeCarouselClone(card)));
    carousel.prepend(before);
    carousel.append(after);
  }

  requestAnimationFrame(() => {
    const step = cardStep();
    loopSetWidth = cards.length > 1 ? step * cards.length : 0;
    const safeIndex = Math.max(0, Math.min(startIndex, cards.length - 1));
    carousel.scrollLeft = cards.length > 1 ? loopSetWidth + safeIndex * step : 0;
    isRebuildingLoop = false;
    updateCarouselStatus();
    restartAutoplay();
  });
}

function normalizeInfinitePosition() {
  if (isRebuildingLoop || loopCardCount <= 1 || !loopSetWidth) return;

  const left = carousel.scrollLeft;
  if (left < loopSetWidth) {
    carousel.scrollLeft = left + loopSetWidth;
  } else if (left >= loopSetWidth * 2) {
    carousel.scrollLeft = left - loopSetWidth;
  }
  updateCarouselStatus();
}

function moveCarousel(direction) {
  if (!loopCardCount) return;
  carousel.scrollBy({ left: direction * cardStep(), behavior: 'smooth' });
}

prevButton.addEventListener('click', () => moveCarousel(-1));
nextButton.addEventListener('click', () => moveCarousel(1));

carousel.addEventListener('scroll', () => {
  requestAnimationFrame(updateCarouselStatus);
  window.clearTimeout(normalizeTimer);
  normalizeTimer = window.setTimeout(normalizeInfinitePosition, 120);
}, { passive: true });

carousel.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveCarousel(1);
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveCarousel(-1);
  }
});

carousel.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  isPointerDown = true;
  autoplayPaused = true;
  pointerStartX = event.clientX;
  startScrollLeft = carousel.scrollLeft;
  carousel.setPointerCapture(event.pointerId);
});

carousel.addEventListener('pointermove', event => {
  if (!isPointerDown) return;
  carousel.scrollLeft = startScrollLeft - (event.clientX - pointerStartX);
});

function endPointerInteraction() {
  if (!isPointerDown) return;
  isPointerDown = false;
  normalizeInfinitePosition();
  autoplayPaused = false;
  restartAutoplay();
}

carousel.addEventListener('pointerup', endPointerInteraction);
carousel.addEventListener('pointercancel', endPointerInteraction);

function restartAutoplay() {
  window.clearInterval(autoplayTimer);
  if (autoplayPaused || loopCardCount <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  autoplayTimer = window.setInterval(() => moveCarousel(1), 5200);
}

carousel.addEventListener('mouseenter', () => {
  autoplayPaused = true;
  window.clearInterval(autoplayTimer);
});
carousel.addEventListener('mouseleave', () => {
  autoplayPaused = false;
  restartAutoplay();
});
carousel.addEventListener('focusin', () => {
  autoplayPaused = true;
  window.clearInterval(autoplayTimer);
});
carousel.addEventListener('focusout', () => {
  autoplayPaused = false;
  restartAutoplay();
});
document.addEventListener('visibilitychange', () => {
  autoplayPaused = document.hidden;
  restartAutoplay();
});

function filterCards(filter) {
  allCards.forEach(card => {
    const isAll = filter === 'all';
    const matchesBrand = card.dataset.brand === filter;
    const matchesTag = card.dataset.tags.split(' ').includes(filter);
    card.classList.toggle('hidden', !(isAll || matchesBrand || matchesTag));
  });
  rebuildInfiniteCarousel();
}

chips.forEach(chip => chip.addEventListener('click', () => {
  chips.forEach(item => item.classList.remove('active'));
  chip.classList.add('active');
  filterCards(chip.dataset.filter);
}));

document.querySelectorAll('[data-menu-filter]').forEach(link => {
  link.addEventListener('click', () => {
    const selectedFilter = link.dataset.menuFilter;
    const matchingChip = chips.find(chip => chip.dataset.filter === selectedFilter);
    if (!matchingChip) return;
    chips.forEach(item => item.classList.remove('active'));
    matchingChip.classList.add('active');
    filterCards(selectedFilter);
  });
});

const searchForm = document.getElementById('property-search');
searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const brand = document.getElementById('search-project').value;
  const budget = document.getElementById('search-budget').value;
  const mode = document.getElementById('search-mode').value;
  chips.forEach(item => item.classList.remove('active'));

  allCards.forEach(card => {
    const brandMatch = brand === 'all' || card.dataset.brand === brand;
    const budgetMatch = budget === 'all' || Number(card.dataset.price) >= Number(budget);
    const modeMatch = mode === 'all' || card.dataset.tags.split(' ').includes(mode);
    card.classList.toggle('hidden', !(brandMatch && budgetMatch && modeMatch));
  });

  let results = visibleCards();
  if (!results.length) {
    allCards.forEach(card => card.classList.remove('hidden'));
    results = visibleCards();
    alert('No encontramos una coincidencia exacta. Te mostramos todas las opciones para que puedas compararlas.');
  }

  rebuildInfiniteCarousel();
  document.getElementById('proyectos').scrollIntoView({ behavior: 'smooth' });
});

const modal = document.getElementById('lead-modal');
const modalProject = document.getElementById('modal-project');
const modalBrand = document.getElementById('modal-brand');
const modalTitle = document.getElementById('modal-title');

function openModal(project, brand) {
  modalProject.value = project;
  modalBrand.value = brand;
  modalTitle.textContent = project;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  body.classList.add('modal-open');
  setTimeout(() => document.getElementById('modal-name').focus(), 100);
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  body.classList.remove('modal-open');
}

carousel.addEventListener('click', event => {
  const button = event.target.closest('.open-lead');
  if (!button) return;
  openModal(button.dataset.project, button.dataset.brandName);
});
document.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeModal));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    setMenu(false);
  }

  if (event.key === 'Tab' && menu.classList.contains('open')) {
    const focusable = [...menu.querySelectorAll('a[href], button:not([disabled])')]
      .filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

function openWhatsApp({ brand, name, phone, project, message = '' }) {
  const number = numbers[brand] || numbers.Monteazul;
  const text = [
    `Hola, soy ${name}.`,
    `Estoy interesado(a) en ${project}.`,
    phone ? `Mi número de contacto es ${phone}.` : '',
    message ? `Consulta: ${message}` : '',
    '¿Podrían enviarme información y disponibilidad actualizada?'
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

document.getElementById('modal-form').addEventListener('submit', event => {
  event.preventDefault();
  openWhatsApp({
    brand: modalBrand.value,
    name: document.getElementById('modal-name').value.trim(),
    phone: document.getElementById('modal-phone').value.trim(),
    project: modalProject.value
  });
  closeModal();
});

document.getElementById('lead-form').addEventListener('submit', event => {
  event.preventDefault();
  openWhatsApp({
    brand: document.getElementById('lead-brand').value,
    name: document.getElementById('lead-name').value.trim(),
    phone: document.getElementById('lead-phone').value.trim(),
    project: document.getElementById('lead-project').value,
    message: document.getElementById('lead-message').value.trim()
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
document.getElementById('year').textContent = new Date().getFullYear();

window.addEventListener('resize', () => {
  if (!window.matchMedia('(max-width: 880px)').matches) {
    setMenu(false);
    menu.setAttribute('aria-hidden', 'false');
  } else if (!menu.classList.contains('open')) {
    menu.setAttribute('aria-hidden', 'true');
  }

  window.clearTimeout(normalizeTimer);
  normalizeTimer = window.setTimeout(() => rebuildInfiniteCarousel(logicalCarouselIndex()), 160);
});

if (window.matchMedia('(max-width: 880px)').matches) {
  menu.setAttribute('aria-hidden', 'true');
}

rebuildInfiniteCarousel();
