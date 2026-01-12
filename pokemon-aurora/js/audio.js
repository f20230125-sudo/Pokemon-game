'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Chiptune audio: pulse/triangle/noise synth, MML sequencer, SFX and cries
// ─────────────────────────────────────────────────────────────────────────────
const Sound = (() => {
  let ac = null, master, musicBus, sfxBus, noiseBuf, waves = {}, analyser = null;
  let unlocked = false;
  const vol = { music: 0.55, sfx: 0.7 };

  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ac = null; return; }
    master = ac.createDynamicsCompressor();
    master.threshold.value = -14; master.ratio.value = 3;
    const out = ac.createGain(); out.gain.value = 0.9;
    master.connect(out); out.connect(ac.destination);
    analyser = ac.createAnalyser(); analyser.fftSize = 2048; out.connect(analyser);
    musicBus = ac.createGain(); musicBus.gain.value = vol.music; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    // pulse waves via fourier series
    for (const [name, duty] of [['p12', 0.125], ['p25', 0.25], ['p50', 0.5]]) {
      const n = 64, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(2 * k * Math.PI * duty) * 0.5; im[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * k * Math.PI * duty)) * 0.5; }
      waves[name] = ac.createPeriodicWave(re, im);
    }
    // soft triangle-ish bass (NES-like stepped triangle)
    {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k += 2) im[k] = (8 / (Math.PI * Math.PI)) * ((((k - 1) / 2) % 2) ? -1 : 1) / (k * k);
      waves.tri = ac.createPeriodicWave(re, im);
    }
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 1;
    for (let i = 0; i < d.length; i++) { // NES-ish LFSR noise
      const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = (lfsr & 1) ? 0.8 : -0.8;
    }
  }
  function unlock() {
    if (!ac) init();
    if (ac && ac.state === 'suspended') ac.resume();
    if (!unlocked && ac) { unlocked = true; if (pendingTrack) { const t = pendingTrack; pendingTrack = null; cur = null; play(t, { restart: true }); } }
  }
  const noteFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function osc(type, freq, t0, dur, gain, bus, o = {}) {
    const g = ac.createGain();
    const oN = ac.createOscillator();
    if (waves[type]) oN.setPeriodicWave(waves[type]); else oN.type = type;
    oN.frequency.setValueAtTime(freq, t0);
    if (o.slide) oN.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + (o.slideT || dur));
    if (o.vib && dur > 0.25) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(freq * 0.012, t0 + Math.min(dur, 0.35));
      l.connect(lg); lg.connect(oN.frequency); l.start(t0); l.stop(t0 + dur + 0.1);
    }
    const a = o.a || 0.004, rel = o.r != null ? o.r : 0.03;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + a);
    if (o.decay) g.gain.setTargetAtTime(gain * (o.sus != null ? o.sus : 0.6), t0 + a, o.decay);
    g.gain.setValueAtTime(o.decay ? gain * (o.sus != null ? o.sus : 0.6) : gain, t0 + Math.max(a, dur - rel));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    oN.connect(g); g.connect(bus);
    oN.start(t0); oN.stop(t0 + dur + 0.02);
    return oN;
  }
  function noise(t0, dur, gain, bus, o = {}) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    src.playbackRate.value = o.rate || 1;
    if (o.rateTo) src.playbackRate.exponentialRampToValueAtTime(o.rateTo, t0 + dur);
    const f = ac.createBiquadFilter(); f.type = o.filter || 'highpass'; f.frequency.value = o.freq || 1000;
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  }
  function drum(kind, t0, v, bus) {
    switch (kind) {
      case 'k': osc('sine', 150, t0, 0.14, 0.9 * v, bus, { slide: 40, slideT: 0.12 }); noise(t0, 0.03, 0.25 * v, bus, { freq: 800 }); break;
      case 's': noise(t0, 0.13, 0.5 * v, bus, { freq: 1600, filter: 'bandpass' }); osc('p50', 220, t0, 0.05, 0.25 * v, bus, { slide: 120 }); break;
      case 'h': noise(t0, 0.035, 0.22 * v, bus, { freq: 7000 }); break;
      case 'o': noise(t0, 0.16, 0.2 * v, bus, { freq: 6000 }); break;
      case 't': osc('tri', 200, t0, 0.14, 0.6 * v, bus, { slide: 90 }); break;
      case 'c': noise(t0, 0.5, 0.25 * v, bus, { freq: 4000 }); break;
    }
  }

  // ── MML compiler ──
  // channels: '@N' duty (0=12.5,1=25,2=50,3=tri,4=sine), 'v' volume 0-15, 'o' octave, '<' '>' , 'l' length,
  // notes a-g with +/#/-, 'r' rest, '&' tie, '[..]n' loop, 'L' loop point, 'q' gate 1-8, 'y' vibrato on/off (y1/y0)
  // drum channels (starting with '%'): k s h o t c r with lengths
  function compile(src) {
    let s = src.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    const drumMode = s[0] === '%';
    if (drumMode) s = s.slice(1);
    // expand loops
    const expand = str => {
      let out = '', i = 0;
      while (i < str.length) {
        if (str[i] === '[') {
          let depth = 1, j = i + 1;
          while (j < str.length && depth) { if (str[j] === '[') depth++; else if (str[j] === ']') depth--; j++; }
          const inner = str.slice(i + 1, j - 1);
          let k = j, num = '';
          while (k < str.length && /\d/.test(str[k])) num += str[k++];
          const n = num ? +num : 2;
          const body = expand(inner);
          for (let r = 0; r < n; r++) out += body + ' ';
          i = k;
        } else out += str[i++];
      }
      return out;
    };
    s = expand(s);
    const ev = [];
    let t = 0, oct = 4, len = 8, v = 12, duty = 1, gate = 7, vib = 0, loopAt = null;
    let i = 0;
    const num = () => { let n = ''; while (i < s.length && /\d/.test(s[i])) n += s[i++]; return n ? +n : null; };
    const readLen = () => {
      const n = num(); let d = 4 / (n || len);
      let dd = d;
      while (s[i] === '.') { dd /= 2; d += dd; i++; }
      return d;
    };
    while (i < s.length) {
      const ch = s[i++];
      if (ch === ' ') continue;
      if (ch === 'o') { oct = num(); continue; }
      if (ch === '<') { oct--; continue; }
      if (ch === '>') { oct++; continue; }
      if (ch === 'l') { len = num(); continue; }
      if (ch === 'v') { v = num(); continue; }
      if (ch === '@') { duty = num(); continue; }
      if (ch === 'q') { gate = num(); continue; }
      if (ch === 'y') { vib = num(); continue; }
      if (ch === 'L') { loopAt = t; continue; }
      if (ch === '&') { // tie: extend previous
        const d = readLen(); if (ev.length) ev[ev.length - 1].dur += d; t += d; continue;
      }
      if (drumMode) {
        if ('ksh otc'.includes(ch) || ch === 'r') {
          const d = readLen();
          if (ch !== 'r') ev.push({ t, dur: d, drum: ch, v });
          t += d;
        }
        continue;
      }
      if ('cdefgab'.includes(ch)) {
        let semi = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[ch];
        while (s[i] === '+' || s[i] === '#' || s[i] === '-') { semi += s[i] === '-' ? -1 : 1; i++; }
        const d = readLen();
        ev.push({ t, dur: d, midi: 12 * (oct + 1) + semi, v, duty, gate, vib });
        t += d;
        continue;
      }
      if (ch === 'r') { t += readLen(); continue; }
    }
    return { ev, len: t, loopAt: loopAt == null ? 0 : loopAt, drum: drumMode };
  }

  // ── sequencer ──
  let cur = null, pendingTrack = null, timer = null;
  const compiled = {};
  function getTrack(name) {
    if (compiled[name]) return compiled[name];
    const tr = typeof MUSIC !== 'undefined' && MUSIC[name];
    if (!tr) return null;
    const chans = tr.ch.map(compile);
    compiled[name] = { name, bpm: tr.bpm, chans, loop: tr.loop !== false, gain: tr.gain || 1 };
    return compiled[name];
  }
  function play(name, o = {}) {
    if (!name) return stop();
    if (cur && cur.name === name && !o.restart) return;
    if (!ac || !unlocked) { pendingTrack = name; if (cur) stop(); cur = { name, fake: true }; return; }
    stop();
    const tr = getTrack(name);
    if (!tr) return;
    const bus = ac.createGain(); bus.gain.value = tr.gain; bus.connect(musicBus);
    const spb = 60 / tr.bpm;
    cur = { name, tr, bus, spb, start: ac.currentTime + 0.06, pos: tr.chans.map(() => ({ i: 0, base: 0 })), onEnd: o.onEnd, ended: false };
    schedule();
    timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!cur || cur.fake) return;
    const ahead = ac.currentTime + 0.2;
    const { tr, spb } = cur;
    let allDone = true;
    tr.chans.forEach((ch, ci) => {
      const p = cur.pos[ci];
      if (!ch.ev.length) return;
      let guard = 0;
      while (guard++ < 400) {
        if (p.i >= ch.ev.length) {
          if (!tr.loop) break;
          const loopLen = ch.len - ch.loopAt;
          const first = ch.ev.findIndex(e => e.t >= ch.loopAt);
          if (loopLen <= 0 || first < 0) break;
          p.base += loopLen;
          p.i = first;
        }
        const e = ch.ev[p.i];
        const when = cur.start + (e.t + p.base) * spb;
        if (when > ahead) { allDone = false; break; }
        if (when >= ac.currentTime - 0.05) playEvent(e, when, spb, cur.bus);
        p.i++;
      }
      if (p.i < ch.ev.length || tr.loop) allDone = false;
    });
    if (allDone && !cur.ended) {
      cur.ended = true;
      const lenBeats = Math.max(...tr.chans.map(c => c.len));
      const endAt = cur.start + lenBeats * spb;
      const cb = cur.onEnd;
      const me = cur;
      setTimeout(() => { if (cur === me) { if (cb) cb(); } }, Math.max(0, (endAt - ac.currentTime) * 1000));
    }
  }
  const DUTY = ['p12', 'p25', 'p50', 'tri', 'sine', 'sawtooth'];
  let evCount = 0;
  function playEvent(e, when, spb, bus) {
    evCount++;
    const dur = e.dur * spb;
    if (e.drum) { drum(e.drum, when, e.v / 15, bus); return; }
    const type = DUTY[e.duty] || 'p25';
    const g = (e.v / 15) * (type === 'tri' ? 0.5 : type === 'sine' ? 0.35 : 0.16);
    const gd = dur * (e.gate / 8);
    osc(type, noteFreq(e.midi), when, Math.max(0.03, gd), g, bus, { vib: e.vib, decay: type === 'tri' ? 0 : 0.25, sus: 0.75, r: Math.min(0.04, gd * 0.3) });
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (cur && cur.bus) { const b = cur.bus; try { b.gain.setTargetAtTime(0, ac.currentTime, 0.02); setTimeout(() => b.disconnect(), 200); } catch (e) {} }
    cur = null;
  }
  function fadeOut(ms = 600) {
    if (!cur || !cur.bus || !ac) { stop(); return; }
    const b = cur.bus, me = cur;
    b.gain.setTargetAtTime(0, ac.currentTime, ms / 4000);
    setTimeout(() => { if (cur === me) stop(); }, ms);
  }
  // play a one-shot jingle, then resume the given track
  function jingle(name, resume) {
    play(name, { restart: true, onEnd: () => { if (resume) play(resume, { restart: true }); } });
    if (!ac || !unlocked) { if (resume) setTimeout(() => play(resume), 50); }
  }
  function current() { return cur ? cur.name : null; }

  // ── sound effects ──
  function sfx(name, o = {}) {
    if (!ac || !unlocked) return;
    const t = ac.currentTime + 0.01, b = sfxBus;
    const N = n => noteFreq(n);
    switch (name) {
      case 'cursor': osc('p50', N(84), t, 0.035, 0.12, b); break;
      case 'select': osc('p25', N(81), t, 0.05, 0.14, b); osc('p25', N(88), t + 0.05, 0.07, 0.14, b); break;
      case 'cancel': osc('p25', N(79), t, 0.05, 0.12, b); osc('p25', N(72), t + 0.05, 0.07, 0.12, b); break;
      case 'text': osc('p12', N(96), t, 0.02, 0.05, b); break;
      case 'bump': osc('p50', 90, t, 0.1, 0.2, b, { slide: 60 }); break;
      case 'door': noise(t, 0.12, 0.25, b, { freq: 1200, freqTo: 300 }); osc('tri', 180, t + 0.02, 0.12, 0.4, b, { slide: 120 }); break;
      case 'stairs': [0, 1, 2].forEach(i => osc('p25', N(72 - i * 3), t + i * 0.08, 0.06, 0.12, b)); break;
      case 'jump': osc('p25', N(60), t, 0.18, 0.15, b, { slide: N(84), slideT: 0.12 }); break;
      case 'land': noise(t, 0.06, 0.2, b, { freq: 600 }); break;
      case 'exclaim': osc('p25', N(88), t, 0.06, 0.16, b); osc('p25', N(93), t + 0.07, 0.12, 0.16, b); break;
      case 'grass': noise(t, 0.08, 0.12, b, { freq: 3000, filter: 'bandpass' }); break;
      case 'hit': noise(t, 0.12, 0.45, b, { freq: 400, filter: 'lowpass', rate: 0.6 }); osc('p50', 160, t, 0.08, 0.2, b, { slide: 60 }); break;
      case 'hitSuper': noise(t, 0.2, 0.55, b, { freq: 500, filter: 'lowpass', rate: 0.7 }); osc('p50', 220, t, 0.06, 0.2, b, { slide: 80 }); osc('p50', 180, t + 0.08, 0.1, 0.2, b, { slide: 50 }); break;
      case 'hitWeak': noise(t, 0.08, 0.3, b, { freq: 300, filter: 'lowpass', rate: 0.5 }); break;
      case 'faint': osc('p25', N(72), t, 0.5, 0.15, b, { slide: N(36), slideT: 0.5 }); break;
      case 'throw': noise(t, 0.3, 0.18, b, { freq: 2000, freqTo: 6000 }); break;
      case 'ballOpen': noise(t, 0.2, 0.3, b, { freq: 3000 }); osc('p12', N(96), t, 0.15, 0.1, b, { slide: N(72) }); break;
      case 'ballShake': osc('p50', N(55), t, 0.05, 0.2, b); noise(t, 0.05, 0.2, b, { freq: 900 }); break;
      case 'ballClick': osc('p25', N(84), t, 0.04, 0.2, b); osc('p25', N(79), t + 0.05, 0.05, 0.2, b); break;
      case 'ballIn': osc('p25', N(84), t, 0.25, 0.15, b, { slide: N(60), slideT: 0.25 }); break;
      case 'statUp': for (let i = 0; i < 6; i++) osc('p25', N(72 + i * 3), t + i * 0.045, 0.05, 0.12, b); break;
      case 'statDown': for (let i = 0; i < 6; i++) osc('p25', N(84 - i * 3), t + i * 0.045, 0.05, 0.12, b); break;
      case 'heal': for (let i = 0; i < 8; i++) osc('p12', N(76 + (i % 4) * 4), t + i * 0.05, 0.06, 0.1, b); break;
      case 'expTick': osc('p12', N(o.pitch || 80), t, 0.03, 0.06, b); break;
      case 'lowhp': osc('p50', N(88), t, 0.08, 0.1, b); osc('p50', N(88), t + 0.12, 0.08, 0.1, b); break;
      case 'run': [0, 1, 2, 3].forEach(i => osc('p25', N(76 - i * 4), t + i * 0.05, 0.05, 0.12, b)); break;
      case 'save': [72, 76, 79, 84].forEach((n, i) => osc('p25', N(n), t + i * 0.08, 0.1, 0.14, b)); break;
      case 'sparkle': [96, 100, 103, 108].forEach((n, i) => osc('p12', N(n), t + i * 0.04, 0.08, 0.06, b)); break;
      case 'whoosh': noise(t, 0.35, 0.2, b, { freq: 800, freqTo: 4000, filter: 'bandpass' }); break;
      case 'fire': noise(t, 0.4, 0.3, b, { freq: 1200, filter: 'bandpass', rate: 0.5 }); break;
      case 'water': noise(t, 0.35, 0.22, b, { freq: 2500, freqTo: 800, filter: 'bandpass' }); osc('sine', N(84), t, 0.2, 0.05, b, { slide: N(60) }); break;
      case 'thunder': noise(t, 0.5, 0.45, b, { freq: 200, filter: 'lowpass', rate: 0.4 }); for (let i = 0; i < 4; i++) osc('p50', N(90 - i * 7), t + i * 0.04, 0.05, 0.12, b); break;
      case 'zap': for (let i = 0; i < 5; i++) osc('p12', N(88 + (i % 2) * 7), t + i * 0.03, 0.03, 0.1, b); break;
      case 'leaf': noise(t, 0.2, 0.15, b, { freq: 5000 }); break;
      case 'psychic': osc('sine', N(72), t, 0.6, 0.12, b, { slide: N(84), slideT: 0.3, vib: 1 }); osc('sine', N(79), t, 0.6, 0.08, b, { vib: 1 }); break;
      case 'shadow': osc('sawtooth', N(40), t, 0.5, 0.08, b, { slide: N(30) }); noise(t, 0.4, 0.1, b, { freq: 400, filter: 'lowpass' }); break;
      case 'quake': noise(t, 0.8, 0.5, b, { freq: 150, filter: 'lowpass', rate: 0.3 }); break;
      case 'poison': for (let i = 0; i < 4; i++) osc('sine', N(60 + rand(12)), t + i * 0.08, 0.08, 0.1, b, { slide: N(70) }); break;
      case 'ice': for (let i = 0; i < 5; i++) osc('p12', N(96 + rand(8)), t + i * 0.05, 0.06, 0.07, b); break;
      case 'bite': noise(t, 0.08, 0.35, b, { freq: 1500 }); noise(t + 0.1, 0.08, 0.35, b, { freq: 1500 }); break;
      case 'wind': noise(t, 0.6, 0.18, b, { freq: 600, freqTo: 1800, filter: 'bandpass' }); break;
      case 'beam': osc('p12', N(84), t, 0.5, 0.1, b, { vib: 1 }); osc('p25', N(91), t, 0.5, 0.06, b); break;
      case 'evolveFlash': noise(t, 0.6, 0.3, b, { freq: 4000, freqTo: 800 }); osc('sine', N(96), t, 0.8, 0.12, b, { slide: N(108) }); break;
      case 'colorBurst': [60, 64, 67, 72, 76, 79, 84, 88, 91, 96].forEach((n, i) => osc('p12', N(n), t + i * 0.06, 0.3, 0.07, b, { vib: 1 })); break;
      case 'shimmer': [84, 88, 91, 96, 91, 88].forEach((n, i) => osc('sine', N(n), t + i * 0.07, 0.15, 0.06, b)); break;
      case 'chime': [84, 91, 96, 100].forEach((n, i) => osc('sine', N(n), t + i * 0.12, 0.9, 0.12, b, { decay: 0.3, sus: 0.2 })); break;
      case 'snore': osc('sawtooth', 70, t, 0.6, 0.08, b, { slide: 55 }); break;
      case 'machine': osc('sawtooth', 55, t, 0.8, 0.07, b, { vib: 1 }); noise(t, 0.8, 0.06, b, { freq: 200, filter: 'lowpass' }); break;
    }
  }

  // ── Pokémon cries: deterministic FM chirps per species ──
  function cry(id, o = {}) {
    if (!ac || !unlocked) return;
    const sp = SPECIES[id]; if (!sp) return;
    const rng = seeded(strHash(id) + 77);
    const weight = sp.wt || 20;
    const basePitch = clamp(84 - Math.log2(weight + 1) * 4.2 + (rng() * 8 - 4), 42, 88) + (o.faint ? -8 : 0);
    const t = ac.currentTime + 0.01;
    const segs = 2 + Math.floor(rng() * 3);
    let tt = t;
    const pitchMul = o.faint ? 0.75 : 1;
    const g = ac.createGain(); g.gain.value = 1.8; g.connect(sfxBus);
    for (let i = 0; i < segs; i++) {
      const d = 0.08 + rng() * 0.16;
      const p0 = noteFreq(basePitch + (rng() * 10 - 3)) * pitchMul;
      const p1 = noteFreq(basePitch + (rng() * 14 - 8) - (o.faint ? 10 : 0)) * pitchMul;
      const type = ['p12', 'p25', 'p50', 'sawtooth'][Math.floor(rng() * 4)];
      const car = ac.createOscillator();
      if (waves[type]) car.setPeriodicWave(waves[type]); else car.type = type;
      car.frequency.setValueAtTime(p0, tt); car.frequency.exponentialRampToValueAtTime(Math.max(30, p1), tt + d);
      const mod = ac.createOscillator(), mg = ac.createGain();
      mod.frequency.value = p0 * (0.5 + Math.floor(rng() * 4) * 0.5);
      mg.gain.value = p0 * (0.3 + rng() * 1.2);
      mod.connect(mg); mg.connect(car.frequency);
      const eg = ac.createGain();
      eg.gain.setValueAtTime(0, tt); eg.gain.linearRampToValueAtTime(0.16, tt + 0.01); eg.gain.setValueAtTime(0.14, tt + d * 0.7); eg.gain.linearRampToValueAtTime(0, tt + d);
      car.connect(eg); eg.connect(g);
      car.start(tt); car.stop(tt + d + 0.02); mod.start(tt); mod.stop(tt + d + 0.02);
      if (rng() < 0.4) noise(tt, d, 0.08, g, { freq: 2000 + rng() * 3000, filter: 'bandpass' });
      tt += d * (0.75 + rng() * 0.2);
    }
  }
  function setVolume(kind, v) { vol[kind] = v; if (kind === 'music' && musicBus) musicBus.gain.value = v; if (kind === 'sfx' && sfxBus) sfxBus.gain.value = v; }
  return { init, unlock, play, stop, fadeOut, jingle, sfx, cry, current, setVolume, compile, get ready() { return !!(ac && unlocked); }, get events() { return evCount; }, level() { if (!analyser) return null; const d = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(d); let pk = 0, sum = 0; for (const v of d) { pk = Math.max(pk, Math.abs(v)); sum += v * v; } return { peak: +pk.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(3) }; }, get state() { return ac ? ac.state : 'none'; } };
})();
