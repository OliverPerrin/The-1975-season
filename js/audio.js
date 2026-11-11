/* Shared sound. Off until the visitor turns it on; nothing here plays recorded music,
   only synthesised tones and noise. Each room gets its own bus so leaving a room silences it. */
(function () {
  'use strict';

  let ac = null;
  let master = null;
  let enabled = false;
  const listeners = new Set();

  function ensure() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = enabled ? 0.9 : 0;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      master.connect(comp).connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function set(on) {
    enabled = !!on;
    if (enabled) ensure();
    if (master) {
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(enabled ? 0.9 : 0, t, 0.08);
    }
    listeners.forEach((fn) => { try { fn(enabled); } catch (e) { console.error(e); } });
  }

  /* A scoped facade. Everything a room plays goes through `out`, which the shell
     disconnects when the room is left. */
  function scope() {
    let bus = null;
    const subs = new Set();

    function out() {
      if (!enabled) return null;
      const c = ensure();
      if (!c) return null;
      if (!bus) { bus = c.createGain(); bus.gain.value = 1; bus.connect(master); }
      return bus;
    }

    function tone(o) {
      const dest = out();
      if (!dest) return null;
      o = o || {};
      const t0 = ac.currentTime + (o.when || 0);
      const dur = o.dur == null ? 0.4 : o.dur;
      const attack = o.attack == null ? 0.006 : o.attack;
      const release = o.release == null ? 0.3 : o.release;
      const peak = o.gain == null ? 0.18 : o.gain;
      const osc = ac.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq || 440, t0);
      if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + dur);
      if (o.detune) osc.detune.value = o.detune;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + attack);
      g.gain.setValueAtTime(peak, t0 + Math.max(attack, dur - release));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, dur));
      let tail = g;
      if (o.pan && ac.createStereoPanner) {
        const p = ac.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, o.pan));
        g.connect(p);
        tail = p;
      }
      osc.connect(g);
      tail.connect(dest);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      return osc;
    }

    function noise(o) {
      const dest = out();
      if (!dest) return null;
      o = o || {};
      const t0 = ac.currentTime + (o.when || 0);
      const dur = o.dur == null ? 0.25 : o.dur;
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = o.type || 'lowpass';
      f.frequency.value = o.freq || 1200;
      f.Q.value = o.q == null ? 0.7 : o.q;
      const g = ac.createGain();
      const peak = o.gain == null ? 0.12 : o.gain;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + (o.attack == null ? 0.004 : o.attack));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(dest);
      src.start(t0);
      return src;
    }

    return {
      get enabled() { return enabled; },
      /* AudioContext, or null while sound is off. */
      get ctx() { return enabled ? ensure() : null; },
      /* GainNode to connect your own graph into, or null while sound is off. */
      get out() { return out(); },
      tone,
      noise,
      /* fn(enabled) fires whenever the visitor toggles sound. Returns an unsubscribe. */
      onChange(fn) {
        listeners.add(fn);
        subs.add(fn);
        return () => { listeners.delete(fn); subs.delete(fn); };
      },
      _dispose() {
        subs.forEach((fn) => listeners.delete(fn));
        subs.clear();
        if (bus) {
          const b = bus;
          bus = null;
          try {
            b.gain.setTargetAtTime(0, ac.currentTime, 0.05);
            setTimeout(() => { try { b.disconnect(); } catch (e) {} }, 400);
          } catch (e) {}
        }
      },
    };
  }

  window.Sound = {
    get enabled() { return enabled; },
    set,
    toggle() { set(!enabled); return enabled; },
    scope,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
