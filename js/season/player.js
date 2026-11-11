/* Song snippets. Plays Apple's own 30-second previews, streamed straight from Apple; nothing is
   stored on this site but the links in previews.js. One clip at a time, with a small bar that
   says what is playing and links to the song on Apple Music.

   Snippets.play(albumId, trackNumber)      one clip
   Snippets.playAlbum(albumId, fromTrack)   that clip, then the rest of the album
   Snippets.playTitle(title)                by song title (also finds the EP tracks)
   Snippets.toggle(albumId, trackNumber)    play it, or stop it if it is the one playing
   Snippets.offerAlbum(albumId | null)      show an idle "play this album" bar (used inside the rooms)
   Snippets.stop(), Snippets.current(), Snippets.has(albumId, n), Snippets.onChange(fn) */
(function () {
  'use strict';

  const PREVIEWS = window.SEASON_PREVIEWS || {};
  const EXTRAS = window.SEASON_PREVIEW_EXTRAS || {};
  const ALBUMS = window.DISCOGRAPHY || [];

  const audio = new Audio();
  audio.preload = 'none';
  let cur = null;      // { albumId, n, title, from, link, url, id, mode, retried }
  let offered = null;  // album id shown while idle
  const subs = new Set();

  const albumOf = (id) => ALBUMS.find((a) => a.id === id);
  const has = (albumId, n) => !!(PREVIEWS[albumId] && PREVIEWS[albumId][n]);
  const playable = (a) => a.tracks.filter((t) => has(a.id, t.n));

  function begin(item, mode) {
    cur = Object.assign({ mode, retried: false }, item);
    audio.src = cur.url;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    try { document.dispatchEvent(new CustomEvent('season:music', { detail: 'snippets' })); } catch (e) { /* old browser */ }
    paint();
  }

  function play(albumId, n, mode) {
    const a = albumOf(albumId);
    const t = a && a.tracks.find((x) => x.n === n);
    if (!t || !has(albumId, n)) return false;
    const p = PREVIEWS[albumId][n];
    begin({ albumId, n, title: t.title, from: a.title, link: p.link, url: p.url, id: p.id }, mode || 'one');
    return true;
  }

  function playAlbum(albumId, fromN) {
    const a = albumOf(albumId);
    if (!a) return false;
    const list = playable(a);
    const first = list.find((t) => t.n >= (fromN || 1)) || list[0];
    return first ? play(albumId, first.n, 'album') : false;
  }

  function playTitle(title) {
    for (const a of ALBUMS) {
      const t = a.tracks.find((x) => x.title === title);
      if (t && has(a.id, t.n)) return play(a.id, t.n, 'one');
    }
    const x = EXTRAS[title];
    if (!x) return false;
    begin({ albumId: null, n: 0, title, from: '', link: x.link, url: x.url, id: x.id }, 'one');
    return true;
  }

  function hasTitle(title) {
    return !!EXTRAS[title] || ALBUMS.some((a) => a.tracks.some((t) => t.title === title && has(a.id, t.n)));
  }

  function next() {
    if (!cur || cur.mode !== 'album') { stop(); return; }
    const list = playable(albumOf(cur.albumId));
    const nx = list[list.findIndex((t) => t.n === cur.n) + 1];
    if (nx) play(cur.albumId, nx.n, 'album'); else stop();
  }

  function stop() {
    if (!cur) return;
    audio.pause();
    cur = null;
    paint();
  }

  function toggle(albumId, n, mode) {
    if (cur && cur.albumId === albumId && cur.n === n) { stop(); return false; }
    return mode === 'album' ? playAlbum(albumId, n) : play(albumId, n);
  }

  audio.addEventListener('ended', next);
  audio.addEventListener('error', () => {
    if (!cur) return;
    const c = cur;
    const giveUp = () => { if (cur === c) next(); };
    if (c.retried || !window.fetch) { giveUp(); return; }
    c.retried = true; // preview links move now and then: ask Apple where this one lives today
    fetch('https://itunes.apple.com/lookup?id=' + c.id)
      .then((r) => r.json())
      .then((d) => {
        const u = d && d.results && d.results[0] && d.results[0].previewUrl;
        if (!u) throw new Error('no preview');
        if (cur !== c) return;
        audio.src = u;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      })
      .catch(giveUp);
  });

  // the car radio and this player take turns
  document.addEventListener('season:music', (e) => { if (e.detail !== 'snippets') stop(); });
  if (window.Sound) window.Sound.onChange((on) => { if (!on) stop(); });

  /* ---------- the bar ---------- */

  const css = `
.snip { position: fixed; z-index: 70; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 12px;
  max-width: min(440px, calc(100vw - 32px)); padding: 9px 14px 11px 9px; background: rgba(8, 10, 15, 0.86); color: #eef2f5;
  border: 1px solid rgba(238, 242, 245, 0.28); font: 400 14px/1.3 inherit; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.snip[hidden] { display: none; }
body[data-snippet-pos='top'] .snip { left: 50%; bottom: auto; top: 10px; transform: translateX(-50%); }
body[data-snippet-pos='top'][data-era='noacf'] .snip { top: 58px; }
.snip__btn { flex: none; width: 34px; height: 34px; padding: 0; border: 1px solid currentColor; background: none; color: inherit; cursor: pointer; display: grid; place-items: center; }
.snip__btn:hover { background: #eef2f5; color: #06080d; }
.snip__btn:focus-visible, .snip__link:focus-visible { outline: 2px solid #ffa24a; outline-offset: 2px; }
.snip__btn i { display: block; width: 11px; height: 11px; background: currentColor; }
.snip.is-idle .snip__btn i { width: 0; height: 0; background: none; border-left: 12px solid currentColor; border-top: 7px solid transparent; border-bottom: 7px solid transparent; margin-left: 3px; }
.snip__text { min-width: 0; display: grid; }
.snip__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snip__from { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; opacity: 0.7; }
.snip__link { flex: none; color: inherit; font-size: 12.5px; opacity: 0.8; text-underline-offset: 3px; white-space: nowrap; }
.snip__link:hover { opacity: 1; }
.snip.is-idle .snip__link { display: none; }
.snip__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: rgba(238, 242, 245, 0.16); }
.snip__bar b { display: block; height: 100%; width: 0; background: #ffa24a; }
.snip.is-idle .snip__bar { display: none; }
@media (max-width: 520px) { .snip__link { display: none; } .snip { left: 10px; bottom: 10px; } }
`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.className = 'snip';
  bar.hidden = true;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Song snippet');
  bar.innerHTML = '<button type="button" class="snip__btn"><i></i></button>' +
    '<span class="snip__text"><span class="snip__title"></span><span class="snip__from"></span></span>' +
    '<a class="snip__link" target="_blank" rel="noopener">Apple Music</a>' +
    '<span class="snip__bar"><b></b></span>';
  const btn = bar.querySelector('.snip__btn');
  const titleEl = bar.querySelector('.snip__title');
  const fromEl = bar.querySelector('.snip__from');
  const linkEl = bar.querySelector('.snip__link');
  const fill = bar.querySelector('.snip__bar b');
  const attach = () => document.body.appendChild(bar);
  if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach);

  btn.addEventListener('click', () => {
    if (cur) stop();
    else if (offered) playAlbum(offered, 1);
  });
  audio.addEventListener('timeupdate', () => {
    const d = audio.duration && isFinite(audio.duration) ? audio.duration : 30;
    fill.style.width = Math.min(100, (audio.currentTime / d) * 100).toFixed(1) + '%';
  });

  function paint() {
    if (cur) {
      bar.hidden = false;
      bar.classList.remove('is-idle');
      titleEl.textContent = cur.title;
      fromEl.textContent = '30-second preview' + (cur.from ? ', from ' + cur.from : '');
      linkEl.href = cur.link;
      linkEl.setAttribute('aria-label', cur.title + ' on Apple Music (opens in a new tab)');
      btn.setAttribute('aria-label', 'Stop the snippet');
      fill.style.width = '0%';
    } else if (offered && albumOf(offered)) {
      bar.hidden = false;
      bar.classList.add('is-idle');
      titleEl.textContent = 'Play this album';
      fromEl.textContent = '30-second previews of each song';
      btn.setAttribute('aria-label', 'Play 30-second previews of ' + albumOf(offered).title);
    } else {
      bar.hidden = true;
    }
    subs.forEach((fn) => { try { fn(cur); } catch (e) { console.error(e); } });
  }

  window.Snippets = {
    play, playAlbum, playTitle, toggle, stop, has, hasTitle,
    current: () => cur,
    offerAlbum(id) { offered = id || null; paint(); },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
})();
