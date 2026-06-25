/* ============================================================
   enhance.js — injects the aurora/grain/progress layers and
   wires up tasteful micro-interactions. Safe to load on every
   page; it adapts to whatever markup is present.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function build() {
    /* --- background layers --- */
    if (!document.querySelector(".fx-aurora")) {
      var aurora = el("div", "fx-aurora",
        '<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>');
      aurora.setAttribute("aria-hidden", "true");
      document.body.insertBefore(aurora, document.body.firstChild);

      var grain = el("div", "fx-grain");
      grain.setAttribute("aria-hidden", "true");
      document.body.insertBefore(grain, aurora.nextSibling);
    }

    /* --- scroll progress bar --- */
    var bar = el("div", "fx-progress");
    document.body.appendChild(bar);
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.width = (p * 100).toFixed(2) + "%";
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* --- hero colour sheen --- */
    var hero = document.querySelector(".hero");
    if (hero && !hero.querySelector(".hero-glow")) {
      var glow = el("div", "hero-glow");
      glow.setAttribute("aria-hidden", "true");
      // place right after the hero image so it sits under the text
      var img = hero.querySelector("img");
      if (img && img.nextSibling) hero.insertBefore(glow, img.nextSibling);
      else hero.appendChild(glow);
    }

    /* --- staggered reveals --- */
    var groups = {};
    document.querySelectorAll(".reveal").forEach(function (node) {
      var parent = node.parentNode;
      var key = groups[parentKey(parent)];
      if (key === undefined) { groups[parentKey(parent)] = 0; key = 0; }
      var idx = groups[parentKey(parent)]++;
      node.style.transitionDelay = Math.min(idx * 70, 350) + "ms";
    });

    /* --- 3D tilt on cards (desktop only) --- */
    if (finePointer && !reduce) {
      document.querySelectorAll(".opt, .card").forEach(addTilt);
    }
  }

  var pk = 0, pkMap = new WeakMap();
  function parentKey(node) {
    if (!pkMap.has(node)) pkMap.set(node, ++pk);
    return pkMap.get(node);
  }

  function addTilt(card) {
    card.classList.add("fx-tilt");
    var max = 6; // degrees
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        "perspective(900px) rotateX(" + (-py * max).toFixed(2) + "deg) rotateY(" +
        (px * max).toFixed(2) + "deg) translateY(-7px)";
    });
    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();

/* ============================================================
   enhance.js — pop-up book + parallax layer (added).
   Self-contained second pass; runs after the block above.
   ============================================================ */
(function () {
  "use strict";
  var mq = window.matchMedia;
  var reduce = mq && mq("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;                       // honour reduced motion: do nothing
  var small = mq && mq("(max-width: 760px)").matches;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    /* ---------- 1) Tag item cards to pop up ---------- */
    // Section blocks (.reveal) already get the 3D unfold via CSS. Here we add
    // the same to item-level cards that aren't already revealed, with a stagger.
    var pops = [].slice.call(document.querySelectorAll(".t-card, .card, .opt"))
      .filter(function (n) {
        return !n.classList.contains("reveal") &&
               !n.closest(".present-overlay, .presentation, .fx-present");
      });
    var counts = new WeakMap();
    pops.forEach(function (n) {
      n.classList.add("fx-pop");
      var p = n.parentNode;
      var i = counts.get(p) || 0; counts.set(p, i + 1);
      n.style.transitionDelay = Math.min(i * 75, 360) + "ms";
    });

    var vh = window.innerHeight;
    window.addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });

    /* ---------- 2) Parallax targets (desktop only) ---------- */
    var heroIn = null, aurora = null, media = [];
    if (!small) {
      heroIn = document.querySelector(".hero-in");
      aurora = document.querySelector(".fx-aurora");
      media = [].slice.call(document.querySelectorAll(".base-img img, .opt-ph img, .card-ph img"));
      media.forEach(function (m) { m.classList.add("fx-media"); });
    }

    /* ---------- 3) One rAF loop: reveal sweep + parallax ----------
       A scroll-synced sweep reveals anything past the trigger line. Unlike an
       IntersectionObserver it can't be out-run by a fast flick, so nothing is
       ever left stuck at opacity:0. It also rescues the base .reveal blocks. */
    var ticking = false;
    function frame() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var line = vh * 0.9;

      var waiting = document.querySelectorAll(".fx-pop:not(.in), .reveal:not(.in)");
      for (var k = 0; k < waiting.length; k++) {
        if (waiting[k].getBoundingClientRect().top < line) waiting[k].classList.add("in");
      }

      if (!small) {
        if (heroIn) {
          heroIn.style.transform = "translate3d(0," + Math.min(y * 0.28, 200).toFixed(1) + "px,0)";
          heroIn.style.opacity = Math.max(1 - y / (vh * 0.8), 0).toFixed(3);
        }
        if (aurora) {
          aurora.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)";
        }
        for (var i = 0; i < media.length; i++) {
          var m = media[i], r = m.getBoundingClientRect();
          if (r.bottom < -60 || r.top > vh + 60) continue;
          var prog = (r.top + r.height / 2) / vh;          // ~1 entering bottom, ~0 leaving top
          m.style.setProperty("--fx-oy", (50 + (prog - 0.5) * 26).toFixed(1) + "%");
        }
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    // a few settling passes for late layout (fonts, images, leaflet)
    frame();
    setTimeout(frame, 200);
    setTimeout(frame, 800);
  });
})();
