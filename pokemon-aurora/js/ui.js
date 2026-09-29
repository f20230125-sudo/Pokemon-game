'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  UI: windows, dialogue with typewriter + line scroll, choices, menus, bars
// ─────────────────────────────────────────────────────────────────────────────
const FRAMES = [
  { name: 'Aurora', a: '#6ab8e8', b: '#3a70c0', edge: '#1e2a4a', inner: '#dff2fb' },
  { name: 'Ember', a: '#f0a060', b: '#c85838', edge: '#3a1e18', inner: '#fbe8dc' },
  { name: 'Moss', a: '#88d078', b: '#3e9050', edge: '#1a3420', inner: '#e4f6dc' },
  { name: 'Dusk', a: '#b898e8', b: '#6a50b0', edge: '#241a40', inner: '#ece4fa' },
];
const UI = {
  frame() { return FRAMES[(window.G && G.options && G.options.frame) || 0]; },
  // rounded window: dark edge, two-tone bevelled frame band, inner rule, warm fill
  box(c, x, y, w, h, o = {}) {
    const f = o.frame || UI.frame();
    const fill = o.fill || '#fbfaf6';
    const R = (xx, yy, ww, hh, col) => { c.fillStyle = col; c.fillRect(xx, yy, ww, hh); };
    R(x + 2, y, w - 4, h, f.edge); R(x, y + 2, w, h - 4, f.edge); R(x + 1, y + 1, w - 2, h - 2, f.edge);
    const hh = Math.floor((h - 2) / 2);
    R(x + 2, y + 1, w - 4, hh, f.a); R(x + 1, y + 2, w - 2, hh - 1, f.a);
    R(x + 2, y + 1 + hh, w - 4, h - 2 - hh, f.b); R(x + 1, y + 1 + hh, w - 2, h - 3 - hh, f.b);
    R(x + 3, y + 1, w - 6, 1, Col.light(f.a, 1.2));
    R(x + 3, y + h - 2, w - 6, 1, Col.shade(f.b, 0.6));
    R(x + 3, y + 3, w - 6, h - 6, Col.shade(f.b, 0.9));
    R(x + 4, y + 3, w - 8, h - 6, f.inner); R(x + 3, y + 4, w - 6, h - 8, f.inner);
    R(x + 4, y + 4, w - 8, h - 8, fill);
    if (!o.flat && h > 14) { R(x + 4, y + h - 6, w - 8, 2, Col.mix(fill, f.inner, 0.5)); R(x + 4, y + 4, w - 8, 1, '#ffffff'); }
  },
  plain(c, x, y, w, h, fill = '#f8f8f6', edge = '#505868') {
    c.fillStyle = edge; c.fillRect(x + 1, y, w - 2, h); c.fillRect(x, y + 1, w, h - 2);
    c.fillStyle = fill; c.fillRect(x + 1, y + 1, w - 2, h - 2);
  },
  cursor(c, x, y) { Font.draw(c, '▶', x + (Math.floor(Game.frame / 16) % 2), y, '#404048', '#d0d0c8'); },
  hpColor(r) { return r > 0.5 ? ['#58d080', '#70f8a8'] : r > 0.2 ? ['#c8a808', '#f8e038'] : ['#c83838', '#f85838']; },
  hpBar(c, x, y, w, ratio, small) {
    ratio = clamp(ratio, 0, 1);
    const h = small ? 6 : 7;
    const R = (xx, yy, ww, hh, col) => { c.fillStyle = col; c.fillRect(xx, yy, ww, hh); };
    R(x + 1, y, w + 16, h, '#2a2c3a'); R(x, y + 1, w + 18, h - 2, '#2a2c3a');
    R(x + 1, y + 1, 15, h - 2, '#f0b830'); R(x + 1, y + 1, 15, 1, '#fff0a0'); R(x + 1, y + h - 2, 15, 1, '#c88a18');
    Tiny.draw(c, 'HP', x + 4, y + (small ? 0 : 1), '#5a2e04');
    R(x + 17, y + 1, w, h - 2, '#4a4c5c'); R(x + 17, y + 1, w, 1, '#3a3c4a');
    const [d, l] = UI.hpColor(ratio);
    const fw = Math.ceil(w * ratio);
    if (fw > 0) {
      R(x + 17, y + 1, fw, h - 2, l);
      R(x + 17, y + 1, fw, 1, Col.mix(l, '#ffffff', 0.55));
      R(x + 17, y + h - 2, fw, 1, d);
      if (fw > 3) R(x + 18, y + 2, Math.min(fw - 2, 6), 1, 'rgba(255,255,255,0.5)');
    }
  },
  expBar(c, x, y, w, ratio) {
    const R = (xx, yy, ww, hh, col) => { c.fillStyle = col; c.fillRect(xx, yy, ww, hh); };
    R(x + 1, y, w, 4, '#2a2c3a'); R(x, y + 1, w + 2, 2, '#2a2c3a');
    R(x + 1, y + 1, w, 2, '#d8e2ee');
    const fw = Math.floor(w * clamp(ratio, 0, 1));
    if (fw > 0) { R(x + 1, y + 1, fw, 2, '#3c94f0'); R(x + 1, y + 1, fw, 1, '#88c8ff'); }
  },
  typeBadge(c, t, x, y, w = 34) {
    const col = TYPE_COLOR[t];
    c.fillStyle = Col.shade(col, 1.2); c.fillRect(x, y, w, 11);
    c.fillStyle = col; c.fillRect(x + 1, y + 1, w - 2, 9);
    c.fillStyle = Col.light(col); c.fillRect(x + 1, y + 1, w - 2, 1);
    const tn = TYPE_NAME(t); Tiny.draw(c, tn, Math.round(x + w / 2 - Tiny.width(tn) / 2) + 1, y + 4, Col.shade(col, 1.6)); Tiny.draw(c, tn, Math.round(x + w / 2 - Tiny.width(tn) / 2), y + 3, '#ffffff');
  },
  statusTag(c, st, x, y) {
    const map = { psn: ['PSN', '#a040a0'], tox: ['PSN', '#8a2a8a'], brn: ['BRN', '#e06030'], par: ['PAR', '#c8a820'], slp: ['SLP', '#8a8a98'], frz: ['FRZ', '#58b8d0'], fnt: ['FNT', '#c83838'] };
    const m = map[st]; if (!m) return;
    c.fillStyle = Col.shade(m[1]); c.fillRect(x, y, 22, 9);
    c.fillStyle = m[1]; c.fillRect(x + 1, y + 1, 20, 7);
    Font.drawC(c, m[0], x + 11, y + 1, '#ffffff', null);
  },
  // dark band behind battle text / menus, with a themed window on top
  battlePanel(c, x = 0, w = 256) {
    c.fillStyle = '#1c2236'; c.fillRect(0, 144, 256, 48);
    c.fillStyle = '#2a3250'; c.fillRect(0, 144, 256, 1);
    UI.box(c, x + 2, 146, w - 4, 44);
  },
  gender(c, g, x, y) { if (g === 'm') Font.draw(c, '♂', x, y, '#3870e0', '#b8c8f0'); else if (g === 'f') Font.draw(c, '♀', x, y, '#e04868', '#f0b8c8'); },
  subst(t) {
    if (!window.G) return t;
    return t.replace(/\{PLAYER\}/g, G.name || 'Ash').replace(/\{RIVAL\}/g, 'Sable');
  },
};

// ── dialogue ────────────────────────────────────────────────────────────────
const TEXT_COLORS = {
  n: ['#404048', '#d0d0c8'], m: ['#3060c8', '#b8c8f0'], f: ['#d03858', '#f0c0c8'], w: ['#f8f8f8', '#707078'], s: ['#6a6a78', '#d8d8dc'], v: ['#5a3a8a', '#d8c8f0'],
};
class Say {
  constructor(text, o = {}) {
    this.o = o;
    this.done = false;
    const maxW = o.w ? o.w - 32 : 218;
    this.lines = Font.wrap(UI.subst(String(text)), maxW);
    this.name = o.name ? UI.subst(o.name) : null;
    this.top = 0;
    this.typing = 0;        // line index being typed
    this.chars = 0;
    this.scroll = 0;
    this.waiting = false;
    this.t = 0;
    this.speed = o.speed || [0.6, 1.2, 2.5][(window.G && G.options && G.options.textSpeed != null) ? G.options.textSpeed : 1];
    this.col = TEXT_COLORS[o.color || 'n'] || TEXT_COLORS.n;
  }
  get lineFull() { return this.chars >= (this.lines[this.typing] || '').length; }
  update() {
    this.t++;
    if (this.scroll > 0) {
      this.scroll -= 2;
      if (this.scroll <= 0) { this.scroll = 0; this.top++; this.typing = this.top + 1; this.chars = 0; }
      return;
    }
    const lastVisible = Math.min(this.lines.length - 1, this.top + 1);
    if (!this.waiting) {
      if (Input.confirm() || (Input.held('b') && this.o.skippable !== false && this.t > 4)) { // fast-forward
        this.typing = lastVisible; this.chars = this.lines[lastVisible].length; this.waiting = true; this.waitT = 0; return;
      }
      this.chars += this.speed;
      if (this.lineFull) {
        if (this.typing < lastVisible) { this.typing++; this.chars = 0; }
        else { this.waiting = true; this.waitT = 0; }
      }
      return;
    }
    // waiting for input
    this.waitT++;
    const more = this.top + 2 < this.lines.length;
    const adv = Input.confirm() || Input.cancel() || (this.o.auto && this.waitT >= this.o.auto) || (this.o.hold && Input.held('a') && this.waitT > 20);
    if (!more && this.o.noWait) { this.done = true; return; }
    if (adv) {
      if (more) { this.scroll = 16; this.waiting = false; Sound.sfx('text'); }
      else { this.done = true; if (!this.o.auto) Sound.sfx('text'); }
    }
  }
  draw(c) {
    const x = this.o.x != null ? this.o.x : 4, y = this.o.y != null ? this.o.y : 144, w = this.o.w || 248, h = 44;
    if (this.o.battle) {
      // battle message box: dark frame, full width
      UI.battlePanel(c);
    } else UI.box(c, x, y, w, h);
    if (this.name) {
      const nw = Font.width(this.name) + 14;
      UI.box(c, x + 4, y - 15, nw, 17);
      Font.draw(c, this.name, x + 11, y - 10, this.col[0], this.col[1]);
    }
    c.save();
    c.beginPath(); c.rect(x + 4, y + 4, w - 8, h - 8); c.clip();
    const lx = x + 12, ly = y + 8;
    for (let i = this.top; i <= Math.min(this.typing, this.top + 2); i++) {
      const rel = i - this.top;
      let yy = ly + rel * 16;
      if (this.scroll > 0) yy -= (16 - this.scroll);
      let s = this.lines[i] || '';
      if (i === this.typing && !this.waiting) s = s.slice(0, Math.floor(this.chars));
      if (i > this.typing) s = '';
      Font.draw(c, s, lx, yy, this.col[0], this.col[1]);
    }
    c.restore();
    if (this.waiting && !this.o.auto && !this.o.noWait) {
      const b = Math.floor(this.t / 10) % 2;
      Font.draw(c, '▼', x + w - 18, y + h - 15 + b, '#e05848', '#f0c0b0');
    }
  }
}

class Choice {
  // o: {x,y,w, cancel (index returned on B), under (widget drawn below)}
  constructor(items, o = {}) {
    this.items = items; this.o = o; this.i = o.start || 0; this.done = false;
  }
  update() {
    if (Input.repeat('up')) { this.i = (this.i + this.items.length - 1) % this.items.length; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.i = (this.i + 1) % this.items.length; Sound.sfx('cursor'); }
    if (Input.confirm()) { this.result = this.i; this.done = true; Sound.sfx('select'); }
    else if (Input.cancel() && this.o.cancel != null) { this.result = this.o.cancel; this.done = true; Sound.sfx('cancel'); }
  }
  draw(c) {
    if (this.o.under) this.o.under.draw(c);
    const w = this.o.w || Math.max(...this.items.map(s => Font.width(s))) + 30;
    const h = this.items.length * 15 + 12;
    const x = this.o.x != null ? this.o.x : 252 - w, y = this.o.y != null ? this.o.y : 140 - h;
    UI.box(c, x, y, w, h);
    this.items.forEach((s, k) => {
      Font.draw(c, s, x + 18, y + 8 + k * 15);
      if (k === this.i) UI.cursor(c, x + 8, y + 8 + k * 15);
    });
  }
}

// say(...) helpers used by scripts
function say(text, o) { return new Say(text, o); }
function* ask(text, items = ['Yes', 'No'], o = {}) {
  const s = new Say(text, Object.assign({ noWait: true }, o));
  yield s;
  s.waiting = true; s.o.noWait = true;
  const ch = new Choice(items, { under: s, cancel: o.cancel != null ? o.cancel : items.length - 1 });
  return yield ch;
}
function* sayAll(lines, o) { for (const l of lines) yield new Say(l, o); }

// generic list menu used by many screens (scrollable)
class ListMenu {
  constructor(items, o = {}) {
    this.items = items; this.o = o; this.i = o.start || 0; this.scroll = 0; this.done = false;
    this.rows = o.rows || 8;
  }
  update() {
    const n = this.items.length;
    if (!n) { if (Input.cancel() || Input.confirm()) { this.done = true; this.result = -1; } return; }
    if (Input.repeat('up')) { this.i = (this.i + n - 1) % n; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.i = (this.i + 1) % n; Sound.sfx('cursor'); }
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + this.rows) this.scroll = this.i - this.rows + 1;
    if (Input.confirm()) { this.done = true; this.result = this.i; Sound.sfx('select'); }
    else if (Input.cancel()) { this.done = true; this.result = -1; Sound.sfx('cancel'); }
    if (this.o.onMove) this.o.onMove(this.i);
  }
  draw(c) {
    const { x = 120, y = 8, w = 128 } = this.o;
    const h = Math.min(this.rows, this.items.length) * 14 + 14;
    UI.box(c, x, y, w, Math.max(h, 28));
    for (let k = 0; k < this.rows && k + this.scroll < this.items.length; k++) {
      const it = this.items[k + this.scroll];
      const label = typeof it === 'string' ? it : it.label;
      Font.draw(c, label, x + 18, y + 8 + k * 14, it.dim ? '#a0a0a8' : '#404048');
      if (it.right) Font.drawR(c, it.right, x + w - 10, y + 8 + k * 14);
      if (k + this.scroll === this.i) UI.cursor(c, x + 8, y + 8 + k * 14);
    }
    if (this.scroll > 0) Font.drawC(c, '▲', x + w / 2, y + 1, '#e05848', null);
    if (this.scroll + this.rows < this.items.length) Font.drawC(c, '▼', x + w / 2, y + h - 9 + (Math.floor(Game.frame / 12) % 2), '#e05848', null);
  }
}

// location banner (slides down from top)
class Banner {
  constructor(text) { this.text = text; this.t = 0; }
  update() { this.t++; }
  get alive() { return this.t < 150; }
  draw(c) {
    const w = Math.max(96, Font.width(this.text) + 34);
    let y = -28;
    if (this.t < 16) y = lerp(-28, 5, Ease.out(this.t / 16));
    else if (this.t < 120) y = 5;
    else y = lerp(5, -28, Ease.in((this.t - 120) / 30));
    y = Math.round(y);
    const f = UI.frame();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(8, y + 3, w, 22);
    c.fillStyle = f.edge; c.fillRect(7, y, w, 22); c.fillRect(6, y + 1, w + 2, 20);
    c.fillStyle = '#fcf9f0'; c.fillRect(8, y + 1, w - 2, 10); c.fillStyle = '#efe8d6'; c.fillRect(8, y + 11, w - 2, 10);
    c.fillStyle = '#ffffff'; c.fillRect(8, y + 1, w - 2, 1); c.fillStyle = '#d8ceb6'; c.fillRect(8, y + 20, w - 2, 1);
    c.fillStyle = f.b; c.fillRect(7, y + 1, 7, 20); c.fillStyle = f.a; c.fillRect(7, y + 1, 7, 10); c.fillStyle = Col.light(f.a, 1); c.fillRect(8, y + 2, 1, 8);
    c.fillStyle = '#ffffff'; c.fillRect(9, y + 9, 3, 3); c.fillStyle = f.edge; c.fillRect(10, y + 10, 1, 1);
    Font.draw(c, this.text, 20, y + 6);
  }
}
