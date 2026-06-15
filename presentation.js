/**
 * Presentation Mode — cinematic animated map journey.
 * Traces routes smoothly with a moving marker, pulsing stops, and flyer cards.
 */
(function () {
  'use strict';

  let map, overlay, flyer, progressBar, counter;
  let routeLine, traceLayer, activeMarker;
  let stopMarkers = [];
  let stops = [];
  let current = -1;
  let autoTimer = null;
  let playing = false;
  let animFrame = null;
  let tracing = false;

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
        <div class="pres-flyer-accent"></div>
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

    // Reset everything
    current = -1;
    cleanup();

    // Draw the full ghost route (faint)
    const allCoords = stops.map(s => s.coords);
    routeLine = L.polyline(allCoords, {
      color: '#1F9B8C', weight: 2, opacity: .15,
      dashArray: '6 8', lineCap: 'round'
    }).addTo(map);

    // Add stop dots
    stops.forEach((s, i) => {
      const icon = L.divIcon({ className: '', html: '<div class="pres-stop-dot"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
      const m = L.marker(s.coords, { icon }).addTo(map);
      stopMarkers.push(m);
    });

    // Trace layer (the solid animated line)
    traceLayer = L.polyline([], {
      color: '#1F9B8C', weight: 4, opacity: .9,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(map);

    // Active position marker
    const markerIcon = L.divIcon({ className: '', html: '<div class="pres-marker"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    activeMarker = L.marker(stops[0].coords, { icon: markerIcon, zIndexOffset: 1000 }).addTo(map);

    // Fit full route, then zoom to start
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, { padding: [60, 60], animate: false });

    setTimeout(() => goTo(0), 800);
  }

  function cleanup() {
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (traceLayer) { map.removeLayer(traceLayer); traceLayer = null; }
    if (activeMarker) { map.removeLayer(activeMarker); activeMarker = null; }
    stopMarkers.forEach(m => map.removeLayer(m));
    stopMarkers = [];
    cancelTrace();
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    stopAutoPlay();
    cancelTrace();
    flyer.classList.remove('visible');
  }

  function goTo(idx) {
    if (idx < 0 || idx >= stops.length || tracing) return;
    cancelTrace();
    flyer.classList.remove('visible');

    const prevIdx = current;
    current = idx;
    const stop = stops[current];

    // Update progress
    progressBar.style.width = ((current + 1) / stops.length * 100) + '%';
    counter.textContent = `${current + 1} / ${stops.length}`;

    // Update stop dot styles
    stopMarkers.forEach((m, i) => {
      const el = m.getElement();
      if (el) {
        const dot = el.querySelector('.pres-stop-dot');
        if (dot) dot.classList.toggle('active', i === current);
      }
    });

    if (prevIdx >= 0 && Math.abs(prevIdx - current) === 1 && prevIdx < current) {
      // Trace forward one step
      traceToStop(prevIdx, current, () => {
        arriveAt(stop);
      });
    } else {
      // Jump (first stop, or going backwards, or skipping)
      rebuildTrace(current);
      activeMarker.setLatLng(stop.coords);
      const zoom = stop.zoom || 11;
      map.flyTo(stop.coords, zoom, { duration: 1.4 });
      setTimeout(() => arriveAt(stop), 1000);
    }
  }

  function traceToStop(fromIdx, toIdx, onComplete) {
    tracing = true;
    const from = stops[fromIdx].coords;
    const to = stops[toIdx].coords;
    const destZoom = stops[toIdx].zoom || 11;

    // Generate interpolated points
    const numPoints = 60;
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Ease-in-out for smoother feel
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      points.push([
        from[0] + (to[0] - from[0]) * ease,
        from[1] + (to[1] - from[1]) * ease
      ]);
    }

    // Pan map to show journey mid-point, then destination
    const midBounds = L.latLngBounds([from, to]);
    const midZoom = Math.min(map.getBoundsZoom(midBounds, false) - 0.5, destZoom);
    map.flyTo([(from[0]+to[0])/2, (from[1]+to[1])/2], midZoom, { duration: 0.8 });

    // Animate the trace
    let pointIdx = 0;
    const duration = 2200;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const targetIdx = Math.floor(progress * (points.length - 1));

      while (pointIdx <= targetIdx && pointIdx < points.length) {
        traceLayer.addLatLng(points[pointIdx]);
        activeMarker.setLatLng(points[pointIdx]);
        pointIdx++;
      }

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        // Ensure we land exactly on destination
        traceLayer.addLatLng(to);
        activeMarker.setLatLng(to);
        // Final zoom to destination
        map.flyTo(to, destZoom, { duration: 0.9 });
        setTimeout(() => {
          tracing = false;
          onComplete();
        }, 700);
      }
    }

    // Small delay to let the initial pan start
    setTimeout(() => {
      animFrame = requestAnimationFrame(tick);
    }, 400);
  }

  function rebuildTrace(upToIdx) {
    // Rebuild the trace line up to the current stop
    if (traceLayer) map.removeLayer(traceLayer);
    const coords = stops.slice(0, upToIdx + 1).map(s => s.coords);
    traceLayer = L.polyline(coords, {
      color: '#1F9B8C', weight: 4, opacity: .9,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
  }

  function arriveAt(stop) {
    flyer.querySelector('.pres-flyer-eyebrow').textContent = stop.eyebrow || `Day ${current + 1}`;
    flyer.querySelector('.pres-flyer-title').textContent = stop.title;
    flyer.querySelector('.pres-flyer-desc').textContent = stop.desc;

    const chipsEl = flyer.querySelector('.pres-flyer-chips');
    chipsEl.innerHTML = (stop.chips || []).map(c =>
      `<span class="pres-flyer-chip">${c}</span>`
    ).join('');

    flyer.classList.add('visible');
  }

  function cancelTrace() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    tracing = false;
  }

  function next() {
    if (tracing) return;
    if (current < stops.length - 1) goTo(current + 1);
    else stopAutoPlay();
  }

  function prev() {
    if (tracing) return;
    if (current > 0) goTo(current - 1);
  }

  function togglePlay() {
    if (playing) stopAutoPlay();
    else startAutoPlay();
  }

  function startAutoPlay() {
    playing = true;
    updatePlayIcon();
    if (current >= stops.length - 1) {
      // Reset and start from beginning
      rebuildTrace(-1);
      if (traceLayer) map.removeLayer(traceLayer);
      traceLayer = L.polyline([], { color: '#1F9B8C', weight: 4, opacity: .9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      current = -1;
      goTo(0);
    } else {
      next();
    }
    autoTimer = setInterval(() => {
      if (!tracing && current < stops.length - 1) next();
      else if (!tracing) stopAutoPlay();
    }, 5500);
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

  window.TripPresentation = { init, open };
})();
