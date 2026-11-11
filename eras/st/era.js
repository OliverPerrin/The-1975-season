/* The 1975 (2013). A brick wall at two in the morning, a wet pavement, and sixteen neon
   tubes that are all switched off. Strike them on and each one adds real light to the
   scene: the wall, the puddles and the rain only exist where the tubes reach them.
   Strictly monochrome. */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const ease = (x) => x * x * (3 - 2 * x);
  const NEON = '"Tilt Neon", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
  const SCRIPT = '"Sacramento", "Snell Roundhand", "Brush Script MT", cursive';
  const ROAD = '"Oswald", "Arial Narrow", "Helvetica Neue", sans-serif';
  const PAD = 36;      // glow room around every sprite, in sign units
  const TW = 4.2;      // tube thickness, in sign units
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* the sixteen signs. Local units, origin at the sign's centre.        */
  /* ------------------------------------------------------------------ */

  const rr = (g, x, y, w, h, r) => {
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  function defs() {
    return {
      1: {
        w: 430, h: 180, power: 1.6, style: 'slow',
        parts: [
          { draw: (g, T) => T.path((p) => rr(p, -210, -86, 420, 172, 5)) },
          { draw: (g, T) => T.text('the 1975', 0, 2, 92, NEON) },
        ],
        behave(s) {
          s.out[0].a = lvl(s, 0);
          s.out[1].a = lvl(s, 0.32);
        },
      },
      2: {
        w: 240, h: 130, power: 0.9,
        parts: (() => {
          const sky = [[-112, 10], [-112, -18], [-84, -18], [-84, -44], [-58, -44], [-58, -8], [-40, -8], [-40, -54],
            [-24, -64], [-8, -54], [-8, -24], [16, -24], [16, -50], [42, -50], [42, -14], [62, -14], [62, -36],
            [88, -36], [88, -4], [112, -4], [112, 10], [-112, 10]];
          const parts = [
            { draw: (g, T) => T.path((p) => { sky.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); }) },
            { draw: (g, T) => T.text('the city', 0, 42, 32, NEON) },
          ];
          [[-98, -2], [-71, -30], [-71, -12], [-30, -40], [-18, -40], [-24, -20], [24, -38], [32, -24], [24, -10],
            [72, -24], [78, -10], [100, 2]].forEach(([x, y]) => {
            parts.push({ win: true, draw: (g, T) => T.box(x - 3.5, y - 4, 7, 8) });
          });
          return parts;
        })(),
        behave(s, t, rm) {
          const b = lvl(s, 0);
          s.out[0].a = b;
          s.out[1].a = lvl(s, 0.18);
          for (let i = 2; i < s.out.length; i++) {
            const k = i - 2;
            const per = 1.6 + (k % 4) * 0.85;
            const on = rm ? k % 3 !== 1 : hash(k * 31 + Math.floor((t + k * 0.73) / per)) > 0.38;
            s.out[i].a = b > 0.85 && on ? b : 0;
          }
        },
      },
      3: {
        w: 300, h: 76, power: 1.0, kind: 'coin',
        parts: ['M.', 'O.', 'N.', 'E.', 'Y.'].map((L, i) => ({
          draw: (g, T) => T.text(L, -116 + i * 58, 2, 50, NEON),
        })),
        behave(s, t, rm) {
          for (let i = 0; i < 5; i++) {
            if (s.coins > i || (s.coins === 0 && s.base > 0)) {
              const since = t - (s.coinAt[i] || -9);
              const f = rm ? 1 : since < 0.35 ? (hash(Math.floor(since * 40) + i * 7) > 0.45 ? 1 : 0.08) : 1;
              s.out[i].a = s.coins > i ? f : s.base;
            } else s.out[i].a = 0;
          }
        },
      },
      4: {
        w: 250, h: 120, power: 0.95,
        parts: [
          { draw: (g, T) => T.text('chocolate', 0, -8, 76, SCRIPT) },
          { drip: true, draw: (g, T) => T.drop(-66, 24) },
          { drip: true, draw: (g, T) => T.drop(4, 26) },
          { drip: true, draw: (g, T) => T.drop(58, 22) },
        ],
        behave(s, t, rm) {
          const b = lvl(s, 0);
          s.out[0].a = b;
          for (let i = 1; i < 4; i++) {
            const o = s.out[i];
            if (rm) { o.a = b; o.dy = 0; continue; }
            const per = 3.1 + i * 0.9;
            const ph = ((t + i * 1.37) % per) / per;
            const fall = ph < 0.45 ? 0 : (ph - 0.45) / 0.55;
            o.dy = fall * fall * 46;
            o.sc = ph < 0.45 ? 0.55 + ph : 1;
            o.a = b * (fall > 0.82 ? (1 - fall) / 0.18 : 1);
          }
        },
      },
      5: {
        w: 150, h: 84, power: 1.05, style: 'snap',
        parts: [
          { draw: (g, T) => T.path((p) => rr(p, -70, -38, 140, 76, 6)) },
          { draw: (g, T) => T.text('sex', 0, -2, 50, NEON) },
        ],
        behave(s, t, rm) {
          const b = lvl(s, 0);
          const blink = rm || s.strikeT < 1 ? 1 : ((t % 1.6) < 1.12 ? 1 : 0.035);
          s.out[0].a = b * blink;
          s.out[1].a = b * blink;
        },
      },
      6: {
        w: 190, h: 120, power: 0.9,
        parts: [
          { draw: (g, T) => T.path((p) => {
            rr(p, -82, -46, 164, 78, 24);
            p.moveTo(-44, 32); p.lineTo(-62, 58); p.lineTo(-20, 32);
          }) },
          { draw: (g, T) => T.text('talk', 24, -8, 46, NEON, 'right') },
          { draw: (g, T) => T.text('!', 30, -8, 46, NEON, 'left') },
        ],
        behave(s, t, rm) {
          const b = lvl(s, 0);
          let syl = 1;
          if (!rm) {
            const gate = Math.sin(t * 0.95) + 0.35 * Math.sin(t * 2.3) > -0.25;
            const v = 0.5 + 0.5 * Math.sin(t * 15 + 3 * Math.sin(t * 3.1));
            syl = gate ? (v > 0.42 ? 1 : 0.25) : 0.12;
          }
          s.out[0].a = b * (0.9 + 0.1 * syl);
          s.out[1].a = b;
          s.out[2].a = b * syl;
        },
      },
      7: {
        w: 380, h: 70, power: 0.95,
        parts: [
          { draw: (g, T) => T.text('an', -66, 0, 42, NEON, 'right') },
          { draw: (g, T) => T.text('encounter', -44, 0, 42, NEON, 'left') },
          { spark: true, draw: (g, T) => T.path((p) => {
            p.moveTo(-55, -16); p.lineTo(-55, 16); p.moveTo(-68, 0); p.lineTo(-42, 0);
          }) },
        ],
        behave(s, t, rm, dt) {
          const want = s.on ? 1 : 0;
          const prev = s.meet;
          if (rm) s.meet = want;
          else s.meet += clamp(want - s.meet, -dt * 1.6, dt * 0.75);
          if (prev < 0.999 && s.meet >= 0.999 && s.on) { s.spark = 1; room.sfx.spark(s); }
          s.spark = Math.max(0, s.spark - dt * 2.2);
          const apart = (1 - ease(clamp(s.meet, 0, 1))) * 34;
          const b = s.on ? lvl(s, 0) * (s.meet > 0.999 ? 1 : 0.38) : s.base;
          s.out[0].a = b; s.out[0].dx = -apart;
          s.out[1].a = b; s.out[1].dx = apart;
          s.out[2].a = s.spark;
          s.out[2].sc = 0.6 + s.spark * 0.6;
        },
      },
      8: {
        w: 130, h: 140, power: 0.95,
        parts: [
          { draw: (g, T) => T.path((p) => {
            p.moveTo(0, 30);
            p.bezierCurveTo(-58, -8, -46, -62, 0, -30);
            p.bezierCurveTo(46, -62, 58, -8, 0, 30);
          }) },
          { draw: (g, T) => T.text('heart out', 0, 56, 26, NEON) },
        ],
        behave(s, t, rm) {
          const b = lvl(s, 0);
          let beat = 0;
          if (!rm) {
            const ph = (t * 1.12) % 1;
            beat = Math.max(Math.exp(-Math.pow(ph / 0.055, 2)), 0.6 * Math.exp(-Math.pow((ph - 0.2) / 0.055, 2)));
          }
          s.out[0].a = b * (0.62 + 0.38 * beat);
          s.out[0].sc = 1 + 0.06 * beat;
          s.out[0].dy = -3 * beat;
          s.out[1].a = b;
        },
      },
      9: {
        w: 300, h: 76, power: 0.9,
        parts: [
          { draw: (g, T) => T.text('settle', -6, 0, 46, NEON, 'right') },
          { draw: (g, T) => T.text('down', 8, 0, 46, NEON, 'left') },
        ],
        behave(s, t, rm, dt) {
          const b = lvl(s, 0);
          let f = 1;
          let sag = 0;
          if (s.on && !room.settled) {
            if (rm) f = 0.72;
            else {
              s.drop -= dt;
              if (s.drop < -s.gap) {
                s.drop = 0.05 + Math.random() * 0.35;
                s.gap = 0.4 + Math.random() * 2.4;
                s.dropLvl = Math.random() * 0.35;
                room.sfx.sputter(s);
              }
              if (s.drop > 0) { f = s.dropLvl * (hash(Math.floor(t * 30)) > 0.5 ? 1 : 0.4); sag = 3; }
              else f = 0.88 + 0.12 * hash(Math.floor(t * 24));
            }
          }
          s.sag += (sag - s.sag) * Math.min(1, dt * 8);
          s.out[0].a = b * f;
          s.out[1].a = b * (s.drop > 0 ? f * 0.6 : f);
          s.out[1].dy = s.sag;
          s.glowMul = f;
        },
      },
      10: {
        w: 210, h: 120, power: 0.9,
        parts: [
          { draw: (g, T) => T.path((p) => {
            p.ellipse(-30, -26, 24, 12, -0.08, 0, TAU);
            p.moveTo(54, -26);
            p.ellipse(30, -26, 24, 12, 0.08, 0, TAU);
            p.moveTo(-6, -27); p.quadraticCurveTo(0, -33, 6, -27);
            p.moveTo(-54, -28); p.quadraticCurveTo(-78, -30, -96, -18);
            p.moveTo(54, -28); p.quadraticCurveTo(78, -30, 96, -18);
          }) },
          { pupil: true, draw: (g, T) => T.dot(-30, -26, 5) },
          { pupil: true, draw: (g, T) => T.dot(30, -26, 5) },
          { draw: (g, T) => T.text('robbers', 0, 26, 44, NEON) },
        ],
        behave(s, t, rm, dt) {
          const b = lvl(s, 0);
          const slot = Math.floor(t / 1.35);
          const want = rm ? 0 : [-1, 0, 1, 0, 1, -1, 0][slot % 7] * 13;
          s.look += (want - s.look) * Math.min(1, dt * 9);
          s.out[0].a = b;
          s.out[1].a = b; s.out[1].dx = s.look;
          s.out[2].a = b; s.out[2].dx = s.look;
          s.out[3].a = lvl(s, 0.2);
        },
      },
      11: {
        w: 150, h: 76, power: 0.85, kind: 'pair', mate: 14,
        parts: [
          { draw: (g, T) => T.path((p) => rr(p, -70, -34, 140, 68, 3)) },
          { draw: (g, T) => T.text('girls', 0, -2, 42, NEON) },
        ],
      },
      12: {
        w: 170, h: 170, power: 0.95, kind: 'cord', pivot: [0, -76],
        parts: [
          { draw: (g, T) => T.path((p) => p.arc(0, 0, 70, 0, TAU)) },
          { draw: (g, T) => T.text('12', 0, 4, 84, NEON) },
        ],
        behave(s, t, rm, dt) {
          if (!rm) {
            s.swingV += (-s.rot * 30 - s.swingV * 2.2) * dt;
            s.rot += s.swingV * dt;
          } else { s.rot = 0; s.swingV = 0; }
          if (!s.pulling) s.pull += (0 - s.pull) * Math.min(1, dt * 14);
          s.out[0].a = lvl(s, 0);
          s.out[1].a = lvl(s, 0.12);
        },
      },
      13: {
        w: 260, h: 88, power: 0.9,
        parts: [
          { draw: (g, T) => T.path((p) => rr(p, -126, -38, 252, 76, 8)) },
          { draw: (g, T) => T.text('she way out', -110, -1, 30, NEON, 'left') },
          { draw: (g, T) => T.path((p) => { p.moveTo(62, -13); p.lineTo(73, 0); p.lineTo(62, 13); }) },
          { draw: (g, T) => T.path((p) => { p.moveTo(80, -13); p.lineTo(91, 0); p.lineTo(80, 13); }) },
          { draw: (g, T) => T.path((p) => { p.moveTo(98, -13); p.lineTo(109, 0); p.lineTo(98, 13); }) },
        ],
        behave(s, t, rm) {
          const b = lvl(s, 0);
          s.out[0].a = b;
          s.out[1].a = lvl(s, 0.15);
          const k = rm ? 4 : Math.floor(t * 3.2) % 5;
          for (let i = 0; i < 3; i++) s.out[2 + i].a = b * (i < k ? 1 : 0.06);
        },
      },
      14: {
        w: 240, h: 76, power: 0.9, kind: 'pair', mate: 11,
        parts: [
          { draw: (g, T) => T.path((p) => rr(p, -114, -34, 228, 68, 3)) },
          { draw: (g, T) => T.text('menswear', 0, -2, 42, NEON) },
        ],
      },
      15: {
        w: 240, h: 100, power: 1.0, kind: 'hold',
        parts: (() => {
          const parts = [{ draw: (g, T) => T.text('pressure', 0, -12, 48, NEON) }];
          for (let i = 0; i < 10; i++) {
            const x = -104 + i * 21.6;
            parts.push({ draw: (g, T) => T.path((p) => { p.moveTo(x, 30); p.lineTo(x + 13, 30); }) });
          }
          return parts;
        })(),
        behave(s, t, rm, dt) {
          if (!s.on) {
            if (s.holding) {
              s.p = Math.min(1, s.p + dt * 0.5);
              if (s.p >= 1) room.latch(s);
            } else s.p = Math.max(0, s.p - dt * 0.9);
          }
          const jit = rm ? 1 : 0.75 + 0.25 * hash(Math.floor(t * 28));
          if (s.on) {
            const b = lvl(s, 0);
            for (let i = 0; i < s.out.length; i++) s.out[i].a = b;
          } else {
            s.out[0].a = s.p * 0.55 * jit + (s.base * 0.9);
            for (let i = 1; i < s.out.length; i++) s.out[i].a = Math.max(s.base, s.p * 10 > i - 1 ? 0.75 * jit : 0);
          }
        },
      },
      16: {
        w: 250, h: 180, power: 1.0,
        parts: [
          { draw: (g, T) => T.path((p) => {
            p.moveTo(-74, -34); p.quadraticCurveTo(0, -92, 74, -34); p.quadraticCurveTo(0, 24, -74, -34);
          }) },
          { pupil: true, draw: (g, T) => { T.path((p) => p.arc(0, -34, 17, 0, TAU)); T.dot(0, -34, 6); } },
          { draw: (g, T) => T.text('is there somebody', 0, 28, 25, NEON) },
          { draw: (g, T) => T.text('who can watch you', 0, 58, 25, NEON) },
        ],
        behave(s, t, rm, dt) {
          s.out[2].a = lvl(s, 0);
          s.out[3].a = lvl(s, 0.4);
          const eye = lvl(s, 0.85);
          s.out[0].a = eye;
          s.out[1].a = eye;
          // the iris follows whoever is looking at it
          const ex = s.X, ey = s.Y - 34 * s.k;
          let tx = 0, ty = 0;
          if (room.pointer.seen && !rm) {
            const vx = room.pointer.x - ex, vy = room.pointer.y - ey;
            const d = Math.hypot(vx, vy) || 1;
            const m = Math.min(1, d / (260 * s.k));
            tx = (vx / d) * 34 * m;
            ty = (vy / d) * 9 * m;
          }
          s.gx += (tx - s.gx) * Math.min(1, dt * 7);
          s.gy += (ty - s.gy) * Math.min(1, dt * 7);
          s.out[1].dx = s.gx; s.out[1].dy = s.gy;
        },
      },
    };
  }

  /* where they hang. [x, y, size] in a design frame, mapped onto the window */
  const LAYOUTS = {
    land: {
      W: 1440, H: 900, hz: 640,
      pos: {
        1: [720, 345, 1], 2: [300, 178, 1], 3: [1150, 106, 0.95], 4: [262, 470, 1], 5: [496, 150, 1],
        6: [1010, 548, 1], 7: [720, 532, 1], 8: [1062, 318, 1], 9: [462, 598, 1], 10: [1244, 430, 1],
        11: [904, 140, 1], 12: [100, 300, 1], 13: [1272, 566, 1], 14: [704, 140, 1], 15: [334, 330, 1],
        16: [1296, 256, 1],
      },
      road: 'NOT HOME YET',
    },
    port: {
      W: 390, H: 844, hz: 664,
      pos: {
        14: [104, 96, 0.52], 11: [252, 96, 0.52], 12: [346, 154, 0.42],
        2: [86, 174, 0.55], 3: [228, 165, 0.5],
        5: [64, 238, 0.5], 15: [226, 238, 0.55],
        1: [195, 329, 0.74],
        4: [88, 425, 0.52], 16: [215, 424, 0.5], 8: [334, 420, 0.5],
        6: [70, 509, 0.5], 10: [196, 507, 0.5], 13: [322, 506, 0.44],
        7: [195, 573, 0.62], 9: [195, 624, 0.58],
      },
      road: 'NOT HOME YET',
    },
  };

  const NOTES = { 1: 164.81, 2: 246.94, 3: 415.3, 4: 277.18, 5: 329.63, 6: 369.99, 7: 123.47, 8: 207.65,
    9: 185.0, 10: 554.37, 11: 659.26, 12: 493.88, 13: 739.99, 14: 830.61, 15: 98.0, 16: 987.77 };

  /* the strike: a starter that stutters a few times before the gas catches */
  function makePattern(style) {
    const seg = [];
    if (style === 'snap') return [[0.05, 0.9], [0.06, 0], [0.03, 1]];
    const n = style === 'slow' ? 6 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      seg.push([0.025 + Math.random() * 0.08, Math.random() < 0.6 ? 0.55 + Math.random() * 0.45 : 0.12 + Math.random() * 0.3]);
      seg.push([0.04 + Math.random() * (style === 'slow' ? 0.22 : 0.13), Math.random() * 0.06]);
    }
    return seg;
  }
  function patLevel(pat, t) {
    if (t < 0) return 0;
    let acc = 0;
    for (let i = 0; i < pat.length; i++) {
      acc += pat[i][0];
      if (t < acc) return pat[i][1];
    }
    return 1;
  }

  let room = null; // the live room, for behaviours that need it
  function lvl(s, offset) {
    if (!s.on) return s.base;
    if (room && room.rm) return 1;
    return patLevel(s.pat, s.strikeT - offset);
  }

  /* ------------------------------------------------------------------ */

  function createRoom(root, ctx) {
    const audio = ctx.audio;
    const tracks = ctx.tracks;
    const SIGNS = defs();
    let alive = true;
    let raf = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); };

    /* ---------- DOM ---------- */
    const canvas = document.createElement('canvas');
    canvas.className = 'st-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const hits = document.createElement('div');
    hits.className = 'st-hits';
    hits.setAttribute('role', 'group');
    hits.setAttribute('aria-label', 'Sixteen neon signs on a wall');
    const grain = document.createElement('div');
    grain.className = 'st-grain';
    const vignette = document.createElement('div');
    vignette.className = 'st-vignette';
    const caption = document.createElement('p');
    caption.className = 'st-caption';
    caption.setAttribute('aria-live', 'polite');
    root.append(canvas, hits, grain, vignette, caption);
    const mctx = canvas.getContext('2d');

    // film grain tile
    (function () {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const g = c.getContext('2d');
      const img = g.createImageData(160, 160);
      const r = rng(2013);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.floor(r() * 255);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      root.style.setProperty('--st-grain', 'url(' + c.toDataURL() + ')');
    })();

    const R = {
      rm: !!ctx.reducedMotion,
      settled: false,
      pointer: { x: 0, y: 0, seen: false },
      latch: null,
      sfx: null,
    };
    room = R;

    /* ---------- sign state ---------- */
    const signs = tracks.map((tr) => {
      const d = SIGNS[tr.n];
      const s = Object.assign({
        n: tr.n, title: tr.title, kind: 'toggle', power: 1, style: 'normal', pivot: [0, 0],
        on: false, base: 0, strikeT: 0, pat: [[0.01, 1]], hover: false,
        coins: 0, coinAt: [], meet: 0, spark: 0, drop: 0, gap: 1, dropLvl: 0, sag: 0, look: 0,
        p: 0, holding: false, rot: 0, swingV: 0, pull: 0, pulling: false, gx: 0, gy: 0, glowMul: 1, glow: 0,
        X: 0, Y: 0, k: 1, lit: [], dark: [],
      }, d);
      s.out = d.parts.map(() => ({ a: 0, dx: 0, dy: 0, sc: 1 }));
      return s;
    });
    const byN = {};
    signs.forEach((s) => { byN[s.n] = s; });
    let everLit = false;
    let litCount = 0;
    let pulse = null;      // current travelling down the wire between the two shop signs
    let ev = null;         // the all-sixteen moment
    let frameLvl = 0;
    let msgA = 0;
    let hint = null;
    let hintUntil = 0;

    /* ---------- geometry ---------- */
    let vw = 1, vh = 1, dpr = 1, S = 1, ox = 0, oy = 0, hz = 0, L = LAYOUTS.land, portrait = false;
    let albedo = null, light = null, lctx = null, refl = null, rctx = null, rmask = null, rainC = null, rainCtx = null;
    let msgC = null, frameSpr = null, blob = null;
    const LS = 6;   // light map is this many times coarser than the screen
    const RS = 3;   // reflection buffer scale
    const hitEls = {};

    function layout() {
      vw = Math.max(1, root.clientWidth || window.innerWidth);
      vh = Math.max(1, root.clientHeight || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      portrait = vw / vh < 0.85;
      L = portrait ? LAYOUTS.port : LAYOUTS.land;
      S = Math.min(vw / L.W, vh / L.H);
      ox = (vw - L.W * S) / 2;
      oy = (vh - L.H * S) / 2;
      hz = Math.round(oy + L.hz * S);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      signs.forEach((s) => {
        const [x, y, z] = L.pos[s.n];
        s.X = ox + x * S;
        s.Y = oy + y * S;
        s.k = S * z;
      });
      buildSprites();
      buildAlbedo();
      buildBuffers();
      placeHits();
      frameSpr = null;
    }

    /* ---------- sprites: every tube pre-drawn twice, dead and burning ---------- */
    const LIT = [
      { blur: 26, shadow: 'rgba(255,255,255,0.95)', col: 'rgba(255,255,255,0.4)', lw: 1.7, ts: 1.1 },
      { blur: 9, shadow: 'rgba(255,255,255,1)', col: '#ededed', lw: 1.0, ts: 0 },
      { blur: 0, col: '#ffffff', lw: 0.42, ts: 0 },
    ];
    const DARK = [
      { blur: 0, col: '#1b1b1b', lw: 1.3, ts: 1.8 },
      { blur: 0, col: '#3c3c3c', lw: 0.34, ts: 0.55, nofill: true },
    ];
    function makeT(g) {
      const T = {
        mode: null,
        text(str, x, y, size, font, align) {
          g.font = size + 'px ' + font;
          g.textAlign = align || 'center';
          g.textBaseline = 'middle';
          if (!T.mode.nofill) g.fillText(str, x, y);
          if (T.mode.ts) {
            const lw = g.lineWidth;
            g.lineWidth = T.mode.ts;
            g.strokeText(str, x, y);
            g.lineWidth = lw;
          }
        },
        path(fn) { g.beginPath(); fn(g); g.stroke(); },
        box(x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); g.stroke(); },
        dot(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (!T.mode.nofill) g.fill(); else g.stroke(); },
        drop(x, y) {
          g.beginPath();
          g.moveTo(x, y - 6);
          g.quadraticCurveTo(x + 6, y + 4, x, y + 8);
          g.quadraticCurveTo(x - 6, y + 4, x, y - 6);
          if (!T.mode.nofill) g.fill();
          g.stroke();
        },
      };
      return T;
    }
    function sprite(s, part, passes) {
      const k = s.k * dpr;
      const W = Math.max(2, Math.ceil((s.w + PAD * 2) * k));
      const H = Math.max(2, Math.ceil((s.h + PAD * 2) * k));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const T = makeT(g);
      g.translate(W / 2, H / 2);
      g.scale(k, k);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const ps of passes) {
        g.save();
        g.shadowBlur = ps.blur * k;
        g.shadowColor = ps.shadow || 'rgba(0,0,0,0)';
        g.fillStyle = g.strokeStyle = ps.col;
        g.lineWidth = TW * ps.lw;
        T.mode = ps;
        part.draw(g, T);
        g.restore();
      }
      return c;
    }
    function buildSprites() {
      signs.forEach((s) => {
        s.lit = s.parts.map((p) => sprite(s, p, LIT));
        s.dark = s.parts.map((p) => (p.drip || p.spark ? null : sprite(s, p, DARK)));
      });
      blob = document.createElement('canvas');
      blob.width = blob.height = 128;
      const g = blob.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.18, 'rgba(255,255,255,0.62)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.22)');
      gr.addColorStop(0.75, 'rgba(255,255,255,0.05)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }
    function buildFrame() {
      const c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineJoin = 'round';
      const m = Math.max(9, Math.round(Math.min(vw, vh) * 0.014));
      for (const ps of LIT) {
        g.save();
        g.shadowBlur = ps.blur * dpr * 0.9;
        g.shadowColor = ps.shadow || 'rgba(0,0,0,0)';
        g.strokeStyle = ps.col;
        g.lineWidth = 3.4 * ps.lw;
        g.beginPath();
        rr(g, m, m, vw - m * 2, vh - m * 2, 3);
        g.stroke();
        g.restore();
      }
      frameSpr = c;
    }

    /* ---------- the wall and the street: only visible where light lands ---------- */
    function buildAlbedo() {
      albedo = document.createElement('canvas');
      albedo.width = canvas.width; albedo.height = canvas.height;
      const g = albedo.getContext('2d');
      g.scale(dpr, dpr);
      const r = rng(1975);
      const Sb = portrait ? S * 0.82 : S;

      // brick
      g.fillStyle = 'rgb(28,28,28)';
      g.fillRect(0, 0, vw, hz);
      const bw = 58 * Sb, bh = 19 * Sb, mo = Math.max(1, 2.4 * Sb);
      let row = 0;
      for (let y = hz - bh; y > -bh; y -= bh, row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let x = -off; x < vw; x += bw) {
          const v = 52 + r() * 38 + (r() < 0.06 ? -22 : 0);
          g.fillStyle = 'rgb(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ')';
          g.fillRect(x + mo / 2, y + mo / 2, bw - mo, bh - mo);
        }
      }
      // grime and soot: darker drifts down the wall
      for (let i = 0; i < 26; i++) {
        const x = r() * vw;
        const w = (20 + r() * 90) * Sb;
        const gr = g.createLinearGradient(0, 0, 0, hz);
        const a = 0.12 + r() * 0.22;
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.5 + r() * 0.3, 'rgba(0,0,0,' + a + ')');
        gr.addColorStop(1, 'rgba(0,0,0,' + a * 0.6 + ')');
        g.fillStyle = gr;
        g.fillRect(x, 0, w, hz);
      }
      // speckle
      for (let i = 0; i < 2600; i++) {
        const v = r() < 0.5 ? 0 : 255;
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.05 + r() * 0.1) + ')';
        g.fillRect(r() * vw, r() * hz, 1 + r() * 2, 1 + r() * 2);
      }
      // a drainpipe
      const px = portrait ? vw - 14 * S : ox + 1408 * S;
      const pw = Math.max(6, 11 * Sb);
      g.fillStyle = 'rgb(70,70,70)';
      g.fillRect(px - pw / 2, 0, pw, hz);
      g.fillStyle = 'rgb(120,120,120)';
      g.fillRect(px - pw / 2 + 2, 0, Math.max(1, pw * 0.18), hz);
      for (let y = 40 * Sb; y < hz; y += 150 * Sb) {
        g.fillStyle = 'rgb(45,45,45)';
        g.fillRect(px - pw * 0.9, y, pw * 1.8, 5 * Sb);
      }
      // a low conduit the cables run into
      const cy = hz - 22 * Sb;
      g.fillStyle = 'rgb(66,66,66)';
      g.fillRect(0, cy, vw, 6 * Sb);
      g.fillStyle = 'rgb(105,105,105)';
      g.fillRect(0, cy, vw, Math.max(1, 1.4 * Sb));
      // each sign's transformer and cable
      signs.forEach((s) => {
        const k = s.k;
        const bx = s.X + (s.n % 2 ? -1 : 1) * s.w * 0.22 * k;
        const by = s.Y + (s.h / 2 + 10) * k;
        g.strokeStyle = 'rgb(18,18,18)';
        g.lineWidth = Math.max(1.2, 2.4 * k);
        g.beginPath();
        g.moveTo(bx, by + 12 * k);
        const sway = (r() - 0.5) * 40 * Sb;
        g.bezierCurveTo(bx + sway, by + (cy - by) * 0.4, bx - sway, by + (cy - by) * 0.7, bx + sway * 0.3, cy);
        g.stroke();
        g.fillStyle = 'rgb(40,40,40)';
        g.fillRect(bx - 18 * k, by - 2 * k, 36 * k, 18 * k);
        g.fillStyle = 'rgb(96,96,96)';
        g.fillRect(bx - 18 * k, by - 2 * k, 36 * k, 2 * k);
        // stand-offs at the corners
        g.fillStyle = 'rgb(110,110,110)';
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          g.beginPath();
          g.arc(s.X + sx * (s.w / 2 - 14) * k, s.Y + sy * (s.h / 2 - 12) * k, Math.max(1, 2.6 * k), 0, TAU);
          g.fill();
        });
      });
      // the wire between the two shop signs
      const a = byN[14], b = byN[11];
      g.strokeStyle = 'rgb(16,16,16)';
      g.lineWidth = Math.max(1.2, 2.2 * a.k);
      g.beginPath();
      g.moveTo(a.X + (a.w / 2 - 6) * a.k, a.Y - 20 * a.k);
      g.quadraticCurveTo((a.X + b.X) / 2, a.Y - 4 * a.k, b.X - (b.w / 2 - 6) * b.k, b.Y - 20 * b.k);
      g.stroke();

      // the pavement and the road
      const gh = vh - hz;
      g.fillStyle = 'rgb(40,40,40)';
      g.fillRect(0, hz, vw, gh);
      // plinth at the bottom of the wall
      g.fillStyle = 'rgb(92,92,92)';
      g.fillRect(0, hz, vw, Math.max(2, 5 * Sb));
      const kerb = hz + gh * 0.3;
      const vx = vw / 2, vy = hz - vh * 0.55;
      g.strokeStyle = 'rgb(22,22,22)';
      g.lineWidth = Math.max(1, 1.4 * Sb);
      for (let x = -vw; x < vw * 2; x += 96 * Sb) {
        g.beginPath();
        const t0 = (hz - vy) / (hz - vy);
        g.moveTo(vx + (x - vx) * t0, hz);
        const t1 = (kerb - vy) / (hz - vy);
        g.lineTo(vx + (x - vx) * t1, kerb);
        g.stroke();
      }
      for (let i = 1; i < 4; i++) {
        const y = hz + (kerb - hz) * (1 - 1 / (1 + i * 0.9)) * 1.35;
        if (y < kerb - 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(vw, y); g.stroke(); }
      }
      // kerb stone
      g.fillStyle = 'rgb(118,118,118)';
      g.fillRect(0, kerb, vw, Math.max(2, 4 * Sb));
      g.fillStyle = 'rgb(20,20,20)';
      g.fillRect(0, kerb + 4 * Sb, vw, Math.max(2, 7 * Sb));
      // road: darker, with a painted line along the gutter
      g.fillStyle = 'rgb(30,30,30)';
      g.fillRect(0, kerb + 11 * Sb, vw, vh);
      g.fillStyle = 'rgb(150,150,150)';
      g.fillRect(0, kerb + 22 * Sb, vw, Math.max(2, 3.5 * Sb));
      g.fillRect(0, kerb + 30 * Sb, vw, Math.max(2, 3.5 * Sb));
      // grit
      for (let i = 0; i < 2200; i++) {
        const v = r() < 0.5 ? 0 : 255;
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.04 + r() * 0.08) + ')';
        g.fillRect(r() * vw, hz + r() * gh, 1 + r() * 2, 1);
      }
      // puddles (darker; they mirror rather than scatter)
      R.puddles = [];
      for (let i = 0; i < 9; i++) {
        const pxp = r() * vw;
        const py = hz + gh * (0.12 + r() * 0.8);
        const depth = (py - hz) / gh;
        const pw2 = (70 + r() * 220) * Sb * (0.6 + depth);
        const ph2 = pw2 * (0.06 + depth * 0.1);
        R.puddles.push([pxp, py, pw2, ph2]);
        g.fillStyle = 'rgba(8,8,8,0.75)';
        g.beginPath();
        g.ellipse(pxp, py, pw2, ph2, 0, 0, TAU);
        g.fill();
      }
      R.kerb = kerb;

      // the road marking that only the full light finds
      msgC = document.createElement('canvas');
      msgC.width = canvas.width; msgC.height = canvas.height;
      const mg = msgC.getContext('2d');
      mg.scale(dpr, dpr);
      const roadTop = kerb + 40 * Sb;
      const roadH = vh - roadTop;
      if (roadH > 20) {
        const fs = Math.min(vw * (portrait ? 0.16 : 0.11), roadH * 1.9);
        mg.save();
        mg.translate(vw / 2, roadTop + roadH * 0.36);
        mg.scale(1, 0.34);
        mg.font = '500 ' + fs + 'px ' + ROAD;
        mg.textAlign = 'center';
        mg.textBaseline = 'middle';
        mg.fillStyle = 'rgba(190,190,190,0.8)';
        mg.fillText(L.road, 0, 0);
        // worn paint
        mg.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 900; i++) {
          mg.fillStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.7) + ')';
          mg.fillRect((r() - 0.5) * vw, (r() - 0.5) * fs * 1.4, 1 + r() * 5, 1 + r() * 8);
        }
        mg.restore();
        R.road = [vw / 2 - vw * 0.45, roadTop + roadH * 0.4 - roadH * 0.9, vw * 0.9, roadH * 1.8];
      }
    }

    function buildBuffers() {
      light = document.createElement('canvas');
      light.width = Math.ceil(vw / LS); light.height = Math.ceil(vh / LS);
      lctx = light.getContext('2d');
      const gh = Math.max(1, vh - hz);
      refl = document.createElement('canvas');
      refl.width = Math.ceil(vw / RS); refl.height = Math.max(1, Math.ceil(gh / RS));
      rctx = refl.getContext('2d');
      // how strongly each patch of ground mirrors
      rmask = document.createElement('canvas');
      rmask.width = refl.width; rmask.height = refl.height;
      const mg = rmask.getContext('2d');
      mg.fillStyle = 'rgb(88,88,88)';
      mg.fillRect(0, 0, rmask.width, rmask.height);
      mg.fillStyle = 'rgb(60,60,60)';
      mg.fillRect(0, (R.kerb - hz) / RS, rmask.width, 12 / RS);
      mg.fillStyle = 'rgb(250,250,250)';
      (R.puddles || []).forEach(([x, y, w, h]) => {
        mg.beginPath();
        mg.ellipse(x / RS, (y - hz) / RS, w / RS, h / RS, 0, 0, TAU);
        mg.fill();
      });
      // fade the mirror out with distance from the wall so it reads as a ground plane
      const gr = mg.createLinearGradient(0, 0, 0, rmask.height);
      gr.addColorStop(0, 'rgb(255,255,255)');
      gr.addColorStop(1, 'rgb(150,150,150)');
      mg.globalCompositeOperation = 'multiply';
      mg.fillStyle = gr;
      mg.fillRect(0, 0, rmask.width, rmask.height);
      rainC = document.createElement('canvas');
      rainC.width = Math.ceil(vw / 2); rainC.height = Math.ceil(vh / 2);
      rainCtx = rainC.getContext('2d');
      seedRain();
    }

    /* ---------- rain: you only see it where it crosses the light ---------- */
    let drops = [];
    let ripples = [];
    function seedRain() {
      const n = Math.round(clamp((vw * vh) / 7000, 60, 240));
      const r = rng(77);
      drops = [];
      for (let i = 0; i < n; i++) drops.push(newDrop(r() * vh, r));
      ripples = [];
    }
    function newDrop(y, r) {
      r = r || Math.random;
      const gh = vh - hz;
      return {
        x: r() * vw * 1.1 - vw * 0.05,
        y: y == null ? -20 - r() * 100 : y,
        v: (900 + r() * 500) * Math.max(0.6, S),
        len: (14 + r() * 18) * Math.max(0.6, S),
        land: hz + 4 + r() * gh * 0.98,
      };
    }

    /* ---------- hit areas: real buttons over each tube ---------- */
    function placeHits() {
      signs.forEach((s) => {
        let el = hitEls[s.n];
        if (!el) el = makeHit(s);
        let w = Math.max(44, s.w * s.k), h = Math.max(44, s.h * s.k);
        let x = s.X - w / 2, y = s.Y - h / 2;
        if (s.kind === 'cord') { h += 96 * s.k; }
        el.style.left = x.toFixed(1) + 'px';
        el.style.top = y.toFixed(1) + 'px';
        el.style.width = w.toFixed(1) + 'px';
        el.style.height = h.toFixed(1) + 'px';
      });
    }
    function makeHit(s) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-hit';
      b.dataset.n = s.n;
      b.dataset.kind = s.kind;
      const sr = document.createElement('span');
      sr.className = 'st-sr';
      sr.textContent = s.title;
      b.appendChild(sr);
      b.setAttribute('aria-pressed', 'false');
      const enter = () => { s.hover = true; };
      const leave = () => { s.hover = false; };
      b.addEventListener('pointerenter', enter);
      b.addEventListener('pointerleave', leave);
      b.addEventListener('focus', enter);
      b.addEventListener('blur', () => { leave(); if (s.kind === 'hold') release(s); });

      if (s.kind === 'hold') {
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          press(s);
        });
        b.addEventListener('pointerup', () => release(s));
        b.addEventListener('pointercancel', () => release(s));
        b.addEventListener('keydown', (e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          e.preventDefault();
          if (!e.repeat) press(s);
        });
        b.addEventListener('keyup', (e) => {
          if (e.key !== ' ' && e.key !== 'Enter') return;
          e.preventDefault();
          release(s);
        });
        b.addEventListener('click', (e) => e.preventDefault());
      } else if (s.kind === 'cord') {
        let y0 = 0;
        b.addEventListener('pointerdown', (e) => {
          y0 = e.clientY;
          s.pulling = true;
          try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        });
        b.addEventListener('pointermove', (e) => {
          if (!s.pulling) return;
          s.pull = clamp((e.clientY - y0) / s.k, 0, 70);
        });
        const end = () => { s.pulling = false; };
        b.addEventListener('pointerup', end);
        b.addEventListener('pointercancel', end);
        b.addEventListener('click', () => {
          s.pull = Math.max(s.pull, 34);
          s.swingV += (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.4);
          sfx.cord(s);
          later(() => toggle(s), 90);
        });
      } else if (s.kind === 'coin') {
        b.addEventListener('click', () => coin(s));
      } else {
        b.addEventListener('click', () => toggle(s));
      }
      hits.appendChild(b);
      hitEls[s.n] = b;
      return b;
    }

    /* ---------- switching ---------- */
    function strike(s, quiet) {
      s.on = true;
      s.strikeT = 0;
      s.pat = makePattern(s.style);
      if (s.kind === 'coin') { s.coins = 5; for (let i = 0; i < 5; i++) s.coinAt[i] = t - 1; }
      if (!quiet) sfx.strike(s);
      after();
    }
    function kill(s) {
      if (!s.on && s.kind !== 'coin') return;
      s.on = false;
      s.base = 1;
      if (s.kind === 'coin') s.coins = 0;
      if (s.kind === 'hold') s.p = 0;
      sfx.off(s);
      after();
    }
    function toggle(s) {
      if (s.kind === 'pair') {
        const mate = byN[s.mate];
        const turnOn = !s.on;
        if (turnOn) strike(s); else kill(s);
        pulse = { from: s, to: mate, t: 0, on: turnOn };
        sfx.wire(s, mate);
        return;
      }
      if (s.on) kill(s); else strike(s);
    }
    function coin(s) {
      if (s.coins >= 5) { kill(s); return; }
      s.coinAt[s.coins] = t;
      s.coins++;
      sfx.coin(s, s.coins);
      if (s.coins === 5) { s.on = true; s.strikeT = 2; s.pat = [[0.01, 1]]; after(); }
      else if (s.coins === 1) { everLit = true; showHint('it wants a coin for every letter', 3200); updateCaption(); }
    }
    function press(s) {
      if (s.on) { kill(s); s.ignoreRelease = true; return; }
      s.ignoreRelease = false;
      s.holding = true;
      sfx.holdStart(s);
    }
    function release(s) {
      if (!s.holding) return;
      s.holding = false;
      sfx.holdEnd(s);
      if (!s.on && !s.ignoreRelease && s.p < 0.5) showHint('that one only catches if you hold it', 3000);
    }
    R.latch = (s) => {
      s.holding = false;
      s.on = true;
      s.strikeT = 2;
      s.pat = [[0.01, 1]];
      sfx.strike(s, true);
      after();
    };

    function after() {
      litCount = signs.filter((s) => s.on).length;
      if (litCount) everLit = true;
      signs.forEach((s) => { const el = hitEls[s.n]; if (el) el.setAttribute('aria-pressed', s.on ? 'true' : 'false'); });
      const others = signs.every((s) => s.n === 9 || s.on);
      R.settled = others;
      const all = litCount === signs.length;
      if (all && !ev) ev = { t: 0, car: -1, cars: 0, dir: 1 };
      if (!all && ev) ev = null;
      updateCaption();
    }

    function showHint(text, ms) {
      hint = text;
      hintUntil = t + ms / 1000;
      updateCaption();
    }
    let captionText = '';
    function updateCaption() {
      let txt;
      if (hint && t < hintUntil) txt = hint;
      else if (ev) txt = 'two in the morning, every light on';
      else if (!everLit) txt = 'sixteen tubes on a wet wall, every one dead. strike one.';
      else if (litCount === 0) txt = 'dark again';
      else if (litCount === 15 && !byN[9].on) txt = 'fifteen burning. one of them will not settle down.';
      else txt = (WORDS[litCount].charAt(0).toUpperCase() + WORDS[litCount].slice(1)) + ' of sixteen burning';
      if (txt !== captionText) { captionText = txt; caption.textContent = txt; }
    }

    /* ---------- sound ---------- */
    const A = { on: false, nodes: [], master: null, hum: null, buzz: null, voices: {} };
    function audioUp() {
      const ac = audio.ctx;
      const out = audio.out;
      if (!ac || !out || A.on) return;
      try {
        A.on = true;
        const master = ac.createGain();
        master.gain.setValueAtTime(0, ac.currentTime);
        master.gain.setTargetAtTime(1, ac.currentTime, 0.5);
        master.connect(out);
        A.master = master;
        // mains hum: 50 Hz and its first harmonic
        const o50 = ac.createOscillator(); o50.type = 'sawtooth'; o50.frequency.value = 50;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = 0.6;
        const hum = ac.createGain(); hum.gain.value = 0.006;
        o50.connect(lp).connect(hum).connect(master);
        const o100 = ac.createOscillator(); o100.type = 'sine'; o100.frequency.value = 100;
        const g100 = ac.createGain(); g100.gain.value = 0.5;
        o100.connect(g100).connect(hum);
        // neon buzz: a thin rasp that grows with every tube burning
        const sq = ac.createOscillator(); sq.type = 'square'; sq.frequency.value = 100;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 3;
        const buzz = ac.createGain(); buzz.gain.value = 0;
        sq.connect(bp).connect(buzz).connect(master);
        // rain and a far-off city, as filtered noise
        const len = ac.sampleRate * 2;
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        const rlp = ac.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 520;
        const rg = ac.createGain(); rg.gain.value = 0.03;
        src.connect(rlp).connect(rg).connect(master);
        const rhp = ac.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 5200;
        const rg2 = ac.createGain(); rg2.gain.value = 0.006;
        src.connect(rhp).connect(rg2).connect(master);
        [o50, o100, sq].forEach((o) => o.start());
        src.start();
        A.hum = hum; A.buzz = buzz;
        A.nodes.push(o50, o100, sq, src, lp, hum, g100, bp, buzz, rlp, rg, rhp, rg2);
        // one sustained voice per sign, so the lit ones make a chord
        signs.forEach((s) => {
          const f = NOTES[s.n] || 220;
          const g = ac.createGain(); g.gain.value = 0;
          const a = ac.createOscillator(); a.type = 'sine'; a.frequency.value = f;
          const b = ac.createOscillator(); b.type = 'triangle'; b.frequency.value = f * 2.003;
          const bg = ac.createGain(); bg.gain.value = 0.22;
          a.connect(g); b.connect(bg).connect(g);
          let tail = g;
          if (ac.createStereoPanner) {
            const p = ac.createStereoPanner();
            p.pan.value = clamp((s.X / vw) * 2 - 1, -1, 1) * 0.7;
            g.connect(p); tail = p; A.nodes.push(p);
          }
          tail.connect(master);
          a.start(); b.start();
          A.nodes.push(a, b, g, bg);
          A.voices[s.n] = { g, last: 0 };
        });
      } catch (e) {
        audioDown();
      }
    }
    function audioDown() {
      A.nodes.forEach((n) => {
        try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ }
        try { n.disconnect(); } catch (e) { /* ignore */ }
      });
      if (A.master) { try { A.master.disconnect(); } catch (e) { /* ignore */ } }
      A.nodes = []; A.voices = {}; A.master = null; A.hum = null; A.buzz = null; A.on = false;
    }
    function audioFrame() {
      const ac = audio.ctx;
      if (!audio.enabled || !ac) { if (A.on) audioDown(); return; }
      if (!A.on) audioUp();
      if (!A.on) return;
      const now = ac.currentTime;
      let total = 0;
      signs.forEach((s) => {
        const v = A.voices[s.n];
        if (!v) return;
        const target = clamp(s.glow, 0, 1.2) * 0.012;
        total += s.glow;
        if (Math.abs(target - v.last) > 0.0012) {
          v.g.gain.setTargetAtTime(target, now, 0.04);
          v.last = target;
        }
      });
      const holding = byN[15] && byN[15].holding ? byN[15].p : 0;
      const humT = 0.005 + total * 0.0011 + holding * 0.03;
      const buzzT = Math.min(0.012, total * 0.0006) + holding * 0.012;
      if (Math.abs(humT - (A.humLast || 0)) > 0.0004) { A.hum.gain.setTargetAtTime(humT, now, 0.1); A.humLast = humT; }
      if (Math.abs(buzzT - (A.buzzLast || 0)) > 0.0003) { A.buzz.gain.setTargetAtTime(buzzT, now, 0.1); A.buzzLast = buzzT; }
    }
    const pan = (s) => clamp((s.X / vw) * 2 - 1, -1, 1) * 0.7;
    const sfx = {
      strike(s, latched) {
        if (!audio.enabled) return;
        let acc = 0;
        const p = pan(s);
        if (!latched && !R.rm) {
          s.pat.forEach(([d, l]) => {
            if (l > 0.3) {
              audio.noise({ when: acc, dur: 0.018, gain: 0.07, type: 'highpass', freq: 3200 });
              audio.tone({ when: acc, freq: 100, type: 'square', dur: Math.max(0.03, d), gain: 0.012, attack: 0.002, release: 0.02, pan: p });
            }
            acc += d;
          });
        }
        audio.noise({ when: acc, dur: 0.16, gain: 0.07, type: 'lowpass', freq: 260 });
        audio.tone({ when: acc, freq: (NOTES[s.n] || 220) * 2, type: 'sine', dur: 0.9, gain: 0.03, attack: 0.01, release: 0.8, pan: p });
      },
      off(s) {
        audio.tone({ freq: 1700, type: 'sine', dur: 0.05, gain: 0.025, release: 0.04, pan: pan(s) });
        audio.noise({ dur: 0.05, gain: 0.05, type: 'bandpass', freq: 1800, q: 2 });
      },
      coin(s, k) {
        const p = pan(s);
        audio.tone({ freq: 2093, type: 'triangle', dur: 0.12, gain: 0.04, release: 0.1, pan: p });
        audio.tone({ when: 0.06, freq: 2793, type: 'triangle', dur: 0.3, gain: 0.03, release: 0.28, pan: p });
        audio.noise({ when: 0.02, dur: 0.02, gain: 0.05, type: 'highpass', freq: 3000 });
        audio.tone({ when: 0.05, freq: 100, type: 'square', dur: 0.12, gain: 0.006 + k * 0.003, release: 0.1, pan: p });
      },
      cord(s) {
        audio.noise({ dur: 0.06, gain: 0.06, type: 'bandpass', freq: 1300, q: 3 });
        audio.tone({ freq: 620, type: 'triangle', dur: 0.04, gain: 0.03, release: 0.03, pan: pan(s) });
      },
      wire(s, m) {
        audio.tone({ freq: 3000, glideTo: 1200, type: 'sine', dur: 0.45, gain: 0.012, attack: 0.01, release: 0.3, pan: pan(s) });
      },
      spark(s) {
        audio.noise({ dur: 0.08, gain: 0.08, type: 'highpass', freq: 4200 });
        audio.tone({ freq: (NOTES[s.n] || 220) * 4, type: 'sine', dur: 1.2, gain: 0.02, release: 1.1, pan: pan(s) });
      },
      sputter(s) {
        audio.noise({ dur: 0.03, gain: 0.045, type: 'highpass', freq: 2600 });
      },
      holdStart(s) {
        audio.tone({ freq: 60, glideTo: 120, type: 'sawtooth', dur: 2, gain: 0.01, attack: 1.2, release: 0.6, pan: pan(s) });
      },
      holdEnd() {},
      brownout() {
        audio.noise({ dur: 0.5, gain: 0.08, type: 'lowpass', freq: 140 });
        audio.tone({ freq: 50, glideTo: 30, type: 'sawtooth', dur: 0.4, gain: 0.03, release: 0.3 });
      },
      car(dir) {
        const ac = audio.ctx;
        const out = A.master;
        if (!ac || !out) return;
        try {
          const dur = 3.6;
          const len = Math.floor(ac.sampleRate * dur);
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          const src = ac.createBufferSource(); src.buffer = buf;
          const f = ac.createBiquadFilter(); f.type = 'lowpass';
          const g = ac.createGain();
          const t0 = ac.currentTime;
          f.frequency.setValueAtTime(300, t0);
          f.frequency.linearRampToValueAtTime(1600, t0 + dur * 0.5);
          f.frequency.linearRampToValueAtTime(260, t0 + dur);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.06, t0 + dur * 0.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          let tail = g;
          let p = null;
          if (ac.createStereoPanner) {
            p = ac.createStereoPanner();
            p.pan.setValueAtTime(-0.9 * dir, t0);
            p.pan.linearRampToValueAtTime(0.9 * dir, t0 + dur);
            g.connect(p); tail = p;
          }
          src.connect(f).connect(g);
          tail.connect(out);
          src.start(t0);
          src.stop(t0 + dur);
          src.onended = () => { [src, f, g, p].forEach((n) => { try { n && n.disconnect(); } catch (e) { /* ignore */ } }); };
        } catch (e) { /* sound is optional */ }
      },
    };
    R.sfx = sfx;
    const unsub = audio.onChange((on) => { if (!on) audioDown(); });

    /* ---------- the frame ---------- */
    let t = 0;
    let last = 0;
    let nudge = 3.2;

    function update(dt) {
      const rm = (R.rm = !!ctx.reducedMotion);
      if (rm) root.classList.add('st-still'); else root.classList.remove('st-still');

      // the wire between the shop signs carries the switch across
      if (pulse) {
        pulse.t += dt * (rm ? 10 : 1);
        if (pulse.t >= 0.5) {
          if (pulse.on && !pulse.to.on) strike(pulse.to);
          if (!pulse.on && pulse.to.on) kill(pulse.to);
          pulse = null;
        }
      }

      signs.forEach((s) => {
        if (s.on) s.strikeT += dt;
        else s.base = Math.max(0, s.base - dt * 5);
        s.glowMul = 1;
        if (s.behave) s.behave(s, t, rm, dt);
        else {
          const b = lvl(s, 0);
          s.out.forEach((o, i) => { o.a = i === 0 ? b : lvl(s, 0.18); });
        }
        let sum = 0;
        for (let i = 0; i < s.out.length; i++) sum += s.out[i].a;
        s.glow = (sum / s.out.length) * s.glowMul;
      });

      // until the first tube is struck, the big one tries to catch on its own now and then
      if (!everLit && !rm) {
        nudge -= dt;
        const s1 = byN[1];
        if (nudge < 0 && nudge > -0.34) {
          const f = hash(Math.floor(nudge * 50)) > 0.55 ? 0.22 : 0;
          s1.out[0].a = f; s1.out[1].a = f * 0.5;
          s1.glow = f * 0.5;
          if (f && audio.enabled && hash(Math.floor(nudge * 50) + 3) > 0.8) audio.noise({ dur: 0.015, gain: 0.03, type: 'highpass', freq: 3500 });
        } else if (nudge <= -0.34) nudge = 4 + Math.random() * 3;
      }

      // the all-sixteen moment: the mains sag, a rectangle around everything catches, cars pass
      if (ev) {
        const prev = ev.t;
        ev.t += dt;
        if (prev < 1.1 && ev.t >= 1.1) sfx.brownout();
        if (prev < 1.6 && ev.t >= 1.6) { ev.framePat = makePattern('slow'); ev.frameT = 0; sfx.strike({ n: 1, X: vw / 2, pat: ev.framePat }); }
        if (ev.frameT != null) ev.frameT += dt;
        const fl = ev.frameT == null ? 0 : rm ? 1 : patLevel(ev.framePat, ev.frameT);
        frameLvl += (fl - frameLvl) * Math.min(1, dt * 30);
        msgA = Math.min(1, msgA + (ev.t > 2.2 ? dt * 0.35 : 0));
        if (!rm) {
          const next = 3.4 + ev.cars * 11;
          if (ev.car < 0 && ev.t > next) { ev.car = 0; ev.dir = ev.cars % 2 ? -1 : 1; sfx.car(ev.dir); }
          if (ev.car >= 0) {
            ev.car += dt / 3.6;
            if (ev.car >= 1) { ev.car = -1; ev.cars++; }
          }
        }
      } else {
        frameLvl = Math.max(0, frameLvl - dt * 3);
        msgA = Math.max(0, msgA - dt * 1.2);
      }

      if (hint && t >= hintUntil) { hint = null; updateCaption(); }

      // rain
      if (!rm) {
        for (const d of drops) {
          d.y += d.v * dt;
          d.x -= d.v * dt * 0.08;
          if (d.y > d.land) {
            if (ripples.length < 60) ripples.push({ x: d.x, y: d.land, t: 0 });
            Object.assign(d, newDrop());
          }
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          ripples[i].t += dt;
          if (ripples[i].t > 0.45) ripples.splice(i, 1);
        }
      }
    }

    function brownout() {
      if (!ev || ev.t < 1.1 || ev.t > 1.5) return 1;
      return 0.18 + 0.2 * hash(Math.floor(ev.t * 40));
    }

    function drawSign(c, s, lit, mul) {
      const k = s.k;
      const hw = (s.w / 2 + PAD) * k;
      const hh = (s.h / 2 + PAD) * k;
      c.save();
      c.translate(s.X, s.Y);
      if (s.rot) {
        c.translate(s.pivot[0] * k, s.pivot[1] * k);
        c.rotate(s.rot);
        c.translate(-s.pivot[0] * k, -s.pivot[1] * k);
      }
      const set = lit ? s.lit : s.dark;
      for (let i = 0; i < set.length; i++) {
        const spr = set[i];
        if (!spr) continue;
        const o = s.out[i];
        let a = 1;
        if (lit) {
          a = o.a * mul + (s.hover && !s.on ? 0.07 : 0);
          if (a < 0.004) continue;
          c.globalAlpha = Math.min(1, a);
        } else {
          c.globalAlpha = 1;
        }
        const dx = lit || s.parts[i].pupil || s.n === 7 ? o.dx * k : 0;
        const dy = lit || s.parts[i].pupil ? o.dy * k : 0;
        if (o.sc !== 1 && lit) {
          c.save();
          c.translate(dx, dy);
          c.scale(o.sc, o.sc);
          c.drawImage(spr, -hw, -hh, hw * 2, hh * 2);
          c.restore();
        } else c.drawImage(spr, dx - hw, dy - hh, hw * 2, hh * 2);
      }
      c.restore();
      c.globalAlpha = 1;
    }

    function cord(c, s, lightLevel) {
      // the pull-cord and the bracket the round sign swings from
      const k = s.k;
      c.save();
      c.translate(s.X, s.Y);
      const a = 0.16 + 0.5 * lightLevel;
      c.strokeStyle = 'rgba(150,150,150,' + a.toFixed(3) + ')';
      c.fillStyle = c.strokeStyle;
      c.lineWidth = Math.max(1, 1.6 * k);
      c.beginPath();
      c.moveTo(0, -150 * k);
      c.lineTo(0, -76 * k);
      c.moveTo(-26 * k, -150 * k);
      c.lineTo(26 * k, -150 * k);
      c.stroke();
      c.translate(0, -76 * k);
      c.rotate(s.rot);
      c.translate(0, 76 * k);
      const len = (84 + s.pull) * k;
      c.beginPath();
      c.moveTo(0, 72 * k);
      c.lineTo(Math.sin(t * 1.3) * 2 * k * (R.rm ? 0 : 1), 72 * k + len);
      c.stroke();
      c.beginPath();
      c.arc(Math.sin(t * 1.3) * 2 * k * (R.rm ? 0 : 1), 72 * k + len + 5 * k, 5 * k, 0, TAU);
      c.fill();
      c.restore();
    }

    function draw() {
      const mul = brownout();
      const rm = R.rm;
      // 1. the light map: ambient plus a pool of light around every burning tube
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
      const amb = Math.round(5 + litCount * 0.9);
      lctx.fillStyle = 'rgb(' + amb + ',' + amb + ',' + amb + ')';
      lctx.fillRect(0, 0, light.width, light.height);
      lctx.setTransform(1 / LS, 0, 0, 1 / LS, 0, 0);
      lctx.globalCompositeOperation = 'lighter';
      let total = 0;
      signs.forEach((s) => {
        const g = s.glow * mul + (s.hover && !s.on ? 0.02 : 0);
        total += s.glow;
        if (g < 0.01) return;
        const a = Math.min(1, 0.58 * s.power * g);
        const W = (s.w * s.k + 420 * S) * 1.15;
        const H = (s.h * s.k + 380 * S) * 1.1;
        lctx.globalAlpha = a;
        lctx.drawImage(blob, s.X - W / 2, s.Y - H / 2, W, H);
        // and a pool where it lands on the wet ground
        const gy = hz + (hz - s.Y) * 0.32 + 30 * S;
        lctx.globalAlpha = a * 0.3;
        lctx.drawImage(blob, s.X - W * 0.6, gy - H * 0.22, W * 1.2, H * 0.44);
      });
      if (pulse) {
        const p = ease(clamp(pulse.t / 0.5, 0, 1));
        const x = pulse.from.X + (pulse.to.X - pulse.from.X) * p;
        lctx.globalAlpha = 0.5;
        lctx.drawImage(blob, x - 80 * S, pulse.from.Y - 80 * S, 160 * S, 160 * S);
      }
      if (frameLvl > 0.01) {
        lctx.globalAlpha = frameLvl * 0.08;
        lctx.drawImage(blob, -vw * 0.3, -vh * 0.3, vw * 1.6, vh * 1.6);
      }
      if (msgA > 0.01 && R.road) {
        // with everything burning, enough light reaches the road to read what is painted on it
        lctx.globalAlpha = msgA * 0.55;
        lctx.drawImage(blob, R.road[0], R.road[1], R.road[2], R.road[3]);
      }
      let carX = -1, carGain = 0;
      if (ev && ev.car >= 0) {
        const u = ev.car;
        carGain = Math.sin(Math.PI * clamp(u, 0, 1));
        const p = ev.dir > 0 ? u : 1 - u;
        carX = -vw * 0.35 + p * vw * 1.7;
        const y = hz - 40 * S;
        const W = 560 * S, H = 300 * S;
        lctx.globalAlpha = Math.min(1, carGain * 0.75);
        lctx.drawImage(blob, carX - W / 2, y - H / 2, W, H);
        lctx.drawImage(blob, carX + 140 * S * ev.dir - W / 2, y - H / 2, W, H);
        lctx.globalAlpha = carGain * 0.4;
        lctx.drawImage(blob, carX - W, hz + (vh - hz) * 0.55 - H * 0.3, W * 2, H * 0.6);
      }
      lctx.globalAlpha = 1;
      lctx.globalCompositeOperation = 'source-over';

      // 2. the scene
      const c = mctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.imageSmoothingEnabled = true;
      c.drawImage(albedo, 0, 0, vw, vh);
      if (msgA > 0.01) {
        c.globalAlpha = msgA;
        c.drawImage(msgC, 0, 0, vw, vh);
        c.globalAlpha = 1;
      }
      c.globalCompositeOperation = 'multiply';
      c.drawImage(light, 0, 0, vw, vh);
      c.globalCompositeOperation = 'source-over';
      const litFrac = Math.min(1, total / 6);
      for (const s of signs) drawSign(c, s, false, 1);
      cord(c, byN[12], Math.min(1, byN[12].glow + litFrac * 0.4));

      // 3. reflections in the wet ground
      const gh = vh - hz;
      if (gh > 4) {
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        rctx.globalCompositeOperation = 'source-over';
        rctx.globalAlpha = 1;
        rctx.fillStyle = '#000';
        rctx.fillRect(0, 0, refl.width, refl.height);
        rctx.setTransform(1 / RS, 0, 0, -0.78 / RS, 0, (0.78 * hz) / RS);
        rctx.globalCompositeOperation = 'lighter';
        rctx.globalAlpha = 0.12;
        rctx.drawImage(light, 0, 0, vw, vh);
        rctx.globalAlpha = 1;
        for (const s of signs) drawSign(rctx, s, true, mul);
        if (frameLvl > 0.01 && frameSpr) {
          rctx.globalAlpha = frameLvl;
          rctx.drawImage(frameSpr, 0, 0, vw, vh);
          rctx.globalAlpha = 1;
        }
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        // wet ground smears every light downward into a streak
        rctx.globalAlpha = 0.45;
        rctx.drawImage(refl, 0, 1);
        rctx.drawImage(refl, 0, 3);
        rctx.globalAlpha = 0.3;
        rctx.drawImage(refl, 0, 6);
        rctx.globalAlpha = 1;
        rctx.globalCompositeOperation = 'multiply';
        rctx.drawImage(rmask, 0, 0);
        rctx.globalCompositeOperation = 'source-over';
        c.globalCompositeOperation = 'lighter';
        // sliced into bands that drift sideways, like a mirror made of water
        const rh = refl.height;
        const n = Math.max(1, Math.min(90, rh));
        for (let i = 0; i < n; i++) {
          const s0 = Math.floor((i * rh) / n), s1 = Math.floor(((i + 1) * rh) / n);
          if (s1 <= s0) continue;
          const y0 = hz + s0 * RS, y1 = Math.min(vh, hz + s1 * RS);
          const q = i / n;
          const dx = rm ? 0 : (Math.sin(t * 1.9 + i * 0.42) * 0.7 + Math.sin(t * 0.8 - i * 0.17) * 0.5) * (1 + q * 7) * S;
          c.drawImage(refl, 0, s0, refl.width, s1 - s0, dx, y0, vw, y1 - y0);
        }
      }

      // 4. haze: the air itself holds a little of the light
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.1;
      c.drawImage(light, 0, 0, vw, vh);
      c.globalAlpha = 1;

      // 5. the tubes themselves
      for (const s of signs) drawSign(c, s, true, mul);
      if (frameLvl > 0.01) {
        if (!frameSpr) buildFrame();
        c.globalAlpha = Math.min(1, frameLvl * mul);
        c.drawImage(frameSpr, 0, 0, vw, vh);
        c.globalAlpha = 1;
      }
      if (pulse) {
        const p = ease(clamp(pulse.t / 0.5, 0, 1));
        const a = pulse.from, b = pulse.to;
        const x0 = a.X + Math.sign(b.X - a.X) * (a.w / 2 - 6) * a.k;
        const x1 = b.X - Math.sign(b.X - a.X) * (b.w / 2 - 6) * b.k;
        const x = x0 + (x1 - x0) * p;
        const y = a.Y - 20 * a.k + Math.sin(Math.PI * p) * 8 * a.k;
        c.globalAlpha = 0.9;
        c.drawImage(blob, x - 14 * S, y - 14 * S, 28 * S, 28 * S);
        c.globalAlpha = 1;
      }

      // 6. rain, lit only by what it passes through
      if (!rm && total > 0.05) {
        const rc = rainCtx;
        rc.setTransform(1, 0, 0, 1, 0, 0);
        rc.globalCompositeOperation = 'source-over';
        rc.fillStyle = '#000';
        rc.fillRect(0, 0, rainC.width, rainC.height);
        rc.setTransform(0.5, 0, 0, 0.5, 0, 0);
        rc.strokeStyle = 'rgba(255,255,255,0.75)';
        rc.lineWidth = 1.6;
        rc.beginPath();
        for (const d of drops) {
          rc.moveTo(d.x, d.y);
          rc.lineTo(d.x + d.len * 0.08, d.y - d.len);
        }
        rc.stroke();
        rc.strokeStyle = 'rgba(255,255,255,0.55)';
        rc.lineWidth = 1.4;
        for (const r of ripples) {
          const q = r.t / 0.45;
          rc.globalAlpha = 1 - q;
          rc.beginPath();
          const depth = 0.4 + (r.y - hz) / Math.max(1, gh);
          rc.ellipse(r.x, r.y, (3 + q * 16) * S * depth, (1 + q * 4) * S * depth, 0, 0, TAU);
          rc.stroke();
        }
        rc.globalAlpha = 1;
        rc.setTransform(1, 0, 0, 1, 0, 0);
        rc.globalCompositeOperation = 'multiply';
        rc.drawImage(light, 0, 0, rainC.width, rainC.height);
        rc.drawImage(light, 0, 0, rainC.width, rainC.height);
        rc.globalCompositeOperation = 'source-over';
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.min(1, 0.9 + total * 0.05);
        c.drawImage(rainC, 0, 0, vw, vh);
        c.globalAlpha = 1;
      }
      c.globalCompositeOperation = 'source-over';
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt;
      update(dt);
      audioFrame();
      draw();
    }

    /* ---------- input ---------- */
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      R.pointer.x = e.clientX - r.left;
      R.pointer.y = e.clientY - r.top;
      R.pointer.seen = true;
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    let resizeT = 0;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { if (alive) layout(); }, 140);
    };
    window.addEventListener('resize', onResize);

    /* ---------- go: draw the first frame right away ---------- */
    layout();
    updateCaption();
    t = 0;
    update(0.016);
    draw();
    last = performance.now();
    raf = requestAnimationFrame(loop);

    // the neon face arrives a moment later; redraw the tubes when it does
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('40px "Tilt Neon"'),
        document.fonts.load('40px "Sacramento"'),
        document.fonts.load('500 40px "Oswald"'),
      ]).then(() => { if (alive) { buildSprites(); buildAlbedo(); buildBuffers(); } }).catch(() => {});
    }

    return {
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        clearTimeout(resizeT);
        timers.forEach((id) => clearTimeout(id));
        timers.clear();
        window.removeEventListener('resize', onResize);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerdown', onMove);
        try { unsub(); } catch (e) { /* ignore */ }
        audioDown();
        if (room === R) room = null;
        root.textContent = '';
      },
    };
  }

  let live = null;
  window.Eras.register('st', {
    mount(root, ctx) {
      if (live) { live.destroy(); live = null; }
      live = createRoom(root, ctx);
    },
    unmount() {
      if (live) { live.destroy(); live = null; }
    },
  });
})();
