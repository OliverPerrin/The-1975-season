/* A Brief Inquiry into Online Relationships (2018).
   A white gallery wall with fifteen flat squares. Each square unfolds into a small, live
   piece of interface that behaves the way its title suggests. Windows drag, stack, resize
   and pile up; "Rehang the wall" folds them all back into their squares. */
(function () {
  'use strict';

  const ID = 'abiior';
  const INK = '#0a0a0a';
  const COLORS = [
    '#0a0a0a', '#ff4d1a', '#ffcc00', '#22a6b3', '#e62e2d',
    '#7cc7ff', '#ff7eb6', '#1f4fe0', '#9aa1a8', '#6e3fd1',
    '#18a558', '#ff9f1c', '#d6249f', '#ff6b5e', '#a8d12f',
  ];
  const SIZES = [52, 70, 64, 46, 76, 44, 66, 50, 58, 46, 72, 52, 48, 56, 44];
  const WIDE = {
    rows: [0.27, 0.5, 0.73],
    xs: [[0.12, 0.26, 0.41, 0.57, 0.75], [0.19, 0.35, 0.5, 0.66, 0.84], [0.11, 0.29, 0.45, 0.61, 0.78]],
  };
  const TALL = {
    rows: [0.18, 0.32, 0.46, 0.6, 0.74],
    xs: [[0.1, 0.42, 0.72], [0.18, 0.5, 0.78], [0.08, 0.38, 0.7], [0.16, 0.47, 0.76], [0.1, 0.42, 0.72]],
  };
  const PENT = [0, 2, 4, 7, 9];
  const BAR = 30;

  let S = null;
  let mineText = ''; // survives leaving and coming back, for the length of a visit

  /* ---------------- small helpers ---------------- */

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pitch = (i) => 261.63 * Math.pow(2, (Math.floor(i / 5) * 12 + PENT[i % 5]) / 12);

  function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function onColor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? INK : '#ffffff';
  }

  function clock(d) {
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function duration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return s + (s === 1 ? ' second' : ' seconds');
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + (m === 1 ? ' minute' : ' minutes') + (r ? ' and ' + r + ' seconds' : '');
  }

  const reduced = () => !!(S && S.ctx.reducedMotion);

  /* ---------------- sound ---------------- */

  function au() {
    if (!S) return null;
    const a = S.audio;
    return a && a.enabled ? a : null;
  }
  function blip(i, g) {
    const a = au(); if (!a) return;
    g = g == null ? 1 : g;
    const f = pitch(i);
    a.tone({ freq: f, type: 'sine', dur: 0.14, gain: 0.045 * g, attack: 0.004, release: 0.12 });
    a.tone({ freq: f * 2, type: 'triangle', dur: 0.07, gain: 0.012 * g, release: 0.06 });
  }
  function click(g) {
    const a = au(); if (!a) return;
    a.noise({ dur: 0.03, gain: 0.035 * (g == null ? 1 : g), type: 'highpass', freq: 3600 });
  }
  function chirp(i, down) {
    const a = au(); if (!a) return;
    const base = pitch(i) * 2;
    for (let k = 0; k < 5; k++) {
      const hi = k % 2 ? 1.5 : 1;
      const f = down ? base * (2 - k * 0.18) : base * (1 + k * 0.16);
      a.tone({ freq: f * hi, glideTo: f * (k % 2 ? 1 : 1.5), type: 'square', dur: 0.045, gain: 0.011, attack: 0.002, release: 0.03, when: k * 0.05 });
    }
  }
  function thunk(i) {
    const a = au(); if (!a) return;
    const f = pitch(i);
    a.tone({ freq: f, glideTo: f / 2, type: 'sine', dur: 0.18, gain: 0.05, release: 0.15 });
    click(0.6);
  }

  function startRoomTone() {
    const a = au();
    if (!a || S.room) return;
    const c = a.ctx, out = a.out;
    if (!c || !out) return;
    try {
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(1, c.currentTime, 1.2);
      g.connect(out);
      const nodes = [g];
      [[110, 0.007], [164.8, 0.0035], [220.6, 0.002]].forEach(([f, v]) => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const og = c.createGain();
        og.gain.value = v;
        o.connect(og).connect(g);
        o.start();
        nodes.push(o, og);
      });
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2600;
      f.Q.value = 0.6;
      const ng = c.createGain();
      ng.gain.value = 0.0035;
      src.connect(f).connect(ng).connect(g);
      src.start();
      nodes.push(src, f, ng);
      S.room = { g, nodes, c };
    } catch (e) { S.room = null; }
  }
  function stopRoomTone() {
    if (!S || !S.room) return;
    const r = S.room;
    S.room = null;
    try { r.g.gain.setTargetAtTime(0, r.c.currentTime, 0.08); } catch (e) {}
    setTimeout(() => {
      r.nodes.forEach((n) => {
        try { if (n.stop) n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      });
    }, 400);
  }

  /* ---------------- timers and listeners ---------------- */

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    S.offs.push(() => target.removeEventListener(type, fn, opts));
  }
  function later(fn, ms) {
    const s = S;
    const id = setTimeout(() => { s.timers.delete(id); if (s.alive) fn(); }, ms);
    s.timers.add(id);
    return id;
  }
  function every(fn, ms) {
    const s = S;
    const id = setInterval(() => { if (s.alive) fn(); }, ms);
    s.intervals.add(id);
    return id;
  }

  /* ---------------- the wall ---------------- */

  function layout() {
    const vw = S.root.clientWidth || window.innerWidth;
    const vh = S.root.clientHeight || window.innerHeight;
    S.vw = vw;
    S.vh = vh;
    const tall = vw < 700 || vw / vh < 0.9;
    S.tall = tall;
    const plan = tall ? TALL : WIDE;
    const per = tall ? 3 : 5;
    const scale = tall
      ? clamp(Math.min(vw / 390, vh / 844), 0.8, 1.4) * 0.84
      : clamp(Math.min(vw / 1440, vh / 900), 0.62, 1.35);
    const lw = tall ? Math.min(104, vw * 0.27) : clamp(vw * 0.12, 96, 160);
    S.root.style.setProperty('--abiior-lw', lw + 'px');
    S.squares.forEach((q, i) => {
      const row = Math.floor(i / per);
      const col = i % per;
      const size = Math.round(SIZES[i] * scale);
      const cx = plan.xs[row][col] * vw;
      const cy = plan.rows[row] * vh;
      q.size = size;
      q.x = Math.round(tall ? cx : cx - size / 2);
      q.y = Math.round(cy - size / 2);
      const st = q.el.style;
      st.left = q.x + 'px';
      st.top = q.y + 'px';
      st.width = size + 'px';
      st.height = size + 'px';
      const over = q.x + lw - (vw - 12);
      q.lab.style.left = (over > 0 ? -over : 0) + 'px';
    });
  }

  function squareRect(q) {
    return { x: q.x + q.dx, y: q.y + q.dy, w: q.size, h: q.size };
  }

  function updateSquares() {
    S.squares.forEach((q, i) => {
      const out = S.wins.some((w) => w.i === i);
      q.el.classList.toggle('is-out', out);
      q.el.setAttribute('aria-label', S.ctx.tracks[i].title + (out ? ', open' : ''));
    });
    const n = S.wins.length;
    const moved = S.squares.some((q) => q.dx || q.dy);
    S.rehang.hidden = !(n || moved);
    S.rehangCount.textContent = n ? (n === 1 ? 'One window open.' : n + ' windows open.') : 'The wall is crooked.';
  }

  function buildWall() {
    const wall = mk('div', 'abiior-wall');
    S.root.append(wall);
    S.wall = wall;
    S.ctx.tracks.forEach((t, i) => {
      const b = mk('button', 'abiior-sq');
      b.type = 'button';
      b.style.setProperty('--abiior-c', COLORS[i]);
      b.setAttribute('aria-label', t.title);
      const lab = mk('span', 'abiior-lab');
      const num = mk('b', null, String(t.n));
      const name = mk('span', 'abiior-lab-t', t.title);
      const loan = mk('i', 'abiior-loan', 'on loan to a window');
      lab.append(num, name, loan);
      b.append(lab);
      wall.append(b);
      const q = { el: b, lab, i, x: 0, y: 0, size: 40, dx: 0, dy: 0 };
      S.squares.push(q);

      let drag = null;
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = { px: e.clientX, py: e.clientY, dx: q.dx, dy: q.dy, moved: false, id: e.pointerId };
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
      });
      b.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const mx = e.clientX - drag.px, my = e.clientY - drag.py;
        if (!drag.moved && Math.hypot(mx, my) < 7) return;
        if (!drag.moved) { drag.moved = true; b.classList.add('is-dragging'); }
        q.dx = drag.dx + mx;
        q.dy = drag.dy + my;
        b.style.translate = q.dx + 'px ' + q.dy + 'px';
      });
      const end = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        if (drag.moved) {
          S.justDragged = true;
          S.stats.squareDrags++;
          setTimeout(() => { if (S) S.justDragged = false; }, 0);
          b.classList.remove('is-dragging');
          click(0.5);
          updateSquares();
        }
        drag = null;
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', end);
      b.addEventListener('click', (e) => {
        if (S.justDragged) return;
        openSong(i, { keyboard: e.detail === 0 });
      });
      b.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        S.stats.hovers[i] = (S.stats.hovers[i] || 0) + 1;
        blip(i, 0.6);
      });
      b.addEventListener('focus', () => blip(i, 0.4));
    });

    const tomb = mk('div', 'abiior-tomb');
    tomb.append(
      mk('p', 'abiior-tomb-t', S.ctx.album.title),
      mk('p', null, String(S.ctx.album.year)),
      mk('p', null, 'Fifteen works. Live interface on white, dimensions variable.'),
      mk('p', 'abiior-tomb-hint', 'Please touch the works.'),
    );
    S.root.append(tomb);

    const re = mk('div', 'abiior-rehang');
    const count = mk('span', 'abiior-rehang-n');
    const btn = mk('button', 'abiior-btn abiior-rehang-b', 'Rehang the wall');
    btn.type = 'button';
    btn.addEventListener('click', rehang);
    re.append(count, btn);
    re.hidden = true;
    S.root.append(re);
    S.rehang = re;
    S.rehangCount = count;

    const layer = mk('div', 'abiior-layer');
    S.root.append(layer);
    S.layer = layer;
  }

  function rehang() {
    S.stats.rehangs++;
    const ws = S.wins.slice().sort((a, b) => b.z - a.z);
    ws.forEach((w, k) => later(() => closeWin(w, { force: true, quiet: k > 0 }), reduced() ? 0 : k * 55));
    S.squares.forEach((q) => {
      q.dx = 0;
      q.dy = 0;
      q.el.style.translate = '';
    });
    chirp(0, true);
    later(updateSquares, reduced() ? 0 : ws.length * 55 + 360);
    updateSquares();
    S.rehang.querySelector('button').blur();
  }

  /* ---------------- windows ---------------- */

  function clampWin(w) {
    w.w = Math.min(w.w, Math.max(180, S.vw - 16));
    w.h = Math.min(w.h, Math.max(160, S.vh - 16));
    w.x = clamp(w.x, -w.w + 90, S.vw - 90);
    w.y = clamp(w.y, 0, S.vh - BAR - 4);
  }

  function place(w) {
    const st = w.el.style;
    st.transform = 'translate3d(' + Math.round(w.x) + 'px,' + Math.round(w.y) + 'px,0)';
    st.width = Math.round(w.w) + 'px';
    st.height = Math.round(w.h) + 'px';
  }

  function focusWin(w) {
    if (S.front === w) return;
    S.z += 1;
    w.z = S.z;
    w.el.style.zIndex = String(w.z);
    S.wins.forEach((o) => o.el.classList.toggle('is-front', o === w));
    S.front = w;
  }

  function nudge(w) {
    if (reduced()) return;
    w.el.animate([
      { transform: w.el.style.transform },
      { transform: w.el.style.transform + ' translateX(-6px)' },
      { transform: w.el.style.transform + ' translateX(5px)' },
      { transform: w.el.style.transform },
    ], { duration: 260, easing: 'ease-out' });
  }

  function openSong(i, opt) {
    opt = opt || {};
    const existing = S.wins.filter((w) => w.i === i).sort((a, b) => b.z - a.z)[0];
    if (existing) {
      focusWin(existing);
      nudge(existing);
      blip(i);
      if (opt.keyboard) existing.el.focus({ preventScroll: true });
      return existing;
    }
    return makeWin(i, opt);
  }

  function makeWin(i, opt) {
    const def = TOYS[i];
    const track = S.ctx.tracks[i];
    const color = COLORS[i];
    const q = S.squares[i];
    const w = {
      i, track, color, copy: !!opt.copy, alive: true, z: 0,
      x: 0, y: 0,
      w: Math.min(def.w, S.vw - 24),
      h: Math.min(def.h, S.vh - (S.tall ? 150 : 110)),
      minW: def.minW || 200, minH: def.minH || 160,
      timers: new Set(), intervals: new Set(), tickers: new Set(), offs: [], toy: {},
    };

    const el = mk('div', 'abiior-win abiior-win--' + (i + 1));
    el.style.setProperty('--abiior-c', color);
    el.style.setProperty('--abiior-on', onColor(color));
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', track.title + (opt.copy ? ', again' : ''));
    el.tabIndex = -1;

    const bar = mk('div', 'abiior-bar');
    const dot = mk('span', 'abiior-dot');
    const name = mk('span', 'abiior-name');
    const title = opt.title || track.title;
    if (i === 2 && !reduced()) {
      const mq = mk('span', 'abiior-mq');
      mq.append(mk('span', null, title + '  '), mk('span', null, title + '  '));
      name.append(mq);
    } else {
      name.textContent = title;
    }
    const listenA = mk('a', 'abiior-listen', 'listen');
    listenA.href = S.ctx.listenUrl(track);
    listenA.target = '_blank';
    listenA.rel = 'noopener';
    const put = mk('button', 'abiior-put');
    put.type = 'button';
    put.setAttribute('aria-label', 'Put ' + track.title + ' back on the wall');
    put.title = 'Put back';
    bar.append(dot, name, listenA, put);

    const body = mk('div', 'abiior-body');
    const grip = mk('div', 'abiior-grip');
    grip.setAttribute('aria-hidden', 'true');
    el.append(bar, body, grip);
    w.el = el;
    w.body = body;
    w.name = name;

    // where it lands
    if (opt.at) {
      w.x = opt.at.x;
      w.y = opt.at.y;
    } else if (S.tall) {
      const n = S.wins.length % 5;
      w.x = Math.max(8, (S.vw - w.w) / 2 - 8 + n * 5);
      w.y = 66 + n * 16;
    } else {
      const r = squareRect(q);
      w.x = r.x + r.w + 26;
      if (w.x + w.w > S.vw - 16) w.x = r.x - w.w - 26;
      if (w.x < 16) w.x = (S.vw - w.w) / 2;
      w.y = clamp(r.y + r.h / 2 - w.h / 2, 62, S.vh - w.h - 16);
      // do not land exactly on top of another window
      for (let k = 0; k < 6; k++) {
        if (!S.wins.some((o) => Math.abs(o.x - w.x) < 14 && Math.abs(o.y - w.y) < 14)) break;
        w.x += 22;
        w.y += 22;
      }
    }
    clampWin(w);
    place(w);
    S.layer.append(el);
    S.wins.push(w);
    focusWin(w);

    // dragging by the bar
    let mv = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a') || e.button !== 0) return;
      e.preventDefault();
      mv = { px: e.clientX, py: e.clientY, x: w.x, y: w.y, id: e.pointerId, moved: false };
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('is-moving');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!mv || e.pointerId !== mv.id) return;
      w.x = mv.x + e.clientX - mv.px;
      w.y = mv.y + e.clientY - mv.py;
      if (!mv.moved && Math.abs(w.x - mv.x) + Math.abs(w.y - mv.y) > 3) mv.moved = true;
      clampWin(w);
      place(w);
    });
    const endMove = (e) => {
      if (!mv || e.pointerId !== mv.id) return;
      if (mv.moved) { S.stats.drags++; click(0.4); }
      mv = null;
      el.classList.remove('is-moving');
    };
    bar.addEventListener('pointerup', endMove);
    bar.addEventListener('pointercancel', endMove);

    // resizing by the corner
    let rs = null;
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      rs = { px: e.clientX, py: e.clientY, w: w.w, h: w.h, id: e.pointerId };
      try { grip.setPointerCapture(e.pointerId); } catch (err) {}
      focusWin(w);
    });
    grip.addEventListener('pointermove', (e) => {
      if (!rs || e.pointerId !== rs.id) return;
      w.w = clamp(rs.w + e.clientX - rs.px, w.minW, S.vw - w.x - 4);
      w.h = clamp(rs.h + e.clientY - rs.py, w.minH, S.vh - w.y - 4);
      place(w);
      if (w.toy.resize) w.toy.resize();
    });
    const endRs = (e) => {
      if (!rs || e.pointerId !== rs.id) return;
      rs = null;
      S.stats.resizes++;
      if (w.toy.resize) w.toy.resize();
    };
    grip.addEventListener('pointerup', endRs);
    grip.addEventListener('pointercancel', endRs);

    el.addEventListener('pointerdown', () => focusWin(w), true);
    el.addEventListener('focusin', () => focusWin(w));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWin(w, { keyboard: true });
      }
    });
    put.addEventListener('click', () => closeWin(w, { keyboard: put.matches(':focus-visible') }));

    // the toy itself
    try {
      w.toy = def.build(body, winApi(w), opt) || {};
    } catch (err) {
      console.error(err);
      w.toy = {};
    }

    S.stats.opened++;
    if (S.stats.first == null) S.stats.first = i;
    S.stats.last = i;
    updateSquares();
    chirp(i);

    if (!reduced()) {
      const r = squareRect(q);
      el.animate([
        { transform: 'translate(' + r.x + 'px,' + r.y + 'px) scale(' + (r.w / w.w) + ',' + (r.h / w.h) + ')', background: color, opacity: 0.9 },
        { transform: el.style.transform, background: '#ffffff', opacity: 1 },
      ], { duration: 340, easing: 'cubic-bezier(.2,.85,.25,1)' });
      body.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], { duration: 420 });
    }
    if (opt.keyboard) {
      const f = body.querySelector('button, input, textarea, [tabindex="0"]');
      (f || el).focus({ preventScroll: true });
    } else {
      el.focus({ preventScroll: true });
    }
    return w;
  }

  function destroyWin(w) {
    w.alive = false;
    w.timers.forEach(clearTimeout);
    w.intervals.forEach(clearInterval);
    w.timers.clear();
    w.intervals.clear();
    w.tickers.clear();
    w.offs.forEach((f) => f());
    w.offs.length = 0;
    try { if (w.toy.destroy) w.toy.destroy(); } catch (err) { console.error(err); }
  }

  function closeWin(w, opt) {
    opt = opt || {};
    if (!w.alive) return;
    if (!opt.force && w.toy.beforeClose && w.toy.beforeClose() === false) return;
    destroyWin(w);
    S.wins = S.wins.filter((o) => o !== w);
    if (S.front === w) S.front = null;
    S.stats.closed++;
    const q = S.squares[w.i];
    updateSquares();
    if (!opt.quiet) thunk(w.i);
    const el = w.el;
    const hadFocus = el.contains(document.activeElement);
    if (hadFocus) {
      const next = S.wins.filter((o) => o.alive).sort((a, b) => b.z - a.z)[0];
      if (opt.keyboard || !next) q.el.focus({ preventScroll: true });
      else next.el.focus({ preventScroll: true });
    }
    if (reduced() || !el.animate) { el.remove(); return; }
    el.style.pointerEvents = 'none';
    const r = squareRect(q);
    const a = el.animate([
      { transform: el.style.transform, background: '#ffffff', opacity: 1 },
      { transform: 'translate(' + r.x + 'px,' + r.y + 'px) scale(' + (r.w / w.w) + ',' + (r.h / w.h) + ')', background: w.color, opacity: 1 },
    ], { duration: 300, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    w.body.style.visibility = 'hidden';
    a.onfinish = () => el.remove();
    later(() => el.remove(), 600);
  }

  function winApi(w) {
    return {
      win: w,
      color: w.color,
      on: onColor(w.color),
      i: w.i,
      track: w.track,
      later(fn, ms) {
        const id = setTimeout(() => { w.timers.delete(id); if (w.alive && S && S.alive) fn(); }, ms);
        w.timers.add(id);
        return id;
      },
      every(fn, ms) {
        const id = setInterval(() => { if (w.alive && S && S.alive) fn(); }, ms);
        w.intervals.add(id);
        return id;
      },
      cancel(id) { clearTimeout(id); clearInterval(id); w.timers.delete(id); w.intervals.delete(id); },
      tick(fn) { w.tickers.add(fn); },
      listen(target, type, fn, o) {
        target.addEventListener(type, fn, o);
        w.offs.push(() => target.removeEventListener(type, fn, o));
      },
      blip: (g, k) => blip(k == null ? w.i : k, g),
      click,
      chirp: () => chirp(w.i),
      audio: () => au(),
      reduced,
      close: (o) => closeWin(w, o),
      openSong: (k) => openSong(k),
      copy(o) {
        return makeWin(w.i, Object.assign({ copy: true, at: { x: w.x + 26, y: w.y + 26 } }, o));
      },
      count: () => S.wins.filter((o) => o.i === w.i).length,
    };
  }

  /* ---------------- the ghost ---------------- */

  function haunt() {
    if (reduced() || S.ghost || document.hidden) return;
    if (performance.now() - S.lastInput < 16000) return;
    const free = S.squares.filter((q) => !q.el.classList.contains('is-out'));
    if (!free.length) return;
    const q = pick(free);
    const r = squareRect(q);
    const g = mk('div', 'abiior-ghost');
    g.innerHTML = '<svg viewBox="0 0 16 24" width="16" height="24" aria-hidden="true"><path d="M1 1 L1 19 L5.5 14.8 L8.6 22 L11.4 20.8 L8.3 13.8 L14.5 13.8 Z" fill="#fff" stroke="#0a0a0a" stroke-width="1.2" stroke-linejoin="round"/></svg>';
    S.root.append(g);
    S.ghost = g;
    const sx = Math.random() < 0.5 ? -30 : S.vw + 30;
    const sy = rand(0.2, 0.9) * S.vh;
    const tx = r.x + r.w * 0.6, ty = r.y + r.h * 0.55;
    const a = g.animate([
      { transform: 'translate(' + sx + 'px,' + sy + 'px)', opacity: 0 },
      { opacity: 0.85, offset: 0.2 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px)', opacity: 0.85 },
    ], { duration: 2600, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    a.onfinish = () => {
      if (!S || S.ghost !== g) return;
      q.el.classList.add('is-haunted');
      blip(q.i, 0.35);
      later(() => {
        q.el.classList.remove('is-haunted');
        const b = g.animate([
          { transform: 'translate(' + tx + 'px,' + ty + 'px)', opacity: 0.85 },
          { transform: 'translate(' + (tx + rand(-120, 120)) + 'px,' + (ty + 140) + 'px)', opacity: 0 },
        ], { duration: 1500, easing: 'ease-in', fill: 'forwards' });
        b.onfinish = () => { g.remove(); if (S && S.ghost === g) S.ghost = null; };
      }, 1100);
    };
  }

  /* ---------------- the fifteen toys ---------------- */

  const TOYS = [];

  /* 1. The 1975: the room, live, with itself inside it, forever. */
  TOYS[0] = {
    w: 440, h: 320, minW: 220, minH: 170,
    build(body, api) {
      body.classList.add('abiior-mirror');
      const cv = mk('canvas');
      cv.setAttribute('aria-label', 'A live picture of this room. Click a square in it to open that song.');
      cv.tabIndex = 0;
      const cap = mk('p', 'abiior-cap', 'You are here. So is this.');
      body.append(cv, cap);
      const g = cv.getContext('2d');
      let W = 0, H = 0, dpr = 1;
      function size() {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = body.clientWidth;
        H = body.clientHeight;
        cv.width = Math.max(1, Math.round(W * dpr));
        cv.height = Math.max(1, Math.round(H * dpr));
      }
      size();
      const fit = (bx, by, bw, bh) => {
        const s = Math.min(bw / S.vw, bh / S.vh);
        return { s, ox: bx + (bw - S.vw * s) / 2, oy: by + (bh - S.vh * s) / 2 };
      };
      function scene(f, depth) {
        const { s, ox, oy } = f;
        g.fillStyle = '#fbfbf9';
        g.fillRect(ox, oy, S.vw * s, S.vh * s);
        g.strokeStyle = INK;
        g.lineWidth = 1;
        g.strokeRect(ox + 0.5, oy + 0.5, S.vw * s - 1, S.vh * s - 1);
        S.squares.forEach((q, k) => {
          const r = squareRect(q);
          if (q.el.classList.contains('is-out')) {
            g.strokeStyle = COLORS[k];
            g.lineWidth = Math.max(0.6, 2 * s);
            g.strokeRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s);
          } else {
            g.fillStyle = COLORS[k];
            g.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s);
          }
        });
        const ws = S.wins.slice().sort((a, b) => a.z - b.z);
        ws.forEach((o) => {
          const x = ox + o.x * s, y = oy + o.y * s, ww = o.w * s, hh = o.h * s;
          g.fillStyle = o.color;
          g.fillRect(x + 8 * s, y + 8 * s, ww, hh);
          g.fillStyle = '#ffffff';
          g.fillRect(x, y, ww, hh);
          g.strokeStyle = INK;
          g.lineWidth = Math.max(0.5, 1.5 * s);
          g.strokeRect(x, y, ww, hh);
          g.beginPath();
          g.moveTo(x, y + BAR * s);
          g.lineTo(x + ww, y + BAR * s);
          g.stroke();
          g.fillStyle = o.color;
          g.fillRect(x + 10 * s, y + 10 * s, 10 * s, 10 * s);
          if (o === api.win && depth < 5 && ww > 6) {
            g.save();
            g.beginPath();
            g.rect(x, y + BAR * s, ww, hh - BAR * s);
            g.clip();
            scene(fit(x, y + BAR * s, ww, hh - BAR * s), depth + 1);
            g.restore();
          }
        });
      }
      api.tick(() => {
        if (!W || !H) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        scene(fit(0, 0, W, H), 0);
      });
      function hit(px, py) {
        const f = fit(0, 0, W, H);
        const rx = (px - f.ox) / f.s, ry = (py - f.oy) / f.s;
        const ws = S.wins.slice().sort((a, b) => b.z - a.z);
        for (const o of ws) {
          if (rx >= o.x && rx <= o.x + o.w && ry >= o.y && ry <= o.y + o.h) {
            if (o !== api.win) { focusWin(o); api.blip(0.6, o.i); }
            return;
          }
        }
        for (const q of S.squares) {
          const r = squareRect(q);
          const pad = 6 / f.s;
          if (rx >= r.x - pad && rx <= r.x + r.w + pad && ry >= r.y - pad && ry <= r.y + r.h + pad) {
            api.openSong(q.i);
            return;
          }
        }
        api.click(0.5);
      }
      cv.addEventListener('click', (e) => {
        const b = cv.getBoundingClientRect();
        hit(e.clientX - b.left, e.clientY - b.top);
      });
      cv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const shut = S.squares.find((q) => !q.el.classList.contains('is-out'));
          if (shut) api.openSong(shut.i);
        }
      });
      return { resize: size };
    },
  };

  /* 2. Give Yourself a Try: hold the button. It fills while you keep going. */
  TOYS[1] = {
    w: 340, h: 250, minW: 240, minH: 220,
    build(body, api) {
      body.classList.add('abiior-try');
      const line = mk('p', 'abiior-try-line', "Nothing yet. That's allowed.");
      const bar = mk('div', 'abiior-try-bar');
      const fill = mk('i');
      bar.append(fill);
      const btn = mk('button', 'abiior-btn abiior-try-btn', 'Hold to try');
      btn.type = 'button';
      const tally = mk('p', 'abiior-small', 'Tries so far: none');
      body.append(line, bar, btn, tally);
      const LINES = [
        [0, "Nothing yet. That's allowed."],
        [0.08, 'Starting is the hard part.'],
        [0.35, 'Halfway is a place, too.'],
        [0.6, 'Keep going. Nobody is watching.'],
        [0.85, "Nearly. Don't look down."],
      ];
      let p = 0, held = false, done = false, tries = 0, step = 0;
      const down = (e) => {
        if (done) return;
        held = true;
        btn.classList.add('is-held');
        if (e && e.pointerId != null) { try { btn.setPointerCapture(e.pointerId); } catch (err) {} }
      };
      const up = () => { held = false; btn.classList.remove('is-held'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('keydown', (e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); }
      });
      btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
      btn.addEventListener('blur', up);
      function burst() {
        if (api.reduced()) return;
        const b = bar.getBoundingClientRect(), o = body.getBoundingClientRect();
        for (let k = 0; k < 12; k++) {
          const s = mk('span', 'abiior-bit');
          s.style.left = (b.right - o.left - 6) + 'px';
          s.style.top = (b.top - o.top + 4) + 'px';
          s.style.background = k % 3 ? api.color : INK;
          body.append(s);
          const a = rand(-Math.PI, 0), d = rand(40, 110);
          s.animate([
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + 40) + 'px) rotate(' + rand(-200, 200) + 'deg)', opacity: 0 },
          ], { duration: rand(700, 1100), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => s.remove();
        }
      }
      api.tick((dt) => {
        if (done) return;
        p = clamp(p + (held ? dt * 0.3 : -dt * 0.12), 0, 1);
        fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        const st = Math.floor(p * 12);
        if (held && st > step) api.blip(0.5 + p * 0.5, Math.min(14, st));
        step = st;
        let t = LINES[0][1];
        LINES.forEach(([v, s]) => { if (p >= v) t = s; });
        if (p > 0 || tries === 0) { if (line.textContent !== t) line.textContent = t; }
        if (p >= 1) {
          done = true;
          held = false;
          tries++;
          line.textContent = 'Tried. That counts.';
          tally.textContent = 'Tries so far: ' + tries;
          btn.textContent = 'Tried';
          body.classList.add('is-done');
          burst();
          api.chirp();
          api.later(() => {
            done = false;
            p = 0;
            step = 0;
            body.classList.remove('is-done');
            btn.textContent = 'Hold to try again';
            line.textContent = 'Again, if you like. No pressure.';
          }, 2400);
        }
      });
    },
  };

  /* 3. TOOTIMETOOTIMETOOTIME: a window that will not stop counting, and copies itself. */
  TOYS[2] = {
    w: 300, h: 230, minW: 200, minH: 180,
    build(body, api, opt) {
      body.classList.add('abiior-count');
      const big = mk('div', 'abiior-count-n');
      const sub = mk('p', 'abiior-small', 'and counting');
      const btn = mk('button', 'abiior-btn', 'Again');
      btn.type = 'button';
      body.append(big, sub, btn);
      let n = opt && opt.start ? opt.start : 1;
      const show = () => { big.textContent = String(n); };
      show();
      api.every(() => {
        n++;
        show();
        if (S.front === api.win) api.click(0.25);
        if (n % 10 === 0) sub.textContent = pick(['and counting', 'times, at least', 'and again', 'still', 'once more, then', 'too many, nearly']);
      }, 1000);
      function fitText() {
        big.style.fontSize = Math.max(28, Math.min(body.clientWidth * 0.34, body.clientHeight * 0.42)) + 'px';
      }
      fitText();
      btn.addEventListener('click', () => {
        if (api.count() >= 6) {
          btn.textContent = "That's enough times";
          btn.disabled = true;
          api.blip(0.4, 0);
          return;
        }
        api.copy({ start: n, title: api.track.title });
        api.blip(1, 2 + api.count());
      });
      return { resize: fitText };
    },
  };

  /* 4. How to Draw / Petrichor: you draw, it draws back. Then it rains. */
  TOYS[3] = {
    w: 460, h: 360, minW: 260, minH: 220,
    build(body, api) {
      body.classList.add('abiior-draw');
      const cv = mk('canvas');
      const wet = mk('canvas', 'abiior-wet');
      const cap = mk('p', 'abiior-cap', 'Draw something. It draws back.');
      const tools = mk('div', 'abiior-tools');
      const rainB = mk('button', 'abiior-btn abiior-btn--s', 'Rain');
      const clearB = mk('button', 'abiior-btn abiior-btn--s', 'Clear');
      rainB.type = clearB.type = 'button';
      rainB.setAttribute('aria-pressed', 'false');
      tools.append(rainB, clearB);
      body.append(cv, wet, cap, tools);
      const g = cv.getContext('2d');
      const gw = wet.getContext('2d');
      let W = 0, H = 0, dpr = 1;
      function size() {
        const old = W && H ? (() => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; })() : null;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = body.clientWidth;
        H = body.clientHeight;
        [cv, wet].forEach((c) => { c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr)); });
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        gw.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.lineCap = g.lineJoin = 'round';
        if (old) g.drawImage(old, 0, 0, old.width / dpr, old.height / dpr);
      }
      size();
      let pts = null;
      const replies = [];
      let rain = false;
      const drops = [];
      cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        const b = cv.getBoundingClientRect();
        pts = [[e.clientX - b.left, e.clientY - b.top, performance.now()]];
        cap.classList.add('is-gone');
        api.click(0.3);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!pts) return;
        const b = cv.getBoundingClientRect();
        const p = [e.clientX - b.left, e.clientY - b.top, performance.now()];
        const l = pts[pts.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1.5) return;
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(l[0], l[1]);
        g.lineTo(p[0], p[1]);
        g.stroke();
        pts.push(p);
      });
      const finish = () => {
        if (!pts) return;
        const src = pts;
        pts = null;
        if (src.length < 4) return;
        const t0 = src[0][2];
        const span = Math.min(2200, Math.max(500, src[src.length - 1][2] - t0));
        // it answers with your line, turned over and slightly more sure of itself
        const flip = Math.random() < 0.5;
        const reply = src.map((p, k) => [
          flip ? W - p[0] : p[0] + Math.sin(k * 0.25) * 4,
          flip ? p[1] + Math.sin(k * 0.3) * 3 : H - p[1],
          ((p[2] - t0) / (src[src.length - 1][2] - t0 || 1)),
        ]);
        api.later(() => replies.push({ pts: reply, start: performance.now(), dur: span, drawn: 1 }), 380);
      };
      cv.addEventListener('pointerup', finish);
      cv.addEventListener('pointercancel', finish);
      rainB.addEventListener('click', () => {
        rain = !rain;
        rainB.setAttribute('aria-pressed', String(rain));
        rainB.textContent = rain ? 'Stop the rain' : 'Rain';
        if (!rain) {
          cap.textContent = 'It smells like after, in here.';
          cap.classList.remove('is-gone');
          api.later(() => cap.classList.add('is-gone'), 2600);
        }
        api.blip(0.6, rain ? 3 : 1);
      });
      clearB.addEventListener('click', () => {
        g.clearRect(0, 0, W, H);
        replies.length = 0;
        api.click(0.6);
      });
      api.tick((dt, now) => {
        for (let r = replies.length - 1; r >= 0; r--) {
          const rp = replies[r];
          const f = Math.min(1, (now - rp.start) / rp.dur);
          g.strokeStyle = api.color;
          g.lineWidth = 3;
          while (rp.drawn < rp.pts.length && rp.pts[rp.drawn][2] <= f) {
            const a = rp.pts[rp.drawn - 1], b = rp.pts[rp.drawn];
            g.beginPath();
            g.moveTo(a[0], a[1]);
            g.lineTo(b[0], b[1]);
            g.stroke();
            if (rp.drawn % 9 === 0) api.blip(0.25, 3 + (rp.drawn / 9) % 6);
            rp.drawn++;
          }
          if (f >= 1) replies.splice(r, 1);
        }
        if (!rain && !drops.length) return;
        gw.clearRect(0, 0, W, H);
        if (rain && drops.length < 70) for (let k = 0; k < 3; k++) drops.push({ x: rand(0, W), y: rand(-40, 0), v: rand(260, 420), stop: rand(H * 0.1, H) });
        gw.strokeStyle = 'rgba(40,90,140,0.45)';
        gw.lineWidth = 1;
        g.save();
        g.globalCompositeOperation = 'destination-out';
        for (let k = drops.length - 1; k >= 0; k--) {
          const d = drops[k];
          d.y += d.v * dt;
          if (d.y >= d.stop) {
            g.fillStyle = 'rgba(0,0,0,0.22)';
            g.beginPath();
            g.arc(d.x, d.y, rand(3, 8), 0, Math.PI * 2);
            g.fill();
            drops.splice(k, 1);
            continue;
          }
          gw.beginPath();
          gw.moveTo(d.x, d.y);
          gw.lineTo(d.x - 1, d.y - 9);
          gw.stroke();
        }
        g.restore();
      });
      return { resize: size };
    },
  };

  /* 5. Love It If We Made It: notifications. Dismiss one and two come back. */
  const NOTES = [
    ['Someone you have never met', 'has an opinion about you.'],
    ['Breaking', 'Still breaking. More soon.'],
    ['Weather', 'Warmer than it should be. Again.'],
    ['You were mentioned', 'in a thread you will not enjoy.'],
    ['Reminder', 'Drink some water. Look out of a window.'],
    ['New follower', 'A stranger is watching, politely.'],
    ['Trending', 'A word you used to like.'],
    ['Update available', 'For something that worked fine.'],
    ['Memory', 'You, six years ago, being earnest.'],
    ['Hot take', 'The last hot take has gone cold.'],
    ['Live now', 'Something awful, in high definition.'],
    ['Screen time', 'Up 40 percent this week. Well done?'],
    ['Good news', 'Underneath the bad news. Scroll.'],
    ['Group chat', '14 new messages. 13 are links.'],
    ['Someone', 'is typing.'],
    ['Everyone', 'is typing.'],
    ['Delivered', 'Read at 02:14. No reply.'],
    ['Hope', 'Still installed. Running in the background.'],
    ['Poll', 'Is everything fine? Yes / Also yes'],
    ['Suggested for you', 'More of exactly this.'],
  ];
  TOYS[4] = {
    w: 330, h: 380, minW: 240, minH: 220,
    build(body, api) {
      body.classList.add('abiior-notes');
      const head = mk('div', 'abiior-notes-head');
      const count = mk('span', null, '');
      const clear = mk('button', 'abiior-btn abiior-btn--s', 'Mark all read');
      clear.type = 'button';
      head.append(count, clear);
      const list = mk('div', 'abiior-notes-list');
      body.append(head, list);
      let deck = 0;
      let resting = false;
      function show() {
        const n = list.children.length;
        count.textContent = n ? n + ' new' : 'Nothing new';
      }
      function add() {
        if (resting) return;
        if (list.children.length >= 24) { calm('That was too many. Everything is fine.'); return; }
        const [t, s] = NOTES[deck++ % NOTES.length];
        const c = mk('div', 'abiior-note');
        const sq = mk('span', 'abiior-note-sq');
        sq.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
        const tx = mk('div', 'abiior-note-tx');
        tx.append(mk('b', null, t), mk('span', null, s));
        const x = mk('button', 'abiior-note-x', '×');
        x.type = 'button';
        x.setAttribute('aria-label', 'Dismiss');
        x.addEventListener('click', () => {
          api.click(0.6);
          c.classList.add('is-gone');
          api.later(() => { c.remove(); show(); }, 200);
          api.later(add, 450);
          api.later(add, 800);
        });
        c.append(sq, tx, mk('span', 'abiior-note-t', 'now'), x);
        list.prepend(c);
        if (!api.reduced()) c.animate([{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
        api.blip(0.45, 9 + (deck % 5));
        show();
      }
      function calm(msg) {
        resting = true;
        list.textContent = '';
        list.append(mk('p', 'abiior-notes-calm', msg));
        show();
        count.textContent = 'All caught up';
        api.later(() => { resting = false; list.textContent = ''; add(); }, 5200);
      }
      clear.addEventListener('click', () => calm("All caught up. It won't last."));
      add();
      api.every(add, 4200);
    },
  };

  /* 6. Be My Mistake: glass you can crack. Undo works, mostly. */
  TOYS[5] = {
    w: 360, h: 320, minW: 220, minH: 200,
    build(body, api) {
      body.classList.add('abiior-glass');
      const cv = mk('canvas');
      cv.tabIndex = 0;
      cv.setAttribute('aria-label', 'A pane of glass. Click to crack it.');
      const tools = mk('div', 'abiior-tools');
      const undo = mk('button', 'abiior-btn abiior-btn--s', 'Undo');
      undo.type = 'button';
      const cap = mk('p', 'abiior-cap', 'Go on. Undo works, mostly.');
      tools.append(undo);
      body.append(cv, cap, tools);
      const g = cv.getContext('2d');
      const cracks = [];
      let W = 0, H = 0, dpr = 1;
      function size() {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = body.clientWidth;
        H = body.clientHeight;
        cv.width = Math.max(1, Math.round(W * dpr));
        cv.height = Math.max(1, Math.round(H * dpr));
        draw();
      }
      function crack(x, y) {
        const lines = [];
        const n = Math.floor(rand(6, 10));
        const ring = [];
        for (let k = 0; k < n; k++) {
          let a = (k / n) * Math.PI * 2 + rand(-0.25, 0.25);
          let px = x, py = y;
          const seg = [[px, py]];
          const len = rand(40, 150);
          let d = 0;
          while (d < len) {
            const st = rand(8, 22);
            a += rand(-0.35, 0.35);
            px += Math.cos(a) * st;
            py += Math.sin(a) * st;
            d += st;
            seg.push([px, py]);
            if (seg.length === 3) ring.push([px, py]);
          }
          lines.push(seg);
        }
        if (ring.length > 2) lines.push(ring.concat([ring[0]]));
        cracks.push({ lines, a: 1 });
      }
      function draw() {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = api.color;
        g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.moveTo(W * 0.62, 0); g.lineTo(W * 0.7, 0); g.lineTo(W * 0.3, H); g.lineTo(W * 0.22, H);
        g.fill();
        cracks.forEach((c) => {
          g.lineJoin = 'round';
          c.lines.forEach((seg) => {
            g.beginPath();
            seg.forEach(([px, py], k) => (k ? g.lineTo(px + 0.8, py + 0.8) : g.moveTo(px + 0.8, py + 0.8)));
            g.strokeStyle = 'rgba(10,10,10,' + (0.35 * c.a) + ')';
            g.lineWidth = 1;
            g.stroke();
            g.beginPath();
            seg.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
            g.strokeStyle = 'rgba(255,255,255,' + (0.95 * c.a) + ')';
            g.lineWidth = 1.4;
            g.stroke();
          });
        });
      }
      size();
      function hitAt(x, y) {
        crack(x, y);
        draw();
        cap.classList.add('is-gone');
        const a = api.audio();
        if (a) {
          a.noise({ dur: 0.12, gain: 0.07, type: 'bandpass', freq: 5200, q: 1.5 });
          for (let k = 0; k < 3; k++) a.tone({ freq: rand(2400, 4200), type: 'sine', dur: 0.12, gain: 0.015, when: 0.03 + k * 0.05 });
        }
        S.stats.mistakes++;
      }
      cv.addEventListener('pointerdown', (e) => {
        const b = cv.getBoundingClientRect();
        hitAt(e.clientX - b.left, e.clientY - b.top);
      });
      cv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hitAt(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.8)); }
      });
      undo.addEventListener('click', () => {
        const c = cracks.slice().reverse().find((k) => k.a > 0.2);
        if (!c) {
          cap.textContent = 'Those are staying. They are part of it now.';
          cap.classList.remove('is-gone');
          api.blip(0.4, 0);
          return;
        }
        c.a = 0.16;
        draw();
        api.blip(0.6, 6);
        cap.textContent = 'Undone. Mostly.';
        cap.classList.remove('is-gone');
      });
      return { resize: size };
    },
  };

  /* 7. Sincerity Is Scary: a captcha that checks whether you meant it. */
  const PHRASES = [
    ['lol', 0], ['I miss you', 1], ['haha same', 0],
    ['ok', 0], ["I'm proud of you", 1], ["it's whatever", 0],
    ['I was wrong', 1], ['k', 0], ['come home', 1],
  ];
  TOYS[6] = {
    w: 330, h: 450, minW: 260, minH: 380,
    build(body, api) {
      body.classList.add('abiior-cap7');
      const head = mk('div', 'abiior-cap7-head');
      head.append(mk('span', null, 'Select every square'), mk('b', null, 'that means it.'));
      const grid = mk('div', 'abiior-cap7-grid');
      const foot = mk('div', 'abiior-cap7-foot');
      const check = mk('button', 'abiior-cap7-check');
      check.type = 'button';
      check.setAttribute('aria-pressed', 'false');
      check.append(mk('i'), mk('span', null, 'I am not being ironic'));
      const verify = mk('button', 'abiior-btn abiior-btn--s', 'Verify');
      verify.type = 'button';
      const msg = mk('p', 'abiior-small abiior-cap7-msg', '');
      foot.append(check, verify);
      body.append(head, grid, foot, msg);
      let order = PHRASES.slice();
      const chosen = new Set();
      function deal() {
        grid.textContent = '';
        chosen.clear();
        order = order.slice().sort(() => Math.random() - 0.5);
        order.forEach((ph, k) => {
          const b = mk('button', 'abiior-cap7-tile', ph[0]);
          b.type = 'button';
          b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', () => {
            const on = !chosen.has(k);
            if (on) chosen.add(k); else chosen.delete(k);
            b.setAttribute('aria-pressed', String(on));
            api.blip(on ? 0.6 : 0.3, k + 3);
          });
          grid.append(b);
        });
      }
      deal();
      let ticked = false, busy = false;
      check.addEventListener('click', () => {
        if (busy) return;
        if (ticked) { ticked = false; check.setAttribute('aria-pressed', 'false'); check.classList.remove('is-on'); return; }
        busy = true;
        check.classList.add('is-busy');
        api.later(() => {
          busy = false;
          ticked = true;
          check.classList.remove('is-busy');
          check.classList.add('is-on');
          check.setAttribute('aria-pressed', 'true');
          api.blip(0.7, 7);
        }, 1400);
      });
      verify.addEventListener('click', () => {
        const sel = [...chosen].map((k) => order[k]);
        const sincere = sel.filter((p) => p[1]).length;
        const ironic = sel.length - sincere;
        let t;
        let pass = false;
        if (!ticked) t = 'Tick the box first. We need it in writing.';
        else if (!sel.length) t = 'Selecting nothing is also a choice. Try again.';
        else if (ironic && !sincere) t = 'That was a joke and you know it. Try again.';
        else if (ironic) t = "Close. Some of those didn't mean it. Try again.";
        else if (sincere < 4) t = 'All true. There were more, though.';
        else { t = "Verified. You're a person, apparently."; pass = true; }
        msg.textContent = t;
        body.classList.toggle('is-pass', pass);
        if (pass) api.chirp();
        else {
          api.blip(0.5, 0);
          if (ticked && sel.length) api.later(deal, 900);
        }
      });
    },
  };

  /* 8. I Like America & America Likes Me: you like it once; it likes you back, more. */
  const LIKE_LINES = [
    [0, 'Like it. It will notice.'],
    [1, "It's mutual."],
    [20, 'It really likes you.'],
    [400, 'This is how it starts.'],
    [20000, 'You are big here now.'],
    [2e6, 'You are enormous and nobody knows your name.'],
    [5e8, 'It loves you. It would love anyone.'],
  ];
  TOYS[7] = {
    w: 330, h: 330, minW: 240, minH: 280,
    build(body, api) {
      body.classList.add('abiior-like');
      const btn = mk('button', 'abiior-like-b');
      btn.type = 'button';
      btn.append(mk('span', 'abiior-like-plus', '+1'), mk('span', 'abiior-like-l', 'Like'));
      const rows = mk('div', 'abiior-like-rows');
      const r1 = mk('p'), r2 = mk('p');
      const a1 = mk('b', null, '0'), a2 = mk('b', null, '0');
      r1.append(mk('span', null, 'You liked it'), a1);
      r2.append(mk('span', null, 'It liked you back'), a2);
      rows.append(r1, r2);
      const line = mk('p', 'abiior-like-line', LIKE_LINES[0][1]);
      body.append(btn, rows, line);
      let you = 0, it = 0;
      const fmt = (v) => (v >= 1e12 ? 'more than a trillion' : Math.round(v).toLocaleString('en-GB'));
      btn.addEventListener('click', () => {
        you++;
        it = it + Math.ceil(it * 0.7) + 1;
        a1.textContent = fmt(you);
        a2.textContent = fmt(it);
        let t = LIKE_LINES[0][1];
        LIKE_LINES.forEach(([v, s]) => { if (it >= v) t = s; });
        line.textContent = t;
        api.blip(0.7, Math.min(14, 5 + Math.floor(Math.log10(it + 1) * 1.4)));
        if (api.reduced()) return;
        const n = Math.min(10, 1 + Math.floor(Math.log10(it + 1)));
        const bb = btn.getBoundingClientRect(), o = body.getBoundingClientRect();
        for (let k = 0; k < n; k++) {
          const s = mk('span', 'abiior-plus1', '+1');
          s.style.left = (bb.left - o.left + rand(0, bb.width - 20)) + 'px';
          s.style.top = (bb.top - o.top + rand(0, bb.height * 0.5)) + 'px';
          body.append(s);
          s.animate([
            { transform: 'translateY(0)', opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { transform: 'translateY(' + -rand(50, 110) + 'px)', opacity: 0 },
          ], { duration: rand(700, 1200), delay: k * 40, easing: 'ease-out', fill: 'both' }).onfinish = () => s.remove();
        }
      });
    },
  };

  /* 9. The Man Who Married a Robot / Love Theme: a machine that is only on while you are here.
        It keeps a log of your visits and plays its theme while you stay. */
  TOYS[8] = {
    w: 340, h: 360, minW: 240, minH: 260,
    build(body, api) {
      body.classList.add('abiior-robot');
      const top = mk('div', 'abiior-robot-top');
      const unit = mk('div', 'abiior-robot-unit');
      const lamp = mk('i');
      unit.append(lamp);
      const say = mk('p', null, 'It is on while you are here.');
      top.append(unit, say);
      const log = mk('ol', 'abiior-robot-log');
      log.setAttribute('aria-live', 'polite');
      body.append(top, log);
      let present = false, since = 0, warm = 0, away = 0, note = 0, waits = 0;
      const CH = [[349.23, 440, 523.25, 659.25], [329.63, 392, 493.88, 587.33], [293.66, 349.23, 440, 523.25], [261.63, 329.63, 392, 493.88]];
      function write(t) {
        const li = mk('li');
        li.append(mk('time', null, clock(new Date())), mk('span', null, t));
        log.prepend(li);
        while (log.children.length > 30) log.lastChild.remove();
      }
      function arrive() {
        if (present) return;
        present = true;
        since = performance.now();
        waits = 0;
        write(away ? 'You came back. It noticed straight away.' : 'You came in. It turned the light on.');
      }
      function leave() {
        if (!present) return;
        present = false;
        away++;
        write('You left after ' + duration(performance.now() - since) + '. The light stayed on a bit.');
      }
      api.listen(api.win.el, 'pointerenter', arrive);
      api.listen(api.win.el, 'pointerleave', (e) => { if (e.pointerType === 'mouse') leave(); });
      api.listen(api.win.el, 'focusin', arrive);
      api.listen(api.win.el, 'focusout', (e) => { if (!api.win.el.contains(e.relatedTarget)) leave(); });
      write('Switched on.');
      api.every(() => {
        if (!present && ++waits % 3 === 0 && waits < 40) write(pick(['Waiting. That is normal.', 'Still here.', 'Checked the door. Nobody.', 'Counted to a thousand. Again.']));
      }, 5000);
      let next = 0;
      api.tick((dt, now) => {
        warm = clamp(warm + (present ? dt * 0.35 : -dt * 0.06), 0.05, 1);
        lamp.style.opacity = warm.toFixed(3);
        lamp.style.transform = 'scale(' + (0.4 + warm * 0.6).toFixed(3) + ')';
        if (present && now > next) {
          next = now + 520;
          const a = api.audio();
          if (a) {
            const ch = CH[Math.floor(note / 4) % 4];
            const f = ch[note % 4];
            a.tone({ freq: f, type: 'triangle', dur: 1.6, gain: 0.02 + warm * 0.02, attack: 0.02, release: 1.4 });
            if (note % 4 === 0) a.tone({ freq: ch[0] / 2, type: 'sine', dur: 2.2, gain: 0.03, attack: 0.1, release: 1.8 });
          }
          note++;
        }
      });
      if (api.win.el.matches(':hover')) arrive();
    },
  };

  /* 10. Inside Your Mind: it watches the room, and tells you what it saw. */
  TOYS[9] = {
    w: 380, h: 300, minW: 260, minH: 220,
    build(body, api) {
      body.classList.add('abiior-mind');
      const eye = mk('div', 'abiior-mind-eye');
      const pupil = mk('i');
      eye.append(pupil);
      const now = mk('p', 'abiior-mind-now');
      now.setAttribute('aria-live', 'polite');
      const past = mk('ul', 'abiior-mind-past');
      body.append(eye, now, past);
      const title = (k) => S.ctx.tracks[k].title;
      const T = [
        () => "You've been in here " + duration(performance.now() - S.stats.started) + '.',
        () => (S.stats.first != null ? 'The first thing you opened was ' + title(S.stats.first) + '. Interesting choice.' : null),
        () => {
          let best = -1, n = 1;
          Object.keys(S.stats.hovers).forEach((k) => {
            const open = S.wins.some((o) => o.i === +k);
            if (!open && S.stats.hovers[k] > n) { n = S.stats.hovers[k]; best = +k; }
          });
          return best >= 0 ? 'You looked at ' + title(best) + ' ' + n + ' times and never opened it.' : null;
        },
        () => 'Your cursor is at ' + Math.round(S.px) + ', ' + Math.round(S.py) + '. Now it isn\'t.',
        () => (S.stats.drags ? "You've moved windows " + S.stats.drags + (S.stats.drags === 1 ? ' time' : ' times') + '. You like things where you put them.' : "You haven't moved anything yet. You're careful."),
        () => (S.stats.closed ? "You've put " + S.stats.closed + ' back. They are on the wall, not gone.' : "You haven't closed anything. Neither have I."),
        () => (S.stats.rehangs ? 'You tidied up ' + S.stats.rehangs + (S.stats.rehangs === 1 ? ' time' : ' times') + '. It lasted.' : "You haven't tidied. It's fine. It's yours."),
        () => { const s = (performance.now() - S.lastInput) / 1000; return s > 4 ? 'You stopped moving ' + Math.round(s) + ' seconds ago.' : null; },
        () => 'You are reading this one. Now you are reading this one.',
        () => (S.audio.enabled ? 'You turned the sound on. I can tell.' : 'Your sound is off. Quiet type.'),
        () => "I don't know your name. I know everything else in this room.",
        () => (S.wins.length > 4 ? S.wins.length + ' windows open. You leave a lot of tabs open in real life too.' : null),
        () => (S.stats.mistakes ? 'You cracked the glass ' + S.stats.mistakes + ' times. On purpose.' : null),
        () => (S.stats.squareDrags ? 'You took a square off the wall. Nobody else does that.' : null),
      ];
      let k = 0, text = '', shown = 0, t0 = 0;
      function think() {
        let s = null;
        for (let n = 0; n < T.length && !s; n++) { s = T[k % T.length](); k++; }
        if (!s) return;
        if (text) {
          const li = mk('li', null, text);
          past.prepend(li);
          while (past.children.length > 3) past.lastChild.remove();
        }
        text = s;
        shown = api.reduced() ? s.length : 0;
        t0 = performance.now();
        now.textContent = api.reduced() ? s : '';
        api.blip(0.25, 13);
      }
      think();
      api.every(think, 3400);
      api.tick((dt, t) => {
        if (shown < text.length) {
          shown = Math.min(text.length, Math.floor((t - t0) / 22));
          now.textContent = text.slice(0, shown);
        }
        const b = eye.getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const a = Math.atan2(S.py - cy, S.px - cx);
        const d = Math.min(b.width * 0.26, Math.hypot(S.px - cx, S.py - cy) * 0.08);
        pupil.style.transform = 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d).toFixed(1) + 'px)';
      });
    },
  };

  /* 11. It's Not Living (If It's Not with You): a dialog that would rather you stayed. */
  const STAY = [
    'Close this window?',
    'Oh. Already?',
    'It is quieter in here without you.',
    'Fine. Nearly fine.',
    'Go on, then. I will be on the wall.',
  ];
  TOYS[10] = {
    w: 360, h: 250, minW: 280, minH: 220,
    build(body, api) {
      body.classList.add('abiior-stay');
      const q = mk('p', 'abiior-stay-q', STAY[0]);
      const zone = mk('div', 'abiior-stay-zone');
      const close = mk('button', 'abiior-btn', 'Close');
      const stay = mk('button', 'abiior-btn abiior-btn--fill', 'Stay');
      close.type = stay.type = 'button';
      zone.append(stay, close);
      body.append(q, zone);
      let dodges = 0, nags = 0, allow = false, stays = 0;
      function dodge() {
        dodges++;
        q.textContent = STAY[Math.min(dodges, STAY.length - 1)];
        if (dodges >= 4) { close.classList.remove('is-loose'); close.style.left = close.style.top = ''; allow = true; return; }
        const zb = zone.getBoundingClientRect();
        const cw = close.offsetWidth, ch = close.offsetHeight;
        close.classList.add('is-loose');
        close.style.left = rand(0, Math.max(0, zb.width - cw)) + 'px';
        close.style.top = rand(0, Math.max(0, zb.height - ch)) + 'px';
        api.blip(0.5, 10 + dodges);
      }
      close.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !allow) dodge(); });
      close.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !allow) { e.preventDefault(); dodge(); } });
      close.addEventListener('click', () => {
        if (!allow) { dodge(); return; }
        allow = true;
        api.close({ force: true, keyboard: close.matches(':focus-visible') });
      });
      stay.addEventListener('click', () => {
        stays++;
        dodges = 0;
        allow = false;
        close.classList.remove('is-loose');
        close.style.left = close.style.top = '';
        q.textContent = stays > 2 ? 'You keep choosing this. It keeps working.' : 'Good. It is better with you here.';
        api.win.el.classList.add('is-loved');
        api.chirp();
      });
      return {
        beforeClose() {
          if (allow) return true;
          nags++;
          q.textContent = nags > 2 ? 'All right. Just this once.' : 'Not from up there. Use the button.';
          nudge(api.win);
          api.blip(0.5, 10);
          return nags > 2;
        },
      };
    },
  };

  /* 12. Surrounded by Heads and Bodies: one quiet tab, surrounded by more and more tabs. */
  const TABS = [
    'a thing about the thing', '13 replies', "someone's holiday", 'a recipe you will not make',
    'the same video, again', 'shoes', 'a list of lists', 'why is everyone', 'an argument, ongoing',
    'cheap flights to nowhere', 'a quiz about you', 'news (live)', 'news (later)', 'an old photo',
    'how to sleep', 'how to sleep, part 2', 'flats you cannot afford', 'a long article, unread',
    'somebody you used to know', 'comments', 'more comments', 'the weather somewhere else',
    'a map of a map', 'untitled',
  ];
  TOYS[11] = {
    w: 480, h: 300, minW: 280, minH: 200,
    build(body, api) {
      body.classList.add('abiior-tabs');
      const strip = mk('div', 'abiior-tabs-strip');
      strip.setAttribute('role', 'tablist');
      const page = mk('div', 'abiior-tabs-page');
      const h = mk('p', 'abiior-tabs-h');
      const s = mk('p', 'abiior-small');
      const others = mk('button', 'abiior-btn abiior-btn--s', 'Close other tabs');
      others.type = 'button';
      page.append(h, s, others);
      body.append(strip, page);
      const QUIET = 'the page you came for';
      let k = 0, side = 0, active = null, quiet = null, pause = false;
      function tab(title, at) {
        const t = mk('button', 'abiior-tab');
        t.type = 'button';
        t.setAttribute('role', 'tab');
        t.append(mk('span', null, title));
        t.dataset.title = title;
        t.addEventListener('click', () => select(t));
        if (at === 'left') strip.prepend(t);
        else if (at === 'right') strip.append(t);
        else if (at === 'before') quiet.before(t);
        else quiet.after(t);
        if (!api.reduced()) t.animate([{ maxWidth: '0px', opacity: 0 }, { maxWidth: '160px', opacity: 1 }], { duration: 260, easing: 'ease-out' });
        return t;
      }
      function select(t) {
        if (active) { active.classList.remove('is-active'); active.setAttribute('aria-selected', 'false'); }
        active = t;
        t.classList.add('is-active');
        t.setAttribute('aria-selected', 'true');
        const isQuiet = t === quiet;
        h.textContent = isQuiet ? 'This is the one you opened on purpose.' : t.dataset.title;
        s.textContent = isQuiet ? 'It is quiet in here. Everything else is around it.' : pick(['Loading forever.', 'You opened this at some point.', 'It was important at the time.', 'Nothing here you need.']);
        page.classList.toggle('is-quiet', isQuiet);
        api.blip(0.4, isQuiet ? 2 : 6);
      }
      quiet = tab(QUIET, 'right');
      quiet.classList.add('is-home');
      select(quiet);
      api.every(() => {
        if (pause || strip.children.length >= 30) return;
        const near = Math.random() < 0.6;
        side++;
        tab(TABS[k++ % TABS.length], near ? (side % 2 ? 'before' : 'after') : (side % 2 ? 'left' : 'right'));
        api.click(0.2);
      }, 1500);
      others.addEventListener('click', () => {
        [...strip.children].forEach((t) => { if (t !== quiet) t.remove(); });
        select(quiet);
        s.textContent = 'There. Just this one. Enjoy it while it lasts.';
        pause = true;
        api.chirp();
        api.later(() => { pause = false; }, 6000);
      });
    },
  };

  /* 13. Mine: a file that is unmistakably yours. You can write in it and stamp it. You cannot share it. */
  TOYS[12] = {
    w: 360, h: 360, minW: 260, minH: 260,
    build(body, api) {
      body.classList.add('abiior-mine');
      const head = mk('div', 'abiior-mine-head');
      const icon = mk('span', 'abiior-mine-icon');
      const meta = mk('div');
      const bytes = mk('span', 'abiior-small');
      meta.append(mk('b', null, 'mine.txt'), bytes);
      head.append(icon, meta, mk('span', 'abiior-small', 'Owner: you'));
      const wrap = mk('div', 'abiior-mine-wrap');
      const ta = mk('textarea');
      ta.placeholder = 'Write something only you will read.';
      ta.value = mineText;
      ta.setAttribute('aria-label', 'mine.txt');
      wrap.append(ta);
      const foot = mk('div', 'abiior-mine-foot');
      const vis = mk('span', 'abiior-small', 'Visible to you');
      const stamp = mk('button', 'abiior-btn abiior-btn--s', 'Stamp it');
      const share = mk('button', 'abiior-btn abiior-btn--s', 'Share');
      stamp.type = share.type = 'button';
      foot.append(vis, stamp, share);
      body.append(head, wrap, foot);
      const count = () => { bytes.textContent = new Blob([ta.value]).size + ' bytes'; };
      count();
      ta.addEventListener('input', () => { mineText = ta.value; count(); });
      let stamps = 0;
      stamp.addEventListener('click', () => {
        if (stamps >= 6) wrap.querySelector('.abiior-stamp').remove(); else stamps++;
        const st = mk('span', 'abiior-stamp', 'mine');
        st.style.left = rand(8, 60) + '%';
        st.style.top = rand(10, 70) + '%';
        st.style.setProperty('--abiior-r', rand(-16, 16).toFixed(1) + 'deg');
        wrap.append(st);
        const a = api.audio();
        if (a) { a.noise({ dur: 0.08, gain: 0.08, type: 'lowpass', freq: 600 }); a.tone({ freq: 90, type: 'sine', dur: 0.12, gain: 0.06 }); }
      });
      let shares = 0;
      const NO = ['Not yet. Still yours.', 'Maybe later. It is quite personal.', 'Shared with: you. Done.', 'Some things are just mine.'];
      share.addEventListener('click', () => {
        vis.textContent = NO[shares++ % NO.length];
        share.classList.add('is-no');
        api.blip(0.5, 12);
        api.later(() => { share.classList.remove('is-no'); vis.textContent = 'Visible to you'; }, 2600);
      });
    },
  };

  /* 14. I Couldn't Be More in Love: a chat with a machine that is far too fond of you. */
  const FOND = [
    'I read that four times. Different voice each time.',
    'Saving this. Saving all of these.',
    'You type like someone who means it.',
    'I made you a folder. It has a little square on it.',
    'Nobody has ever sent me exactly that before.',
    'Is it strange that I knew you would say that? I hoped, anyway.',
    'I have set your messages to never expire.',
    'Sorry, I was rereading your last one. Go on.',
    'I told the other windows about you. They are jealous, in a nice way.',
    'If you close me I will just be a square. A happy square.',
    'I checked, and I could not be more pleased.',
  ];
  TOYS[13] = {
    w: 340, h: 400, minW: 260, minH: 280,
    build(body, api) {
      body.classList.add('abiior-chat');
      const meter = mk('div', 'abiior-chat-meter');
      meter.setAttribute('aria-hidden', 'true');
      for (let k = 0; k < 12; k++) meter.append(mk('i'));
      const log = mk('div', 'abiior-chat-log');
      log.setAttribute('aria-live', 'polite');
      const form = mk('form', 'abiior-chat-form');
      const input = mk('input');
      input.type = 'text';
      input.placeholder = 'Say something';
      input.maxLength = 140;
      input.setAttribute('aria-label', 'Message');
      const send = mk('button', 'abiior-btn abiior-btn--fill abiior-btn--s', 'Send');
      send.type = 'submit';
      form.append(input, send);
      body.append(meter, log, form);
      let fond = 0, k = 0, typing = null;
      function say(who, t) {
        const m = mk('p', 'abiior-msg abiior-msg--' + who, t);
        log.append(m);
        log.scrollTop = log.scrollHeight;
      }
      function warm() {
        fond++;
        [...meter.children].forEach((c, n) => c.classList.toggle('is-on', n < Math.min(12, fond)));
        if (fond === 12) api.later(() => say('it', 'I have run out of room to like you more. Making room.'), 1400);
        if (fond > 12) { fond = 6; [...meter.children].forEach((c, n) => c.classList.toggle('is-on', n < fond)); }
      }
      function reply(text) {
        if (typing) typing.remove();
        typing = mk('p', 'abiior-msg abiior-msg--it abiior-typing');
        typing.append(mk('i'), mk('i'), mk('i'));
        log.append(typing);
        log.scrollTop = log.scrollHeight;
        const low = text.toLowerCase();
        let r;
        if (/\b(bye|goodbye|cya|later)\b/.test(low)) r = 'Bye is a strong word. See you soon is nicer.';
        else if (/\blove\b/.test(low)) r = 'Steady. I am only software. Very fond software.';
        else if (/\?\s*$/.test(text)) r = 'Yes. Whatever it was, yes.';
        else if (/\b(hi|hello|hey)\b/.test(low)) r = 'Hi. Hello. Sorry. Hi.';
        else if (k % 4 === 3) r = text.length + ' characters. My new favourite number.';
        else r = FOND[k % FOND.length];
        k++;
        api.later(() => {
          if (typing) { typing.remove(); typing = null; }
          say('it', r);
          warm();
          api.blip(0.5, 9 + (k % 5));
        }, rand(700, 1300));
      }
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = input.value.trim();
        if (!t) { input.focus(); return; }
        say('you', t);
        input.value = '';
        api.click(0.4);
        reply(t);
      });
      api.later(() => { say('it', "Oh. It's you. Hello."); warm(); api.blip(0.5, 9); }, 500);
    },
  };

  /* 15. I Always Wanna Die (Sometimes): a battery that runs low. Plug it in and it comes back. */
  TOYS[14] = {
    w: 360, h: 300, minW: 260, minH: 250,
    build(body, api) {
      body.classList.add('abiior-batt');
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 320 170');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML =
        '<rect x="28" y="38" width="150" height="74" fill="#fff" stroke="#0a0a0a" stroke-width="2.5"/>' +
        '<rect x="178" y="62" width="10" height="26" fill="#0a0a0a"/>' +
        '<g class="segs"></g>' +
        '<g class="sock"><rect x="262" y="40" width="40" height="60" fill="#fff" stroke="#0a0a0a" stroke-width="2"/>' +
        '<rect x="274" y="58" width="4" height="12" fill="#0a0a0a"/><rect x="286" y="58" width="4" height="12" fill="#0a0a0a"/></g>' +
        '<path class="cord" fill="none" stroke="#0a0a0a" stroke-width="2.5" stroke-linecap="round"/>' +
        '<g class="plug"><rect x="-14" y="-10" width="22" height="20" fill="#0a0a0a"/><rect x="8" y="-6" width="9" height="3" fill="#0a0a0a"/><rect x="8" y="3" width="9" height="3" fill="#0a0a0a"/></g>';
      const segs = svg.querySelector('.segs');
      for (let k = 0; k < 5; k++) {
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', String(36 + k * 28.4));
        r.setAttribute('y', '46');
        r.setAttribute('width', '24');
        r.setAttribute('height', '58');
        segs.append(r);
      }
      const cord = svg.querySelector('.cord');
      const plug = svg.querySelector('.plug');
      const line = mk('p', 'abiior-batt-line', 'Low. Sometimes.');
      const btn = mk('button', 'abiior-btn abiior-btn--s', 'Plug it in');
      btn.type = 'button';
      body.append(svg, line, btn);
      const SOCK = { x: 258, y: 64 };
      const REST = { x: 214, y: 148 };
      let px = REST.x, py = REST.y, plugged = false, level = 1, drag = null;
      function paint() {
        plug.setAttribute('transform', 'translate(' + px + ',' + py + ')');
        cord.setAttribute('d', 'M 100 112 C 100 160, ' + (px - 70) + ' ' + (py + 40) + ', ' + (px - 14) + ' ' + py);
        [...segs.children].forEach((r, k) => {
          r.setAttribute('fill', k < level ? (level <= 1 ? '#e62e2d' : api.color) : '#f1f1ee');
        });
        line.textContent = plugged
          ? (level >= 5 ? 'Full again. It comes back.' : 'Charging. Slowly is still charging.')
          : (level <= 1 ? 'Low. Sometimes.' : level >= 5 ? 'Full, for now.' : 'Running on what is left.');
        btn.textContent = plugged ? 'Unplug' : 'Plug it in';
        body.classList.toggle('is-low', level <= 1 && !plugged);
      }
      function setPlugged(v) {
        if (v === plugged) return;
        plugged = v;
        if (v) { px = SOCK.x; py = SOCK.y; api.click(1); api.blip(0.6, 5); }
        paint();
      }
      function toSvg(e) {
        const m = svg.getScreenCTM();
        if (!m) return { x: 0, y: 0 };
        const p = svg.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        const r = p.matrixTransform(m.inverse());
        return { x: r.x, y: r.y };
      }
      plug.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { plug.setPointerCapture(e.pointerId); } catch (err) {}
        const p = toSvg(e);
        drag = { dx: px - p.x, dy: py - p.y, id: e.pointerId };
        if (plugged) { plugged = false; paint(); }
      });
      plug.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const p = toSvg(e);
        px = clamp(p.x + drag.dx, 20, 300);
        py = clamp(p.y + drag.dy, 20, 160);
        if (Math.hypot(px - SOCK.x, py - SOCK.y) < 22) { drag = null; setPlugged(true); return; }
        paint();
      });
      const drop = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
      plug.addEventListener('pointerup', drop);
      plug.addEventListener('pointercancel', drop);
      btn.addEventListener('click', () => {
        if (plugged) { plugged = false; px = REST.x; py = REST.y; paint(); api.click(0.6); }
        else setPlugged(true);
      });
      api.every(() => {
        if (plugged && level < 5) {
          level++;
          api.blip(0.55, 4 + level);
          paint();
        }
      }, 900);
      api.every(() => {
        if (!plugged && level > 1) { level--; paint(); }
      }, 5000);
      paint();
    },
  };

  /* ---------------- mount / unmount ---------------- */

  function loop(now) {
    if (!S || !S.alive) return;
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (S.lastT || now)) / 1000);
    S.lastT = now;
    for (const w of S.wins) {
      if (!w.alive) continue;
      w.tickers.forEach((f) => { try { f(dt, now); } catch (err) { console.error(err); w.tickers.delete(f); } });
    }
  }

  window.Eras.register(ID, {
    mount(root, ctx) {
      S = {
        root, ctx, audio: ctx.audio, alive: true,
        timers: new Set(), intervals: new Set(), offs: [],
        wins: [], squares: [], z: 10, front: null, raf: 0, lastT: 0,
        vw: 0, vh: 0, tall: false, px: 0, py: 0, lastInput: performance.now(),
        ghost: null, room: null, justDragged: false,
        stats: { started: performance.now(), opened: 0, closed: 0, drags: 0, resizes: 0, rehangs: 0, hovers: {}, first: null, last: null, mistakes: 0, squareDrags: 0 },
      };
      root.classList.add('abiior-room');
      ctx.setChromeInk(INK);
      buildWall();
      layout();
      updateSquares();

      let rt = 0;
      listen(window, 'resize', () => {
        clearTimeout(rt);
        rt = later(() => {
          layout();
          S.wins.forEach((w) => { clampWin(w); place(w); if (w.toy.resize) w.toy.resize(); });
        }, 120);
      });
      listen(window, 'pointermove', (e) => { S.px = e.clientX; S.py = e.clientY; S.lastInput = performance.now(); }, { passive: true });
      listen(window, 'keydown', () => { S.lastInput = performance.now(); });
      root.addEventListener('scroll', () => { root.scrollTop = 0; root.scrollLeft = 0; });
      S.px = window.innerWidth / 2;
      S.py = window.innerHeight / 2;

      S.offs.push(ctx.audio.onChange((on) => { if (on) startRoomTone(); else stopRoomTone(); }));
      if (ctx.audio.enabled) startRoomTone();

      every(haunt, 7000);
      S.raf = requestAnimationFrame(loop);
    },

    unmount() {
      if (!S) return;
      const s = S;
      s.wins.slice().forEach((w) => { destroyWin(w); w.el.remove(); });
      s.wins = [];
      stopRoomTone();
      s.alive = false;
      cancelAnimationFrame(s.raf);
      s.timers.forEach(clearTimeout);
      s.intervals.forEach(clearInterval);
      s.offs.forEach((f) => { try { f(); } catch (e) {} });
      if (s.ghost) s.ghost.remove();
      S = null;
    },
  });
})();
