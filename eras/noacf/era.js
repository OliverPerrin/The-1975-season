/* Notes on a Conditional Form (2020).
   The room is one enormous yellow paper form with twenty-two items. Each item is a song,
   and each one is a form control that behaves the way its title says. Answers change other
   parts of the form. You move around it by pushing the paper. */
(function () {
  'use strict';

  const ID = 'noacf';
  let live = null;

  window.Eras.register(ID, {
    mount(root, ctx) { live = room(root, ctx); },
    unmount() { if (live) live.destroy(); live = null; },
  });

  /* ------------------------------------------------------------------ helpers */

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = (n, w) => String(n).padStart(w || 2, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hash = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
  const NUMS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const word = (n) => NUMS[n] || String(n);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const PHRASES = ['hi.', 'sorry about earlier', 'nothing, actually', 'see you at the weekend', 'can I call you back', 'I meant all of it'];
  const CALM = ['that’s alright', 'it’ll keep', 'no rush on this one', 'noted. breathe out.', 'this box doesn’t mark you down', 'fine as it is', 'still fine', 'leave it there for now'];

  const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.52'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

  /* ------------------------------------------------------------------ the room */

  function room(root, ctx) {
    const A = ctx.audio;
    const T = ctx.tracks;
    const offs = [];
    const viewTimers = new Set();
    let formTimers = new Set();
    let rafs = new Set();

    const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); offs.push(() => t.removeEventListener(ev, fn, opt)); };
    const later = (fn, ms) => { const set = formTimers; const id = setTimeout(() => { set.delete(id); fn(); }, ms); set.add(id); return id; };
    const every = (fn, ms) => { const id = setInterval(fn, ms); formTimers.add(id); return id; };
    const stopTimer = (id) => { clearTimeout(id); clearInterval(id); formTimers.delete(id); };
    const frame = (fn) => { const set = rafs; const id = requestAnimationFrame((t) => { set.delete(id); fn(t); }); set.add(id); return id; };
    const reduced = () => !!ctx.reducedMotion;

    ctx.setChromeInk('#0a0a0a');

    /* -------------------------------------------------------------- sound */

    const snd = {
      t(o) { try { A.tone(o); } catch (e) { /* silent */ } },
      n(o) { try { A.noise(o); } catch (e) { /* silent */ } },
      get on() { try { return !!A.enabled; } catch (e) { return false; } },
      clack() {
        if (!this.on) return;
        this.n({ dur: 0.04, gain: 0.08, type: 'highpass', freq: 2600 + rnd(-400, 400) });
        this.t({ freq: 150 + rnd(-20, 20), type: 'sine', dur: 0.05, gain: 0.07, release: 0.04 });
        this.t({ freq: 1900 + rnd(-200, 200), type: 'square', dur: 0.018, gain: 0.012, release: 0.014 });
      },
      bell() {
        if (!this.on) return;
        this.t({ freq: 2093, type: 'sine', dur: 0.9, gain: 0.045, release: 0.85 });
        this.t({ freq: 4190, type: 'sine', dur: 0.5, gain: 0.012, release: 0.45 });
      },
      thud(big) {
        if (!this.on) return;
        this.t({ freq: big ? 85 : 110, glideTo: 40, type: 'sine', dur: 0.24, gain: big ? 0.3 : 0.2, release: 0.2 });
        this.n({ dur: 0.1, gain: 0.13, type: 'lowpass', freq: 420 });
        this.n({ dur: 0.035, gain: 0.05, type: 'bandpass', freq: 1700, q: 1.2 });
      },
      paper(g) {
        if (!this.on) return;
        this.n({ dur: rnd(0.1, 0.2), gain: g, type: 'bandpass', freq: rnd(2200, 4200), q: 0.5, attack: 0.03 });
      },
      tick(f, g) { if (this.on) this.t({ freq: f, type: 'triangle', dur: 0.08, gain: g || 0.06, release: 0.07 }); },
      wood(f) {
        if (!this.on) return;
        this.t({ freq: f || 900, type: 'sine', dur: 0.04, gain: 0.08, release: 0.035 });
        this.n({ dur: 0.02, gain: 0.03, type: 'bandpass', freq: 3000, q: 2 });
      },
      scratch() { if (this.on) this.n({ dur: 0.06, gain: 0.05, type: 'highpass', freq: rnd(4000, 6500) }); },
      marker() { if (this.on) this.n({ dur: 0.18, gain: 0.05, type: 'bandpass', freq: 3300, q: 3, attack: 0.02 }); },
      chirp() {
        if (!this.on) return;
        const seq = [1100, 2100, 1100, 2100, 1650, 1850, 1300, 2300];
        seq.forEach((f, i) => this.t({ freq: f, type: 'square', dur: 0.13, gain: 0.018, attack: 0.004, release: 0.02, when: i * 0.14 }));
      },
      matrix(when) {
        if (!this.on) return;
        for (let i = 0; i < 6; i++) this.n({ dur: 0.018, gain: 0.05, type: 'bandpass', freq: 2400, q: 4, when: (when || 0) + i * 0.022 });
      },
    };

    let hum = null;
    function startHum() {
      if (hum) return;
      let c = null;
      let out = null;
      try { c = A.ctx; out = A.out; } catch (e) { return; }
      if (!c || !out) return;
      try {
        const len = c.sampleRate * 3;
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 280;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.linearRampToValueAtTime(0.05, c.currentTime + 1.2);
        const osc = c.createOscillator();
        osc.frequency.value = 100;
        const og = c.createGain();
        og.gain.value = 0.006;
        src.connect(lp).connect(g).connect(out);
        osc.connect(og).connect(out);
        src.start();
        osc.start();
        hum = { src, osc, g, og, lp };
      } catch (e) { hum = null; }
    }
    function stopHum() {
      if (!hum) return;
      const h = hum;
      hum = null;
      try { h.src.stop(); h.osc.stop(); } catch (e) { /* already stopped */ }
      try { h.src.disconnect(); h.osc.disconnect(); h.lp.disconnect(); h.g.disconnect(); h.og.disconnect(); } catch (e) { /* gone */ }
    }
    const unsubAudio = A.onChange((en) => { if (en) startHum(); else stopHum(); });
    if (snd.on) startHum();

    /* -------------------------------------------------------------- scaffold */

    root.innerHTML =
      '<div class="noacf-desk" aria-hidden="true"></div>' +
      '<div class="noacf-view" tabindex="-1">' +
        '<div class="noacf-stack">' +
          '<div class="noacf-under noacf-under--a" aria-hidden="true"></div>' +
          '<div class="noacf-under noacf-under--b" aria-hidden="true"></div>' +
          '<div class="noacf-sheet"></div>' +
        '</div>' +
      '</div>' +
      '<div class="noacf-fax" aria-hidden="true"><span class="noacf-fax-l">FAX FROM NOAC-22 TO YOU</span>' +
        '<span class="noacf-fax-p">P.01/22</span><span class="noacf-fax-u">PRIORITY NORMAL</span></div>' +
      '<div class="noacf-printer" hidden></div>';

    const view = root.querySelector('.noacf-view');
    const stack = root.querySelector('.noacf-stack');
    const sheet = root.querySelector('.noacf-sheet');
    const faxP = root.querySelector('.noacf-fax-p');
    const faxU = root.querySelector('.noacf-fax-u');
    const printer = root.querySelector('.noacf-printer');
    sheet.style.backgroundImage = NOISE;

    /* -------------------------------------------------------------- form state */

    let S = null;
    let Q = {};          // per-item api: { el, sum() }
    let blockTops = [];  // [{ n, y }]
    const started = Date.now();

    function fresh() {
      return { done: {}, people: 0, declared: false, together: false, me: '', you: '', shy: false, flagged: false, signed: false, received: false };
    }

    /* -------------------------------------------------------------- stamps */

    function stamp(host, text, o) {
      o = o || {};
      const s = document.createElement('span');
      s.className = 'noacf-stamp' + (o.cls ? ' ' + o.cls : '');
      s.textContent = text;
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--r', (o.r == null ? rnd(-13, 9) : o.r).toFixed(1) + 'deg');
      s.style.left = (o.x == null ? rnd(42, 70) : o.x) + '%';
      s.style.top = (o.y == null ? rnd(30, 62) : o.y) + '%';
      host.appendChild(s);
      snd.thud(o.big);
      jolt(o.big ? 1 : 0.5);
      return s;
    }

    /* -------------------------------------------------------------- the form */

    function block(n, key, body, o) {
      o = o || {};
      const t = T[n - 1];
      const inst = t.instrumental ? '<span class="nq-inst">no words required</span>' : '';
      const head = o.noHead
        ? '<div class="nq-torn" aria-hidden="true"></div><span class="nq-marg" aria-hidden="true">' + n + '</span>'
        : '<header class="nq-head"><span class="nq-n">' + pad(n) + '</span><h3 class="nq-t">' + esc(t.title) + '</h3>' + inst + '</header>';
      return '<section class="nq nq--' + key + ' ' + (o.cls || '') + '" data-n="' + n + '" aria-label="' + esc(n + '. ' + t.title) + '">' +
        (o.slip ? '<span class="nq-staple" aria-hidden="true"></span>' : '') +
        head + (o.hint ? '<p class="nq-hint">' + o.hint + '</p>' : '') +
        '<div class="nq-body">' + body + '</div></section>';
    }

    const part = (letter, name) =>
      '<div class="noacf-part' + (name ? '' : ' noacf-part--blank') + '" aria-hidden="' + (name ? 'false' : 'true') + '">' +
      (name ? '<span class="noacf-part-l">Part ' + letter + '</span><span class="noacf-part-n">' + name + '</span>' : '') + '</div>';

    const tickSvg = (cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 60 60" aria-hidden="true"><path class="nq-tick" d="M9 31 L25 48 L53 9"/></svg>';

    function barcode() {
      let x = 0, r = '';
      for (let i = 0; x < 276; i++) {
        const w = 1 + Math.floor(hash(i * 3.1) * 4);
        if (i % 2 === 0) r += '<rect x="' + x + '" y="0" width="' + w + '" height="' + (i % 23 === 0 ? 66 : 58) + '"/>';
        x += w + (i % 2 ? 0 : Math.floor(hash(i * 7.7) * 3));
      }
      return '<div class="noacf-barcode" aria-hidden="true"><svg viewBox="0 0 280 66" preserveAspectRatio="none">' + r + '</svg>' +
        '<span>0 2020 0022 NOAC 7</span></div>' +
        '<p class="noacf-dnw" aria-hidden="true">Do not write in the margin.<br>(Everyone writes in the margin.)</p>';
    }

    function html() {
      const cells = T.map((t) => '<button type="button" class="noacf-cell" data-go="' + t.n + '" aria-label="Go to item ' + t.n + ', ' + esc(t.title) + '">' + t.n + '</button>').join('');
      const drums = [0, 1, 2, 3].map((i) =>
        '<button type="button" class="nq-drum" data-i="' + i + '" aria-label="Distance digit ' + (i + 1) + '"><span class="nq-strip">' +
        '0123456789'.split('').map((d) => '<i>' + d + '</i>').join('') + '</span></button>').join('');

      return '' +
      '<div class="noacf-ghosts" aria-hidden="true"></div>' +
      '<header class="noacf-top">' +
        '<div class="noacf-id"><span>Form NOAC-22</span><span>Rev. 2020</span><span>Page 1 of 1, continued at length</span></div>' +
        '<h1 class="noacf-title"><span>Notes</span> <span>on a</span> <span>Conditional</span> <span>Form</span></h1>' +
        '<p class="noacf-instr">Complete all twenty-two items in black ink. Some answers change other parts of this form. Push the paper to move it.</p>' +
        '<div class="noacf-side"><div class="noacf-office"><p class="noacf-office-t">For office use only</p>' +
          '<div class="noacf-cells">' + cells + '</div>' +
          '<p class="noacf-office-s">Status <b class="noacf-status">incomplete</b></p>' +
          '<p class="noacf-office-s">Pending <b class="noacf-pending">nothing</b></p>' +
          '<div class="noacf-office-stamps"></div>' +
        '</div>' + barcode() + '</div>' +
      '</header>' +
      '<div class="noacf-form">' +

      part('A', 'Cover sheet') +
      block(1, 'decl',
        '<p class="nq-decl-copy">The undersigned confirms that this form is being filled in now, not later; that it is longer than it needs to be; and that it matters anyway.</p>' +
        '<button type="button" class="nq-hold"><span class="nq-hold-ink" aria-hidden="true"></span><span class="nq-hold-l">Hold to declare</span></button>',
        { cls: 's-12 nq--inverse', hint: 'Declaration. Read it, then press and hold.' }) +

      part('B', 'Particulars') +
      block(2, 'people',
        '<div class="nq-people"><button type="button" class="nq-step" data-d="-1" aria-label="One fewer person">&minus;</button>' +
        '<div class="nq-count"><span class="nq-count-n" aria-live="polite">0</span><span class="nq-count-u">persons</span>' +
        '<svg class="nq-tally" viewBox="0 0 316 60" preserveAspectRatio="xMinYMid meet" aria-hidden="true"></svg></div>' +
        '<button type="button" class="nq-step" data-d="1" aria-label="One more person">+</button></div>',
        { cls: 's-5', hint: 'Headcount. Include yourself.' }) +
      block(3, 'end',
        '<div class="nq-road3" aria-hidden="true"><span class="nq-car"><i></i><i></i></span><span class="nq-flag">END</span></div>' +
        '<div class="nq-odo"><div class="nq-drums">' + drums + '</div><span class="nq-odo-u">miles until the end</span></div>',
        { cls: 's-7', hint: 'Distance remaining. Roll each digit down.' }) +
      block(4, 'frail',
        '<div class="nq-frail"><span class="nq-end">holding up</span><div class="nq-wob">' +
        '<svg class="nq-shake" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path/></svg>' +
        '<input type="range" min="0" max="100" value="18" class="nq-range" aria-label="Frail state of mind, percent"></div>' +
        '<span class="nq-end">frail</span></div><p class="nq-read"><b class="nq-pct4">18</b>% frail</p>' +
        '<p class="nq-note nq-marker" hidden>see 21, it’s for you</p>',
        { cls: 's-7', hint: 'Current condition. The slider may not stay where you leave it.' }) +
      block(5, 'stream',
        '<div class="nq-bar" aria-hidden="true">' + '<i></i>'.repeat(28) + '</div>' +
        '<p class="nq-read"><b class="nq-pct5">0%</b> <span class="nq-stat5">not started</span></p>' +
        '<button type="button" class="nq-btn nq-load">Load</button>',
        { cls: 's-5 nq--slip', slip: true, hint: 'Attachment. Load before continuing.' }) +
      block(6, 'party',
        '<div class="nq-date">' +
          '<label><span>Day</span><input class="nq-dd" inputmode="numeric" maxlength="2" placeholder="DD" autocomplete="off"></label><b aria-hidden="true">/</b>' +
          '<label><span>Month</span><input class="nq-mm" inputmode="numeric" maxlength="2" placeholder="MM" autocomplete="off"></label><b aria-hidden="true">/</b>' +
          '<label><span>Year</span><input class="nq-yy" inputmode="numeric" maxlength="4" placeholder="YYYY" autocomplete="off"></label>' +
        '</div><p class="nq-party"><span class="nq-party-l">Guests</span> <span class="nq-guests">none yet, see 2</span></p>' +
        '<div class="nq-chads" aria-hidden="true"></div>',
        { cls: 's-7', hint: 'Date of the party. Guest numbers are taken from item 2.' }) +
      block(7, 'yik',
        '<div class="nq-yik"><button type="button" class="nq-box nq-box--big is-on" role="checkbox" aria-checked="true" aria-label="Yeah I Know. Already ticked.">' + tickSvg() + '</button>' +
        '<p class="nq-read nq-yik-r">Acknowledged.</p></div>',
        { cls: 's-5', hint: 'Tick to acknowledge. This has been done for you.' }) +

      part('C', 'Conditions') +
      block(8, 'route',
        '<ol class="nq-route"><li><span class="nq-sub">8a</span> Did she go? <button type="button" class="nq-opt" data-a="yes">Yes</button> <button type="button" class="nq-opt" data-a="no">No</button></li>' +
        '<li class="nq-r2" hidden><span class="nq-sub">8b</span> <span class="nq-r2t"></span> <button type="button" class="nq-goto"></button></li></ol>',
        { cls: 's-6', hint: 'Answer, then follow the instruction.' }) +
      block(9, 'seal',
        '<div class="nq-pad" role="button" tabindex="0" aria-label="Press the seal into the paper"><span class="nq-pad-l">press to emboss</span></div>' +
        '<p class="nq-read nq-seal-r">No seals yet.</p>',
        { cls: 's-6', hint: 'Certification. Official seal required.' }) +
      block(10, 'road',
        '<label class="nq-lab">Location of incident<span class="nq-roadwrap"><input class="nq-line nq-road-in" maxlength="40" autocomplete="off" spellcheck="false">' +
        '<span class="nq-tread" aria-hidden="true"></span></span></label><p class="nq-read nq-road-r">&nbsp;</p>',
        { cls: 's-5', hint: 'Be brief. Traffic is heavy.' }) +
      block(11, 'pair',
        '<div class="nq-pair"><label class="nq-lab">Me<input class="nq-line nq-me" maxlength="22" autocomplete="off" spellcheck="false"></label>' +
        '<span class="nq-amp" aria-hidden="true">&amp;</span>' +
        '<label class="nq-lab">You<input class="nq-line nq-you" maxlength="22" autocomplete="off" spellcheck="false"></label>' +
        '<span class="nq-hl" aria-hidden="true"></span></div>' +
        '<p class="nq-valid"><span class="nq-v">✗ not valid alone</span><span class="nq-v">✗ not valid alone</span></p>',
        { cls: 's-7', hint: 'Two names. Neither field is accepted on its own.' }) +
      block(12, 'know',
        '<div class="nq-flapwrap"><div class="nq-inside"><p>You have been on this form for <b class="nq-elapsed">a moment</b>.</p>' +
        '<p>Nobody else is timing you. Take as long as it takes.</p></div>' +
        '<button type="button" class="nq-flap" aria-expanded="false"><span class="nq-flap-a">Confidential</span><span class="nq-flap-b">lift to read</span></button></div>',
        { cls: 's-5 nq--slip', slip: true, hint: 'Folded insert. For the attention of the person filling this in.' }) +
      block(13, 'deny',
        '<label class="nq-lab">Statement<span class="nq-redact"><input class="nq-line nq-red-in" maxlength="36" autocomplete="off" spellcheck="false">' +
        '<span class="nq-bars" aria-hidden="true"></span></span></label>' +
        '<button type="button" class="nq-btn nq-disclose">Request disclosure</button>',
        { cls: 's-7', hint: '<span>Write</span> <span>your</span> <span>statement</span> <span>below.</span> <span>It</span> <span>will</span> <span>be</span> <span>kept</span> <span>on</span> <span>file</span> <span>and</span> <span>shown</span> <span>to</span> <span>nobody.</span>' }) +

      part('D', 'After dark') +
      block(14, 'tonight',
        '<div class="nq-tonight"><svg class="nq-dial" viewBox="0 0 200 200" role="slider" tabindex="0" aria-label="Time, tonight" aria-valuemin="0" aria-valuemax="47"></svg>' +
        '<div><p class="nq-read nq-time">21:00</p><p class="nq-when">still tonight</p></div></div>',
        { cls: 's-4', hint: 'Time. Turn the hand.' }) +
      block(15, 'shiny',
        '<div class="nq-scratch"><div class="nq-under"><svg class="nq-bone" viewBox="0 0 220 60" aria-hidden="true">' +
        '<path class="nq-bone-s" d="M14 38 C 34 16, 62 18, 92 30 S 158 46, 206 20"/><path class="nq-bone-h" d="M40 26 C 60 20, 80 24, 100 30"/>' +
        '<circle cx="14" cy="38" r="9"/><circle cx="206" cy="20" r="9"/></svg><span>shiny</span></div>' +
        '<canvas class="nq-foil" tabindex="0" role="button" aria-label="Scratch the foil"></canvas><span class="nq-sheen" aria-hidden="true"></span></div>' +
        '<p class="nq-read nq-scr-r">Scratch with a coin or a finger.</p>',
        { cls: 's-4 nq--slip', slip: true, hint: 'Scratch panel. One per form.' }) +
      block(16, 'shy',
        '<div class="nq-shyzone"><button type="button" class="nq-shy" role="checkbox" aria-checked="false" aria-label="If you’re too shy, tick here">' +
        '<svg viewBox="0 0 60 60" aria-hidden="true"><path class="nq-tick" d="M9 31 L25 48 L53 9"/></svg></button></div>' +
        '<p class="nq-read nq-shy-r">Tick if you’d rather not say.</p>',
        { cls: 's-4', hint: 'Optional. The box is small on purpose.' }) +
      block(17, 'mind',
        '<p class="nq-q">Is anything playing on your mind?</p><div class="nq-yn"><button type="button" class="nq-opt" data-a="yes">Yes</button>' +
        '<button type="button" class="nq-opt" data-a="no">No</button></div><p class="nq-read nq-mind-r">&nbsp;</p>',
        { cls: 's-12', hint: 'Answer honestly. Answers may be copied elsewhere on this form.' }) +

      part('', '') +
      block(18, 'nohead',
        '<div class="nq-yn"><button type="button" class="nq-opt" data-a="yes">Yes</button><button type="button" class="nq-opt" data-a="no">No</button>' +
        '<button type="button" class="nq-opt" data-a="it depends">It depends</button></div><p class="nq-read nq-nh-r">&nbsp;</p>' +
        '<span class="nq-fallen" aria-hidden="true"><b>18</b> ' + esc(T[17].title) + '<i>no words required</i></span>',
        { cls: 's-12', noHead: true }) +

      part('E', 'Correspondence') +
      block(19, 'say',
        '<div class="nq-said"><span class="nq-said-l" aria-live="polite"></span><span class="nq-caret" aria-hidden="true"></span></div>' +
        '<div class="nq-words">' + PHRASES.map((p, i) => '<button type="button" class="nq-word" data-i="' + i + '">' + esc(p) + '</button>').join('') + '</div>',
        { cls: 's-7 nq--slip', slip: true, hint: 'Suggested replies. Choose one and it will be typed for you.' }) +
      block(20, 'bagsy',
        '<div class="nq-pitch"><svg class="nq-goal" viewBox="0 0 320 120" aria-hidden="true">' +
          '<defs><pattern id="noacf-net" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V10 M0 0 H10" stroke="#0a0a0a" stroke-width="1" opacity=".55"/></pattern></defs>' +
          '<line class="nq-grass" x1="0" y1="108" x2="320" y2="108"/>' +
          '<rect x="186" y="18" width="126" height="90" fill="url(#noacf-net)"/>' +
          '<path class="nq-post" d="M186 108 V18 H312 V108"/>' +
          '<rect class="nq-keeper" x="240" y="60" width="18" height="48"/>' +
          '<circle class="nq-ball" cx="34" cy="98" r="9"/>' +
        '</svg>' +
        '<div class="nq-bagsy"><button type="button" class="nq-box" role="checkbox" aria-checked="false" aria-label="Bagsy not in net">' + tickSvg() + '</button>' +
        '<span class="nq-bagsy-l">Bagsy not in net</span><button type="button" class="nq-btn nq-shoot">Shoot</button></div>' +
        '<p class="nq-read nq-score">No shots yet.</p></div>' +
        '<div class="nq-na"><p>Not applicable. You need two or more persons, see 2.</p><button type="button" class="nq-goto" data-to="2">Go to 2</button></div>',
        { cls: 's-5 is-na', hint: 'Allocation of positions. Claim early.' }) +
      block(21, 'worry',
        '<p class="nq-q">There are no wrong answers in this box.</p>' +
        '<textarea class="nq-area" rows="4" aria-label="Don’t Worry. Write anything." spellcheck="false"></textarea>' +
        '<p class="nq-calm nq-marker" aria-live="polite"></p>' +
        '<p class="nq-from4 nq-marker" hidden>from 4: take this one slowly</p>' +
        '<p class="nq-slip16" hidden>Item 16 let us know. That’s enough, thank you.</p>',
        { cls: 's-12', hint: 'Anything at all. It will not be marked.' }) +

      part('F', 'Sign-off') +
      block(22, 'guys',
        '<div class="nq-sig"><canvas class="nq-sig-c" aria-label="Signature box. Draw your signature, or use Sign for me."></canvas><span class="nq-sig-x" aria-hidden="true">x</span></div>' +
        '<div class="nq-cos" aria-hidden="true">' + [0, 1, 2].map(() => '<div class="nq-co"><svg viewBox="0 0 200 50"><path/></svg><span></span></div>').join('') + '</div>' +
        '<div class="nq-sig-ctl"><button type="button" class="nq-btn nq-signme">Sign for me</button><button type="button" class="nq-btn nq-clear">Clear</button></div>',
        { cls: 's-8', hint: 'Signature of applicant. Witnesses will be added.' }) +
      '<div class="noacf-send s-4"><p>Check every page. Then send it.</p><button type="button" class="noacf-submit">Submit form</button>' +
        '<p class="noacf-send-fine">By submitting you agree that nothing here is binding.</p></div>' +
      '</div>' +
      '<footer class="noacf-foot"><span>NOAC-22</span><span>Do not fold, staple or mutilate (too late)</span><span>2020</span></footer>';
    }

    /* -------------------------------------------------------------- done / office */

    function blockEl(n) { return sheet.querySelector('.nq[data-n="' + n + '"]'); }

    function done(n, yes) {
      const v = yes !== false;
      if (!!S.done[n] === v) return;
      S.done[n] = v;
      const b = blockEl(n);
      if (b) b.classList.toggle('is-done', v);
      const c = sheet.querySelector('.noacf-cell[data-go="' + n + '"]');
      if (c) c.classList.toggle('is-on', v);
      office();
    }

    function office() {
      const k = Object.keys(S.done).filter((n) => S.done[n]).length;
      const st = sheet.querySelector('.noacf-status');
      if (st) st.textContent = k === 22 ? 'complete, 22 of 22' : 'incomplete, ' + k + ' of 22';
      const off = sheet.querySelector('.noacf-office-stamps');
      if (k === 22 && off && !off.querySelector('.is-complete')) stamp(off, 'Complete', { cls: 'is-complete', x: 55, y: 50, r: -8 });
    }

    function pending(text) {
      const p = sheet.querySelector('.noacf-pending');
      if (p) p.textContent = text;
    }

    /* -------------------------------------------------------------- item behaviours */

    function wire() {
      Q = {};

      /* 1. The 1975: hold to declare */
      (() => {
        const b = blockEl(1);
        const btn = b.querySelector('.nq-hold');
        const ink = b.querySelector('.nq-hold-ink');
        const lab = b.querySelector('.nq-hold-l');
        let p = 0, holding = false, running = false, last = 0, lastTick = 0;
        const loop = (t) => {
          const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
          last = t;
          if (S.declared) { running = false; return; }
          p = clamp(p + (holding ? dt / 1.3 : -dt * 2.2), 0, 1);
          ink.style.transform = 'scaleX(' + p.toFixed(3) + ')';
          if (holding && p - lastTick > 0.1) { lastTick = p; snd.tick(180 + p * 420, 0.05); }
          if (p >= 1) {
            S.declared = true;
            running = false;
            lab.textContent = 'Declared';
            btn.classList.add('is-done');
            btn.setAttribute('aria-pressed', 'true');
            root.classList.add('is-urgent');
            faxU.textContent = 'PRIORITY URGENT';
            stamp(b, 'Declared', { x: 22, y: 80, r: -9, big: true });
            const top = sheet.querySelector('.noacf-top');
            stamp(top, 'Urgent', { cls: 'is-urgent', x: 38, y: 64, r: -6, big: true });
            done(1);
            return;
          }
          if (p > 0 || holding) frame(loop); else running = false;
        };
        const start = () => {
          if (S.declared) return;
          holding = true;
          lastTick = p;
          if (!running) { running = true; last = performance.now(); frame(loop); }
        };
        const stop = () => { holding = false; };
        btn.addEventListener('pointerdown', (e) => { btn.setPointerCapture && btn.setPointerCapture(e.pointerId); start(); });
        btn.addEventListener('pointerup', stop);
        btn.addEventListener('pointercancel', stop);
        btn.addEventListener('lostpointercapture', stop);
        btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
        btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
        btn.addEventListener('blur', stop);
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
        Q[1] = { sum: () => (S.declared ? 'DECLARED' : 'NOT DECLARED') };
      })();

      /* 2. People: headcount stepper with tally marks */
      (() => {
        const b = blockEl(2);
        const num = b.querySelector('.nq-count-n');
        const unit = b.querySelector('.nq-count-u');
        const svg = b.querySelector('.nq-tally');
        const MAX = 40;
        const draw = (fresh) => {
          let s = '';
          for (let i = 0; i < S.people; i++) {
            const g = Math.floor(i / 5), k = i % 5, gx = 10 + g * 38, j = (hash(i) - 0.5) * 4;
            const cls = fresh && i === S.people - 1 ? ' class="is-new"' : '';
            s += k < 4
              ? '<path' + cls + ' pathLength="1" d="M' + (gx + k * 7 + j).toFixed(1) + ' 8 L' + (gx + k * 7 - j * 0.6).toFixed(1) + ' 52"/>'
              : '<path' + cls + ' pathLength="1" d="M' + (gx - 5) + ' ' + (42 + j).toFixed(1) + ' L' + (gx + 27) + ' ' + (16 - j).toFixed(1) + '"/>';
          }
          svg.innerHTML = s;
        };
        b.querySelectorAll('.nq-step').forEach((btn) => btn.addEventListener('click', () => {
          const d = +btn.dataset.d;
          const was = S.people;
          S.people = clamp(S.people + d, 0, MAX);
          if (S.people === was) { snd.tick(90, 0.05); b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); return; }
          num.textContent = S.people;
          unit.textContent = S.people === 1 ? 'person' : 'persons';
          draw(d > 0);
          snd.tick(d > 0 ? 300 + S.people * 22 : 260 + S.people * 18);
          if (d > 0) snd.marker();
          done(2, S.people > 0);
          if (S.people === MAX && !b.querySelector('.noacf-stamp')) stamp(b, 'At capacity', { x: 60, y: 46 });
          peopleChanged();
        }));
        Q[2] = { sum: () => (S.people ? S.people + (S.people === 1 ? ' PERSON' : ' PERSONS') : 'NOBODY COUNTED') };
      })();

      /* 3. The End (Music for Cars): odometer that rolls down to nothing */
      (() => {
        const b = blockEl(3);
        const digits = [0, 2, 1, 5];
        const startVal = 215;
        const drums = [...b.querySelectorAll('.nq-drum')];
        const car = b.querySelector('.nq-car');
        let ended = false;
        const value = () => digits[0] * 1000 + digits[1] * 100 + digits[2] * 10 + digits[3];
        const paint = () => {
          drums.forEach((d, i) => {
            d.querySelector('.nq-strip').style.transform = 'translateY(' + (-digits[i] * 10) + '%)';
            d.setAttribute('aria-label', 'Distance digit ' + (i + 1) + ', showing ' + digits[i]);
          });
          const v = value();
          car.style.left = (clamp(1 - v / startVal, 0, 1) * 82).toFixed(1) + '%';
        };
        const roll = (i, dir) => {
          digits[i] = (digits[i] + dir + 10) % 10;
          paint();
          snd.wood(dir < 0 ? 700 + i * 90 : 980 + i * 90);
          done(3, value() !== startVal);
          if (value() === 0 && !ended) {
            ended = true;
            b.classList.add('is-ended');
            stamp(b, 'The end', { x: 70, y: 56, r: -11, big: true });
            if (snd.on) snd.t({ freq: 170, glideTo: 38, type: 'sawtooth', dur: 1.3, gain: 0.03, release: 1 });
          } else if (value() !== 0 && ended) {
            ended = false;
            b.classList.remove('is-ended');
            const s = b.querySelector('.noacf-stamp');
            if (s) s.remove();
          }
        };
        drums.forEach((d, i) => {
          d.addEventListener('click', () => roll(i, -1));
          d.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); roll(i, 1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); roll(i, -1); }
          });
        });
        paint();
        Q[3] = { sum: () => (value() === 0 ? 'THE END' : pad(value(), 4) + ' MI TO GO') };
      })();

      /* 4. Frail State of Mind: a slider that will not hold still */
      (() => {
        const b = blockEl(4);
        const r = b.querySelector('.nq-range');
        const wob = b.querySelector('.nq-wob');
        const path = b.querySelector('.nq-shake path');
        const out = b.querySelector('.nq-pct4');
        const note = b.querySelector('.nq-note');
        let drift = 0;
        let lastTone = 0;
        const shake = () => {
          const v = +r.value;
          const amp = 0.6 + (v / 100) * 9;
          let d = 'M0 15';
          for (let x = 10; x <= 400; x += 10) d += ' L' + x + ' ' + (15 + (Math.random() * 2 - 1) * amp * (x / 400 + 0.3)).toFixed(1);
          path.setAttribute('d', d);
          wob.style.setProperty('--noacf-amp', (v / 100 * 2.6).toFixed(2) + 'px');
          wob.style.setProperty('--noacf-spd', (0.22 - v / 100 * 0.14).toFixed(3) + 's');
          out.textContent = v;
          r.setAttribute('aria-valuetext', v + ' percent frail');
          const flag = v > 70;
          note.hidden = !flag;
          if (flag !== S.flagged) { S.flagged = flag; flagWorry(); }
        };
        r.addEventListener('input', () => {
          shake();
          done(4);
          const now = performance.now();
          if (now - lastTone > 45) { lastTone = now; snd.t({ freq: 220 + +r.value * 4, type: 'sine', dur: 0.09, gain: 0.03, detune: rnd(-40, 40) * (+r.value / 100) }); }
        });
        r.addEventListener('change', () => {
          stopTimer(drift);
          let k = 0;
          drift = every(() => {
            if (++k > 3) { stopTimer(drift); return; }
            r.value = clamp(+r.value + Math.round(rnd(-5, 5)), 0, 100);
            shake();
            snd.t({ freq: 200 + +r.value * 4, type: 'sine', dur: 0.12, gain: 0.025, detune: rnd(-60, 60) });
          }, 700);
        });
        shake();
        Q[4] = { sum: () => r.value + '% FRAIL' };
      })();

      /* 5. Streaming: a progress bar that only ever buffers */
      (() => {
        const b = blockEl(5);
        const cells = [...b.querySelectorAll('.nq-bar i')];
        const pctEl = b.querySelector('.nq-pct5');
        const stat = b.querySelector('.nq-stat5');
        const btn = b.querySelector('.nq-load');
        let pct = 0, cap = 0, timer = 0, spin = 0, tries = 0;
        const SPIN = ['|', '/', '–', '\\'];
        const paint = () => {
          const k = Math.floor(pct / 100 * cells.length);
          cells.forEach((c, i) => c.classList.toggle('on', i < k));
          pctEl.textContent = (pct >= 99 ? pct.toFixed(1) : Math.floor(pct)) + '%';
        };
        const step = () => {
          if (pct < cap) {
            const before = Math.floor(pct / 100 * cells.length);
            pct = Math.min(cap, pct + rnd(0.5, 7));
            if (Math.floor(pct / 100 * cells.length) !== before) snd.matrix();
            stat.textContent = 'loading';
          } else {
            pct = Math.min(99.9, pct + (99.9 - pct) * 0.08);
            stat.textContent = 'buffering ' + SPIN[spin++ % 4];
          }
          paint();
        };
        btn.addEventListener('click', () => {
          tries++;
          stopTimer(timer);
          pct = tries === 1 ? 0 : rnd(6, 30);
          cap = rnd(94, 98);
          btn.textContent = 'Retry';
          stat.textContent = tries === 1 ? 'connecting' : 'reconnecting';
          snd.tick(520, 0.05);
          timer = every(step, 140);
          done(5);
          b.classList.add('is-loading');
          pending('item 5, still buffering');
        });
        paint();
        Q[5] = { sum: () => (tries ? 'PENDING ' + pct.toFixed(1) + '%' : 'NOT LOADED') };
      })();

      /* 6. The Birthday Party: a date field that throws a party */
      (() => {
        const b = blockEl(6);
        const ins = [b.querySelector('.nq-dd'), b.querySelector('.nq-mm'), b.querySelector('.nq-yy')];
        const guests = b.querySelector('.nq-guests');
        const chads = b.querySelector('.nq-chads');
        let rsvp = null, today = null, valid = '';
        const check = () => {
          const d = +ins[0].value, m = +ins[1].value, y = +ins[2].value;
          const full = ins[0].value.length >= 1 && ins[1].value.length >= 1 && ins[2].value.length === 4;
          const dt = new Date(y, m - 1, d);
          const ok = full && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
          b.classList.toggle('is-invalid', full && !ok);
          const key = ok ? d + '/' + m + '/' + y : '';
          if (key === valid) return;
          valid = key;
          if (rsvp) { rsvp.remove(); rsvp = null; }
          if (today) { today.remove(); today = null; }
          done(6, ok);
          if (!ok) return;
          rsvp = stamp(b, DAYS[dt.getDay()].slice(0, 3) + ' ' + d + ' ' + MONTHS[m - 1].slice(0, 3), { x: 82, y: 60, r: 7 });
          const now = new Date();
          if (now.getDate() === d && now.getMonth() === m - 1) {
            today = stamp(b, 'That’s today', { x: 64, y: 86, r: -6, big: true });
            party();
          } else {
            snd.bell();
          }
        };
        const party = () => {
          if (snd.on) [523, 659, 784, 1047].forEach((f, i) => snd.t({ freq: f, type: 'triangle', dur: 0.25, gain: 0.05, when: i * 0.09 }));
          if (reduced()) return;
          for (let i = 0; i < 46; i++) {
            const c = document.createElement('i');
            c.style.left = rnd(2, 98) + '%';
            c.style.setProperty('--noacf-dx', rnd(-60, 60).toFixed(0) + 'px');
            c.style.setProperty('--noacf-rot', rnd(-400, 400).toFixed(0) + 'deg');
            c.style.animationDelay = rnd(0, 0.6).toFixed(2) + 's';
            c.style.animationDuration = rnd(1.4, 2.4).toFixed(2) + 's';
            if (Math.random() < 0.35) c.className = 'g';
            chads.appendChild(c);
          }
          later(() => { chads.textContent = ''; }, 3200);
        };
        ins.forEach((inp, i) => {
          inp.addEventListener('input', () => {
            const clean = inp.value.replace(/\D/g, '');
            if (clean !== inp.value) inp.value = clean;
            snd.clack();
            if (inp.value.length === inp.maxLength && ins[i + 1]) ins[i + 1].focus();
            check();
          });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); }
          });
        });
        Q[6] = {
          sum: () => (valid ? valid.split('/').map((v, i) => (i < 2 ? pad(v) : v)).join('/') : 'NO DATE'),
          guests: () => {
            guests.textContent = S.people === 0 ? 'none yet, see 2' : S.people === 1 ? 'just you, see 2' : word(S.people) + ', see 2';
          },
        };
      })();

      /* 7. Yeah I Know: pre-ticked, will not untick */
      (() => {
        const b = blockEl(7);
        const box = b.querySelector('.nq-box');
        const read = b.querySelector('.nq-yik-r');
        let k = 0;
        const lines = ['Acknowledged.', 'Acknowledged again.', 'Still acknowledged.', 'Yes. It knows.', 'Acknowledged, firmly.'];
        box.style.setProperty('--noacf-w', '7');
        box.addEventListener('click', () => {
          k++;
          box.classList.add('is-lift');
          snd.tick(200, 0.04);
          later(() => {
            box.classList.remove('is-lift');
            box.style.setProperty('--noacf-w', String(Math.min(16, 7 + k * 1.3)));
            snd.marker();
            snd.thud();
            read.textContent = k < lines.length ? lines[k] : 'Acknowledged ×' + (k + 1) + '.';
            if (k === 6) stamp(b, 'Yeah, we know', { x: 64, y: 58 });
          }, 260);
        });
        done(7);
        Q[7] = { sum: () => 'ACKNOWLEDGED ×' + (k + 1) };
      })();

      /* 8. Then Because She Goes: an answer that sends you somewhere else */
      (() => {
        const b = blockEl(8);
        const opts = [...b.querySelectorAll('.nq-opt')];
        const r2 = b.querySelector('.nq-r2');
        const r2t = b.querySelector('.nq-r2t');
        const go = b.querySelector('.nq-goto');
        let ans = '';
        opts.forEach((o) => o.addEventListener('click', () => {
          ans = o.dataset.a;
          opts.forEach((x) => { x.classList.toggle('is-picked', x === o); x.classList.toggle('is-struck', x !== o); x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); });
          r2.hidden = false;
          const to = ans === 'yes' ? 14 : 11;
          r2t.textContent = ans === 'yes' ? 'Then, because she went:' : 'Then she stayed. In that case:';
          go.textContent = 'Go to ' + to;
          go.dataset.to = to;
          snd.marker();
          done(8);
        }));
        Q[8] = { sum: () => (ans ? (ans === 'yes' ? 'SHE WENT, SENT TO 14' : 'SHE STAYED, SENT TO 11') : 'UNANSWERED') };
      })();

      /* 9. Jesus Christ 2005 God Bless America: a notary seal pressed into the paper */
      (() => {
        const b = blockEl(9);
        const padEl = b.querySelector('.nq-pad');
        const read = b.querySelector('.nq-seal-r');
        let k = 0;
        const press = (x, y) => {
          if (k >= 9) { snd.tick(110, 0.05); return; }
          k++;
          const id = 'noacf-ring-' + k + '-' + Math.floor(Math.random() * 1e6);
          const s = document.createElement('span');
          s.className = 'nq-sealmark';
          s.style.left = x + '%';
          s.style.top = y + '%';
          s.style.setProperty('--r', rnd(-30, 30).toFixed(0) + 'deg');
          s.innerHTML = '<svg viewBox="0 0 100 100"><defs><path id="' + id + '" d="M50 50 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0"/></defs>' +
            '<circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="27"/>' +
            '<text class="ring"><textPath href="#' + id + '">CERTIFIED  2005  CERTIFIED  2005  CERTIFIED  2005</textPath></text>' +
            '<text class="mid" x="50" y="58" text-anchor="middle">2005</text></svg>';
          padEl.appendChild(s);
          if (snd.on) { snd.thud(true); snd.t({ freq: 60, type: 'sine', dur: 0.12, gain: 0.15, when: 0.09 }); }
          jolt(0.6);
          read.textContent = k === 1 ? 'One seal. Certified.' : word(k).replace(/^./, (c) => c.toUpperCase()) + ' seals. Extremely certified.';
          done(9);
          if (k === 9) stamp(b, 'Blessed', { x: 72, y: 28, r: 12 });
        };
        padEl.addEventListener('click', (e) => {
          const r = padEl.getBoundingClientRect();
          press(clamp((e.clientX - r.left) / r.width * 100, 12, 88), clamp((e.clientY - r.top) / r.height * 100, 18, 82));
        });
        padEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(rnd(15, 85), rnd(25, 75)); }
        });
        Q[9] = { sum: () => (k ? k + (k === 1 ? ' SEAL' : ' SEALS') : 'UNCERTIFIED') };
      })();

      /* 10. Roadkill: every letter typed gets run over */
      (() => {
        const b = blockEl(10);
        const inp = b.querySelector('.nq-road-in');
        const tread = b.querySelector('.nq-tread');
        const read = b.querySelector('.nq-road-r');
        let lastRun = 0;
        inp.addEventListener('input', () => {
          snd.clack();
          const len = inp.value.length;
          const sq = clamp(1 - len * 0.035, 0.42, 1);
          done(10, len > 0);
          const now = performance.now();
          if (now - lastRun < 420) { inp.style.setProperty('--noacf-sq', sq.toFixed(3)); return; }
          lastRun = now;
          tread.classList.remove('is-run');
          void tread.offsetWidth;
          tread.classList.add('is-run');
          if (snd.on) { snd.n({ dur: 0.45, gain: 0.07, type: 'lowpass', freq: 180, attack: 0.08 }); snd.n({ dur: 0.3, gain: 0.025, type: 'bandpass', freq: 900, q: 0.8, attack: 0.1 }); }
          later(() => {
            inp.style.setProperty('--noacf-sq', sq.toFixed(3));
            b.classList.add('is-marked');
          }, reduced() ? 0 : 170);
          read.textContent = len ? (sq < 0.6 ? 'Flattened.' : 'Run over.') : ' ';
        });
        Q[10] = { sum: () => (inp.value.trim() ? 'FLATTENED' : 'NOTHING ON THE ROAD') };
      })();

      /* 11. Me & You Together Song: two fields that only validate together */
      (() => {
        const b = blockEl(11);
        const me = b.querySelector('.nq-me');
        const you = b.querySelector('.nq-you');
        const vs = [...b.querySelectorAll('.nq-v')];
        let st = null;
        const check = () => {
          S.me = me.value.trim();
          S.you = you.value.trim();
          const both = !!(S.me && S.you);
          vs[0].textContent = both ? '✓ valid together' : S.me ? '✗ waiting for you' : '✗ not valid alone';
          vs[1].textContent = both ? '✓ valid together' : S.you ? '✗ waiting for me' : '✗ not valid alone';
          if (both === S.together) { cosignNames(); return; }
          S.together = both;
          b.classList.toggle('is-together', both);
          done(11, both);
          if (both) {
            st = stamp(b, 'Together', { x: 56, y: 96, r: -4 });
            if (snd.on) { snd.t({ freq: 392, type: 'triangle', dur: 0.7, gain: 0.05, release: 0.6 }); snd.t({ freq: 587.3, type: 'triangle', dur: 0.7, gain: 0.04, release: 0.6, when: 0.05 }); }
          } else if (st) { st.remove(); st = null; snd.tick(150, 0.05); }
          cosignNames();
        };
        [me, you].forEach((i) => i.addEventListener('input', () => { snd.clack(); check(); }));
        Q[11] = { sum: () => (S.together ? (S.me + ' & ' + S.you).toUpperCase() : 'NOT VALID ALONE') };
      })();

      /* 12. I Think There's Something You Should Know: a folded insert */
      (() => {
        const b = blockEl(12);
        const flap = b.querySelector('.nq-flap');
        const el = b.querySelector('.nq-elapsed');
        let open = false, timer = 0, read = false;
        const tick = () => {
          const s = Math.floor((Date.now() - started) / 1000);
          const m = Math.floor(s / 60), r = s % 60;
          el.textContent = (m ? word(m) + (m === 1 ? ' minute and ' : ' minutes and ') : '') + word(r) + (r === 1 ? ' second' : ' seconds');
        };
        flap.addEventListener('click', () => {
          open = !open;
          b.classList.toggle('is-open', open);
          flap.setAttribute('aria-expanded', String(open));
          flap.querySelector('.nq-flap-b').textContent = open ? 'fold it back' : 'lift to read';
          snd.paper(0.08);
          stopTimer(timer);
          if (open) { read = true; tick(); timer = every(tick, 1000); done(12); }
        });
        Q[12] = { sum: () => (read ? 'READ' : 'STILL FOLDED') };
      })();

      /* 13. Nothing Revealed / Everything Denied: a field that redacts itself */
      (() => {
        const b = blockEl(13);
        const inp = b.querySelector('.nq-red-in');
        const bars = b.querySelector('.nq-bars');
        const btn = b.querySelector('.nq-disclose');
        const words = [...b.querySelectorAll('.nq-hint span')].concat([b.querySelector('.nq-t')]);
        let asks = 0;
        inp.addEventListener('input', () => {
          bars.innerHTML = inp.value.split(/(\s+)/).map((w) => (/\s/.test(w) ? '<i class="sp">' + ' '.repeat(w.length) + '</i>' : w ? '<i style="--k:' + w.length + ';--r:' + rnd(-1.4, 1.4).toFixed(2) + 'deg">' + ' '.repeat(w.length) + '</i>' : '')).join('');
          snd.marker();
          done(13, inp.value.length > 0 || asks > 0);
        });
        btn.addEventListener('click', () => {
          asks++;
          const left = words.filter((w) => !w.classList.contains('is-x'));
          if (left.length) {
            const w = left.length > 1 && left[left.length - 1] === words[words.length - 1] ? left[Math.floor(Math.random() * (left.length - 1))] : left[0];
            w.classList.add('is-x');
          }
          stamp(b, 'Denied', { x: rnd(40, 78), y: rnd(30, 75) });
          btn.textContent = asks < 3 ? 'Request disclosure again' : 'Appeal';
          done(13);
        });
        Q[13] = { sum: () => '█'.repeat(clamp(inp.value.length || 6, 4, 10)) };
      })();

      /* 14. Tonight (I Wish I Was Your Boy): a clock that only covers tonight */
      (() => {
        const b = blockEl(14);
        const svg = b.querySelector('.nq-dial');
        const tEl = b.querySelector('.nq-time');
        const wEl = b.querySelector('.nq-when');
        const C = 100;
        const P = (a, r) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
        const f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
        let ticks = '';
        for (let h = 0; h < 48; h++) {
          const a = h * 7.5, big = h % 4 === 0;
          ticks += '<line x1="' + P(a, big ? 74 : 80)[0].toFixed(1) + '" y1="' + P(a, big ? 74 : 80)[1].toFixed(1) + '" x2="' + P(a, 86)[0].toFixed(1) + '" y2="' + P(a, 86)[1].toFixed(1) + '" class="' + (big ? 'big' : '') + '"/>';
        }
        const lab = (a, t, r) => { const p = P(a, r || 60); return '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 5).toFixed(1) + '" text-anchor="middle">' + t + '</text>'; };
        svg.innerHTML =
          '<defs><pattern id="noacf-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0 V6" stroke="#0a0a0a" stroke-width="1.4"/></pattern></defs>' +
          '<circle cx="100" cy="100" r="92" class="rim"/>' +
          '<path class="tonight" d="M100 100 L' + f(P(180, 86)) + ' A86 86 0 0 1 ' + f(P(270, 86)) + ' A86 86 0 0 1 ' + f(P(360, 86)) + ' Z"/>' +
          '<path class="tomorrow" d="M100 100 L' + f(P(0, 86)) + ' A86 86 0 0 1 ' + f(P(90, 86)) + ' A86 86 0 0 1 ' + f(P(180, 86)) + ' Z"/>' +
          ticks + lab(0, '00') + lab(90, '03') + lab(270, '21') + lab(166, '06', 66) + lab(194, '18', 66) +
          '<line class="hand" x1="100" y1="100" x2="100" y2="34"/><rect class="hub" x="94" y="94" width="12" height="12"/>';
        const hand = svg.querySelector('.hand');
        let v = 12;
        const paint = () => {
          const a = 180 + v * 7.5;
          const p = P(a, 70);
          hand.setAttribute('x2', p[0].toFixed(1));
          hand.setAttribute('y2', p[1].toFixed(1));
          const mins = (18 * 60 + v * 15) % 1440;
          const txt = pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
          tEl.textContent = txt;
          wEl.textContent = v < 24 ? 'still tonight' : v < 36 ? 'technically tomorrow' : 'nearly morning';
          svg.setAttribute('aria-valuenow', String(v));
          svg.setAttribute('aria-valuetext', txt + ', ' + wEl.textContent);
          b.classList.toggle('is-late', v >= 24);
        };
        const set = (nv) => {
          nv = clamp(Math.round(nv), 0, 47);
          if (nv === v) return;
          const crossed = (v < 24) !== (nv < 24);
          v = nv;
          paint();
          snd.wood(v < 24 ? 1200 : 760);
          if (crossed && snd.on) [1568, 1175].forEach((fq, i) => snd.t({ freq: fq, type: 'sine', dur: 0.8, gain: 0.04, release: 0.7, when: i * 0.22 }));
          done(14);
        };
        const fromPointer = (e) => {
          const r = svg.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          const a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
          let nv = Math.round(((a - 180 + 360) % 360) / 7.5);
          if (nv >= 48) nv = 47;
          if (Math.abs(nv - v) > 24) nv = v < 24 ? 0 : 47;
          set(nv);
        };
        let drag = false;
        svg.addEventListener('pointerdown', (e) => { drag = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); fromPointer(e); });
        svg.addEventListener('pointermove', (e) => { if (drag) fromPointer(e); });
        const end = () => { drag = false; };
        svg.addEventListener('pointerup', end);
        svg.addEventListener('pointercancel', end);
        svg.addEventListener('keydown', (e) => {
          const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 }[e.key];
          if (d) { e.preventDefault(); set(v + d); }
          if (e.key === 'Home') { e.preventDefault(); set(0); }
          if (e.key === 'End') { e.preventDefault(); set(47); }
        });
        paint();
        Q[14] = { sum: () => tEl.textContent + (v < 24 ? ' TONIGHT' : ' TOMORROW, TECHNICALLY') };
      })();

      /* 15. Shiny Collarbone: a scratch-off foil panel */
      (() => {
        const b = blockEl(15);
        const cv = b.querySelector('.nq-foil');
        const sheen = b.querySelector('.nq-sheen');
        const wrap = b.querySelector('.nq-scratch');
        const read = b.querySelector('.nq-scr-r');
        const g = cv.getContext('2d');
        let w = 0, h = 0, dpr = 1, cleared = 0, won = false, last = null, lastS = 0, moves = 0;
        const paintFoil = () => {
          dpr = Math.min(2, window.devicePixelRatio || 1);
          w = cv.clientWidth || 260;
          h = cv.clientHeight || 96;
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          const gr = g.createLinearGradient(0, 0, w, h);
          gr.addColorStop(0, '#8c8f93'); gr.addColorStop(0.28, '#e9eaec'); gr.addColorStop(0.46, '#9a9da1');
          gr.addColorStop(0.64, '#f3f4f5'); gr.addColorStop(0.82, '#a3a6aa'); gr.addColorStop(1, '#7b7e82');
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = gr;
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(40,40,40,.18)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
          g.fillStyle = 'rgba(30,30,30,.32)';
          g.font = '700 13px "Courier Prime", "Courier New", monospace';
          for (let y = 18; y < h; y += 22) for (let x = (y / 22 % 2) * 36 - 10; x < w; x += 92) g.fillText('SCRATCH', x, y);
        };
        const coverage = () => {
          try {
            const d = g.getImageData(0, 0, cv.width, cv.height).data;
            let gone = 0, n = 0;
            for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 40) gone++; }
            return gone / n;
          } catch (e) { return 0; }
        };
        const scrape = (x, y) => {
          g.globalCompositeOperation = 'destination-out';
          g.lineCap = 'round';
          g.lineJoin = 'round';
          g.lineWidth = 24;
          g.beginPath();
          if (last) g.moveTo(last[0], last[1]); else g.moveTo(x - 0.1, y);
          g.lineTo(x, y);
          g.stroke();
          last = [x, y];
          const now = performance.now();
          if (now - lastS > 55) { lastS = now; snd.scratch(); }
          if (++moves % 8 === 0) check();
        };
        const check = () => {
          cleared = coverage();
          done(15, cleared > 0.05);
          read.textContent = 'Scratched ' + Math.round(cleared * 100) + '%.';
          if (cleared > 0.52 && !won) {
            won = true;
            wrap.classList.add('is-won');
            read.textContent = 'Revealed. Shiny, as described.';
            stamp(b, 'Winner', { x: 68, y: 80, r: -10 });
            if (snd.on) [784, 988, 1175, 1568].forEach((fq, i) => snd.t({ freq: fq, type: 'sine', dur: 0.4, gain: 0.04, when: i * 0.07 }));
          }
        };
        const local = (e) => {
          const r = cv.getBoundingClientRect();
          return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h];
        };
        let down = false;
        cv.addEventListener('pointerdown', (e) => { down = true; last = null; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); const p = local(e); scrape(p[0], p[1]); });
        cv.addEventListener('pointermove', (e) => {
          const r = cv.getBoundingClientRect();
          sheen.style.setProperty('--noacf-sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          if (!down) return;
          const p = local(e);
          scrape(p[0], p[1]);
        });
        const up = () => { if (down) { down = false; last = null; check(); } };
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        cv.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          last = null;
          const y = rnd(0.2, 0.8) * h;
          for (let x = 0; x <= w; x += 8) scrape(x, y + Math.sin(x / 20) * 10);
          last = null;
          check();
        });
        paintFoil();
        Q[15] = { sum: () => (won ? 'REVEALED, SHINY' : cleared > 0.05 ? 'SCRATCHED ' + Math.round(cleared * 100) + '%' : 'UNSCRATCHED') };
      })();

      /* 16. If You're Too Shy (Let Me Know): a checkbox that edges away */
      (() => {
        const b = blockEl(16);
        const zone = b.querySelector('.nq-shyzone');
        const box = b.querySelector('.nq-shy');
        const read = b.querySelector('.nq-shy-r');
        let x = 0.5, y = 0.5, flees = 0, brave = false, lastFlee = 0;
        const place = () => { box.style.left = (x * 100).toFixed(2) + '%'; box.style.top = (y * 100).toFixed(2) + '%'; };
        const flee = (px, py, force) => {
          if (brave || S.shy) return;
          const r = zone.getBoundingClientRect();
          if (!r.width) return;
          const bx = r.left + x * r.width, by = r.top + y * r.height;
          let dx = bx - px, dy = by - py;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > 64 && !force) return;
          const now = performance.now();
          dx /= dist; dy /= dist;
          if (force) { dx = rnd(-1, 1); dy = rnd(-1, 1); }
          const push = force ? 90 : (70 - dist) * 1.3 + 20;
          const nx = clamp(x + dx * push / r.width, 0.08, 0.92);
          const ny = clamp(y + dy * push / r.height, 0.16, 0.84);
          const moved = Math.hypot((nx - x) * r.width, (ny - y) * r.height);
          if (moved < 6 && !force) { box.classList.add('is-cornered'); return; }
          box.classList.remove('is-cornered');
          x = nx; y = ny;
          place();
          if (now - lastFlee > 300) {
            lastFlee = now;
            flees++;
            snd.t({ freq: 1400 + flees * 40, type: 'sine', dur: 0.05, gain: 0.025 });
            if (flees === 3) read.textContent = 'It is shy. Go gently.';
            if (flees >= 8) { brave = true; box.classList.add('is-brave'); read.textContent = 'Alright. It will stay still now.'; }
          }
        };
        zone.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') flee(e.clientX, e.clientY); });
        box.addEventListener('pointerdown', (e) => {
          if (e.pointerType !== 'mouse' && !brave && !S.shy && flees < 3) { e.preventDefault(); flees++; flee(0, 0, true); if (flees === 3) { brave = true; box.classList.add('is-brave'); read.textContent = 'Alright. It will stay still now.'; } }
        });
        box.addEventListener('click', () => {
          S.shy = !S.shy;
          box.setAttribute('aria-checked', String(S.shy));
          box.classList.toggle('is-on', S.shy);
          read.textContent = S.shy ? 'Noted, quietly. See 21.' : 'Unticked. No questions asked.';
          snd.tick(S.shy ? 880 : 440, 0.04);
          done(16, S.shy);
          const slip = sheet.querySelector('.nq-slip16');
          if (slip) slip.hidden = !S.shy;
        });
        place();
        Q[16] = { sum: () => (S.shy ? 'LET US KNOW' : 'TOO SHY TO SAY') };
      })();

      /* 17. Playing on My Mind: answers that get copied all over the form */
      (() => {
        const b = blockEl(17);
        const read = b.querySelector('.nq-mind-r');
        const ghosts = sheet.querySelector('.noacf-ghosts');
        let k = 0;
        b.querySelectorAll('.nq-opt').forEach((o) => o.addEventListener('click', () => {
          b.querySelectorAll('.nq-opt').forEach((x) => { x.classList.toggle('is-picked', x === o); x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); });
          if (k < 16) {
            k++;
            const g = document.createElement('span');
            g.className = 'noacf-ghost';
            g.innerHTML = '<b>17</b> Playing on My Mind' + (o.dataset.a === 'no' ? ' <i>(no)</i>' : '');
            g.style.left = rnd(-6, 70).toFixed(1) + '%';
            g.style.top = rnd(4, 94).toFixed(1) + '%';
            g.style.setProperty('--r', rnd(-16, 16).toFixed(1) + 'deg');
            g.style.setProperty('--s', rnd(0.7, 1.6).toFixed(2));
            ghosts.appendChild(g);
          }
          read.textContent = o.dataset.a === 'yes'
            ? (k === 1 ? 'Noted. It has been copied somewhere else on this form.' : 'Noted. It is now in ' + word(k + 1) + ' places.')
            : 'Noted anyway. It has been copied ' + (k === 1 ? 'once.' : word(k) + ' times.');
          if (snd.on) { snd.chirpShort(); }
          done(17);
        }));
        Q[17] = { sum: () => (k ? 'COPIED ×' + k : 'CLEAR') };
      })();

      /* 18. Having No Head: an answer to a missing question */
      (() => {
        const b = blockEl(18);
        const read = b.querySelector('.nq-nh-r');
        let ans = '';
        b.querySelectorAll('.nq-opt').forEach((o) => o.addEventListener('click', () => {
          ans = o.dataset.a;
          b.querySelectorAll('.nq-opt').forEach((x) => { x.classList.toggle('is-picked', x === o); x.classList.toggle('is-struck', x !== o); x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); });
          read.textContent = 'Answered. The question is still missing.';
          snd.marker();
          if (!b.querySelector('.noacf-stamp')) stamp(b.querySelector('.nq-torn'), '?', { x: 50, y: 50, r: 6, cls: 'is-q' });
          done(18);
        }));
        Q[18] = { sum: () => (ans ? ans.toUpperCase() + ' (TO WHAT?)' : 'NO QUESTION, NO ANSWER') };
      })();

      /* 19. What Should I Say: suggested replies, typed out for you */
      (() => {
        const b = blockEl(19);
        const line = b.querySelector('.nq-said-l');
        const btns = [...b.querySelectorAll('.nq-word')];
        let busy = false, said = '';
        btns.forEach((btn) => btn.addEventListener('click', () => {
          if (busy) return;
          busy = true;
          b.classList.add('is-typing');
          const text = PHRASES[+btn.dataset.i];
          btn.classList.add('is-used');
          const prev = line.querySelector('.cur');
          if (prev) { prev.className = 'old'; snd.marker(); }
          [...line.querySelectorAll('.old')].slice(0, -2).forEach((o) => o.remove());
          const cur = document.createElement('span');
          cur.className = 'cur';
          line.appendChild(cur);
          let i = 0;
          const type = () => {
            if (i >= text.length) { busy = false; b.classList.remove('is-typing'); said = text; snd.bell(); done(19); return; }
            cur.textContent += text[i++];
            snd.clack();
            later(type, reduced() ? 0 : rnd(45, 95));
          };
          later(type, prev ? 260 : 0);
        }));
        Q[19] = { sum: () => (said ? '"' + said.toUpperCase() + '"' : 'SAID NOTHING') };
      })();

      /* 20. Bagsy Not in Net: claim early, or go in goal */
      (() => {
        const b = blockEl(20);
        const box = b.querySelector('.nq-box');
        const shoot = b.querySelector('.nq-shoot');
        const ball = b.querySelector('.nq-ball');
        const keeper = b.querySelector('.nq-keeper');
        const score = b.querySelector('.nq-score');
        const lab = b.querySelector('.nq-bagsy-l');
        let bagsied = false, goals = 0, saves = 0, flying = false, inNet = 0;
        box.addEventListener('click', () => {
          if (bagsied) { snd.tick(120, 0.05); lab.textContent = 'Bagsied. No backsies.'; return; }
          bagsied = true;
          box.classList.add('is-on');
          box.setAttribute('aria-checked', 'true');
          lab.textContent = 'Bagsied. Not in net.';
          stamp(b, 'Bagsied', { x: 74, y: 94, r: -8 });
          done(20);
        });
        shoot.addEventListener('click', () => {
          if (flying) return;
          flying = true;
          const tx = rnd(196, 302), ty = rnd(30, 98);
          const kx = bagsied ? rnd(190, 290) : 0;
          const t0 = performance.now(), dur = reduced() ? 1 : 620;
          snd.t({ freq: 140, glideTo: 70, type: 'sine', dur: 0.12, gain: 0.12 });
          snd.n({ dur: 0.05, gain: 0.08, type: 'bandpass', freq: 900 });
          if (!bagsied) {
            inNet++;
            keeper.classList.add('is-you');
            score.textContent = 'You didn’t bagsy, so you’re in net.';
          }
          const fly = (t) => {
            const p = clamp((t - t0) / dur, 0, 1);
            const e = 1 - Math.pow(1 - p, 2);
            if (bagsied) {
              const x = 34 + (tx - 34) * e, y = 98 + (ty - 98) * e - Math.sin(p * Math.PI) * 38;
              ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1));
              keeper.setAttribute('x', (240 + (kx - 240) * Math.min(1, p * 1.6)).toFixed(1));
            } else {
              ball.setAttribute('cx', (34 + 210 * e).toFixed(1)); ball.setAttribute('cy', (98 - 30 * e).toFixed(1));
              ball.setAttribute('r', (9 + e * 24).toFixed(1));
            }
            if (p < 1) { frame(fly); return; }
            if (bagsied) {
              const saved = Math.abs(kx + 9 - tx) < 22;
              if (saved) { saves++; snd.thud(); } else { goals++; snd.paper(0.12); if (snd.on) [660, 880].forEach((fq, i) => snd.t({ freq: fq, type: 'triangle', dur: 0.2, gain: 0.05, when: i * 0.1 })); }
              score.textContent = (saved ? 'Saved. ' : 'Goal. ') + 'Goals ' + goals + ', saves ' + saves + '.';
            } else {
              snd.thud(true);
              jolt(1);
            }
            later(() => {
              ball.setAttribute('cx', '34'); ball.setAttribute('cy', '98'); ball.setAttribute('r', '9');
              keeper.setAttribute('x', '240');
              keeper.classList.remove('is-you');
              flying = false;
            }, 700);
          };
          frame(fly);
        });
        Q[20] = {
          sum: () => (bagsied ? 'NOT IN NET, ' + goals + '-' + saves : inNet ? 'IN NET (DIDN’T BAGSY)' : S.people < 2 ? 'N/A, NOT ENOUGH PERSONS' : 'UNCLAIMED'),
        };
      })();

      /* 21. Don't Worry: a textarea that only ever reassures */
      (() => {
        const b = blockEl(21);
        const area = b.querySelector('.nq-area');
        const calm = b.querySelector('.nq-calm');
        let deb = 0, k = 0, lastI = -1;
        area.addEventListener('input', () => {
          snd.clack();
          done(21, area.value.trim().length > 0);
          stopTimer(deb);
          deb = later(() => {
            if (!area.value.trim()) { calm.textContent = ''; return; }
            let i;
            do { i = Math.floor(Math.random() * CALM.length); } while (i === lastI);
            lastI = i;
            k++;
            calm.textContent = CALM[i];
            calm.classList.remove('is-new'); void calm.offsetWidth; calm.classList.add('is-new');
            if (snd.on) { snd.t({ freq: 523.25, type: 'sine', dur: 0.9, gain: 0.03, attack: 0.08, release: 0.8 }); snd.t({ freq: 659.25, type: 'sine', dur: 0.9, gain: 0.025, attack: 0.12, release: 0.8 }); }
          }, 750);
        });
        Q[21] = { sum: () => (k ? 'REASSURED ×' + k : area.value.trim() ? 'WRITTEN, UNREAD' : 'NOTHING TO WORRY ABOUT') };
      })();

      /* 22. Guys: a signature box that gathers witnesses */
      (() => {
        const b = blockEl(22);
        const cv = b.querySelector('.nq-sig-c');
        const g = cv.getContext('2d');
        const cos = [...b.querySelectorAll('.nq-co')];
        let w = 0, h = 0, ink = 0, last = null, down = false, lastS = 0;
        const size = () => {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          w = cv.clientWidth || 400;
          h = cv.clientHeight || 120;
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.strokeStyle = '#0a0a0a';
          g.lineCap = 'round';
          g.lineJoin = 'round';
        };
        const local = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; };
        const line = (a, c) => {
          const d = Math.hypot(c[0] - a[0], c[1] - a[1]);
          g.lineWidth = clamp(3.4 - d * 0.08, 1.4, 3.4);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke();
          ink += d;
          const now = performance.now();
          if (now - lastS > 70 && d > 2) { lastS = now; snd.n({ dur: 0.07, gain: 0.025, type: 'bandpass', freq: 2600, q: 2 }); }
          if (ink > 140 && !S.signed) signed();
        };
        cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); last = local(e); line(last, [last[0] + 0.5, last[1]]); });
        cv.addEventListener('pointermove', (e) => { if (!down) return; const p = local(e); line(last, p); last = p; });
        const up = () => { down = false; last = null; };
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        b.querySelector('.nq-signme').addEventListener('click', () => {
          const d = squiggle(w * 0.08, h * 0.62, w * 0.62, h * 0.32);
          try { g.lineWidth = 2.6; g.stroke(new Path2D(d)); } catch (e) { /* old browser */ }
          ink += 400;
          snd.marker();
          if (!S.signed) signed();
        });
        b.querySelector('.nq-clear').addEventListener('click', () => {
          g.clearRect(0, 0, w, h);
          ink = 0;
          S.signed = false;
          b.classList.remove('is-signed');
          cos.forEach((c) => { c.classList.remove('is-on'); c.querySelector('path').removeAttribute('d'); });
          b.querySelectorAll('.noacf-stamp').forEach((s) => s.remove());
          snd.paper(0.06);
          done(22, false);
        });
        const signed = () => {
          S.signed = true;
          b.classList.add('is-signed');
          done(22);
          cosignNames();
          cos.forEach((c, i) => later(() => {
            c.querySelector('path').setAttribute('d', squiggle(10, 34, 170, 22));
            c.classList.add('is-on');
            snd.marker();
          }, 500 + i * 650));
          const ret = b.querySelector('.is-returned');
          if (ret) ret.remove();
        };
        size();
        Q[22] = { sum: () => (S.signed ? 'SIGNED, 3 WITNESSES' : 'UNSIGNED'), resize: size };
      })();

      /* office index: each cell takes you to its item */
      sheet.querySelectorAll('.noacf-cell').forEach((c) => c.addEventListener('click', () => goTo(+c.dataset.go)));
      /* go-to instructions anywhere on the form */
      sheet.addEventListener('click', (e) => {
        const g = e.target.closest('.nq-goto');
        if (!g || !g.dataset.to) return;
        const from = +g.closest('.nq').dataset.n;
        goTo(+g.dataset.to, from);
      });
      sheet.querySelector('.noacf-submit').addEventListener('click', submit);
    }

    snd.chirpShort = function () {
      if (!this.on) return;
      this.t({ freq: 1300, type: 'square', dur: 0.06, gain: 0.015 });
      this.t({ freq: 2100, type: 'square', dur: 0.06, gain: 0.015, when: 0.07 });
      for (let i = 0; i < 4; i++) this.matrix(0.15 + i * 0.16);
    };

    function squiggle(x0, y0, wd, amp) {
      let d = 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1);
      let x = x0;
      const loops = 4 + Math.floor(Math.random() * 3);
      const stepW = wd / loops;
      for (let i = 0; i < loops; i++) {
        const a = amp * rnd(0.5, 1.1);
        d += ' C' + (x + stepW * 0.2).toFixed(1) + ' ' + (y0 - a).toFixed(1) + ' ' + (x + stepW * 0.9).toFixed(1) + ' ' + (y0 - a).toFixed(1) +
          ' ' + (x + stepW * 0.5).toFixed(1) + ' ' + (y0 + rnd(-2, 6)).toFixed(1);
        x += stepW;
      }
      d += ' Q' + (x + stepW * 0.4).toFixed(1) + ' ' + (y0 + amp * 0.4).toFixed(1) + ' ' + (x + stepW).toFixed(1) + ' ' + (y0 - amp * 0.2).toFixed(1);
      return d;
    }

    function cosignNames() {
      const b = blockEl(22);
      if (!b) return;
      const names = S.together ? [S.you, 'a friend', 'the other one'] : ['a friend', 'another friend', 'the other one'];
      b.querySelectorAll('.nq-co span').forEach((s, i) => { s.textContent = 'witness: ' + names[i]; });
    }

    function peopleChanged() {
      if (Q[6]) Q[6].guests();
      const b = blockEl(20);
      if (b) b.classList.toggle('is-na', S.people < 2);
    }

    function flagWorry() {
      const b = blockEl(21);
      if (!b) return;
      b.classList.toggle('is-flagged', S.flagged);
      b.querySelector('.nq-from4').hidden = !S.flagged;
    }

    /* -------------------------------------------------------------- submit and receipt */

    function submit() {
      if (S.received) { showReceipt(); return; }
      if (!S.signed) {
        const b = blockEl(22);
        b.querySelectorAll('.is-returned').forEach((s) => s.remove());
        goTo(22);
        later(() => stamp(b, 'Returned: unsigned', { cls: 'is-returned', x: 50, y: 44, r: -7, big: true }), reduced() ? 0 : 650);
        return;
      }
      S.received = true;
      const top = sheet.querySelector('.noacf-top');
      stamp(top, 'Received', { cls: 'is-received', x: 64, y: 40, r: -14, big: true });
      faxU.textContent = 'RECEIVED';
      sheet.querySelector('.noacf-submit').textContent = 'View receipt';
      snd.chirp();
      later(showReceipt, 500);
    }

    let receiptTimers = [];
    function showReceipt() {
      receiptTimers.forEach(stopTimer);
      receiptTimers = [];
      const now = new Date();
      const k = Object.keys(S.done).filter((n) => S.done[n]).length;
      const rows = T.map((t) => '<li><span class="r-n">' + pad(t.n) + '</span><span class="r-t">' + esc(t.title.toUpperCase()) + '</span><span class="r-v">' + esc(Q[t.n] ? Q[t.n].sum() : '') + '</span></li>').join('');
      printer.innerHTML =
        '<div class="noacf-slot" aria-hidden="true"></div>' +
        '<div class="noacf-receipt" role="dialog" aria-label="Receipt for form NOAC-22">' +
          '<div class="noacf-rc-in">' +
          '<p class="r-h">RECEIPT<br>FORM NOAC-22, NOTES ON A CONDITIONAL FORM</p>' +
          '<p class="r-d">' + pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + '  ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '  ITEMS ' + k + '/22</p>' +
          '<ol class="r-list">' + rows + '</ol>' +
          '<p class="r-f">THANK YOU. NOTHING FURTHER IS REQUIRED.<br>KEEP THIS SLIP. OR DON’T.</p>' +
          '<div class="r-stamp"></div>' +
          '<div class="r-btns"><button type="button" class="nq-btn r-keep">File it</button><button type="button" class="nq-btn r-new">Start a new form</button></div>' +
          '</div>' +
        '</div>';
      printer.hidden = false;
      const rc = printer.querySelector('.noacf-receipt');
      const lis = [...printer.querySelectorAll('.r-list li, .r-f')];
      if (reduced()) {
        lis.forEach((l) => l.classList.add('is-in'));
        printer.classList.add('is-open');
        stamp(printer.querySelector('.r-stamp'), 'Received', { x: 50, y: 50, r: -9, big: true });
      } else {
        printer.classList.remove('is-open');
        void printer.offsetWidth;
        printer.classList.add('is-open');
        lis.forEach((l, i) => receiptTimers.push(later(() => { l.classList.add('is-in'); snd.matrix(); }, 500 + i * 85)));
        receiptTimers.push(later(() => stamp(printer.querySelector('.r-stamp'), 'Received', { x: 50, y: 50, r: -9, big: true }), 600 + lis.length * 85));
      }
      printer.querySelector('.r-keep').addEventListener('click', closeReceipt);
      printer.querySelector('.r-new').addEventListener('click', () => { closeReceipt(); restart(); });
      later(() => { const btn = printer.querySelector('.r-keep'); if (btn) btn.focus({ preventScroll: true }); }, 50);
      rc.scrollTop = 0;
    }
    function closeReceipt() {
      receiptTimers.forEach(stopTimer);
      receiptTimers = [];
      printer.classList.remove('is-open');
      printer.hidden = true;
      printer.textContent = '';
      snd.paper(0.08);
      const s = sheet.querySelector('.noacf-submit');
      if (s) s.focus({ preventScroll: true });
    }

    /* -------------------------------------------------------------- building / rebuilding */

    function build() {
      formTimers.forEach((id) => { clearTimeout(id); clearInterval(id); });
      formTimers = new Set();
      rafs.forEach((id) => cancelAnimationFrame(id));
      rafs = new Set();
      S = fresh();
      root.classList.remove('is-urgent');
      faxU.textContent = 'PRIORITY NORMAL';
      sheet.innerHTML = html();
      wire();
      peopleChanged();
      Q[6].guests();
      cosignNames();
      office();
      measure();
    }

    function restart() {
      build();
      glideTo(home().x, home().y);
      snd.paper(0.12);
    }

    /* -------------------------------------------------------------- moving the paper */

    const FAX = 52;
    const BASE = -0.35;
    const cam = { x: 0, y: 0, r: BASE, jr: 0, sx: 0, sy: 0 };
    const vel = { x: 0, y: 0 };
    let vw = 0, vh = 0, W = 0, H = 0;
    let drag = null, glide = null, loopId = 0, lastT = 0, travelled = 0;
    let contact = { x: 0.25, y: 0 };
    let curPage = 1;

    function measure() {
      vw = view.clientWidth;
      vh = view.clientHeight;
      W = sheet.offsetWidth;
      H = sheet.offsetHeight;
      const form = sheet.querySelector('.noacf-form');
      const fy = form ? form.offsetTop : 0;
      blockTops = [...sheet.querySelectorAll('.nq')].map((b) => ({ n: +b.dataset.n, y: fy + b.offsetTop + b.offsetHeight / 2 }));
    }
    function bounds() {
      const top = FAX + 22;
      let minX, maxX;
      if (W + 24 <= vw) { minX = maxX = Math.round((vw - W) / 2); } else { minX = vw - W - 8; maxX = 8; }
      const minY = Math.min(top, vh - H - 48);
      return { minX, maxX, minY, maxY: top };
    }
    function home() { const b = bounds(); return { x: b.maxX === b.minX ? b.minX : b.maxX, y: b.maxY }; }

    function apply() {
      const ox = vw / 2 - cam.x, oy = vh / 2 - cam.y;
      stack.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px';
      stack.style.transform = 'translate3d(' + cam.x.toFixed(2) + 'px,' + cam.y.toFixed(2) + 'px,0) rotate(' + (cam.r + cam.jr).toFixed(3) + 'deg)';
    }

    function pageCounter() {
      const cy = vh * 0.45 - cam.y;
      let best = 1, bd = Infinity;
      for (const b of blockTops) { const d = Math.abs(b.y - cy); if (d < bd) { bd = d; best = b.n; } }
      if (cam.y > FAX - 40) best = 1;
      if (best !== curPage) { curPage = best; faxP.textContent = 'P.' + pad(best) + '/22'; }
    }

    function wake() { if (!loopId) { lastT = performance.now(); loopId = requestAnimationFrame(loop); } }

    function loop(t) {
      loopId = 0;
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
      lastT = t;
      const px = cam.x, py = cam.y;
      const b = bounds();
      const rm = reduced();

      if (glide) {
        const k = rm ? 1 : 1 - Math.exp(-dt * 5.5);
        cam.x += (glide.x - cam.x) * k;
        cam.y += (glide.y - cam.y) * k;
        if (Math.abs(glide.x - cam.x) < 0.5 && Math.abs(glide.y - cam.y) < 0.5) { cam.x = glide.x; cam.y = glide.y; glide = null; }
      } else if (!drag) {
        if (!rm) { cam.x += vel.x * dt; cam.y += vel.y * dt; }
        const fr = Math.pow(0.02, dt);
        vel.x *= fr; vel.y *= fr;
        const sp = 1 - Math.exp(-dt * 11);
        if (cam.x < b.minX) { cam.x += (b.minX - cam.x) * sp; vel.x *= 0.6; }
        if (cam.x > b.maxX) { cam.x += (b.maxX - cam.x) * sp; vel.x *= 0.6; }
        if (cam.y < b.minY) { cam.y += (b.minY - cam.y) * sp; vel.y *= 0.6; }
        if (cam.y > b.maxY) { cam.y += (b.maxY - cam.y) * sp; vel.y *= 0.6; }
        if (Math.abs(vel.x) < 4) vel.x = 0;
        if (Math.abs(vel.y) < 4) vel.y = 0;
      }

      // the sheet turns a little when pushed off-centre, like paper on a desk
      const mx = (cam.x - px) / dt, my = (cam.y - py) / dt;
      cam.sx += (mx - cam.sx) * 0.2;
      cam.sy += (my - cam.sy) * 0.2;
      const gx = contact.x * vw * 0.5, gy = contact.y * vh * 0.5;
      const target = rm ? 0 : BASE + clamp((gx * cam.sy - gy * cam.sx) * 2.6e-6, -2.6, 2.6);
      cam.r += (target - cam.r) * (1 - Math.exp(-dt * 7));
      cam.jr *= Math.exp(-dt * 9);
      if (rm) { cam.r = 0; cam.jr = 0; }

      const moved = Math.hypot(cam.x - px, cam.y - py);
      travelled += moved;
      if (travelled > 190) { travelled = 0; snd.paper(clamp(Math.hypot(cam.sx, cam.sy) / 30000, 0.015, 0.07)); }

      apply();
      pageCounter();

      const busy = drag || glide || vel.x || vel.y || moved > 0.05 || Math.abs(cam.r - target) > 0.004 || Math.abs(cam.jr) > 0.004 ||
        cam.x < b.minX - 0.5 || cam.x > b.maxX + 0.5 || cam.y < b.minY - 0.5 || cam.y > b.maxY + 0.5;
      if (busy) loopId = requestAnimationFrame(loop);
      else { cam.sx = 0; cam.sy = 0; }
    }

    function jolt(k) {
      if (reduced()) return;
      cam.jr += rnd(-0.5, 0.5) * k;
      wake();
    }

    function glideTo(x, y) {
      const b = bounds();
      glide = { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
      vel.x = vel.y = 0;
      contact = { x: 0.5, y: 0 };
      wake();
    }

    function goTo(n, from) {
      const b = blockEl(n);
      if (!b) return;
      const r = b.getBoundingClientRect();
      const want = FAX + 40;
      glideTo(cam.x, cam.y + (want - r.top));
      snd.paper(0.1);
      if (from) {
        b.querySelectorAll('.nq-arrival').forEach((a) => a.remove());
        const a = document.createElement('p');
        a.className = 'nq-arrival nq-marker';
        a.innerHTML = 'sent here by ' + from + ' <button type="button" class="nq-goto" data-to="' + from + '">back to ' + from + '</button>';
        b.appendChild(a);
      }
      later(() => {
        const f = b.querySelector('input, textarea, button:not(.nq-goto), [tabindex="0"]');
        if (f) f.focus({ preventScroll: true });
      }, reduced() ? 0 : 500);
    }

    /* input: push the paper */
    const NOPAN = 'input, textarea, button, select, a, label, canvas, [role="slider"], [role="button"], .nq-shyzone, .noacf-receipt';
    on(view, 'pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest(NOPAN)) return;
      glide = null;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      vel.x = vel.y = 0;
      contact = { x: (e.clientX - vw / 2) / (vw / 2), y: (e.clientY - vh / 2) / (vh / 2) };
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      root.classList.add('is-dragging');
      snd.paper(0.05);
      wake();
    });
    on(view, 'pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const now = performance.now();
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const dt = Math.max(1, now - drag.t) / 1000;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      const b = bounds();
      const rx = cam.x < b.minX || cam.x > b.maxX ? 0.35 : 1;
      const ry = cam.y < b.minY || cam.y > b.maxY ? 0.35 : 1;
      cam.x += dx * rx;
      cam.y += dy * ry;
      vel.x = vel.x * 0.6 + (dx / dt) * 0.4;
      vel.y = vel.y * 0.6 + (dy / dt) * 0.4;
      contact = { x: (e.clientX - vw / 2) / (vw / 2), y: (e.clientY - vh / 2) / (vh / 2) };
      wake();
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (performance.now() - drag.t > 90) { vel.x = 0; vel.y = 0; }
      vel.x = clamp(vel.x, -3200, 3200);
      vel.y = clamp(vel.y, -3200, 3200);
      drag = null;
      root.classList.remove('is-dragging');
      wake();
    };
    on(view, 'pointerup', endDrag);
    on(view, 'pointercancel', endDrag);
    on(view, 'lostpointercapture', endDrag);

    on(view, 'wheel', (e) => {
      if (e.target.closest('.noacf-receipt')) return;
      if (e.target.closest('textarea') && e.target.scrollHeight > e.target.clientHeight) return;
      e.preventDefault();
      if (e.ctrlKey) return;
      const unit = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? vh : 1;
      let dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      glide = null;
      const b = bounds();
      const ry = cam.y < b.minY || cam.y > b.maxY ? 0.3 : 1;
      cam.y -= clamp(dy, -240, 240) * ry;
      if (b.minX !== b.maxX) cam.x -= clamp(dx, -240, 240);
      contact = { x: (e.clientX - vw / 2) / (vw / 2), y: (e.clientY - vh / 2) / (vh / 2) };
      wake();
    }, { passive: false });

    on(view, 'scroll', () => { if (view.scrollTop || view.scrollLeft) { view.scrollTop = 0; view.scrollLeft = 0; } });

    // keep whatever has keyboard focus on screen
    on(sheet, 'focusin', (e) => {
      const r = e.target.getBoundingClientRect();
      if (r.top >= FAX + 16 && r.bottom <= vh - 16 && r.left >= 0 && r.right <= vw) return;
      const cy = r.top + r.height / 2, cx = r.left + r.width / 2;
      const b = bounds();
      glideTo(b.minX === b.maxX ? cam.x : cam.x + (vw / 2 - cx), cam.y + (vh * 0.48 - cy));
    });

    on(window, 'keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!printer.hidden) {
        if (e.key === 'Escape') { e.preventDefault(); closeReceipt(); }
        return;
      }
      const a = document.activeElement;
      const typing = a && a !== document.body && a.closest && a.closest('input, textarea, [role="slider"], .nq-drum');
      if (typing) return;
      const onButton = a && a.closest && a.closest('button, [role="button"], canvas');
      let d = 0;
      if (e.key === 'ArrowDown') d = 90;
      else if (e.key === 'ArrowUp') d = -90;
      else if (e.key === 'PageDown' || (e.key === ' ' && !onButton)) d = vh * 0.8;
      else if (e.key === 'PageUp') d = -vh * 0.8;
      else if (e.key === 'Home') { e.preventDefault(); glideTo(home().x, home().y); return; }
      else if (e.key === 'End') { e.preventDefault(); glideTo(cam.x, bounds().minY); return; }
      if (!d) return;
      e.preventDefault();
      const tgt = glide ? glide.y : cam.y;
      glideTo(cam.x, tgt - d);
    }, true);

    let resizeT = 0;
    on(window, 'resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        viewTimers.delete(resizeT);
        measure();
        const b = bounds();
        cam.x = clamp(cam.x, b.minX, b.maxX);
        cam.y = clamp(cam.y, b.minY, b.maxY);
        apply();
        wake();
      }, 120);
      viewTimers.add(resizeT);
    });

    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { measure(); wake(); });
      ro.observe(sheet);
    }

    /* -------------------------------------------------------------- go */

    build();
    const h0 = home();
    cam.x = h0.x;
    cam.y = h0.y;
    if (reduced()) cam.r = 0;
    apply();

    return {
      destroy() {
        offs.forEach((f) => f());
        offs.length = 0;
        formTimers.forEach((id) => { clearTimeout(id); clearInterval(id); });
        formTimers.clear();
        viewTimers.forEach((id) => clearTimeout(id));
        viewTimers.clear();
        clearTimeout(resizeT);
        rafs.forEach((id) => cancelAnimationFrame(id));
        rafs.clear();
        if (loopId) cancelAnimationFrame(loopId);
        loopId = 0;
        if (ro) ro.disconnect();
        try { unsubAudio(); } catch (e) { /* gone */ }
        stopHum();
        root.textContent = '';
      },
    };
  }
})();
