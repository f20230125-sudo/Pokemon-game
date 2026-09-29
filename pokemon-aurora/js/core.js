'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Core: canvas, input, math helpers, coroutines, scene stack, main loop
// ─────────────────────────────────────────────────────────────────────────────
const W = 256, H = 192, TS = 16;

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
}
addEventListener('resize', fitCanvas);
fitCanvas();

// ── math ────────────────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = n => Math.floor(Math.random() * n);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const Ease = {
  out: t => 1 - (1 - t) * (1 - t),
  in: t => t * t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  cubicOut: t => 1 - Math.pow(1 - t, 3),
};
function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  c.ctx = x;
  return c;
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ── input ───────────────────────────────────────────────────────────────────
const Input = (() => {
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', KeyJ: 'a', KeyX: 'b', Backspace: 'b', Escape: 'b', KeyK: 'b', Enter: 'start', KeyM: 'start',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'run'];
  const raw = {}, tap = {}, held = {}, pressed = {}, holdT = {};
  const dirOrder = [];
  const typed = [];
  function press(b) {
    if (!raw[b]) { tap[b] = true; if (DIRS[b]) { const i = dirOrder.indexOf(b); if (i >= 0) dirOrder.splice(i, 1); dirOrder.push(b); } }
    raw[b] = true;
  }
  function release(b) { raw[b] = false; }
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) return;
    const b = KEYMAP[e.code];
    if (e.key && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) typed.push(e.key);
    if (b) { press(b); e.preventDefault(); }
    if (typeof Sound !== 'undefined') Sound.unlock();
  });
  addEventListener('keyup', e => { const b = KEYMAP[e.code]; if (b) release(b); });
  addEventListener('blur', () => { for (const k in raw) raw[k] = false; });
  // touch buttons
  addEventListener('DOMContentLoaded', setupTouch);
  function setupTouch() {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) document.body.classList.add('touch');
    document.querySelectorAll('.tbtn').forEach(el => {
      const b = el.dataset.b;
      const on = e => { e.preventDefault(); press(b); el.classList.add('on'); if (typeof Sound !== 'undefined') Sound.unlock(); };
      const off = e => { e.preventDefault(); release(b); el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    });
  }
  if (document.readyState !== 'loading') setupTouch();
  canvas.addEventListener('pointerdown', () => { if (typeof Sound !== 'undefined') Sound.unlock(); });
  return {
    update() {
      for (const b of BTN) {
        const r = !!raw[b];
        pressed[b] = !!tap[b] || (r && !held[b]);
        held[b] = r;
        holdT[b] = r ? (holdT[b] || 0) + 1 : 0;
        tap[b] = false;
      }
      for (let i = dirOrder.length - 1; i >= 0; i--) if (!raw[dirOrder[i]]) dirOrder.splice(i, 1);
    },
    held: b => !!held[b],
    pressed: b => !!pressed[b],
    repeat: b => !!pressed[b] || (holdT[b] > 16 && holdT[b] % 4 === 0),
    confirm: () => !!(pressed.a || pressed.start),
    cancel: () => !!pressed.b,
    dir() { for (let i = dirOrder.length - 1; i >= 0; i--) if (held[dirOrder[i]]) return dirOrder[i]; return null; },
    holdTime: b => holdT[b] || 0,
    clear() { for (const b of BTN) { pressed[b] = false; tap[b] = false; } typed.length = 0; },
    typed() { const t = typed.slice(); typed.length = 0; return t; },
    // used by automated tests
    _press: press, _release: release,
  };
})();

// ── coroutines ──────────────────────────────────────────────────────────────
// A script is a generator that yields "waiters": objects with update() that set
// .done (and optionally .result). Waiters with a draw() are rendered by the
// scene that owns the coroutine until they finish.
class Wait {
  constructor(n) { this.n = n; this.done = n <= 0; }
  update() { if (--this.n <= 0) this.done = true; }
}
class Until {
  constructor(fn) { this.fn = fn; this.done = false; }
  update() { if (this.fn()) this.done = true; }
}
class Par {
  // runs several waiters / generators at once, done when all are done
  constructor(list, owner) {
    this.items = list.map(x => (x && typeof x.next === 'function') ? new Co(x, owner) : (typeof x === 'number' ? new Wait(x) : x)).filter(Boolean);
    this.done = this.items.length === 0;
    this.owner = owner;
  }
  update() {
    let all = true;
    for (const it of this.items) {
      if (it instanceof Co) { if (!it.done) it.update(); if (!it.done) all = false; }
      else { if (!it.done) it.update(); if (!it.done) all = false; }
    }
    if (all) this.done = true;
  }
  draw(c) { for (const it of this.items) if (!it.done && it.draw) it.draw(c); }
}
class Co {
  constructor(gen, owner) { this.gen = gen; this.owner = owner; this.w = null; this.done = false; this.fresh = false; this.result = undefined; }
  update() {
    let guard = 0;
    while (!this.done && guard++ < 500) {
      if (this.w) {
        if (this.fresh) { this.fresh = false; return; }
        if (!this.w.done) this.w.update();
        if (!this.w.done) return;
        const res = this.w.result;
        this.detach();
        this.step(res);
      } else this.step(undefined);
    }
  }
  detach() {
    if (this.w && this.owner && this.owner.widgets) {
      const i = this.owner.widgets.indexOf(this.w);
      if (i >= 0) this.owner.widgets.splice(i, 1);
    }
    this.w = null;
  }
  step(v) {
    const r = this.gen.next(v);
    if (r.done) { this.done = true; this.result = r.value; return; }
    let w = r.value;
    if (w == null) w = new Wait(1);
    else if (typeof w === 'number') w = new Wait(w);
    else if (typeof w.next === 'function') w = new Co(w, this.owner);
    this.w = w; this.fresh = true;
    if (w.start) w.start();
    if (w.draw && this.owner && this.owner.widgets && !(w instanceof Co)) this.owner.widgets.push(w);
    if (w instanceof Co) { this.fresh = false; }
  }
  draw(c) { if (this.w && this.w.draw && this.w instanceof Co) this.w.draw(c); }
}

// ── scene stack ─────────────────────────────────────────────────────────────
const Game = {
  scenes: [], frame: 0, fadeA: 0, fadeColor: '#000', shakeX: 0, shakeY: 0, shakeT: 0, shakeMag: 0,
  push(s) { s.widgets = s.widgets || []; s.closed = false; this.scenes.push(s); if (s.enter) s.enter(); return s; },
  pop(result) {
    const s = this.scenes.pop();
    if (!s) return;
    s.result = result; s.closed = true;
    if (s.exit) s.exit();
    const t = this.top();
    if (t && t.resume) t.resume(s);
    return s;
  },
  replaceAll(s) { while (this.scenes.length) { const x = this.scenes.pop(); if (x.exit) x.exit(); } return this.push(s); },
  top() { return this.scenes[this.scenes.length - 1]; },
  shake(mag, frames) { this.shakeMag = mag; this.shakeT = frames; },
  update() {
    const s = this.top();
    if (s) s.update();
    if (this.shakeT > 0) {
      this.shakeT--;
      const m = this.shakeMag * Math.min(1, this.shakeT / 6);
      this.shakeX = Math.round((Math.random() * 2 - 1) * m);
      this.shakeY = Math.round((Math.random() * 2 - 1) * m);
    } else { this.shakeX = this.shakeY = 0; }
    this.frame++;
  },
  draw() {
    let i = this.scenes.length - 1;
    while (i > 0 && !this.scenes[i].opaque) i--;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    for (; i < this.scenes.length; i++) {
      const s = this.scenes[i];
      if (i < 0) continue;
      s.draw(ctx);
      if (s.widgets) for (const w of s.widgets) w.draw(ctx);
    }
    ctx.restore();
    if (this.fadeA > 0) {
      ctx.globalAlpha = Math.min(1, this.fadeA);
      ctx.fillStyle = this.fadeColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};

// waits for a pushed scene to close, returning its result
class SceneWait {
  constructor(scene) { this.scene = scene; this.done = false; }
  start() { Game.push(this.scene); }
  update() { if (this.scene.closed) { this.done = true; this.result = this.scene.result; } }
}
class Fade {
  constructor(to, frames = 16, color = '#000') { this.to = to; this.frames = Math.max(1, frames); this.color = color; this.done = false; }
  start() { this.from = Game.fadeA; this.t = 0; Game.fadeColor = this.color; }
  update() {
    this.t++;
    Game.fadeA = lerp(this.from, this.to, Math.min(1, this.t / this.frames));
    if (this.t >= this.frames) this.done = true;
  }
}
const fadeOut = (f = 16, c = '#000') => new Fade(1, f, c);
const fadeIn = (f = 16) => new Fade(0, f, Game.fadeColor);

// ── main loop (fixed 60 Hz step) ────────────────────────────────────────────
const Loop = {
  last: 0, acc: 0, step: 1000 / 60, running: false, errors: [],
  start() {
    this.running = true;
    const tick = ts => {
      if (!this.last) this.last = ts;
      this.acc += Math.min(250, ts - this.last);
      this.last = ts;
      let n = 0;
      try {
        while (this.acc >= this.step && n < 5) {
          Input.update();
          Game.update();
          this.acc -= this.step; n++;
        }
        if (n > 0) Game.draw();
      } catch (e) {
        console.error(e);
        this.errors.push(String(e && e.stack || e));
        this.acc = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  // deterministic stepping for tests
  advance(frames) { for (let i = 0; i < frames; i++) { Input.update(); Game.update(); } Game.draw(); },
};
window.addEventListener('error', e => { Loop.errors.push(String(e.message) + ' @' + e.filename + ':' + e.lineno); });
