/**
 * Presentation Mode — animated map journey with route tracing and flyer cards.
 * Depends on Leaflet (loaded via CDN in each page).
 */
(function () {
  'use strict';

  let map, overlay, flyer, progressBar, counter, polyline;
  let stops = [];
  let current = -1;
  let autoTimer = null;
  let playing = false;
  let animFrame = null;

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

    // Fit to full route briefly, then start
    const bounds = L.latLngBounds(stops.map(s => s.coords));
    map.fitBounds(bounds, { padding: [60, 60], animate: false });

    setTimeout(() => goTo(0), 600);
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    stopAutoPlay();
    cancelTrace();
    flyer.classList.remove('visible');
  }

  function goTo(idx) {
    if (idx < 0 || idx >= stops.length) return;
    cancelTrace();
    flyer.classList.remove('visible');

    const prevIdx = current;
    current = idx;
    const stop = stops[current];

    // Update progress
    progressBar.style.width = ((current + 1) / stops.length * 100) + '%';
    counter.textContent = `${current + 1} / ${stops.length}`;

    if (prevIdx >= 0 && prevIdx < current) {
      // Animate route trace from prevIdx to current
      traceRoute(prevIdx, current, () => showFlyer(stop));
    } else if (prevIdx > current) {
      // Going backwards — redraw instantly up to current
      drawRouteInstant(current);
      const zoom = stop.zoom || 11;
      map.flyTo(stop.coords, zoom, { duration: 1.2 });
      setTimeout(() => showFlyer(stop), 900);
    } else {
      // First stop
      const zoom = stop.zoom || 11;
      map.flyTo(stop.coords, zoom, { duration: 1.5 });
      setTimeout(() => showFlyer(stop), 1000);
    }
  }

  /**
   * Animate the route line tracing from one stop to the next,
   * interpolating points along the way for smooth drawing.
   */
  function traceRoute(fromIdx, toIdx, onComplete) {
    const segmentStops = stops.slice(fromIdx, toIdx + 1);
    const allPoints = [];

    // Generate intermediate points between each pair of consecutive stops
    for (let i = 0; i < segmentStops.length - 1; i++) {
      const start = segmentStops[i].coords;
      const end = segmentStops[i + 1].coords;
      const steps = 40; // points per segment
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        allPoints.push([
          start[0] + (end[0] - start[0]) * t,
          start[1] + (end[1] - start[1]) * t
        ]);
      }
    }

    // Get existing route points (up to fromIdx)
    const existingCoords = stops.slice(0, fromIdx + 1).map(s => s.coords);

    // Remove old polyline
    if (polyline) map.removeLayer(polyline);
    polyline = L.polyline(existingCoords, {
      color: '#1F9B8C',
      weight: 3.5,
      opacity: .85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Pan map to show the destination
    const destStop = stops[toIdx];
    const zoom = destStop.zoom || 11;

    // Fit bounds to show both current position and destination during trace
    const traceBounds = L.latLngBounds([stops[fromIdx].coords, destStop.coords]);
    map.flyToBounds(traceBounds, { padding: [80, 80], duration: 1.0, maxZoom: zoom });

    // Animate drawing the new segment
    let pointIdx = 0;
    const totalDuration = 2000; // ms for the full trace
    const interval = totalDuration / allPoints.length;
    const startTime = performance.now();

    function drawNext(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const targetIdx = Math.floor(progress * (allPoints.length - 1));

      // Add all points up to targetIdx
      while (pointIdx <= targetIdx && pointIdx < allPoints.length) {
        polyline.addLatLng(allPoints[pointIdx]);
        pointIdx++;
      }

      if (progress < 1) {
        animFrame = requestAnimationFrame(drawNext);
      } else {
        // Ensure all points are added
        while (pointIdx < allPoints.length) {
          polyline.addLatLng(allPoints[pointIdx]);
          pointIdx++;
        }
        // Now zoom to final destination
        map.flyTo(destStop.coords, zoom, { duration: 0.8 });
        setTimeout(onComplete, 600);
      }
    }

    animFrame = requestAnimationFrame(drawNext);
  }

  function cancelTrace() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function drawRouteInstant(upToIdx) {
    if (polyline) map.removeLayer(polyline);
    const coords = stops.slice(0, upToIdx + 1).map(s => s.coords);
    if (coords.length < 2) { polyline = null; return; }
    polyline = L.polyline(coords, {
      color: '#1F9B8C',
      weight: 3.5,
      opacity: .85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }

  function showFlyer(stop) {
    const img = flyer.querySelector('.pres-flyer-img');
    if (stop.image) {
      img.src = stop.image;
      img.alt = stop.title;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
    flyer.querySelector('.pres-flyer-eyebrow').textContent = stop.eyebrow || `Day ${current + 1}`;
    flyer.querySelector('.pres-flyer-title').textContent = stop.title;
    flyer.querySelector('.pres-flyer-desc').textContent = stop.desc;

    const chipsEl = flyer.querySelector('.pres-flyer-chips');
    chipsEl.innerHTML = (stop.chips || []).map(c => `<span class="pres-flyer-chip">${c}</span>`).join('');

    flyer.classList.add('visible');
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
    }, 6000);
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
