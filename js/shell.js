/* Shell: five rectangles nested inside each other, forever. Scroll to fall through them,
   click the one in front to step inside. Each room is a module in eras/<id>/ that registers
   itself with Eras.register(id, { mount(root, ctx), unmount() }). */
(function () {
  'use strict';

  const ALBUMS = window.DISCOGRAPHY;
  const N = ALBUMS.length;
  const NEST = 2.1; // each rectangle is this many times smaller than the one around it
  const WORDS = { 11: 'eleven', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 22: 'twenty-two' };

  const $ = (s) => document.querySelector(s);
  const hub = $('#hub');
  const tunnel = $('#tunnel');
  const stage = $('#stage');
  const yearsNav = $('#years');
  const hint = $('#hub-hint');
  const leaveBtn = $('#leave');
  const soundBtn = $('#sound');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');

  const mod = (a, n) => ((a % n) + n) % n;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------------- room registry ---------------- */

  const registry = {};
  const loading = {};
  window.Eras = {
    register(id, api) { registry[id] = api; },
  };

  function loadEra(id) {
    if (loading[id]) return loading[id];
    const css = new Promise((res) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'eras/' + id + '/era.css';
      l.onload = l.onerror = () => res();
      document.head.appendChild(l);
    });
    const js = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'eras/' + id + '/era.js';
      s.onload = () => res();
      s.onerror = () => rej(new Error('could not load eras/' + id + '/era.js'));
      document.head.appendChild(s);
    });
    loading[id] = Promise.all([css, js]);
    return loading[id];
  }

  const missing = {
    mount(root, ctx) {
      const p = document.createElement('p');
      p.className = 'era-missing';
      p.style.color = ctx.album.ink;
      p.textContent = 'This room has not been built yet.';
      root.appendChild(p);
    },
    unmount() {},
  };

  /* ---------------- portals ---------------- */

  let geom = null;
  const portals = [];

  function measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // The rectangle takes the window's own proportions, so the album around it always fills the screen.
    // Always taller than wide, like the band's own box. On a phone it takes the screen's proportions.
    const aspect = Math.min(0.72, clamp(vw / vh, 0.42, 2.4));
    const W = Math.round(Math.min(0.64 * vw, 0.7 * vh * aspect));
    const H = Math.round(W / aspect);
    const VW = aspect >= 1 ? 1500 : 1000;
    const VH = Math.round(VW / aspect);
    return { vw, vh, aspect, W, H, VW, VH };
  }

  function squares(g) {
    const pal = ['#e5352b', '#f2a104', '#ffd60a', '#3aa655', '#2a6fdb', '#7b4fc4', '#ef6ea6', '#0a0a0a', '#a3a8ad', '#2fb5c2'];
    let seed = 1975;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const s = 24;
    const inset = 16;
    const out = [];
    const put = (x, y) => out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s}" height="${s}" fill="${pal[Math.floor(rnd() * pal.length)]}"/>`);
    const nx = Math.floor((g.VW - inset * 2) / (s * 2));
    const ny = Math.floor((g.VH - inset * 2) / (s * 2));
    const sx = (g.VW - inset * 2 - s) / nx;
    const sy = (g.VH - inset * 2 - s) / ny;
    for (let i = 0; i <= nx; i++) { put(inset + i * sx, inset); put(inset + i * sx, g.VH - inset - s); }
    for (let j = 1; j < ny; j++) { put(inset, inset + j * sy); put(g.VW - inset - s, inset + j * sy); }
    return out.join('');
  }

  function frame(id, g) {
    const { VW, VH } = g;
    if (id === 'st') return `<rect class="tube" x="0" y="0" width="${VW}" height="${VH}"/>`;
    if (id === 'iliwys') {
      return `<rect class="tube" x="0" y="0" width="${VW}" height="${VH}" rx="6"/>` +
        `<rect class="core" x="0" y="0" width="${VW}" height="${VH}" rx="6"/>`;
    }
    if (id === 'abiior') return squares(g);
    if (id === 'noacf') {
      return `<rect class="rule" x="5" y="5" width="${VW - 10}" height="${VH - 10}" stroke-width="10"/>` +
        `<rect class="rule" x="26" y="26" width="${VW - 52}" height="${VH - 52}" stroke-width="2"/>`;
    }
    return `<rect class="mat" x="17" y="17" width="${VW - 34}" height="${VH - 34}" stroke-width="34"/>` +
      `<rect class="hair" x="35" y="35" width="${VW - 70}" height="${VH - 70}"/>`;
  }

  const TYPE = {
    st: { size: 46, meta: 27, upper: true },
    iliwys: { size: 50, meta: 30 },
    abiior: { size: 56, meta: 30 },
    noacf: { size: 50, meta: 30 },
    bfiafl: { size: 68, meta: 38 },
  };

  function art(album, g) {
    const { VW, VH } = g;
    const tall = VW < 1500;
    const t = { ...TYPE[album.id] };
    if (tall) { t.size = Math.round(t.size * 1.22); t.meta = Math.round(t.meta * 1.6); }
    const m = 78;
    const top = 132;
    const title = t.upper ? album.title.toUpperCase() : album.title;
    const count = WORDS[album.tracks.length] || String(album.tracks.length);
    const meta = t.upper ? `${album.year}, ${count} songs`.toUpperCase() : `${album.year}, ${count} songs`;
    const cue = t.upper ? 'STEP INSIDE' : 'step inside';
    const pid = 'run-' + album.id;
    // The title runs along the top edge and, if it is long enough, turns the corner and heads down the right side.
    // in a tall rectangle the title turns the corner sooner, so keep it clear of the frame on the right
    const mr = tall ? Math.max(m, Math.round(t.size * 0.75) + 50) : m;
    const run = `M ${m} ${top} H ${VW - mr - 34} Q ${VW - mr} ${top} ${VW - mr} ${top + 34} V ${VH - 170}`;
    return `<svg class="portal__art" viewBox="0 0 ${VW} ${VH}" aria-hidden="true">` +
      `<defs><path id="${pid}" d="${run}"/></defs>` +
      frame(album.id, g) +
      `<text font-size="${t.size}"><textPath href="#${pid}">${esc(title)}</textPath></text>` +
      (tall
        ? `<text font-size="${t.meta}" x="${m}" y="${VH - 76 - Math.round(t.meta * 1.45)}">${esc(meta)}</text>` +
          `<text class="portal__cue" font-size="${t.meta}" x="${m}" y="${VH - 76}">${cue}</text>`
        : `<text font-size="${t.meta}" x="${m}" y="${VH - 76}">${esc(meta)}</text>` +
          `<text class="portal__cue" font-size="${t.meta}" x="${VW - m}" y="${VH - 76}" text-anchor="end">${cue}</text>`) +
      `</svg>`;
  }

  function build() {
    geom = measure();
    tunnel.textContent = '';
    portals.length = 0;
    ALBUMS.forEach((album, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'portal portal--' + album.id;
      b.dataset.id = album.id;
      b.setAttribute('aria-label', `${album.title}, ${album.year}. Step inside.`);
      b.style.width = geom.W + 'px';
      b.style.height = geom.H + 'px';
      b.style.marginLeft = -geom.W / 2 + 'px';
      b.style.marginTop = -geom.H / 2 + 'px';
      b.innerHTML = '<span class="portal__fill"></span>' + art(album, geom);
      b.addEventListener('click', () => {
        if (dragged) return;
        // The front rectangle and everything nested in it are one target: step inside the front one.
        // Only the album surrounding it (already behind you) is a way back.
        const d = depth(i);
        if (d > -0.5) enter(mod(Math.round(target), N));
        else travel(Math.round(p + d));
      });
      tunnel.appendChild(b);
      portals.push({ el: b, art: b.querySelector('.portal__art') });
    });
    dirty = true;
  }

  function buildYears() {
    ALBUMS.forEach((album, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = album.year;
      b.setAttribute('aria-label', `${album.year}, ${album.title}`);
      b.addEventListener('click', () => travelTo(i));
      yearsNav.appendChild(b);
    });
  }

  /* ---------------- falling through ---------------- */

  let p = 0;          // where we are: 0 = the 2013 rectangle is in front, 1 = 2016, ... wraps
  let target = 0;
  let dirty = true;
  let lastT = 0;
  let front = -1;
  let surround = -1;
  let snapTimer = 0;
  let dragged = false;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let mode = 'hub';   // 'hub' | 'busy' | 'era'
  let current = null;
  let hubSound = null;

  const depth = (i) => mod(i - p + 2.5, N) - 2.5;

  function travel(t) {
    target = t;
    dirty = true;
  }

  function travelTo(i) {
    const d = mod(i - target + 2.5, N) - 2.5;
    travel(Math.round(target + d));
  }

  function settle() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => travel(Math.round(target)), 170);
  }

  function chime(i) {
    if (!window.Sound.enabled) return;
    if (!hubSound) hubSound = window.Sound.scope();
    const notes = [196, 233.08, 261.63, 311.13, 349.23];
    hubSound.tone({ freq: notes[i], type: 'sine', dur: 1.6, gain: 0.07, attack: 0.04, release: 1.4 });
    hubSound.tone({ freq: notes[i] * 2.005, type: 'triangle', dur: 1.1, gain: 0.03, attack: 0.02, release: 1 });
  }

  function render(now) {
    requestAnimationFrame(render);
    if (mode === 'era') return;
    step(now);
  }

  function step(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;

    if (p !== target) {
      p += (target - p) * (reduced.matches ? 1 : 1 - Math.exp(-dt * 7));
      if (Math.abs(target - p) < 0.0004) p = target;
      dirty = true;
    }
    const ex = pointer.x - pointer.sx;
    const ey = pointer.y - pointer.sy;
    if (Math.abs(ex) + Math.abs(ey) > 0.0005) {
      pointer.sx += ex * 0.08;
      pointer.sy += ey * 0.08;
      dirty = true;
    }
    if (dirty) paint();
  }

  function paint() {
    dirty = false;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let back = 0;       // the rectangle furthest behind us
    let backD = 9;
    let corner = -1;    // the nearest rectangle big enough to fill the window's corners
    let cornerD = -9;
    let middle = -1;    // the nearest one tall enough to sit behind the hint at the bottom
    let middleD = -9;
    for (let i = 0; i < N; i++) {
      const d = depth(i);
      const { el, art: a } = portals[i];
      const s = Math.pow(NEST, -d);
      const drift = reduced.matches ? 0 : 16 * d;
      if (d < backD) { backD = d; back = i; }
      if (d < -0.25 && geom.H * s >= vh) {
        if (d > middleD) { middleD = d; middle = i; }
        if (geom.W * s >= vw && d > cornerD) { cornerD = d; corner = i; }
      }
      el.style.transform = `translate3d(${(pointer.sx * drift).toFixed(2)}px, ${(pointer.sy * drift).toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
      el.style.zIndex = String(100 + Math.round(d * 10));
      // Never fully opaque: an opaque layer makes the compositor cut the one beneath it into strips, which leaves seams.
      el.style.opacity = clamp((2.5 - d) / 0.35, 0, 0.999).toFixed(3);
      const ao = clamp(1 + d * 2.6, 0, 1);
      a.style.opacity = ao.toFixed(3);
      a.style.visibility = ao === 0 ? 'hidden' : 'visible';
      el.tabIndex = Math.abs(d) < 0.5 ? 0 : -1;
    }
    // Whatever was behind the furthest rectangle is the album before it; the page takes that colour,
    // so nothing jumps when a rectangle wraps round from the back to the middle.
    const beyond = mod(back - 1, N);
    document.body.style.backgroundColor = ALBUMS[beyond].ground;

    const f = mod(Math.round(p), N);
    if (f !== front) {
      if (front !== -1) chime(f);
      front = f;
      portals.forEach((o, i) => o.el.classList.toggle('is-current', i === f));
      [...yearsNav.children].forEach((b, i) => b.setAttribute('aria-current', i === f ? 'true' : 'false'));
    }
    // The corner controls and the hint each take the ink of whatever is actually behind them.
    const ink = (corner === -1 ? beyond : corner) * N + (middle === -1 ? beyond : middle);
    if (ink !== surround) {
      surround = ink;
      const root = document.documentElement.style;
      root.setProperty('--hub-ink', ALBUMS[corner === -1 ? beyond : corner].ink);
      root.setProperty('--hub-ink-mid', ALBUMS[middle === -1 ? beyond : middle].ink);
    }
  }

  /* ---------------- input ---------------- */

  hub.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (mode !== 'hub') return;
    const unit = e.deltaMode === 1 ? 32 : 1;
    travel(target + clamp(e.deltaY * unit, -160, 160) * 0.0019);
    settle();
  }, { passive: false });

  let drag = null;
  hub.addEventListener('pointerdown', (e) => {
    dragged = false;
    if (mode !== 'hub' || e.pointerType === 'mouse') return;
    drag = { y: e.clientY, t: target };
  });
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (!drag) return;
    const dy = drag.y - e.clientY;
    if (Math.abs(dy) > 8) dragged = true;
    if (dragged) travel(drag.t + dy / (window.innerHeight * 0.42));
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    travel(Math.round(target));
    setTimeout(() => { dragged = false; }, 0);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (mode === 'era') {
      if (e.key === 'Escape' && !e.defaultPrevented) leave();
      return;
    }
    if (mode !== 'hub') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') { travel(Math.round(target) + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') { travel(Math.round(target) - 1); e.preventDefault(); }
    else if (e.key === 'Enter' && !(document.activeElement && document.activeElement.closest('button'))) { enter(mod(Math.round(target), N)); }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  });

  /* ---------------- stepping inside ---------------- */

  function rectOf(i) {
    const r = portals[i].el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return `inset(${Math.max(0, r.top)}px ${Math.max(0, vw - r.right)}px ${Math.max(0, vh - r.bottom)}px ${Math.max(0, r.left)}px)`;
  }

  function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    leaveBtn.hidden = m === 'hub';
    if (m === 'hub') { dirty = true; }
  }

  function animateClip(root, from, to, ms) {
    return new Promise((res) => {
      if (reduced.matches || ms === 0 || !root.animate) { root.style.clipPath = to === 'inset(0px)' ? '' : to; res(); return; }
      const a = root.animate([{ clipPath: from }, { clipPath: to }], { duration: ms, easing: 'cubic-bezier(.72,0,.18,1)', fill: 'forwards' });
      a.onfinish = () => { root.style.clipPath = to === 'inset(0px)' ? '' : to; a.cancel(); res(); };
    });
  }

  async function enter(i, instant) {
    if (mode !== 'hub') return;
    setMode('busy');
    const album = ALBUMS[i];
    // put this album's rectangle squarely in front before opening it
    target = p = Math.round(p + depth(i));
    paint();

    const root = document.createElement('div');
    root.className = 'era-root era-' + album.id;
    root.dataset.era = album.id;
    root.style.background = album.ground;
    root.style.color = album.ink;
    const from = rectOf(i);
    root.style.clipPath = from;
    stage.appendChild(root);

    let api;
    try {
      await loadEra(album.id);
      api = registry[album.id];
      if (!api) throw new Error('eras/' + album.id + '/era.js did not call Eras.register("' + album.id + '", …)');
    } catch (err) {
      console.warn(err.message);
      api = missing;
    }

    const audio = window.Sound.scope();
    const ctx = {
      album,
      tracks: album.tracks,
      albums: ALBUMS,
      audio,
      get reducedMotion() { return reduced.matches; },
      exit: () => leave(),
      listenUrl: (track) => 'https://open.spotify.com/search/' + encodeURIComponent(track.title + ' The 1975'),
      setChromeInk: (c) => document.documentElement.style.setProperty('--chrome-ink', c),
    };
    document.documentElement.style.setProperty('--chrome-ink', album.ink);
    try {
      api.mount(root, ctx);
    } catch (err) {
      console.error(err);
      root.textContent = '';
      api = missing;
      api.mount(root, ctx);
    }
    current = { i, album, root, api, audio };
    if (location.hash !== '#/' + album.id) history.pushState(null, '', '#/' + album.id);
    document.title = album.title + ' (' + album.year + ')';

    const ms = instant ? 0 : 950;
    if (ms && !reduced.matches) {
      hub.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0.2 }], { duration: ms, easing: 'cubic-bezier(.72,0,.18,1)' });
    }
    await animateClip(root, from, 'inset(0px)', ms);
    hub.style.visibility = 'hidden';
    setMode('era');
  }

  async function leave(instant) {
    if (mode !== 'era' || !current) return;
    setMode('busy');
    const c = current;
    current = null;
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    document.title = 'The 1975, in five rectangles';
    hub.style.visibility = '';
    lastT = performance.now();
    // lay the hub out so the rectangle we are shrinking into is measurable
    p = target = Math.round(p + depth(c.i));
    paint();
    const to = rectOf(c.i);
    const ms = instant ? 0 : 800;
    if (ms && !reduced.matches) {
      hub.animate([{ transform: 'scale(1.6)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms, easing: 'cubic-bezier(.72,0,.18,1)' });
    }
    await animateClip(c.root, 'inset(0px)', to, ms);
    try { c.api.unmount(); } catch (err) { console.error(err); }
    c.audio._dispose();
    c.root.remove();
    setMode('hub');
  }

  function route() {
    const id = (location.hash.match(/^#\/([a-z]+)/) || [])[1];
    const i = ALBUMS.findIndex((a) => a.id === id);
    if (i === -1) {
      if (mode === 'era') leave();
      return;
    }
    if (mode === 'hub') enter(i, true);
    else if (mode === 'era' && current && current.i !== i) leave(true).then(() => enter(i, true));
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);

  leaveBtn.addEventListener('click', () => leave());

  function paintSound(on) {
    soundBtn.textContent = on ? 'sound on' : 'sound off';
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  soundBtn.addEventListener('click', () => window.Sound.toggle());
  window.Sound.onChange(paintSound);

  /* ---------------- go ---------------- */

  hint.textContent = coarse.matches
    ? 'Drag to fall through the years. Tap to step inside.'
    : 'Scroll to fall through the years. Click the rectangle to step inside.';

  setMode('hub');
  buildYears();
  build();
  requestAnimationFrame(render);
  route();
})();
