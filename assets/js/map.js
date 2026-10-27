/*
  Interactive country map for beyond.html, in three modes:
    felix  - the countries in assets/js/visited.js
    visa   - entry rules for German passport holders (assets/map/visa-de.json)
    yours  - a visitor marks their own countries and can download the picture
  Map data: assets/map/world.json (Natural Earth 1:50m, public domain, Equal Earth projection).
  A visitor's own selection stays in their browser only.
*/
(function () {
  "use strict";

  var root = document.querySelector("[data-map]");
  if (!root) return;

  var NS = "http://www.w3.org/2000/svg";
  var STORE_KEY = "fdl-map-yours";
  var MARKER_PX = 2.6; // on-screen radius of the dots that stand in for very small countries
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var VISA_LABEL = { free: "visa-free", eta: "online authorization", voa: "visa on arrival", evisa: "eVisa in advance", visa: "visa required", home: "home country", none: "no data" };
  var EASY = { free: 1, eta: 1, voa: 1 };

  function q(sel) { return root.querySelector(sel); }
  var stage = q("[data-stage]");
  var tip = q("[data-tip]");
  var fallback = q("[data-fallback]");
  var countEl = q("[data-count]");
  var statusEl = q("[data-status]");
  var modeSwitch = q("[data-mode-switch]");
  var regionsEl = q("[data-regions]");
  var yoursEl = q("[data-yours]");
  var visaEl = q("[data-visa-panel]");
  var legendEl = q("[data-legend]");
  var visaNoteEl = q("[data-visa-note]");
  var form = q("[data-add-form]");
  var input = form.querySelector("input");
  var optionsEl = q("[data-options]");
  var chipsEl = q("[data-chips]");
  var downloadBtn = q("[data-download]");
  var clearBtn = q("[data-clear]");

  var data = null;
  var visa = null;          // visa-de.json, or null when it couldn't be loaded
  var svg = null;
  var markers = [];
  var shapes = new Map();   // id -> [path, circle]
  var names = new Map();    // id -> display name
  var felix = new Set();
  var yours = new Set();
  var mode = "felix";
  var view = null;
  var frame = 0;
  var tipTimer = 0;
  var clearTimer = 0;
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Same normalisation as the build script that produced the aliases in world.json.
  function norm(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/&/g, " and ").replace(/[’'`´]/g, "").replace(/[.,()/\-]/g, " ")
      .replace(/\bst\b/g, "saint").replace(/\s+/g, " ").trim();
  }
  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  // Accepts "South Korea", "Korea, South", "Myanmar (Burma)", "KOR", "kr" ...
  function lookup(name) {
    var raw = String(name).replace(/ /g, " ").trim();
    var tries = [raw];
    var paren = raw.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (paren) tries.push(paren[1], paren[2]);
    var comma = raw.match(/^([^,]+),\s*(.+)$/);
    if (comma) tries.push(comma[2] + " " + comma[1]);
    for (var i = 0; i < tries.length; i++) {
      var key = norm(tries[i]);
      if (key && has(data.aliases, key)) return data.aliases[key];
    }
    return null;
  }
  function make(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function announce(msg) { statusEl.textContent = msg; }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function getJSON(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  Promise.all([
    getJSON(root.getAttribute("data-map-src")),
    getJSON(root.getAttribute("data-visa-src")).catch(function (err) {
      if (window.console) console.warn("Map: visa data unavailable, hiding that view.", err);
      return null;
    }),
  ]).then(function (res) { init(res[0], res[1]); })
    .catch(function (err) {
      fallback.textContent = "The map could not be loaded. Refresh the page to try again.";
      if (window.console) console.error("Map:", err);
    });

  function init(d, visaDoc) {
    data = d;
    visa = visaDoc && visaDoc.countries ? visaDoc : null;
    view = d.regions.world.slice();

    svg = make("svg", { viewBox: view.join(" "), preserveAspectRatio: "xMidYMid meet", role: "img" });
    var defs = make("defs", {});
    var hatch = make("pattern", { id: "map-hatch", width: "4", height: "4", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    hatch.appendChild(make("rect", { width: "4", height: "4", "class": "hatch-bg" }));
    hatch.appendChild(make("line", { x1: "0", y1: "0", x2: "0", y2: "4", "class": "hatch-line" }));
    defs.appendChild(hatch);
    svg.appendChild(defs);

    var land = make("g", { "class": "map-land" });
    var dots = make("g", { "class": "map-markers" });
    d.countries.forEach(function (c) {
      var els = [];
      var cat = visaCat(c.id);
      if (c.d) { var p = make("path", { d: c.d, "data-id": c.id, "data-visa": cat }); land.appendChild(p); els.push(p); }
      if (c.m) {
        var m = make("circle", { cx: c.m[0], cy: c.m[1], r: MARKER_PX, "data-id": c.id, "data-visa": cat });
        dots.appendChild(m); els.push(m); markers.push(m);
      }
      shapes.set(c.id, els);
      names.set(c.id, c.n);
    });
    svg.appendChild(land);
    svg.appendChild(dots);
    fallback.remove();
    stage.insertBefore(svg, tip);

    var listed = Array.isArray(window.FDL_VISITED) ? window.FDL_VISITED : [];
    var unknown = [];
    listed.forEach(function (name) {
      if (!String(name).trim()) return;
      var id = lookup(name);
      if (id) felix.add(id); else unknown.push(name);
    });
    if (unknown.length && window.console) console.warn("Map: visited.js entries not recognized, check the spelling:", unknown);

    var frag = document.createDocumentFragment();
    d.countries.forEach(function (c) { var o = document.createElement("option"); o.value = c.n; frag.appendChild(o); });
    optionsEl.appendChild(frag);

    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      if (Array.isArray(saved)) saved.forEach(function (id) { if (shapes.has(id)) yours.add(id); });
    } catch (e) { /* storage unavailable: selections just won't be remembered */ }

    modeSwitch.querySelector('[data-set-mode="felix"]').hidden = !felix.size;
    modeSwitch.querySelector('[data-set-mode="visa"]').hidden = !visa;
    if (felix.size || visa) modeSwitch.hidden = false;
    if (visa) buildLegend();
    regionsEl.hidden = false;
    mode = felix.size ? "felix" : "yours";
    wire();
    sizeMarkers();
    render();
    if ("ResizeObserver" in window) new ResizeObserver(sizeMarkers).observe(stage);
    else window.addEventListener("resize", sizeMarkers);
  }

  // ---------- Visa data ----------
  function visaCat(id) {
    if (!visa) return "none";
    var v = visa.countries[id];
    return v ? v.c : "none";
  }
  function visaText(id, full) {
    var name = names.get(id);
    var v = visa && visa.countries[id];
    if (!v) return name + ": " + VISA_LABEL.none + (full ? "." : "");
    var label = v.m ? "freedom of movement" : VISA_LABEL[v.c];
    if (v.a) label += " (" + v.a + ")";
    var text = name + ": " + label + (v.s ? ", " + v.s : "");
    if (full) text += (v.n ? ", " + v.n : "") + ".";
    return text;
  }
  function formatDate(iso) {
    var p = String(iso).split("-");
    return p.length === 3 ? parseInt(p[2], 10) + " " + MONTHS[parseInt(p[1], 10) - 1] + " " + p[0] : String(iso);
  }
  function buildLegend() {
    var counts = { none: 0 };
    visa.categories.forEach(function (c) { counts[c.key] = 0; });
    data.countries.forEach(function (c) {
      var cat = visaCat(c.id);
      if (cat === "home") return;
      counts[has(counts, cat) ? cat : "none"] += 1;
    });
    var items = visa.categories.map(function (c) { return [c.key, c.label, counts[c.key]]; });
    if (counts.none) items.push(["none", "No data", counts.none]);
    items.push(["home", "Home country", ""]);
    items.forEach(function (it) {
      var li = document.createElement("li");
      var sw = document.createElement("span");
      sw.className = "swatch";
      sw.setAttribute("data-visa", it[0]);
      sw.setAttribute("aria-hidden", "true");
      var label = document.createElement("span");
      label.textContent = it[1];
      var n = document.createElement("span");
      n.className = "legend-n";
      n.textContent = it[2] === "" ? "" : String(it[2]);
      li.appendChild(sw); li.appendChild(label); li.appendChild(n);
      legendEl.appendChild(li);
    });
    visaNoteEl.textContent = "";
    visaNoteEl.appendChild(document.createTextNode("Tourist stays with a " + (visa.passport || "German passport") + ", as of " + formatDate(visa.asOf) + ". For orientation only, not legal advice: entry rules change often and depend on your passport, purpose and route, so check the "));
    var a = document.createElement("a");
    a.href = visa.check;
    a.textContent = "Federal Foreign Office";
    visaNoteEl.appendChild(a);
    visaNoteEl.appendChild(document.createTextNode(" and the destination’s official sources before you travel. "));
    var legal = document.createElement("a");
    legal.href = "legal.html";
    legal.textContent = "Legal notice";
    visaNoteEl.appendChild(legal);
    visaNoteEl.appendChild(document.createTextNode("."));
  }

  // ---------- Rendering ----------
  function render() {
    var active = mode === "felix" ? felix : mode === "yours" ? yours : null;
    shapes.forEach(function (els, id) {
      var on = !!active && active.has(id);
      els.forEach(function (el) { el.classList.toggle("is-on", on); });
    });
    root.setAttribute("data-mode", mode);
    yoursEl.hidden = mode !== "yours";
    if (visaEl) visaEl.hidden = mode !== "visa";
    modeSwitch.querySelectorAll("[data-set-mode]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-mode") === mode));
    });

    countEl.textContent = "";
    if (mode === "felix") {
      appendCount(felix.size, plural(felix.size, " country", " countries"));
      svg.setAttribute("aria-label", "World map with the " + felix.size + " " + plural(felix.size, "country", "countries") + " Felix has visited highlighted");
    } else if (mode === "visa") {
      var easy = 0;
      data.countries.forEach(function (c) { if (EASY[visaCat(c.id)]) easy += 1; });
      appendCount(easy, " countries and territories without a visa in advance");
      svg.setAttribute("aria-label", "World map shaded by the entry rules for German passport holders; the legend below lists the categories");
    } else if (yours.size === 0) {
      countEl.textContent = "Click or tap the countries you have visited.";
      svg.setAttribute("aria-label", "World map. Mark countries by clicking them or by typing their names below.");
    } else {
      countEl.appendChild(document.createTextNode("You have marked "));
      appendCount(yours.size, plural(yours.size, " country", " countries"));
      svg.setAttribute("aria-label", "World map with your " + yours.size + " " + plural(yours.size, "country", "countries") + " highlighted");
    }
    downloadBtn.disabled = yours.size === 0;
    renderChips();
  }
  function appendCount(n, word) {
    var s = document.createElement("strong");
    s.textContent = String(n);
    countEl.appendChild(s);
    countEl.appendChild(document.createTextNode(word));
  }
  function renderChips() {
    chipsEl.textContent = "";
    Array.from(yours)
      .map(function (id) { return [names.get(id), id]; })
      .sort(function (a, b) { return a[0].localeCompare(b[0], "en"); })
      .forEach(function (pair) {
        var li = document.createElement("li");
        var label = document.createElement("span");
        label.textContent = pair[0];
        var x = document.createElement("button");
        x.type = "button";
        x.setAttribute("data-remove", pair[1]);
        x.setAttribute("aria-label", "Remove " + pair[0]);
        x.textContent = "×";
        li.appendChild(label);
        li.appendChild(x);
        chipsEl.appendChild(li);
      });
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    hideTip();
    announce("");
    render();
  }
  function setOwn(id, on) {
    if (on) yours.add(id); else yours.delete(id);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(yours))); } catch (e) { /* not remembered */ }
    render();
  }

  function idFrom(target) {
    var el = target && target.closest ? target.closest("[data-id]") : null;
    return el ? el.getAttribute("data-id") : null;
  }
  function tipText(id) {
    return mode === "visa" ? visaText(id, false) : names.get(id);
  }

  function wire() {
    svg.addEventListener("click", function (e) {
      var id = idFrom(e.target);
      if (!id) return;
      var name = names.get(id);
      if (mode === "yours") {
        var on = !yours.has(id);
        setOwn(id, on);
        announce(name + (on ? " added." : " removed."));
      } else if (mode === "visa") {
        announce(visaText(id, true));
      } else {
        announce(felix.has(id) ? name + ": visited." : name);
      }
      if (e.pointerType !== "mouse") flashTip(tipText(id), e.clientX, e.clientY);
    });
    svg.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var id = idFrom(e.target);
      if (id) showTip(tipText(id), e.clientX, e.clientY); else hideTip();
    });
    svg.addEventListener("pointerleave", hideTip);

    modeSwitch.addEventListener("click", function (e) {
      var b = e.target.closest("[data-set-mode]");
      if (b) setMode(b.getAttribute("data-set-mode"));
    });

    regionsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-region]");
      if (!b || !data.regions[b.getAttribute("data-region")]) return;
      regionsEl.querySelectorAll("[data-region]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      hideTip();
      zoomTo(data.regions[b.getAttribute("data-region")]);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!value) return;
      var id = lookup(value);
      if (!id) {
        announce("There is no country called “" + value + "” on this map. Check the spelling or pick one from the suggestions.");
        return;
      }
      setOwn(id, true);
      input.value = "";
      announce(names.get(id) + " added.");
    });

    chipsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-remove]");
      if (!b) return;
      var id = b.getAttribute("data-remove");
      setOwn(id, false);
      announce(names.get(id) + " removed.");
      var next = chipsEl.querySelector("button");
      (next || input).focus();
    });

    clearBtn.addEventListener("click", function () {
      if (!yours.size) { announce("Your map is already empty."); return; }
      if (!clearTimer) {
        clearBtn.textContent = "Press again to clear";
        clearTimer = setTimeout(resetClear, 3000);
        return;
      }
      resetClear();
      yours.clear();
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing stored */ }
      render();
      announce("Map cleared.");
    });

    downloadBtn.addEventListener("click", function () {
      downloadBtn.disabled = true;
      exportImage()
        .then(function () { announce("Image saved as my-countries.png."); })
        .catch(function (err) {
          if (window.console) console.error("Map export:", err);
          announce("This browser could not create the image. Try another browser, or take a screenshot instead.");
        })
        .then(function () { downloadBtn.disabled = yours.size === 0; });
    });
  }
  function resetClear() {
    clearTimeout(clearTimer);
    clearTimer = 0;
    clearBtn.textContent = "Clear map";
  }

  // ---------- Tooltip ----------
  function showTip(text, x, y) {
    var r = stage.getBoundingClientRect();
    tip.textContent = text;
    tip.hidden = false;
    var half = Math.min(tip.offsetWidth / 2 + 8, r.width / 2);
    tip.style.left = Math.min(Math.max(x - r.left, half), r.width - half) + "px";
    tip.style.top = Math.max(y - r.top, 34) + "px";
  }
  function flashTip(text, x, y) {
    showTip(text, x, y);
    clearTimeout(tipTimer);
    tipTimer = setTimeout(hideTip, 1800);
  }
  function hideTip() { tip.hidden = true; }

  // ---------- Zoom ----------
  function zoomTo(target) {
    cancelAnimationFrame(frame);
    if (reduceMotion) { setView(target.slice()); return; }
    var from = view.slice();
    var start = performance.now();
    var dur = 460;
    function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setView(from.map(function (v, i) { return v + (target[i] - v) * k; }));
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
  }
  function setView(v) {
    view = v;
    svg.setAttribute("viewBox", v.map(function (n) { return n.toFixed(2); }).join(" "));
    sizeMarkers();
  }
  function sizeMarkers() {
    if (!svg) return;
    var w = stage.clientWidth || 1;
    var h = stage.clientHeight || 1;
    var unitsPerPx = Math.max(view[2] / w, view[3] / h);
    var r = (MARKER_PX * unitsPerPx).toFixed(3);
    markers.forEach(function (m) { m.setAttribute("r", r); });
  }

  // ---------- Image export ----------
  function cssVar(name, fallbackValue) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallbackValue;
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("SVG image failed to load")); };
      img.src = src;
    });
  }
  function exportImage() {
    var bg = cssVar("--bg", "#e7e9e3");
    var ocean = cssVar("--surface", "#f1f2ee");
    var landColor = cssVar("--land", "#cfd5ce");
    var on = cssVar("--mark", "#86672b");
    var ink = cssVar("--ink", "#15231e");
    var ink2 = cssVar("--ink-2", "#4b5852");
    var ring = cssVar("--marker-ring", "#8c9891");

    var W = 2400, pad = 120, top = 300;
    var mapW = W - pad * 2;
    var mapH = Math.round(data.h * mapW / data.w);
    var H = top + mapH + 210;

    var parts = ['<svg xmlns="' + NS + '" viewBox="0 0 ' + data.w + " " + data.h + '" width="' + mapW + '" height="' + mapH + '">',
      '<g fill-rule="evenodd" stroke="' + ocean + '" stroke-width="0.45" stroke-linejoin="round">'];
    data.countries.forEach(function (c) {
      if (c.d) parts.push('<path d="' + c.d + '" fill="' + (yours.has(c.id) ? on : landColor) + '"/>');
    });
    parts.push('</g><g stroke-width="0.6">');
    data.countries.forEach(function (c) {
      if (c.m) {
        var sel = yours.has(c.id);
        parts.push('<circle cx="' + c.m[0] + '" cy="' + c.m[1] + '" r="2.4" fill="' + (sel ? on : landColor) + '" stroke="' + (sel ? ocean : ring) + '"/>');
      }
    });
    parts.push("</g></svg>");

    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(parts.join(""))), fontsReady])
      .then(function (res) {
        var img = res[0];
        var canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = ocean;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pad, top, mapW, mapH, 36); else ctx.rect(pad, top, mapW, mapH);
        ctx.fill();
        ctx.drawImage(img, pad, top, mapW, mapH);

        var n = yours.size;
        var family = '"Source Serif 4", Georgia, serif';
        ctx.fillStyle = ink;
        ctx.font = "500 132px " + family;
        ctx.fillText(n + " " + plural(n, "country", "countries"), pad, 210);
        ctx.fillStyle = ink2;
        ctx.font = "400 46px " + family;
        ctx.fillText("Mapped on " + (location.host || "felixdlanger.github.io"), pad, top + mapH + 120);

        return new Promise(function (resolve, reject) {
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error("canvas.toBlob returned nothing")); return; }
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "my-countries.png";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
            resolve();
          }, "image/png");
        });
      });
  }
})();
