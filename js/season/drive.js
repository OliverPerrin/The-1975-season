/* The long way home: a night drive in the rain, seen through a wet windscreen,
   with a car radio that re-grades the world outside to each album's look.
   Classic script. Defines window.NightDrive = { mount(el, opts) -> { destroy() } }.
   Everything is drawn here with canvas 2D; sound is synthesised, never recorded. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FMIN = 87.5, FMAX = 108.0;
  var ORDER = ['st', 'iliwys', 'abiior', 'noacf', 'bfiafl'];
  var STATION = {
    st:     { freq: 88.9,  ps: 'AFTER DARK' },
    iliwys: { freq: 92.6,  ps: 'SOFT FOCUS' },
    abiior: { freq: 96.8,  ps: 'REFRESH' },
    noacf:  { freq: 101.2, ps: 'HAZARD' },
    bfiafl: { freq: 105.4, ps: 'FIRST SNOW' }
  };

  /* ---------- small helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function rgba(c, a) {
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + clamp(a == null ? 1 : a, 0, 1).toFixed(3) + ')';
  }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function mulc(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mk(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  /* ---------- the six grades: the untuned night, then one per album ---------- */
  var GRADES = [
    { // 0: untuned. Blue-black, sodium orange, red tail lights, the odd pink sign.
      skyTop: [3, 5, 13], skyMid: [10, 16, 34], skyLow: [70, 42, 38], glow: [255, 126, 44], glowAmt: 0.8,
      cloud: [150, 84, 52], cloudAmt: 0.55, skyline: [6, 8, 15], facade: [15, 17, 25], pave: [20, 21, 27],
      road: [8, 10, 15], sheen: [80, 52, 40], lamp: [255, 148, 52], lampAmt: 1,
      win0: [255, 182, 104], win1: [255, 146, 74], win2: [130, 165, 255], win3: [255, 214, 160], win4: [255, 66, 140],
      shop: [255, 168, 96], lane: [205, 200, 190], tail: [255, 26, 34], head: [255, 236, 212],
      neon: [255, 54, 140], neonAmt: 0.22, haze: [80, 50, 50], hazeAmt: 0.2, bloom: 1, grain: 0.07,
      rain: 1, snow: 0, speed: 1, shake: 0.3, gray: 0, sepia: 0, contrast: 1.06, sat: 1.1, bright: 1,
      ink: [255, 166, 88], dash: [255, 148, 60]
    },
    { // 2013: strict black and white, white neon, hard contrast.
      skyTop: [2, 2, 2], skyMid: [9, 9, 9], skyLow: [62, 62, 62], glow: [255, 255, 255], glowAmt: 0.5,
      cloud: [120, 120, 120], cloudAmt: 0.6, skyline: [3, 3, 3], facade: [13, 13, 13], pave: [26, 26, 26],
      road: [6, 6, 6], sheen: [80, 80, 80], lamp: [255, 255, 255], lampAmt: 1.1,
      win0: [235, 235, 235], win1: [190, 190, 190], win2: [255, 255, 255], win3: [140, 140, 140], win4: [255, 255, 255],
      shop: [240, 240, 240], lane: [240, 240, 240], tail: [255, 90, 90], head: [255, 255, 255],
      neon: [255, 255, 255], neonAmt: 1, haze: [96, 96, 96], hazeAmt: 0.14, bloom: 1.1, grain: 0.14,
      rain: 1.15, snow: 0, speed: 1.1, shake: 0.35, gray: 1, sepia: 0, contrast: 1.42, sat: 1, bright: 0.95,
      ink: [242, 242, 242], dash: [255, 255, 255]
    },
    { // 2016: pink neon through haze, a blush sky.
      skyTop: [18, 6, 22], skyMid: [80, 28, 68], skyLow: [240, 136, 172], glow: [255, 118, 176], glowAmt: 0.95,
      cloud: [255, 150, 196], cloudAmt: 0.75, skyline: [30, 10, 30], facade: [36, 16, 34], pave: [52, 26, 44],
      road: [20, 9, 18], sheen: [210, 100, 146], lamp: [255, 168, 204], lampAmt: 0.95,
      win0: [255, 140, 192], win1: [255, 190, 214], win2: [255, 86, 160], win3: [255, 222, 232], win4: [255, 56, 140],
      shop: [255, 120, 182], lane: [255, 196, 220], tail: [255, 40, 100], head: [255, 222, 236],
      neon: [255, 64, 156], neonAmt: 1, haze: [255, 128, 176], hazeAmt: 0.6, bloom: 1.65, grain: 0.06,
      rain: 0.8, snow: 0, speed: 0.8, shake: 0.15, gray: 0, sepia: 0, contrast: 0.96, sat: 1.14, bright: 1.04,
      ink: [255, 138, 196], dash: [255, 120, 182]
    },
    { // 2018: a clean, cold, white-lit city with small squares of saturated colour.
      skyTop: [4, 7, 15], skyMid: [18, 27, 44], skyLow: [116, 136, 162], glow: [212, 230, 255], glowAmt: 0.5,
      cloud: [160, 182, 214], cloudAmt: 0.3, skyline: [9, 12, 20], facade: [22, 26, 36], pave: [42, 46, 56],
      road: [14, 16, 23], sheen: [124, 140, 168], lamp: [236, 244, 255], lampAmt: 1.15,
      win0: [236, 244, 255], win1: [214, 228, 255], win2: [255, 34, 62], win3: [24, 104, 255], win4: [16, 214, 118],
      shop: [240, 246, 255], lane: [246, 248, 255], tail: [255, 30, 52], head: [236, 246, 255],
      neon: [255, 255, 255], neonAmt: 0, haze: [140, 160, 192], hazeAmt: 0.06, bloom: 0.75, grain: 0.03,
      rain: 0.9, snow: 0, speed: 1, shake: 0.1, gray: 0, sepia: 0, contrast: 1.12, sat: 1.32, bright: 1.02,
      ink: [222, 236, 255], dash: [220, 234, 255]
    },
    { // 2020: loud flat yellow, rough and urgent.
      skyTop: [4, 4, 2], skyMid: [16, 14, 4], skyLow: [92, 74, 4], glow: [255, 212, 0], glowAmt: 0.85,
      cloud: [150, 122, 10], cloudAmt: 0.45, skyline: [7, 6, 2], facade: [16, 15, 8], pave: [30, 28, 12],
      road: [9, 9, 5], sheen: [130, 108, 6], lamp: [255, 210, 0], lampAmt: 1.15,
      win0: [255, 212, 0], win1: [255, 238, 140], win2: [255, 186, 0], win3: [255, 252, 220], win4: [255, 212, 0],
      shop: [255, 218, 30], lane: [255, 212, 0], tail: [255, 70, 0], head: [255, 240, 170],
      neon: [255, 212, 0], neonAmt: 0.35, haze: [150, 120, 0], hazeAmt: 0.16, bloom: 1.15, grain: 0.15,
      rain: 1.3, snow: 0, speed: 1.35, shake: 0.9, gray: 0, sepia: 0, contrast: 1.28, sat: 1.3, bright: 1,
      ink: [255, 214, 0], dash: [255, 210, 0]
    },
    { // 2022: warm black and white, soft grain, snow instead of rain.
      skyTop: [9, 8, 7], skyMid: [36, 33, 30], skyLow: [128, 118, 106], glow: [255, 236, 210], glowAmt: 0.5,
      cloud: [206, 196, 180], cloudAmt: 0.62, skyline: [12, 11, 10], facade: [30, 28, 26], pave: [124, 120, 114],
      road: [30, 28, 26], sheen: [126, 118, 106], lamp: [255, 232, 200], lampAmt: 1,
      win0: [255, 232, 200], win1: [240, 220, 190], win2: [255, 244, 226], win3: [220, 200, 170], win4: [255, 232, 200],
      shop: [255, 226, 190], lane: [222, 214, 202], tail: [255, 90, 70], head: [255, 240, 222],
      neon: [255, 232, 204], neonAmt: 0.3, haze: [176, 166, 152], hazeAmt: 0.36, bloom: 1.3, grain: 0.12,
      rain: 0, snow: 1, speed: 0.6, shake: 0.1, gray: 1, sepia: 0.34, contrast: 0.9, sat: 1, bright: 1.06,
      ink: [246, 226, 196], dash: [255, 232, 200]
    }
  ];
  var KEYS = Object.keys(GRADES[0]);

  function blend(w, out) {
    for (var k = 0; k < KEYS.length; k++) {
      var key = KEYS[k];
      var base = GRADES[0][key];
      if (Array.isArray(base)) {
        var r = 0, g = 0, b = 0;
        for (var i = 0; i < 6; i++) if (w[i] > 0.0005) { var c = GRADES[i][key]; r += c[0] * w[i]; g += c[1] * w[i]; b += c[2] * w[i]; }
        out[key] = [r, g, b];
      } else {
        var v = 0;
        for (var j = 0; j < 6; j++) if (w[j] > 0.0005) v += GRADES[j][key] * w[j];
        out[key] = v;
      }
    }
    return out;
  }

  /* ---------- sprites ---------- */
  function makeDropMask() {
    var c = canvas(64, 64), x = c.getContext('2d');
    var g = x.createRadialGradient(32, 30, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, TAU); x.fill();
    return c;
  }
  function makeDropShade() {
    var c = canvas(64, 64), x = c.getContext('2d');
    // dark refracted rim, heavier at the bottom
    var g = x.createRadialGradient(32, 26, 8, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.92, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, TAU); x.fill();
    // specular
    var s = x.createRadialGradient(23, 20, 0, 23, 20, 13);
    s.addColorStop(0, 'rgba(255,255,255,0.95)');
    s.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = s; x.beginPath(); x.arc(23, 20, 13, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 2;
    x.beginPath(); x.arc(32, 32, 27, Math.PI * 1.05, Math.PI * 1.55); x.stroke();
    // a lit lower crescent (light focused through the lens)
    x.globalCompositeOperation = 'lighter';
    var l = x.createRadialGradient(34, 46, 0, 34, 46, 12);
    l.addColorStop(0, 'rgba(255,255,255,0.22)');
    l.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = l; x.beginPath(); x.arc(34, 46, 12, 0, TAU); x.fill();
    return c;
  }
  function makeFlake() {
    var c = canvas(32, 32), x = c.getContext('2d');
    var g = x.createRadialGradient(16, 16, 0, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return c;
  }
  function makeGrain(seed) {
    var c = canvas(192, 192), x = c.getContext('2d');
    var img = x.createImageData(192, 192), d = img.data, r = rng(seed);
    for (var i = 0; i < d.length; i += 4) {
      var v = (r() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function makeClouds(w, h, seed) {
    var c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
    for (var i = 0; i < 70; i++) {
      var cx = r() * w, cy = h * (0.25 + r() * 0.75), rx = w * (0.04 + r() * 0.12), ry = rx * (0.25 + r() * 0.25);
      var a = 0.05 + r() * 0.12;
      for (var dx = -w; dx <= w; dx += w) { // tile horizontally
        x.save(); x.translate(cx + dx, cy); x.scale(1, ry / rx);
        var g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill();
        x.restore();
      }
    }
    // weight toward the bottom, where the city lights them
    x.globalCompositeOperation = 'destination-in';
    var m = x.createLinearGradient(0, 0, 0, h);
    m.addColorStop(0, 'rgba(0,0,0,0.25)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = m; x.fillRect(0, 0, w, h);
    return c;
  }

  /* ---------- world generation (deterministic) ---------- */
  var LOOP = 960; // metres before the street repeats
  var WORDS = ['OPEN', 'HOTEL', 'BAR', 'LATE', 'ROOMS', 'CAFE', 'TAXI', 'CLUB', 'DINER', 'NIGHT'];

  function genStreet(seed) {
    var r = rng(seed), list = [];
    [-1, 1].forEach(function (side) {
      var z = r() * 10;
      while (z < LOOP - 12) {
        var len = 12 + r() * 26;
        if (z + len > LOOP - 4) len = LOOP - 4 - z;
        if (len < 8) break;
        var h = 7 + Math.pow(r(), 1.6) * 30;
        var b = {
          side: side, z0: z, len: len, h: h,
          x: side * (9.2 + r() * 2.6), depth: 6 + r() * 8,
          floors: Math.max(2, Math.floor((h - 3.4) / 3.1)),
          cols: Math.max(2, Math.floor(len / 2.8)),
          seed: Math.floor(r() * 100000),
          shop: r() < 0.6,
          blade: r() < 0.62 ? { word: WORDS[Math.floor(r() * WORDS.length)], w: 1.6 + r() * 1.4, y: 3.6 + r() * 2.4, lit: r() } : null,
          bill: h > 11 && r() < 0.65 ? { cls: Math.floor(r() * 5), a: 0.15 + r() * 0.4, w: 0.25 + r() * 0.3 } : null
        };
        list.push(b);
        z += len + (r() < 0.22 ? 8 + r() * 14 : 0.4); // occasional side street
      }
    });
    return list;
  }
  function genSkyline(seed) {
    var r = rng(seed), out = [], u = -1.7;
    while (u < 1.7) {
      var w = 0.012 + r() * 0.04;
      var centre = 1 - Math.min(1, Math.abs(u) / 1.4);
      var h = 0.015 + Math.pow(r(), 2.2) * 0.12 * (0.45 + centre) + (r() < 0.06 ? 0.06 : 0);
      var wins = [];
      var cols = Math.max(1, Math.floor(w / 0.0042)), rows = Math.max(1, Math.floor(h / 0.0058));
      for (var cy = 0; cy < rows; cy++) for (var cx = 0; cx < cols; cx++) {
        if (r() < 0.32) {
          var p = r();
          wins.push([(cx + 0.3) / cols, (cy + 0.35) / rows, p < 0.5 ? 0 : p < 0.75 ? 1 : p < 0.85 ? 2 : p < 0.94 ? 3 : 4]);
        }
      }
      out.push({ u: u, w: w, h: h, wins: wins, cols: cols, rows: rows, beacon: h > 0.1 && r() < 0.5 });
      u += w * (0.75 + r() * 0.5);
    }
    return out;
  }

  /* ---------- synthesised radio: one generic, invented sketch per era ---------- */
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var SONGS = {
    st: { bpm: 96, rev: 0.35, chords: [[50, 57, 62, 65, 69], [46, 58, 62, 65, 69], [41, 57, 60, 65, 69], [48, 55, 60, 64, 67]] },
    iliwys: { bpm: 84, rev: 0.6, chords: [[52, 59, 63, 66, 68], [49, 56, 59, 63, 64], [45, 57, 61, 64, 68], [47, 59, 61, 64, 66]] },
    abiior: { bpm: 112, rev: 0.2, chords: [[48, 60, 64, 67, 71, 74], [45, 60, 64, 67, 71], [41, 57, 60, 64, 66], [43, 55, 59, 62, 64]] },
    noacf: { bpm: 140, rev: 0.12, chords: [[40, 47, 52], [38, 45, 50], [45, 52, 57], [36, 43, 48]] },
    bfiafl: { bpm: 70, rev: 0.7, chords: [[41, 57, 60, 64, 69], [38, 57, 60, 62, 65], [46, 58, 62, 65, 69], [48, 55, 60, 65, 67]] }
  };

  /* ====================================================================== */
  function mount(el, opts) {
    opts = opts || {};
    var albums = (Array.isArray(opts.albums) && opts.albums.length ? opts.albums : (window.DISCOGRAPHY || []));
    var audio = opts.audio || null;
    var reducedFn = typeof opts.reducedMotion === 'function' ? opts.reducedMotion : function () { return false; };
    var openRoom = typeof opts.openRoom === 'function' ? opts.openRoom : function () {};
    var listenUrl = typeof opts.listenUrl === 'function' ? opts.listenUrl : null;
    // Real 30-second previews for the stations, when the host passes them:
    // album id -> track number -> { id, url, link }. Without them the stations play the synth sketches.
    var previews = opts.previews && typeof opts.previews === 'object' ? opts.previews : null;
    var radioEl = null, radioSrc = null, radioStation = null, radioTrack = null;
    var radioWant = false, radioYield = false, radioFailed = {};

    var stations = [];
    ORDER.forEach(function (id, i) {
      var a = null;
      for (var k = 0; k < albums.length; k++) if (albums[k] && albums[k].id === id) a = albums[k];
      if (!a) return;
      stations.push({ id: id, grade: i + 1, freq: STATION[id].freq, ps: STATION[id].ps, album: a, tracks: Array.isArray(a.tracks) ? a.tracks : [] });
    });

    var disposed = false;
    var cleanups = [];
    function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); cleanups.push(function () { t.removeEventListener(ev, fn, o); }); }

    /* ---------- DOM ---------- */
    var root = mk('div', 'nd-root');
    var cv = mk('canvas', 'nd-canvas', { 'aria-hidden': 'true' });
    root.appendChild(cv);

    var consoleEl = mk('div', 'nd-console');
    var unit = mk('div', 'nd-unit', { role: 'group', 'aria-label': 'Car radio' });
    var display = mk('div', 'nd-display');
    var row1 = mk('div', 'nd-row1');
    var freqEl = mk('span', 'nd-freq');
    var freqNum = mk('span', 'nd-freq-num');
    var freqUnit = mk('span', 'nd-freq-unit'); freqUnit.textContent = 'FM';
    freqEl.appendChild(freqNum); freqEl.appendChild(freqUnit);
    var psEl = mk('span', 'nd-ps');
    var meter = mk('span', 'nd-meter', { 'aria-hidden': 'true' });
    var bars = [];
    for (var bi = 0; bi < 5; bi++) { var bEl = mk('i', 'nd-bar'); bEl.style.height = (30 + bi * 17) + '%'; meter.appendChild(bEl); bars.push(bEl); }
    row1.appendChild(freqEl); row1.appendChild(psEl); row1.appendChild(meter);

    var scale = mk('div', 'nd-scale', { 'aria-hidden': 'true' });
    var scaleTicks = mk('div', 'nd-scale-ticks');
    scale.appendChild(scaleTicks);
    [88, 92, 96, 100, 104, 108].forEach(function (f) {
      var n = mk('span', 'nd-scale-num'); n.textContent = String(f);
      n.style.left = ((f - FMIN) / (FMAX - FMIN) * 100) + '%';
      scale.appendChild(n);
    });
    stations.forEach(function (s) {
      var m = mk('span', 'nd-scale-mark'); m.style.left = ((s.freq - FMIN) / (FMAX - FMIN) * 100) + '%';
      s.markEl = m; scale.appendChild(m);
    });
    var needle = mk('span', 'nd-needle');
    scale.appendChild(needle);

    var rt = mk('div', 'nd-rt');
    var rtTrack = mk('span', 'nd-rt-track');
    rt.appendChild(rtTrack);
    display.appendChild(row1); display.appendChild(scale); display.appendChild(rt);

    var knobWrap = mk('div', 'nd-knobwrap');
    var knob = mk('div', 'nd-knob', {
      role: 'slider', tabindex: '0', 'aria-label': 'Tuning dial',
      'aria-valuemin': String(FMIN), 'aria-valuemax': String(FMAX), 'aria-orientation': 'horizontal'
    });
    var knobCap = mk('span', 'nd-knob-cap');
    knob.appendChild(knobCap);
    var knobLabel = mk('span', 'nd-knob-label', { 'aria-hidden': 'true' }); knobLabel.textContent = 'Tune';
    knobWrap.appendChild(knob); knobWrap.appendChild(knobLabel);

    var presets = mk('div', 'nd-presets', { role: 'group', 'aria-label': 'Station presets' });
    stations.forEach(function (s) {
      var b = mk('button', 'nd-preset', { type: 'button', 'aria-label': 'Tune to ' + s.album.title + ', ' + s.album.year });
      b.textContent = String(s.album.year);
      s.presetEl = b;
      presets.appendChild(b);
      on(b, 'click', function () { firstTouch(); tuneTo(s.freq, true); click(900); });
    });

    var pull = mk('button', 'nd-pull', { type: 'button' });
    pull.textContent = 'Pull over here';
    var listen = null;
    if (listenUrl || previews) {
      listen = mk('a', 'nd-listen', { target: '_blank', rel: 'noopener noreferrer' });
      listen.textContent = 'Find this track';
    }
    unit.appendChild(display); unit.appendChild(knobWrap); unit.appendChild(presets);
    var actions = mk('div', 'nd-actions');
    actions.appendChild(pull); if (listen) actions.appendChild(listen);
    unit.appendChild(actions);

    var switches = mk('div', 'nd-switches', { role: 'group', 'aria-label': 'Car controls' });
    var ICONS = {
      wipers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 A10 10 0 0 1 21 18" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 19 L6.5 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/></svg>',
      lights: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 6 C6 6 5 9 5 12 C5 15 6 18 11 18 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 8 H21 M14 12 H21 M14 16 H21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      demist: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16 A10 9 0 0 1 21 16 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 13 C8 11 10 10 9 8 M12 13 C11 11 13 10 12 8 M15 13 C14 11 16 10 15 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
      indicator: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12 L10 5 V9 H20 V15 H10 V19 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    };
    function makeSwitch(key, label) {
      var b = mk('button', 'nd-switch', { type: 'button', 'data-k': key });
      b.innerHTML = ICONS[key];
      var led = mk('span', 'nd-led', { 'aria-hidden': 'true' });
      var lab = mk('span', 'nd-switch-label'); lab.textContent = label;
      var st = mk('span', 'nd-switch-state');
      b.appendChild(led); b.appendChild(lab); b.appendChild(st);
      switches.appendChild(b);
      return { btn: b, led: led, state: st, label: label };
    }
    var swWipers = makeSwitch('wipers', 'Wipers');
    var swLights = makeSwitch('lights', 'Lights');
    var swDemist = makeSwitch('demist', 'Demist');
    var swInd = makeSwitch('indicator', 'Indicator');

    consoleEl.appendChild(unit); consoleEl.appendChild(switches);
    root.appendChild(consoleEl);
    var live = mk('div', 'nd-live', { 'aria-live': 'polite' });
    root.appendChild(live);
    el.appendChild(root);

    var ctx = cv.getContext('2d');

    /* ---------- state ---------- */
    var W = 0, H = 0, dpr = 1, narrow = false;
    var dashTop = 0, horizon = 0, vpX = 0, focal = 1, roofY = 0;
    var glow, gctx, glow2, g2ctx, dropC, dctx, fogC, fctx, fogLit, flctx, fogTex, cloudC, cloudT, ctctx;
    var dropMask = makeDropMask(), dropShade = makeDropShade(), flakeSprite = makeFlake();
    var grains = [makeGrain(7), makeGrain(19), makeGrain(31)];
    var street = genStreet(1975);
    var skyline = genSkyline(2013);

    var freq = 87.9, freqTarget = null, touched = false;
    var weights = [1, 0, 0, 0, 0, 0];
    var P = blend(weights, {});
    var speedNow = 1, travel = 120, clock = 0;
    var wiperMode = 1; // 0 off, 1 slow, 2 fast
    var wiper = { phase: 0, active: false, wait: 0.6, ang: 0, prevAng: 0, dir: 1 };
    var fullBeam = false, heater = false, heatT = 0;
    var indicator = false, indT = 0, indOn = false;
    var drops = [], flakes = [];
    var rain = [];
    var oncoming = [], nextOncoming = 2.5;
    var ahead = { z: 26, brake: 0, brakeT: 7 };
    var lockedId = null, lastLockedId = null;
    var rtOffset = 0, rtText = '', rtWidth = 0, rtStation = null;
    var running = false, raf = 0, lastT = 0, visible = true, onScreen = true;
    var settle = 2; // seconds of animation to run after an interaction in reduced motion
    var lastFilter = '';
    var lampsNow = [];
    var dragging = null;
    var mouseWipe = null;
    var perf = { sum: 0, n: 0, level: 0 }, quality = 1;

    function isReduced() { try { return !!reducedFn(); } catch (e) { return false; } }

    /* ---------- layout ---------- */
    function layout() {
      var r = root.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      W = w; H = h;
      narrow = W < 720;
      root.classList.toggle('nd-narrow', narrow);
      root.classList.remove('nd-compact');
      var ch = consoleEl.offsetHeight || 260;
      if (!narrow && H - ch - 34 < H * 0.55) {
        root.classList.add('nd-compact');
        ch = consoleEl.offsetHeight || 220;
      }
      var cw = consoleEl.offsetWidth || 520;
      if (narrow) {
        dashTop = Math.max(H * 0.42, H - ch - 26);
        consoleEl.style.left = '50%';
        consoleEl.style.top = Math.round(dashTop + 14) + 'px';
      } else {
        dashTop = Math.min(H * 0.68, Math.max(H * 0.5, H - ch - 34));
        var cx = Math.max(cw / 2 + 16, W * 0.38);
        consoleEl.style.left = Math.round(cx) + 'px';
        consoleEl.style.top = Math.round(dashTop + 20) + 'px';
      }
      roofY = Math.max(10, H * 0.035);
      horizon = roofY + (dashTop - roofY) * (narrow ? 0.5 : 0.56);
      vpX = narrow ? W * 0.5 : W * 0.56;
      focal = narrow ? Math.max(W * 1.05, H * 0.5) : W * 0.72;

      var area = W * H;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (area * dpr * dpr > 2.6e6) dpr = Math.max(0.75, Math.sqrt(2.6e6 / area));
      dpr *= quality;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);

      glow = canvas(W / 4, H / 4); gctx = glow.getContext('2d');
      glow2 = canvas(W / 16, H / 16); g2ctx = glow2.getContext('2d');
      dropC = canvas(W / 2, dashTop / 2); dctx = dropC.getContext('2d');
      var oldFog = fogC;
      fogC = canvas(W / 6, dashTop / 6); fctx = fogC.getContext('2d');
      fogLit = canvas(W / 6, dashTop / 6); flctx = fogLit.getContext('2d');
      fogTex = makeFogTexture(fogC.width, fogC.height);
      if (oldFog) fctx.drawImage(oldFog, 0, 0, fogC.width, fogC.height);
      else { fctx.globalAlpha = 0.7; fctx.drawImage(fogTex, 0, 0); fctx.globalAlpha = 1; }
      cloudC = makeClouds(Math.max(64, Math.round(W / 3)), Math.max(16, Math.round(horizon / 3)), 22);
      cloudT = canvas(cloudC.width, cloudC.height); ctctx = cloudT.getContext('2d');

      var maxRain = Math.floor((narrow ? 300 : 620) * (quality < 1 ? quality * 0.85 : 1));
      while (rain.length < maxRain) rain.push(newRain(true));
      if (rain.length > maxRain) rain.length = maxRain;
      drops = drops.filter(function (d) { return d.y < dashTop && d.x < W; });
      flakes = flakes.filter(function (d) { return d.y < dashTop && d.x < W; });
      if (!drops.length) for (var i = 0; i < (narrow ? 70 : 140); i++) drops.push(newDrop(true));
      renderOnce();
    }

    function makeFogTexture(w, h) {
      var c = canvas(w, h), x = c.getContext('2d');
      var r = rng(4);
      
      // heavy at the edges and the bottom, light in the middle
      var g = x.createRadialGradient(w * 0.55, h * 0.45, Math.min(w, h) * 0.2, w * 0.55, h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(150,164,184,0)');
      g.addColorStop(1, 'rgba(160,172,190,0.8)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      var b = x.createLinearGradient(0, h * 0.6, 0, h);
      b.addColorStop(0, 'rgba(160,172,190,0)'); b.addColorStop(1, 'rgba(160,172,190,0.5)');
      x.fillStyle = b; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 40; i++) {
        var px = r() * w, py = r() * h, rr = (0.05 + r() * 0.15) * w;
        var gg = x.createRadialGradient(px, py, 0, px, py, rr);
        gg.addColorStop(0, 'rgba(170,180,198,' + (0.05 + r() * 0.12) + ')');
        gg.addColorStop(1, 'rgba(170,180,198,0)');
        x.fillStyle = gg; x.fillRect(0, 0, w, h);
      }
      return c;
    }

    /* ---------- projection ---------- */
    var curveK = 0, camX = -1.8, camH = 1.25, bob = 0, shakeX = 0, shakeY = 0;
    var _p = { x: 0, y: 0 };
    function proj(x, y, z) {
      var zc = z < 0.3 ? 0.3 : z;
      var bend = curveK * Math.min(zc, 260) * Math.min(zc, 260);
      _p.x = vpX + shakeX + (x + bend - camX) * focal / zc;
      _p.y = horizon + shakeY + (camH + bob - y) * focal / zc;
      return _p;
    }
    function px(x, y, z) { proj(x, y, z); return _p.x; }
    function py(x, y, z) { proj(x, y, z); return _p.y; }

    /* ---------- particles ---------- */
    function newRain(anywhere) {
      return {
        x: (Math.random() * 2 - 1) * 16,
        y: anywhere ? Math.random() * 14 : 10 + Math.random() * 5,
        z: anywhere ? 0.8 + Math.random() * 46 : 8 + Math.random() * 40,
        s: Math.random(), ph: Math.random() * TAU
      };
    }
    function newDrop(anywhere) {
      var big = Math.random() < 0.18;
      var k = Math.max(0.8, Math.min(1.4, W / 1100));
      return {
        x: Math.random() * W, y: roofY + Math.random() * (dashTop - roofY),
        r: (big ? 4 + Math.random() * 4.5 : 1.5 + Math.random() * 2.6) * k,
        a: anywhere ? 1 : 0, vy: big ? -(4 + Math.random() * 10) : 0, vx: 0, moved: 0
      };
    }

    /* ---------- tuning ---------- */
    function signalFor(f) {
      var best = null, bestS = 0;
      for (var i = 0; i < stations.length; i++) {
        var d = Math.abs(f - stations[i].freq);
        var s = 1 - smooth((d - 0.12) / 0.55);
        if (s > bestS) { bestS = s; best = stations[i]; }
      }
      return { st: best, s: bestS };
    }
    function setFreq(f, fromUser) {
      freq = clamp(Math.round(f * 100) / 100, FMIN, FMAX);
      if (fromUser) freqTarget = null;
      paintDial();
      wake();
    }
    function tuneTo(f, animate) {
      if (animate && !isReduced()) freqTarget = clamp(f, FMIN, FMAX);
      else { freqTarget = null; setFreq(f); }
      wake();
    }
    function snapIfClose() {
      for (var i = 0; i < stations.length; i++) {
        if (Math.abs(freq - stations[i].freq) < 0.45) { tuneTo(stations[i].freq, true); return; }
      }
    }
    function firstTouch() {
      if (!touched) { touched = true; paintDial(); if (!lockedId) setRt(null); }
    }

    function paintDial() {
      var sig = signalFor(freq);
      freqNum.textContent = freq.toFixed(1);
      var pct = (freq - FMIN) / (FMAX - FMIN);
      needle.style.left = (pct * 100) + '%';
      knobCap.style.transform = 'rotate(' + (pct * 600 - 300).toFixed(1) + 'deg)';
      knob.setAttribute('aria-valuenow', freq.toFixed(1));
      var locked = sig.s > 0.9 ? sig.st : null;
      knob.setAttribute('aria-valuetext', freq.toFixed(1) + ' FM' + (locked ? ', ' + locked.album.title + ', ' + locked.album.year : ', static'));
      for (var b = 0; b < bars.length; b++) bars[b].classList.toggle('nd-on', sig.s > b / 5 + 0.05);
      stations.forEach(function (s) {
        var isOn = locked === s;
        s.presetEl.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        s.markEl.classList.toggle('nd-on', isOn);
      });
      if (!touched) psEl.textContent = '';
      else psEl.textContent = locked ? locked.ps : (sig.s > 0.25 ? '. . .' : 'static');
      var id = locked ? locked.id : null;
      if (id !== lockedId) {
        lockedId = id;
        radioYield = false;
        root.classList.toggle('nd-locked', !!locked);
        if (locked) {
          pull.setAttribute('aria-label', 'Pull over here: open the room for ' + locked.album.title);
          live.textContent = 'Tuned to ' + freq.toFixed(1) + ' FM. ' + locked.album.title + ', ' + locked.album.year + '.';
          lastLockedId = id;
          setRt(locked);
          if (radioTrack && radioStation === locked) showTrack(locked, radioTrack); // the song may have started a beat before the lock
          stationSting(locked.id);
        } else {
          setRt(null);
        }
      }
    }

    function setRt(s) {
      rtStation = s;
      rtOffset = 0;
      if (!s) {
        rtTrack.textContent = touched ? 'searching' : 'turn the dial';
        rtTrack.style.transform = 'translateX(0)';
        rt.classList.remove('nd-scroll');
        if (listen) listen.removeAttribute('href');
        return;
      }
      var parts = [s.album.title + ' (' + s.album.year + ')'];
      s.tracks.forEach(function (t) { parts.push(t.n + '  ' + t.title); });
      rtText = parts.join('      ') + '      ';
      if (isReduced()) {
        rtTrack.textContent = s.album.title + ' (' + s.album.year + ')';
        rt.classList.remove('nd-scroll');
      } else {
        rtTrack.textContent = rtText + rtText;
        rt.classList.add('nd-scroll');
      }
      rtWidth = 0;
      updateListen();
    }
    function currentTrack() {
      if (radioTrack && rtStation && rtStation === radioStation) return radioTrack;
      if (!rtStation || !rtStation.tracks.length) return null;
      if (!rtWidth) return rtStation.tracks[0];
      // which item is near the left of the readout
      var parts = [rtStation.album.title].concat(rtStation.tracks.map(function (t) { return t.title; }));
      var frac = (rtOffset % rtWidth) / rtWidth;
      var idx = Math.floor(frac * parts.length);
      return rtStation.tracks[clamp(idx, 1, parts.length - 1) - 1];
    }
    var listenIdx = -1;
    function updateListen() {
      if (!listen) return;
      if (radioTrack && rtStation && rtStation === radioStation) return; // showTrack owns the link while a real song plays
      if (!listenUrl) { listen.removeAttribute('href'); return; }
      listen.textContent = 'Find this track';
      var t = currentTrack();
      if (!t) { listen.removeAttribute('href'); return; }
      if (t.n === listenIdx && listen.getAttribute('href')) return;
      listenIdx = t.n;
      try {
        var u = listenUrl(t);
        if (u) { listen.setAttribute('href', u); listen.setAttribute('aria-label', 'Find ' + t.title + ' (opens in a new tab)'); }
      } catch (e) { /* optional */ }
    }

    /* knob: drag horizontally, or keys while focused */
    function onKnobDown(e) {
      if (e.button != null && e.button !== 0) return;
      firstTouch();
      dragging = { id: e.pointerId, x0: e.clientX, y0: e.clientY, f0: freq, mode: 'knob', live: e.pointerType === 'mouse' };
      try { knob.setPointerCapture(e.pointerId); } catch (er) {}
      knob.focus({ preventScroll: true });
    }
    function onScaleDown(e) {
      if (e.button != null && e.button !== 0) return;
      firstTouch();
      dragging = { id: e.pointerId, x0: e.clientX, y0: e.clientY, f0: freq, mode: 'scale', live: e.pointerType === 'mouse' };
      try { scale.setPointerCapture(e.pointerId); } catch (er) {}
      if (e.pointerType === 'mouse') scaleTo(e.clientX);
    }
    function scaleTo(clientX) {
      var r = scaleTicks.getBoundingClientRect();
      setFreq(FMIN + clamp((clientX - r.left) / r.width, 0, 1) * (FMAX - FMIN), true);
    }
    function onMove(e) {
      if (!dragging || e.pointerId !== dragging.id) return;
      var dx = e.clientX - dragging.x0, dy = e.clientY - dragging.y0;
      if (!dragging.live) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { dragging = null; return; } // a scroll, not a tune
        dragging.live = true;
      }
      if (dragging.mode === 'knob') setFreq(dragging.f0 + dx * (narrow ? 0.05 : 0.035), true);
      else scaleTo(e.clientX);
      tickSound();
    }
    function onUp(e) {
      if (!dragging || e.pointerId !== dragging.id) return;
      var was = dragging; dragging = null;
      if (was.mode === 'scale' && !was.live && e.type === 'pointerup') scaleTo(e.clientX);
      snapIfClose();
    }
    var lastTick = 0;
    function tickSound() {
      var now = performance.now();
      if (now - lastTick < 45) return;
      lastTick = now;
      if (audio && audio.enabled) audio.tone({ freq: 3200, type: 'square', dur: 0.012, gain: 0.012, attack: 0.001, release: 0.01 });
    }
    function nextStation(dir) {
      var list = stations.map(function (s) { return s.freq; });
      if (dir > 0) { for (var i = 0; i < list.length; i++) if (list[i] > freq + 0.05) return tuneTo(list[i], true); tuneTo(list[0], true); }
      else { for (var j = list.length - 1; j >= 0; j--) if (list[j] < freq - 0.05) return tuneTo(list[j], true); tuneTo(list[list.length - 1], true); }
    }
    function onKnobKey(e) {
      var k = e.key, step = e.shiftKey ? 1 : 0.1, handled = true;
      firstTouch();
      if (k === 'ArrowRight' || k === 'ArrowUp') setFreq((freqTarget != null ? freqTarget : freq) + step, true);
      else if (k === 'ArrowLeft' || k === 'ArrowDown') setFreq((freqTarget != null ? freqTarget : freq) - step, true);
      else if (k === 'PageUp') nextStation(1);
      else if (k === 'PageDown') nextStation(-1);
      else if (k === 'Home') setFreq(FMIN, true);
      else if (k === 'End') setFreq(FMAX, true);
      else handled = false;
      if (handled) { e.preventDefault(); tickSound(); }
    }
    on(knob, 'pointerdown', onKnobDown);
    on(scale, 'pointerdown', onScaleDown);
    on(knob, 'pointermove', onMove); on(scale, 'pointermove', onMove);
    on(knob, 'pointerup', onUp); on(scale, 'pointerup', onUp);
    on(knob, 'pointercancel', onUp); on(scale, 'pointercancel', onUp);
    on(knob, 'keydown', onKnobKey);

    on(pull, 'click', function () {
      if (!lockedId) return;
      indicator = true; indT = 0; paintSwitches();
      try { openRoom(lockedId); } catch (e) { if (window.console) console.error(e); }
    });

    /* windscreen: a mouse can wipe the condensation by hand */
    on(cv, 'pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      var r = root.getBoundingClientRect();
      if (e.clientY - r.top > dashTop) return;
      mouseWipe = { x: e.clientX - r.left, y: e.clientY - r.top };
      wipeFog(mouseWipe.x, mouseWipe.y, mouseWipe.x, mouseWipe.y);
    });
    on(window, 'pointermove', function (e) {
      if (!mouseWipe) return;
      var r = root.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      wipeFog(mouseWipe.x, mouseWipe.y, x, y);
      mouseWipe.x = x; mouseWipe.y = y;
    });
    on(window, 'pointerup', function () { mouseWipe = null; });
    function wipeFog(x0, y0, x1, y1) {
      if (!fctx) return;
      fctx.save();
      fctx.globalCompositeOperation = 'destination-out';
      fctx.lineCap = 'round';
      fctx.strokeStyle = 'rgba(0,0,0,0.9)';
      fctx.lineWidth = 34 / 6;
      fctx.beginPath(); fctx.moveTo(x0 / 6, y0 / 6); fctx.lineTo(x1 / 6 + 0.01, y1 / 6); fctx.stroke();
      fctx.restore();
      wake();
    }

    /* ---------- switches ---------- */
    function paintSwitches() {
      var wl = ['Off', 'Slow', 'Fast'][wiperMode];
      swWipers.state.textContent = wl;
      swWipers.btn.setAttribute('aria-label', 'Wipers: ' + wl.toLowerCase());
      swWipers.btn.dataset.level = String(wiperMode);
      swLights.state.textContent = fullBeam ? 'Full' : 'Dipped';
      swLights.btn.setAttribute('aria-label', 'Headlights: ' + (fullBeam ? 'full beam' : 'dipped'));
      swLights.btn.setAttribute('aria-pressed', fullBeam ? 'true' : 'false');
      swDemist.state.textContent = heater ? 'On' : 'Off';
      swDemist.btn.setAttribute('aria-label', 'Demist the windscreen');
      swDemist.btn.setAttribute('aria-pressed', heater ? 'true' : 'false');
      swInd.state.textContent = indicator ? 'Left' : 'Off';
      swInd.btn.setAttribute('aria-label', 'Left indicator');
      swInd.btn.setAttribute('aria-pressed', indicator ? 'true' : 'false');
    }
    on(swWipers.btn, 'click', function () {
      wiperMode = (wiperMode + 1) % 3;
      if (wiperMode && !wiper.active) { wiper.wait = 0; }
      if (isReduced() && wiperMode) { wiper.active = true; wiper.phase = 0; wiper.single = true; }
      paintSwitches(); click(520); wake(2.4);
    });
    on(swLights.btn, 'click', function () { fullBeam = !fullBeam; paintSwitches(); click(fullBeam ? 640 : 480); wake(); });
    on(swDemist.btn, 'click', function () { heater = !heater; paintSwitches(); click(heater ? 700 : 420); wake(heater ? 7 : 1); });
    on(swInd.btn, 'click', function () { indicator = !indicator; indT = 0; paintSwitches(); click(560); wake(); });
    paintSwitches();

    function click(f) {
      if (audio && audio.enabled) {
        audio.tone({ freq: f || 600, type: 'square', dur: 0.025, gain: 0.025, attack: 0.001, release: 0.02 });
        audio.noise({ dur: 0.03, gain: 0.03, type: 'highpass', freq: 2500 });
      }
    }

    /* ---------- simulation ---------- */
    function step(dt, still) {
      // tuning glide
      if (freqTarget != null) {
        var d = freqTarget - freq;
        if (Math.abs(d) < 0.01) { freq = freqTarget; freqTarget = null; }
        else freq += d * (1 - Math.exp(-dt * 7));
        paintDial();
      }
      // grade targets from signal strength
      var sig = signalFor(freq);
      var tgt = [1, 0, 0, 0, 0, 0];
      if (touched && sig.st) {
        var s = sig.s;
        tgt[sig.st.grade] = s; tgt[0] = 1 - s;
      }
      var k = still ? 1 : 1 - Math.exp(-dt / 1.25);
      if (isReduced()) k = 1 - Math.exp(-dt / 0.35);
      var sum = 0;
      for (var i = 0; i < 6; i++) { weights[i] += (tgt[i] - weights[i]) * k; sum += weights[i]; }
      for (var j = 0; j < 6; j++) weights[j] /= sum;
      blend(weights, P);

      if (still) return;
      speedNow += (P.speed - speedNow) * (1 - Math.exp(-dt / 2.2));
      var v = 15 * speedNow;
      travel += v * dt;
      clock += dt;
      curveK = 0.00034 * Math.sin(travel / 310) + 0.00018 * Math.sin(travel / 113 + 1.3);
      bob = 0.012 * Math.sin(clock * 9.1) * speedNow + 0.008 * Math.sin(clock * 2.3);
      var sh = P.shake;
      shakeX = sh * (Math.sin(clock * 23.0) * 0.7 + Math.sin(clock * 37.3) * 0.5) * 0.6;
      shakeY = sh * (Math.sin(clock * 29.7) * 0.6 + Math.sin(clock * 17.9)) * 0.7;
      camX = -1.8 + 0.06 * Math.sin(clock * 0.37);

      // oncoming traffic
      nextOncoming -= dt;
      if (nextOncoming <= 0) {
        oncoming.push({ z: 240, x: 1.8 + (Math.random() - 0.5) * 0.3, v: 12 + Math.random() * 6, hi: Math.random() < 0.15 });
        nextOncoming = 3 + Math.random() * 7;
      }
      for (var o = oncoming.length - 1; o >= 0; o--) {
        oncoming[o].z -= (v + oncoming[o].v) * dt;
        if (oncoming[o].z < 1.2) oncoming.splice(o, 1);
      }
      // the car ahead
      ahead.brakeT -= dt;
      if (ahead.brakeT < 0) { ahead.brake = 1; if (ahead.brakeT < -1.6) { ahead.brake = 0; ahead.brakeT = 6 + Math.random() * 10; } }
      ahead.z = 24 + 6 * Math.sin(clock / 7.3) + 3 * Math.sin(clock / 2.9) - ahead.brake * 2;

      // rain / snow in the air
      var snowAmt = P.snow;
      for (var r = 0; r < rain.length; r++) {
        var p = rain[r];
        var isSnow = p.s < snowAmt;
        if (isSnow) {
          p.y -= (1.1 + p.s * 0.6) * dt;
          p.x += Math.sin(clock * 0.9 + p.ph) * 0.6 * dt;
          p.z -= v * dt;
        } else {
          p.y -= 9.5 * dt;
          p.z -= v * dt;
        }
        if (p.y < 0 || p.z < 0.7) { var n = newRain(false); p.x = n.x; p.y = isSnow ? 3 + Math.random() * 10 : n.y; p.z = n.z; }
      }

      // drops on the glass
      var wetness = P.rain;
      var rate = wetness * (narrow ? 26 : 50) * (0.6 + speedNow * 0.5);
      var maxDrops = narrow ? 160 : 300;
      var add = rate * dt;
      while (add > 0 && drops.length < maxDrops) { if (Math.random() < add) drops.push(newDrop(false)); add -= 1; }
      for (var q = drops.length - 1; q >= 0; q--) {
        var dr = drops[q];
        if (dr.a < 1) dr.a = Math.min(1, dr.a + dt * 6);
        if (dr.vy) {
          // the airflow pushes big drops up and out across the glass
          var push = speedNow * 1.2;
          dr.y += dr.vy * push * dt;
          dr.x += (dr.x - vpX) / W * 18 * push * dt;
          dr.moved += Math.abs(dr.vy * push * dt);
          if (dr.moved > 12 + Math.random() * 10 && drops.length < maxDrops) {
            dr.moved = 0;
            drops.push({ x: dr.x + (Math.random() - 0.5) * 3, y: dr.y + dr.r * 1.6, r: dr.r * (0.22 + Math.random() * 0.15), a: 1, vy: 0, vx: 0, moved: 0 });
            dr.r *= 0.985;
          }
          if (dr.y < roofY - 4 || dr.r < 1.2) drops.splice(q, 1);
        }
      }
      if (wetness < 0.05 && drops.length && Math.random() < dt * 3) drops.splice(0, 1); // the glass dries when it snows
      // snowflakes landing, then melting into water
      var frate = snowAmt * (narrow ? 8 : 16) * (0.6 + speedNow * 0.5);
      var fa = frate * dt;
      while (fa > 0 && flakes.length < 140) { if (Math.random() < fa) flakes.push({ x: Math.random() * W, y: roofY + Math.random() * (dashTop - roofY), r: (2 + Math.random() * 4) * Math.max(0.75, W / 1400), life: 0, max: 3 + Math.random() * 5 }); fa -= 1; }
      for (var fi = flakes.length - 1; fi >= 0; fi--) {
        var fl = flakes[fi];
        fl.life += dt;
        if (fl.life > fl.max) {
          flakes.splice(fi, 1);
          if (drops.length < maxDrops) drops.push({ x: fl.x, y: fl.y, r: fl.r * 0.5, a: 1, vy: 0, vx: 0, moved: 0 });
        }
      }

      // wipers
      stepWiper(dt);

      // condensation
      if (heater) {
        heatT = Math.min(1, heatT + dt / 6);
        fctx.save();
        fctx.globalCompositeOperation = 'destination-out';
        var cw = fogC.width, chh = fogC.height;
        fctx.translate(cw * 0.5, chh * 1.02);
        fctx.scale(1, 0.85);
        var rr = Math.max(1, heatT * cw * 0.85);
        var gg = fctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr);
        gg.addColorStop(0, 'rgba(0,0,0,' + (dt * 3).toFixed(3) + ')');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = gg; fctx.beginPath(); fctx.arc(0, 0, rr, 0, TAU); fctx.fill();
        fctx.restore();
      } else {
        heatT = Math.max(0, heatT - dt / 4);
        fctx.globalAlpha = Math.min(1, dt * 0.035);
        fctx.drawImage(fogTex, 0, 0);
        fctx.globalAlpha = 1;
      }

      // indicator
      if (indicator) {
        indT += dt;
        var onNow = (indT % 0.76) < 0.4;
        if (onNow !== indOn) {
          indOn = onNow;
          swInd.btn.classList.toggle('nd-blink', indOn);
          if (audio && audio.enabled) audio.tone({ freq: indOn ? 2100 : 1500, type: 'square', dur: 0.016, gain: 0.03, attack: 0.001, release: 0.014 });
        }
      } else if (indOn) { indOn = false; swInd.btn.classList.remove('nd-blink'); }

      // radio text
      if (rtStation && !isReduced()) {
        if (!rtWidth) rtWidth = rtTrack.scrollWidth / 2 || 1;
        rtOffset += dt * 34;
        if (rtOffset > rtWidth) rtOffset -= rtWidth;
        rtTrack.style.transform = 'translateX(' + (-rtOffset).toFixed(1) + 'px)';
        updateListen();
      }
    }

    function stepWiper(dt) {
      var stroke = wiperMode === 2 ? 0.62 : 0.95;
      var prev = wiper.ang;
      if (!wiper.active) {
        if (wiperMode > 0 && !isReduced()) {
          wiper.wait -= dt;
          if (wiper.wait <= 0) { wiper.active = true; wiper.phase = 0; swish(stroke); }
        }
      }
      if (wiper.active) {
        var before = wiper.phase;
        wiper.phase += dt / (stroke * 2);
        if (before < 0.5 && wiper.phase >= 0.5) thunk(0.7);
        if (wiper.phase >= 1) {
          wiper.phase = 0; wiper.active = false; thunk(1);
          wiper.wait = wiperMode === 2 ? 0.05 : 1.7;
          wiper.single = false;
        }
      }
      var u = wiper.active ? (wiper.phase < 0.5 ? wiper.phase * 2 : 2 - wiper.phase * 2) : 0;
      wiper.ang = 0.5 - 0.5 * Math.cos(u * Math.PI);
      wiper.prevAng = prev;
      if (wiper.active || prev !== wiper.ang) clearUnderWipers(prev, wiper.ang);
    }
    function wiperGeom() {
      var y = dashTop + (narrow ? 0.02 : 0.03) * H;
      var L = narrow ? Math.min(dashTop * 0.9, W * 0.62) : Math.min(dashTop * 0.95, W * 0.36);
      var piv = narrow ? [W * 0.08, W * 0.56] : [W * 0.2, W * 0.58];
      return { y: y, L: L, piv: piv, park: Math.PI - 0.07, max: narrow ? 0.62 : 0.42 };
    }
    function angOf(g, u) { return lerp(g.park, g.max, u); }
    function clearUnderWipers(u0, u1) {
      var g = wiperGeom();
      var a0 = angOf(g, Math.min(u0, u1)), a1 = angOf(g, Math.max(u0, u1));
      var lo = Math.min(a0, a1) - 0.02, hi = Math.max(a0, a1) + 0.02;
      function swept(x, y) {
        for (var p = 0; p < 2; p++) {
          var dx = x - g.piv[p], dy = g.y - y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < g.L * 0.16 || d > g.L) continue;
          var a = Math.atan2(dy, dx);
          if (a >= lo && a <= hi) return true;
        }
        return false;
      }
      for (var i = drops.length - 1; i >= 0; i--) if (swept(drops[i].x, drops[i].y)) drops.splice(i, 1);
      for (var j = flakes.length - 1; j >= 0; j--) if (swept(flakes[j].x, flakes[j].y)) flakes.splice(j, 1);
    }

    /* ---------- drawing ---------- */
    function draw() {
      var c = ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      gctx.setTransform(0.25 * glow.width / (W / 4), 0, 0, 0.25 * glow.height / (H / 4), 0, 0);
      gctx.globalCompositeOperation = 'source-over';
      gctx.fillStyle = '#000'; gctx.fillRect(0, 0, W, H);
      gctx.globalCompositeOperation = 'lighter';

      drawSky(c);
      drawGround(c);
      drawHaze(c);
      lampsNow.length = 0;
      collectLamps();
      drawBuildings(c);
      drawStreetFurniture(c);
      drawLamps(c);
      drawCars(c);
      drawAir(c);
      // bloom
      g2ctx.globalCompositeOperation = 'source-over';
      g2ctx.drawImage(glow, 0, 0, glow2.width, glow2.height);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = clamp(0.62 * P.bloom, 0, 1);
      c.drawImage(glow, 0, 0, W, H);
      c.globalAlpha = clamp(0.42 * P.bloom, 0, 1);
      c.drawImage(glow2, 0, 0, W, H);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      drawGlass(c);
      drawInterior(c);
      drawGrain(c);
      applyFilter();
    }

    function drawSky(c) {
      var g = c.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, rgba(P.skyTop));
      g.addColorStop(0.55, rgba(P.skyMid));
      g.addColorStop(1, rgba(P.skyLow));
      c.fillStyle = g; c.fillRect(0, 0, W, horizon + 2);
      // city glow
      var off = -curveK * 400 * focal * 0.6;
      var gx = vpX + off;
      c.save();
      c.translate(gx, horizon); c.scale(1, 0.32);
      var rg = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.75);
      rg.addColorStop(0, rgba(P.glow, 0.42 * P.glowAmt));
      rg.addColorStop(0.4, rgba(P.glow, 0.12 * P.glowAmt));
      rg.addColorStop(1, rgba(P.glow, 0));
      c.fillStyle = rg; c.fillRect(-W * 1.5, -W, W * 3, W * 2);
      c.restore();
      // clouds lit from below
      ctctx.globalCompositeOperation = 'source-over';
      ctctx.clearRect(0, 0, cloudT.width, cloudT.height);
      var cw = cloudT.width, drift = ((clock * 2 + off * 0.1) % cw + cw) % cw;
      ctctx.drawImage(cloudC, -drift, 0); ctctx.drawImage(cloudC, cw - drift, 0);
      ctctx.globalCompositeOperation = 'source-in';
      ctctx.fillStyle = rgba(P.cloud); ctctx.fillRect(0, 0, cw, cloudT.height);
      c.globalAlpha = clamp(P.cloudAmt, 0, 1);
      c.drawImage(cloudT, 0, 0, W, horizon);
      c.globalAlpha = 1;

      // far skyline
      var base = horizon + shakeY * 0.3;
      var sx = gx;
      var unitW = W * 0.9, unitH = (dashTop - roofY) * 1.05;
      c.fillStyle = rgba(P.skyline);
      c.beginPath();
      for (var i = 0; i < skyline.length; i++) {
        var b = skyline[i];
        c.rect(sx + b.u * unitW, base - b.h * unitH, b.w * unitW + 0.6, b.h * unitH + 1);
      }
      c.fill();
      var cls = [P.win0, P.win1, P.win2, P.win3, P.win4];
      var ww = Math.max(1, unitW * 0.0016), wh = Math.max(1, unitH * 0.0026);
      for (var k = 0; k < 5; k++) {
        c.fillStyle = rgba(cls[k], k >= 2 ? 0.95 : 0.75);
        c.beginPath();
        for (var j = 0; j < skyline.length; j++) {
          var s = skyline[j], bx = sx + s.u * unitW, bw = s.w * unitW, bh = s.h * unitH;
          if (bx > W + 4 || bx + bw < -4) continue;
          for (var q = 0; q < s.wins.length; q++) {
            var wn = s.wins[q];
            if (wn[2] !== k) continue;
            c.rect(bx + wn[0] * bw, base - bh + wn[1] * bh, ww, wh);
          }
        }
        c.fill();
      }
      // aircraft beacons
      var blink = (Math.sin(clock * 3) > 0.2) ? 1 : 0.15;
      for (var m = 0; m < skyline.length; m++) {
        var t = skyline[m];
        if (!t.beacon) continue;
        var bx2 = sx + (t.u + t.w / 2) * unitW, by2 = base - t.h * unitH - 2;
        if (bx2 < 0 || bx2 > W) continue;
        c.fillStyle = rgba([255, 40, 40], blink);
        c.fillRect(bx2 - 1, by2 - 1, 2, 2);
        glowDot(bx2, by2, 6, [255, 40, 40], 0.5 * blink);
      }
      // horizon glow into the bloom layer
      gctx.fillStyle = rgba(P.glow, 0.12 * P.glowAmt);
      gctx.fillRect(0, horizon - (dashTop - roofY) * 0.08, W, (dashTop - roofY) * 0.1);
    }

    function glowDot(x, y, r, col, a) {
      if (a <= 0.003 || r <= 0) return;
      var g = gctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(1, rgba(col, 0));
      gctx.fillStyle = g;
      gctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    function glowEllipse(target, x, y, rx, ry, col, a) {
      if (a <= 0.003 || rx <= 0.2 || ry <= 0.2) return;
      target.save();
      target.translate(x, y); target.scale(1, ry / rx);
      var g = target.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.35, rgba(col, a * 0.45));
      g.addColorStop(1, rgba(col, 0));
      target.fillStyle = g;
      target.fillRect(-rx, -rx, rx * 2, rx * 2);
      target.restore();
    }

    function strip(c, x0, x1, zA, zB, n) {
      c.beginPath();
      var i, z;
      for (i = 0; i <= n; i++) { z = zA * Math.pow(zB / zA, i / n); proj(x0, 0, z); if (i) c.lineTo(_p.x, _p.y); else c.moveTo(_p.x, _p.y); }
      for (i = n; i >= 0; i--) { z = zA * Math.pow(zB / zA, i / n); proj(x1, 0, z); c.lineTo(_p.x, _p.y); }
      c.closePath();
    }

    function drawGround(c) {
      // pavement and verges
      var gg = c.createLinearGradient(0, horizon, 0, dashTop);
      gg.addColorStop(0, rgba(mixc(P.pave, P.skyLow, 0.45)));
      gg.addColorStop(0.25, rgba(P.pave));
      gg.addColorStop(1, rgba(mulc(P.pave, 0.8)));
      c.fillStyle = gg;
      c.fillRect(0, horizon - 1, W, dashTop - horizon + 40);
      // the road: dark, wet, mirroring the sky near the horizon
      var rg = c.createLinearGradient(0, horizon, 0, dashTop);
      rg.addColorStop(0, rgba(mixc(P.road, P.sheen, 0.75)));
      rg.addColorStop(0.12, rgba(mixc(P.road, P.sheen, 0.3)));
      rg.addColorStop(0.5, rgba(P.road));
      rg.addColorStop(1, rgba(mulc(P.road, 0.9)));
      c.fillStyle = rg;
      strip(c, -3.7, 3.7, 1.5, 420, 40); c.fill();
      // kerbs
      c.fillStyle = rgba(mixc(P.pave, [255, 255, 255], 0.08), 0.9);
      strip(c, -3.85, -3.65, 1.5, 300, 30); c.fill();
      strip(c, 3.65, 3.85, 1.5, 300, 30); c.fill();
      // snow on the verges (2022)
      var wS = weights[5];
      if (wS > 0.01) {
        c.fillStyle = rgba([240, 236, 228], 0.55 * wS);
        strip(c, -3.6, -3.1, 1.5, 300, 30); c.fill();
        strip(c, 3.1, 3.6, 1.5, 300, 30); c.fill();
      }
      // edge lines
      c.fillStyle = rgba(P.lane, 0.55);
      strip(c, -3.45, -3.35, 1.5, 300, 30); c.fill();
      strip(c, 3.35, 3.45, 1.5, 300, 30); c.fill();
      // double yellow (2020)
      var wY = weights[4];
      if (wY > 0.01) {
        c.fillStyle = rgba([255, 212, 0], 0.9 * wY);
        strip(c, -3.3, -3.2, 1.5, 300, 30); c.fill();
        strip(c, -3.12, -3.02, 1.5, 300, 30); c.fill();
      }
      // centre dashes
      var dashLen = 3, gap = 9;
      var startK = Math.floor((travel + 1.5) / gap);
      c.fillStyle = rgba(P.lane, 0.8);
      c.beginPath();
      for (var k = startK; k < startK + 26; k++) {
        var z0 = k * gap - travel, z1 = z0 + dashLen;
        if (z1 < 1.5) continue;
        z0 = Math.max(z0, 1.5);
        proj(-0.07, 0, z0); var ax = _p.x, ay = _p.y;
        proj(0.07, 0, z0); var bx = _p.x;
        proj(0.07, 0, z1); var cx2 = _p.x, cy = _p.y;
        proj(-0.07, 0, z1); var dx = _p.x;
        c.moveTo(ax, ay); c.lineTo(bx, ay); c.lineTo(cx2, cy); c.lineTo(dx, cy); c.closePath();
      }
      c.fill();
      // cat's eyes, catching our headlights
      var reach = fullBeam ? 120 : 48;
      for (var e = Math.floor(travel / 18); e < Math.floor(travel / 18) + 12; e++) {
        var ze = e * 18 + 6 - travel;
        if (ze < 3) continue;
        var lit = clamp(1 - ze / reach, 0, 1);
        if (lit <= 0) continue;
        proj(0, 0, ze);
        var rr = Math.max(0.8, 0.09 * focal / ze);
        c.fillStyle = rgba([255, 244, 220], lit);
        c.fillRect(_p.x - rr, _p.y - rr * 0.5, rr * 2, rr);
        glowDot(_p.x, _p.y, rr * 7, [255, 236, 200], 0.6 * lit);
      }
      // our own headlights on the road ahead
      var hl = [255, 238, 214];
      var near = py(0, 0, 6), far = py(0, 0, fullBeam ? 70 : 26);
      var mid = proj(camX, 0, fullBeam ? 22 : 12);
      var hx = mid.x;
      c.globalCompositeOperation = 'lighter';
      var span = Math.max(4, near - far);
      glowEllipse(c, hx, (near + far) / 2 + span * 0.12, (fullBeam ? 0.34 : 0.24) * W, span * 0.7, hl, fullBeam ? 0.22 : 0.1);
      if (fullBeam) glowEllipse(gctx, hx, far + span * 0.2, 0.22 * W, span * 0.35, hl, 0.12);
      c.globalCompositeOperation = 'source-over';
    }

    function winColor(seed) {
      var p = hash(seed);
      var k = p < 0.5 ? 0 : p < 0.75 ? 1 : p < 0.85 ? 2 : p < 0.94 ? 3 : 4;
      return k;
    }

    function visibleBuildings() {
      var list = [];
      for (var i = 0; i < street.length; i++) {
        var b = street[i];
        var z = ((b.z0 - travel) % LOOP + LOOP) % LOOP;
        if (z > LOOP - 60) z -= LOOP;
        if (z + b.len < 1.2 || z > 300) continue;
        list.push({ b: b, z: z });
      }
      list.sort(function (a, c) { return c.z - a.z; });
      return list;
    }

    function fogAt(z) { return 1 - Math.exp(-z / 120); }

    function quad(c, x, y0, y1, za, zb) {
      proj(x, y0, za); c.moveTo(_p.x, _p.y);
      proj(x, y1, za); c.lineTo(_p.x, _p.y);
      proj(x, y1, zb); c.lineTo(_p.x, _p.y);
      proj(x, y0, zb); c.lineTo(_p.x, _p.y);
      c.closePath();
    }

    var visB = [];
    function drawBuildings(c) {
      visB = visibleBuildings();
      var cls = [P.win0, P.win1, P.win2, P.win3, P.win4];
      var wSt = weights[1], wAb = weights[3];
      for (var i = 0; i < visB.length; i++) {
        var b = visB[i].b, z = visB[i].z;
        var za = Math.max(1.2, z), zb = z + b.len;
        var f = fogAt(za);
        var face = mixc(P.facade, P.skyLow, f * 0.85);
        // end wall facing us
        if (z > 1.2) {
          c.fillStyle = rgba(mulc(face, 0.7));
          c.beginPath();
          proj(b.x, 0, z); c.moveTo(_p.x, _p.y);
          proj(b.x, b.h, z); c.lineTo(_p.x, _p.y);
          proj(b.x + b.side * b.depth, b.h, z); c.lineTo(_p.x, _p.y);
          proj(b.x + b.side * b.depth, 0, z); c.lineTo(_p.x, _p.y);
          c.closePath(); c.fill();
        }
        // the facade along the road
        c.fillStyle = rgba(face);
        c.beginPath(); quad(c, b.x, 0, b.h, za, zb); c.fill();
        // cornice line
        c.strokeStyle = rgba(mulc(face, 1.5), 0.6);
        c.lineWidth = 1;
        c.beginPath(); proj(b.x, b.h, za); c.moveTo(_p.x, _p.y); proj(b.x, b.h, zb); c.lineTo(_p.x, _p.y); c.stroke();

        var fade = 1 - f * 0.7;
        // windows, grouped by colour class
        if (za < 220) {
          var colW = b.len / b.cols;
          // dark panes first: they mirror a little of the sky
          c.beginPath();
          var anyDark = false;
          for (var fd = 1; fd < b.floors; fd++) {
            for (var cd = 0; cd < b.cols; cd++) {
              var sdd = b.seed + fd * 31 + cd * 7;
              var d0 = z + cd * colW + colW * 0.25, d1 = z + cd * colW + colW * 0.75;
              if (hash(sdd) <= 0.42 && d0 >= 9) continue;
              if (d1 < 1.3) continue;
              var dy0 = 0.4 + fd * 3.1 + 0.8;
              if (dy0 + 1.5 > b.h - 0.4) continue;
              quad(c, b.x, dy0, dy0 + 1.5, Math.max(d0, 1.3), d1);
              anyDark = true;
            }
          }
          if (anyDark) { c.fillStyle = rgba(mixc(P.skyMid, P.glow, 0.12), 0.55 * fade); c.fill(); }
          for (var k = 0; k < 10; k++) {
            var kc = k % 5, dim = k >= 5;
            c.beginPath();
            var any = false;
            for (var fl = 1; fl < b.floors; fl++) {
              for (var cc = 0; cc < b.cols; cc++) {
                var sd = b.seed + fl * 31 + cc * 7;
                if (hash(sd) > 0.42) continue;
                if (winColor(sd + 0.5) !== kc) continue;
                if ((hash(sd + 9.3) < 0.55) !== dim) continue;
                var w0 = z + cc * colW + colW * 0.25, w1 = z + cc * colW + colW * 0.75;
                if (w0 < 9) continue; // too close and glancing: reads as a dark pane
                w0 = Math.max(w0, 1.3);
                var y0 = 0.4 + fl * 3.1 + 0.8, y1 = y0 + 1.5;
                if (y1 > b.h - 0.4) continue;
                quad(c, b.x, y0, y1, w0, w1);
                any = true;
              }
            }
            if (any) { c.fillStyle = rgba(cls[kc], (kc >= 2 ? 0.92 : 0.78) * (dim ? 0.42 : 1) * fade); c.fill(); }
          }
          // a ground-floor shopfront
          if (b.shop) {
            var col = P.shop;
            var s0 = Math.max(1.3, z + 1), s1 = zb - 1;
            var sg = c.createLinearGradient(0, py(b.x, 2.9, Math.max(s0, 4)), 0, py(b.x, 0.4, Math.max(s0, 4)));
            sg.addColorStop(0, rgba(col, 0.2 * fade));
            sg.addColorStop(1, rgba(col, 0.62 * fade));
            c.fillStyle = sg;
            c.beginPath(); quad(c, b.x, 0.4, 2.9, s0, s1); c.fill();
            // mullions
            c.fillStyle = rgba(mulc(face, 0.6), 0.9);
            c.beginPath();
            for (var mz2 = s0 + 2.4 - ((s0 - z) % 2.4); mz2 < s1; mz2 += 2.4) quad(c, b.x, 0.4, 2.9, mz2, mz2 + 0.22);
            quad(c, b.x, 2.35, 2.55, s0, s1);
            c.fill();
            // spill onto the wet pavement
            var mz = clamp(z + b.len / 2, 2, 300);
            var sx = px(b.x - b.side * 1.5, 0, mz), sy = py(0, 0, mz);
            var spread = Math.abs(px(b.x, 0, Math.max(1.3, z + 1)) - px(b.x, 0, zb - 1));
            glowEllipse(gctx, sx, sy, Math.max(4, spread * 0.6), Math.max(2, spread * 0.12), col, 0.11 * fade);
            var gx = px(b.x, 1.6, mz), gy = py(b.x, 1.6, mz);
            glowEllipse(gctx, gx, gy, Math.max(3, spread * 0.5), Math.max(2, 2.5 * focal / mz), col, 0.13 * fade);
          }
        }
        // white neon tubes under the cornice (2013)
        if (wSt > 0.01 && za < 200 && zb > 6) {
          za = Math.max(za, 6);
          var tubeY = Math.min(b.h - 0.6, 3.4);
          var lw = clamp(0.09 * focal / za, 0.8, 3.2);
          c.strokeStyle = rgba([255, 255, 255], wSt * fade);
          c.lineWidth = lw;
          c.beginPath(); proj(b.x - b.side * 0.05, tubeY, za); c.moveTo(_p.x, _p.y); proj(b.x - b.side * 0.05, tubeY, zb - 0.5); c.lineTo(_p.x, _p.y); c.stroke();
          var midz = clamp((za + zb) / 2, 2, 300);
          glowEllipse(gctx, px(b.x, tubeY, midz), py(b.x, tubeY, midz), Math.abs(px(b.x, 0, za) - px(b.x, 0, zb)) * 0.55, 1.2 * focal / midz, [255, 255, 255], 0.35 * wSt * fade);
          if (hash(b.seed + 3) < 0.5) { // a vertical tube on the corner
            c.beginPath(); proj(b.x - b.side * 0.05, 3.4, za + 0.3); c.moveTo(_p.x, _p.y); proj(b.x - b.side * 0.05, Math.min(b.h - 0.5, 12), za + 0.3); c.lineTo(_p.x, _p.y); c.stroke();
          }
        }
        // billboards: small squares of saturated colour (2018)
        if (b.bill && wAb > 0.01 && za < 240) {
          var bcol = [[255, 34, 62], [24, 104, 255], [16, 214, 118], [255, 60, 220], [255, 150, 0]][b.bill.cls];
          var bz0 = z + b.len * b.bill.a, bz1 = bz0 + b.len * b.bill.w;
          if (bz1 > 1.4) {
            bz0 = Math.max(1.4, bz0);
            var by0 = b.h - 6.2, by1 = b.h - 1.2;
            c.fillStyle = rgba(bcol, wAb * fade);
            c.beginPath(); quad(c, b.x - b.side * 0.1, by0, by1, bz0, bz1); c.fill();
            c.fillStyle = rgba([255, 255, 255], 0.85 * wAb * fade);
            c.beginPath(); quad(c, b.x - b.side * 0.12, by0 + 1.2, by0 + 2.0, bz0 + (bz1 - bz0) * 0.15, bz0 + (bz1 - bz0) * 0.45); c.fill();
            var bmz = clamp((bz0 + bz1) / 2, 2, 300);
            var bw = Math.abs(px(b.x, 0, bz0) - px(b.x, 0, bz1));
            glowEllipse(gctx, px(b.x, (by0 + by1) / 2, bmz), py(b.x, (by0 + by1) / 2, bmz), Math.max(3, bw * 0.8), Math.max(3, 4 * focal / bmz), bcol, 0.5 * wAb * fade);
          }
        }
        // a blade sign sticking out over the pavement
        if (b.blade && z > 1.5 && z < 180) drawBlade(c, b, z + 1.2, fade);
      }
    }

    function drawBlade(c, b, z, fade) {
      var sg = b.blade;
      var litA = clamp((P.neonAmt - sg.lit * 0.9) * 5, 0, 1);
      var flicker = (hash(b.seed + Math.floor(clock * 12)) < 0.03) ? 0.3 : 1;
      var xIn = b.x - b.side * 0.3, xOut = b.x - b.side * (0.3 + sg.w);
      var y0 = sg.y, y1 = sg.y + 1.0;
      proj(Math.min(xIn, xOut), y1, z); var lx = _p.x, ty = _p.y;
      proj(Math.max(xIn, xOut), y0, z); var rx = _p.x, by = _p.y;
      var w = rx - lx, h = by - ty;
      if (w < 2) return;
      c.fillStyle = rgba(mulc(P.facade, 0.6), 0.95);
      c.fillRect(lx, ty, w, h);
      var col = P.neon;
      var a = litA * fade * flicker;
      if (a > 0.01) {
        c.strokeStyle = rgba(col, a);
        c.lineWidth = Math.max(0.7, h * 0.06);
        c.strokeRect(lx + h * 0.1, ty + h * 0.1, w - h * 0.2, h * 0.8);
        var fs = h * 0.5;
        if (fs > 4) {
          c.font = '600 ' + fs.toFixed(1) + 'px "Saira Semi Condensed", "Arial Narrow", sans-serif';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = rgba(mixc(col, [255, 255, 255], 0.5), a);
          c.fillText(sg.word, lx + w / 2, ty + h * 0.53, w * 0.8);
        }
        glowEllipse(gctx, lx + w / 2, ty + h / 2, w * 1.1, h * 1.4, col, 0.75 * a);
        // its reflection on the wet road
        var ry = py(0, 0, z), rry = py(0, -(y0 + y1) / 2, z);
        glowEllipse(gctx, lx + w / 2, (ry + rry) / 2 + (rry - ry) * 0.2, w * 0.45, Math.max(3, (rry - ry) * 0.9), col, 0.35 * a);
      }
    }

    function collectLamps() {
      var spacing = 32;
      for (var side = -1; side <= 1; side += 2) {
        var off = side < 0 ? 0 : 16;
        var k0 = Math.ceil((travel - 6 - off) / spacing);
        for (var k = k0; k < k0 + 11; k++) {
          var z = k * spacing + off - travel;
          if (z < -6) continue;
          var id = k * 2 + (side > 0 ? 1 : 0);
          var broken = hash(id * 1.7) < 0.06;
          var lvl = 1;
          if (broken) { var fl = hash(id + Math.floor(clock * 9)); lvl = fl < 0.35 ? 0.15 : fl < 0.5 ? 0.6 : 1; }
          lampsNow.push({ side: side, z: z, x: side * 4.0, y: 7.6, lvl: lvl, id: id });
        }
      }
      lampsNow.sort(function (a, b) { return b.z - a.z; });
    }

    function drawLamps(c) {
      var col = P.lamp, amt = P.lampAmt;
      for (var i = 0; i < lampsNow.length; i++) {
        var L = lampsNow[i];
        if (L.z < 1.4 || L.z > 300) continue;
        var z = L.z;
        var f = fogAt(z);
        var poleX = L.side * 5.3;
        // pole and arm
        var lw = Math.max(0.7, 0.16 * focal / z);
        c.strokeStyle = rgba(mixc([5, 6, 9], P.skyLow, f * 0.55));
        c.lineWidth = lw;
        c.beginPath();
        proj(poleX, 0, z); c.moveTo(_p.x, _p.y);
        proj(poleX, L.y + 0.3, z); c.lineTo(_p.x, _p.y);
        proj(L.x, L.y + 0.1, z); c.lineTo(_p.x, _p.y);
        c.stroke();
        // head
        proj(L.x, L.y, z);
        var hx = _p.x, hy = _p.y;
        var r = Math.max(1, 0.32 * focal / z);
        var a = amt * L.lvl;
        c.fillStyle = rgba(mixc(col, [255, 255, 255], 0.55), clamp(a, 0, 1));
        c.beginPath(); c.ellipse(hx, hy, r * 1.4, r * 0.55, 0, 0, TAU); c.fill();
        // bloom
        var gr = Math.min(W * 0.06, Math.max(4, 1.7 * focal / z));
        glowDot(hx, hy, gr, col, 0.55 * a * (1 - f * 0.5));
        glowDot(hx, hy, gr * 0.3, mixc(col, [255, 255, 255], 0.5), 0.7 * a);
        // a pool of light on the road beneath
        var ry = py(0, 0, z);
        var pxp = px(L.side * 3.2, 0, z);
        var poolW = Math.max(3, 6.5 * focal / z), poolH = Math.max(1.5, Math.abs(py(0, 0, Math.max(1.2, z - 5)) - py(0, 0, z + 7)) * 0.5);
        c.globalCompositeOperation = 'lighter';
        glowEllipse(c, pxp, ry, poolW, poolH, col, 0.16 * a * (1 - f));
        // the wet-road reflection: a long streak below the lamp
        var refY = py(L.x, -L.y, z);
        var streakH = Math.max(3, (refY - ry) * 0.75);
        glowEllipse(c, hx, ry + (refY - ry) * 0.55, Math.max(1.5, r * 1.6), streakH, col, 0.22 * a * (1 - f * 0.6));
        c.globalCompositeOperation = 'source-over';
        glowEllipse(gctx, hx, ry + (refY - ry) * 0.5, Math.max(2, r * 3), streakH * 1.1, col, 0.4 * a * (1 - f * 0.6));
        // anamorphic flare for the near ones
        if (z < 40) {
          var fa = (1 - z / 40) * 0.25 * a;
          glowEllipse(gctx, hx, hy, W * 0.18 * (1 - z / 60), Math.max(1.5, r * 0.6), col, fa);
        }
      }
    }

    function drawStreetFurniture(c) {
      // 2020: flat yellow road signs, retro-reflective in our headlights
      var wY = weights[4];
      if (wY > 0.01) {
        var sp = 34;
        var k0 = Math.ceil((travel + 2 - 20) / sp);
        for (var k = k0 + 7; k >= k0; k--) {
          var z = k * sp + 20 - travel;
          if (z < 7 || z > 260) continue;
          var side = hash(k * 3.1) < 0.6 ? -1 : 1;
          var x = side * 4.6;
          var f = fogAt(z);
          var lit = clamp(1 - z / (fullBeam ? 160 : 70), 0.25, 1);
          proj(x, 0, z); var bx = _p.x, by = _p.y;
          proj(x, 2.2, z); var tx = _p.x, ty = _p.y;
          c.strokeStyle = rgba([30, 28, 20], wY);
          c.lineWidth = Math.max(0.6, 0.08 * focal / z);
          c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
          var s = 0.95 * focal / z;
          var yel = mulc([255, 212, 0], 0.55 + 0.45 * lit);
          c.save();
          c.translate(tx, ty - s * 0.9);
          if (hash(k * 7.7) < 0.5) c.rotate(Math.PI / 4);
          c.fillStyle = rgba(yel, wY * (1 - f * 0.5));
          c.fillRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
          c.strokeStyle = rgba([10, 10, 10], wY);
          c.lineWidth = Math.max(0.6, s * 0.12);
          c.strokeRect(-s * 0.55, -s * 0.55, s * 1.1, s * 1.1);
          c.fillStyle = rgba([10, 10, 10], wY);
          c.beginPath(); c.moveTo(-s * 0.1, -s * 0.35); c.lineTo(s * 0.1, -s * 0.35); c.lineTo(s * 0.06, s * 0.15); c.lineTo(-s * 0.06, s * 0.15); c.closePath(); c.fill();
          c.fillRect(-s * 0.08, s * 0.24, s * 0.16, s * 0.14);
          c.restore();
          glowDot(tx, ty - s * 0.9, s * 3.2, [255, 212, 0], 0.7 * wY * lit);
        }
      }
      // 2022: strings of small warm bulbs across the street
      var wS = weights[5];
      if (wS > 0.01) {
        var sp2 = 52;
        var j0 = Math.ceil((travel + 2 - 30) / sp2);
        for (var j = j0 + 5; j >= j0; j--) {
          var zz = j * sp2 + 30 - travel;
          if (zz < 3 || zz > 280) continue;
          var ff = fogAt(zz);
          c.strokeStyle = rgba([20, 18, 16], 0.8 * wS);
          c.lineWidth = Math.max(0.5, 0.03 * focal / zz);
          c.beginPath();
          for (var q = 0; q <= 24; q++) {
            var u = q / 24, xw = lerp(-8, 8, u), yw = 6.6 - Math.sin(u * Math.PI) * 1.3;
            proj(xw, yw, zz);
            if (q) c.lineTo(_p.x, _p.y); else c.moveTo(_p.x, _p.y);
          }
          c.stroke();
          var br = Math.max(0.8, 0.09 * focal / zz);
          for (var q2 = 1; q2 < 24; q2++) {
            var u2 = q2 / 24, xw2 = lerp(-8, 8, u2), yw2 = 6.6 - Math.sin(u2 * Math.PI) * 1.3 - 0.12;
            proj(xw2, yw2, zz);
            var tw = 0.75 + 0.25 * Math.sin(clock * 1.3 + q2 * 2.1 + j);
            c.fillStyle = rgba([255, 236, 200], wS * tw);
            c.beginPath(); c.arc(_p.x, _p.y, br, 0, TAU); c.fill();
            glowDot(_p.x, _p.y, br * 6, [255, 226, 180], 0.4 * wS * tw * (1 - ff));
          }
        }
      }
    }

    function drawCars(c) {
      // distant tail lights further up our lane
      for (var d = 0; d < 3; d++) {
        var zf = 70 + d * 45 + 10 * Math.sin(clock / (5 + d));
        tailPair(c, camX + 0.1 * d, zf, 0.6, false);
      }
      // oncoming
      for (var i = 0; i < oncoming.length; i++) {
        var o = oncoming[i];
        var z = o.z;
        var f = fogAt(z);
        // body
        if (z < 80) {
          c.fillStyle = rgba([4, 5, 8], 0.9 * (1 - f));
          c.beginPath();
          proj(o.x - 0.95, 0.25, z); var x0 = _p.x, y0 = _p.y;
          proj(o.x + 0.95, 1.45, z); var x1 = _p.x, y1 = _p.y;
          c.rect(x0, y1, x1 - x0, y0 - y1);
          c.fill();
        }
        for (var s = -1; s <= 1; s += 2) {
          proj(o.x + s * 0.72, 0.68, z);
          var hx = _p.x, hy = _p.y;
          var r = Math.max(1, 0.2 * focal / z);
          var a = 1 - f * 0.5;
          c.fillStyle = rgba([255, 255, 255], a);
          c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.fill();
          glowDot(hx, hy, Math.min(W * 0.045, Math.max(5, 1.6 * focal / z)) * (o.hi ? 1.5 : 1), P.head, 0.55 * a);
          var ry = py(0, 0, z), refY = py(0, -0.68, z);
          var rh = Math.min(dashTop - ry, Math.max(6, (refY - ry) * 3.2));
          glowEllipse(gctx, hx, ry + rh * 0.55, Math.max(2, r * 1.8), rh, P.head, 0.35 * a);
          c.globalCompositeOperation = 'lighter';
          glowEllipse(c, hx, ry + rh * 0.5, Math.max(1.5, r * 1.1), rh * 0.9, P.head, 0.2 * a);
          c.globalCompositeOperation = 'source-over';
        }
        // anamorphic streak
        if (z < 120) {
          var sa = (1 - z / 120);
          var cx = px(o.x, 0.68, z), cy = py(o.x, 0.68, z);
          glowEllipse(gctx, cx, cy, W * 0.45 * sa, Math.max(1.5, 0.08 * focal / z + 1), mixc(P.head, [150, 190, 255], 0.35), 0.5 * sa);
        }
      }
      // the car ahead
      var z2 = ahead.z, x = camX + 0.05;
      var fa = fogAt(z2);
      var body = mixc([6, 7, 10], P.skyLow, fa * 0.6);
      proj(x - 0.9, 0.28, z2); var bx0 = _p.x, by0 = _p.y;
      proj(x + 0.9, 1.0, z2); var bx1 = _p.x, by1 = _p.y;
      proj(x - 0.68, 1.45, z2); var cx0 = _p.x, cy1 = _p.y;
      proj(x + 0.68, 1.0, z2); var cx1 = _p.x;
      c.fillStyle = rgba(body);
      c.beginPath();
      c.moveTo(bx0, by0); c.lineTo(bx0, by1); c.lineTo(cx0, cy1); c.lineTo(cx1, cy1); c.lineTo(bx1, by1); c.lineTo(bx1, by0); c.closePath();
      c.fill();
      // rear window catches the lamps
      c.fillStyle = rgba(mixc(P.lamp, body, 0.82), 0.6);
      var inset = (cx1 - cx0) * 0.06;
      c.beginPath(); c.moveTo(cx0 + inset * 2, cy1 + 1); c.lineTo(cx1 - inset * 2, cy1 + 1); c.lineTo(bx1 - inset, by1 - 1); c.lineTo(bx0 + inset, by1 - 1); c.closePath(); c.fill();
      tailPair(c, x, z2, 1 + ahead.brake * 0.8, true);
      // hazard lights (2020)
      var wY = weights[4];
      if (wY > 0.01) {
        var hz = ((clock % 0.9) < 0.45 ? 1 : 0.05) * wY;
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          proj(x + s2 * 0.86, 0.72, z2);
          var rr = Math.max(1.5, 0.12 * focal / z2);
          c.fillStyle = rgba([255, 200, 0], hz);
          c.fillRect(_p.x - rr, _p.y - rr * 0.6, rr * 2, rr * 1.2);
          glowDot(_p.x, _p.y, rr * 7, [255, 196, 0], 0.75 * hz);
          var ryy = py(0, 0, z2);
          glowEllipse(gctx, _p.x, ryy + (ryy - _p.y) * 1.2, rr * 2.5, Math.max(5, (ryy - _p.y) * 3), [255, 196, 0], 0.5 * hz);
        }
      }
    }

    function tailPair(c, x, z, k, near) {
      var f = fogAt(z);
      for (var s = -1; s <= 1; s += 2) {
        proj(x + s * 0.68, 0.86, z);
        var tx = _p.x, ty = _p.y;
        var r = Math.max(0.8, 0.13 * focal / z);
        var a = (1 - f * 0.6);
        c.fillStyle = rgba(mixc(P.tail, [255, 255, 255], 0.25 * k - 0.1), a);
        c.fillRect(tx - r * 1.4, ty - r * 0.55, r * 2.8, r * 1.1);
        glowDot(tx, ty, Math.max(4, 1.6 * focal / z) * k, P.tail, 0.8 * a * Math.min(1, k));
        var ry = py(0, 0, z), refY = py(0, -0.86, z);
        var sh = Math.max(4, (refY - ry) * (near ? 5 : 3));
        glowEllipse(gctx, tx, ry + sh * 0.45, Math.max(2, r * 2.2), sh, P.tail, 0.45 * a * Math.min(1.3, k));
        if (near) {
          c.globalCompositeOperation = 'lighter';
          glowEllipse(c, tx, ry + sh * 0.4, Math.max(1.5, r * 1.3), sh * 0.9, P.tail, 0.28 * a * Math.min(1.3, k));
          c.globalCompositeOperation = 'source-over';
        }
      }
    }

    function drawAir(c) {
      // rain streaks and snowflakes between us and the street, lit by lamps and our headlights
      var v = 15 * speedNow;
      var snowAmt = P.snow;
      var buckets = [[], [], [], []];
      var flakesB = [[], [], []];
      var lampCol = P.lamp;
      var reach = fullBeam ? 60 : 24;
      for (var i = 0; i < rain.length; i++) {
        var p = rain[i];
        if (p.z < 0.8) continue;
        // illumination
        var lum = 0.12;
        for (var l = 0; l < lampsNow.length; l++) {
          var L = lampsNow[l];
          var dz = p.z - L.z;
          if (dz > 14 || dz < -14) continue;
          var dx = p.x - L.x, dy = p.y - L.y;
          lum += 3.2 * L.lvl / (1 + (dx * dx + dy * dy * 0.5 + dz * dz) / 10);
        }
        var hdx = p.x - camX;
        if (p.z < reach && Math.abs(hdx) < p.z * 0.5 + 0.8 && p.y < 3.5) lum += (1 - p.z / reach) * (fullBeam ? 1.6 : 1.1);
        var b = lum > 1.1 ? 3 : lum > 0.55 ? 2 : lum > 0.28 ? 1 : 0;
        if (p.s < snowAmt) {
          proj(p.x, p.y, p.z);
          if (_p.y > dashTop || _p.y < roofY) continue;
          if (p.z < 2.2) continue;
          var r = clamp(0.03 * focal / p.z, 0.5, 3.2);
          flakesB[b > 2 ? 2 : b > 0 ? 1 : 0].push(_p.x, _p.y, r);
        } else {
          proj(p.x, p.y, p.z); var x0 = _p.x, y0 = _p.y;
          // exposure: where it was a moment ago
          var ex = 0.028;
          proj(p.x, p.y + 9.5 * ex, p.z + v * ex);
          if (y0 < roofY || _p.y > dashTop) continue;
          buckets[b].push(_p.x, _p.y, x0, y0);
        }
      }
      var styles = [
        [rgba(mixc([120, 140, 170], P.skyLow, 0.4), 0.18), 0.8],
        [rgba(mixc([170, 185, 210], lampCol, 0.3), 0.3), 0.9],
        [rgba(mixc([220, 220, 230], lampCol, 0.5), 0.5), 1.1],
        [rgba(mixc([255, 255, 255], lampCol, 0.4), 0.75), 1.3]
      ];
      c.lineCap = 'round';
      for (var k = 0; k < 4; k++) {
        var bk = buckets[k];
        if (!bk.length) continue;
        c.strokeStyle = styles[k][0];
        c.lineWidth = styles[k][1];
        c.beginPath();
        for (var j = 0; j < bk.length; j += 4) { c.moveTo(bk[j], bk[j + 1]); c.lineTo(bk[j + 2], bk[j + 3]); }
        c.stroke();
      }
      var fa = [0.35, 0.6, 0.95];
      for (var m = 0; m < 3; m++) {
        var fb = flakesB[m];
        if (!fb.length) continue;
        c.fillStyle = rgba(mixc([235, 235, 240], lampCol, 0.25 * m), fa[m]);
        c.beginPath();
        for (var n = 0; n < fb.length; n += 3) { c.moveTo(fb[n] + fb[n + 2], fb[n + 1]); c.arc(fb[n], fb[n + 1], fb[n + 2], 0, TAU); }
        c.fill();
      }
    }

    function drawHaze(c) {
      var a = P.hazeAmt;
      if (a < 0.01) return;
      var top = horizon - (horizon - roofY) * 0.45, bot = horizon + (dashTop - horizon) * 0.55;
      var g = c.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, rgba(P.haze, 0));
      g.addColorStop(0.45, rgba(P.haze, 0.26 * a));
      g.addColorStop(0.6, rgba(P.haze, 0.2 * a));
      g.addColorStop(1, rgba(P.haze, 0));
      c.globalCompositeOperation = 'screen';
      c.fillStyle = g; c.fillRect(0, top, W, bot - top);
      c.globalCompositeOperation = 'source-over';
    }

    function drawGlass(c) {
      // glare arcs: fine scratches the wipers have left, catching bright lights
      var g = wiperGeom();
      c.globalCompositeOperation = 'lighter';
      for (var i = 0; i < oncoming.length; i++) {
        var o = oncoming[i];
        if (o.z > 45) continue;
        var s = 1 - o.z / 45;
        var lx = px(o.x, 0.68, o.z), ly = py(o.x, 0.68, o.z);
        glareArcs(c, g, lx, ly, P.head, 0.35 * s);
        glowEllipse(c, lx, ly, W * 0.2 * s + 10, (dashTop - roofY) * 0.25 * s + 6, P.head, 0.05 * s);
      }
      for (var j = 0; j < lampsNow.length; j++) {
        var L = lampsNow[j];
        if (L.z < 2 || L.z > 26) continue;
        var t = 1 - L.z / 26;
        glareArcs(c, g, px(L.x, L.y, L.z), py(L.x, L.y, L.z), P.lamp, 0.16 * t * L.lvl);
      }
      c.globalCompositeOperation = 'source-over';

      // drops: a mask of every drop, filled with the light behind it
      dctx.setTransform(1, 0, 0, 1, 0, 0);
      dctx.globalCompositeOperation = 'source-over';
      dctx.clearRect(0, 0, dropC.width, dropC.height);
      var sx = dropC.width / W, sy = dropC.height / dashTop;
      for (var d = 0; d < drops.length; d++) {
        var dr = drops[d];
        var rr = dr.r * (dr.vy ? 1.0 : 1);
        dctx.globalAlpha = dr.a;
        dctx.drawImage(dropMask, (dr.x - rr) * sx, (dr.y - rr * 1.05) * sy, rr * 2 * sx, rr * 2.1 * sy);
      }
      dctx.globalAlpha = 1;
      dctx.globalCompositeOperation = 'source-in';
      // the lens flips and magnifies what is behind; a softened, shifted sample reads right at this size
      dctx.drawImage(glow, 0, 0, glow.width, glow.height * (dashTop / H), 0, -dropC.height * 0.04, dropC.width, dropC.height * 1.08);
      dctx.globalCompositeOperation = 'source-atop';
      dctx.fillStyle = rgba(mixc(P.skyMid, [200, 210, 225], 0.35), 0.16);
      dctx.fillRect(0, 0, dropC.width, dropC.height);
      // darken under the drops first, then add their light
      c.globalAlpha = 1;
      for (var e = 0; e < drops.length; e++) {
        var de = drops[e];
        c.globalAlpha = de.a;
        c.drawImage(dropShade, de.x - de.r, de.y - de.r * 1.05, de.r * 2, de.r * 2.1);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter';
      c.drawImage(dropC, 0, 0, W, dashTop);
      c.globalAlpha = 0.6;
      c.drawImage(dropC, 0, 0, W, dashTop);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      // snowflakes on the glass
      for (var f = 0; f < flakes.length; f++) {
        var fl = flakes[f];
        var life = 1 - fl.life / fl.max;
        c.globalAlpha = clamp(life * 1.4, 0, 0.9);
        var sz = fl.r * (0.6 + life * 0.6);
        c.drawImage(flakeSprite, fl.x - sz, fl.y - sz, sz * 2, sz * 2);
      }
      c.globalAlpha = 1;

      // wipers
      var u = wiper.ang;
      for (var p = 0; p < 2; p++) {
        var ang = angOf(g, u);
        var ca = Math.cos(ang), sa = -Math.sin(ang);
        var x0 = g.piv[p], y0 = g.y;
        var bx0 = x0 + ca * g.L * 0.14, by0 = y0 + sa * g.L * 0.14;
        var bx1 = x0 + ca * g.L, by1 = y0 + sa * g.L;
        c.strokeStyle = 'rgba(3,4,6,0.96)';
        c.lineCap = 'round';
        c.lineWidth = Math.max(2.5, W * 0.0028);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + ca * g.L * 0.55 + sa * 3, y0 + sa * g.L * 0.55 - ca * 3); c.stroke();
        c.lineWidth = Math.max(3.5, W * 0.004);
        c.beginPath(); c.moveTo(bx0, by0); c.lineTo(bx1, by1); c.stroke();
        c.strokeStyle = rgba(mixc(P.lamp, [255, 255, 255], 0.5), 0.12);
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(bx0 - sa, by0 + ca); c.lineTo(bx1 - sa, by1 + ca); c.stroke();
      }

      // condensation, lit by whatever shines through it
      flctx.globalCompositeOperation = 'source-over';
      flctx.clearRect(0, 0, fogLit.width, fogLit.height);
      flctx.drawImage(fogC, 0, 0);
      flctx.globalCompositeOperation = 'source-in';
      flctx.drawImage(glow, 0, 0, glow.width, glow.height * (dashTop / H), 0, 0, fogLit.width, fogLit.height);
      c.globalAlpha = 0.2;
      c.drawImage(fogC, 0, 0, W, dashTop);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.22;
      c.drawImage(fogLit, 0, 0, W, dashTop);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }

    function glareArcs(c, g, lx, ly, col, a) {
      if (a < 0.01) return;
      for (var p = 0; p < 2; p++) {
        var dx = lx - g.piv[p], dy = g.y - ly;
        var r = Math.sqrt(dx * dx + dy * dy);
        if (r > g.L || r < g.L * 0.2) continue;
        var ang = Math.atan2(dy, dx);
        for (var k = -2; k <= 2; k++) {
          var rr = r + k * 2.2;
          c.strokeStyle = rgba(col, a * (1 - Math.abs(k) * 0.3));
          c.lineWidth = 0.8;
          c.beginPath(); c.arc(g.piv[p], g.y, rr, -ang - 0.07, -ang + 0.07); c.stroke();
        }
      }
    }

    function drawInterior(c) {
      var wash = 0;
      var sweeps = [];
      for (var i = 0; i < lampsNow.length; i++) {
        var L = lampsNow[i];
        if (L.z < 16 && L.z > -6) {
          var t = (16 - L.z) / 22; // 0 when ahead, 1 when behind us
          sweeps.push({ t: t, lvl: L.lvl, side: L.side });
          wash += Math.max(0, 1 - Math.abs(L.z - 2) / 10) * L.lvl;
        }
      }
      wash = clamp(wash, 0, 1);
      var dashCol = P.dash;

      // roof lining
      c.fillStyle = '#020305';
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, roofY + H * 0.02);
      c.quadraticCurveTo(W * 0.5, roofY - H * 0.012, 0, roofY + H * 0.02);
      c.closePath(); c.fill();
      // a light sweeping across the roof as each lamp passes overhead
      for (var s = 0; s < sweeps.length; s++) {
        var sw = sweeps[s];
        if (sw.t < 0.3 || sw.t > 0.85) continue;
        var a = Math.sin((sw.t - 0.3) / 0.55 * Math.PI) * 0.12 * sw.lvl;
        c.fillStyle = rgba(dashCol, a);
        c.fillRect(0, 0, W, roofY + H * 0.02);
      }
      // A-pillars
      var pw = narrow ? W * 0.05 : W * 0.075;
      c.fillStyle = '#030406';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(pw * 1.3, 0); c.lineTo(pw * 0.25, dashTop + 10); c.lineTo(0, dashTop + 10); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(W, 0); c.lineTo(W - pw * 1.3, 0); c.lineTo(W - pw * 0.25, dashTop + 10); c.lineTo(W, dashTop + 10); c.closePath(); c.fill();
      c.strokeStyle = rgba(dashCol, 0.05 + wash * 0.12);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(pw * 1.3, 0); c.lineTo(pw * 0.25, dashTop + 10); c.stroke();
      c.beginPath(); c.moveTo(W - pw * 1.3, 0); c.lineTo(W - pw * 0.25, dashTop + 10); c.stroke();
      // indicator glints on the pillar
      if (indOn) {
        c.globalCompositeOperation = 'lighter';
        glowEllipse(c, pw * 0.5, dashTop - 10, pw * 2, H * 0.1, [255, 160, 30], 0.18);
        c.globalCompositeOperation = 'source-over';
      }

      // rear-view mirror
      var mx = narrow ? W * 0.5 : W * 0.43, mw = narrow ? W * 0.3 : W * 0.15, mh = Math.max(22, H * 0.06), my = roofY + H * 0.008;
      c.fillStyle = '#050608';
      c.fillRect(mx - 3, 0, 6, my + 4);
      roundRect(c, mx - mw / 2, my, mw, mh, mh * 0.35); c.fill();
      c.save();
      roundRect(c, mx - mw / 2 + 3, my + 3, mw - 6, mh - 6, mh * 0.28); c.clip();
      var mg = c.createLinearGradient(0, my, 0, my + mh);
      mg.addColorStop(0, rgba(mulc(P.skyMid, 0.9)));
      mg.addColorStop(0.55, rgba(mulc(P.skyLow, 0.5)));
      mg.addColorStop(1, rgba(mulc(P.road, 1.2)));
      c.fillStyle = mg; c.fillRect(mx - mw / 2, my, mw, mh);
      // a car behind us, far back
      var bh = 0.5 + 0.5 * Math.sin(clock / 6);
      c.globalCompositeOperation = 'lighter';
      glowEllipse(c, mx - mw * 0.05, my + mh * 0.62, mh * 0.35, mh * 0.2, P.head, 0.45 * bh);
      glowEllipse(c, mx + mw * 0.08, my + mh * 0.62, mh * 0.35, mh * 0.2, P.head, 0.45 * bh);
      c.globalCompositeOperation = 'source-over';
      c.restore();

      // the dashboard
      var dg = c.createLinearGradient(0, dashTop - 10, 0, H);
      dg.addColorStop(0, '#0b0d12');
      dg.addColorStop(0.08, '#06070a');
      dg.addColorStop(1, '#020203');
      c.fillStyle = dg;
      dashPath(c);
      c.fill();
      // the radio display reflected in the glass, just above the dash
      if (consoleEl) {
        var cx = narrow ? W * 0.5 : parseFloat(consoleEl.style.left) || W * 0.4;
        c.globalCompositeOperation = 'lighter';
        glowEllipse(c, cx, dashTop - H * 0.035, Math.min(260, W * 0.2), H * 0.035, P.ink, 0.06);
        c.globalCompositeOperation = 'source-over';
      }
      // the lip of the dash, catching the light
      c.strokeStyle = rgba(mixc([60, 64, 74], dashCol, 0.4 + wash * 0.4), 0.35 + wash * 0.5);
      c.lineWidth = 1.4;
      c.beginPath(); dashEdge(c); c.stroke();
      // lamp light sliding down the dash
      c.save();
      dashPath(c); c.clip();
      c.globalCompositeOperation = 'lighter';
      for (var q = 0; q < sweeps.length; q++) {
        var sq = sweeps[q];
        var yy = dashTop + (sq.t - 0.2) * (H - dashTop) * 1.5;
        var amp = Math.sin(clamp(sq.t, 0, 1) * Math.PI) * 0.24 * sq.lvl;
        if (amp <= 0.005) continue;
        var bandH = (H - dashTop) * 0.35;
        var lg = c.createLinearGradient(0, yy - bandH, 0, yy + bandH);
        lg.addColorStop(0, rgba(dashCol, 0));
        lg.addColorStop(0.5, rgba(dashCol, amp));
        lg.addColorStop(1, rgba(dashCol, 0));
        c.fillStyle = lg;
        c.setTransform(dpr, 0, sq.side * 0.25 * dpr, dpr, 0, 0);
        c.fillRect(-W * 0.5, yy - bandH, W * 2, bandH * 2);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      c.globalCompositeOperation = 'source-over';
      c.restore();

      // steering wheel and instruments (right-hand drive)
      if (!narrow) drawWheel(c, wash);

      // vignette
      var vg = c.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }

    function dashEdge(c) {
      var lift = narrow ? H * 0.012 : H * 0.03;
      c.moveTo(-2, dashTop + lift);
      c.bezierCurveTo(W * 0.25, dashTop - lift * 0.2, W * 0.6, dashTop - lift * 0.35, W + 2, dashTop + lift * 0.6);
    }
    function dashPath(c) {
      c.beginPath();
      dashEdge(c);
      c.lineTo(W + 2, H + 2); c.lineTo(-2, H + 2); c.closePath();
    }
    function roundRect(c, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    }

    function drawWheel(c, wash) {
      var cx = W * 0.8, R = Math.min(W * 0.19, H * 0.36), cy = H + R * 0.32;
      // instrument binnacle
      var by = dashTop + (H - dashTop) * 0.16;
      c.fillStyle = '#040506';
      c.beginPath(); c.ellipse(cx, by + R * 0.3, R * 0.85, R * 0.42, 0, Math.PI, TAU); c.fill();
      var ink = P.ink;
      for (var gI = -1; gI <= 1; gI += 2) {
        var gx = cx + gI * R * 0.36, gy = by + R * 0.34, gr = R * 0.24;
        c.strokeStyle = rgba(ink, 0.35);
        c.lineWidth = 1;
        for (var t = 0; t <= 20; t++) {
          var a = Math.PI * (0.8 + t / 20 * 1.4);
          var r0 = gr * (t % 5 === 0 ? 0.78 : 0.86);
          c.beginPath(); c.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); c.lineTo(gx + Math.cos(a) * gr * 0.95, gy + Math.sin(a) * gr * 0.95); c.stroke();
        }
        var val = gI < 0 ? clamp(speedNow / 1.6, 0, 1) * 0.75 + Math.sin(clock * 3) * 0.003 : 0.32 + speedNow * 0.18 + Math.sin(clock * 11) * 0.006;
        var na = Math.PI * (0.8 + val * 1.4);
        c.strokeStyle = rgba(mixc(ink, [255, 60, 40], 0.4), 0.9);
        c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8); c.stroke();
        c.globalCompositeOperation = 'lighter';
        glowEllipse(c, gx, gy, gr * 1.1, gr * 0.9, ink, 0.07);
        c.globalCompositeOperation = 'source-over';
      }
      // tell-tales
      var tt = by + R * 0.12;
      if (fullBeam) { c.fillStyle = 'rgba(70,140,255,0.95)'; c.fillRect(cx - 6, tt, 12, 4); }
      if (indOn) { c.fillStyle = 'rgba(60,255,120,0.95)'; c.beginPath(); c.moveTo(cx - R * 0.2, tt + 2); c.lineTo(cx - R * 0.2 + 8, tt - 3); c.lineTo(cx - R * 0.2 + 8, tt + 7); c.closePath(); c.fill(); }
      // the wheel itself
      c.lineCap = 'round';
      c.strokeStyle = '#08090c';
      c.lineWidth = R * 0.13;
      c.beginPath(); c.arc(cx, cy, R, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.strokeStyle = rgba(mixc([90, 96, 110], P.dash, 0.5), 0.18 + wash * 0.35);
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(cx, cy, R + R * 0.055, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
      c.strokeStyle = '#07080a';
      c.lineWidth = R * 0.11;
      c.beginPath(); c.moveTo(cx - R * 0.95, cy - R * 0.12); c.lineTo(cx - R * 0.25, cy - R * 0.05); c.stroke();
      c.beginPath(); c.moveTo(cx + R * 0.95, cy - R * 0.12); c.lineTo(cx + R * 0.25, cy - R * 0.05); c.stroke();
    }

    var grainI = 0;
    function drawGrain(c) {
      var a = P.grain;
      if (a < 0.01) return;
      var still = isReduced();
      if (!still) grainI = (grainI + 1) % 3;
      var g = grains[grainI];
      var ox = still ? 0 : Math.floor(Math.random() * 192), oy = still ? 0 : Math.floor(Math.random() * 192);
      c.globalCompositeOperation = 'overlay';
      c.globalAlpha = clamp(a * 1.1, 0, 0.3);
      var pat = c.createPattern(g, 'repeat');
      c.save(); c.translate(-ox, -oy);
      c.fillStyle = pat; c.fillRect(ox, oy, W, H);
      c.restore();
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }

    function applyFilter() {
      var f = 'grayscale(' + P.gray.toFixed(3) + ') sepia(' + P.sepia.toFixed(3) + ') contrast(' + P.contrast.toFixed(3) +
        ') saturate(' + P.sat.toFixed(3) + ') brightness(' + P.bright.toFixed(3) + ')';
      if (f !== lastFilter) { cv.style.filter = f; lastFilter = f; }
      var ink = P.ink;
      var inkStr = 'rgb(' + (ink[0] | 0) + ',' + (ink[1] | 0) + ',' + (ink[2] | 0) + ')';
      if (inkStr !== lastInk) { root.style.setProperty('--nd-ink', inkStr); lastInk = inkStr; }
    }
    var lastInk = '';

    /* ---------- loop ---------- */
    function frame(t) {
      raf = 0;
      if (disposed) return;
      var raw = lastT ? (t - lastT) / 1000 : 0.016;
      var dt = Math.min(0.05, raw);
      lastT = t;
      // a slow device gets a lighter frame: fewer particles, fewer pixels
      if (raw < 0.5) { perf.sum += raw; perf.n++; }
      if (perf.n >= 120) {
        if (perf.sum / perf.n > 0.03 && perf.level < 2) {
          perf.level++;
          quality = perf.level === 1 ? 0.8 : 0.62;
          rain.length = Math.floor(rain.length * 0.7);
          layout();
        }
        perf.sum = 0; perf.n = 0;
      }
      var still = isReduced();
      if (still) {
        // hold the street still; only what the visitor does moves
        stepReduced(dt);
      } else {
        step(dt, false);
      }
      draw();
      audioFrame();
      if (still) {
        settle -= dt;
        if (settle <= 0 && !wiper.active && !mouseWipe && freqTarget == null && !indicator && !(heater && heatT < 1)) { running = false; return; }
      }
      raf = requestAnimationFrame(frame);
    }
    function stepReduced(dt) {
      if (freqTarget != null) {
        var d = freqTarget - freq;
        if (Math.abs(d) < 0.01) { freq = freqTarget; freqTarget = null; } else freq += d * (1 - Math.exp(-dt * 9));
        paintDial();
      }
      var sig = signalFor(freq);
      var tgt = [1, 0, 0, 0, 0, 0];
      if (touched && sig.st) { tgt[sig.st.grade] = sig.s; tgt[0] = 1 - sig.s; }
      var k = 1 - Math.exp(-dt / 0.3), sum = 0;
      for (var i = 0; i < 6; i++) { weights[i] += (tgt[i] - weights[i]) * k; sum += weights[i]; }
      for (var j = 0; j < 6; j++) weights[j] /= sum;
      blend(weights, P);
      speedNow = P.speed;
      shakeX = shakeY = bob = 0;
      if (wiper.active) stepWiper(dt);
      if (heater) {
        heatT = Math.min(1, heatT + dt / 2);
        fctx.save(); fctx.globalCompositeOperation = 'destination-out';
        fctx.globalAlpha = Math.min(1, dt * 3); fctx.fillStyle = '#000';
        fctx.beginPath(); fctx.ellipse(fogC.width / 2, fogC.height, heatT * fogC.width * 0.8, heatT * fogC.height * 0.95, 0, 0, TAU); fctx.fill();
        fctx.restore();
      }
      if (indicator) {
        indT += dt;
        var onNow = (indT % 0.76) < 0.4;
        if (onNow !== indOn) { indOn = onNow; swInd.btn.classList.toggle('nd-blink', indOn); if (audio && audio.enabled) audio.tone({ freq: indOn ? 2100 : 1500, type: 'square', dur: 0.016, gain: 0.03, attack: 0.001, release: 0.014 }); }
      }
    }
    function renderOnce() {
      if (!W || !gctx) return;
      if (!clock) { // give a still frame something to look at
        oncoming.length = 0; oncoming.push({ z: 46, x: 1.8, v: 14, hi: false });
        curveK = 0.00022;
      }
      step(0, true);
      draw();
    }
    function wake(sec) {
      settle = Math.max(settle, sec || 2);
      start();
    }
    function start() {
      if (disposed || running || !visible || !onScreen) return;
      running = true; lastT = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    var io = null, ro = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        if (onScreen) { start(); audioResume(); } else { stop(); audioPause(); }
      }, { threshold: 0 });
      io.observe(root);
    }
    on(document, 'visibilitychange', function () {
      visible = document.visibilityState !== 'hidden';
      if (visible) { start(); audioResume(); } else { stop(); audioPause(); }
    });
    if ('ResizeObserver' in window) {
      var rTimer = 0;
      ro = new ResizeObserver(function () {
        if (rTimer) cancelAnimationFrame(rTimer);
        rTimer = requestAnimationFrame(function () { rTimer = 0; if (!disposed) layout(); });
      });
      ro.observe(root);
      cleanups.push(function () { if (rTimer) cancelAnimationFrame(rTimer); });
    } else {
      on(window, 'resize', layout);
    }

    /* ---------- sound ---------- */
    var A = null;
    function noiseBuffer(ac, sec, brown) {
      var len = Math.floor(ac.sampleRate * sec), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
      return buf;
    }
    /* ---------- real songs on the radio ---------- */
    function hasPreview(st, t) {
      return !!(previews && t && previews[st.id] && previews[st.id][t.n] && !radioFailed[st.id + ':' + t.n]);
    }
    function radioNext(st, after) { // the next song on this album that has a preview
      var list = st.tracks.filter(function (t) { return hasPreview(st, t); });
      for (var i = 0; i < list.length; i++) if (list[i].n > after) return list[i];
      return list[0] || null;
    }
    function radioFirst(st) { // a station is found mid-broadcast: start on one of the singles
      var singles = st.tracks.filter(function (t) { return t.single && hasPreview(st, t); });
      return singles.length ? singles[Math.floor(Math.random() * singles.length)] : radioNext(st, 0);
    }
    function radioEnsureEl() {
      if (radioEl) return radioEl;
      radioEl = new Audio();
      radioEl.crossOrigin = 'anonymous';
      radioEl.preload = 'auto';
      radioEl.addEventListener('ended', function () {
        if (radioStation && radioTrack) radioPlay(radioStation, radioNext(radioStation, radioTrack.n));
      });
      radioEl.addEventListener('error', function () {
        if (!radioStation || !radioTrack) return;
        var st = radioStation, t = radioTrack, p = previews[st.id][t.n];
        var skip = function () { radioFailed[st.id + ':' + t.n] = true; if (radioStation === st && radioTrack === t) radioPlay(st, radioNext(st, t.n)); };
        if (p.retried || !window.fetch) { skip(); return; }
        p.retried = true; // preview links move now and then: ask Apple where this one lives today
        window.fetch('https://itunes.apple.com/lookup?id=' + p.id).then(function (r) { return r.json(); }).then(function (d) {
          var u = d && d.results && d.results[0] && d.results[0].previewUrl;
          if (!u) throw new Error('no preview');
          p.url = u;
          if (radioStation === st && radioTrack === t) radioPlay(st, t);
        }).catch(skip);
      });
      return radioEl;
    }
    function radioPlay(st, t) {
      radioStation = st;
      if (!t) { radioTrack = null; if (radioEl) radioEl.pause(); return; }
      radioTrack = t;
      radioEnsureEl().src = previews[st.id][t.n].url;
      radioResume();
    }
    function radioResume() {
      if (!radioEl || !radioTrack) return;
      radioWant = true;
      var pr = radioEl.play();
      if (pr && pr.catch) pr.catch(function () {});
      showTrack(radioStation, radioTrack);
      try { document.dispatchEvent(new CustomEvent('season:music', { detail: 'radio' })); } catch (e) {}
    }
    function radioHold() { radioWant = false; if (radioEl) radioEl.pause(); }
    function radioLive() { return !!(radioEl && radioTrack && !radioEl.paused && !radioEl.error); }
    function showTrack(st, t) { // the readout names the song that is actually playing
      if (rtStation !== st || !t) return;
      rtText = t.n + '  ' + t.title + '      ' + st.album.title + ' (' + st.album.year + ')      ';
      if (isReduced()) { rtTrack.textContent = t.n + '  ' + t.title; rt.classList.remove('nd-scroll'); }
      else { rtTrack.textContent = rtText + rtText; rt.classList.add('nd-scroll'); }
      rtOffset = 0; rtWidth = 0;
      if (listen) {
        listen.setAttribute('href', previews[st.id][t.n].link);
        listen.textContent = 'Preview from Apple Music';
        listen.setAttribute('aria-label', t.title + ' on Apple Music (opens in a new tab)');
      }
    }
    if (previews) {
      var onOtherMusic = function (e) { if (e.detail !== 'radio') { radioYield = true; radioHold(); } };
      document.addEventListener('season:music', onOtherMusic);
      cleanups.push(function () { document.removeEventListener('season:music', onOtherMusic); });
      // browsers that only start audio from a tap get another go whenever the visitor touches the car
      var nudge = function () { radioYield = false; if (radioWant && radioEl && radioEl.paused) { var pr = radioEl.play(); if (pr && pr.catch) pr.catch(function () {}); } };
      root.addEventListener('pointerup', nudge);
      root.addEventListener('keyup', nudge);
    }

    function buildAudio() {
      if (A || disposed || !audio || !audio.enabled) return;
      var ac, out;
      try { ac = audio.ctx; out = audio.out; } catch (e) { return; }
      if (!ac || !out) return;
      try {
        var nodes = [], srcs = [];
        var G = function (v) { var g = ac.createGain(); g.gain.value = v; nodes.push(g); return g; };
        var F = function (type, f, q) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; nodes.push(b); return b; };
        var loopSrc = function (buf) { var s = ac.createBufferSource(); s.buffer = buf; s.loop = true; srcs.push(s); nodes.push(s); return s; };
        var master = G(0);
        master.connect(out);
        var white = noiseBuffer(ac, 2.5, false), brown = noiseBuffer(ac, 3, true);

        // engine and tyres on wet tarmac
        var eng = loopSrc(brown), engF = F('lowpass', 140, 0.8), engG = G(0.11);
        eng.connect(engF).connect(engG).connect(master);
        var hum = ac.createOscillator(); hum.type = 'sine'; hum.frequency.value = 46; nodes.push(hum); srcs.push(hum);
        var humG = G(0.025); hum.connect(humG).connect(master);
        var tyre = loopSrc(white), tyreF = F('bandpass', 900, 0.5), tyreG = G(0.012);
        tyre.connect(tyreF).connect(tyreG).connect(master);

        // rain on the roof, fluttering
        var rainS = loopSrc(white), rainHP = F('highpass', 1200, 0.5), rainLP = F('lowpass', 7000, 0.4), rainG = G(0.03);
        rainS.connect(rainHP).connect(rainLP).connect(rainG).connect(master);
        var mod = loopSrc(white), modF = F('lowpass', 18, 0.5), modG = G(0.02);
        mod.connect(modF).connect(modG).connect(rainG.gain);

        // the radio: a small band-limited speaker
        var radio = G(0.9), rHP = F('highpass', 130, 0.7), rLP = F('lowpass', 5200, 0.6), rPk = F('peaking', 1800, 1);
        rPk.gain.value = 3;
        radio.connect(rHP).connect(rLP).connect(rPk).connect(master);
        var stat = loopSrc(white), statF = F('bandpass', 2600, 0.5), statG = G(0);
        stat.connect(statF).connect(statG).connect(radio);
        var music = G(0), dry = G(1), wet = G(0.3);
        var conv = ac.createConvolver(); nodes.push(conv);
        conv.buffer = (function () {
          var len = Math.floor(ac.sampleRate * 2.6), b = ac.createBuffer(2, len, ac.sampleRate);
          for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
          return b;
        })();
        music.connect(dry).connect(radio);
        music.connect(conv).connect(wet).connect(radio);
        // real songs come out of the same small speaker
        if (previews) {
          try {
            radioEnsureEl();
            if (!radioSrc) radioSrc = ac.createMediaElementSource(radioEl);
            var radioIn = G(0.62);
            radioSrc.connect(radioIn);
            radioIn.connect(music);
          } catch (e) { /* no real songs then; the synth sketches still play */ }
        }

        srcs.forEach(function (s) { try { s.start(); } catch (e) {} });
        master.gain.setTargetAtTime(onScreen && visible ? 1 : 0, ac.currentTime, 0.6);
        A = { ac: ac, master: master, nodes: nodes, srcs: srcs, engF: engF, engG: engG, hum: hum, tyreG: tyreG, rainG: rainG, modG: modG,
          statG: statG, music: music, wet: wet, next: 0, stepN: 0, song: null, timer: 0, paused: !(onScreen && visible) };
        A.timer = setInterval(schedule, 70);
      } catch (e) {
        teardownAudio();
      }
    }
    function teardownAudio() {
      if (!A) return;
      var a = A; A = null;
      clearInterval(a.timer);
      radioHold();
      if (radioSrc) { try { radioSrc.disconnect(); } catch (e) {} }
      try { a.master.gain.setTargetAtTime(0, a.ac.currentTime, 0.05); } catch (e) {}
      setTimeout(function () {
        a.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} });
        a.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
      }, 250);
    }
    function audioPause() { radioHold(); if (A) { A.paused = true; try { A.master.gain.setTargetAtTime(0, A.ac.currentTime, 0.15); } catch (e) {} } }
    function audioResume() { if (A && onScreen && visible) { A.paused = false; try { A.master.gain.setTargetAtTime(1, A.ac.currentTime, 0.4); } catch (e) {} } }
    function audioFrame() {
      if (!A) return;
      var t = A.ac.currentTime;
      var sig = signalFor(freq);
      var s = touched ? sig.s : 0;
      try {
        A.engF.frequency.setTargetAtTime(110 + speedNow * 60, t, 0.3);
        A.engG.gain.setTargetAtTime(0.08 + speedNow * 0.04, t, 0.3);
        A.hum.frequency.setTargetAtTime(38 + speedNow * 14, t, 0.4);
        A.tyreG.gain.setTargetAtTime(0.006 + speedNow * 0.008 * (0.4 + P.rain), t, 0.3);
        A.rainG.gain.setTargetAtTime(0.034 * P.rain, t, 0.4);
        A.modG.gain.setTargetAtTime(0.022 * P.rain, t, 0.4);
        A.statG.gain.setTargetAtTime(touched ? 0.05 * (1 - s) * (1 - s) : 0.012, t, 0.05);
        A.music.gain.setTargetAtTime(0.5 * s, t, 0.08);
      } catch (e) {}
    }
    function schedule() {
      if (!A || A.paused) return;
      var ac = A.ac, now = ac.currentTime;
      var sig = signalFor(freq);
      var id = touched && sig.s > 0.05 && sig.st ? sig.st.id : null;
      if (id !== A.song) {
        A.song = id; A.stepN = 0; A.next = now + 0.05;
        if (id) A.wet.gain.setTargetAtTime(SONGS[id].rev, now, 0.1);
      }
      // a real song, if there is one for this station: tune it in and let the synth stand down
      if (previews && radioSrc) {
        var st = id && sig.s > 0.5 ? sig.st : null;
        if (st && !radioYield) {
          if (radioStation !== st) radioPlay(st, radioFirst(st));
          else if (radioTrack && radioEl.paused && !radioWant) radioResume();
        } else if (radioEl && !radioEl.paused) {
          radioHold();
        }
        if (radioLive()) { A.wet.gain.setTargetAtTime(0.025, now, 0.2); return; }
      }
      if (!id) return;
      var song = SONGS[id];
      var stepDur = 60 / song.bpm / 2; // eighth notes
      if (A.next < now) A.next = now + 0.02;
      while (A.next < now + 0.25) {
        playStep(id, song, A.stepN, A.next, stepDur);
        A.next += stepDur;
        A.stepN++;
      }
    }
    function note(t, f, type, dur, gain, attack, release, detune) {
      if (!A) return;
      var ac = A.ac;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (detune) o.detune.setValueAtTime(detune, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.music);
      o.start(t); o.stop(t + dur + 0.05);
      o.onended = function () { try { g.disconnect(); o.disconnect(); } catch (e) {} };
    }
    function hit(t, dur, gain, type, f, q) {
      if (!A) return;
      var ac = A.ac, len = Math.max(1, Math.floor(ac.sampleRate * dur));
      var b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var s = ac.createBufferSource(); s.buffer = b;
      var fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
      var g = ac.createGain(); g.gain.value = gain;
      s.connect(fl).connect(g).connect(A.music);
      s.start(t);
      s.onended = function () { try { g.disconnect(); fl.disconnect(); s.disconnect(); } catch (e) {} };
    }
    function playStep(id, song, n, t, sd) {
      var bar = Math.floor(n / 8), beat = n % 8;
      var ch = song.chords[Math.floor(bar / 2) % song.chords.length];
      var root = ch[0];
      var tones = ch.slice(1);
      var r = Math.random;
      if (id === 'st') { // dark, sparse plucks over a held low chord
        if (n % 16 === 0) { note(t, mtof(root - 12), 'sine', sd * 16, 0.16, 0.05, sd * 6); tones.forEach(function (m, i) { note(t, mtof(m), 'sawtooth', sd * 16, 0.012, 0.6, sd * 8, i * 6 - 9); }); }
        if (beat % 2 === 0 || r() < 0.3) note(t, mtof(tones[(n * 3) % tones.length] + 12), 'triangle', sd * 0.9, 0.07, 0.003, sd * 0.8);
        if (beat === 2 || beat === 6) hit(t, 0.12, 0.08, 'bandpass', 1800, 1.2);
        if (beat === 0 || beat === 5) note(t, 110, 'sine', 0.25, 0.22, 0.002, 0.22);
      } else if (id === 'iliwys') { // swelling detuned pads, glassy bells
        if (n % 16 === 0) tones.forEach(function (m) { [-14, 0, 13].forEach(function (dt) { note(t, mtof(m), 'sawtooth', sd * 17, 0.009, sd * 3, sd * 8, dt); }); });
        if (n % 16 === 0) note(t, mtof(root - 12), 'sine', sd * 16, 0.14, 0.2, sd * 6);
        if (r() < 0.55) { var m2 = tones[Math.floor(r() * tones.length)] + 24; note(t, mtof(m2), 'sine', 1.4, 0.035, 0.004, 1.3); note(t, mtof(m2) * 3, 'sine', 0.5, 0.008, 0.003, 0.45); }
        if (beat === 4) hit(t, 0.25, 0.05, 'highpass', 4000);
      } else if (id === 'abiior') { // clean, quick arpeggios and a round sub
        var arp = tones.concat(tones.slice().reverse());
        note(t, mtof(arp[n % arp.length] + 12), 'square', sd * 0.45, 0.025, 0.002, sd * 0.35);
        note(t + sd / 2, mtof(arp[(n + 2) % arp.length] + 12), 'square', sd * 0.4, 0.018, 0.002, sd * 0.3);
        if (beat % 4 === 0) note(t, mtof(root - 12), 'sine', sd * 3.5, 0.18, 0.01, sd * 2);
        if (beat === 0 || beat === 4) note(t, 140, 'sine', 0.18, 0.25, 0.001, 0.16);
        if (beat === 2 || beat === 6) hit(t, 0.1, 0.06, 'bandpass', 3200, 2);
        if (r() < 0.06) note(t, 1760, 'sine', 0.12, 0.03, 0.002, 0.1);
      } else if (id === 'noacf') { // driving eighths, loud and urgent
        note(t, mtof(root - 12), 'sawtooth', sd * 0.9, 0.07, 0.003, sd * 0.4);
        note(t, mtof(root - 12) * 1.003, 'square', sd * 0.9, 0.03, 0.003, sd * 0.4);
        if (beat === 2 || beat === 6) tones.concat([root]).forEach(function (m, i) { note(t, mtof(m), 'sawtooth', sd * 1.6, 0.028, 0.004, sd, i * 9 - 9); });
        if (beat % 4 === 0) { note(t, 120, 'sine', 0.2, 0.3, 0.001, 0.18); }
        hit(t, 0.05, 0.05, 'highpass', 7000);
        if (beat === 2 || beat === 6) hit(t, 0.16, 0.12, 'bandpass', 1500, 0.8);
      } else if (id === 'bfiafl') { // slow, soft, piano-ish broken chords with a little wow
        if (beat % 2 === 0) {
          var m3 = tones[(n / 2) % tones.length | 0] + (r() < 0.3 ? 12 : 0);
          var wow = Math.sin(t * 0.7) * 7;
          note(t, mtof(m3), 'sine', 2.2, 0.06 * (0.7 + r() * 0.3), 0.008, 2.1, wow);
          note(t, mtof(m3) * 2, 'triangle', 0.8, 0.012, 0.005, 0.7, wow);
        }
        if (n % 16 === 0) { note(t, mtof(root - 12), 'sine', sd * 16, 0.12, 0.4, sd * 8); tones.forEach(function (m) { note(t, mtof(m), 'sine', sd * 16, 0.012, sd * 4, sd * 8, 4); }); }
      }
    }
    function stationSting(id) { /* a soft lock-on blip, so the visitor feels the station catch */
      if (audio && audio.enabled) audio.tone({ freq: 1320, type: 'sine', dur: 0.14, gain: 0.025, attack: 0.004, release: 0.12 });
    }
    function swish(stroke) {
      if (audio && audio.enabled) {
        audio.noise({ dur: stroke * 0.95, gain: 0.018, type: 'bandpass', freq: 1500, q: 0.9, attack: stroke * 0.4 });
        audio.noise({ dur: stroke * 0.95, gain: 0.018, type: 'bandpass', freq: 1500, q: 0.9, attack: stroke * 0.4, when: stroke });
      }
    }
    function thunk(k) {
      if (audio && audio.enabled) {
        audio.noise({ dur: 0.09, gain: 0.05 * k, type: 'lowpass', freq: 240 });
        audio.tone({ freq: 70, type: 'sine', dur: 0.09, gain: 0.06 * k, attack: 0.002, release: 0.08 });
      }
    }
    var unsubAudio = null;
    if (audio && typeof audio.onChange === 'function') {
      try {
        unsubAudio = audio.onChange(function (enabled) { if (enabled) buildAudio(); else teardownAudio(); });
      } catch (e) { unsubAudio = null; }
    }
    if (audio && audio.enabled) buildAudio();

    /* ---------- go ---------- */
    paintDial();
    setRt(null);
    layout();
    start();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (!disposed) layout(); }, function () {});
    }

    return {
      destroy: function () {
        if (disposed) return;
        disposed = true;
        stop();
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
        cleanups.length = 0;
        if (unsubAudio) { try { unsubAudio(); } catch (e) {} }
        teardownAudio();
        if (radioEl) { radioEl.pause(); radioEl.removeAttribute('src'); try { radioEl.load(); } catch (e) {} }
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  window.NightDrive = { mount: mount };
})();
