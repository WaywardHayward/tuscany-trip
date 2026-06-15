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
