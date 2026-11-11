/* I like it when you sleep, for you are so beautiful yet so unaware of it (2016).
   A dream that breathes. The room inhales and exhales like a sleeper; the songs are
   lights adrift in pink haze that you can catch, throw and bump together. The title
   track is the horizon. Leave the room alone and the sleeper sinks deeper (things float
   up, the haze turns lilac); startle it and it wakes (things fall, the light goes hot). */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : Math.round(clamp(a, 0, 1) * 1000) / 1000) + ')';

  const C = {
    white: [255, 255, 255],
    powder: hex('#fdeef4'),
    blush: hex('#f6cedb'),
    baby: hex('#f9b4cd'),
    pink: hex('#ff6fb1'),
    hot: hex('#ff2d95'),
    ink: hex('#c4006a'),
    lilac: hex('#d6c3f5'),
    blue: hex('#c4dcf7'),
    cream: hex('#fff6f2'),
    rose: hex('#f08db4'),
    gum: hex('#ff94cb'),
    peach: hex('#ffd2dc'),
  };

  // D major pentatonic, so anything played against anything stays consonant.
  const SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];
  const STATES = [[0.15, 'wide awake'], [0.35, 'stirring'], [0.6, 'drifting off'], [0.82, 'dreaming'], [9, 'fast asleep']];

  const KIND = { 1: 'frame', 2: 'mirror', 3: 'ugh', 4: 'heart', 5: 'gum', 6: 'ghost', 7: 'pearl', 8: 'torso', 9: 'brain', 10: 'other', 11: 'pair', 12: 'horizon', 13: 'ring', 14: 'dream', 15: 'paris', 16: 'yarn', 17: 'lay' };
  const SIZE = { 1: 1.05, 2: 1, 3: 0.88, 4: 1, 5: 0.82, 6: 0.95, 7: 0.78, 8: 0.92, 9: 1.02, 10: 0.88, 11: 0.82, 13: 1, 14: 1.25, 15: 0.8, 16: 0.84, 17: 1.12 };
  // How high each thing likes to float when the sleeper is deep (0 = top, 1 = horizon).
  const HOME = { 1: 0.35, 2: 0.2, 3: 0.62, 4: 0.3, 5: 0.55, 6: 0.15, 7: 0.42, 8: 0.7, 9: 0.48, 10: 0.25, 11: 0.58, 13: 0.4, 14: 0.05, 15: 0.75, 16: 0.82, 17: 0.95 };
  // Where across the room each one starts, so the first frame is already a composition.
  const HOMEX = { 1: 0.18, 2: 0.42, 3: 0.08, 4: 0.64, 5: 0.86, 6: 0.3, 7: 0.53, 8: 0.74, 9: 0.33, 10: 0.92, 11: 0.58, 13: 0.12, 14: 0.77, 15: 0.46, 16: 0.24, 17: 0.68 };

  let room = null;

  function glowSprite(col) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(col, 1));
    gr.addColorStop(0.22, rgba(col, 0.55));
    gr.addColorStop(0.55, rgba(col, 0.14));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  function createRoom(root, ctx) {
    const audio = ctx.audio;
    const tracks = ctx.tracks;
    const cleanups = [];
    const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); cleanups.push(() => el.removeEventListener(ev, fn, opt)); };

    /* ---------------- DOM ---------------- */

    const stage = document.createElement('div');
    stage.className = 'iliwys-stage';
    const canvas = document.createElement('canvas');
    canvas.className = 'iliwys-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);
    const g = canvas.getContext('2d');

    const keys = document.createElement('div');
    keys.className = 'iliwys-keys';
    stage.appendChild(keys);

    const label = document.createElement('div');
    label.className = 'iliwys-label';
    label.setAttribute('aria-hidden', 'true');
    stage.appendChild(label);

    const titleTrack = tracks.find((t) => KIND[t.n] === 'horizon') || tracks[11];
    const horizonBtn = document.createElement('button');
    horizonBtn.type = 'button';
    horizonBtn.className = 'iliwys-horizon';
    horizonBtn.textContent = titleTrack ? titleTrack.title : ctx.album.title;
    horizonBtn.setAttribute('aria-label', (titleTrack ? titleTrack.n + '. ' + titleTrack.title : ctx.album.title) + '. The horizon. Press to send weather across it.');
    stage.appendChild(horizonBtn);

    const foot = document.createElement('div');
    foot.className = 'iliwys-foot';
    const whisper = document.createElement('p');
    whisper.className = 'iliwys-whisper';
    whisper.innerHTML = '<span>Everything here floats. Catch a light, throw it softly.</span>' +
      '<span>Hold the haze to lull the sleeper; tap it twice to wake them.</span>';
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'iliwys-eye';
    eye.innerHTML = '<svg viewBox="0 0 40 24" aria-hidden="true"><path class="lid-u" d=""/><path class="lid-l" d=""/>' +
      '<circle cx="20" cy="12" r="4.2"/><line x1="12" y1="15" x2="10.5" y2="18.5"/><line x1="20" y1="16.2" x2="20" y2="20"/><line x1="28" y1="15" x2="29.5" y2="18.5"/></svg>' +
      '<span class="iliwys-eye-word"></span>';
    foot.appendChild(whisper);
    foot.appendChild(eye);
    stage.appendChild(foot);

    const live = document.createElement('p');
    live.className = 'iliwys-sr';
    live.setAttribute('aria-live', 'polite');
    stage.appendChild(live);

    root.appendChild(stage);
    // read-only peek for testing
    stage.iliwysPeek = () => ({ depth, head: songs.filter((b) => b.kind === 'torso').map((b) => b.attached), bodies: songs.map((b) => ({ n: b.track.n, x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.pr) })) });

    const lidU = eye.querySelector('.lid-u');
    const lidL = eye.querySelector('.lid-l');
    const pupil = eye.querySelector('circle');
    const lashes = eye.querySelectorAll('line');
    const eyeWord = eye.querySelector('.iliwys-eye-word');

    /* ---------------- world state ---------------- */

    let W = 0, H = 0, dpr = 1, R = 30;
    let t = 0;
    let phase = 0;            // breath phase
    let breath = 0;           // -1 exhaled .. 1 inhaled
    let depth = 0.62;         // 0 wide awake .. 1 fast asleep
    let depthGoal = null;
    let idle = 0;             // seconds since the visitor last did anything
    let flash = 0;
    let hTop = 0;             // y of the horizon line
    let floorY = 0;
    let sweep = null;         // weather crossing the horizon
    let raf = 0;
    let last = 0;
    let lastTouched = null;
    let stateWord = '';
    let eyeOpen = -1;
    const glows = { white: glowSprite(C.white), hot: glowSprite(C.hot), pink: glowSprite(C.pink), lilac: glowSprite(C.lilac), blue: glowSprite(C.blue) };

    const haze = document.createElement('canvas');
    const hg = haze.getContext('2d');

    const bodies = [];
    const songs = [];          // one entry per track (except the horizon), each a body
    const particles = [];
    const ripples = [];
    const motes = [];

    const reduced = () => !!ctx.reducedMotion;

    let seed = 2016;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

    /* ---------------- sound ---------------- */

    const snd = {
      n: null,
      ok() { return !!(this.n && audio.enabled && audio.ctx); },
      start() {
        if (this.n) return;
        let ac, out;
        try { ac = audio.ctx; out = audio.out; } catch (e) { return; }
        if (!ac || !out) return;
        try {
          const n = { ac, oscs: [] };
          n.master = ac.createGain();
          n.master.gain.value = 0.0001;
          n.master.connect(out);
          n.master.gain.setTargetAtTime(1, ac.currentTime, 1.2);
          // a soft echo chamber the bells fall into
          n.send = ac.createGain(); n.send.gain.value = 1;
          n.d1 = ac.createDelay(1.5); n.d1.delayTime.value = 0.41;
          n.d2 = ac.createDelay(1.5); n.d2.delayTime.value = 0.63;
          n.fb = ac.createGain(); n.fb.gain.value = 0.42;
          n.damp = ac.createBiquadFilter(); n.damp.type = 'lowpass'; n.damp.frequency.value = 2600;
          n.wet = ac.createGain(); n.wet.gain.value = 0.32;
          n.send.connect(n.d1); n.send.connect(n.d2);
          n.d1.connect(n.damp); n.d2.connect(n.damp);
          n.damp.connect(n.fb); n.fb.connect(n.d1);
          n.damp.connect(n.wet); n.wet.connect(n.master);
          // the glassy pad
          n.padF = ac.createBiquadFilter(); n.padF.type = 'lowpass'; n.padF.frequency.value = 700; n.padF.Q.value = 0.4;
          n.pad = ac.createGain(); n.pad.gain.value = 0.0001;
          n.padF.connect(n.pad); n.pad.connect(n.master); n.pad.connect(n.send);
          n.pad.gain.setTargetAtTime(0.5, ac.currentTime, 2);
          [[146.83, 'sine', 0.05], [220, 'triangle', 0.024], [293.66, 'sine', 0.03], [369.99, 'triangle', 0.016], [440, 'sine', 0.014], [659.25, 'sine', 0.007]].forEach((v, i) => {
            const o = ac.createOscillator();
            o.type = v[1];
            o.frequency.value = v[0];
            o.detune.value = (i % 2 ? 1 : -1) * (3 + i);
            const og = ac.createGain(); og.gain.value = v[2];
            o.connect(og); og.connect(n.padF);
            o.start();
            n.oscs.push(o);
          });
          // the breath: looped noise through a slow filter
          const len = ac.sampleRate * 2;
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          n.noise = ac.createBufferSource(); n.noise.buffer = buf; n.noise.loop = true;
          n.noiseF = ac.createBiquadFilter(); n.noiseF.type = 'bandpass'; n.noiseF.frequency.value = 700; n.noiseF.Q.value = 0.7;
          n.noiseG = ac.createGain(); n.noiseG.gain.value = 0.0001;
          n.noise.connect(n.noiseF); n.noiseF.connect(n.noiseG); n.noiseG.connect(n.master);
          n.noise.start();
          n.oscs.push(n.noise);
          n.lastSet = 0;
          this.n = n;
        } catch (e) { this.n = null; }
      },
      stop(now) {
        const n = this.n;
        if (!n) return;
        this.n = null;
        const kill = () => {
          n.oscs.forEach((o) => { try { o.stop(); } catch (e) {} });
          ['master', 'send', 'd1', 'd2', 'fb', 'damp', 'wet', 'padF', 'pad', 'noiseF', 'noiseG'].forEach((k) => { try { n[k].disconnect(); } catch (e) {} });
          n.oscs.forEach((o) => { try { o.disconnect(); } catch (e) {} });
        };
        if (now) { kill(); return; }
        try { n.master.gain.setTargetAtTime(0.0001, n.ac.currentTime, 0.12); } catch (e) {}
        setTimeout(kill, 600);
      },
      frame() {
        const n = this.n;
        if (!n) return;
        const now = n.ac.currentTime;
        if (now - n.lastSet < 0.08) return;
        n.lastSet = now;
        try {
          const inhale = (breath + 1) / 2;
          n.padF.frequency.setTargetAtTime(lerp(1500, 420, depth) * (0.8 + 0.4 * inhale), now, 0.25);
          n.pad.gain.setTargetAtTime(lerp(0.32, 0.6, depth), now, 0.5);
          n.noiseG.gain.setTargetAtTime((0.012 + 0.05 * inhale * inhale) * lerp(0.7, 1.1, depth), now, 0.2);
          n.noiseF.frequency.setTargetAtTime(lerp(500, 1300, inhale) * lerp(1.3, 0.8, depth), now, 0.3);
        } catch (e) {}
      },
      bell(freq, gain, pan, dur, when) {
        if (!this.ok()) return;
        const n = this.n;
        const ac = n.ac;
        try {
          const t0 = ac.currentTime + (when || 0);
          dur = dur || 1.6;
          const out = ac.createGain();
          let tail = out;
          if (ac.createStereoPanner) {
            const p = ac.createStereoPanner();
            p.pan.value = clamp(pan || 0, -0.9, 0.9);
            out.connect(p);
            tail = p;
          }
          tail.connect(n.master);
          tail.connect(n.send);
          [[1, 1, dur], [2, 0.32, dur * 0.55], [3, 0.12, dur * 0.3], [4, 0.06, dur * 0.2]].forEach((v) => {
            const o = ac.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq * v[0];
            const gg = ac.createGain();
            gg.gain.setValueAtTime(0.0001, t0);
            gg.gain.linearRampToValueAtTime(gain * v[1], t0 + 0.006);
            gg.gain.exponentialRampToValueAtTime(0.0001, t0 + v[2]);
            o.connect(gg); gg.connect(out);
            o.start(t0); o.stop(t0 + v[2] + 0.05);
            o.onended = () => { try { gg.disconnect(); } catch (e) {} };
          });
          setTimeout(() => { try { tail.disconnect(); out.disconnect(); } catch (e) {} }, (dur + (when || 0)) * 1000 + 400);
        } catch (e) {}
      },
      glide(f0, f1, gain, dur) {
        if (!audio.enabled) return;
        try { audio.tone({ freq: f0, glideTo: f1, type: 'sine', dur: dur || 0.6, gain: gain || 0.04, attack: 0.02, release: (dur || 0.6) * 0.8 }); } catch (e) {}
      },
      hush(dur, freq, gain, type) {
        if (!audio.enabled) return;
        try { audio.noise({ dur: dur || 1.2, gain: gain || 0.05, type: type || 'lowpass', freq: freq || 900, q: 0.8, attack: (dur || 1.2) * 0.4 }); } catch (e) {}
      },
    };

    function noteOf(b) { return SCALE[(b.song.track.n * 3) % 9]; }
    function panOf(x) { return W ? (x / W) * 1.6 - 0.8 : 0; }

    /* ---------------- bodies ---------------- */

    function makeBody(track, kind, size) {
      const b = {
        track, kind, size, x: 0, y: 0, vx: 0, vy: 0, r: 30, pr: 30, rot: 0, vrot: 0, m: 1,
        held: null, ghost: false, heavy: 0, home: 0.5, homeX: 0.5, song: null, part: null, owner: null,
        w1: 0.2 + rnd() * 0.3, w2: 0.15 + rnd() * 0.25, p1: rnd() * TAU, p2: rnd() * TAU, s: {}, lastBump: 0, hover: 0, key: null,
        attached: true, glow: 0,
      };
      b.song = b;
      bodies.push(b);
      return b;
    }

    tracks.forEach((track) => {
      const kind = KIND[track.n] || 'frame';
      if (kind === 'horizon') return;
      const b = makeBody(track, kind, SIZE[track.n] || 1);
      b.home = HOME[track.n] == null ? rnd() : HOME[track.n];
      b.homeX = HOMEX[track.n] == null ? rnd() : HOMEX[track.n];
      songs.push(b);
      if (kind === 'torso') {
        const h = makeBody(track, 'head', 0.48);
        h.owner = b; h.song = b; b.part = h; h.m = 0.4;
      }
      if (kind === 'pair') {
        const p = makeBody(track, 'partner', 0.62);
        p.owner = b; p.song = b; b.part = p; p.m = 0.6;
      }
      if (kind === 'dream') b.ghost = true;
      if (kind === 'lay') { b.heavy = 260; b.m = 1.6; }
      if (kind === 'brain') { b.s.ang = 0; b.s.mx = 0; b.s.my = 0; b.s.mvx = 0; b.s.mvy = 0; }
      if (kind === 'heart') { b.s.m = 0; b.s.goal = 0; }
      if (kind === 'gum') { b.s.inf = 1; }
      if (kind === 'ghost') { b.s.belief = 0; }
      if (kind === 'pearl') { b.s.veil = 1; b.s.bare = 0; }
      if (kind === 'other') { b.s.form = 2; b.s.prev = -1; b.s.fade = 0; b.s.seen = 0; }
      if (kind === 'ugh') { b.s.agit = 0; b.s.next = 2; b.s.pts = []; b.s.regen = 0; }
      if (kind === 'frame') { b.s.flick = 0.9; }
      if (kind === 'ring') { b.s.emit = 0; }
      if (kind === 'yarn') { b.s.trail = []; }
    });
    // Draw the lying-down one first, the dream last, so the dream floats over everything.
    bodies.sort((a, b) => order(a) - order(b));
    function order(b) { return b.kind === 'lay' ? 0 : b.kind === 'dream' ? 3 : b.owner ? 2 : 1; }

    function radiusFor(b) { return R * b.size; }

    function layout(first) {
      const oldW = W, oldH = H;
      W = Math.max(1, root.clientWidth);
      H = Math.max(1, root.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      haze.width = Math.max(8, Math.ceil(W / 14));
      haze.height = Math.max(8, Math.ceil(H / 14));
      R = clamp(Math.min(W, H * 1.15) * 0.046, 22, 50);
      computeHorizon();
      bodies.forEach((b) => { b.r = radiusFor(b); b.pr = b.r; });
      if (first) {
        songs.forEach((b) => {
          b.x = 40 + b.homeX * (W - 80);
          b.y = homeY(b, depthFloat());
          b.vx = (rnd() - 0.5) * 20;
          b.vy = (rnd() - 0.5) * 20;
          b.rot = (rnd() - 0.5) * 0.4;
          if (b.part) { b.part.x = b.x + b.r * 1.6; b.part.y = b.y - b.r * 1.1; }
        });
        for (let i = 0; i < 46; i++) motes.push({ x: rnd(), y: rnd(), z: 0.3 + rnd() * 0.7, p: rnd() * TAU, s: 0.6 + rnd() * 1.6 });
      } else if (oldW && oldH) {
        bodies.forEach((b) => { b.x *= W / oldW; b.y *= H / oldH; });
      }
      bodies.forEach(keepInside);
      // the keyboard handles need to know the size of what they sit on
      songs.forEach((b) => { if (b.key) { const s = Math.round(b.r * 2.3); b.key.style.width = s + 'px'; b.key.style.height = s + 'px'; } });
    }

    function computeHorizon() {
      const base = W < 600 ? 0.24 : 0.215;
      hTop = H * (1 - lerp(base, base + 0.05, depth)) - (reduced() ? 0 : breath * 5) - (sweep ? Math.sin(sweep.p * Math.PI) * H * 0.05 : 0);
      floorY = hTop + 4;
    }

    function depthFloat() { return smooth(0.1, 0.5, depth); }

    function homeY(b, f) {
      const top = 78;
      const free = Math.max(40, floorY - top - b.pr);
      const float = top + b.home * free;
      return lerp(floorY - b.pr, float, f);
    }

    function keepInside(b) {
      b.x = clamp(b.x, b.pr, Math.max(b.pr, W - b.pr));
      b.y = clamp(b.y, b.pr, Math.max(b.pr, floorY - b.pr * 0.5));
    }

    /* ---------------- keyboard handles ---------------- */

    let focused = null;
    songs.forEach((b) => {
      const k = document.createElement('button');
      k.type = 'button';
      k.className = 'iliwys-key';
      k.textContent = b.track.n + '. ' + b.track.title;
      k.setAttribute('aria-label', b.track.n + '. ' + b.track.title);
      b.key = k;
      on(k, 'focus', () => { focused = b; b.hover = 1; placeKey(b); if (b.kind === 'other') becomeSomebodyElse(b); });
      on(k, 'blur', () => { if (focused === b) focused = null; });
      on(k, 'keydown', (e) => {
        const push = 320;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          poke(b);
        } else if (e.key === 'ArrowLeft') { e.preventDefault(); b.vx -= push; stir(0.01); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); b.vx += push; stir(0.01); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); b.vy -= push * 1.3; stir(0.01); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); b.vy += push; stir(0.01); }
      });
      keys.appendChild(k);
    });
    // The horizon button sits in track order: after 11, before 13.
    const k13 = songs.find((b) => b.track.n === 13);
    if (k13) keys.insertBefore(horizonBtn, k13.key);
    on(horizonBtn, 'click', () => { startSweep(W / 2); touched(titleTrack); });

    function placeKey(b) {
      if (!b.key) return;
      const s = b.r * 2.3;
      b.key.style.transform = 'translate3d(' + (b.x - s / 2).toFixed(1) + 'px,' + (b.y - s / 2).toFixed(1) + 'px,0)';
    }

    function poke(b) {
      touch(b, true);
      b.vy -= 520 + rnd() * 200;
      b.vx += (rnd() - 0.5) * 300;
      b.vrot += (rnd() - 0.5) * 6;
      release(b, 600);
    }

    /* ---------------- per-song character ---------------- */

    function becomeSomebodyElse(b) {
      const s = b.s;
      s.prev = s.form;
      let f = s.form;
      while (f === s.form) f = Math.floor(rnd() * 6);
      s.form = f;
      s.fade = 1;
      snd.bell(SCALE[2 + f], 0.05, panOf(b.x), 1.4);
    }

    function emitRipple(x, y, power, push) {
      if (ripples.length > 14) ripples.shift();
      ripples.push({ x, y, r: R * 0.6, life: 1, power: power || 1, push: !!push, hit: new Set() });
    }

    function burst(x, y, col, n, speed, size) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU;
        const v = speed * (0.4 + rnd() * 0.8);
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.7 + rnd() * 0.8, size: size * (0.6 + rnd() * 0.8), col, up: 0 });
      }
      if (particles.length > 260) particles.splice(0, particles.length - 260);
    }

    function touch(b, fromKey) {
      const s = b.song;
      s.glow = 1;
      idle = 0;
      touched(s.track);
      snd.bell(noteOf(b), 0.075, panOf(b.x), 2.2);
      snd.bell(noteOf(b) * 1.5, 0.025, panOf(b.x), 1.6, 0.09);
      switch (s.kind) {
        case 'frame': s.s.flick = 0.8; break;
        case 'heart': s.s.goal = s.s.goal ? 0 : 1; snd.bell(s.s.goal ? SCALE[1] : SCALE[3], 0.05, panOf(b.x), 2, 0.15); break;
        case 'ugh': s.s.agit = 1; huff(s); break;
        case 'pearl':
          if (s.s.veil > 0.5) {
            s.s.veil = 0; s.s.bare = 9;
            particles.push({ x: s.x, y: s.y, vx: (rnd() - 0.5) * 30, vy: -40, life: 1, decay: 0.28, size: s.r * 1.6, col: C.lilac, veil: true, rot: rnd() * TAU });
            snd.glide(587.33, 880, 0.03, 1.4);
          }
          break;
        case 'other': if (!fromKey) becomeSomebodyElse(s); break;
        case 'ring': emitRipple(s.x, s.y, 1.2, true); ringChord(s); break;
        case 'dream': emitRipple(s.x, s.y, 0.6, false); break;
        default: break;
      }
    }

    function release(b, speed) {
      const s = b.song;
      if (speed > 260) snd.glide(noteOf(b) * 0.5, noteOf(b) * 0.75, clamp(speed / 40000, 0.012, 0.04), 0.5);
      if (speed > 1400) stir(clamp(speed / 30000, 0.03, 0.09));
      if (s.kind === 'torso' && b === s && speed > 850 && s.attached) loseHead(s);
      if (s.kind === 'other' && b === s) { /* it will be someone else next time you look */ s.s.seen = 0; }
    }

    function huff(b) {
      b.s.agit = 1;
      b.vx += (rnd() - 0.5) * 220;
      b.vy -= 120;
      bodies.forEach((o) => {
        if (o === b || o.held) return;
        const dx = o.x - b.x, dy = o.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < b.r * 4) { o.vx += (dx / d) * 160; o.vy += (dy / d) * 160; }
      });
      snd.bell(SCALE[0] * 0.5, 0.05, panOf(b.x), 0.7);
      snd.hush(0.35, 1800, 0.035, 'bandpass');
    }

    function loseHead(b) {
      const h = b.part;
      if (!h) return;
      b.attached = false;
      b.s.lost = 0;
      h.vx = b.vx * 1.3 + (rnd() - 0.5) * 200;
      h.vy = b.vy * 1.3 - 380;
      h.vrot = (rnd() - 0.5) * 9;
      snd.glide(880, 330, 0.045, 0.9);
      burst(h.x, h.y, C.white, 10, 160, 5);
    }

    function ringChord(b) {
      [0, 2, 3].forEach((i, k) => snd.bell(SCALE[i + 5] * 0.5, 0.05, panOf(b.x), 2.6, k * 0.07));
    }

    function stir(amount) {
      depth = clamp(depth - amount, 0, 1);
      idle = 0;
    }

    function wake() {
      depthGoal = 0.02;
      idle = 0;
      flash = reduced() ? 0 : 1;
      bodies.forEach((b) => {
        if (b.held) return;
        b.vy -= 200 + rnd() * 260;
        b.vx += (rnd() - 0.5) * 260;
        b.vrot += (rnd() - 0.5) * 5;
      });
      [0, 2, 3, 5, 7].forEach((i, k) => snd.bell(SCALE[i], 0.05, (k - 2) * 0.3, 1.8, k * 0.06));
      snd.hush(0.8, 3200, 0.05, 'highpass');
      say('They wake.');
    }

    function lull() {
      depthGoal = 0.95;
      idle = 0;
      snd.hush(3, 500, 0.05, 'lowpass');
      [0, 3, 5].forEach((i, k) => snd.bell(SCALE[i] * 0.5, 0.04, 0, 3.2, k * 0.25));
      say('They sink deeper.');
    }

    function startSweep(x) {
      sweep = { p: 0, from: x < W / 2 ? -0.1 : 1.1, to: x < W / 2 ? 1.1 : -0.1 };
      idle = 0;
      snd.hush(4.5, 600, 0.07, 'lowpass');
      snd.glide(73.42, 110, 0.05, 4.2);
      [0, 3, 5, 8].forEach((i, k) => snd.bell(SCALE[i], 0.035, (k - 1.5) * 0.4, 3, 0.4 + k * 0.32));
    }

    function say(msg) { live.textContent = msg; }

    function touched(track) {
      if (!track) return;
      if (lastTouched === track) return;
      lastTouched = track;
      const url = ctx.listenUrl ? ctx.listenUrl(track) : null;
      whisper.textContent = '';
      const a = document.createElement('span');
      a.className = 'iliwys-now';
      a.textContent = track.n + '. ' + track.title;
      whisper.appendChild(a);
      if (url) {
        const l = document.createElement('a');
        l.href = url;
        l.target = '_blank';
        l.rel = 'noopener noreferrer';
        l.textContent = 'listen';
        l.setAttribute('aria-label', 'Listen to ' + track.title + ' (opens a new tab)');
        a.appendChild(l);
      }
      const hint = document.createElement('span');
      hint.textContent = 'Hold the haze to lull the sleeper; tap it twice to wake them.';
      whisper.appendChild(hint);
    }

    /* ---------------- pointer ---------------- */

    const pointers = new Map();
    const mouse = { x: -999, y: -999, vx: 0, vy: 0, in: false, lt: 0 };
    let lastTap = { t: 0, x: 0, y: 0 };
    let hoverBody = null;

    function local(e) {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function pick(x, y, slop) {
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (b.held) continue;
        const reach = b.pr * 1.12 + slop;
        const dx = x - b.x, dy = y - b.y;
        if (dx * dx + dy * dy < reach * reach) return b;
      }
      return null;
    }

    function onDown(e) {
      if (e.target.closest && e.target.closest('.iliwys-eye, a')) return;
      if (e.button != null && e.button > 0) return;
      const p = local(e);
      const b = pick(p.x, p.y, e.pointerType === 'mouse' ? 4 : 16);
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      const now = performance.now();
      const ptr = { x: p.x, y: p.y, t0: now, x0: p.x, y0: p.y, body: null, hist: [{ x: p.x, y: p.y, t: now }], moved: 0, lulling: false };
      if (b) {
        ptr.body = b;
        ptr.ox = b.x - p.x;
        ptr.oy = b.y - p.y;
        b.held = ptr;
        touch(b);
        stage.classList.add('is-holding');
      }
      pointers.set(e.pointerId, ptr);
      idle = 0;
      e.preventDefault();
    }

    function onMove(e) {
      const p = local(e);
      const now = performance.now();
      if (e.pointerType === 'mouse') {
        const dt = Math.max(8, now - mouse.lt) / 1000;
        if (mouse.in) { mouse.vx = (p.x - mouse.x) / dt; mouse.vy = (p.y - mouse.y) / dt; }
        mouse.x = p.x; mouse.y = p.y; mouse.in = true; mouse.lt = now;
      }
      const ptr = pointers.get(e.pointerId);
      if (!ptr) {
        if (e.pointerType === 'mouse') {
          const hb = pick(p.x, p.y, 4);
          const hs = hb ? hb.song : null;
          if (hs !== hoverBody) {
            if (hs && hs.kind === 'other' && hs.s.seen === 0) becomeSomebodyElse(hs);
            if (hs) hs.s.seen = 1;
            hoverBody = hs;
            stage.classList.toggle('is-over', !!hs);
          }
        }
        return;
      }
      ptr.moved = Math.max(ptr.moved, Math.hypot(p.x - ptr.x0, p.y - ptr.y0));
      const pdt = Math.max(0.008, (now - ptr.hist[ptr.hist.length - 1].t) / 1000);
      ptr.evx = lerp(ptr.evx || 0, (p.x - ptr.x) / pdt, 0.6);
      ptr.evy = lerp(ptr.evy || 0, (p.y - ptr.y) / pdt, 0.6);
      ptr.x = p.x; ptr.y = p.y;
      ptr.hist.push({ x: p.x, y: p.y, t: now });
      while (ptr.hist.length > 2 && now - ptr.hist[0].t > 110) ptr.hist.shift();
    }

    function onUp(e) {
      const ptr = pointers.get(e.pointerId);
      if (!ptr) return;
      pointers.delete(e.pointerId);
      const now = performance.now();
      if (ptr.body) {
        const b = ptr.body;
        b.held = null;
        const h = ptr.hist;
        const a = h[0], z = h[h.length - 1];
        const dt = Math.max(0.016, (z.t - a.t) / 1000);
        let vx = (z.x - a.x) / dt, vy = (z.y - a.y) / dt;
        if (Math.hypot(ptr.evx || 0, ptr.evy || 0) > Math.hypot(vx, vy)) { vx = ptr.evx; vy = ptr.evy; }
        if (now - z.t > 90) { vx *= 0.2; vy *= 0.2; }
        const sp = Math.hypot(vx, vy);
        const max = 2600;
        if (sp > max) { vx *= max / sp; vy *= max / sp; }
        b.vx = vx; b.vy = vy;
        b.vrot += vx / Math.max(20, b.r) * 0.15;
        release(b, Math.min(sp, max));
        if (b.song.kind === 'other') becomeSomebodyElse(b.song);
        if (![...pointers.values()].some((q) => q.body)) stage.classList.remove('is-holding');
      } else if (!ptr.lulling && now - ptr.t0 < 300 && ptr.moved < 14) {
        if (now - lastTap.t < 380 && Math.hypot(ptr.x - lastTap.x, ptr.y - lastTap.y) < 60) {
          lastTap.t = 0;
          wake();
        } else {
          lastTap = { t: now, x: ptr.x, y: ptr.y };
          if (ptr.y > hTop - 10) startSweep(ptr.x);
          else {
            emitRipple(ptr.x, ptr.y, 0.5, false);
            snd.bell(SCALE[5 + Math.floor((1 - ptr.y / H) * 6)], 0.03, panOf(ptr.x), 1.8);
          }
        }
      }
      try { stage.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    function onLeave(e) {
      if (e.pointerType === 'mouse' && !pointers.has(e.pointerId)) {
        mouse.in = false; mouse.vx = mouse.vy = 0;
        if (hoverBody) { hoverBody = null; stage.classList.remove('is-over'); }
      }
    }

    on(stage, 'pointerdown', onDown);
    on(stage, 'pointermove', onMove);
    on(stage, 'pointerup', onUp);
    on(stage, 'pointercancel', onUp);
    on(stage, 'pointerleave', onLeave);
    on(stage, 'contextmenu', (e) => e.preventDefault());
    on(eye, 'click', () => { if (depth > 0.4) wake(); else lull(); });

    let resizeT = 0;
    const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(false); draw(); }, 80); };
    on(window, 'resize', onResize);
    cleanups.push(() => clearTimeout(resizeT));

    const unsub = audio.onChange((enabled) => { if (enabled) snd.start(); else snd.stop(); });
    cleanups.push(unsub);

    /* ---------------- simulation ---------------- */

    function step(dt) {
      const rm = reduced();
      // breathing: slower and deeper the further under they are
      const period = lerp(4.2, 8.5, depth);
      phase += (TAU / period) * dt;
      breath = rm ? 0 : Math.sin(phase);

      idle += dt;
      if (depthGoal != null) {
        depth += (depthGoal - depth) * (1 - Math.exp(-dt * 1.4));
        if (Math.abs(depthGoal - depth) < 0.01) depthGoal = null;
      } else if (idle > 4) {
        depth = Math.min(0.97, depth + dt * 0.011);
      }
      let lulling = false;
      pointers.forEach((p) => {
        if (!p.body && performance.now() - p.t0 > 280) { p.lulling = true; lulling = true; }
      });
      if (lulling) { depth = Math.min(1, depth + dt * 0.24); depthGoal = null; idle = 0; }
      flash = Math.max(0, flash - dt * 1.4);

      if (sweep) {
        sweep.p += dt / 4.5;
        if (sweep.p >= 1) sweep = null;
      }
      computeHorizon();

      const f = depthFloat();
      const drag = lerp(0.5, 1.25, depth);
      const grav = 900 * (1 - f);
      const mouseWind = mouse.in && !pointers.size;
      mouse.vx *= Math.exp(-dt * 7); mouse.vy *= Math.exp(-dt * 7);
      const sweepX = sweep ? lerp(sweep.from, sweep.to, sweep.p) * W : -9999;

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.glow = Math.max(0, b.glow - dt * 0.6);
        kindUpdate(b, dt, f);
        if (b.held) {
          const tx = clamp(b.held.x + b.held.ox, b.pr, W - b.pr);
          const ty = clamp(b.held.y + b.held.oy, b.pr, floorY - b.pr * 0.3);
          b.vx = (tx - b.x) * 16;
          b.vy = (ty - b.y) * 16;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.vrot *= Math.exp(-dt * 3);
          b.rot += b.vrot * dt;
          continue;
        }
        if (b.owner && b.owner.kind === 'torso' && b.owner.attached) continue; // a head on shoulders goes where they go

        let fx = 0, fy = 0;
        const floating = b.kind !== 'lay';
        if (b.kind === 'dream') {
          fy += (homeY(b, 1) - breath * 18 - b.y) * 0.9;
        } else if (b.owner) {
          // free parts: a lost head drifts upward, a partner is held by its tether
          if (b.kind === 'head') fy += (homeY({ home: 0.1, pr: b.pr }, f) - b.y) * 0.6 + grav * 0.4;
          else fy += grav;
        } else {
          const hy = homeY(b, floating ? f : f * 0.15) - breath * 14 * f;
          fy += (hy - b.y) * 1.3 * f + grav + b.heavy * (1 - f * 0.5);
          fx += ((40 + b.homeX * (W - 80)) - b.x) * 0.05 * f;
        }
        if (!rm) {
          fx += Math.sin(t * b.w1 + b.p1) * 22 * f;
          fy += Math.cos(t * b.w2 + b.p2) * 14 * f;
        }
        if (mouseWind) {
          const dx = b.x - mouse.x, dy = b.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          const rr = 150 + b.pr;
          if (d2 < rr * rr) {
            const k = 1 - Math.sqrt(d2) / rr;
            fx += clamp(mouse.vx, -1600, 1600) * k * 1.4;
            fy += clamp(mouse.vy, -1600, 1600) * k * 1.4;
          }
        }
        if (sweep && Math.abs(b.x - sweepX) < W * 0.12) fy -= 420 * Math.sin(sweep.p * Math.PI);
        // the two corners belong to the room's controls: drift out of them
        if (b.y < 90 && (b.x < 170 || b.x > W - 150)) { fy += 260; fx += b.x < 170 ? 120 : -120; }

        b.vx += fx * dt;
        b.vy += fy * dt;
        const k = Math.exp(-drag * dt);
        b.vx *= k; b.vy *= k;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vrot *= Math.exp(-dt * 1.6);
        if (b.kind === 'lay') {
          b.vrot += (-b.rot) * dt * 22;
          b.vrot *= Math.exp(-dt * 5);
        } else if (b.kind === 'paris' || b.kind === 'yarn') {
          b.vrot += (b.vx / Math.max(10, b.r) - b.vrot) * Math.min(1, dt * 4);
        } else if (!rm) {
          b.vrot += (Math.sin(t * 0.4 + b.p1) * 0.12 - b.rot) * dt * 0.8 * f;
        }
        b.rot += b.vrot * dt;
        bounds(b);
      }

      // a head stays on its shoulders until it doesn't
      songs.forEach((b) => {
        if (b.kind !== 'torso' || !b.part) return;
        const h = b.part;
        const nx = b.x + Math.sin(b.rot) * b.r * 1.08;
        const ny = b.y - Math.cos(b.rot) * b.r * 1.08;
        if (b.attached) {
          if (!h.held) { h.x = nx; h.y = ny; h.vx = b.vx; h.vy = b.vy; h.rot = b.rot; }
          else { b.attached = false; b.s.lost = 0; }
        } else {
          b.s.lost += dt;
          const d = Math.hypot(h.x - nx, h.y - ny);
          if (b.s.lost > 14 && !h.held) {
            h.vx += (nx - h.x) * dt * 6; h.vy += (ny - h.y) * dt * 6;
          }
          if (d < b.r * 0.55 && b.s.lost > 0.8) {
            b.attached = true;
            if (h.held) { h.held.body = null; h.held = null; }
            snd.bell(SCALE[4], 0.05, panOf(b.x), 1.6);
            burst(nx, ny, C.hot, 8, 90, 4);
          }
        }
      });

      // lovers are tethered
      songs.forEach((b) => {
        if (b.kind !== 'pair' || !b.part) return;
        const p = b.part;
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const rest = b.r * 2.8;
        const pull = (d - rest) * 9;
        const nx = dx / d, ny = dy / d;
        if (!b.held) { b.vx += nx * pull * dt * 0.6; b.vy += ny * pull * dt * 0.6; }
        if (!p.held) { p.vx -= nx * pull * dt; p.vy -= ny * pull * dt; }
      });

      collide();

      // ripples spread and, if loud enough, push
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.push ? 300 : 200) * (R / 44) * dt;
        rp.life -= dt * (rp.push ? 0.55 : 0.9);
        if (rp.life <= 0) { ripples.splice(i, 1); continue; }
        if (rp.push) {
          bodies.forEach((b) => {
            if (rp.hit.has(b) || b.held) return;
            const d = Math.hypot(b.x - rp.x, b.y - rp.y);
            if (Math.abs(d - rp.r) < b.pr && d > 1) {
              rp.hit.add(b);
              const k = 130 * rp.life * rp.power * (R / 44);
              b.vx += ((b.x - rp.x) / d) * k;
              b.vy += ((b.y - rp.y) / d) * k;
              b.glow = Math.max(b.glow, 0.5 * rp.life);
            }
          });
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt * p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.vx *= Math.exp(-dt * 1.5); p.vy *= Math.exp(-dt * 1.5);
        p.vy -= 12 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.veil) p.rot += dt * 0.6;
      }

      if (!rm) {
        motes.forEach((m) => {
          m.y -= dt * 0.006 * m.z * (0.6 + depth);
          m.x += Math.sin(t * 0.2 + m.p) * dt * 0.003;
          if (m.y < -0.05) { m.y = 1.02; m.x = rnd(); }
        });
      }
    }

    function bounds(b) {
      if (b.x < b.pr) { b.x = b.pr; if (b.vx < 0) { bump(b, -b.vx); b.vx = -b.vx * 0.55; } }
      if (b.x > W - b.pr) { b.x = W - b.pr; if (b.vx > 0) { bump(b, b.vx); b.vx = -b.vx * 0.55; } }
      if (b.y < b.pr) { b.y = b.pr; if (b.vy < 0) { bump(b, -b.vy); b.vy = -b.vy * 0.5; } }
      const fl = floorY - b.pr * (b.kind === 'lay' ? 0.55 : 0.92);
      if (b.y > fl) {
        b.y = fl;
        if (b.vy > 0) { if (b.vy > 160) bump(b, b.vy * 0.6); b.vy = -b.vy * 0.42; }
        b.vx *= 0.985;
      }
    }

    function bump(b, speed) {
      if (speed < 140) return;
      if (t - b.lastBump < 0.12) return;
      b.lastBump = t;
      const s = b.song;
      snd.bell(noteOf(b) * (b.owner ? 2 : 1), clamp(speed / 12000, 0.008, 0.06), panOf(b.x), 1.4);
      if (speed > 700) stir(clamp(speed / 40000, 0.01, 0.05));
      if (s.kind === 'ring') { emitRipple(s.x, s.y, clamp(speed / 900, 0.4, 1.2), speed > 300); if (speed > 300) ringChord(s); }
      if (s.kind === 'ugh' && speed > 260) huff(s);
      if (s.kind === 'torso' && b === s && speed > 650 && s.attached) loseHead(s);
      if (s.kind === 'gum' && speed > 500) s.s.inf = Math.max(0.7, s.s.inf - 0.1);
      b.glow = Math.max(b.glow, clamp(speed / 900, 0.2, 0.8));
    }

    function related(a, b) { return a.owner === b || b.owner === a; }

    function collide() {
      const n = bodies.length;
      for (let i = 0; i < n; i++) {
        const a = bodies[i];
        if (a.ghost) continue;
        for (let j = i + 1; j < n; j++) {
          const b = bodies[j];
          if (b.ghost || related(a, b)) continue;
          if (a.owner && a.owner.kind === 'torso' && a.owner.attached && b === a.owner) continue;
          let dx = b.x - a.x, dy = b.y - a.y;
          const rr = a.pr + b.pr;
          let d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) continue;
          if (d2 < 0.0001) { dx = 0.5; dy = 0.1; d2 = 0.26; }
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const ia = a.held || (a.owner && a.owner.attached && a.kind === 'head') ? 0 : 1 / a.m;
          const ib = b.held || (b.owner && b.owner.attached && b.kind === 'head') ? 0 : 1 / b.m;
          const sum = ia + ib;
          if (!sum) continue;
          const over = rr - d;
          a.x -= nx * over * (ia / sum) * 0.7; a.y -= ny * over * (ia / sum) * 0.7;
          b.x += nx * over * (ib / sum) * 0.7; b.y += ny * over * (ib / sum) * 0.7;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const jv = -(1.55) * vn / sum;
            a.vx -= nx * jv * ia; a.vy -= ny * jv * ia;
            b.vx += nx * jv * ib; b.vy += ny * jv * ib;
            const tv = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
            a.vrot += tv * 0.004; b.vrot -= tv * 0.004;
            if (-vn > 140) {
              bump(a, -vn * 0.7); bump(b, -vn * 0.7);
              if (a.song.kind === 'heart' && -vn > 700) a.song.s.goal = a.song.s.goal ? 0 : 1;
              if (b.song.kind === 'heart' && -vn > 700) b.song.s.goal = b.song.s.goal ? 0 : 1;
            }
          }
        }
      }
    }

    function kindUpdate(b, dt, f) {
      const s = b.s;
      switch (b.kind) {
        case 'frame': s.flick = Math.max(0, s.flick - dt); break;
        case 'mirror': {
          // it wants to be looked at: drifts toward wherever you are
          if (!b.held && mouse.in && !pointers.size) {
            const dx = mouse.x - b.x, dy = mouse.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < 380 && d > b.r * 2.2) { b.vx += (dx / d) * 120 * dt; b.vy += (dy / d) * 120 * dt; b.hover = Math.max(b.hover, 0.5); }
          }
          break;
        }
        case 'ugh': {
          s.agit = Math.max(0, s.agit - dt * 0.7);
          s.regen -= dt;
          if (s.regen <= 0 || !s.pts.length) {
            s.regen = s.agit > 0.1 ? 0.07 : 0.32;
            s.pts = [];
            const N = 15;
            for (let i = 0; i < N; i++) s.pts.push(0.72 + rnd() * 0.42 + (i % 2 ? 0.12 : -0.08) * (1 + s.agit));
          }
          if (!reduced()) {
            s.next -= dt;
            if (s.next <= 0) { s.next = 3 + rnd() * 5; if (!b.held) { b.vx += (rnd() - 0.5) * 160; b.vy -= 60 + rnd() * 80; s.agit = Math.max(s.agit, 0.5); } }
          }
          b.pr = b.r * (1 + s.agit * 0.12);
          break;
        }
        case 'heart': s.m += (s.goal - s.m) * (1 - Math.exp(-dt * 3.2)); break;
        case 'gum': {
          if (b.held) {
            s.inf += dt * 0.55;
            if (s.inf >= 1.95) {
              burst(b.x, b.y, C.gum, 26, 360, b.r * 0.22);
              burst(b.x, b.y, C.white, 10, 260, b.r * 0.15);
              snd.hush(0.18, 2600, 0.09, 'bandpass');
              snd.bell(SCALE[9], 0.05, panOf(b.x), 0.9);
              s.inf = 0.45;
              stir(0.06);
            }
          } else {
            s.inf += (1 - s.inf) * (1 - Math.exp(-dt * (s.inf < 1 ? 1.2 : 0.35)));
          }
          b.pr = b.r * s.inf;
          break;
        }
        case 'ghost': {
          const want = b.held || hoverBody === b || focused === b ? 1 : 0;
          s.belief += (want - s.belief) * (1 - Math.exp(-dt * (want ? 1.6 : 0.35)));
          b.ghost = s.belief < 0.35;
          break;
        }
        case 'pearl': if (s.bare > 0) { s.bare -= dt; if (s.bare <= 0) s.veil = 0.001; } if (s.veil > 0 && s.veil < 1) s.veil = Math.min(1, s.veil + dt * 0.5); break;
        case 'brain': {
          s.ang += dt * (b.held ? 5.5 : 1.1 + (1 - depth) * 0.8);
          const tx = b.x + Math.cos(s.ang) * b.r * 1.75;
          const ty = b.y + Math.sin(s.ang) * b.r * 1.75 * 0.62;
          if (!s.mx) { s.mx = tx; s.my = ty; }
          s.mvx += (tx - s.mx) * dt * 40; s.mvy += (ty - s.my) * dt * 40;
          s.mvx *= Math.exp(-dt * 5); s.mvy *= Math.exp(-dt * 5);
          s.mx += s.mvx * dt; s.my += s.mvy * dt;
          break;
        }
        case 'other': s.fade = Math.max(0, s.fade - dt * 1.1); break;
        case 'ring': if (b.held) { s.emit -= dt; if (s.emit <= 0) { s.emit = 0.42; emitRipple(b.x, b.y, 0.45, true); snd.bell(SCALE[5 + Math.floor(rnd() * 4)] * 0.5, 0.03, panOf(b.x), 1.6); } } break;
        case 'yarn': {
          const tr = s.trail;
          const lastP = tr[tr.length - 1];
          if (!lastP || Math.hypot(lastP.x - b.x, lastP.y - b.y) > 5) tr.push({ x: b.x, y: b.y });
          const max = b.held ? 140 : 70;
          while (tr.length > max) tr.shift();
          if (!b.held && tr.length > 2 && t % 0.05 < dt) tr.shift();
          break;
        }
        default: break;
      }
      b.hover += ((hoverBody === b.song || focused === b.song || (b.held && 1)) ? 1 - b.hover : -b.hover) * Math.min(1, dt * 6);
    }

    /* ---------------- drawing ---------------- */

    function drawHaze() {
      const w = haze.width, h = haze.height;
      const inhale = (breath + 1) / 2;
      const deep = depth;
      const base = mix(mix(C.blush, hex('#fbd5e2'), inhale * 0.6), hex('#ead6f0'), deep * 0.55);
      hg.fillStyle = rgba(base);
      hg.fillRect(0, 0, w, h);
      const blobs = [
        [0.22, 0.28, 0.55, C.white, 0.85],
        [0.78, 0.2, 0.5, mix(C.baby, C.lilac, deep), 0.75],
        [0.5, 0.62, 0.62, mix(C.peach, C.blue, deep * 0.7), 0.6],
        [0.9, 0.7, 0.4, mix(C.hot, C.lilac, deep * 0.8), lerp(0.42, 0.18, deep)],
        [0.06, 0.78, 0.42, mix(C.pink, C.blue, deep), lerp(0.32, 0.25, deep)],
        [0.55, 0.12, 0.38, C.white, 0.6 + inhale * 0.3],
      ];
      const rm = reduced();
      blobs.forEach((bl, i) => {
        const x = (bl[0] + (rm ? 0 : Math.sin(t * 0.05 + i * 1.7) * 0.06)) * w;
        const y = (bl[1] + (rm ? 0 : Math.cos(t * 0.04 + i * 2.3) * 0.05)) * h;
        const r = bl[2] * Math.max(w, h) * (1 + breath * 0.07);
        const gr = hg.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, rgba(bl[3], bl[4]));
        gr.addColorStop(1, rgba(bl[3], 0));
        hg.fillStyle = gr;
        hg.fillRect(0, 0, w, h);
      });
      // a great neon rectangle somewhere behind the haze, out of focus, breathing
      const rh = Math.min(h * 0.58, (w * 0.78) / 0.72), rw = rh * 0.72; // always taller than wide
      const rx = w * 0.5 - rw / 2, ry = h * 0.4 - rh / 2 - breath * 0.3;
      const neonCol = mix(C.hot, hex('#b98cf0'), deep * 0.7);
      const a = lerp(0.62, 0.3, deep) * (0.75 + inhale * 0.25);
      hg.lineJoin = 'round';
      hg.strokeStyle = rgba(neonCol, a * 0.35); hg.lineWidth = 4.5; hg.strokeRect(rx, ry, rw, rh);
      hg.strokeStyle = rgba(neonCol, a); hg.lineWidth = 1.6; hg.strokeRect(rx, ry, rw, rh);
      hg.strokeStyle = rgba(C.white, a * 0.8); hg.lineWidth = 0.5; hg.strokeRect(rx, ry, rw, rh);
    }

    function drawHorizon() {
      const top = hTop;
      const inhale = (breath + 1) / 2;
      const deep = depth;
      // the light that rises off it
      let gr = g.createLinearGradient(0, top - H * 0.32, 0, top);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.7, rgba(mix(C.white, C.lilac, deep * 0.4), 0.18 + inhale * 0.1));
      gr.addColorStop(1, rgba(C.white, 0.62 + inhale * 0.2));
      g.fillStyle = gr;
      g.fillRect(0, top - H * 0.32, W, H * 0.32);

      const wave = (x, k) => top + Math.sin(x * 0.0042 + t * 0.21 * k + k) * 5 * k + Math.sin(x * 0.011 - t * 0.13) * 2.5;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W + 24; x += 24) g.lineTo(x, wave(x, 1));
      g.lineTo(W, H);
      g.closePath();
      gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, rgba(C.white));
      gr.addColorStop(0.06, rgba(mix(hex('#ffc2dc'), hex('#e9c9f3'), deep)));
      gr.addColorStop(0.42, rgba(mix(hex('#ff7dbb'), hex('#cdb3f0'), deep)));
      gr.addColorStop(1, rgba(mix(hex('#ff3d9c'), hex('#a9b9ef'), deep)));
      g.fillStyle = gr;
      g.fill();

      // slow aurora in the band
      if (!reduced()) {
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          const y0 = top + (H - top) * (0.25 + k * 0.22);
          g.moveTo(0, H);
          for (let x = 0; x <= W + 30; x += 30) g.lineTo(x, y0 + Math.sin(x * (0.003 + k * 0.0013) + t * (0.15 + k * 0.07) + k * 2) * (10 + k * 4));
          g.lineTo(W, H);
          g.closePath();
          g.fillStyle = rgba(k === 1 ? mix(C.white, C.blue, deep) : mix(C.hot, C.lilac, deep), 0.1 + k * 0.03);
          g.fill();
        }
      }

      // weather crossing
      if (sweep) {
        const sx = lerp(sweep.from, sweep.to, sweep.p) * W;
        const a = Math.sin(sweep.p * Math.PI);
        g.globalAlpha = a;
        g.drawImage(glows.white, sx - W * 0.3, top - H * 0.32, W * 0.6, H * 0.64);
        g.globalAlpha = a * 0.8;
        g.drawImage(glows.hot, sx - W * 0.2, top - H * 0.12, W * 0.4, H * 0.3);
        g.globalAlpha = a;
        g.drawImage(glows.white, sx - W * 0.08, top - H * 0.05, W * 0.16, H * 0.1);
        g.globalAlpha = 1;
      }

      // the neon edge of the world
      g.beginPath();
      for (let x = 0; x <= W + 24; x += 24) { const y = wave(x, 1); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.lineCap = 'round';
      g.strokeStyle = rgba(mix(C.hot, C.lilac, deep * 0.6), 0.16); g.lineWidth = 16; g.stroke();
      g.strokeStyle = rgba(mix(C.hot, C.lilac, deep * 0.6), 0.35); g.lineWidth = 6; g.stroke();
      g.strokeStyle = rgba(C.white, 0.95); g.lineWidth = 2; g.stroke();
    }

    function neon(col, w, a) {
      a = a == null ? 1 : a;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = rgba(col, 0.16 * a); g.lineWidth = w * 4.2; g.stroke();
      g.strokeStyle = rgba(col, 0.42 * a); g.lineWidth = w * 2.1; g.stroke();
      g.strokeStyle = rgba(col, a); g.lineWidth = w; g.stroke();
      g.strokeStyle = rgba(hex('#fff2f8'), 0.9 * a); g.lineWidth = Math.max(0.8, w * 0.38); g.stroke();
    }

    function orb(r, inner, outer, hl) {
      const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
      gr.addColorStop(0, rgba(C.white, 1));
      gr.addColorStop(0.35, rgba(inner, 1));
      gr.addColorStop(1, rgba(outer, 1));
      g.beginPath(); g.arc(0, 0, r, 0, TAU);
      g.fillStyle = gr; g.fill();
      if (hl !== false) {
        g.beginPath(); g.ellipse(-r * 0.32, -r * 0.42, r * 0.32, r * 0.17, -0.6, 0, TAU);
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
      }
    }

    function halo(x, y, size, sprite, a) {
      if (a <= 0.01) return;
      g.globalAlpha = clamp(a, 0, 1);
      g.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      g.globalAlpha = 1;
    }

    function heartPts(r, m, n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const hx = 16 * Math.pow(Math.sin(a), 3) / 17 * r;
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 * r - r * 0.08;
        // the other heart: a cooler, closed pebble, tilted away
        const ca = a - Math.PI / 2;
        const cx = Math.cos(ca) * r * 0.92 * (1 + 0.06 * Math.sin(3 * a));
        const cy = Math.sin(ca) * r * 0.82;
        out.push([lerp(hx, cx, m), lerp(hy, cy, m)]);
      }
      return out;
    }

    function shapePath(form, r) {
      g.beginPath();
      if (form === 0) g.arc(0, 0, r, 0, TAU);
      else if (form === 1) { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; g.lineTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12 + r * 0.12); } g.closePath(); }
      else if (form === 2) { g.moveTo(0, -r * 1.15); g.lineTo(r * 0.85, 0); g.lineTo(0, r * 1.15); g.lineTo(-r * 0.85, 0); g.closePath(); }
      else if (form === 3) { const k = r * 0.9; g.moveTo(-k, 0); g.bezierCurveTo(-k, -k, -k, -k, 0, -k); g.bezierCurveTo(k, -k, k, -k, k, 0); g.bezierCurveTo(k, k, k, k, 0, k); g.bezierCurveTo(-k, k, -k, k, -k, 0); }
      else if (form === 4) { g.moveTo(0, -r * 1.2); g.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.9, r * 0.9, 0, r * 0.9); g.bezierCurveTo(-r * 0.9, r * 0.9, -r * 0.9, -r * 0.2, 0, -r * 1.2); }
      else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10; const rr = i % 2 ? r * 0.55 : r * 1.1; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
    }
    const OTHER_COLS = [C.pink, C.lilac, C.blue, C.hot, C.white, C.baby];

    function drawBody(b) {
      const r = b.r;
      const s = b.s;
      const lift = b.hover * 0.6 + b.glow;
      // the glow every light has, a little stronger when touched
      const gs = b.kind === 'lay' ? glows.blue : b.kind === 'pearl' ? glows.white : b.kind === 'dream' ? glows.lilac : glows.pink;
      halo(b.x, b.y, b.pr * (3.4 + lift * 1.2), gs, 0.45 + lift * 0.45);
      halo(b.x, b.y, b.pr * 2.2, glows.white, 0.35 + lift * 0.4);

      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.rot);
      const lw = Math.max(1.6, r * 0.075);
      switch (b.kind) {
        case 'frame': {
          const on = s.flick > 0 ? (Math.sin(t * 90) > -0.1 ? 1 : 0.25) : 1;
          const w = r * 1.2, h = r * 1.68;
          g.beginPath();
          if (g.roundRect) g.roundRect(-w / 2, -h / 2, w, h, r * 0.1); else g.rect(-w / 2, -h / 2, w, h);
          g.fillStyle = rgba(C.white, 0.28 * on); g.fill();
          neon(C.hot, lw * 1.1, on);
          break;
        }
        case 'mirror': {
          orb(r, C.baby, C.rose, false);
          // facets of a mirrored ball, catching light
          g.save();
          g.beginPath(); g.arc(0, 0, r * 0.98, 0, TAU); g.clip();
          const cell = r / 3.6;
          for (let iy = -4; iy <= 4; iy++) {
            const yy = iy * cell;
            const wrow = Math.sqrt(Math.max(0, r * r - yy * yy));
            for (let ix = -5; ix <= 5; ix++) {
              const xx = ix * cell * (wrow / r) + ((iy % 2) * cell * 0.5) * (wrow / r);
              if (Math.abs(xx) > wrow) continue;
              const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + ix * 1.3 + iy * 2.1 + b.rot * 3);
              g.fillStyle = rgba(tw > 0.7 ? C.white : C.peach, 0.18 + tw * 0.55 * (0.5 + b.hover * 0.5));
              g.fillRect(xx - cell * 0.42 * (wrow / r), yy - cell * 0.42, cell * 0.84 * (wrow / r), cell * 0.84);
            }
          }
          g.restore();
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          neon(C.hot, lw * 0.7, 0.8);
          // sparkles, more of them when it has your attention
          const n = 3 + Math.round(b.hover * 3);
          for (let i = 0; i < n; i++) {
            const a = t * 0.6 + i * TAU / n;
            const sx = Math.cos(a) * r * 1.45, sy = Math.sin(a) * r * 1.3;
            const k = r * (0.13 + 0.06 * Math.sin(t * 3 + i));
            g.save(); g.rotate(-b.rot);
            g.beginPath(); g.moveTo(sx, sy - k); g.quadraticCurveTo(sx, sy, sx + k, sy); g.quadraticCurveTo(sx, sy, sx, sy + k); g.quadraticCurveTo(sx, sy, sx - k, sy); g.quadraticCurveTo(sx, sy, sx, sy - k);
            g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
            g.restore();
          }
          break;
        }
        case 'ugh': {
          const pts = s.pts;
          const n = pts.length;
          const rr = r * (1 + s.agit * 0.12);
          g.beginPath();
          for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const k = pts[i] * rr; if (i) g.lineTo(Math.cos(a) * k, Math.sin(a) * k); else g.moveTo(Math.cos(a) * k, Math.sin(a) * k); }
          g.closePath();
          g.fillStyle = rgba(mix(C.peach, C.white, 0.3), 0.75); g.fill();
          neon(C.hot, lw, 1);
          // a cross little brow
          g.beginPath(); g.moveTo(-r * 0.36, -r * 0.18); g.lineTo(-r * 0.1, -r * 0.05); g.moveTo(r * 0.36, -r * 0.18); g.lineTo(r * 0.1, -r * 0.05);
          neon(C.ink, lw * 0.6, 0.85);
          if (s.agit > 0.15) {
            for (let i = 0; i < 5; i++) {
              const a = -Math.PI / 2 + (i - 2) * 0.42;
              g.beginPath(); g.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); g.lineTo(Math.cos(a) * r * (1.25 + 0.4 * s.agit), Math.sin(a) * r * (1.25 + 0.4 * s.agit));
              neon(C.hot, lw * 0.5, s.agit);
            }
          }
          break;
        }
        case 'heart': {
          const pts = heartPts(r, s.m, 64);
          g.beginPath();
          pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
          g.closePath();
          const inner = mix(C.baby, C.blue, s.m), edge = mix(C.hot, hex('#8fb2ea'), s.m);
          const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r * 1.1);
          gr.addColorStop(0, rgba(C.white)); gr.addColorStop(0.5, rgba(inner)); gr.addColorStop(1, rgba(mix(inner, edge, 0.4)));
          g.fillStyle = gr; g.fill();
          neon(edge, lw, 1);
          break;
        }
        case 'gum': {
          const rr = r * s.inf;
          const thin = smooth(1, 1.9, s.inf);
          g.globalAlpha = 1 - thin * 0.35;
          orb(rr, mix(C.peach, C.white, thin * 0.5), mix(C.gum, C.peach, thin), true);
          g.globalAlpha = 1;
          g.beginPath(); g.arc(0, 0, rr, 0, TAU);
          neon(C.hot, lw * (1 - thin * 0.4), 0.9);
          // thin-film swirl and a little star of light
          g.beginPath(); g.arc(0, 0, rr * 0.72, 0.4, 2.1); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.2, rr * 0.05); g.stroke();
          g.save(); g.translate(rr * 0.38, rr * 0.3); g.rotate(-b.rot);
          g.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10; const k = i % 2 ? rr * 0.07 : rr * 0.17; g.lineTo(Math.cos(a) * k, Math.sin(a) * k); }
          g.closePath(); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
          g.restore();
          break;
        }
        case 'ghost': {
          const k = s.belief;
          g.globalAlpha = 0.34 + 0.66 * k;
          orb(r * 0.9, mix(C.powder, C.baby, k), mix(C.lilac, C.pink, k), k > 0.4);
          g.globalAlpha = 1;
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          if (k < 0.7) g.setLineDash([r * 0.18, r * 0.22]);
          g.lineDashOffset = -t * 8;
          neon(mix(C.lilac, C.hot, k), lw * 0.8, 0.35 + k * 0.65);
          g.setLineDash([]);
          break;
        }
        case 'pearl': {
          const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, rgba(hex('#fbf1f6'))); gr.addColorStop(0.85, rgba(hex('#eadcf3'))); gr.addColorStop(1, rgba(hex('#d9e6f8')));
          g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = gr; g.fill();
          g.beginPath(); g.ellipse(-r * 0.3, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
          if (s.veil > 0.01) {
            g.globalAlpha = s.veil;
            for (let i = 0; i < 3; i++) {
              g.save(); g.rotate(t * (0.3 + i * 0.12) + i * 2);
              g.beginPath(); g.ellipse(0, 0, r * 1.35, r * (0.55 + i * 0.12), 0, 0, TAU);
              g.fillStyle = rgba(C.lilac, 0.16); g.fill();
              g.strokeStyle = rgba(C.white, 0.6); g.lineWidth = 1.2; g.stroke();
              g.restore();
            }
            g.globalAlpha = 1;
          }
          break;
        }
        case 'torso': {
          const w = r * 1.0;
          g.beginPath();
          g.moveTo(-w, r * 0.7);
          g.bezierCurveTo(-w, -r * 0.2, -w * 0.7, -r * 0.55, -w * 0.25, -r * 0.6);
          g.lineTo(-w * 0.18, -r * 0.82);
          g.moveTo(w * 0.18, -r * 0.82);
          g.lineTo(w * 0.25, -r * 0.6);
          g.bezierCurveTo(w * 0.7, -r * 0.55, w, -r * 0.2, w, r * 0.7);
          g.closePath();
          g.fillStyle = rgba(C.white, 0.32); g.fill();
          neon(C.hot, lw, 1);
          if (!b.attached) {
            // where it used to be: a little puzzled spiral
            g.beginPath();
            for (let i = 0; i < 24; i++) { const a = i * 0.45 + t * 2; const k = r * 0.03 * i; g.lineTo(Math.cos(a) * k, -r * 1.05 + Math.sin(a) * k); }
            neon(C.pink, lw * 0.45, 0.7);
          }
          break;
        }
        case 'head': {
          orb(r, C.powder, C.baby, true);
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          neon(C.hot, Math.max(1.3, lw * 0.75), 0.9);
          // closed sleepy eyes
          g.beginPath(); g.arc(-r * 0.35, r * 0.05, r * 0.2, 0.15, Math.PI - 0.15); g.moveTo(r * 0.55, r * 0.05 + 0.001); g.arc(r * 0.35, r * 0.05, r * 0.2, 0.15, Math.PI - 0.15);
          g.strokeStyle = rgba(C.ink, 0.7); g.lineWidth = Math.max(1, r * 0.08); g.stroke();
          break;
        }
        case 'brain': {
          const lobes = [[-0.42, -0.2, 0.55], [0.0, -0.38, 0.58], [0.42, -0.18, 0.55], [-0.28, 0.25, 0.52], [0.3, 0.26, 0.5], [0, 0.05, 0.55]];
          lobes.forEach((l) => {
            g.save(); g.translate(l[0] * r, l[1] * r);
            orb(l[2] * r, C.peach, C.baby, false);
            g.restore();
          });
          g.beginPath();
          g.moveTo(-r * 0.7, -r * 0.05); g.bezierCurveTo(-r * 0.4, -r * 0.4, -r * 0.2, r * 0.3, 0, -r * 0.1);
          g.bezierCurveTo(r * 0.2, -r * 0.45, r * 0.45, r * 0.25, r * 0.72, -r * 0.05);
          g.moveTo(-r * 0.05, -r * 0.85); g.bezierCurveTo(r * 0.12, -r * 0.5, -r * 0.18, -r * 0.35, 0, -r * 0.1);
          neon(C.hot, lw * 0.7, 0.95);
          break;
        }
        case 'other': {
          if (s.fade > 0.01 && s.prev >= 0) {
            g.save(); g.scale(1 + (1 - s.fade) * 0.6, 1 + (1 - s.fade) * 0.6);
            shapePath(s.prev, r);
            g.fillStyle = rgba(OTHER_COLS[s.prev], 0.3 * s.fade); g.fill();
            neon(OTHER_COLS[(s.prev + 3) % 6], lw * 0.6, s.fade * 0.6);
            g.restore();
          }
          const ap = 1 - s.fade * 0.5;
          shapePath(s.form, r);
          const col = OTHER_COLS[s.form];
          const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r * 1.2);
          gr.addColorStop(0, rgba(C.white, ap)); gr.addColorStop(1, rgba(col, ap));
          g.fillStyle = gr; g.fill();
          neon(s.form === 3 ? C.ink : C.hot, lw * 0.9, ap);
          break;
        }
        case 'pair': {
          orb(r, C.baby, C.hot, true);
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          neon(C.hot, lw * 0.7, 0.8);
          break;
        }
        case 'partner': {
          orb(r, C.lilac, hex('#b49be8'), true);
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          neon(hex('#a58ae6'), lw * 0.8, 0.85);
          break;
        }
        case 'ring': {
          const pulse = 1 + 0.05 * Math.sin(t * 3);
          g.beginPath(); g.arc(0, 0, r * 0.8 * pulse, 0, TAU);
          g.strokeStyle = rgba(C.white, 0.85); g.lineWidth = r * 0.34; g.stroke();
          g.beginPath(); g.arc(0, 0, r * 0.97 * pulse, 0, TAU); neon(C.hot, lw * 0.8, 1);
          g.beginPath(); g.arc(0, 0, r * 0.63 * pulse, 0, TAU); neon(C.hot, lw * 0.6, 0.9);
          g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fillStyle = rgba(C.hot, 0.7); g.fill();
          break;
        }
        case 'dream': {
          const wob = reduced() ? 0 : Math.sin(t * 1.3) * 0.04;
          g.scale(1 + wob, 1 - wob);
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
          // a tiny version of this room inside it: its own horizon, its own lights
          g.save(); g.clip();
          const hy = r * 0.38;
          const gr = g.createLinearGradient(0, hy, 0, r);
          gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, rgba(C.pink, 0.55)); gr.addColorStop(1, rgba(C.hot, 0.55));
          g.fillStyle = gr; g.fillRect(-r, hy, r * 2, r);
          [[-0.4, -0.1, 0.09], [0.1, -0.35, 0.07], [0.42, 0.05, 0.1], [-0.05, 0.12, 0.06]].forEach((m, i) => {
            g.beginPath(); g.arc(m[0] * r + Math.sin(t * 0.7 + i) * r * 0.05, m[1] * r + Math.cos(t * 0.6 + i * 2) * r * 0.04, m[2] * r, 0, TAU);
            g.fillStyle = rgba(i % 2 ? C.hot : C.white, 0.85); g.fill();
          });
          g.restore();
          g.beginPath(); g.arc(0, 0, r, 0, TAU);
          let sg;
          if (g.createConicGradient) {
            sg = g.createConicGradient(t * 0.4, 0, 0);
            [C.lilac, C.blue, C.white, C.pink, C.peach, C.lilac].forEach((c, i, a) => sg.addColorStop(i / (a.length - 1), rgba(c)));
          } else sg = rgba(C.lilac);
          g.strokeStyle = sg; g.lineWidth = Math.max(2, r * 0.07); g.stroke();
          g.beginPath(); g.arc(0, 0, r * 0.84, -2.5, -1.7); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(2, r * 0.06); g.stroke();
          break;
        }
        case 'paris': {
          const w = r * 1.05, h = r * 0.95;
          const shell = mix(C.baby, C.peach, 0.3), shade = hex('#ef93b8');
          const domeT = (y0, flip) => {
            g.beginPath();
            g.moveTo(-w, y0);
            g.bezierCurveTo(-w, y0 - flip * h * 0.62, w, y0 - flip * h * 0.62, w, y0);
            g.closePath();
          };
          let gr = g.createLinearGradient(0, -h * 0.6, 0, h * 0.6);
          gr.addColorStop(0, rgba(C.white)); gr.addColorStop(0.45, rgba(shell)); gr.addColorStop(1, rgba(shade));
          domeT(-h * 0.14, 1); g.fillStyle = gr; g.fill();
          domeT(h * 0.14, -1); g.fillStyle = gr; g.fill();
          // feet
          g.beginPath();
          for (let i = -6; i <= 6; i++) { g.moveTo(i * w / 6.5 + 3, -h * 0.14); g.arc(i * w / 6.5, -h * 0.14, 3, 0, TAU); }
          g.fillStyle = rgba(shell); g.fill();
          // the cream
          g.beginPath(); if (g.roundRect) g.roundRect(-w * 0.94, -h * 0.13, w * 1.88, h * 0.26, h * 0.13); else g.rect(-w * 0.94, -h * 0.13, w * 1.88, h * 0.26);
          g.fillStyle = rgba(C.cream); g.fill();
          g.strokeStyle = rgba(C.hot, 0.55); g.lineWidth = 1.2; g.stroke();
          gr = null;
          g.beginPath(); g.ellipse(-w * 0.35, -h * 0.42, w * 0.25, h * 0.07, -0.1, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
          break;
        }
        case 'yarn': {
          g.restore();
          // the thread it leaves behind
          const tr = s.trail;
          if (tr.length > 2) {
            g.lineCap = 'round'; g.lineJoin = 'round';
            for (let i = 1; i < tr.length; i++) {
              g.beginPath(); g.moveTo(tr[i - 1].x, tr[i - 1].y); g.lineTo(tr[i].x, tr[i].y);
              g.strokeStyle = rgba(C.hot, (i / tr.length) * 0.7); g.lineWidth = 1.8; g.stroke();
            }
          }
          g.save(); g.translate(b.x, b.y); g.rotate(b.rot);
          orb(r, mix(C.rose, C.peach, 0.5), hex('#e06a9c'), false);
          g.save(); g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.clip();
          g.strokeStyle = 'rgba(255,240,246,0.7)'; g.lineWidth = Math.max(1, r * 0.05);
          for (let i = 0; i < 7; i++) {
            g.beginPath(); g.ellipse(0, 0, r * 1.02, r * (0.25 + (i % 3) * 0.2), i * 0.9, 0, TAU); g.stroke();
          }
          g.restore();
          g.beginPath(); g.arc(0, 0, r, 0, TAU); neon(C.hot, lw * 0.55, 0.6);
          break;
        }
        case 'lay': {
          // a crescent lying on its back
          g.beginPath();
          g.arc(0, 0, r, 0.05 * Math.PI, 0.95 * Math.PI, false);
          g.arc(0, -r * 0.42, r * 0.92, Math.PI - 0.2, 0.2, true);
          g.closePath();
          const gr = g.createLinearGradient(0, -r * 0.2, 0, r);
          gr.addColorStop(0, rgba(C.white)); gr.addColorStop(1, rgba(C.blue));
          g.fillStyle = gr; g.fill();
          neon(hex('#a99be8'), lw, 0.95);
          break;
        }
        default: break;
      }
      g.restore();
    }

    function drawTethers() {
      songs.forEach((b) => {
        if (b.kind === 'pair' && b.part) {
          const p = b.part;
          const mx = (b.x + p.x) / 2, my = (b.y + p.y) / 2 + Math.max(10, b.r * 0.6);
          g.beginPath(); g.moveTo(b.x, b.y); g.quadraticCurveTo(mx, my, p.x, p.y);
          neon(C.hot, 1.6, 0.75);
          // a small light travels between them, back and forth
          const u = 0.5 + 0.5 * Math.sin(t * 1.4);
          const qx = (1 - u) * (1 - u) * b.x + 2 * (1 - u) * u * mx + u * u * p.x;
          const qy = (1 - u) * (1 - u) * b.y + 2 * (1 - u) * u * my + u * u * p.y;
          halo(qx, qy, 26, glows.white, 0.9);
        }
        if (b.kind === 'brain') {
          const s = b.s;
          g.setLineDash([2, 5]);
          g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(s.mx, s.my);
          g.strokeStyle = rgba(C.hot, 0.55); g.lineWidth = 1.2; g.stroke();
          g.setLineDash([]);
          halo(s.mx, s.my, b.r * 1.1, glows.white, 0.95);
          g.beginPath(); g.arc(s.mx, s.my, Math.max(3, b.r * 0.13), 0, TAU); g.fillStyle = '#fff'; g.fill();
          g.strokeStyle = rgba(C.hot, 0.9); g.lineWidth = 1.4; g.stroke();
        }
      });
    }

    function draw() {
      const rm = reduced();
      drawHaze();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(haze, 0, 0, W, H);

      // dust in the light
      motes.forEach((m) => {
        const tw = rm ? 0.6 : 0.5 + 0.5 * Math.sin(t * 0.8 + m.p);
        halo(m.x * W, m.y * H, 10 * m.s * m.z, glows.white, 0.55 * tw * m.z);
      });

      drawHorizon();

      ripples.forEach((rp) => {
        g.beginPath(); g.arc(rp.x, rp.y, rp.r, 0, TAU);
        neon(rp.push ? C.hot : C.white, rp.push ? 1.6 : 1.2, rp.life * (rp.push ? 0.8 : 0.6) * rp.power);
      });

      drawTethers();
      for (let i = 0; i < bodies.length; i++) drawBody(bodies[i]);

      particles.forEach((p) => {
        if (p.veil) {
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          g.beginPath(); g.ellipse(0, 0, p.size * (1 + (1 - p.life)), p.size * 0.4, 0, 0, TAU);
          g.fillStyle = rgba(C.lilac, 0.25 * p.life); g.fill();
          g.strokeStyle = rgba(C.white, 0.7 * p.life); g.lineWidth = 1.2; g.stroke();
          g.restore();
        } else {
          halo(p.x, p.y, p.size * 4, glows.white, p.life * 0.6);
          g.beginPath(); g.arc(p.x, p.y, p.size * p.life, 0, TAU); g.fillStyle = rgba(p.col, p.life); g.fill();
        }
      });

      // a lulling hand makes a soft pool of light
      pointers.forEach((p) => {
        if (!p.lulling) return;
        const k = Math.min(1, (performance.now() - p.t0 - 280) / 900);
        halo(p.x, p.y, 200 + k * 300 + breath * 30, glows.lilac, 0.9 * k);
        halo(p.x, p.y, 90 + k * 80, glows.white, 0.95 * k);
        g.beginPath(); g.arc(p.x, p.y, 30 + k * 40 + breath * 6, 0, TAU);
        neon(C.white, 1.2, 0.6 * k);
      });

      // the haze settles over everything, thicker the deeper they sleep
      g.globalAlpha = 0.1 + depth * 0.22 + (rm ? 0 : (breath + 1) * 0.03);
      g.drawImage(haze, 0, 0, W, H);
      g.globalAlpha = 1;

      if (flash > 0.01) {
        g.fillStyle = rgba(C.white, flash * 0.55);
        g.fillRect(0, 0, W, H);
        g.fillStyle = rgba(C.hot, flash * 0.18);
        g.fillRect(0, 0, W, H);
      }
    }

    /* ---------------- DOM that follows the world ---------------- */

    let labelFor = null, labelW = 0;
    function updateDom() {
      // the song name floats beside whatever you are holding, hovering or focused on
      let lb = null;
      for (const p of pointers.values()) if (p.body) { lb = p.body.song; break; }
      if (!lb) lb = hoverBody || focused;
      if (lb !== labelFor) {
        labelFor = lb;
        if (lb) {
          label.innerHTML = '';
          const n = document.createElement('span'); n.className = 'iliwys-label-n'; n.textContent = lb.track.n;
          label.appendChild(n);
          label.appendChild(document.createTextNode(lb.track.title));
          labelW = label.offsetWidth;
          label.classList.add('is-on');
        } else label.classList.remove('is-on');
      }
      if (labelFor) {
        const b = labelFor;
        const lx = clamp(b.x - labelW / 2, 12, Math.max(12, W - labelW - 12));
        let ly = b.y - b.pr * (b.kind === 'dream' ? 1.15 : 1.5) - 30;
        if (ly < 64) ly = b.y + b.pr * 1.4 + 6;
        label.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      }
      if (focused) placeKey(focused);

      // the eye opens as they wake
      const open = Math.round(clamp(1 - depth * 1.15, 0, 1) * 50) / 50;
      if (open !== eyeOpen) {
        eyeOpen = open;
        lidU.setAttribute('d', 'M4 12 Q20 ' + (12 - 12 * open).toFixed(1) + ' 36 12');
        lidL.setAttribute('d', 'M4 12 Q20 ' + (12 + 9 * open + 3 * (1 - open)).toFixed(1) + ' 36 12');
        pupil.style.opacity = String(smooth(0.25, 0.7, open));
        lashes.forEach((l) => { l.style.opacity = String(1 - smooth(0.1, 0.5, open)); });
      }
      let word = STATES[STATES.length - 1][1];
      for (let i = 0; i < STATES.length; i++) if (depth < STATES[i][0]) { word = STATES[i][1]; break; }
      if (word !== stateWord) {
        stateWord = word;
        eyeWord.textContent = word;
        eye.setAttribute('aria-label', 'The sleeper is ' + word + '. ' + (depth > 0.4 ? 'Wake them.' : 'Lull them back to sleep.'));
      }
      horizonBtn.style.opacity = String(0.86 + (breath + 1) * 0.07);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000 || 0.016));
      last = now;
      t += dt;
      step(dt);
      draw();
      updateDom();
      snd.frame();
    }

    /* ---------------- go ---------------- */

    computeHorizon();
    layout(true);
    // let the room find its feet before the first frame shows, so it opens already at rest
    for (let i = 0; i < 40; i++) { t += 1 / 60; step(1 / 60); }
    draw();
    updateDom();
    if (audio.enabled) snd.start();
    last = performance.now();
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        raf = 0;
        cleanups.forEach((fn) => { try { fn(); } catch (e) {} });
        cleanups.length = 0;
        snd.stop(true);
        pointers.clear();
      },
    };
  }

  window.Eras.register('iliwys', {
    mount(root, ctx) {
      if (room) { try { room.destroy(); } catch (e) {} }
      room = createRoom(root, ctx);
    },
    unmount() {
      if (room) { room.destroy(); room = null; }
    },
  });
})();
