/**
 * Presentation Mode — animated map journey with flyer cards.
 * Depends on Leaflet (loaded via CDN in each page).
 */
(function () {
  'use strict';

  let map, overlay, flyer, progressBar, counter, polyline;
  let stops = [];
  let current = -1;
  let autoTimer = null;
  let playing = false;

  function init(tripStops) {
    stops = tripStops;
    buildDOM();
    bindKeys();
  }

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.className = 'pres-overlay';
    overlay.innerHTML = `
      <div class="pres-progress"><div class="pres-progress-bar"></div></div>
      <div class="pres-counter"></div>
      <button class="pres-close" aria-label="Close presentation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div class="pres-map" id="pres-map-container"></div>
      <div class="pres-flyer">
        <img class="pres-flyer-img" src="" alt="">
        <div class="pres-flyer-body">
          <div class="pres-flyer-eyebrow"></div>
          <h3 class="pres-flyer-title"></h3>
          <p class="pres-flyer-desc"></p>
          <div class="pres-flyer-chips"></div>
        </div>
      </div>
      <div class="pres-controls">
        <button class="pres-btn pres-prev" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="pres-btn pres-play" aria-label="Play/Pause">
          <svg class="ico-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg class="ico-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
        </button>
        <button class="pres-btn pres-next" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    flyer = overlay.querySelector('.pres-flyer');
    progressBar = overlay.querySelector('.pres-progress-bar');
    counter = overlay.querySelector('.pres-counter');

    overlay.querySelector('.pres-close').addEventListener('click', close);
    overlay.querySelector('.pres-prev').addEventListener('click', prev);
    overlay.querySelector('.pres-next').addEventListener('click', next);
    overlay.querySelector('.pres-play').addEventListener('click', togglePlay);
  }

  function open() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!map) {
      map = L.map('pres-map-container', {
        zoomControl: false,
        attributionControl: false
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18
      }).addTo(map);
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/">OSM</a> · <a href="https://carto.com/">CARTO</a>')
        .addTo(map);
    }

    // Reset
    current = -1;
    if (polyline) { map.removeLayer(polyline); polyline = null; }

    // Fit to full route
    const bounds = L.latLngBounds(stops.map(s => s.coords));
    map.fitBounds(bounds, { padding: [60, 60] });

    // Start after a brief pause
    setTimeout(() => goTo(0), 800);
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    stopAutoPlay();
    flyer.classList.remove('visible');
  }

  function goTo(idx) {
    if (idx < 0 || idx >= stops.length) return;
    current = idx;

    const stop = stops[current];
    flyer.classList.remove('visible');

    // Animate map
    const zoom = stop.zoom || 11;
    map.flyTo(stop.coords, zoom, { duration: 1.8, easeLinearity: 0.3 });

    // Draw route line up to this point
    drawRoute(current);

    // Update progress
    progressBar.style.width = ((current + 1) / stops.length * 100) + '%';
    counter.textContent = `${current + 1} / ${stops.length}`;

    // Show flyer after map animation
    setTimeout(() => {
      const img = flyer.querySelector('.pres-flyer-img');
      if (stop.image) {
        img.src = stop.image;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
      flyer.querySelector('.pres-flyer-eyebrow').textContent = stop.eyebrow || `Day ${stop.day || current + 1}`;
      flyer.querySelector('.pres-flyer-title').textContent = stop.title;
      flyer.querySelector('.pres-flyer-desc').textContent = stop.desc;

      const chipsEl = flyer.querySelector('.pres-flyer-chips');
      chipsEl.innerHTML = (stop.chips || []).map(c => `<span class="pres-flyer-chip">${c}</span>`).join('');

      flyer.classList.add('visible');
    }, 1200);
  }

  function drawRoute(upToIdx) {
    if (polyline) map.removeLayer(polyline);
    const coords = stops.slice(0, upToIdx + 1).map(s => s.coords);
    if (coords.length < 2) return;
    polyline = L.polyline(coords, {
      color: '#1F9B8C',
      weight: 3.5,
      opacity: .8,
      dashArray: '8 6',
      lineCap: 'round'
    }).addTo(map);
  }

  function next() {
    if (current < stops.length - 1) goTo(current + 1);
    else stopAutoPlay();
  }

  function prev() {
    if (current > 0) goTo(current - 1);
  }

  function togglePlay() {
    if (playing) stopAutoPlay();
    else startAutoPlay();
  }

  function startAutoPlay() {
    playing = true;
    updatePlayIcon();
    if (current >= stops.length - 1) goTo(0);
    else next();
    autoTimer = setInterval(() => {
      if (current < stops.length - 1) next();
      else stopAutoPlay();
    }, 5000);
  }

  function stopAutoPlay() {
    playing = false;
    updatePlayIcon();
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  function updatePlayIcon() {
    const playIco = overlay.querySelector('.ico-play');
    const pauseIco = overlay.querySelector('.ico-pause');
    playIco.style.display = playing ? 'none' : 'block';
    pauseIco.style.display = playing ? 'block' : 'none';
  }

  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
  }

  // Expose globally
  window.TripPresentation = { init, open };
})();
