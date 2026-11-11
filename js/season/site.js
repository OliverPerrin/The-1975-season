/* The 1975 season: everything on the home page that is not the weather shader or the night drive. */
(function () {
  'use strict';

  const ALBUMS = window.DISCOGRAPHY || [];
  const PHOTOS = window.SEASON_PHOTOS || [];
  const SONGS = window.SEASON_SONGS || [];
  const EXTRAS = window.SEASON_EXTRAS || {};
  const W = window.Weather;
  const Sound = window.Sound;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  const listenUrl = (title) => 'https://open.spotify.com/search/' + encodeURIComponent(title + ' The 1975');

  /* ---------------- album facts ---------------- */

  const META = {
    st: {
      date: '2013-09-02', season: 'autumn',
      blurb: 'Black and white and nothing else. Wet streets, a white box, sixteen songs about being young at night.',
      room: 'A wall of dead neon to strike alight',
    },
    iliwys: {
      date: '2016-02-26', season: 'winter',
      blurb: 'The box turns pink. Seventeen songs, and every one of them was given its own neon sign.',
      room: 'A pink dream that breathes',
    },
    abiior: {
      date: '2018-11-30', season: 'autumn',
      blurb: 'A white wall and a grid of coloured squares. The one about being online, out on the last day of autumn.',
      room: 'A gallery wall that turns into a haunted desktop',
    },
    noacf: {
      date: '2020-05-22', season: 'spring',
      blurb: 'Yellow, loud and twenty-two tracks long. The only one that came out in spring, and you can hear it.',
      room: 'An enormous yellow form to fill in',
    },
    bfiafl: {
      date: '2022-10-14', season: 'autumn',
      blurb: 'Back to black and white, warmer this time. Eleven songs, a house built on a stage, and one for the drive home at Christmas.',
      room: 'A house on a stage, lit by your follow spot',
    },
  };
  const COLD_SEASONS = { autumn: 1, winter: 1 };
  const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------------- weather follows the page ---------------- */

  const live = {};
  const scenes = $$('[data-weather]').map((node) => {
    const w = {};
    node.dataset.weather.trim().split(/\s+/).forEach((kv) => {
      const i = kv.indexOf(':');
      const k = kv.slice(0, i);
      const v = kv.slice(i + 1);
      w[k] = isNaN(Number(v)) ? v : Number(v);
    });
    return { node, w };
  });
  const navLinks = $$('#links a');
  const bands = [];
  let roomOpen = false;
  let tickQueued = false;

  function sceneWeather(sc) {
    const w = sc.w.live && live[sc.w.live] ? live[sc.w.live]() : sc.w;
    return {
      rain: w.rain || 0, snow: w.snow || 0, late: w.late == null ? 0.7 : w.late, fog: w.fog || 0,
      sign: w.sign || 0, leaves: w.leaves || 0, dim: w.dim == null ? 1 : w.dim,
      pal: Array.isArray(w.pal) ? w.pal : (W ? W.palettes[w.pal || 'sodium'] : null),
    };
  }

  function tick() {
    tickQueued = false;
    const vh = window.innerHeight;
    const acc = { rain: 0, snow: 0, late: 0, fog: 0, sign: 0, leaves: 0, dim: 0 };
    const pal = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let total = 0;
    let best = null;
    let bestVis = 0;
    let driveVis = 0;
    for (const sc of scenes) {
      const r = sc.node.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
      if (vis <= 0) continue;
      if (vis > bestVis) { bestVis = vis; best = sc.node; }
      if (sc.node.id === 'drive') {
        const m = $('#drive-mount').getBoundingClientRect();
        driveVis = Math.max(0, Math.min(m.bottom, vh) - Math.max(m.top, 0)) / vh;
      }
      const wt = vis * vis;
      const w = sceneWeather(sc);
      for (const k in acc) acc[k] += w[k] * wt;
      if (w.pal) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pal[i][j] += w.pal[i][j] * wt;
      total += wt;
    }
    if (W && total > 0) {
      for (const k in acc) acc[k] /= total;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pal[i][j] /= total;
      acc.pal = pal;
      W.set(acc);
      W.pause(roomOpen || driveVis > 0.985);
    }
    // inside the car the top bar gets out of the way
    document.body.classList.toggle('in-drive', driveVis > 0.8);
    if (best) navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + best.id ? 'true' : 'false'));

    if (!reduced.matches) {
      for (const b of bands) {
        const r = b.node.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) continue;
        const t = (r.top + r.height / 2 - vh / 2) / vh;
        b.img.style.transform = 'translate3d(0,' + (-t * 9).toFixed(2) + '%,0)';
      }
    }
    updateRainSound();
  }
  function queueTick() {
    if (tickQueued) return;
    tickQueued = true;
    requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', queueTick, { passive: true });
  window.addEventListener('resize', queueTick);

  /* ---------------- top bar ---------------- */

  const menuBtn = $('#menu');
  const links = $('#links');
  menuBtn.addEventListener('click', () => {
    const open = !links.classList.contains('is-open');
    links.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.textContent = open ? 'Close' : 'Menu';
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = 'Menu';
    }
  });

  /* ---------------- sound: rain you can hear ---------------- */

  const soundBtn = $('#sound');
  const siteAudio = Sound ? Sound.scope() : null;
  let rainNodes = null;

  function startRain() {
    if (!siteAudio || rainNodes) return;
    const ac = siteAudio.ctx;
    const out = siteAudio.out;
    if (!ac || !out) return;
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hiss = ac.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 5200;
    hiss.Q.value = 0.4;
    const hissGain = ac.createGain();
    hissGain.gain.value = 0;
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    const lowGain = ac.createGain();
    lowGain.gain.value = 0;
    src.connect(hiss).connect(hissGain).connect(out);
    src.connect(low).connect(lowGain).connect(out);
    src.start();
    rainNodes = { ac, src, hissGain, lowGain };
    updateRainSound();
  }
  function stopRain() {
    if (!rainNodes) return;
    try { rainNodes.src.stop(); rainNodes.src.disconnect(); rainNodes.hissGain.disconnect(); rainNodes.lowGain.disconnect(); } catch (e) { /* already gone */ }
    rainNodes = null;
  }
  function updateRainSound() {
    if (!rainNodes || !W) return;
    const r = roomOpen ? 0 : W.state.rain * (1 - W.state.snow * 0.8);
    const t = rainNodes.ac.currentTime;
    rainNodes.hissGain.gain.setTargetAtTime(0.012 + r * 0.07, t, 0.4);
    rainNodes.lowGain.gain.setTargetAtTime(0.05 + r * 0.16, t, 0.4);
  }
  if (Sound) {
    soundBtn.addEventListener('click', () => Sound.toggle());
    Sound.onChange((on) => {
      soundBtn.textContent = on ? 'Sound on' : 'Sound off';
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) startRain(); else stopRain();
    });
  } else {
    soundBtn.hidden = true;
  }

  /* ---------------- hero ---------------- */

  (function seasonCount() {
    const now = new Date();
    const m = now.getMonth();
    const today = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const node = $('#season-count');
    if (m >= 8 || m <= 1) {
      const end = new Date(m >= 8 ? now.getFullYear() + 1 : now.getFullYear(), 2, 1);
      const nights = Math.ceil((end - now) / 864e5);
      node.textContent = 'Today is ' + today + '. ' + nights + (nights === 1 ? ' night' : ' nights') + ' of it left.';
    } else {
      const start = new Date(now.getFullYear(), 8, 1);
      const days = Math.ceil((start - now) / 864e5);
      node.textContent = 'Today is ' + today + '. Out of season, ' + days + (days === 1 ? ' day' : ' days') + ' until September.';
    }
  })();

  // one swipe across the glass on arrival, so it is obvious the glass can be wiped
  (function firstWipe() {
    if (!W || !W.ok) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const path = (t) => [vw * lerp(0.22, 0.8, t), vh * (0.36 + Math.sin(t * Math.PI * 1.5) * 0.12)];
    if (reduced.matches) {
      for (let i = 0; i <= 24; i++) { const p = path(i / 24); W.wipeAt(p[0], p[1]); }
      return;
    }
    const t0 = performance.now() + 700;
    (function go(now) {
      const t = (now - t0) / 1300;
      if (t >= 0) { const p = path(clamp(t, 0, 1)); W.wipeAt(p[0], p[1]); }
      if (t < 1 && window.scrollY < vh * 0.5) requestAnimationFrame(go);
    })(performance.now());
  })();

  /* ---------------- the year, and when the albums landed ---------------- */

  (function yearDial() {
    const NS = 'http://www.w3.org/2000/svg';
    const S = 440;
    const C = S / 2;
    const R = 158;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'The year as a circle. Four of the five albums were released between September and February.');
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      svg.appendChild(n);
      return n;
    };
    const at = (frac, r) => {
      const a = frac * Math.PI * 2 - Math.PI / 2;
      return [C + Math.cos(a) * r, C + Math.sin(a) * r];
    };
    const dayFrac = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      return (d - new Date(d.getFullYear(), 0, 1)) / (365.25 * 864e5);
    };
    // the dark half: 1 September round to 1 March
    const a0 = at(dayFrac('2021-09-01'), R);
    const a1 = at(dayFrac('2021-03-01'), R);
    add('path', { class: 'yr-cold', d: 'M ' + a0[0] + ' ' + a0[1] + ' A ' + R + ' ' + R + ' 0 0 1 ' + a1[0] + ' ' + a1[1] });
    add('circle', { class: 'yr-ring', cx: C, cy: C, r: R });
    'JFMAMJJASOND'.split('').forEach((ch, i) => {
      const p0 = at(i / 12, R - 6);
      const p1 = at(i / 12, R + 6);
      add('line', { class: 'yr-tick', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] });
      const pt = at((i + 0.5) / 12, R + 30);
      add('text', { x: pt[0], y: pt[1] + 4, 'text-anchor': 'middle' }, ch);
    });
    add('text', { class: 'yr-mid', x: C, y: C + 4, 'text-anchor': 'middle' }, 'four of five');
    add('text', { class: 'yr-sub', x: C, y: C + 30, 'text-anchor': 'middle' }, 'came out in the dark half');

    const list = $('#year-list');
    ALBUMS.forEach((a, i) => {
      const m = META[a.id];
      if (!m) return;
      const warm = !COLD_SEASONS[m.season];
      const p = at(dayFrac(m.date), R);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'yr-mark' + (warm ? ' is-warm' : ''));
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', p[0] - 15);
      rect.setAttribute('y', p[1] - 10);
      rect.setAttribute('width', 30);
      rect.setAttribute('height', 20);
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', p[0]);
      tx.setAttribute('y', p[1] + 4.5);
      tx.setAttribute('text-anchor', 'middle');
      tx.textContent = String(i + 1);
      g.appendChild(rect);
      g.appendChild(tx);
      svg.appendChild(g);
      list.appendChild(el('li', { class: warm ? 'is-warm' : '' }, [
        el('span', { class: 't', text: a.title }),
        el('span', { class: 'd', text: fmtDate(m.date) + ', ' + m.season }),
      ]));
    });
    $('#year-dial').appendChild(svg);
  })();

  /* ---------------- photo bands ---------------- */

  (function photoBands() {
    const wide = PHOTOS.filter((p) => p.wide);
    $$('.band').forEach((node) => {
      const p = wide[Number(node.dataset.band)];
      if (!p) { node.remove(); return; }
      const fig = el('figure', { style: 'margin:0;position:absolute;inset:0' });
      const img = el('img', { src: p.file, alt: p.alt || '', loading: 'lazy', decoding: 'async' });
      fig.appendChild(img);
      fig.appendChild(el('figcaption', { text: (p.caption || p.title || '') + (p.author ? ', photo by ' + p.author : '') }));
      node.appendChild(fig);
      bands.push({ node, img });
    });
  })();

  /* ---------------- the board ---------------- */

  const NOTES = [
    { tags: ['mono'], text: 'Black and white, and only black and white. For the whole first album nothing else was allowed.', from: 'What every retrospective of 2013 says first' },
    { tags: ['neon'], text: 'The pink came from the fans. Pink edits of the box went round Tumblr before the band ever used it.', from: 'How the second album got its colour' },
    { tags: ['autumn'], text: '“Perfect for autumn vibes.”', from: 'How a slow one from 2022 gets tagged on TikTok' },
    { tags: ['winter'], text: 'One song is simply about driving home on the 23rd of December.', from: 'The reason the winter playlists exist' },
    { tags: ['mono', 'rain'], text: 'Striped tees, a leather jacket, a cigarette, rain. The Tumblr of 2014, back again on TikTok.', from: 'What the revival pieces keep describing' },
    { tags: ['neon', 'mono'], text: 'On Pinterest it is mostly black-and-white stills, stage lights, neon signs, records and lock screens.', from: 'What the boards are made of' },
  ];
  const ART = [
    { kind: 'box', tags: ['mono', 'neon'], label: 'The box, 2013' },
    { kind: 'neon', tags: ['neon'], text: 'somebody else', label: 'A song title as a sign' },
    { kind: 'stripes', tags: ['mono'], label: 'The striped tee' },
    { kind: 'box is-pink', tags: ['neon'], label: 'The box, 2016' },
    { kind: 'vinyl', tags: ['mono', 'autumn'], label: 'A record, obviously' },
    { kind: 'neon', tags: ['neon', 'winter'], text: 'wintering', label: 'A song title as a sign' },
  ];
  const FILTERS = [['all', 'Everything'], ['rain', 'Rain'], ['neon', 'Neon'], ['autumn', 'Autumn'], ['winter', 'Winter'], ['drive', 'Night drive'], ['live', 'On stage'], ['mono', 'Black and white']];

  (function board() {
    const pins = $('#pins');
    const chips = $('#chips');
    const lightbox = $('#lightbox');
    const tiles = [];

    const photoTile = (p) => {
      const b = el('button', { type: 'button', class: 'pin pin--photo', 'data-tags': (p.tags || []).join(' '), 'aria-label': 'Enlarge: ' + (p.alt || p.caption || 'photograph') });
      const img = el('img', { src: p.file, alt: '', loading: 'lazy', decoding: 'async', width: p.w, height: p.h });
      b.appendChild(img);
      b.appendChild(el('span', { class: 'pin__cap', text: p.caption || p.title || '' }));
      b.addEventListener('click', () => {
        $('#lightbox-img').src = p.file;
        $('#lightbox-img').alt = p.alt || '';
        const cap = $('#lightbox-cap');
        cap.textContent = '';
        cap.appendChild(document.createTextNode((p.caption || p.title || 'Photograph') + '. '));
        if (p.source) cap.appendChild(el('a', { href: p.source, target: '_blank', rel: 'noopener', text: 'Photo by ' + (p.author || 'unknown') }));
        if (p.license) cap.appendChild(document.createTextNode(', ' + p.license + '.'));
        if (lightbox.showModal) lightbox.showModal();
      });
      return b;
    };
    const noteTile = (n) => el('div', { class: 'pin pin--note', 'data-tags': n.tags.join(' ') }, [el('p', { text: n.text }), el('small', { text: n.from })]);
    const artTile = (a) => {
      const d = el('div', { class: 'pin pin--' + a.kind, 'data-tags': a.tags.join(' '), role: 'img', 'aria-label': a.label });
      d.appendChild(a.text ? el('span', { text: a.text }) : el('i'));
      return d;
    };

    // deal the three kinds together so the board is never a run of one thing
    const photos = PHOTOS.slice();
    const notes = NOTES.slice();
    const art = ART.slice();
    let n = 0;
    while (photos.length || notes.length || art.length) {
      const slot = n % 5;
      if (slot === 2 && art.length) tiles.push(artTile(art.shift()));
      else if (slot === 4 && notes.length) tiles.push(noteTile(notes.shift()));
      else if (photos.length) tiles.push(photoTile(photos.shift()));
      else if (art.length) tiles.push(artTile(art.shift()));
      else if (notes.length) tiles.push(noteTile(notes.shift()));
      n++;
    }
    tiles.forEach((t) => pins.appendChild(t));

    const present = new Set();
    tiles.forEach((t) => t.dataset.tags.split(' ').forEach((x) => present.add(x)));
    FILTERS.forEach(([key, label]) => {
      if (key !== 'all' && !present.has(key)) return;
      const b = el('button', { type: 'button', 'aria-pressed': key === 'all' ? 'true' : 'false', text: label });
      b.addEventListener('click', () => {
        $$('button', chips).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        tiles.forEach((t) => { t.hidden = key !== 'all' && t.dataset.tags.split(' ').indexOf(key) === -1; });
        queueTick();
      });
      chips.appendChild(b);
    });

    $('#lightbox-close').addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
  })();

  /* ---------------- forecast ---------------- */

  (function forecast() {
    const fr = $('#f-rain');
    const fc = $('#f-cold');
    const fl = $('#f-late');
    const now = new Date();
    // start from something like tonight: colder in midwinter, later if it is late
    const month = now.getMonth();
    fc.value = String([82, 78, 60, 40, 25, 12, 8, 10, 28, 45, 62, 76][month]);
    const hr = now.getHours() + now.getMinutes() / 60;
    const sinceDusk = (hr - 16.5 + 24) % 24;
    fl.value = String(Math.round(clamp(sinceDusk <= 12 ? sinceDusk / 12 : 0.55, 0, 1) * 100));

    const read = () => ({ r: fr.value / 100, c: fc.value / 100, l: fl.value / 100 });

    live.forecast = () => {
      const v = read();
      const snow = smooth(0.7, 0.95, v.c);
      const pal = W.palettes.sodium.map((col, i) => col.map((x, j) => lerp(x, W.palettes.cold[i][j], smooth(0.35, 0.9, v.c))));
      return {
        rain: v.r * (1 - snow * 0.85),
        snow: snow * (0.45 + v.r * 0.55),
        late: 0.25 + v.l * 0.75,
        fog: 0.1 + v.r * 0.25 + v.c * 0.2,
        leaves: Math.max(0, 1 - Math.abs(v.c - 0.35) / 0.3) * 0.9,
        dim: 0.85,
        pal,
      };
    };

    const rainWord = (r) => (r < 0.08 ? 'Dry' : r < 0.3 ? 'Spitting' : r < 0.55 ? 'Light rain' : r < 0.8 ? 'Steady rain' : 'Hammering down');
    const extra = (v) => {
      if (v.c > 0.85) return v.r > 0.4 ? 'It is settling.' : 'Frost on the cars.';
      if (v.l > 0.85) return 'Nobody else is up.';
      if (v.r > 0.8) return 'Stay in.';
      if (v.c < 0.25 && v.r < 0.2) return 'Leaves everywhere.';
      if (v.l < 0.2) return 'The street lamps have just come on.';
      return 'Roads are wet.';
    };

    function update() {
      const v = read();
      const temp = Math.round(lerp(14, -3, v.c));
      const mins = Math.round((16.5 * 60 + v.l * 12 * 60) / 10) * 10;
      const hh = Math.floor(mins / 60) % 24;
      const mm = mins % 60;
      const clock = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      const snowing = v.c > 0.85 && v.r > 0.4;
      $('#f-line').textContent = (snowing ? 'Snow' : rainWord(v.r)) + ', ' + temp + '°, ' + clock + '. ' + extra(v);

      const ranked = SONGS.map((s) => {
        const d = Math.pow(s.r - v.r, 2) * 1.1 + Math.pow(s.c - v.c, 2) * 1.7 + Math.pow(s.l - v.l, 2);
        return { s, d };
      }).sort((a, b) => a.d - b.d);
      if (!ranked.length) return;
      const top = ranked[0].s;
      const src = ALBUMS.find((a) => a.id === top.a) || EXTRAS[top.a] || { title: '', year: '' };
      const song = $('#f-song');
      song.textContent = top.t;
      song.classList.toggle('is-long', top.t.length > 34);
      $('#f-from').textContent = 'From ' + src.title + ', ' + src.year + '.';
      $('#f-listen').href = listenUrl(top.t);
      $('#f-also').textContent = 'If not that, then ' + ranked[1].s.t + ', or ' + ranked[2].s.t + '.';
      queueTick();
    }
    [fr, fc, fl].forEach((i) => i.addEventListener('input', update));
    update();
  })();

  /* ---------------- rooms, opened on top of the page ---------------- */

  const roomBox = $('#room');
  const roomFrame = $('#room-frame');
  let roomReturn = null;

  function openRoom(id) {
    const a = ALBUMS.find((x) => x.id === id);
    if (!a) return;
    roomReturn = document.activeElement;
    $('#room-title').textContent = a.title + ' (' + a.year + ')';
    $('#room-tab').href = 'rooms.html#/' + id;
    roomFrame.src = 'rooms.html#/' + id;
    roomBox.hidden = false;
    document.body.classList.add('locked');
    roomOpen = true;
    if (Sound && Sound.enabled) Sound.set(false); // the room has its own sound switch
    queueTick();
    $('#room-close').focus();
  }
  function closeRoom() {
    if (roomBox.hidden) return;
    roomBox.hidden = true;
    roomFrame.src = 'about:blank';
    document.body.classList.remove('locked');
    roomOpen = false;
    queueTick();
    if (roomReturn && roomReturn.focus) roomReturn.focus();
  }
  $('#room-close').addEventListener('click', closeRoom);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRoom(); });

  /* ---------------- albums ---------------- */

  (function albums() {
    const list = $('#album-list');
    ALBUMS.forEach((a) => {
      const m = META[a.id] || {};
      const warm = !COLD_SEASONS[m.season];
      const tracks = el('ol', null, a.tracks.map((t) => el('li', { text: t.title })));
      const open = el('button', { type: 'button', class: 'btn', text: 'Open the room' });
      open.setAttribute('aria-label', 'Open the room for ' + a.title);
      open.addEventListener('click', () => openRoom(a.id));
      list.appendChild(el('li', { class: 'album' + (warm ? ' is-warm' : '') }, [
        el('div', { class: 'emb emb--' + a.id, 'aria-hidden': 'true' }),
        el('div', null, [
          el('h3', { class: 'album__title', text: a.title }),
          el('p', { class: 'album__meta', text: 'Released ' + fmtDate(m.date) + ', in ' + m.season + '. ' + a.tracks.length + ' songs.' }),
          el('p', { class: 'album__blurb', text: m.blurb + ' The room: ' + m.room.charAt(0).toLowerCase() + m.room.slice(1) + '.' }),
          el('details', null, [el('summary', { text: 'All ' + a.tracks.length + ' songs' }), tracks]),
        ]),
        open,
      ]));
    });
  })();

  /* ---------------- night drive ---------------- */

  (function drive() {
    const mount = $('#drive-mount');
    if (window.NightDrive && typeof window.NightDrive.mount === 'function') {
      try {
        window.NightDrive.mount(mount, {
          albums: ALBUMS,
          audio: Sound ? Sound.scope() : null,
          reducedMotion: () => reduced.matches,
          openRoom,
          listenUrl: (track) => listenUrl(track.title),
        });
        return;
      } catch (err) {
        console.error(err);
        mount.textContent = '';
      }
    }
    mount.appendChild(el('p', { class: 'drive-host__missing', text: 'The car is still at the garage. Try the rooms below.' }));
  })();

  /* ---------------- make a sign ---------------- */

  (function signMaker() {
    const cv = $('#sign-canvas');
    const ctx = cv.getContext('2d');
    const input = $('#sign-text');
    const boxToggle = $('#sign-box');
    const COLOURS = [
      { name: 'White', col: '#ffffff', core: '#ffffff' },
      { name: 'Pink', col: '#ff3d9a', core: '#ffe6f2' },
      { name: 'Amber', col: '#ffa24a', core: '#fff1dc' },
      { name: 'Blue', col: '#6fbcff', core: '#eaf6ff' },
    ];
    let colour = COLOURS[1];
    let power = 1;

    const row = $('#sign-colours');
    COLOURS.forEach((c) => {
      const b = el('button', { type: 'button', 'aria-label': c.name, 'aria-pressed': c === colour ? 'true' : 'false', style: '--c:' + c.col }, [el('i')]);
      b.addEventListener('click', () => {
        colour = c;
        $$('button', row).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        draw();
      });
      row.appendChild(b);
    });

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    }

    function draw() {
      const Wd = cv.width;
      const H = cv.height;
      if (!Wd || !H) return;
      const s = Wd / 1000;
      const floor = H * 0.72;
      const txt = input.value || ' ';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const wall = ctx.createLinearGradient(0, 0, 0, floor);
      wall.addColorStop(0, '#07090d');
      wall.addColorStop(1, '#0c1017');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, Wd, floor);
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, floor, Wd, H - floor);

      // bricks
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = Math.max(1, s);
      const bh = 30 * s;
      const bw = 92 * s;
      for (let y = 0, rowN = 0; y < floor; y += bh, rowN++) {
        for (let x = (rowN % 2 ? -bw / 2 : 0); x < Wd; x += bw) ctx.strokeRect(x, y, bw, bh);
      }

      let fs = 150 * s;
      const font = () => { ctx.font = fs + 'px "Tilt Neon", "Hanken Grotesk", sans-serif'; };
      font();
      while (ctx.measureText(txt).width > Wd * 0.72 && fs > 22 * s) { fs *= 0.94; font(); }
      const tw = ctx.measureText(txt).width;
      const cx = Wd / 2;
      const cy = floor * 0.5;
      const pad = fs * 0.42;
      const bx = cx - tw / 2 - pad;
      const by = cy - fs * 0.62 - pad * 0.4;
      const bwid = tw + pad * 2;
      const bhei = fs * 1.24 + pad * 0.8;

      // light thrown on the wall
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Wd * 0.55);
      glow.addColorStop(0, colour.col);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.2 * power;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, Wd, floor);
      ctx.globalAlpha = 1;

      const tubes = (alpha, core) => {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        const passes = [[70 * s, 0.45], [28 * s, 0.7], [10 * s, 0.9]];
        for (const [blur, a] of passes) {
          ctx.shadowColor = colour.col;
          ctx.shadowBlur = blur;
          ctx.globalAlpha = a * alpha;
          ctx.fillStyle = colour.col;
          ctx.fillText(txt, cx, cy);
          if (boxToggle.checked) {
            ctx.strokeStyle = colour.col;
            ctx.lineWidth = 6 * s;
            ctx.strokeRect(bx, by, bwid, bhei);
          }
        }
        if (core) {
          ctx.shadowBlur = 4 * s;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colour.core;
          ctx.fillText(txt, cx, cy);
          if (boxToggle.checked) {
            ctx.strokeStyle = colour.core;
            ctx.lineWidth = 2.4 * s;
            ctx.strokeRect(bx, by, bwid, bhei);
          }
        }
        ctx.restore();
      };
      tubes(power, true);

      // the wet pavement
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, floor, Wd, H - floor);
      ctx.clip();
      ctx.translate(0, floor);
      ctx.scale(1, -0.5);
      ctx.translate(0, -floor);
      tubes(power * 0.42, false);
      ctx.restore();
      const fade = ctx.createLinearGradient(0, floor, 0, H);
      fade.addColorStop(0, 'rgba(3,4,6,0.1)');
      fade.addColorStop(1, 'rgba(3,4,6,0.92)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, floor, Wd, H - floor);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, floor, Wd, Math.max(1, s));
    }

    input.addEventListener('input', draw);
    boxToggle.addEventListener('change', draw);
    window.addEventListener('resize', () => { size(); draw(); });

    // now and then the tube stutters, but only while it is on screen
    let visible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.2 }).observe(cv);
    }
    setInterval(() => {
      if (!visible || reduced.matches || document.hidden) return;
      const seq = [0.35, 1, 0.15, 0.9, 0.5, 1];
      seq.forEach((p, i) => setTimeout(() => { power = p; draw(); }, i * 55));
    }, 5200);

    $('#sign-save').addEventListener('click', () => {
      power = 1;
      draw();
      cv.toBlob((blob) => {
        if (!blob) return;
        const a = el('a', { href: URL.createObjectURL(blob), download: '1975-season-sign.png' });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    });

    size();
    draw();
    if (document.fonts && document.fonts.load) {
      document.fonts.load('40px "Tilt Neon"').then(() => { size(); draw(); }).catch(() => {});
    }
  })();

  /* ---------------- credits ---------------- */

  (function credits() {
    const SOURCES = [
      ['Why is TikTok so obsessed with The 1975?', 'https://tag24.com/entertainment/music/why-is-tiktok-so-obsessed-with-the-1975-2678530'],
      ['Inside the TikTok revival', 'https://screenshot-media.com/culture/internet-culture/matty-healy-tiktok-revival-gen-z-obsession/'],
      ['How Tumblr in 2012 set the tone for a decade of alt music', 'https://thefortyfive.com/?p=21928'],
      ['The 1975 turns 10', 'https://stereogum.com/2234430/the-1975-turns-10/reviews/the-anniversary'],
      ['How the “Robbers” video was made', 'https://www.altpress.com/?p=195667'],
      ['It’s more than just a phase, mom', 'https://www.gandbmagazine.com/article/2021/02/its-more-than-just-a-phase-mom-hicks'],
      ['We heart The 1975’s neon signs', 'https://coupdemainmagazine.com/tidbits/we-heart-1975s-neon-signs'],
      ['A love letter to the teens of 2014', 'https://glasgowguardian.co.uk/2022/09/18/a-love-letter-to-the-teens-of-2014/'],
      ['Pinterest: 1975 aesthetic', 'https://www.pinterest.com/ideas/1975-aesthetic/940950839988/'],
      ['TikTok: The 1975, Wintering', 'https://www.tiktok.com/discover/the-1975-wintering'],
    ];
    const src = $('#sources');
    SOURCES.forEach(([t, u]) => src.appendChild(el('li', null, [el('a', { href: u, target: '_blank', rel: 'noopener', text: t })])));

    const pc = $('#photo-credits');
    PHOTOS.forEach((p) => {
      const li = el('li');
      li.appendChild(p.source ? el('a', { href: p.source, target: '_blank', rel: 'noopener', text: p.caption || p.title || 'Photograph' }) : document.createTextNode(p.caption || p.title || 'Photograph'));
      li.appendChild(document.createTextNode(' by ' + (p.author || 'unknown') + ', '));
      li.appendChild(p.licenseUrl ? el('a', { href: p.licenseUrl, target: '_blank', rel: 'noopener', text: p.license || 'licence' }) : document.createTextNode(p.license || ''));
      pc.appendChild(li);
    });
  })();

  tick();
  window.addEventListener('load', queueTick);
})();
