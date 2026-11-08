// Tiny progressive enhancement for a native CSS scroll-snap screenshot carousel.
// Manual swipe works even if JavaScript is unavailable. No autoplay.
(() => {
  const carousel = document.querySelector('[data-screenshot-carousel]');
  if (!carousel) return;
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.querySelectorAll('.carousel-slide')];
  const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
  const prev = carousel.querySelector('[data-carousel-prev]');
  const next = carousel.querySelector('[data-carousel-next]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;

  function updateControls(index) {
    active = Math.max(0, Math.min(index, slides.length - 1));
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
    prev.disabled = active === 0;
    next.disabled = active === slides.length - 1;
  }

  function goTo(index) {
    const target = Math.max(0, Math.min(index, slides.length - 1));
    const offset = slides[target].offsetLeft - slides[0].offsetLeft;
    track.scrollTo({ left: offset, behavior: prefersReducedMotion.matches ? 'instant' : 'smooth' });
    updateControls(target);
  }

  prev.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  // Keep dots/arrows in sync when the user swipes on a phone or trackpad.
  let scheduled = false;
  track.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const left = track.scrollLeft;
      let nearest = 0;
      let best = Infinity;
      slides.forEach((slide, i) => {
        const delta = Math.abs(slide.offsetLeft - slides[0].offsetLeft - left);
        if (delta < best) { best = delta; nearest = i; }
      });
      updateControls(nearest);
    });
  }, { passive: true });

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); }
  });
  updateControls(0);
})();
