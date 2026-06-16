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

  // --- Single-base "spokes" geometry ---------------------------------------
  // When stops carry { base:true } and day trips carry { kind:'daytrip' },
  // day-trip legs spring from the BASE (an arc out and back), not from the
  // previous trip. Travel legs (kind:'travel' or anything before the base)
  // stay as straight lines. With no base flagged, everything falls back to the
  // original sequential straight-line chain, so other pages are unaffected.
  function baseIdx() {
    for (let i = 0; i < stops.length; i++) if (stops[i] && stops[i].base) return i;
    return -1;
  }
  // Nearest base at or before stop i (supports trips with more than one base,
  // e.g. a two-centre holiday). Falls back to the first base, then -1.
  function baseFor(i) {
    for (let j = i; j >= 0; j--) if (stops[j] && stops[j].base) return j;
    return baseIdx();
  }
  function isDaytrip(i) {
    if (baseIdx() < 0) return false;
    if (stops[i] && stops[i].base) return false;     // a base is not its own day trip
    if (stops[i] && stops[i].kind === 'travel') return false;
    const b = baseFor(i);
    if (b < 0 || i <= b) return false;               // nothing before its base
    if (stops[i] && stops[i].kind === 'daytrip') return true;
    return true;                                     // any other post-base stop arcs
  }
  // Where the leg arriving at toIdx should START.
  function sameCoords(a, b) {
    return a && b && Math.abs(a[0]-b[0]) < 1e-6 && Math.abs(a[1]-b[1]) < 1e-6;
  }
  function legFrom(toIdx) {
    if (baseIdx() < 0) return toIdx - 1;             // no base: ordinary chain
    if (isDaytrip(toIdx)) return baseFor(toIdx);     // spoke out from its base
    // A non-daytrip stop sitting AT its base (rest day / pause) anchors from the
    // base too, so it draws as a no-op at home, not a line in from the last trip.
    const b = baseFor(toIdx);
    if (b >= 0 && toIdx > b && sameCoords(stops[toIdx].coords, stops[b].coords)) return b;
    return toIdx - 1;                                // ordinary chain step (incl. base->base hops)
  }
  // Curve magnitude for a leg (0 = straight). Day-trip spokes bow outward; we
  // fan successive spokes with alternating sign so they don't sit on top of
  // each other.
  function legCurve(toIdx) {
    if (!isDaytrip(toIdx)) return 0;
    const b = baseFor(toIdx);
    // index of this day trip among THIS base's day trips (fan resets per base)
    let n = 0;
    for (let i = b + 1; i <= toIdx; i++) if (baseFor(i) === b && isDaytrip(i)) n++;
    const sign = (n % 2 === 0) ? 1 : -1;
    return 0.22 * sign; // perpendicular offset as a fraction of the chord
  }
  // Build interpolated points from -> to. curve!=0 bows the path into a
  // quadratic arc (control point offset perpendicular to the chord midpoint).
  function legPoints(from, to, curve, numPoints) {
    const N = numPoints || 60;
    const pts = [];
    let ctrl = null;
    if (curve && curve !== 0) {
      const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
      const dx = to[0] - from[0], dy = to[1] - from[1];
      // perpendicular to the chord (-dy, dx)
      ctrl = [mx + (-dy) * curve, my + (dx) * curve];
    }
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      if (ctrl) {
        const u = 1 - ease;
        pts.push([
          u * u * from[0] + 2 * u * ease * ctrl[0] + ease * ease * to[0],
          u * u * from[1] + 2 * u * ease * ctrl[1] + ease * ease * to[1]
        ]);
      } else {
        pts.push([
          from[0] + (to[0] - from[0]) * ease,
          from[1] + (to[1] - from[1]) * ease
        ]);
      }
    }
    return pts;
  }
  // Full ghost-route geometry: concatenate each leg's spoke/straight points so
  // the faint background line shows spokes, not a town-to-town chain.
  function ghostRouteCoords() {
    if (baseIdx() < 0) return stops.map(s => s.coords);
    const b = baseIdx();
    const out = [stops[0].coords];
    for (let i = 1; i < stops.length; i++) {
      const f = stops[legFrom(i)].coords;
      const seg = legPoints(f, stops[i].coords, legCurve(i), 40);
      for (let k = 1; k < seg.length; k++) out.push(seg[k]);
      // After a spoke, draw the line back home so each excursion reads as its
      // own out-and-back from the base (a clean fan, "we always come home").
      if (isDaytrip(i)) {
        const back = legPoints(stops[i].coords, stops[baseFor(i)].coords, -legCurve(i), 40);
        for (let k = 1; k < back.length; k++) out.push(back[k]);
      }
    }
    return out;
  }
  // Completed-trail geometry up to and including upToIdx.
  function trailCoords(upToIdx) {
    if (baseIdx() < 0) return stops.slice(0, upToIdx + 1).map(s => s.coords);
    if (upToIdx <= 0) return [stops[0].coords];
    const b = baseIdx();
    const out = [stops[0].coords];
    for (let i = 1; i <= upToIdx; i++) {
      const f = stops[legFrom(i)].coords;
      const seg = legPoints(f, stops[i].coords, legCurve(i), 40);
      for (let k = 1; k < seg.length; k++) out.push(seg[k]);
      // Return home after each completed spoke (except the one we are sitting
      // on right now, so the marker stays out at the current day trip).
      if (isDaytrip(i) && i < upToIdx) {
        const back = legPoints(stops[i].coords, stops[baseFor(i)].coords, -legCurve(i), 40);
        for (let k = 1; k < back.length; k++) out.push(back[k]);
      }
    }
    return out;
  }
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
        <img class="pres-flyer-img" alt="" referrerpolicy="no-referrer">
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
    routeLine = L.polyline(ghostRouteCoords(), {
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
    const from = stops[legFrom(toIdx)].coords;   // base for day trips, else previous stop
    const to = stops[toIdx].coords;
    const destZoom = stops[toIdx].zoom || 11;

    // Generate interpolated points (arced for day-trip spokes, straight otherwise)
    const numPoints = 60;
    let points = legPoints(from, to, legCurve(toIdx), numPoints);
    // For a spoke that starts from the base while the marker is still out at a
    // previous excursion, come home first (so it reads as return-then-fan-out,
    // never a trip-to-trip hop).
    if (isDaytrip(toIdx)) {
      const here = activeMarker ? activeMarker.getLatLng() : null;
      if (here && !sameCoords([here.lat, here.lng], from)) {
        const home = legPoints([here.lat, here.lng], from, 0, 30);
        points = home.concat(points.slice(1));
      }
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
    const coords = trailCoords(upToIdx);
    traceLayer = L.polyline(coords, {
      color: '#1F9B8C', weight: 4, opacity: .9,
      lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
  }

  function arriveAt(stop) {
    const img = flyer.querySelector('.pres-flyer-img');
    if (stop.image) {
      img.onerror = () => { img.style.display = 'none'; };
      img.alt = stop.title || '';
      img.src = stop.image;
      img.style.display = 'block';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
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
