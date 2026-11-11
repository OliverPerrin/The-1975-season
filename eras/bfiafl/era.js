/* Being Funny in a Foreign Language (2022).
   A house built on a stage, seen in cross-section, printed in silver gelatin.
   The visitor holds the follow spot. Eleven things in the house are eleven cues;
   light one and it stays lit, until the whole set is up. */
(function () {
  'use strict';

  const ID = 'bfiafl';
  const VW = 1600;
  const VH = 1000;
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* seeded random so the drawing is the same every visit */
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  /* ------------------------------------------------------------------ */
  /* the eleven cues                                                     */
  /* ------------------------------------------------------------------ */

  /* cx, cy: where the follow spot has to rest to wake it. r: how close.
     hit: [x, y, w, h] for the button. tape: where its spike tape goes. */
  const CUES = [
    { n: 1, key: 'ghost', cx: 166, cy: 820, r: 70, hit: [112, 730, 108, 262], tape: [176, 962, -2] },
    { n: 2, key: 'record', cx: 622, cy: 800, r: 72, hit: [550, 760, 146, 130], tape: [624, 899, 1.2] },
    { n: 3, key: 'lamp', cx: 650, cy: 410, r: 66, hit: [600, 326, 92, 152], tape: [540, 285, -1] },
    { n: 4, key: 'guitar', cx: 1226, cy: 470, r: 70, hit: [1188, 366, 76, 194], tape: [1150, 285, 1.5] },
    { n: 5, key: 'phone', cx: 764, cy: 832, r: 60, hit: [718, 744, 92, 146], tape: [792, 899, -1.6] },
    { n: 6, key: 'piano', cx: 1050, cy: 460, r: 88, hit: [952, 340, 200, 220], tape: [1052, 571, -0.8] },
    { n: 7, key: 'radio', cx: 1246, cy: 694, r: 58, hit: [1198, 650, 100, 76], tape: [1236, 637, 1] },
    { n: 8, key: 'window', cx: 390, cy: 372, r: 76, hit: [300, 296, 182, 150], tape: [382, 571, 1.3] },
    { n: 9, key: 'mirror', cx: 815, cy: 400, r: 70, hit: [756, 300, 118, 260], tape: [816, 571, -1.2] },
    { n: 10, key: 'tv', cx: 330, cy: 808, r: 66, hit: [280, 714, 102, 176], tape: [330, 899, 0.8] },
    { n: 11, key: 'table', cx: 1100, cy: 780, r: 96, hit: [962, 680, 236, 210], tape: [1094, 899, -0.6] },
  ];

  /* ------------------------------------------------------------------ */
  /* drawing the set                                                     */
  /* ------------------------------------------------------------------ */

  const OL = '#211e1b'; // outline

  function defs() {
    return `<defs>
  <linearGradient id="bf-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080706"/><stop offset="1" stop-color="#1b1917"/></linearGradient>
  <linearGradient id="bf-velvetG" x1="0" x2="1"><stop offset="0" stop-color="#090807"/><stop offset=".42" stop-color="#26231f"/><stop offset=".78" stop-color="#0c0b0a"/><stop offset="1" stop-color="#151311"/></linearGradient>
  <pattern id="bf-velvet" width="28" height="1000" patternUnits="userSpaceOnUse"><rect width="28" height="1000" fill="url(#bf-velvetG)"/></pattern>
  <pattern id="bf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#d3cdc3"/><rect width="2.2" height="8" fill="#b7b0a6"/></pattern>
  <pattern id="bf-stripe" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#8f8981"/><rect width="6" height="18" fill="#857f78"/><rect x="11" width="1.2" height="18" fill="#9a948c"/></pattern>
  <pattern id="bf-sprig" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#7e7973"/><path d="M8 4 l2 4 l-2 4 l-2 -4z" fill="#8c867f"/><path d="M23 19 l2 4 l-2 4 l-2 -4z" fill="#8c867f"/><circle cx="23" cy="8" r="1.2" fill="#74706a"/><circle cx="8" cy="23" r="1.2" fill="#74706a"/></pattern>
  <pattern id="bf-tile" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#b9b3aa"/><path d="M0 .6H20M.6 0V20" stroke="#a09a91" stroke-width="1.2"/></pattern>
  <pattern id="bf-panel" width="34" height="300" patternUnits="userSpaceOnUse"><rect width="34" height="300" fill="#6c665f"/><rect width="1.5" height="300" fill="#5a554f"/><rect x="2" width="1" height="300" fill="#78726b"/></pattern>
  <pattern id="bf-cloth" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#4f4a45"/><rect width="2" height="2" fill="#5f5a54"/><rect x="2" y="2" width="2" height="2" fill="#5f5a54"/></pattern>
  <pattern id="bf-brick" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#4c4743"/><path d="M0 .5H24M.5 0V6M12.5 6V12M0 6.5H24" stroke="#38342f" stroke-width="1"/></pattern>
  <pattern id="bf-scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".22"/></pattern>
  <radialGradient id="bf-shade" cx=".5" cy=".42" r=".72"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
  <linearGradient id="bf-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="bf-floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3733"/><stop offset="1" stop-color="#57524c"/></linearGradient>
  <linearGradient id="bf-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a09"/><stop offset="1" stop-color="#2c2926"/></linearGradient>
  <linearGradient id="bf-snowsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d877f"/><stop offset="1" stop-color="#c9c3b9"/></linearGradient>
  <linearGradient id="bf-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a59f97"/><stop offset=".55" stop-color="#6d6862"/><stop offset="1" stop-color="#8e8880"/></linearGradient>
  <linearGradient id="bf-tvsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2ddd4"/><stop offset="1" stop-color="#9c968e"/></linearGradient>
  <linearGradient id="bf-screenOff" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4641"/><stop offset="1" stop-color="#1e1c1a"/></linearGradient>
  <radialGradient id="bf-frost" cx="0" cy="0" r="1"><stop offset="0" stop-color="#f3efe8" stop-opacity=".95"/><stop offset="1" stop-color="#f3efe8" stop-opacity="0"/></radialGradient>
  <radialGradient id="bf-bulbG" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#e7dfd1"/></radialGradient>
  <filter id="bf-shadowF" x="-40%" y="-40%" width="180%" height="180%"><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .62 0"/><feGaussianBlur stdDeviation="5"/></filter>
  <clipPath id="bf-winclip"><rect x="334" y="316" width="112" height="108"/></clipPath>
  <clipPath id="bf-mirclip"><ellipse cx="815" cy="384" rx="37" ry="49"/></clipPath>
  <clipPath id="bf-tvclip"><rect x="298" y="778" width="52" height="54" rx="9"/></clipPath>
</defs>`;
  }

  function stage() {
    const p = [];
    p.push('<rect width="1600" height="1000" fill="url(#bf-back)"/>');
    // upstage: a faint cyclorama glow behind the house so the roofline reads
    p.push('<ellipse cx="800" cy="520" rx="760" ry="420" fill="#2a2724" opacity=".35"/>');
    // floor
    p.push('<rect x="0" y="905" width="1600" height="95" fill="url(#bf-floorG)"/>');
    let lines = '';
    for (let i = -22; i <= 22; i++) {
      lines += `M${(800 + i * 44).toFixed(1)} 905 L${(800 + i * 58).toFixed(1)} 1000 `;
    }
    p.push(`<path d="${lines}" stroke="#2f2b28" stroke-width="1.3" fill="none"/>`);
    p.push('<path d="M0 934H1600M0 968H1600" stroke="#2f2b28" stroke-width=".8" opacity=".6"/>');
    p.push('<rect x="0" y="992" width="1600" height="8" fill="#191715"/><path d="M0 992.5H1600" stroke="#8d867d" stroke-width="1.2"/>');
    // footlight hoods
    let hoods = '';
    for (let x = 60; x <= 1540; x += 74) {
      hoods += `<path d="M${x - 20} 1000 L${x - 16} 986 Q${x} 981 ${x + 16} 986 L${x + 20} 1000 Z"/>`;
    }
    p.push(`<g fill="#0f0e0d">${hoods}</g>`);
    // wing legs, velvet
    p.push('<rect x="0" y="0" width="74" height="992" fill="url(#bf-velvet)"/>');
    p.push('<rect x="1526" y="0" width="74" height="992" fill="url(#bf-velvet)"/>');
    // braces that hold the flats up, with stage weights
    p.push(`<g fill="#625c56" stroke="${OL}" stroke-width="1.5">
      <path d="M252 640 L258 646 L212 902 L203 902 Z"/><path d="M252 760 L256 766 L230 902 L222 902 Z"/>
      <path d="M1348 640 L1342 646 L1388 902 L1397 902 Z"/><path d="M1348 760 L1344 766 L1370 902 L1378 902 Z"/>
    </g>
    <g fill="#2c2926" stroke="${OL}" stroke-width="1.5"><rect x="190" y="889" width="44" height="15" rx="2"/><rect x="1366" y="889" width="44" height="15" rx="2"/></g>`);
    // road case and a coil of cable, stage right
    p.push(`<g stroke="${OL}" stroke-width="1.6">
      <rect x="1424" y="838" width="92" height="66" rx="3" fill="#3a3632"/>
      <rect x="1424" y="838" width="92" height="12" fill="#4a4540"/>
      <path d="M1424 850 h10 v-12 M1516 850 h-10 v-12 M1424 892 h10 v12 M1516 892 h-10 v12" fill="none" stroke="#9a948c"/>
      <rect x="1460" y="864" width="20" height="8" rx="2" fill="#77716a"/>
    </g>
    <g fill="none" stroke="#191715" stroke-width="3"><ellipse cx="1470" cy="950" rx="36" ry="9"/><ellipse cx="1472" cy="948" rx="30" ry="7"/><ellipse cx="1469" cy="951" rx="24" ry="5.5"/><path d="M1438 952 C1400 960 1380 940 1352 958"/></g>`);
    // spike tape hint, centre stage
    p.push(`<g transform="translate(800 953) rotate(-1.4)">
      <path d="M-122 -17 L118 -16 L121 -10 L117 -4 L122 3 L118 10 L121 17 L-120 16 L-123 9 L-119 2 L-124 -5 L-119 -11 Z" fill="#e2dcd0"/>
      <path d="M-122 -17 L118 -16" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
      <text class="bf-hint" x="0" y="9" text-anchor="middle">follow spot: you</text>
    </g>`);
    return p.join('');
  }

  function shell() {
    // rooms first, walls (cut sections) on top
    const p = [];
    // attic
    p.push(`<rect x="1112" y="96" width="48" height="84" fill="url(#bf-brick)" stroke="${OL}" stroke-width="1.5"/>
      <rect x="1106" y="90" width="60" height="8" fill="#3a3632" stroke="${OL}" stroke-width="1.5"/>
      <rect x="1118" y="76" width="13" height="15" fill="#5a554f" stroke="${OL}" stroke-width="1.5"/><rect x="1140" y="72" width="13" height="19" fill="#5a554f" stroke="${OL}" stroke-width="1.5"/>`);
    p.push('<path d="M226 262 L800 36 L1374 262 Z" fill="url(#bf-hatch)" stroke="#8f887e" stroke-width="1.5"/>');
    p.push('<path d="M276 252 L800 62 L1324 252 Z" fill="#3a3632"/>');
    p.push('<path d="M276 252 L800 62 L1324 252 Z" fill="url(#bf-shade)"/>');
    // rafters and collar
    p.push(`<g fill="#2b2825"><rect x="557" y="146" width="486" height="8"/>
      <path d="M430 196 L438 194 L438 252 L430 252Z"/><path d="M1162 194 L1170 196 L1170 252 L1162 252Z"/></g>`);
    // round attic window
    p.push(`<circle cx="800" cy="205" r="31" fill="#8a847d" stroke="${OL}" stroke-width="2"/>
      <circle cx="800" cy="205" r="24" fill="url(#bf-night)"/>
      <path d="M806 192 a12 12 0 1 0 6 20 a10 10 0 1 1 -6 -20z" fill="#b8b2a8" opacity=".55"/>
      <path d="M800 181V229M776 205H824" stroke="#8a847d" stroke-width="3"/>`);
    // boxes and a trunk
    p.push(`<g stroke="${OL}" stroke-width="1.5">
      <rect x="470" y="212" width="70" height="40" fill="#6a645e"/><path d="M470 222H540" stroke="#55504a"/><rect x="497" y="212" width="16" height="9" fill="#d6d0c6"/>
      <rect x="548" y="226" width="44" height="26" fill="#5c5751"/>
      <rect x="1010" y="214" width="100" height="38" rx="4" fill="#4a4540"/><path d="M1010 226H1110M1034 214V252M1086 214V252" stroke="#2b2825" stroke-width="2.5"/><rect x="1054" y="222" width="12" height="9" fill="#a9a399"/>
    </g>`);
    // attic bulb (comes on at the end)
    p.push(`<path d="M960 120 V164" stroke="#1a1816" stroke-width="1.5"/><rect x="956" y="162" width="8" height="8" fill="#3a3632"/>
      <circle class="bf-attic-bulb" cx="960" cy="176" r="7" fill="#8a847d" stroke="${OL}" stroke-width="1.2"/>`);

    // ----- ground floor rooms -----
    // living room
    p.push('<rect x="270" y="580" width="430" height="310" fill="url(#bf-stripe)"/>');
    p.push('<path d="M270 618H700" stroke="#5a554f" stroke-width="3"/>');
    p.push('<rect x="270" y="878" width="430" height="12" fill="#3b3733"/>');
    // hall
    p.push('<rect x="712" y="580" width="218" height="310" fill="#99938b"/>');
    p.push('<rect x="712" y="790" width="218" height="100" fill="#7b756f"/><path d="M712 790H930" stroke="#5e5953" stroke-width="4"/>');
    p.push('<g fill="none" stroke="#6a645e" stroke-width="2"><rect x="724" y="804" width="58" height="70"/><rect x="796" y="804" width="58" height="70"/><rect x="868" y="804" width="52" height="70"/></g>');
    p.push('<rect x="712" y="878" width="218" height="12" fill="#3b3733"/>');
    // kitchen
    p.push('<rect x="942" y="580" width="388" height="310" fill="#a49e96"/>');
    p.push('<rect x="1236" y="726" width="94" height="72" fill="url(#bf-tile)"/>');
    p.push('<rect x="942" y="878" width="388" height="12" fill="#3b3733"/>');
    // ----- first floor rooms -----
    p.push('<rect x="270" y="270" width="420" height="290" fill="url(#bf-sprig)"/>');
    p.push('<rect x="270" y="548" width="420" height="12" fill="#3b3733"/>');
    p.push('<rect x="702" y="270" width="228" height="290" fill="#aaa49c"/>');
    p.push('<rect x="702" y="446" width="228" height="114" fill="url(#bf-tile)"/>');
    p.push('<rect x="942" y="270" width="388" height="290" fill="url(#bf-panel)"/>');
    p.push('<path d="M942 418H1330" stroke="#4f4a45" stroke-width="3"/>');
    p.push('<rect x="942" y="548" width="388" height="12" fill="#2f2b28"/>');

    // wall furniture: frames, clock, shelf
    p.push(frame(436, 640, 86, 62) + frame(536, 652, 34, 44) + frame(604, 660, 62, 54));
    p.push(frame(1060, 318, 50, 50, true) + frame(1264, 340, 40, 52));
    p.push(frame(538, 330, 52, 46));
    p.push(`<g stroke="${OL}" stroke-width="2">
      <circle cx="992" cy="652" r="21" fill="#e2ddd4"/><circle cx="992" cy="652" r="21" fill="none" stroke="#2b2825" stroke-width="4"/>
      <path d="M992 652 L992 638 M992 652 L1002 657" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/>
    </g>`);
    p.push(`<g stroke="${OL}" stroke-width="1.5"><rect x="1178" y="720" width="150" height="7" fill="#3e3a36"/>
      <path d="M1190 727 v12 l10 -12 M1316 727 v12 l-10 -12" fill="#3e3a36"/>
      <rect x="1300" y="700" width="12" height="20" rx="2" fill="#bdb7ad"/><rect x="1314" y="706" width="10" height="14" rx="2" fill="#8a847d"/></g>`);
    // counter, sink, kettle
    p.push(`<g stroke="${OL}" stroke-width="1.6">
      <rect x="1236" y="802" width="94" height="88" fill="#4a4540"/>
      <rect x="1242" y="812" width="40" height="66" fill="#544e49"/><rect x="1288" y="812" width="38" height="66" fill="#544e49"/>
      <rect x="1230" y="796" width="100" height="8" fill="#8e877f"/>
      <path d="M1298 796 V776 Q1298 766 1308 766 Q1316 766 1316 774" fill="none" stroke="#bdb7ad" stroke-width="3"/>
      <path d="M1248 796 L1250 780 Q1262 772 1274 780 L1276 796 Z" fill="#cfc9bf"/><path d="M1250 784 q-8 -2 -8 -8" fill="none" stroke="#cfc9bf" stroke-width="2.5"/>
      <rect x="1257" y="772" width="10" height="4" fill="#2b2825"/>
    </g>`);
    // bathroom towel
    p.push(`<g stroke="${OL}" stroke-width="1.5"><path d="M872 420 H918" stroke="#bdb7ad" stroke-width="3"/>
      <path d="M878 421 H912 V478 H878 Z" fill="#cec8be"/><path d="M878 466H912M878 471H912" stroke="#8a847d" stroke-width="2"/></g>`);
    // bedroom: bed
    p.push(`<g stroke="${OL}" stroke-width="1.8">
      <path d="M282 560 V452 Q282 438 296 438 Q300 438 300 452 V560 Z" fill="#3a3632"/>
      <rect x="300" y="494" width="164" height="28" fill="#d6d0c6"/>
      <path d="M304 498 Q306 480 328 480 Q350 480 352 496 Z" fill="#ebe6dd"/>
      <path d="M344 492 Q400 486 466 492 L470 540 Q440 546 420 538 Q396 548 370 538 Q352 544 344 534 Z" fill="#6f6a64"/>
      <path d="M380 494 Q384 520 376 538 M424 492 Q430 516 420 538" fill="none" stroke="#5a554f" stroke-width="1.5"/>
      <path d="M460 560 V482 Q460 474 468 474 Q476 474 476 482 V560 Z" fill="#3a3632"/>
      <rect x="306" y="522" width="8" height="38" fill="#2b2825"/><rect x="446" y="540" width="8" height="20" fill="#2b2825"/>
    </g>`);
    // desk, books, chair
    p.push(`<g stroke="${OL}" stroke-width="1.6">
      <rect x="512" y="470" width="172" height="8" fill="#3e3a36"/>
      <rect x="518" y="478" width="8" height="82" fill="#3e3a36"/><rect x="670" y="478" width="8" height="82" fill="#3e3a36"/>
      <rect x="590" y="478" width="80" height="30" fill="#4a4540"/><rect x="622" y="488" width="16" height="4" rx="2" fill="#a9a399"/>
      <rect x="524" y="458" width="46" height="12" fill="#8a847d"/><rect x="528" y="447" width="40" height="11" fill="#5f5a54"/><rect x="522" y="440" width="44" height="7" fill="#bdb7ad"/>
      <path d="M584 470 V454 H596 V470 Z" fill="#d6d0c6"/><path d="M596 458 q7 0 7 6 q0 5 -7 5" fill="none"/>
      <path d="M540 560 V502 M540 516 H580 V560 M574 516 V560" fill="none" stroke="#2b2825" stroke-width="5"/>
      <path d="M540 500 V450" fill="none" stroke="#2b2825" stroke-width="5"/>
    </g>`);
    // music room: bench, amp is part of guitar cue
    p.push(`<g stroke="${OL}" stroke-width="1.6"><rect x="1006" y="514" width="94" height="10" fill="#2b2825"/>
      <rect x="1012" y="524" width="7" height="36" fill="#2b2825"/><rect x="1087" y="524" width="7" height="36" fill="#2b2825"/></g>`);
    // living room sofa
    p.push(`<g stroke="${OL}" stroke-width="1.8">
      <rect x="412" y="796" width="124" height="52" rx="10" fill="#69635d"/>
      <path d="M474 800 V846" stroke="#57524c" stroke-width="2"/>
      <rect x="412" y="842" width="124" height="26" rx="5" fill="#7a746d"/><path d="M474 842 V868" stroke="#5f5a54" stroke-width="1.5"/>
      <rect x="398" y="818" width="24" height="58" rx="10" fill="#5f5a54"/><rect x="526" y="818" width="24" height="58" rx="10" fill="#5f5a54"/>
      <rect x="404" y="866" width="140" height="14" fill="#4c4741"/>
      <rect x="412" y="880" width="6" height="10" fill="#2b2825"/><rect x="530" y="880" width="6" height="10" fill="#2b2825"/>
      <rect x="426" y="812" width="34" height="32" rx="6" fill="#aaa49b" transform="rotate(-9 443 828)"/>
    </g>`);
    // hall: sconce
    p.push(`<g stroke="${OL}" stroke-width="1.5"><rect x="733" y="752" width="5" height="16" fill="#3a3632"/>
      <path d="M736 762 h10 v-8" fill="none" stroke="#3a3632" stroke-width="3"/>
      <path class="bf-sconce" d="M738 756 L754 756 L750 740 L742 740 Z" fill="#cfc9bf"/></g>`);
    // stairs
    p.push(stairs());
    // room shading
    [[270, 580, 430, 310], [712, 580, 218, 310], [942, 580, 388, 310], [270, 270, 420, 290], [702, 270, 228, 290], [942, 270, 388, 290]].forEach(([x, y, w, h]) => {
      p.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#bf-shade)"/><rect x="${x}" y="${y}" width="${w}" height="40" fill="url(#bf-ceil)"/>`);
    });
    return p.join('');
  }

  function cutSections() {
    // the flats are cut open; their edges are raw ply
    return `<g fill="url(#bf-hatch)" stroke="#8f887e" stroke-width="1.2">
      <rect x="250" y="252" width="1100" height="18"/>
      <rect x="250" y="560" width="1100" height="20"/>
      <rect x="250" y="262" width="20" height="628"/><rect x="1330" y="262" width="20" height="628"/>
      <rect x="690" y="270" width="12" height="62"/><rect x="930" y="270" width="12" height="62"/>
      <rect x="700" y="580" width="12" height="70"/><rect x="930" y="580" width="12" height="70"/>
      <rect x="236" y="890" width="1128" height="16"/>
    </g>
    <g fill="#1d1b19"><rect x="690" y="332" width="3" height="228"/><rect x="699" y="332" width="3" height="228"/><rect x="930" y="332" width="3" height="228"/><rect x="939" y="332" width="3" height="228"/>
      <rect x="700" y="650" width="3" height="240"/><rect x="709" y="650" width="3" height="240"/><rect x="930" y="650" width="3" height="240"/><rect x="939" y="650" width="3" height="240"/></g>
    <path d="M236 905.5H1364" stroke="#2b2825" stroke-width="2"/>`;
  }

  function frame(x, y, w, h, record) {
    // a print in a frame, white mat, abstract grey picture (a horizon), never a real image
    const m = Math.max(5, Math.round(Math.min(w, h) * 0.16));
    const ix = x + m;
    const iy = y + m;
    const iw = w - m * 2;
    const ih = h - m * 2;
    const inner = record
      ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${iw / 2 - 1}" fill="#1a1816"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${iw / 6}" fill="#bdb7ad"/>`
      : `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#8b857e"/><rect x="${ix}" y="${iy + ih * 0.58}" width="${iw}" height="${ih * 0.42}" fill="#4f4a45"/><circle cx="${ix + iw * 0.68}" cy="${iy + ih * 0.42}" r="${Math.max(2, ih * 0.13)}" fill="#c9c3b9"/>`;
    return `<g stroke="${OL}" stroke-width="1.6"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2b2825"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="#e8e3da" stroke="none"/></g><g>${inner}</g>`;
  }

  function stairs() {
    // eleven steps, bottom right to top left
    const n = 11;
    const x0 = 930;
    const y0 = 890;
    const x1 = 714;
    const y1 = 588;
    const run = (x0 - x1) / n;
    const rise = (y0 - y1) / n;
    let d = `M${x0} ${y0}`;
    let nos = [];
    for (let i = 0; i < n; i++) {
      const x = x0 - i * run;
      const y = y0 - (i + 1) * rise;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)} L${(x - run).toFixed(1)} ${y.toFixed(1)}`;
      nos.push([x - run * 0.5, y]);
    }
    d += ` L${x1} ${y1 + 34} L${x0 - 26} ${y0} Z`;
    let bal = '';
    nos.forEach(([x, y]) => { bal += `M${x.toFixed(1)} ${y.toFixed(1)} V${(y - 66).toFixed(1)} `; });
    const [ax, ay] = nos[0];
    const [bx, by] = nos[n - 1];
    return `<path d="${d}" fill="#5d5852" stroke="${OL}" stroke-width="1.8"/>
      <path d="${bal}" stroke="#2b2825" stroke-width="3"/>
      <path d="M${(ax + 14).toFixed(1)} ${(ay - 74).toFixed(1)} L${(bx - 14).toFixed(1)} ${(by - 66 - rise * 0.6).toFixed(1)}" stroke="#2b2825" stroke-width="7" stroke-linecap="round"/>
      <rect x="914" y="790" width="14" height="100" fill="#3a3632" stroke="${OL}" stroke-width="1.6"/><rect x="911" y="782" width="20" height="10" rx="3" fill="#3a3632" stroke="${OL}" stroke-width="1.6"/>`;
  }

  /* each cue's art, in its own group so it can cast a shadow */
  function art(key) {
    switch (key) {
      case 'ghost': return `
        <path d="M166 944 L130 988 M166 944 L202 988 M166 944 L168 992" stroke="#3a3632" stroke-width="5" stroke-linecap="round"/>
        <circle cx="130" cy="989" r="4" fill="#191715"/><circle cx="202" cy="989" r="4" fill="#191715"/>
        <rect x="162" y="796" width="8" height="150" fill="#4a4540" stroke="${OL}" stroke-width="1.4"/>
        <rect x="158" y="786" width="16" height="12" fill="#2b2825" stroke="${OL}" stroke-width="1.4"/>
        <ellipse class="bf-bulb" cx="166" cy="766" rx="13" ry="17" fill="#8f897f" stroke="#2b2825" stroke-width="1.2"/>
        <path class="bf-filament" d="M161 772 q2.5 -10 5 0 q2.5 -10 5 0" fill="none" stroke="#5a554f" stroke-width="1.2"/>
        <g fill="none" stroke="#2b2825" stroke-width="2"><ellipse cx="166" cy="764" rx="19" ry="24"/><ellipse cx="166" cy="764" rx="8" ry="24"/><path d="M147 764 H185"/></g>`;
      case 'record': return `
        <g stroke="${OL}" stroke-width="1.6">
          <rect x="552" y="820" width="142" height="60" fill="#3e3a36"/>
          <rect x="560" y="828" width="60" height="44" fill="#47423d"/><rect x="626" y="828" width="60" height="44" fill="#47423d"/>
          <circle cx="614" cy="850" r="2.4" fill="#bdb7ad"/><circle cx="632" cy="850" r="2.4" fill="#bdb7ad"/>
          <rect x="558" y="880" width="6" height="10" fill="#2b2825"/><rect x="682" y="880" width="6" height="10" fill="#2b2825"/>
          <path d="M566 820 L560 816 H572 Z" fill="#2b2825"/>
          <rect x="565" y="790" width="3" height="28" fill="#2b2825"/>
          <path class="bf-shadelamp" d="M553 792 L580 792 L574 770 L559 770 Z" fill="#cfc9bf"/>
          <rect x="586" y="806" width="104" height="14" rx="2" fill="#2a2724"/>
          <path d="M588 819.5 H688" stroke="#7a746d" stroke-width="1.2"/>
          <ellipse cx="630" cy="805" rx="40" ry="8" fill="#141210"/>
        </g>
        <g transform="translate(630 804) scale(1 .2)"><g class="bf-spin">
          <circle r="37" fill="#191715"/>
          <circle r="31" fill="none" stroke="#33302c" stroke-width="2"/><circle r="24" fill="none" stroke="#33302c" stroke-width="2"/>
          <path d="M0 0 L36 -8 A37 37 0 0 1 36 8 Z" fill="#fff" opacity=".18"/>
          <path d="M0 0 L-36 8 A37 37 0 0 1 -36 -8 Z" fill="#fff" opacity=".12"/>
          <circle r="11" fill="#cbc5bb"/><circle cx="6" r="2.4" fill="#57524c"/>
        </g></g>
        <circle cx="676" cy="806" r="5" fill="#8a847d" stroke="${OL}" stroke-width="1.2"/>
        <g class="bf-tonearm"><path d="M676 806 L648 798" stroke="#cfc9bf" stroke-width="2.6" stroke-linecap="round"/><rect x="642" y="795" width="8" height="5" fill="#cfc9bf"/></g>`;
      case 'lamp': return `
        <g stroke="${OL}" stroke-width="1.5">
          <ellipse cx="655" cy="469" rx="16" ry="4" fill="#2f2b28"/><rect x="649" y="458" width="12" height="10" fill="#2f2b28"/>
        </g>
        <path d="M655 460 L622 400 M660 458 L627 398" stroke="#2f2b28" stroke-width="3" stroke-linecap="round"/>
        <path d="M640 432 l4 -3 l-2 6 l4 -3 l-2 6 l4 -3" fill="none" stroke="#8a847d" stroke-width="1.2"/>
        <path d="M622 400 L664 352 M627 404 L668 356" stroke="#2f2b28" stroke-width="3" stroke-linecap="round"/>
        <circle cx="624" cy="401" r="4" fill="#57524c" stroke="${OL}" stroke-width="1.2"/>
        <g class="bf-lamphead" transform="rotate(122 664 352)">
          <path d="M658 345 Q664 339 673 342 L702 333 Q709 352 702 371 L673 362 Q664 365 658 359 Z" fill="#2f2b28" stroke="${OL}" stroke-width="1.5"/>
          <ellipse class="bf-lampmouth" cx="702" cy="352" rx="4.5" ry="18.5" fill="#57524c"/>
          <circle cx="664" cy="352" r="4" fill="#57524c" stroke="${OL}" stroke-width="1.2"/>
        </g>`;
      case 'guitar': return `
        <path d="M1226 548 L1206 560 M1226 548 L1246 560 M1226 548 L1228 438 M1214 440 H1240" stroke="#191715" stroke-width="3" stroke-linecap="round"/>
        <g stroke="${OL}" stroke-width="1.6">
          <path d="M1226 478 C1240 478 1244 488 1242 498 C1240 506 1238 508 1242 514 C1250 524 1250 548 1226 550 C1202 548 1202 524 1210 514 C1214 508 1212 506 1210 498 C1208 488 1212 478 1226 478 Z" fill="#9c958c"/>
          <circle cx="1226" cy="506" r="6.5" fill="#191715"/>
          <rect x="1217" y="531" width="18" height="4" fill="#2b2825"/>
          <rect x="1222" y="394" width="8" height="86" fill="#3e3a36"/>
          <path d="M1220 394 L1218 372 Q1226 366 1234 372 L1232 394 Z" fill="#2b2825"/>
        </g>
        <path d="M1222 408H1230M1222 422H1230M1222 435H1230M1222 447H1230M1222 458H1230" stroke="#8a847d" stroke-width=".8"/>
        <g fill="#cfc9bf"><circle cx="1215" cy="378" r="2"/><circle cx="1215" cy="386" r="2"/><circle cx="1237" cy="378" r="2"/><circle cx="1237" cy="386" r="2"/></g>
        <g class="bf-strings" stroke="#efe9df" stroke-width=".7"><path d="M1223.5 394 V533M1225 394 V533M1226.5 394 V533M1228 394 V533"/></g>
        <g stroke="${OL}" stroke-width="1.6">
          <rect x="1262" y="504" width="58" height="56" rx="4" fill="#24211e"/>
          <rect x="1268" y="518" width="46" height="36" fill="url(#bf-cloth)"/>
          <rect x="1268" y="508" width="30" height="5" fill="#3a3632" stroke="none"/>
        </g>
        <circle class="bf-pilot" cx="1309" cy="511" r="2.6" fill="#57524c"/>
        <path d="M1290 270 V318" stroke="#1a1816" stroke-width="1.5"/><rect x="1285" y="316" width="10" height="10" fill="#2b2825"/>
        <circle class="bf-roombulb" cx="1290" cy="334" r="8.5" fill="#8a847d" stroke="${OL}" stroke-width="1.2"/>`;
      case 'phone': return `
        <g stroke="${OL}" stroke-width="1.6">
          <path d="M722 846 H806 Q806 852 800 852 H728 Q722 852 722 846 Z" fill="#3e3a36"/>
          <path d="M732 852 L730 890 M796 852 L798 890" stroke="#3e3a36" stroke-width="4"/>
          <path d="M734 874 H794" stroke="#3e3a36" stroke-width="3"/>
          <path d="M742 846 L746 824 Q764 818 782 824 L786 846 Z" fill="#1e1c1a"/>
          <ellipse cx="764" cy="836" rx="10" ry="6.5" fill="#d4cec5"/>
          <circle cx="764" cy="836" r="2.5" fill="#1e1c1a"/>
        </g>
        <path d="M786 838 c9 2 -3 8 6 10 s-3 8 6 10 s-3 8 6 10" fill="none" stroke="#1e1c1a" stroke-width="1.6"/>
        <g class="bf-handset"><path d="M738 822 Q740 812 750 813 H778 Q788 812 790 822 L785 825 Q782 819 776 820 H752 Q746 819 743 825 Z" fill="#1e1c1a" stroke="${OL}" stroke-width="1.4"/></g>
        <g class="bf-ringmarks" fill="none" stroke="#f1ebe0" stroke-width="2.2" stroke-linecap="round">
          <path d="M732 812 q-6 -4 -6 -11 M724 818 q-10 -6 -10 -18"/><path d="M796 812 q6 -4 6 -11 M804 818 q10 -6 10 -18"/>
        </g>`;
      case 'piano': {
        let keys = '';
        let blacks = '';
        const w = 170 / 21;
        for (let i = 0; i < 21; i++) {
          keys += `<rect class="bf-key" data-k="${i}" x="${(968 + i * w).toFixed(2)}" y="470" width="${(w - 0.6).toFixed(2)}" height="12" rx=".8"/>`;
          const pos = i % 7;
          if (i < 20 && (pos === 0 || pos === 1 || pos === 3 || pos === 4 || pos === 5)) {
            blacks += `<rect x="${(968 + (i + 1) * w - 2.6).toFixed(2)}" y="467" width="4.6" height="9"/>`;
          }
        }
        return `
        <g stroke="${OL}" stroke-width="1.6">
          <rect x="958" y="402" width="190" height="10" rx="2" fill="#1f1d1b"/>
          <rect x="962" y="412" width="182" height="148" fill="#2b2825"/>
          <rect x="976" y="420" width="154" height="40" fill="#34302c"/>
          <path d="M1036 440 L1080 436 L1082 462 L1038 464 Z" fill="#e3ded5"/>
          <rect x="958" y="482" width="190" height="9" fill="#1f1d1b"/>
          <rect x="976" y="496" width="154" height="44" fill="#34302c"/>
          <rect x="966" y="491" width="10" height="69" fill="#1f1d1b"/><rect x="1130" y="491" width="10" height="69" fill="#1f1d1b"/>
        </g>
        <path d="M1044 446 H1074 M1044 452 H1068 M1046 458 H1072" stroke="#8a847d" stroke-width="1"/>
        <g fill="#e6e1d8" stroke="#8a847d" stroke-width=".5">${keys}</g>
        <g fill="#141210">${blacks}</g>
        <g fill="#bdb7ad"><rect x="1046" y="552" width="6" height="4"/><rect x="1056" y="552" width="6" height="4"/></g>
        <path d="M982 402 h16 l-3 -4 h-10 z M990 398 V380" stroke="#8a847d" stroke-width="2" fill="#8a847d"/>
        <rect x="986" y="362" width="8" height="20" fill="#ebe6dd" stroke="${OL}" stroke-width="1"/>
        <path class="bf-flame" d="M990 343 Q996 352 993 358 Q990 362 987 358 Q984 352 990 343 Z" fill="#fffaf0"/>`;
      }
      case 'radio': return `
        <g stroke="${OL}" stroke-width="1.6">
          <path d="M1206 720 V690 Q1206 662 1246 660 Q1286 662 1286 690 V720 Z" fill="#4b4540"/>
          <path d="M1216 700 V692 Q1216 672 1246 670 Q1276 672 1276 692 V700 Z" fill="url(#bf-cloth)"/>
          <path d="M1236 700 V676 M1246 700 V671 M1256 700 V676" stroke="#2b2825" stroke-width="2.5"/>
          <path d="M1232 718 Q1232 706 1246 705 Q1260 706 1260 718 Z" class="bf-dial" fill="#2a2724"/>
          <circle cx="1222" cy="712" r="4" fill="#2b2825"/><circle cx="1270" cy="712" r="4" fill="#2b2825"/>
        </g>
        <path class="bf-needle" d="M1240 717 L1240 708" stroke="#191715" stroke-width="1.4"/>
        <g class="bf-waves" fill="none" stroke="#f1ebe0" stroke-width="2" stroke-linecap="round">
          <path d="M1196 680 q-8 12 0 24"/><path d="M1186 674 q-12 18 0 36"/><path d="M1296 680 q8 12 0 24"/><path d="M1306 674 q12 18 0 36"/>
        </g>`;
      case 'window': {
        const r = rng(8);
        let flakes = '';
        for (let i = 0; i < 46; i++) {
          const x = 334 + r() * 112;
          const y = 296 + r() * 120;
          const rad = 0.8 + r() * 1.7;
          const dur = 4 + r() * 6;
          flakes += `<circle cx="${x.toFixed(1)}" cy="${(y - 130).toFixed(1)}" r="${rad.toFixed(2)}" style="animation-duration:${dur.toFixed(2)}s;animation-delay:-${(r() * dur).toFixed(2)}s;--dx:${((r() - 0.5) * 18).toFixed(1)}px"/>`;
        }
        return `
        <path d="M300 298 H480" stroke="#2b2825" stroke-width="3" stroke-linecap="round"/>
        <g stroke="${OL}" stroke-width="1.6">
          <rect x="324" y="306" width="132" height="128" fill="#cfc9c0"/>
        </g>
        <g clip-path="url(#bf-winclip)">
          <rect x="334" y="316" width="112" height="108" fill="url(#bf-night)"/>
          <rect class="bf-snowsky" x="334" y="316" width="112" height="108" fill="url(#bf-snowsky)"/>
          <path d="M334 424 V398 h18 v-8 l12 -10 l12 10 v18 h10 v-14 h22 v6 l8 -8 l12 8 v-6 h6 v6 h12 v32 Z" fill="#141210"/>
          <path class="bf-roofsnow" d="M352 391 l12 -11 l12 11 Z M386 386 h22 v2 h-22Z M416 381 l8 -6 l8 6Z" fill="#eae5dc"/>
          <g class="bf-flakes" fill="#f6f2ea">${flakes}</g>
          <g class="bf-frosts"><circle cx="334" cy="316" r="34" fill="url(#bf-frost)"/><circle cx="446" cy="424" r="30" fill="url(#bf-frost)"/><circle cx="446" cy="316" r="22" fill="url(#bf-frost)"/><circle cx="334" cy="424" r="26" fill="url(#bf-frost)"/></g>
        </g>
        <path d="M390 316 V424 M334 370 H446" stroke="#cfc9c0" stroke-width="5"/>
        <rect x="318" y="434" width="144" height="8" fill="#bdb7ad" stroke="${OL}" stroke-width="1.5"/>
        <path class="bf-sillsnow" d="M320 434 q8 -7 20 -4 q14 -6 30 -2 q18 -6 34 -1 q16 -5 30 0 q14 -4 26 2 Z" fill="#f3efe8"/>
        <g stroke="${OL}" stroke-width="1.5">
          <path d="M300 300 H334 Q330 340 336 380 Q330 420 338 452 H302 Q296 410 302 372 Q296 336 300 300 Z" fill="#57524c"/>
          <path d="M446 300 H480 Q484 336 478 372 Q484 410 478 452 H442 Q450 420 444 380 Q450 340 446 300 Z" fill="#57524c"/>
        </g>
        <path d="M312 306 Q308 360 314 448 M322 306 Q318 380 324 448 M468 306 Q472 360 466 448 M458 306 Q462 380 456 448" fill="none" stroke="#45403b" stroke-width="1.5"/>`;
      }
      case 'mirror': return `
        <path d="M785 300 H845" stroke="#2b2825" stroke-width="4" stroke-linecap="round"/>
        <g class="bf-globes" stroke="${OL}" stroke-width="1.2" fill="#8a847d"><circle cx="795" cy="309" r="6"/><circle cx="815" cy="309" r="6"/><circle cx="835" cy="309" r="6"/></g>
        <ellipse cx="815" cy="384" rx="44" ry="56" fill="#8a847d" stroke="${OL}" stroke-width="1.8"/>
        <ellipse cx="815" cy="384" rx="37" ry="49" fill="url(#bf-glass)" stroke="${OL}" stroke-width="1"/>
        <g clip-path="url(#bf-mirclip)">
          <path d="M786 352 L806 340 L838 410 L818 422 Z" fill="#fff" opacity=".16"/>
          <ellipse class="bf-fog" cx="815" cy="384" rx="37" ry="49" fill="#dcd7ce"/>
          <path class="bf-heart" pathLength="1" d="M815 404 C800 392 794 384 796 374 C798 364 812 362 815 374 C818 362 832 364 834 374 C836 384 830 392 815 404 Z" fill="none" stroke="#6a655f" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g stroke="${OL}" stroke-width="1.6">
          <path d="M806 474 L800 558 H830 L824 474 Z" fill="#dcd7ce"/>
          <path d="M776 454 H854 Q852 476 815 478 Q778 476 776 454 Z" fill="#e6e1d8"/>
          <path d="M800 454 V444 h8 M830 454 V444 h-8" fill="none" stroke="#8a847d" stroke-width="2.5"/>
          <rect x="840" y="440" width="9" height="14" fill="#a9a399"/>
        </g>
        <path d="M842 440 l-2 -10 M846 440 l3 -9" stroke="#57524c" stroke-width="1.5"/>`;
      case 'tv': return `
        <g stroke="${OL}" stroke-width="1.6">
          <rect x="282" y="842" width="98" height="40" fill="#3a3632"/>
          <rect x="288" y="848" width="41" height="28" fill="#46413c"/><rect x="333" y="848" width="41" height="28" fill="#46413c"/>
          <rect x="286" y="882" width="6" height="8" fill="#2b2825"/><rect x="370" y="882" width="6" height="8" fill="#2b2825"/>
          <path d="M331 768 L306 722 M333 768 L356 718" stroke="#2b2825" stroke-width="1.8"/>
          <rect x="290" y="766" width="84" height="76" rx="9" fill="#2b2825"/>
          <rect x="298" y="778" width="52" height="54" rx="9" fill="url(#bf-screenOff)"/>
          <rect x="356" y="780" width="12" height="52" rx="2" fill="#24211e"/>
          <circle cx="362" cy="790" r="4" fill="#8a847d"/><circle cx="362" cy="804" r="4" fill="#8a847d"/>
        </g>
        <circle cx="306" cy="722" r="2.6" fill="#8a847d"/><circle cx="356" cy="718" r="2.6" fill="#8a847d"/>
        <path d="M358 814 H366 M358 819 H366 M358 824 H366" stroke="#57524c" stroke-width="1.4"/>
        <g clip-path="url(#bf-tvclip)">
          <g class="bf-tvon">
            <rect x="298" y="778" width="52" height="54" fill="url(#bf-tvsky)"/>
            <circle class="bf-tvsun" cx="322" cy="801" r="7" fill="#fbf7ef"/>
            <rect x="298" y="808" width="52" height="24" fill="#6f6a64"/>
            <path d="M302 814 h12 M320 818 h16 M306 823 h10 M330 826 h14" stroke="#a9a399" stroke-width="1.2"/>
            <rect class="bf-tvroll" x="298" y="772" width="52" height="8" fill="#fff" opacity=".18"/>
            <rect x="298" y="778" width="52" height="54" fill="url(#bf-scan)"/>
            <rect class="bf-tvstatic" x="298" y="778" width="52" height="54" fill="#cfc9bf"/>
          </g>
          <ellipse cx="312" cy="790" rx="14" ry="9" fill="#fff" opacity=".1"/>
        </g>`;
      case 'table': return `
        <path d="M1100 580 V690" stroke="#1a1816" stroke-width="1.6"/>
        <path d="M1072 712 Q1074 690 1100 688 Q1126 690 1128 712 Z" fill="#2a2724" stroke="${OL}" stroke-width="1.6"/>
        <ellipse class="bf-pendant" cx="1100" cy="713" rx="9" ry="4.5" fill="#8a847d"/>
        <g stroke="${OL}" stroke-width="1.6">
          <path d="M972 890 V770 M978 890 V770" stroke="#2b2825" stroke-width="5"/>
          <path d="M972 776 H980 M972 796 H980" stroke="#2b2825" stroke-width="3"/>
          <rect x="972" y="834" width="34" height="7" fill="#2b2825"/><path d="M1002 841 V890" stroke="#2b2825" stroke-width="5"/>
          <path d="M1228 890 V770 M1222 890 V770" stroke="#2b2825" stroke-width="5"/>
          <path d="M1220 776 H1228 M1220 796 H1228" stroke="#2b2825" stroke-width="3"/>
          <rect x="1194" y="834" width="34" height="7" fill="#2b2825"/><path d="M1198 841 V890" stroke="#2b2825" stroke-width="5"/>
          <rect x="1022" y="806" width="8" height="84" fill="#3e3a36"/><rect x="1170" y="806" width="8" height="84" fill="#3e3a36"/>
          <rect x="1008" y="798" width="184" height="8" fill="#3e3a36"/>
          <path d="M1006 800 H1194 V830 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-6 5 -12 0 Z" fill="#dcd6cb"/>
        </g>
        <g stroke="${OL}" stroke-width="1.2">
          <ellipse cx="1042" cy="798" rx="20" ry="3.6" fill="#f1ece4"/><ellipse cx="1158" cy="798" rx="20" ry="3.6" fill="#f1ece4"/>
          <g class="bf-cupL"><rect x="1062" y="784" width="13" height="14" rx="1.5" fill="#e3ded5"/><path d="M1062 788 q-6 0 -6 4 q0 4 6 4" fill="none" stroke-width="2"/></g>
          <g class="bf-cupR"><rect x="1125" y="784" width="13" height="14" rx="1.5" fill="#e3ded5"/><path d="M1138 788 q6 0 6 4 q0 4 -6 4" fill="none" stroke-width="2"/></g>
          <path d="M1088 798 h10 l-2 -4 h-6 z M1102 798 h10 l-2 -4 h-6 z" fill="#8a847d"/>
          <rect x="1090" y="768" width="6" height="26" fill="#ebe6dd"/><rect x="1104" y="774" width="6" height="20" fill="#ebe6dd"/>
        </g>
        <path class="bf-flame" d="M1093 752 Q1098 760 1096 765 Q1093 768 1090 765 Q1088 760 1093 752 Z" fill="#fffaf0"/>
        <path class="bf-flame bf-flame2" d="M1107 758 Q1112 766 1110 771 Q1107 774 1104 771 Q1102 766 1107 758 Z" fill="#fffaf0"/>
        <g class="bf-steam" fill="none" stroke="#ece6dc" stroke-width="1.6" stroke-linecap="round">
          <path d="M1066 780 q-4 -6 0 -12 q4 -6 0 -12"/><path d="M1072 780 q4 -6 0 -12 q-4 -6 0 -12"/>
          <path d="M1129 780 q-4 -6 0 -12 q4 -6 0 -12"/><path d="M1135 780 q4 -6 0 -12 q-4 -6 0 -12"/>
        </g>`;
    }
    return '';
  }

  function houseSVG() {
    const objs = CUES.map((c) =>
      `<use class="bf-shadow" href="#bf-art-${c.n}" filter="url(#bf-shadowF)" data-n="${c.n}"/>` +
      `<g class="bf-obj bf-obj--${c.key}" data-n="${c.n}"><g id="bf-art-${c.n}">${art(c.key)}</g></g>`
    ).join('');
    return `<svg class="bf-house" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none" aria-hidden="true">${defs()}${stage()}${shell()}${cutSections()}${objs}</svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* the room                                                            */
  /* ------------------------------------------------------------------ */

  let live = null;

  function createRoom(root, ctx) {
    const audio = ctx.audio;
    const tracks = ctx.tracks;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    let raf = 0;
    let dead = false;

    ctx.setChromeInk('#ebe6dd');

    /* ---------- DOM ---------- */
    root.innerHTML = `
      <div class="bf-print">
        <div class="bf-scroll">
          <div class="bf-set">
            ${houseSVG()}
            <canvas class="bf-dark" aria-hidden="true"></canvas>
            <canvas class="bf-bloom" aria-hidden="true"></canvas>
            <div class="bf-marks"></div>
            <div class="bf-cues" role="group" aria-label="The house: eleven songs"></div>
          </div>
        </div>
        <div class="bf-tone" aria-hidden="true"></div>
        <div class="bf-vignette" aria-hidden="true"></div>
        <div class="bf-grain" aria-hidden="true"></div>
        <div class="bf-iris" aria-hidden="true"></div>
      </div>
      <div class="bf-caption">
        <p class="bf-title"><span>${esc(ctx.album.title)}</span> <span class="bf-year">${ctx.album.year}</span></p>
        <div class="bf-tally"><span class="bf-tally-word">lit</span><svg class="bf-tally-marks" viewBox="0 0 150 30" aria-hidden="true"></svg><span class="bf-sr" aria-live="polite"></span>
          <button type="button" class="bf-reset" hidden>lights down</button></div>
      </div>
      <svg class="bf-crops" aria-hidden="true"></svg>`;

    const $ = (s) => root.querySelector(s);
    const print = $('.bf-print');
    const scroller = $('.bf-scroll');
    const set = $('.bf-set');
    const svg = $('.bf-house');
    const dark = $('.bf-dark');
    const bloom = $('.bf-bloom');
    const marks = $('.bf-marks');
    const cueLayer = $('.bf-cues');
    const iris = $('.bf-iris');
    const grain = $('.bf-grain');
    const tallySvg = $('.bf-tally-marks');
    const srLive = $('.bf-sr');
    const resetBtn = $('.bf-reset');
    const crops = $('.bf-crops');
    const dctx = dark.getContext('2d');
    const bctx = bloom.getContext('2d');

    /* grain: one noise tile, made once */
    (function makeGrain() {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const g = c.getContext('2d');
      const img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 120;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grain.style.backgroundImage = `url(${c.toDataURL()})`;
    })();

    /* tally: eleven pencil places */
    (function makeTally() {
      const r = rng(2022);
      let s = '';
      for (let i = 0; i < 11; i++) {
        const group = Math.floor(i / 5);
        const k = i % 5;
        let d;
        if (k < 4) {
          const x = 6 + group * 52 + k * 9 + (r() - 0.5) * 2;
          d = `M${x.toFixed(1)} ${(5 + r() * 2).toFixed(1)} Q${(x + (r() - 0.5) * 3).toFixed(1)} 15 ${(x + (r() - 0.5) * 2).toFixed(1)} ${(25 + r() * 2).toFixed(1)}`;
        } else {
          const x = group * 52;
          d = `M${(x + 1).toFixed(1)} ${(22 + r() * 3).toFixed(1)} Q${x + 20} 15 ${(x + 40).toFixed(1)} ${(6 + r() * 3).toFixed(1)}`;
        }
        s += `<path class="bf-dot" d="M${(k < 4 ? 6 + group * 52 + k * 9 : group * 52 + 20).toFixed(1)} 16 h.1"/>`;
        s += `<path class="bf-stroke" data-i="${i}" pathLength="1" d="${d}"/>`;
      }
      tallySvg.innerHTML = s;
    })();

    /* cues: buttons and spike tape */
    const cues = CUES.map((c, i) => {
      const t = tracks[i] || { n: c.n, title: 'Track ' + c.n };
      const [hx, hy, hw, hh] = c.hit;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bf-cue';
      btn.style.left = (hx / VW * 100) + '%';
      btn.style.top = (hy / VH * 100) + '%';
      btn.style.width = (hw / VW * 100) + '%';
      btn.style.height = (hh / VH * 100) + '%';
      btn.setAttribute('aria-label', `${t.title}, song ${t.n}`);
      btn.setAttribute('aria-pressed', 'false');
      cueLayer.appendChild(btn);

      const glow = document.createElement('i');
      glow.className = 'bf-glowtape';
      glow.style.left = (c.tape[0] / VW * 100) + '%';
      glow.style.top = (c.tape[1] / VH * 100) + '%';
      glow.style.animationDelay = (-i * 0.37) + 's';
      marks.appendChild(glow);

      const tape = document.createElement('div');
      tape.className = 'bf-tape';
      tape.style.left = (c.tape[0] / VW * 100) + '%';
      tape.style.top = (c.tape[1] / VH * 100) + '%';
      tape.style.setProperty('--rot', c.tape[2] + 'deg');
      tape.innerHTML = `<span class="bf-num">${t.n}<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M30 5 C40 9 39 24 22 26 C6 28 1 18 4 11 C8 3 22 1 33 7"/></svg></span><span class="bf-name">${esc(t.title)}</span>`;
      marks.appendChild(tape);

      const g = svg.querySelector(`.bf-obj[data-n="${c.n}"]`);
      const shadow = svg.querySelector(`.bf-shadow[data-n="${c.n}"]`);
      const o = {
        ...c, i, track: t, btn, glow, tape, g, shadow,
        on: false, level: 0, dwell: 0, wokeAt: -10, flick: 1, flickT: 0, sx: 0, sy: 0,
      };
      btn.addEventListener('click', () => { o.clicked = true; activate(o, true); });
      btn.addEventListener('focus', () => { focusTo(o); });
      return o;
    });

    const byKey = {};
    cues.forEach((o) => { byKey[o.key] = o; });
    const lampHead = svg.querySelector('.bf-lamphead');
    const pianoKeys = [...svg.querySelectorAll('.bf-key')];
    const tvGlare = svg.querySelector('.bf-tvon');
    const flames = [...svg.querySelectorAll('.bf-flame')];

    /* ---------- layout ---------- */
    let s = 1;
    let setW = 0;
    let setH = 0;
    let portrait = false;
    let q = 0.5; // canvas resolution in set units

    function layout() {
      const W = print.clientWidth;
      const H = print.clientHeight;
      if (!W || !H) return;
      portrait = W / H < 1.05;
      if (portrait) {
        s = Math.min(H / 1000, W / 470);
      } else {
        s = Math.min(W / 1250, H / 935);
      }
      setW = VW * s;
      setH = VH * s;
      set.style.width = setW + 'px';
      set.style.height = setH + 'px';
      set.style.setProperty('--u', s + 'px');
      root.classList.toggle('bf-small', s < 0.56);
      if (portrait) {
        scroller.classList.add('is-pan');
        set.style.left = '0px';
        set.style.top = Math.round((H - setH) / 2) + 'px';
        // trim the wings off the scrollable width
        const trimL = 40 * s;
        set.style.marginLeft = -trimL + 'px';
        set.style.marginRight = -40 * s + 'px';
      } else {
        scroller.classList.remove('is-pan');
        set.style.marginLeft = set.style.marginRight = '0px';
        set.style.left = Math.round(W / 2 - 800 * s) + 'px';
        set.style.top = Math.round(H / 2 - 512 * s) + 'px';
      }
      const res = Math.min(1, 900 / setW) * 0.55;
      const cw = Math.max(2, Math.round(setW * res));
      const ch = Math.max(2, Math.round(setH * res));
      [dark, bloom].forEach((c) => { if (c.width !== cw) c.width = cw; if (c.height !== ch) c.height = ch; });
      q = cw / VW;
      drawCrops();
    }

    function drawCrops() {
      const r = print.getBoundingClientRect();
      const R = root.getBoundingClientRect();
      const x0 = r.left - R.left;
      const y0 = r.top - R.top;
      const x1 = x0 + r.width;
      const y1 = y0 + r.height;
      const L = 22;
      const g = 6;
      crops.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
      // the picture editor's corner marks, and the loop that goes round the frame when it is chosen
      const w = x1 - x0;
      const h = y1 - y0;
      const P = (fx, fy) => `${(x0 + fx * w).toFixed(1)} ${(y0 + fy * h).toFixed(1)}`;
      const loop = `M${P(0.12, 0.05)} C${P(0.4, 0.015)} ${P(0.8, 0.02)} ${P(0.965, 0.07)} C${P(0.995, 0.25)} ${P(0.99, 0.75)} ${P(0.97, 0.93)} C${P(0.75, 0.985)} ${P(0.25, 0.98)} ${P(0.035, 0.94)} C${P(0.008, 0.72)} ${P(0.006, 0.3)} ${P(0.03, 0.08)} C${P(0.06, 0.04)} ${P(0.12, 0.03)} ${P(0.2, 0.035)}`;
      crops.innerHTML = `<path class="bf-crop" d="M${x0 - g} ${y1 - L} V${y1 + g} H${x0 + L} M${x1 + g} ${y1 - L} V${y1 + g} H${x1 - L}"/>` +
        `<path class="bf-loop" pathLength="1" d="${loop}"/>`;
    }

    let firstScroll = true;
    function centreScroll() {
      if (!portrait) return;
      const target = (760 - 40) * s - scroller.clientWidth / 2;
      scroller.scrollLeft = Math.max(0, target);
    }

    // focus can scroll even a clipped box; keep the set where layout put it
    function onScroll() {
      if (scroller.scrollTop) scroller.scrollTop = 0;
      if (!portrait && scroller.scrollLeft) scroller.scrollLeft = 0;
      if (print.scrollTop || print.scrollLeft) { print.scrollTop = 0; print.scrollLeft = 0; }
      if (root.scrollTop || root.scrollLeft) { root.scrollTop = 0; root.scrollLeft = 0; }
    }
    scroller.addEventListener('scroll', onScroll);
    root.addEventListener('scroll', onScroll, true);

    const ro = new ResizeObserver(() => {
      layout();
      if (firstScroll) { centreScroll(); firstScroll = false; }
      paint(performance.now() / 1000, 0);
    });
    ro.observe(print);
    layout();
    centreScroll();
    // on a narrow screen, show once that the house carries on sideways
    later(() => {
      if (!portrait || ctx.reducedMotion || lastInput > 0) return;
      const from = scroller.scrollLeft;
      scroller.scrollTo({ left: from + 90, behavior: 'smooth' });
      later(() => { if (now() - lastInput > 1) scroller.scrollTo({ left: from, behavior: 'smooth' }); }, 700);
    }, 1100);

    /* ---------- spot ---------- */
    const spot = { x: 640, y: 760, tx: 640, ty: 760, vis: 1 };
    let lastInput = -100;
    let pointerDown = false;
    let pointerInside = false;
    let lastPainted = { x: -1, y: -1 };

    function toSet(clientX, clientY) {
      const r = set.getBoundingClientRect();
      return [(clientX - r.left) / s, (clientY - r.top) / s];
    }
    function onMove(e) {
      const [x, y] = toSet(e.clientX, e.clientY);
      if (e.pointerType === 'touch' && !pointerDown) return;
      spot.tx = clamp(x, 0, VW);
      spot.ty = clamp(y, 0, VH);
      lastInput = now();
      pointerInside = true;
      if (e.pointerType === 'mouse') {
        const pr = print.getBoundingClientRect();
        iris.style.transform = `translate3d(${e.clientX - pr.left}px, ${e.clientY - pr.top}px, 0)`;
        iris.classList.add('is-on');
      }
    }
    function onDown(e) {
      pointerDown = true;
      const [x, y] = toSet(e.clientX, e.clientY);
      spot.tx = clamp(x, 0, VW);
      spot.ty = clamp(y, 0, VH);
      if (e.pointerType !== 'mouse') { spot.x = spot.tx; spot.y = spot.ty; }
      lastInput = now();
      warmAudio();
    }
    function onUp() { pointerDown = false; }
    function onLeave() { pointerInside = false; iris.classList.remove('is-on'); }
    print.addEventListener('pointermove', onMove);
    print.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    print.addEventListener('pointerleave', onLeave);

    function focusTo(o) {
      spot.tx = o.cx;
      spot.ty = o.cy;
      lastInput = now();
      if (portrait) {
        const want = (o.cx - 40) * s - scroller.clientWidth / 2;
        if (Math.abs(scroller.scrollLeft - want) > scroller.clientWidth * 0.3) {
          scroller.scrollTo({ left: Math.max(0, want), behavior: ctx.reducedMotion ? 'auto' : 'smooth' });
        }
      }
    }

    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;

    /* ---------- waking things ---------- */
    let count = 0;
    let fullUp = false;
    let fullAt = -10;
    let ambient = 0.075;

    function activate(o, fromClick) {
      warmAudio();
      const t = now();
      if (!o.on) {
        o.on = true;
        o.wokeAt = t;
        o.g.classList.add('is-on');
        o.btn.setAttribute('aria-pressed', 'true');
        o.glow.classList.add('is-gone');
        o.tape.classList.add('is-on');
        count++;
        updateTally();
        srLive.textContent = `${o.track.title}. ${count} of 11 lit.`;
        gesture(o, true);
        if (count === 11) later(goFullUp, 900);
      } else if (fromClick) {
        o.wokeAt = Math.min(o.wokeAt, t - 1);
        gesture(o, false);
      }
    }

    function pulse(o, cls, ms) {
      o.g.classList.remove(cls);
      requestAnimationFrame(() => {
        if (dead) return;
        o.g.classList.add(cls);
        later(() => o.g.classList.remove(cls), ms);
      });
    }

    function gesture(o, first) {
      switch (o.key) {
        case 'ghost': o.wokeAt = now(); sfx.ghost(); break;
        case 'record': pulse(o, 'is-play', 900); sfx.record(first); break;
        case 'lamp': pulse(o, 'is-play', 600); o.nod = now(); sfx.lamp(); break;
        case 'guitar': pulse(o, 'is-play', 1800); sfx.guitar(); break;
        case 'phone': pulse(o, 'is-play', 2400); sfx.phone(); break;
        case 'piano': playPiano(); break;
        case 'radio': pulse(o, 'is-play', 2600); sfx.radio(); break;
        case 'window': pulse(o, 'is-play', 2200); sfx.window(); break;
        case 'mirror':
          if (!first) {
            o.g.classList.remove('is-drawn');
            later(() => o.g.classList.add('is-drawn'), 700);
          } else {
            later(() => o.g.classList.add('is-drawn'), 1300);
          }
          sfx.mirror();
          break;
        case 'tv': pulse(o, 'is-play', 500); sfx.tv(first); break;
        case 'table': pulse(o, 'is-play', 1200); sfx.table(); break;
      }
    }

    const MELODY = [[11, 0], [9, 0.2], [11, 0.4], [12, 0.6], [14, 0.85], [13, 1.05], [12, 1.25], [11, 1.5]];
    const BASS = [[0, 0], [4, 0.85], [3, 1.5]];
    function whiteMidi(i) { return 48 + 12 * Math.floor(i / 7) + [0, 2, 4, 5, 7, 9, 11][i % 7]; }
    function playPiano() {
      MELODY.forEach(([k, at]) => {
        later(() => {
          const el = pianoKeys[k];
          if (!el) return;
          el.classList.add('is-down');
          later(() => el.classList.remove('is-down'), 170);
        }, at * 1000);
        sfx.piano(mtof(whiteMidi(k)), at, 0.11, 1.6);
      });
      BASS.forEach(([k, at]) => {
        later(() => {
          const el = pianoKeys[k];
          if (!el) return;
          el.classList.add('is-down');
          later(() => el.classList.remove('is-down'), 300);
        }, at * 1000);
        sfx.piano(mtof(whiteMidi(k)), at, 0.08, 2.2);
      });
    }

    function updateTally() {
      tallySvg.querySelectorAll('.bf-stroke').forEach((p, i) => p.classList.toggle('is-on', i < count));
    }

    function goFullUp() {
      if (dead || count < 11) return;
      fullUp = true;
      fullAt = now();
      root.classList.add('bf-full');
      resetBtn.hidden = false;
      srLive.textContent = 'All eleven lit. The house is up.';
      sfx.finale();
    }

    resetBtn.addEventListener('click', () => {
      fullUp = false;
      count = 0;
      root.classList.remove('bf-full');
      resetBtn.hidden = true;
      cues.forEach((o) => {
        o.on = false;
        o.dwell = 0;
        o.g.classList.remove('is-on', 'is-drawn', 'is-play');
        o.btn.setAttribute('aria-pressed', 'false');
        o.glow.classList.remove('is-gone');
        o.tape.classList.remove('is-on');
      });
      updateTally();
      sfx.down();
      srLive.textContent = 'Lights down.';
    });

    /* ---------- lights ---------- */

    function lightsOf(o, t) {
      const L = o.level;
      if (L <= 0.002) return null;
      const f = o.flick;
      switch (o.key) {
        case 'ghost': return { holes: [[166, 766, 360, 0.86 * L * f], [166, 950, 140, 0.4 * L]], glows: [[166, 766, 70, 0.9 * L * f], [166, 766, 22, 1 * L * f]] };
        case 'record': return { holes: [[566, 786, 190, 0.66 * L], [630, 806, 90, 0.25 * L]], glows: [[566, 782, 46, 0.5 * L]] };
        case 'lamp': return { holes: [[664, 352, 70, 0.5 * L]], cone: L, glows: [[lampMouth.x, lampMouth.y, 36, 0.7 * L]] };
        case 'guitar': return { holes: [[1290, 340, 290, 0.74 * L], [1309, 511, 50, 0.3 * L]], glows: [[1290, 336, 60, 0.85 * L], [1309, 511, 12, 0.8 * L]] };
        case 'phone': return { holes: [[746, 752, 210, 0.66 * L]], glows: [[746, 750, 40, 0.65 * L]] };
        case 'piano': return { holes: [[990, 352, 200, 0.6 * L * f], [1050, 470, 140, 0.3 * L]], glows: [[990, 352, 34, 0.75 * L * f], [990, 352, 10, L]] };
        case 'radio': return { holes: [[1246, 712, 150, 0.5 * L * f]], glows: [[1246, 712, 24, 0.7 * L * f]] };
        case 'window': return { holes: [[390, 372, 180, 0.58 * L], [400, 510, 150, 0.34 * L]], glows: [[390, 372, 80, 0.22 * L]] };
        case 'mirror': return { holes: [[815, 312, 240, 0.72 * L]], glows: [[815, 309, 50, 0.7 * L], [795, 309, 10, L], [815, 309, 10, L], [835, 309, 10, L]] };
        case 'tv': return { holes: [[326, 805, 300, 0.62 * L * f], [326, 805, 90, 0.4 * L]], glows: [[324, 805, 52, 0.6 * L * f]] };
        case 'table': return { holes: [[1100, 716, 310, 0.86 * L], [1100, 762, 110, 0.35 * L * f]], glows: [[1100, 716, 56, 0.9 * L], [1093, 756, 12, L * f], [1107, 762, 12, L * f]] };
      }
      return null;
    }

    const lampMouth = { x: 0, y: 0 };
    let lampAng = 122;

    function hole(c, x, y, r, a, soft) {
      if (a <= 0.003) return;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      if (soft) {
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.3, `rgba(0,0,0,${a * 0.82})`);
        g.addColorStop(0.62, `rgba(0,0,0,${a * 0.38})`);
        g.addColorStop(0.85, `rgba(0,0,0,${a * 0.1})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        // the follow spot: a firm edge that still falls off
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.55, `rgba(0,0,0,${a * 0.95})`);
        g.addColorStop(0.74, `rgba(0,0,0,${a * 0.7})`);
        g.addColorStop(0.9, `rgba(0,0,0,${a * 0.2})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
      }
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function glow(c, x, y, r, a) {
      if (a <= 0.003) return;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,249,238,${Math.min(1, a)})`);
      g.addColorStop(0.25, `rgba(255,246,230,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,244,228,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function cone(c, x, y, ang, len, L) {
      const layers = [[0.5, 0.42], [0.36, 0.34], [0.22, 0.3]];
      layers.forEach(([spread, a]) => {
        c.save();
        c.beginPath();
        c.moveTo(x, y);
        c.arc(x, y, len, ang - spread, ang + spread);
        c.closePath();
        c.clip();
        hole(c, x, y, len, a * L, true);
        c.restore();
      });
    }

    function paint(t, dt) {
      const reduced = ctx.reducedMotion;
      // ambient: how far up the house lights are
      const want = fullUp ? 0.84 : 0.075 + count * 0.028;
      ambient += (want - ambient) * (1 - Math.exp(-dt * (fullUp ? 0.9 : 2)));

      const D = dctx;
      D.setTransform(q, 0, 0, q, 0, 0);
      D.globalCompositeOperation = 'source-over';
      D.clearRect(0, 0, VW, VH);
      D.fillStyle = `rgba(8,7,6,${(1 - ambient).toFixed(3)})`;
      D.fillRect(0, 0, VW, VH);
      D.globalCompositeOperation = 'destination-out';
      // footlights along the lip of the stage
      const fg = D.createLinearGradient(0, 1000, 0, 846);
      fg.addColorStop(0, 'rgba(0,0,0,.62)');
      fg.addColorStop(0.45, 'rgba(0,0,0,.3)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      D.fillStyle = fg;
      D.fillRect(0, 846, VW, 154);
      // a little spill on the roofline so the house's shape is there from the start
      hole(D, 800, 150, 420, 0.1, true);

      const B = bctx;
      B.setTransform(q, 0, 0, q, 0, 0);
      B.globalCompositeOperation = 'source-over';
      B.clearRect(0, 0, VW, VH);
      B.globalCompositeOperation = 'lighter';

      for (const o of cues) {
        const l = lightsOf(o, t);
        if (!l) continue;
        l.holes.forEach(([x, y, r, a]) => hole(D, x, y, r, a, true));
        if (l.cone) {
          const rad = lampAng * Math.PI / 180;
          cone(D, 664 + Math.cos(rad) * 30, 352 + Math.sin(rad) * 30, rad, 440, l.cone);
        }
        l.glows.forEach(([x, y, r, a]) => glow(B, x, y, r, a * 0.9));
      }
      if (fullUp) {
        const k = clamp((t - fullAt) / 3, 0, 1);
        glow(B, 960, 176, 40, 0.8 * k);
        hole(D, 960, 176, 300, 0.6 * k, true);
      }
      // the follow spot itself, last, so it always reads
      const sr = portrait ? 200 : 180;
      hole(D, spot.x, spot.y, sr, 0.97 * spot.vis, false);
      hole(D, spot.x, spot.y, sr * 2.3, 0.2 * spot.vis, true);
      glow(B, spot.x, spot.y, sr * 1.15, 0.05 * spot.vis);
    }

    /* ---------- the loop ---------- */
    let lastT = 0;
    let reducedState = null;
    let nearCue = null;

    function frame(ms) {
      raf = requestAnimationFrame(frame);
      const t = now();
      const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
      lastT = t;
      const reduced = !!ctx.reducedMotion;
      if (reduced !== reducedState) {
        reducedState = reduced;
        root.classList.toggle('bf-rm', reduced);
      }

      // idle: the operator searches the house by themselves
      const idle = t - lastInput > 7;
      if (idle && !reduced && !pointerDown) {
        const it = t * 0.16;
        let cx = 800;
        let ax = 470;
        if (portrait) {
          const vw = scroller.clientWidth / s;
          cx = (scroller.scrollLeft + scroller.clientWidth / 2) / s + 40;
          ax = vw * 0.32;
        }
        spot.tx = cx + ax * Math.sin(it * 0.83 + 0.6);
        spot.ty = 600 + 250 * Math.sin(it * 1.31 + 2.1);
      }
      const k = reduced ? 1 : 1 - Math.exp(-dt * (idle ? 1.6 : 11));
      spot.x += (spot.tx - spot.x) * k;
      spot.y += (spot.ty - spot.y) * k;

      // dwell: a cue wakes when the spot rests on it
      const active = !idle && (pointerInside || pointerDown || t - lastInput < 1.5);
      for (const o of cues) {
        if (!o.on) {
          const d = Math.hypot(spot.x - o.cx, spot.y - o.cy);
          if (active && d < o.r) {
            o.dwell += dt;
            if (o.dwell > 0.5) activate(o, false);
          } else {
            o.dwell = Math.max(0, o.dwell - dt * 2);
          }
        }
        // light level
        const target = o.on ? 1 : 0;
        o.level += (target - o.level) * (1 - Math.exp(-dt * (o.on ? 3.2 : 4)));
        // filament warm-up stutter on bulbs
        let f = 1;
        const since = t - o.wokeAt;
        if (!reduced && since < 0.7 && (o.key === 'ghost' || o.key === 'guitar' || o.key === 'mirror' || o.key === 'phone' || o.key === 'table' || o.key === 'record')) {
          f = Math.sin(since * 47) > -0.2 ? 1 : 0.15;
        }
        if (!reduced) {
          if (o.key === 'tv') {
            o.flickT -= dt;
            if (o.flickT <= 0) {
              o.flickT = 0.05 + Math.random() * 0.14;
              o.flickTarget = 0.5 + Math.random() * 0.5;
            }
            o.flick += ((o.flickTarget || 1) - o.flick) * 0.5;
            f *= o.flick;
          } else if (o.key === 'piano' || o.key === 'ghost' || o.key === 'radio') {
            const amp = o.key === 'ghost' ? 0.03 : 0.12;
            f *= 1 - amp * (0.5 + 0.5 * Math.sin(t * 13.1 + o.n) * Math.sin(t * 7.3 + o.n * 2));
          }
        }
        if (o.key !== 'tv') o.flick = f;
        else o.flick = f;
      }
      // on a small print only the nearest tape shows its whole name
      let near = null;
      let nd = 1e9;
      for (const o of cues) {
        const d = Math.hypot(spot.x - o.cx, spot.y - o.cy);
        if (o.on && d < o.r * 1.8 && d < nd) { nd = d; near = o; }
      }
      if (near !== nearCue) {
        if (nearCue) nearCue.tape.classList.remove('is-near');
        if (near) near.tape.classList.add('is-near');
        nearCue = near;
      }
      if (byKey.tv.on && tvGlare) tvGlare.style.opacity = (0.7 + 0.3 * byKey.tv.flick).toFixed(3);

      // the lamp looks for you
      const lamp = byKey.lamp;
      let wantAng = 122;
      if (lamp.on) {
        const a = Math.atan2(spot.y - 352, spot.x - 664) * 180 / Math.PI;
        let aa = a < -90 ? a + 360 : a;
        wantAng = clamp(aa, 18, 205);
        if (lamp.nod && t - lamp.nod < 0.6 && !reduced) wantAng += Math.sin((t - lamp.nod) * 20) * 10 * (1 - (t - lamp.nod) / 0.6);
      }
      const nl = lampAng + (wantAng - lampAng) * (reduced ? 1 : 1 - Math.exp(-dt * 4));
      if (Math.abs(nl - lampAng) > 0.05) {
        lampAng = nl;
        lampHead.setAttribute('transform', `rotate(${lampAng.toFixed(2)} 664 352)`);
      }
      const rad = lampAng * Math.PI / 180;
      lampMouth.x = 664 + Math.cos(rad) * 38;
      lampMouth.y = 352 + Math.sin(rad) * 38;

      // shadows thrown by the follow spot onto the walls
      if (Math.abs(spot.x - lastPainted.x) + Math.abs(spot.y - lastPainted.y) > 0.6) {
        lastPainted.x = spot.x;
        lastPainted.y = spot.y;
        for (const o of cues) {
          const dx = o.cx - spot.x;
          const dy = o.cy - spot.y;
          const d = Math.hypot(dx, dy) || 1;
          const reach = clamp(1 - d / 520, 0, 1);
          const m = Math.min(d, 260) * 0.06 * reach;
          const sx = (dx / d) * m;
          const sy = (dy / d) * m + 3;
          o.shadow.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
          o.shadow.style.opacity = (0.25 + reach * 0.75).toFixed(2);
        }
      }

      paint(t, dt);
    }

    /* ---------- grain (cheap: moves a tile) ---------- */
    let grainTimer = setInterval(() => {
      if (ctx.reducedMotion) return;
      grain.style.transform = `translate3d(${Math.round(Math.random() * -160)}px, ${Math.round(Math.random() * -160)}px, 0)`;
    }, 83);

    /* ------------------------------------------------------------------ */
    /* sound                                                               */
    /* ------------------------------------------------------------------ */

    let S = null; // { c, out, input, nodes }
    let amb = null;
    let crackleTimer = 0;

    function bus() {
      let c = null;
      let out = null;
      try { c = audio.ctx; out = audio.out; } catch (e) { return null; }
      if (!c || !out) return null;
      if (S && S.c === c && S.out === out) return S;
      if (S) teardown();
      try {
        const input = c.createGain();
        const dry = c.createGain();
        dry.gain.value = 0.85;
        const conv = c.createConvolver();
        conv.buffer = impulse(c, 2.6, 2.4);
        const wet = c.createGain();
        wet.gain.value = 0.3;
        const warm = c.createBiquadFilter();
        warm.type = 'lowpass';
        warm.frequency.value = 5200;
        input.connect(warm);
        warm.connect(dry);
        warm.connect(conv);
        conv.connect(wet);
        dry.connect(out);
        wet.connect(out);
        S = { c, out, input, nodes: [input, dry, conv, wet, warm] };
      } catch (e) { S = null; }
      return S;
    }

    function teardown() {
      if (!S) return;
      S.nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
      S = null;
    }

    function impulse(c, secs, decay) {
      const len = Math.floor(c.sampleRate * secs);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    }

    function voice(build, when, life) {
      const b = bus();
      if (!b) return;
      try {
        const t = b.c.currentTime + 0.02 + (when || 0);
        build(b.c, t, b.input);
      } catch (e) { /* sound is a garnish; never break the room */ }
    }

    function piano(f, when, g, d) {
      voice((c, t, dest) => {
        const v = c.createGain();
        env(v, t, 0.006, g, d);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3200, t);
        lp.frequency.exponentialRampToValueAtTime(900, t + d);
        const o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
        const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; o2.detune.value = 4;
        const g2 = c.createGain(); g2.gain.value = 0.35;
        const o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * 3.01;
        const g3 = c.createGain(); g3.gain.value = 0.12;
        o1.connect(lp); o2.connect(g2).connect(lp); o3.connect(g3).connect(lp);
        lp.connect(v).connect(dest);
        [o1, o2, o3].forEach((o) => { o.start(t); o.stop(t + d + 0.05); });
        o1.onended = () => { [o1, o2, o3, g2, g3, lp, v].forEach((n) => { try { n.disconnect(); } catch (e) {} }); };
      }, when);
    }

    function pluck(f, when, g, d) {
      voice((c, t, dest) => {
        const v = c.createGain();
        env(v, t, 0.003, g, d);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 1.4;
        lp.frequency.setValueAtTime(3600, t);
        lp.frequency.exponentialRampToValueAtTime(380, t + 0.5);
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = -6;
        o.connect(lp); o2.connect(lp); lp.connect(v).connect(dest);
        o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
        o.onended = () => { [o, o2, lp, v].forEach((n) => { try { n.disconnect(); } catch (e) {} }); };
      }, when);
    }

    function bell(f, when, g, d) {
      voice((c, t, dest) => {
        const v = c.createGain();
        env(v, t, 0.004, g, d);
        const parts = [[1, 1], [2.76, 0.35], [5.4, 0.12]];
        const nodes = [v];
        parts.forEach(([m, a], i) => {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
          const pg = c.createGain(); pg.gain.value = a;
          o.connect(pg).connect(v);
          o.start(t); o.stop(t + d / (i + 1) + 0.05);
          nodes.push(o, pg);
          if (i === 0) o.onended = () => nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
        });
        v.connect(dest);
      }, when);
    }

    function pad(fs, when, dur, g) {
      voice((c, t, dest) => {
        const v = c.createGain();
        v.gain.setValueAtTime(0.0001, t);
        v.gain.linearRampToValueAtTime(g, t + Math.min(0.8, dur * 0.4));
        v.gain.setValueAtTime(g, t + dur * 0.6);
        v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        lp.connect(v).connect(dest);
        const nodes = [v, lp];
        fs.forEach((f, i) => {
          [-7, 7].forEach((det) => {
            const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
            const og = c.createGain(); og.gain.value = 0.5 / fs.length;
            o.connect(og).connect(lp);
            o.start(t); o.stop(t + dur + 0.05);
            nodes.push(o, og);
            if (i === 0 && det < 0) o.onended = () => nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
          });
        });
      }, when);
    }

    function hiss(when, dur, g, type, f0, f1, q) {
      voice((c, t, dest) => {
        const len = Math.max(1, Math.floor(c.sampleRate * dur));
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource(); src.buffer = buf;
        const fl = c.createBiquadFilter(); fl.type = type || 'bandpass'; fl.Q.value = q || 1;
        fl.frequency.setValueAtTime(f0, t);
        if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const v = c.createGain();
        v.gain.setValueAtTime(0.0001, t);
        v.gain.linearRampToValueAtTime(g, t + Math.min(0.05, dur * 0.2));
        v.gain.setValueAtTime(g, t + dur * 0.6);
        v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fl).connect(v).connect(dest);
        src.start(t);
        src.onended = () => { [src, fl, v].forEach((n) => { try { n.disconnect(); } catch (e) {} }); };
      }, when);
    }

    function click(when) {
      hiss(when, 0.025, 0.16, 'highpass', 2600);
      voice((c, t, dest) => {
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.05);
        const v = c.createGain(); env(v, t, 0.002, 0.12, 0.07);
        o.connect(v).connect(dest); o.start(t); o.stop(t + 0.1);
        o.onended = () => { o.disconnect(); v.disconnect(); };
      }, when);
    }

    function ring(when) {
      voice((c, t, dest) => {
        const v = c.createGain();
        v.gain.setValueAtTime(0.0001, t);
        v.gain.linearRampToValueAtTime(0.035, t + 0.02);
        v.gain.setValueAtTime(0.035, t + 0.75);
        v.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        const trem = c.createGain(); trem.gain.value = 0.5;
        const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 19;
        const lg = c.createGain(); lg.gain.value = 0.5;
        lfo.connect(lg).connect(trem.gain);
        const a = c.createOscillator(); a.frequency.value = 1180;
        const b = c.createOscillator(); b.frequency.value = 1480;
        a.connect(trem); b.connect(trem); trem.connect(v).connect(dest);
        [a, b, lfo].forEach((o) => { o.start(t); o.stop(t + 0.9); });
        a.onended = () => [a, b, lfo, lg, trem, v].forEach((n) => { try { n.disconnect(); } catch (e) {} });
      }, when);
    }

    const N = (m) => mtof(m);
    const sfx = {
      ghost() { click(0); pad([N(36), N(43), N(48)], 0.05, 2.6, 0.05); bell(N(72), 0.3, 0.025, 2); },
      record(first) {
        click(0);
        hiss(0.25, 0.08, 0.12, 'lowpass', 300);
        [[64, 0.45], [67, 0.62], [69, 0.79], [72, 0.96], [69, 1.2], [67, 1.38]].forEach(([m, at]) => piano(N(m), at, 0.09, 1.2));
        piano(N(48), 0.45, 0.06, 2);
      },
      lamp() { click(0); voice((c, t, d) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(760, t + 0.18); const v = c.createGain(); env(v, t, 0.01, 0.025, 0.22); o.connect(v).connect(d); o.start(t); o.stop(t + 0.25); o.onended = () => { o.disconnect(); v.disconnect(); }; }, 0.05);
        [[60, 0.2], [64, 0.42], [67, 0.64], [69, 0.9]].forEach(([m, at]) => pluck(N(m), at, 0.06, 1.3)); },
      guitar() {
        [48, 55, 60, 64, 67].forEach((m, i) => pluck(N(m), i * 0.024, 0.07, 2.2));
        [43, 50, 55, 59, 67].forEach((m, i) => pluck(N(m), 0.62 + i * 0.024, 0.06, 2.2));
      },
      phone() { ring(0); ring(1.15); [[69, 2.2], [67, 2.42], [64, 2.7]].forEach(([m, at]) => piano(N(m), at, 0.08, 1.6)); },
      piano() {},
      radio() {
        click(0);
        hiss(0.05, 0.9, 0.05, 'bandpass', 380, 2600, 4);
        voice((c, t, d) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.6); const v = c.createGain(); env(v, t, 0.05, 0.012, 0.7); o.connect(v).connect(d); o.start(t); o.stop(t + 0.75); o.onended = () => { o.disconnect(); v.disconnect(); }; }, 0.1);
        pad([N(53), N(57), N(60), N(64)], 0.85, 2.8, 0.06);
      },
      window() {
        hiss(0, 2.4, 0.03, 'bandpass', 500, 900, 0.8);
        [[88, 0.1], [86, 0.45], [84, 0.8], [79, 1.25]].forEach(([m, at]) => bell(N(m), at, 0.03, 2.2));
      },
      mirror() {
        click(0);
        [[76, 0.2], [83, 0.5], [88, 0.9]].forEach(([m, at]) => { bell(N(m), at, 0.02, 2.6); bell(N(m) * 1.004, at + 0.01, 0.015, 2.6); });
        pad([N(52), N(59)], 0.3, 2.6, 0.03);
      },
      tv(first) {
        voice((c, t, d) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); const v = c.createGain(); env(v, t, 0.003, 0.14, 0.2); o.connect(v).connect(d); o.start(t); o.stop(t + 0.22); o.onended = () => { o.disconnect(); v.disconnect(); }; }, 0);
        hiss(0.04, 0.45, 0.05, 'highpass', 1800);
        if (first) pad([N(45), N(52), N(59), N(60)], 0.4, 3.6, 0.05);
        else pad([N(52), N(59), N(64)], 0.3, 2.2, 0.04);
      },
      table() {
        bell(N(98), 0, 0.03, 1.2); bell(N(101) * 1.01, 0.07, 0.025, 1.2);
        [[48, 0.35], [55, 0.5], [64, 0.65], [67, 0.8], [72, 0.98]].forEach(([m, at]) => piano(N(m), at, 0.08, 2.2));
      },
      finale() {
        [48, 52, 55, 60, 64, 67, 72, 76, 79].forEach((m, i) => piano(N(m), i * 0.11, 0.07, 2.8));
        pad([N(36), N(48), N(55), N(64)], 0.2, 4.5, 0.05);
        for (let i = 0; i < 70; i++) hiss(1.2 + Math.random() * 2.6, 0.03, 0.03 + Math.random() * 0.03, 'bandpass', 1400 + Math.random() * 1600, 0, 2);
      },
      down() { click(0); pad([N(43), N(48)], 0.05, 1.8, 0.04); },
    };
    sfx.piano = (f, at, g, d) => piano(f, at, g, d);

    function startAmbience() {
      const b = bus();
      if (!b || amb) return;
      try {
        const c = b.c;
        const len = c.sampleRate * 3;
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
        const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.16, c.currentTime + 1.5);
        src.connect(lp).connect(g).connect(b.out);
        src.start();
        const hum = c.createOscillator(); hum.frequency.value = 55;
        const hg = c.createGain(); hg.gain.value = 0.006;
        hum.connect(hg).connect(b.out); hum.start();
        // one short pop, reused for vinyl crackle
        const plen = Math.floor(c.sampleRate * 0.006);
        const pop = c.createBuffer(1, plen, c.sampleRate);
        const pd = pop.getChannelData(0);
        for (let i = 0; i < plen; i++) pd[i] = (Math.random() * 2 - 1) * (1 - i / plen);
        amb = { src, hum, nodes: [src, lp, g, hum, hg], pop, c, out: b.out };
        crackleTimer = setInterval(crackle, 60);
      } catch (e) { amb = null; }
    }

    function crackle() {
      if (!amb || !audio.enabled) return;
      const rate = byKey.record.on ? 0.42 : 0.07;
      if (Math.random() > rate) return;
      try {
        const c = amb.c;
        const s0 = c.createBufferSource(); s0.buffer = amb.pop;
        s0.playbackRate.value = 0.5 + Math.random() * 1.5;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200 + Math.random() * 2400;
        const g = c.createGain(); g.gain.value = (byKey.record.on ? 0.05 : 0.025) * Math.random();
        s0.connect(hp).connect(g).connect(amb.out);
        s0.start(c.currentTime + Math.random() * 0.05);
        s0.onended = () => { [s0, hp, g].forEach((n) => { try { n.disconnect(); } catch (e) {} }); };
      } catch (e) {}
    }

    function stopAmbience() {
      clearInterval(crackleTimer);
      crackleTimer = 0;
      if (!amb) return;
      try { amb.src.stop(); amb.hum.stop(); } catch (e) {}
      amb.nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
      amb = null;
    }

    function warmAudio() {
      if (audio.enabled && !amb) startAmbience();
    }

    const unsub = audio.onChange((on) => {
      if (on) startAmbience();
      else { stopAmbience(); teardown(); }
    });
    if (audio.enabled) startAmbience();

    /* ---------- go ---------- */
    root.classList.toggle('bf-rm', !!ctx.reducedMotion);
    paint(0, 0.016);
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        dead = true;
        cancelAnimationFrame(raf);
        clearInterval(grainTimer);
        timers.forEach((id) => clearTimeout(id));
        timers.clear();
        ro.disconnect();
        scroller.removeEventListener('scroll', onScroll);
        root.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        print.removeEventListener('pointermove', onMove);
        print.removeEventListener('pointerdown', onDown);
        print.removeEventListener('pointerleave', onLeave);
        try { unsub(); } catch (e) {}
        stopAmbience();
        teardown();
      },
    };
  }

  window.Eras.register(ID, {
    mount(root, ctx) {
      if (live) { try { live.destroy(); } catch (e) {} }
      live = createRoom(root, ctx);
    },
    unmount() {
      if (live) { live.destroy(); live = null; }
    },
  });
})();
