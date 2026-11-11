/* The weather behind the whole site: a night city seen through a wet, steamed-up window.
   One WebGL fragment shader draws the city lights, the drops on the glass, the rain and the snow.
   A small 2D canvas on top carries the falling leaves. Everything is procedural; there are no images. */
(function () {
  'use strict';

  const VERT = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos,0.,1.); }';

  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uRain, uSnow, uLate, uFog, uDrift, uSign, uSignY, uDim;
uniform vec3 uC0, uC1, uC2, uC3, uSignCol, uSignBox, uTap;
uniform sampler2D uWipe;

float S(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0., 1.); return t*t*(3.-2.*t); }
float h11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); q += dot(q, q.yzx+33.33); return fract((q.xx+q.yz)*q.zy); }

vec3 pal(float h){ return h < .5 ? uC0 : (h < .72 ? uC1 : (h < .87 ? uC2 : uC3)); }

/* a field of out-of-focus lights */
vec3 lights(vec2 p, float scale, float seed, float blur, float density){
  vec2 g = p*scale;
  vec2 id = floor(g), f = fract(g);
  vec3 col = vec3(0.);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 o = vec2(float(x), float(y));
    vec2 c = id + o;
    float pres = step(1. - density, h21(c*1.31 + seed));
    vec2 r = h22(c + seed);
    vec2 d = o + .15 + r*.7 - f;
    float rad = mix(.10, .30, h21(c*2.17 + seed)) * blur;
    float l = length(d);
    float disc = S(rad, rad*.8, l);
    disc *= .55 + .45*S(rad*.45, rad*.95, l);
    float tw = .8 + .2*sin(uTime*(.4 + r.x*1.6) + r.y*50.);
    col += pal(h21(c*3.7 + seed)) * disc * tw * pres;
  }
  return col;
}

const float HZ = .30;

vec3 scene(vec2 p, float blur){
  float y = p.y + uDrift;
  vec3 haze = mix(uC0, vec3(.5,.62,.9), .4);
  float hz = S(.95, .25, y);
  vec3 col = mix(vec3(.012,.016,.028), haze*.17, hz*hz) * (1.2 - uLate*.8);

  // skyline
  float sx = p.x*5.;
  float bid = floor(sx);
  float bh = .36 + .20*h11(bid*1.7) + .12*h11(floor(sx*.37)*9.1);
  float edge = .012*blur;
  float build = S(bh + edge, bh - edge, y) * S(HZ - .02, HZ + .01, y);
  col = mix(col, vec3(.008,.010,.016), build*.88);
  vec2 wg = vec2(sx*6., y*46.);
  vec2 wid = floor(wg);
  float lit = step(.82, h21(wid + bid*7.));
  float wd = length((fract(wg) - .5)*vec2(1., 1.4));
  col += pal(h21(wid*1.3)) * lit * build * S(.5*min(blur, 1.6), .1, wd) * .2;

  // street lights, mid lights, big close bokeh
  float soft = mix(1., blur, .55);
  col += lights(vec2(p.x, y), 9., 11., blur, .55) * S(.20, .30, y) * S(.62, .34, y) * .95 / soft;
  col += lights(vec2(p.x + 3.1, y), 5., 23., blur*1.1, .40) * S(.12, .30, y) * S(.85, .40, y) * .70 / soft;
  col += lights(vec2(p.x - 1.7, y), 2.6, 37., blur*1.25, .30) * S(.0, .30, y) * S(1.0, .5, y) * .46 / soft;

  // the neon rectangle
  if (uSign > .001) {
    vec2 sp = vec2(p.x, p.y - uSignBox.x + uSignY);
    vec2 dd = abs(sp) - uSignBox.yz;
    float sd = abs(length(max(dd, 0.)) + min(max(dd.x, dd.y), 0.));
    float w = .0042*blur;
    float tube = S(w*1.7, w*.4, sd);
    float glow = .0030/(sd*sd + .0026*blur) * .15 + exp(-sd*8.)*.09;
    float fl = .9 + .1*step(.35, h11(floor(uTime*11.)));
    col += uSignCol * (tube*1.7/blur + glow) * uSign * fl;
  }

  // wet road: the lights again, upside down and stretched
  float gy = HZ - y;
  if (gy > 0.) {
    float wob = sin(p.x*70. + gy*30.)*.004 + sin(p.x*23. + uTime*.6)*.003;
    vec2 q = vec2(p.x + wob, HZ + gy*.42);
    vec3 refl = lights(q, 9., 11., blur*1.5, .55)*.5 + lights(vec2(q.x + 3.1, q.y), 5., 23., blur*1.6, .40)*.4;
    col = mix(col, vec3(.010,.012,.018), S(0., .02, gy));
    col += refl * S(0., .03, gy) * (.5 + .6*uRain) * exp(-gy*2.2) / soft;
  }
  return col;
}

/* drops that run down the glass. xy = how far they bend the view, z = cleared glass, w = the drop itself */
vec4 runDrops(vec2 p, float t, float seed, float amount){
  vec2 a = vec2(4., 1.);
  vec2 st = p*a*3.;
  float cn = h11(floor(st.x)*3.7 + seed*17.);
  float rate = .10 + .14*cn;
  st.y += t*rate + cn*13.;
  vec2 id = floor(st);
  vec2 f = fract(st) - .5;
  float n = h21(id + seed*31.);
  float on = step(1. - amount*.8, h21(id*1.7 + seed*5.));
  float ti = fract(t*rate + n);
  float y = ti < .22 ? mix(.4, -.4, S(0., .22, ti)) : mix(-.4, .4, (ti - .22)/.78);
  float x = (n - .5)*.5;
  x += sin(ti*18. + p.y*14.)*.03*(.5 - abs(x));
  vec2 dp = (f - vec2(x, y))/a;
  float r = .034 + .022*n;
  float drop = S(r, r*.25, length(dp*vec2(1., .8))) * on;
  float above = S(-.01, .04, dp.y);
  float fade = S(1., .25, ti) * S(.85, .0, f.y - y);
  float trail = S(r*.75, r*.2, abs(dp.x)) * above * fade * on;
  vec2 bp = vec2(dp.x + sin(f.y*40.)*.004, (fract(f.y*7.) - .5)/7.);
  float bead = S(.016, .004, length(bp)) * above * fade * on;
  vec2 off = -dp*drop*9. - bp*bead*7.;
  return vec4(off, max(drop, max(trail*.85, bead)), drop + bead*.6);
}

/* small drops that sit still, swell and go */
vec4 stillDrops(vec2 p, float t, float amount){
  vec2 g = p*24.;
  vec2 id = floor(g);
  vec2 f = fract(g) - .5;
  float n = h21(id);
  vec2 o = (h22(id + 4.) - .5)*.6;
  float life = fract(t*.045 + n*7.);
  float size = (.10 + .22*h21(id + 9.)) * S(0., .12, life) * S(1., .8, life);
  float on = step(1. - amount*.65, n);
  vec2 dp = f - o;
  float drop = S(size, size*.3, length(dp)) * on;
  return vec4(-dp*drop*.12, drop*.55, drop);
}

float rainAir(vec2 p, float t){
  float acc = 0.;
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float qx = (p.x + p.y*.12)*(30. + fi*22.);
    float cid = floor(qx);
    float n = h11(cid + fi*31.);
    float yy = p.y*(1.6 + fi*.5) + t*(1.8 + n*1.2 + fi*.4) + n*17.;
    float seg = fract(yy);
    float pick = step(.72, h11(cid*.37 + floor(yy)*1.13 + fi));
    acc += S(.5, 0., abs(fract(qx) - .5)*2.5) * S(0., .1, seg) * S(.55, .1, seg) * pick * (.10 - fi*.022);
  }
  return acc;
}

float snowAir(vec2 p, float t){
  float acc = 0.;
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    vec2 q = p*(6. + fi*5.) + vec2(sin(t*.25 + fi*2.)*.6 + fi*3.7, t*(.5 + fi*.22));
    vec2 id = floor(q);
    vec2 f = fract(q) - .5;
    vec2 o = (h22(id + fi*7.) - .5)*.7;
    o.x += sin(t*.8 + h21(id)*6.28)*.12;
    float r = .05 + .07*h21(id + 3.);
    acc += S(r, r*.2, length(f - o)) * step(.45, h21(id*1.9 + fi)) * (.55 - fi*.09);
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  vec2 p = vec2((uv.x - .5)*asp, uv.y);
  float t = uTime;

  vec4 d1 = runDrops(p, t, 1., uRain);
  vec4 d2 = runDrops(p*1.7 + 3.3, t*1.15, 2., uRain);
  vec4 d3 = stillDrops(p, t, uRain);
  vec2 off = d1.xy + d2.xy*.6 + d3.xy;
  float clear = clamp(max(max(d1.z, d2.z), d3.z), 0., 1.);
  float dropMask = clamp(d1.w + d2.w + d3.w, 0., 1.);

  // a tap on the glass sends one ring out through the water
  if (uTap.z < 2.5) {
    vec2 dv = p - uTap.xy;
    float dl = length(dv);
    float ring = sin((dl - uTap.z*.55)*60.) * exp(-pow((dl - uTap.z*.55)*9., 2.)) * exp(-uTap.z*1.6);
    off += normalize(dv + 1e-4) * ring * .022;
  }

  float wipe = S(.06, .55, texture2D(uWipe, uv).r);
  float fog = uFog * (1. - clamp(clear + wipe, 0., 1.));
  float blur = 1. + fog*.85;

  vec3 col = scene(p + off, blur);
  col = mix(col, col*.62 + vec3(.066,.074,.092)*(1.25 - uLate*.55), fog);
  col += rainAir(p, t) * uRain * 1.7 * (1. - fog*.7) * (.7 + .5*uC1);

  // now and then a car goes past and its headlights rake across the wet glass
  float ct = fract(t/13.);
  float cx = mix(-1.6, 1.6, ct*3.2)*asp*.5;
  float sweep = exp(-pow((p.x - cx)/.22, 2.)) * step(ct, .3125) * S(.95, .15, uv.y);
  col += vec3(1.,.92,.78) * sweep * (.03 + fog*.09 + dropMask*.4) * (.4 + .6*uRain);
  col += snowAir(p, t) * uSnow * vec3(.85,.9,1.);
  col *= 1. - .22*dropMask*(1. - dropMask)*4.;
  col += vec3(.8,.9,1.)*dropMask*dropMask*.035;

  vec2 vg = (uv - .5)*vec2(1.1, 1.);
  col *= 1. - .9*pow(length(vg), 2.4);
  col *= uDim;
  col = 1. - exp(-col*1.3);
  col += (h21(gl_FragCoord.xy + fract(t)*91.) - .5)*.03;
  gl_FragColor = vec4(col, 1.);
}`;

  const PALETTES = {
    sodium: [[1.0, 0.58, 0.22], [1.0, 0.86, 0.62], [0.95, 0.2, 0.12], [0.42, 0.85, 0.6]],
    neon: [[1.0, 0.2, 0.6], [0.55, 0.75, 1.0], [1.0, 0.55, 0.25], [0.9, 0.9, 1.0]],
    cold: [[0.68, 0.82, 1.0], [1.0, 1.0, 1.0], [1.0, 0.75, 0.45], [0.55, 0.65, 0.95]],
    mono: [[1.0, 1.0, 1.0], [0.8, 0.8, 0.8], [0.62, 0.62, 0.62], [0.9, 0.9, 0.9]],
  };

  const NUM = ['rain', 'snow', 'late', 'fog', 'sign', 'leaves', 'dim'];
  const state = { rain: 0.7, snow: 0, late: 0.8, fog: 1, sign: 1, leaves: 0, dim: 1, pal: PALETTES.sodium.map((c) => c.slice()), signCol: [1, 1, 1] };
  const target = { rain: 0.7, snow: 0, late: 0.8, fog: 1, sign: 1, leaves: 0, dim: 1, pal: PALETTES.sodium.map((c) => c.slice()), signCol: [1, 1, 1] };

  const canvas = document.getElementById('weather');
  const leafCv = document.getElementById('leaves');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let gl = null;
  let prog = null;
  const U = {};
  let wipeTex = null;
  let scale = 0.75;
  let paused = false;
  let time = 40;
  let last = 0;
  let slow = 0;
  let frames = 0;

  /* ---------- the wipe mask: where a hand has cleared the glass ---------- */
  const wipeCv = document.createElement('canvas');
  wipeCv.width = 256;
  wipeCv.height = 144;
  const wctx = wipeCv.getContext('2d');
  wctx.fillStyle = '#000';
  wctx.fillRect(0, 0, 256, 144);
  let wipeHot = 0; // frames of fading still to do
  let wipeTick = 0;

  function wipeAt(cx, cy, radius) {
    const x = (cx / window.innerWidth) * 256;
    const y = (cy / window.innerHeight) * 144;
    const r = ((radius || Math.max(60, window.innerWidth * 0.07)) / window.innerWidth) * 256;
    const g = wctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    wctx.globalCompositeOperation = 'lighter';
    wctx.fillStyle = g;
    wctx.beginPath();
    wctx.ellipse(x, y, r, r * (144 / 256) * (window.innerWidth / window.innerHeight), 0, 0, 6.2832);
    wctx.fill();
    wipeHot = 2400;
  }

  function fadeWipe() {
    if (wipeHot <= 0) return false;
    wipeHot--;
    if (++wipeTick % 6 === 0) {
      wctx.globalCompositeOperation = 'source-over';
      wctx.fillStyle = 'rgba(0,0,0,0.02)';
      wctx.fillRect(0, 0, 256, 144);
    }
    return true;
  }

  /* ---------- WebGL ---------- */
  function initGL() {
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) ||
        canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return false;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader failed');
      return s;
    };
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
    } catch (e) {
      console.warn('weather shader unavailable:', e.message);
      gl = null;
      return false;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uRain', 'uSnow', 'uLate', 'uFog', 'uDrift', 'uSign', 'uSignY', 'uDim', 'uC0', 'uC1', 'uC2', 'uC3', 'uSignCol', 'uSignBox', 'uTap', 'uWipe']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    wipeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, wipeTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wipeCv);
    gl.uniform1i(U.uWipe, 0);
    return true;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (gl) {
      canvas.width = Math.max(2, Math.round(w * dpr * scale));
      canvas.height = Math.max(2, Math.round(h * dpr * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    leafCv.width = w;
    leafCv.height = h;
  }

  function drawGL() {
    if (!gl) return;
    if (fadeWipe() || wipeHot === 2399) {
      gl.bindTexture(gl.TEXTURE_2D, wipeTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wipeCv);
    }
    const doc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uRain, state.rain);
    gl.uniform1f(U.uSnow, state.snow);
    gl.uniform1f(U.uLate, state.late);
    gl.uniform1f(U.uFog, state.fog);
    gl.uniform1f(U.uDrift, (window.scrollY / doc) * 0.16);
    gl.uniform1f(U.uSign, state.sign);
    gl.uniform1f(U.uSignY, -(window.scrollY / window.innerHeight) * 0.75);
    gl.uniform1f(U.uDim, state.dim);
    gl.uniform3fv(U.uC0, state.pal[0]);
    gl.uniform3fv(U.uC1, state.pal[1]);
    gl.uniform3fv(U.uC2, state.pal[2]);
    gl.uniform3fv(U.uC3, state.pal[3]);
    gl.uniform3fv(U.uSignCol, state.signCol);
    gl.uniform3f(U.uSignBox, signBox[0], signBox[1], signBox[2]);
    gl.uniform3f(U.uTap, tap.x, tap.y, Math.min(9, (performance.now() - tap.at) / 1000));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- leaves ---------- */
  const lctx = leafCv.getContext('2d');
  const leaves = [];
  const LEAF_COLS = ['#c8641e', '#e39a2f', '#8d3b1c', '#d9b24a', '#6e2f18', '#b8862b'];
  const MAPLE = [[0, -1], [0.25, -0.45], [0.8, -0.6], [0.55, -0.1], [1, 0.15], [0.45, 0.3], [0.5, 0.8], [0, 0.55], [-0.5, 0.8], [-0.45, 0.3], [-1, 0.15], [-0.55, -0.1], [-0.8, -0.6], [-0.25, -0.45]];
  const tap = { x: 0, y: 0, at: -1e6 };
  const signBox = [0.69, 0.15, 0.21]; // centre height, half width, half height: a tall rectangle
  let wind = 0;
  let lastScroll = window.scrollY;
  let leavesDrawn = false;

  function spawnLeaf(anywhere) {
    const z = 0.35 + Math.random() * 0.95;
    leaves.push({
      x: Math.random() * leafCv.width,
      y: anywhere ? Math.random() * leafCv.height : -40,
      z,
      vx: (Math.random() - 0.5) * 30,
      vy: 38 + Math.random() * 55,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 2.4,
      ph: Math.random() * 6.28,
      kind: Math.random() < 0.6 ? 0 : 1,
      col: LEAF_COLS[(Math.random() * LEAF_COLS.length) | 0],
    });
  }

  function drawLeaves(dt) {
    const want = reduced.matches ? 0 : Math.round(state.leaves * 34);
    if (leaves.length < want && Math.random() < dt * 5) spawnLeaf(false);
    if (!leaves.length) {
      if (leavesDrawn) { lctx.clearRect(0, 0, leafCv.width, leafCv.height); leavesDrawn = false; }
      return;
    }
    const sc = window.scrollY;
    const ds = sc - lastScroll;
    lastScroll = sc;
    wind *= 0.96;
    lctx.clearRect(0, 0, leafCv.width, leafCv.height);
    leavesDrawn = true;
    const H = leafCv.height;
    const W = leafCv.width;
    for (let i = leaves.length - 1; i >= 0; i--) {
      const l = leaves[i];
      l.x += (l.vx + Math.sin(time * 1.3 + l.ph) * 42 * l.z + wind * l.z) * dt;
      l.y += l.vy * l.z * dt - ds * l.z * 0.45;
      l.rot += l.vr * dt;
      if (l.y > H + 60 || l.y < -160 || l.x < -80 || l.x > W + 80 || (leaves.length > want + 4 && l.y > H * 0.9)) {
        leaves.splice(i, 1);
        continue;
      }
      const size = 13 * l.z;
      const flip = Math.cos(time * 1.8 + l.ph);
      lctx.save();
      lctx.translate(l.x, l.y);
      lctx.rotate(l.rot);
      lctx.scale(size * (0.25 + 0.75 * Math.abs(flip)) * (flip < 0 ? -1 : 1), size);
      lctx.globalAlpha = Math.min(1, 0.35 + l.z * 0.55);
      lctx.fillStyle = l.col;
      lctx.beginPath();
      if (l.kind === 0) {
        lctx.moveTo(0, -1);
        lctx.bezierCurveTo(0.7, -0.6, 0.7, 0.5, 0, 1);
        lctx.bezierCurveTo(-0.7, 0.5, -0.7, -0.6, 0, -1);
      } else {
        lctx.moveTo(MAPLE[0][0], MAPLE[0][1]);
        for (let k = 1; k < MAPLE.length; k++) lctx.lineTo(MAPLE[k][0], MAPLE[k][1]);
        lctx.closePath();
      }
      lctx.fill();
      lctx.globalAlpha *= 0.6;
      lctx.fillStyle = '#1a0d06';
      lctx.fillRect(-0.04, -0.8, 0.08, 2.1);
      lctx.restore();
    }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    requestAnimationFrame(frame);
    if (paused || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!reduced.matches) time += dt;
    const k = 1 - Math.exp(-dt * 2.4);
    for (const n of NUM) state[n] += (target[n] - state[n]) * k;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) state.pal[i][j] += (target.pal[i][j] - state.pal[i][j]) * k;
    for (let j = 0; j < 3; j++) state.signCol[j] += (target.signCol[j] - state.signCol[j]) * k;
    drawGL();
    drawLeaves(dt);

    // if this machine cannot keep up, draw fewer pixels
    if (gl) {
      frames++;
      if (dt > 0.03) slow++;
      if (frames >= 90) {
        if (slow > 45 && scale > 0.36) { scale *= 0.8; resize(); }
        frames = 0;
        slow = 0;
      }
    }
  }

  let lastPX = null;
  window.addEventListener('pointermove', (e) => {
    if (lastPX !== null) wind += (e.clientX - lastPX) * 0.9;
    wind = Math.max(-260, Math.min(260, wind));
    lastPX = e.clientX;
    if (target.fog > 0.08 && !paused) wipeAt(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    tap.x = (e.clientX / window.innerWidth - 0.5) * (window.innerWidth / window.innerHeight);
    tap.y = 1 - e.clientY / window.innerHeight;
    tap.at = performance.now();
    if (target.fog > 0.08 && !paused) wipeAt(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('resize', resize);

  const ok = initGL();
  document.documentElement.classList.toggle('no-gl', !ok);
  resize();
  requestAnimationFrame(frame);

  window.Weather = {
    ok,
    palettes: PALETTES,
    state,
    /* Move toward new weather. Any of: rain, snow, late, fog, sign, leaves, dim (numbers), pal (four rgb triples), signCol. */
    set(w) {
      for (const n of NUM) if (typeof w[n] === 'number') target[n] = w[n];
      if (w.pal) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) target.pal[i][j] = w.pal[i][j];
      if (w.signCol) for (let j = 0; j < 3; j++) target.signCol[j] = w.signCol[j];
    },
    wipeAt,
    /* Where the neon rectangle hangs, in screen heights measured from the bottom. */
    setSignBox(cy, hw, hh) { signBox[0] = cy; signBox[1] = hw; signBox[2] = hh; },
    pause(on) { paused = !!on; },
  };
})();
