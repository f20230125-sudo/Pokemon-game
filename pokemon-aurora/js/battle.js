'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Battle scene: mechanics + presentation
// ─────────────────────────────────────────────────────────────────────────────
const EXP_MULT = 1.3;
const STAGE_MUL = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
const ACC_MUL = s => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
const ENEMY_BASE = { x: 184, y: 88 }, PLAYER_BASE = { x: 66, y: 146 };

class Side {
  constructor(S, isEnemy, party, trainer) {
    this.S = S; this.isEnemy = isEnemy; this.party = party; this.trainer = trainer;
    this.idx = Math.max(0, party.findIndex(m => !m.fainted));
    this.resetBattleState();
    this.vis = { offX: 0, offY: 0, hidden: false, scale: 1, blink: 0, tint: null, tintT: 0, tintMax: 1, warp: 0, shakeT: 0, shakeM: 0, sil: false, show: false, white: 0, faint: 0, red: 0 };
    this.shownHp = 0; this.infoX = 0; this.infoShow = false;
  }
  resetBattleState() { this.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }; this.vol = {}; this.faintHandled = false; }
  get mon() { return this.party[this.idx]; }
  base() { return this.isEnemy ? ENEMY_BASE : PLAYER_BASE; }
  sprite(frame = 0) { const m = this.mon; return PokeArt.get(m.sp, { back: !this.isEnemy, frame, shiny: m.shiny }); }
  drawPos() {
    const spr = this.sprite(0), b = this.base(), bb = spr.bb;
    const floatY = this.mon.S.float ? (this.isEnemy ? 10 : 6) : 0;
    const x = b.x - spr.width / 2 + this.vis.offX + (this.S.slide ? (this.isEnemy ? -this.S.slide * 220 : this.S.slide * 220) : 0);
    const y = b.y + (this.isEnemy ? 2 : 0) - bb.y1 - floatY + this.vis.offY;
    return { x, y, spr };
  }
  pos() {
    const { x, y, spr } = this.drawPos();
    return { x: x + spr.width / 2, y: y + (spr.bb.y0 + spr.bb.y1) / 2 };
  }
  name(lower) {
    const n = this.mon.name;
    if (!this.isEnemy) return n;
    const pre = this.S.wild ? 'the wild ' : 'the foe’s ';
    const s = pre + n;
    return lower ? s : s[0].toUpperCase() + s.slice(1);
  }
}

// ── battle backgrounds ──
// Painted once per environment into a 256×144 canvas: dithered sky, layered
// scenery with atmospheric perspective, textured ground. Platforms are cached
// sprites (grass / sand / rock / snow / tiles / crystal) with a visible rim.
const BattleBG = (() => {
  const cache = {};
  let X;
  const R = (x, y, w, h, col) => { X.fillStyle = col; X.fillRect(x, y, w, h); };
  // dithered vertical gradient through evenly spaced colours
  function dgrad(y0, y1, cols, x0 = 0, w = 256) {
    const h = y1 - y0; if (h <= 0) return;
    const id = X.getImageData(x0, y0, w, h), d = new Uint32Array(id.data.buffer), P = cols.map(Col.pack);
    for (let yy = 0; yy < h; yy++) {
      const t = (yy / Math.max(1, h - 1)) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(t)), f = t - i;
      for (let xx = 0; xx < w; xx++) d[yy * w + xx] = f > bayer(xx, yy) ? P[i + 1] : P[i];
    }
    X.putImageData(id, x0, y0);
  }
  // ridge line helper: fills from the ridge down to `bottom`
  function ridge(fn, col, bottom, o = {}) {
    for (let x = 0; x < 256; x++) {
      const y = Math.round(fn(x));
      R(x, y, 1, bottom - y, col);
      if (o.lit) { const d = fn(x + 1) - fn(x); if (d > 0.15) R(x, y, 1, o.litW || 2, o.lit); }
      if (o.shade) { const d = fn(x + 1) - fn(x); if (d < -0.25) R(x, y + 1, 1, 3, o.shade); }
      if (o.edge) R(x, y, 1, 1, o.edge);
      if (o.cap && y < o.cap.y) R(x, y, 1, Math.min(o.cap.y - y, 4 + ((x * 7) % 3)), o.cap.col);
    }
  }
  const peaks = (base, amp, seed, sharp = 1) => x => base - amp * (Math.abs(Math.sin(x * 0.021 + seed)) ** sharp * 0.7 + (Math.sin(x * 0.052 + seed * 2) + 1) * 0.18 + fbm(x / 22, seed, seed) * 0.35);
  const rolling = (base, amp, seed) => x => base - amp * (Math.sin(x * 0.03 + seed) * 0.5 + Math.sin(x * 0.071 + seed * 1.7) * 0.25 + fbm(x / 30, seed * 3, seed) * 0.6);
  function treeLine(y, cols, seed, o = {}) {
    const rng = seeded(seed), [c0, c1, c2] = cols;
    for (let x = -8; x < 264;) {
      const r = (o.r || 6) + rng() * (o.rv || 4), cy = y - r * 0.6 - rng() * (o.jit || 3);
      for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy) * 1.05); R(Math.round(x - w), Math.round(cy + dy), w * 2, 1, dy > r * 0.35 ? c1 : c0); }
      R(Math.round(x - r * 0.4), Math.round(cy - r * 0.75), Math.round(r * 0.55), 1, c2);
      R(Math.round(x - r * 0.6), Math.round(cy - r * 0.45), 2, 1, c2);
      x += r * (o.gap || 1.35);
    }
    R(0, Math.round(y), 256, 144, cols[1]);
  }
  function pines(y, cols, seed, snow) {
    const rng = seeded(seed), [c0, c1] = cols;
    for (let x = -4; x < 262;) {
      const h = 16 + rng() * 14, w = h * 0.36, top = y - h;
      for (let yy = 0; yy < h; yy++) { const hw = Math.round(w * (yy / h) + (yy % 5 === 4 ? 1 : 0)); R(Math.round(x - hw), Math.round(top + yy), hw * 2 + 1, 1, c0); R(Math.round(x + 1), Math.round(top + yy), hw, 1, c1); if (snow && yy % 5 === 0 && yy > 0) R(Math.round(x - hw), Math.round(top + yy), hw + 1, 1, '#f4f8ff'); }
      if (snow) R(Math.round(x), Math.round(top), 1, 2, '#ffffff');
      x += 7 + rng() * 6;
    }
    R(0, Math.round(y), 256, 144, cols[0]);
  }
  function cloud(cx, cy, s, col = '#ffffff', sh = '#d8e8f6') {
    const blobs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.65], [0.45, -0.3, 0.6], [1.6, 0.4, 0.45], [-1.6, 0.45, 0.4]];
    for (const [bx, by, r] of blobs) {
      const rr = r * s, x0 = cx + bx * s, y0 = cy + by * s;
      for (let dy = -rr; dy <= rr; dy++) { const w = Math.round(Math.sqrt(rr * rr - dy * dy) * 1.3); R(Math.round(x0 - w), Math.round(y0 + dy), w * 2, 1, dy > rr * 0.4 ? sh : col); }
    }
    R(Math.round(cx - s * 2), Math.round(cy + s * 0.8), Math.round(s * 4), 1, sh);
  }
  function stars(n, maxY, seed) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) { const x = Math.floor(r() * 256), y = Math.floor(r() * maxY), b = r(); R(x, y, 1, 1, b < 0.15 ? '#fff6c8' : b < 0.6 ? '#c8d4f8' : '#7888c0'); if (b < 0.05) { R(x - 1, y, 3, 1, 'rgba(220,230,255,0.5)'); R(x, y - 1, 1, 3, 'rgba(220,230,255,0.5)'); } }
  }
  function moon(x, y) { for (let dy = -6; dy <= 6; dy++) { const w = Math.round(Math.sqrt(36 - dy * dy)); R(x - w, y + dy, w * 2, 1, '#fff8d8'); } for (let dy = -5; dy <= 5; dy++) { const w = Math.round(Math.sqrt(25 - dy * dy)); R(x - w + 4, y + dy - 2, w * 2, 1, 'rgba(10,16,48,0.9)'); } }
  // textured ground: dithered gradient + perspective streaks
  function ground(y0, cols, streak, seed) {
    dgrad(y0, 144, cols);
    const rng = seeded(seed);
    for (let i = 0; i < 70; i++) {
      const t = rng(), y = Math.round(y0 + 2 + t * t * (143 - y0)), w = 2 + Math.round((1 + t * 6) * rng());
      R(Math.floor(rng() * 256), y, w, 1, i % 3 ? streak[0] : streak[1]);
    }
  }
  const ENVS = {
    grass(night) {
      if (night) { dgrad(0, 84, ['#070b26', '#111a48', '#1e2c66', '#2e4280']); stars(70, 60, 3); moon(214, 20); }
      else { dgrad(0, 84, ['#4e9ee8', '#6cb4f0', '#94ccf6', '#c4e6fa', '#e4f4fc']); cloud(40, 24, 7); cloud(150, 16, 5); cloud(226, 32, 6); cloud(102, 44, 3.5, '#f4faff'); }
      ridge(peaks(72, 38, 1.3, 2.2), night ? '#243462' : '#a4c8e6', 144, { lit: night ? '#34467a' : '#c8e0f4', litW: 3, shade: night ? '#1c2a54' : '#8cb2d6', cap: night ? null : { y: 42, col: '#f4faff' } });
      ridge(rolling(76, 8, 4), night ? '#1c3848' : '#7cbe78', 144, { lit: night ? '#284a58' : '#98d28c' });
      treeLine(84, night ? ['#16303a', '#10262e', '#22424c'] : ['#4a9a50', '#3a8442', '#6cba64'], 7, { r: 5, rv: 3 });
      ground(84, night ? ['#244a3c', '#1e4034', '#18362c'] : ['#94d474', '#86ca66', '#78be5a', '#6cb250'], night ? ['#2c5446', '#163028'] : ['#a4de84', '#62a84a'], 11);
    },
    forest(night) {
      dgrad(0, 92, night ? ['#08140e', '#0e2418', '#163422', '#1e4028'] : ['#2a5a3a', '#3c7a4a', '#62a064', '#9ccc86']);
      if (!night) for (let i = 0; i < 5; i++) { X.fillStyle = 'rgba(255,250,210,0.08)'; X.beginPath(); X.moveTo(10 + i * 56, 0); X.lineTo(26 + i * 56, 0); X.lineTo(62 + i * 56, 92); X.lineTo(40 + i * 56, 92); X.fill(); }
      const rng = seeded(21);
      // two depths of trunks
      for (const [n, cA, cB, w0] of [[10, night ? '#10281a' : '#48704a', night ? '#16301e' : '#5a845a', 3], [7, night ? '#0a1a10' : '#2e4a30', night ? '#12281a' : '#3e5e3e', 6]]) {
        for (let i = 0; i < n; i++) { const x = Math.floor(rng() * 256), w = w0 + Math.floor(rng() * 4); R(x, 10, w, 84, cA); R(x, 10, 1, 84, cB); R(x + w - 1, 10, 1, 84, Col.shade(cA, 0.5)); R(x - 2, 88, w + 4, 4, cA); }
      }
      // hanging canopy (bumpy lower edge)
      for (const [yb, c0, c1, c2, seed] of [[30, night ? '#0e2618' : '#2e6a3c', night ? '#0a1e12' : '#245a32', night ? '#16361e' : '#4e8e50', 5], [18, night ? '#0a1c10' : '#1e4a2a', night ? '#06100a' : '#163a20', night ? '#12281a' : '#347042', 9]]) {
        const r2 = seeded(seed);
        R(0, 0, 256, yb - 6, c1);
        for (let x = -6; x < 262;) { const r = 6 + r2() * 6, cy = yb - 6 + r2() * 5; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy) * 1.1); R(Math.round(x - w), Math.round(cy + dy), w * 2, 1, dy < -r * 0.3 ? c1 : c0); } R(Math.round(x - r * 0.3), Math.round(cy + r * 0.6), Math.round(r * 0.6), 1, c2); x += r * 1.4; }
      }
      treeLine(92, night ? ['#123020', '#0e2618', '#1c3e28'] : ['#3a7e44', '#2e6a3a', '#5aa058'], 13, { r: 5, rv: 3 });
      ground(92, night ? ['#1e3e2a', '#183424', '#122a1e'] : ['#6aae58', '#5ea24c', '#528e42'], night ? ['#28482e', '#0e2418'] : ['#80c268', '#44803a'], 17);
    },
    water(night) {
      if (night) { dgrad(0, 66, ['#070b26', '#121c4a', '#223470']); stars(60, 50, 5); moon(40, 18); }
      else { dgrad(0, 66, ['#4a9ae6', '#6ab2f0', '#9cd0f8', '#d4eefc']); cloud(60, 22, 6); cloud(190, 14, 4.5); cloud(236, 36, 3.5); }
      // distant island + lighthouse
      ridge(x => 64 - Math.max(0, 7 - Math.abs(x - 196) * 0.18) - fbm(x / 9, 2, 2) * 2, night ? '#1c2c50' : '#8ab0c8', 70);
      R(203, 48, 3, 12, night ? '#c8c0b8' : '#f4f0ea'); R(203, 52, 3, 2, '#e05050'); R(202, 46, 5, 2, '#3a3a48'); if (night) { X.fillStyle = 'rgba(255,240,160,0.35)'; X.fillRect(170, 46, 32, 2); }
      dgrad(66, 92, night ? ['#1a2c64', '#1e3674', '#244282', '#2a4c90'] : ['#5aaaf0', '#4a9ce8', '#3c8ade', '#347ed4']);
      const rng = seeded(8);
      for (let i = 0; i < 46; i++) { const t = rng(), y = Math.round(67 + t * t * 24), w = 2 + Math.round(t * 8 * rng()); R(Math.floor(rng() * 256), y, w, 1, night ? (i % 4 ? '#3a5aa0' : '#e8e0a8') : (i % 3 ? '#8ccaf8' : '#e4f6ff')); }
      R(0, 90, 256, 2, '#e8f6ff'); R(0, 92, 256, 1, '#b8dcf0');
      ground(93, night ? ['#6a6a78', '#5e5e6c', '#525262'] : ['#f2e2b0', '#eadaa2', '#e0cc92', '#d6c088'], night ? ['#7a7a88', '#4a4a58'] : ['#faf0cc', '#c8ae78'], 19);
    },
    cave() {
      dgrad(0, 92, ['#140c0a', '#22160f', '#342218', '#4a3222']);
      // stalactites
      const rng = seeded(31);
      for (let i = 0; i < 22; i++) { const x = rng() * 256, w = 3 + rng() * 7, h = 8 + rng() * 30, c = i % 2 ? '#2a1c14' : '#3a2a1e'; for (let yy = 0; yy < h; yy++) { const hw = Math.max(0, Math.round(w * (1 - yy / h))); R(Math.round(x - hw), yy, hw * 2 + 1, 1, c); R(Math.round(x - hw), yy, 1, 1, '#4e3a2a'); } }
      ridge(rolling(80, 12, 2), '#2e2018', 144, { lit: '#4a3628' });
      // glowing crystals in the rock
      for (const [x, y, c] of [[40, 72, '#f8a040'], [120, 64, '#e8783a'], [212, 76, '#f8b050'], [168, 60, '#ffcf80']]) {
        for (let r = 9; r > 0; r -= 3) { X.fillStyle = `rgba(255,150,70,${0.05 + (9 - r) * 0.012})`; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); X.fillRect(x - w, y - 3 + dy, w * 2 + 1, 1); } }
        R(x - 2, y - 2, 2, 4, Col.shade(c, 0.6)); R(x, y - 6, 2, 8, c); R(x + 2, y - 3, 2, 5, Col.shade(c, 0.4)); R(x, y - 6, 1, 3, '#fff0c0');
      }
      ground(92, ['#7a5c44', '#6c503a', '#5e4432', '#4e382a'], ['#8e6e52', '#3e2c20'], 23);
    },
    snow(night) {
      if (night) { dgrad(0, 80, ['#0a1236', '#1a2a60', '#3a4c88']); stars(60, 50, 9); }
      else { dgrad(0, 80, ['#7aa8dc', '#9cc0e8', '#c4daf2', '#e6f0fa']); cloud(70, 20, 5, '#ffffff', '#dde8f6'); cloud(200, 30, 6, '#ffffff', '#dde8f6'); }
      ridge(peaks(74, 44, 2.1, 1.6), night ? '#34467c' : '#b8cce6', 144, { lit: night ? '#5a6ca4' : '#f4f8ff', litW: 3, shade: night ? '#28386a' : '#98acd0', cap: { y: 44, col: night ? '#8a9ac8' : '#ffffff' } });
      ridge(peaks(80, 16, 5.2), night ? '#2a3a6a' : '#d4e0f2', 144, { lit: night ? '#4a5a90' : '#ffffff' });
      pines(88, night ? ['#1a3440', '#12262e'] : ['#2e6a5a', '#23564a'], 12, true);
      ground(88, night ? ['#6a78a8', '#5e6c9c', '#526090'] : ['#f6faff', '#eaf2fc', '#dce8f8', '#d0def4'], night ? ['#8a98c4', '#44527e'] : ['#ffffff', '#b8c8e4'], 29);
    },
    volcano() {
      dgrad(0, 84, ['#2a0e10', '#4a1a16', '#8a3420', '#d06030', '#f09048']);
      for (let i = 0; i < 4; i++) { X.fillStyle = `rgba(60,30,30,${0.35 - i * 0.06})`; X.beginPath(); X.ellipse(80 + i * 50, 16 + i * 6, 50, 7, 0, 0, Math.PI * 2); X.fill(); }
      ridge(x => { const d = Math.abs(x - 150); return d < 14 ? 26 + d * 0.2 : 28 + (d - 14) * 0.62 + fbm(x / 10, 1, 4) * 6; }, '#2a1614', 144, { lit: '#4a2420' });
      R(137, 26, 26, 2, '#f86820'); R(141, 24, 18, 2, '#ffb040');
      for (const [x0, len] of [[146, 26], [154, 18]]) for (let i = 0; i < len; i++) R(x0 + Math.round(Math.sin(i * 0.4) * 2 + i * 0.3), 28 + i, 2, 1, i % 4 ? '#f86820' : '#ffb040');
      ridge(peaks(80, 18, 3.3), '#3a2220', 144, { lit: '#5a3430' });
      ground(86, ['#8a6c5c', '#7c5e50', '#6c5046', '#5a423a'], ['#9e8070', '#44302a'], 31);
    },
    gym(night, accent = '#58a868') {
      dgrad(0, 76, ['#e8e6e0', '#dcd8d0', '#ccc6bc']);
      for (let x = 0; x < 256; x += 32) { R(x, 0, 3, 76, '#b8b2a6'); R(x + 3, 0, 1, 76, '#f4f2ec'); }
      R(0, 8, 256, 3, accent); R(0, 11, 256, 1, Col.shade(accent, 1));
      // banners
      for (const x of [44, 124, 204]) { R(x, 14, 16, 26, accent); R(x, 14, 16, 2, Col.light(accent, 0.8)); R(x + 1, 40, 14, 2, accent); X.fillStyle = accent; X.beginPath(); X.moveTo(x, 42); X.lineTo(x + 8, 48); X.lineTo(x + 16, 42); X.fill(); X.fillStyle = '#ffffff'; X.beginPath(); X.moveTo(x + 8, 20); X.lineTo(x + 13, 27); X.lineTo(x + 8, 34); X.lineTo(x + 3, 27); X.fill(); }
      R(0, 70, 256, 6, '#a8a092'); R(0, 70, 256, 1, '#c8c0b2');
      dgrad(76, 144, ['#f2eee6', '#e6e0d4', '#d8d0c2']);
      // court markings in perspective
      X.fillStyle = Col.mix(accent, '#ffffff', 0.4);
      for (let y = 76; y < 144; y++) { const t = (y - 76) / 68, hw = 60 + t * 140; R(Math.round(128 - hw), y, 2, 1, X.fillStyle); R(Math.round(128 + hw), y, 2, 1, X.fillStyle); }
      R(0, 108, 256, 1, Col.mix(accent, '#ffffff', 0.5));
    },
    plant() {
      dgrad(0, 80, ['#1e222c', '#2a2e3a', '#3a3e4a']);
      for (let x = 0; x < 256; x += 40) { R(x + 4, 0, 30, 70, '#343844'); R(x + 4, 0, 30, 2, '#4a4e5a'); for (let y = 8; y < 64; y += 10) { R(x + 8, y, 22, 5, '#262a34'); R(x + 9, y + 1, 6, 3, (x + y) % 3 ? '#40c080' : '#c04040'); } }
      for (const y of [12, 50]) { R(0, y, 256, 5, '#6a6e7a'); R(0, y, 256, 1, '#9a9eaa'); R(0, y + 4, 256, 1, '#44485a'); }
      for (let x = 0; x < 256; x += 8) { R(x, 72, 4, 4, '#e8c040'); R(x + 4, 72, 4, 4, '#2a2a30'); }
      dgrad(76, 144, ['#6e727e', '#62666f', '#555964']);
      for (let y = 80; y < 144; y += 10) R(0, y, 256, 1, '#4a4e58');
      for (let x = 0; x < 256; x += 24) R(x, 76, 1, 68, '#5a5e68');
    },
    spire() {
      dgrad(0, 90, ['#0e0e34', '#1e1a52', '#34307a', '#5a54a8']);
      stars(50, 60, 17);
      const hues = ['#f8a8c8', '#a8d8f8', '#c8b8f8', '#b8f8d0', '#f8e0a0'];
      const rng = seeded(41);
      for (let i = 0; i < 12; i++) {
        const cx = i * 23 + rng() * 10, h = 30 + rng() * 44, w = 6 + rng() * 6, c = hues[i % 5];
        X.fillStyle = Col.mix(c, '#3a3478', 0.45); X.beginPath(); X.moveTo(cx - w, 92); X.lineTo(cx, 92 - h); X.lineTo(cx + w, 92); X.fill();
        X.fillStyle = Col.mix(c, '#ffffff', 0.2); X.beginPath(); X.moveTo(cx - w, 92); X.lineTo(cx, 92 - h); X.lineTo(cx - w * 0.2, 92); X.fill();
        R(Math.round(cx), Math.round(92 - h), 1, 3, '#ffffff');
      }
      ground(90, ['#d4daf6', '#c4caee', '#b2b8e2', '#a0a6d6'], ['#eef0ff', '#8a90c8'], 43);
    },
    summit() {
      dgrad(0, 96, ['#04051a', '#0a0c30', '#161848', '#262462']);
      stars(110, 80, 23);
      // sea of clouds far below
      for (let i = 0; i < 9; i++) cloud(i * 34, 90 + (i % 2) * 3, 5, '#3a3a7a', '#2a2a64');
      ground(96, ['#dce0fa', '#ccd0f2', '#babfe8', '#a8aede'], ['#f4f6ff', '#8a90c8'], 47);
    },
  };
  function build(env, night, accent) {
    const key = env + (night ? 'N' : '') + (accent || '');
    if (cache[key]) return cache[key];
    const c = mkCanvas(256, 144); X = c.ctx;
    const f = ENVS[env] || ENVS.grass;
    f(night, accent || undefined);
    const e = { indoor: env === 'gym' || env === 'plant', cave: env === 'cave', snow: env === 'snow', embers: env === 'volcano', aurora: env === 'summit', crystal: env === 'spire', env, night, accent };
    cache[key] = { c, e };
    return cache[key];
  }
  // ── platforms ──
  const PLAT = {
    grass: { top: ['#a2dc82', '#8ed06c', '#7cc05a'], side: '#5a9a44', sideD: '#467e36', ring: '#b8ea98', tex: 'tuft', texC: ['#6cb454', '#c4f0a4'] },
    grassN: { top: ['#3e6e52', '#346046', '#2a523c'], side: '#1e3e2e', sideD: '#163024', ring: '#4a7e60', tex: 'tuft', texC: ['#284a38', '#58906e'] },
    forest: { top: ['#86c46a', '#74b45a', '#62a24c'], side: '#44803a', sideD: '#346a2e', ring: '#9ad27e', tex: 'tuft', texC: ['#58963e', '#aee090'] },
    water: { top: ['#f6e8bc', '#eedcaa', '#e2cc96'], side: '#c8ac78', sideD: '#a88c5c', ring: '#fcf4d8', tex: 'pebble', texC: ['#cdb07a', '#fffaea'] },
    cave: { top: ['#a88a6c', '#967a5c', '#84684e'], side: '#5e4634', sideD: '#48342a', ring: '#bea080', tex: 'pebble', texC: ['#6a5040', '#c8ac8c'] },
    snow: { top: ['#ffffff', '#f0f6ff', '#dee8f8'], side: '#b4c4e0', sideD: '#98aad0', ring: '#ffffff', tex: 'sparkle', texC: ['#c8d6ee', '#ffffff'] },
    volcano: { top: ['#a88a78', '#98786a', '#86685a'], side: '#5e443a', sideD: '#48322c', ring: '#bca08e', tex: 'pebble', texC: ['#6a4e42', '#f8a040'] },
    gym: { top: ['#fcfcfa', '#f2f0ec', '#e6e2da'], side: '#b8b2a6', sideD: '#9a9488', ring: null, tex: 'gym', texC: ['#58a868', '#ffffff'] },
    plant: { top: ['#a0a4b0', '#9094a0', '#80848f'], side: '#5a5e68', sideD: '#484c56', ring: '#b4b8c2', tex: 'metal', texC: ['#6a6e78', '#e8c040'] },
    spire: { top: ['#f4f6ff', '#e4e8fc', '#d0d6f4'], side: '#9ea6dc', sideD: '#8088c4', ring: '#ffffff', tex: 'prism', texC: ['#b8c0f0', '#ffffff'] },
    summit: { top: ['#eef0ff', '#dee2fa', '#cacff2'], side: '#8c94cc', sideD: '#7078b4', ring: '#ffffff', tex: 'prism', texC: ['#b0b8ec', '#ffffff'] },
  };
  const platCache = {};
  function platSprite(e, rx, ry) {
    const kind = e.env === 'grass' && e.night ? 'grassN' : (PLAT[e.env] ? e.env : 'grass');
    const key = kind + rx + (e.accent || '');
    if (platCache[key]) return platCache[key];
    const P = PLAT[kind], th = Math.max(3, Math.round(ry * 0.35));
    const cw = rx * 2 + 4, ch = ry * 2 + th + 4, cx = cw / 2, cy = ry + 2;
    const cv = mkCanvas(cw, ch), x = cv.ctx;
    const inE = (px, py, sx, sy, oy = 0) => { const dx = (px + 0.5 - cx) / sx, dy = (py + 0.5 - cy - oy) / sy; return dx * dx + dy * dy <= 1; };
    const id = x.createImageData(cw, ch), d = new Uint32Array(id.data.buffer);
    const pk = h => Col.pack(h);
    const top = P.top.map(pk), side = pk(P.side), sideD = pk(P.sideD), ring = P.ring && pk(P.ring);
    const acc = e.accent ? pk(e.accent) : pk(P.texC[0]), accL = e.accent ? pk(Col.mix(e.accent, '#ffffff', 0.6)) : pk(P.texC[1]);
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const i = py * cw + px;
      const onTop = inE(px, py, rx, ry);
      if (onTop) {
        const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry, r2 = dx * dx + dy * dy;
        let lvl = -dx * 0.35 - dy * 0.75 + (bayer(px, py) - 0.5) * 0.35;
        let c = lvl > 0.3 ? top[0] : lvl > -0.35 ? top[1] : top[2];
        if (ring && r2 > 0.52 && r2 < 0.62 && dy < 0.3) c = ring;
        if (P.tex === 'gym') { if (r2 > 0.55 && r2 < 0.68) c = acc; else if (r2 < 0.05) c = acc; else if (Math.abs(dy) < 0.03) c = accL; }
        if (P.tex === 'prism' && r2 > 0.55 && r2 < 0.64) c = pk(['#f8b8c8', '#f8e0a0', '#b8f0c8', '#a8d8f8', '#d0b8f8'][Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2) * 5) % 5]);
        if (r2 > 0.86) c = dy < 0 ? top[0] : top[2];
        d[i] = c;
      } else if (inE(px, py, rx, ry, th) && py > cy) {
        const dx = (px + 0.5 - cx) / rx;
        d[i] = dx > 0.45 || py > cy + ry + th - 2 ? sideD : side;
      }
    }
    // outline
    const out = new Uint32Array(d);
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) { const i = py * cw + px; if (d[i]) continue; const n = (px > 0 && d[i - 1]) || (px < cw - 1 && d[i + 1]) || (py > 0 && d[i - cw]) || (py < ch - 1 && d[i + cw]); if (n) out[i] = packedDark(n, 0.5); }
    d.set(out);
    x.putImageData(id, 0, 0);
    // surface texture
    const rng = seeded(rx * 7);
    x.fillStyle = P.texC[0];
    for (let i = 0; i < rx * 1.2; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.8, px = Math.round(cx + Math.cos(a) * r * rx), py = Math.round(cy + Math.sin(a) * r * ry);
      if (P.tex === 'tuft') { x.fillStyle = P.texC[0]; x.fillRect(px, py, 1, 1); x.fillRect(px + 2, py, 1, 1); x.fillRect(px + 1, py + 1, 1, 1); x.fillStyle = P.texC[1]; x.fillRect(px + 1, py - 1, 1, 1); }
      else if (P.tex === 'pebble') { x.fillStyle = P.texC[0]; x.fillRect(px, py, 2, 1); x.fillStyle = P.texC[1]; x.fillRect(px, py - 1, 1, 1); }
      else if (P.tex === 'sparkle' && i % 3 === 0) { x.fillStyle = P.texC[i % 2]; x.fillRect(px, py, 2, 1); }
      else if (P.tex === 'metal' && i % 2 === 0) { x.fillStyle = P.texC[0]; x.fillRect(px - 2, py, 5, 1); }
    }
    if (P.tex === 'metal') { x.fillStyle = P.texC[1]; for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; if (a % 2) x.fillRect(Math.round(cx + Math.cos(t) * rx * 0.78), Math.round(cy + Math.sin(t) * ry * 0.78), 2, 1); } }
    platCache[key] = cv;
    return cv;
  }
  function platform(c, cx, cy, rx, ry, e) {
    const s = platSprite(e, rx, ry);
    c.drawImage(s, Math.round(cx - s.width / 2), Math.round(cy - ry - 2));
  }
  return { build, platform };
})();

// ── the scene ──
class Battle {
  constructor(o) {
    this.o = o; this.opaque = true; this.fx = []; this.t = 0;
    this.wild = !!o.wild;
    this.env = o.env || 'grass';
    this.night = o.night != null ? o.night : (isNight() && !['cave', 'gym', 'plant', 'spire'].includes(this.env));
    this.P = new Side(this, false, G.party);
    this.E = new Side(this, true, o.wild ? [o.wild] : o.trainer.party, o.trainer);
    this.participants = new Set([this.P.idx]);
    this.escapes = 0; this.result = null; this.slide = 1;
    const accent = this.env === 'gym' && typeof OW !== 'undefined' && OW && OW.map && OW.map.gymColor;
    this.bg = BattleBG.build(this.env, this.night, accent || null);
    this.trainerP = { show: true, x: 0, fr: 0 };
    this.trainerE = o.trainer ? { show: true, x: 0 } : null;
    this.flashA = 0; this.flashC = '#fff';
    this.balls = [];
    this.menuMem = 0; this.moveMem = 0;
    this.co = new Co(this.flow(), this);
    this.music = o.music || (this.wild ? 'battle_wild' : 'battle_trainer');
    this.leveled = new Set();
  }
  enter() { Sound.play(this.music, { restart: true }); Game.fadeA = 0; }
  msg(text, o = {}) { this.lastText = text; return new Say(text, Object.assign({ battle: true, auto: o.wait ? 0 : 50 }, o)); }

  // ── effects helpers used by anims ──
  *lunge(a, d, dist, frames) {
    const dx = Math.sign(d.pos().x - a.pos().x) * dist, dy = Math.sign(d.pos().y - a.pos().y) * dist * 0.5;
    for (let i = 1; i <= frames; i++) { a.vis.offX = dx * i / frames; a.vis.offY = dy * i / frames; yield 1; }
    for (let i = frames; i >= 0; i--) { a.vis.offX = dx * i / frames; a.vis.offY = dy * i / frames; yield 1; }
  }
  shakeSide(s, mag, frames) { s.vis.shakeM = mag; s.vis.shakeT = frames; }
  flash(col, frames, a = 0.6) { this.flashC = col; this.flashA = a; this.flashDecay = a / frames; }
  tintSide(s, col, frames) { s.vis.tint = col; s.vis.tintT = frames; s.vis.tintMax = frames; }
  flashSide(s, col, frames) { this.tintSide(s, col, frames); }

  // ── main flow ──
  *flow() {
    yield* this.intro();
    while (!this.result) {
      const act = yield* this.choose();
      if (!act) continue;
      yield* this.turn(act);
    }
    yield* this.outro();
  }
  *choose() {
    const P = this.P, m = P.mon;
    if (P.vol.recharge) return { type: 'recharge' };
    if (P.vol.charging) return { type: 'move', id: P.vol.charging, forced: true };
    this.lastText = null;
    const choice = yield new ActionMenu(this);
    if (choice === 0) {
      if (!m.moves.some(x => x.pp > 0)) { yield this.msg(`${m.name} has no moves left!`); return { type: 'move', id: 'struggle' }; }
      const mi = yield new MoveMenu(this);
      if (mi < 0) return null;
      if (m.moves[mi].pp <= 0) { yield this.msg('There’s no PP left for this move!', { wait: 1 }); return null; }
      return { type: 'move', id: m.moves[mi].id, slot: mi };
    }
    if (choice === 1) {
      const r = yield new SceneWait(new BagScene({ battle: this }));
      if (!r) return null;
      return { type: 'item', item: r.item, target: r.target };
    }
    if (choice === 2) {
      const r = yield new SceneWait(new PartyScene({ mode: 'battle', battle: this }));
      if (r == null || r < 0 || r === P.idx) return null;
      return { type: 'switch', to: r };
    }
    if (choice === 3) return { type: 'run' };
    return null;
  }
  speedOf(side) { let s = side.mon.stats.spe * STAGE_MUL(side.stages.spe); if (side.mon.status === 'par') s *= 0.5; return s; }
  *turn(act) {
    const P = this.P, E = this.E;
    if (act.type === 'run') {
      const ok = yield* this.tryRun();
      if (ok || this.result) return;
    }
    const eact = this.enemyChoose();
    const list = [{ side: P, a: act }, { side: E, a: eact }];
    const prio = x => x.a.type === 'switch' ? 7 : x.a.type === 'item' ? 6 : x.a.type === 'run' ? 8 : x.a.type === 'recharge' ? 0 : ((MOVES[x.a.id] || {}).prio || 0);
    list.sort((a, b) => prio(b) - prio(a) || this.speedOf(b.side) - this.speedOf(a.side) || (Math.random() - 0.5));
    for (const x of list) {
      if (this.result) return;
      const side = x.side, foe = side === P ? E : P;
      if (side.mon.fainted || x.a.type === 'run') continue;
      if (x.a.type === 'switch') yield* this.doSwitch(side, x.a.to);
      else if (x.a.type === 'item') yield* this.useItem(side, x.a);
      else if (x.a.type === 'recharge') { yield this.msg(`${side.name()} must recharge!`); side.vol.recharge = false; }
      else if (x.a.type === 'move') yield* this.useMove(side, foe, x.a);
      if (this.result) return;
      yield* this.checkFaint(foe); yield* this.checkFaint(side);
      if (this.result) return;
      if (E.mon.fainted && !E.party.some(m => !m.fainted)) break;
      if (P.mon.fainted && !P.party.some(m => !m.fainted)) break;
    }
    for (const side of [P, E]) {
      if (this.result) return;
      if (!side.mon.fainted) yield* this.endTurn(side, side === P ? E : P);
      yield* this.checkFaint(side);
      yield* this.checkFaint(side === P ? E : P);
    }
    P.vol.flinch = E.vol.flinch = false;
    yield* this.replaceFainted();
  }
  *tryRun() {
    const P = this.P, E = this.E;
    if (!this.wild) { yield this.msg('No! There’s no running from a Trainer battle!', { wait: 1 }); return false; }
    if (this.o.noRun) { yield this.msg('There’s no escaping this battle!', { wait: 1 }); return false; }
    this.escapes++;
    const ps = this.speedOf(P), es = this.speedOf(E);
    const odds = ps >= es ? 256 : Math.floor(ps * 128 / Math.max(1, es) + 30 * this.escapes) % 256;
    if (ps >= es || rand(256) < odds) {
      Sound.sfx('run');
      yield this.msg('Got away safely!');
      this.result = 'run';
      return true;
    }
    yield this.msg('Can’t escape!');
    return false;
  }

  // ── enemy AI ──
  enemyChoose() {
    const E = this.E, P = this.P, m = E.mon;
    if (E.vol.recharge) return { type: 'recharge' };
    if (E.vol.charging) return { type: 'move', id: E.vol.charging, forced: true };
    const usable = m.moves.filter(x => x.pp > 0);
    if (!usable.length) return { type: 'move', id: 'struggle' };
    if (this.wild && !this.o.smart) return { type: 'move', id: pick(usable).id };
    const tr = E.trainer || {};
    if (tr.items && tr.items.length && m.hp < m.stats.hp * 0.3 && chance(0.75)) return { type: 'item', item: tr.items.shift(), target: E.idx, enemy: true };
    const foe = P.mon;
    let best = null, bestS = -1e9;
    for (const mvs of usable) {
      const mv = MOVES[mvs.id];
      let s = 0;
      if (mv.cat !== 'X') {
        const eff = mv.type === 'ground' && foe.ability === 'levitate' ? 0 : typeEff(mv.type, foe.types);
        const stab = m.types.includes(mv.type) ? 1.5 : 1;
        const A = mv.cat === 'P' ? m.stats.atk : m.stats.spa, D = mv.cat === 'P' ? foe.stats.def : foe.stats.spd;
        const est = mv.fixed ? (mv.fixed === 'level' ? m.level : mv.fixed) : ((2 * m.level / 5 + 2) * mv.pow * A / D / 50 + 2) * stab * eff;
        s = est * ((mv.acc || 100) / 100);
        if (eff === 0) s = -100;
        if (est >= foe.hp) s += 200;
        if (mv.needSleep && foe.status !== 'slp') s = -50;
        if (mv.charge || mv.recharge) s *= 0.6;
      } else {
        s = 25;
        if (mv.st) { if (foe.status) s = -50; if (mv.st[0] === 'par' && foe.types.includes('electric')) s = -50; if (mv.powder && foe.types.includes('grass')) s = -50; if ((mv.st[0] === 'psn' || mv.st[0] === 'tox') && (foe.types.includes('poison') || foe.types.includes('steel'))) s = -50; if (mv.st[0] === 'brn' && foe.types.includes('fire')) s = -50; }
        if (mv.conf && P.vol.conf) s = -50;
        if (mv.leech && (P.vol.leech || foe.types.includes('grass'))) s = -50;
        if (mv.heal) s = m.hp < m.stats.hp * 0.45 ? 120 : -30;
        if (mv.rest) s = m.hp < m.stats.hp * 0.3 ? 100 : -40;
        if (mv.stat) { const st = mv.stat; const tgt = st.who === 'self' ? E : P; const k = Object.keys(st.stats)[0]; if (Math.abs(tgt.stages[k]) >= 2) s = -20; }
        if (mv.flee) s = -100;
        if (mv.splash) s = 1;
      }
      s *= 0.8 + Math.random() * 0.4 * (tr.smart ? 0.5 : 1.5);
      if (s > bestS) { bestS = s; best = mvs; }
    }
    return { type: 'move', id: best.id };
  }

  // ── moves ──
  *useMove(side, foe, act) {
    const m = side.mon;
    let mv = MOVES[act.id];
    // pre-move status
    if (m.status === 'frz') {
      if (mv.thaw || chance(0.2)) { m.status = null; yield this.msg(`${side.name()} thawed out!`); }
      else { yield* STATUS_FX.frz(this, side); yield this.msg(`${side.name()} is frozen solid!`); return; }
    }
    if (m.status === 'slp') {
      m.sleep--;
      if (m.sleep <= 0) { m.status = null; yield this.msg(`${side.name()} woke up!`); }
      else { yield* STATUS_FX.slp(this, side); yield this.msg(`${side.name()} is fast asleep.`); side.vol.charging = null; return; }
    }
    if (side.vol.flinch) { side.vol.flinch = false; yield this.msg(`${side.name()} flinched and couldn’t move!`); side.vol.charging = null; return; }
    if (side.vol.conf) {
      side.vol.conf--;
      if (side.vol.conf <= 0) { side.vol.conf = 0; yield this.msg(`${side.name()} snapped out of its confusion!`); }
      else {
        yield* STATUS_FX.conf(this, side);
        yield this.msg(`${side.name()} is confused!`);
        if (chance(1 / 3)) {
          const dmg = Math.max(1, Math.floor(Math.floor(Math.floor(2 * m.level / 5 + 2) * 40 * m.stats.atk / m.stats.def) / 50) + 2);
          yield this.msg('It hurt itself in its confusion!');
          yield* this.damage(side, dmg);
          side.vol.charging = null;
          return;
        }
      }
    }
    if (m.status === 'par' && chance(0.25)) { yield* STATUS_FX.par(this, side); yield this.msg(`${side.name()} is paralyzed! It can’t move!`); side.vol.charging = null; return; }
    // charge turn
    if (mv.charge && !act.forced) {
      const slot = m.moves.find(x => x.id === mv.id); if (slot) slot.pp = Math.max(0, slot.pp - 1);
      yield this.msg(`${side.name()} ${mv.charge}`);
      side.vol.charging = mv.id;
      return;
    }
    if (act.forced) side.vol.charging = null;
    else if (act.id !== 'struggle') { const slot = m.moves.find(x => x.id === mv.id); if (slot) slot.pp = Math.max(0, slot.pp - (foe.mon.ability === 'pressure' && foe !== side ? 2 : 1)); }
    yield this.msg(`${side.name()} used ${mv.name}!`);
    if (mv.splash) { yield* ANIMS.splash(this, side); yield this.msg('But nothing happened!'); return; }
    // targeting self?
    const selfMove = mv.cat === 'X' && (mv.heal || mv.rest || (mv.stat && mv.stat.who === 'self' && !mv.st && !mv.conf) || mv.selfFlee);
    const target = selfMove ? side : foe;
    if (!selfMove && foe.mon.fainted) { yield this.msg('But there was no target...'); return; }
    // accuracy
    if (!selfMove && mv.acc) {
      const st = clamp(side.stages.acc - foe.stages.eva, -6, 6);
      if (rand(100) >= mv.acc * ACC_MUL(st)) { yield this.msg(`${side.name()}’s attack missed!`); return; }
    }
    if (mv.needSleep && foe.mon.status !== 'slp') { yield this.msg('But it failed!'); return; }
    // immunities for status moves
    if (mv.cat === 'X' && !selfMove) {
      const fm = foe.mon;
      const immune = (mv.st && ((mv.st[0] === 'par' && (fm.types.includes('electric') || (mv.type === 'electric' && fm.types.includes('ground')))) ||
        ((mv.st[0] === 'psn' || mv.st[0] === 'tox') && (fm.types.includes('poison') || fm.types.includes('steel'))) ||
        (mv.st[0] === 'brn' && fm.types.includes('fire')) || (mv.powder && fm.types.includes('grass')))) || (mv.leech && fm.types.includes('grass'));
      if (immune) { yield this.msg(`It doesn’t affect ${foe.name(true)}...`); return; }
    }
    // animation
    const animName = mv.anim || (mv.cat === 'X' ? (selfMove ? (mv.heal || mv.rest ? 'heal' : 'self') : null) : TYPE_FX[mv.type]) || 'tackle';
    const anim = ANIMS[animName];
    if (anim) yield* anim(this, side, target, mv);
    if (mv.cat !== 'X') yield* this.doDamageMove(side, foe, mv);
    else yield* this.doStatusMove(side, foe, mv);
  }
  *doDamageMove(side, foe, mv) {
    const A = side.mon, D = foe.mon;
    const eff = mv.type === 'ground' && D.ability === 'levitate' ? 0 : typeEff(mv.type, D.types);
    if (eff === 0 && !mv.fixed) { yield this.msg(`It doesn’t affect ${foe.name(true)}...`); return; }
    if (mv.fixed && eff === 0 && mv.type !== 'fighting') { /* night shade vs normal etc */ }
    if (mv.fixed && eff === 0) { yield this.msg(`It doesn’t affect ${foe.name(true)}...`); return; }
    const hits = mv.hits ? (mv.hits[0] === mv.hits[1] ? mv.hits[0] : [2, 2, 3, 3, 4, 5][rand(6)]) : 1;
    let total = 0, n = 0, anyCrit = false;
    for (let h = 0; h < hits; h++) {
      if (D.fainted) break;
      const crit = !mv.fixed && rand(mv.crit ? 8 : 24) === 0;
      let dmg = this.calcDamage(side, foe, mv, crit, eff);
      if (h > 0) { impact(this, foe.pos()); Sound.sfx('hit'); }
      Sound.sfx(eff > 1 ? 'hitSuper' : eff < 1 ? 'hitWeak' : 'hit');
      foe.vis.blink = 20;
      if (eff > 1) Game.shake(2, 8);
      const dealt = yield* this.damage(foe, dmg);
      total += dealt; n++;
      if (crit) { anyCrit = true; yield this.msg('A critical hit!'); }
      // contact abilities
      if (mv.contact && D.ability === 'static' && !A.status && !A.types.includes('electric') && chance(0.3)) { yield this.msg(`${foe.name()}’s Static!`); yield* this.inflict(side, 'par'); }
    }
    if (hits > 1) yield this.msg(`Hit ${n} time${n > 1 ? 's' : ''}!`);
    if (!mv.fixed) {
      if (eff > 1) yield this.msg('It’s super effective!');
      else if (eff < 1) yield this.msg('It’s not very effective...');
    }
    void anyCrit;
    // drain / recoil
    if (mv.drain && total > 0 && !A.fainted) {
      const heal = Math.max(1, Math.floor(total * mv.drain));
      if (A.hp < A.stats.hp) { yield* this.heal(side, heal); yield this.msg(`${foe.name()} had its energy drained!`); }
    }
    if (mv.recoil && total > 0) { yield this.msg(`${side.name()} is damaged by the recoil!`); yield* this.damage(side, Math.max(1, Math.floor(total * mv.recoil))); }
    if (mv.recoilMax) { yield this.msg(`${side.name()} is damaged by the recoil!`); yield* this.damage(side, Math.max(1, Math.floor(A.stats.hp * mv.recoilMax))); }
    if (mv.recharge) side.vol.recharge = true;
    // secondary effects
    if (D.fainted) return;
    if (mv.st && chance(mv.st[1] / 100)) yield* this.inflict(foe, mv.st[0], true);
    if (mv.flinch && chance(mv.flinch / 100)) foe.vol.flinch = true;
    if (mv.conf && chance(mv.conf / 100) && !foe.vol.conf) { yield* STATUS_FX.conf(this, foe); foe.vol.conf = randInt(2, 5); yield this.msg(`${foe.name()} became confused!`); }
    if (mv.stat && chance(mv.stat.chance / 100)) yield* this.applyStats(mv.stat.who === 'self' ? side : foe, mv.stat.stats, true);
    if (mv.thaw && D.status === 'frz') { D.status = null; yield this.msg(`${foe.name()} thawed out!`); }
  }
  calcDamage(side, foe, mv, crit, eff) {
    const A = side.mon, D = foe.mon;
    if (mv.fixed) return mv.fixed === 'level' ? A.level : mv.fixed;
    const phys = mv.cat === 'P';
    let as = side.stages[phys ? 'atk' : 'spa'], ds = foe.stages[phys ? 'def' : 'spd'];
    if (crit) { as = Math.max(0, as); ds = Math.min(0, ds); }
    const atk = Math.max(1, Math.floor((phys ? A.stats.atk : A.stats.spa) * STAGE_MUL(as)));
    const def = Math.max(1, Math.floor((phys ? D.stats.def : D.stats.spd) * STAGE_MUL(ds)));
    let pow = mv.pow;
    if (mv.hex && D.status) pow *= 2;
    const ab = A.ability;
    if (A.hp <= A.stats.hp / 3 && ((ab === 'blaze' && mv.type === 'fire') || (ab === 'torrent' && mv.type === 'water') || (ab === 'overgrow' && mv.type === 'grass'))) pow = Math.floor(pow * 1.5);
    let dmg = Math.floor(Math.floor(Math.floor(2 * A.level / 5 + 2) * pow * atk / def) / 50) + 2;
    if (crit) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * randInt(85, 100) / 100);
    if (A.types.includes(mv.type)) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * eff);
    if (phys && A.status === 'brn') dmg = Math.floor(dmg / 2);
    return Math.max(1, dmg);
  }
  *doStatusMove(side, foe, mv) {
    const m = side.mon;
    if (mv.heal) {
      if (m.hp >= m.stats.hp) { yield this.msg(`${side.name()}’s HP is full!`); return; }
      yield* this.heal(side, Math.floor(m.stats.hp * mv.heal));
      yield this.msg(`${side.name()} regained health!`);
      return;
    }
    if (mv.rest) {
      if (m.hp >= m.stats.hp) { yield this.msg('But it failed!'); return; }
      m.status = 'slp'; m.sleep = 3;
      yield* this.heal(side, m.stats.hp);
      yield this.msg(`${side.name()} slept and became healthy!`);
      return;
    }
    if (mv.flee) {
      if (!this.wild || this.o.noRun) { yield this.msg('But it failed!'); return; }
      if (mv.selfFlee) yield this.msg(side.isEnemy ? `${side.name()} fled!` : `${side.name()} teleported away!`);
      else yield this.msg(side.isEnemy ? `${this.P.name()} was blown away!` : `${foe.name()} fled in fear!`);
      this.result = 'run';
      return;
    }
    if (mv.leech) {
      if (foe.vol.leech) { yield this.msg(`${foe.name()} is already seeded!`); return; }
      foe.vol.leech = true;
      yield this.msg(`${foe.name()} was seeded!`);
      return;
    }
    let did = false;
    if (mv.st) { did = yield* this.inflict(foe, mv.st[0]); }
    if (mv.conf) {
      if (foe.vol.conf) yield this.msg(`${foe.name()} is already confused!`);
      else { yield* STATUS_FX.conf(this, foe); foe.vol.conf = randInt(2, 5); yield this.msg(`${foe.name()} became confused!`); }
      did = true;
    }
    if (mv.stat) { yield* this.applyStats(mv.stat.who === 'self' ? side : foe, mv.stat.stats, false); did = true; }
    void did;
  }
  *inflict(side, st, secondary) {
    const m = side.mon;
    if (m.fainted) return false;
    const names = { psn: 'poisoned', tox: 'badly poisoned', brn: 'burned', par: 'paralyzed', slp: 'asleep', frz: 'frozen' };
    if (m.status) { if (!secondary) yield this.msg(`${side.name()} is already ${names[m.status] || 'afflicted'}!`); return false; }
    if ((st === 'psn' || st === 'tox') && (m.types.includes('poison') || m.types.includes('steel'))) { if (!secondary) yield this.msg(`It doesn’t affect ${side.name(true)}...`); return false; }
    if (st === 'brn' && m.types.includes('fire')) { if (!secondary) yield this.msg(`It doesn’t affect ${side.name(true)}...`); return false; }
    if (st === 'par' && m.types.includes('electric')) { if (!secondary) yield this.msg(`It doesn’t affect ${side.name(true)}...`); return false; }
    if (st === 'frz' && m.types.includes('ice')) return false;
    m.status = st;
    if (st === 'slp') m.sleep = randInt(2, 4);
    if (st === 'tox') side.vol.tox = 1;
    const fxn = STATUS_FX[st]; if (fxn) yield* fxn(this, side);
    const msgs = { psn: 'was poisoned!', tox: 'was badly poisoned!', brn: 'was burned!', par: 'is paralyzed! It may be unable to move!', slp: 'fell asleep!', frz: 'was frozen solid!' };
    yield this.msg(`${side.name()} ${msgs[st]}`);
    return true;
  }
  *applyStats(side, stats, secondary) {
    for (const [k, d] of Object.entries(stats)) {
      const cur = side.stages[k];
      const nv = clamp(cur + d, -6, 6);
      if (nv === cur) { if (!secondary) yield this.msg(`${side.name()}’s ${STAT_NAME[k]} won’t go any ${d > 0 ? 'higher' : 'lower'}!`); continue; }
      side.stages[k] = nv;
      yield* statAnim(this, side, d > 0);
      const w = Math.abs(d) >= 2 ? (d > 0 ? 'rose sharply!' : 'harshly fell!') : (d > 0 ? 'rose!' : 'fell!');
      yield this.msg(`${side.name()}’s ${STAT_NAME[k]} ${w}`);
    }
  }
  // animate HP bar towards new value
  *damage(side, amount) {
    const m = side.mon;
    const dealt = Math.min(m.hp, amount);
    m.hp = Math.max(0, m.hp - amount);
    yield new Until(() => side.shownHp === m.hp);
    return dealt;
  }
  *heal(side, amount) {
    const m = side.mon;
    m.hp = Math.min(m.stats.hp, m.hp + amount);
    yield new Until(() => side.shownHp === m.hp);
  }
  *endTurn(side, foe) {
    const m = side.mon;
    if (m.status === 'psn' || m.status === 'tox' || m.status === 'brn') {
      const tox = m.status === 'tox';
      const dmg = Math.max(1, m.status === 'brn' ? Math.floor(m.stats.hp / 16) : tox ? Math.floor(m.stats.hp * (side.vol.tox || 1) / 16) : Math.floor(m.stats.hp / 8));
      if (tox) side.vol.tox = (side.vol.tox || 1) + 1;
      yield* STATUS_FX[m.status](this, side);
      yield this.msg(`${side.name()} is hurt by ${m.status === 'brn' ? 'its burn' : 'poison'}!`);
      yield* this.damage(side, dmg);
    }
    if (side.vol.leech && !m.fainted && !foe.mon.fainted) {
      const dmg = Math.max(1, Math.floor(m.stats.hp / 8));
      yield* STATUS_FX.leech(this, side);
      const dealt = yield* this.damage(side, dmg);
      yield* this.heal(foe, dealt);
      yield this.msg(`${side.name()}’s health is sapped by Leech Seed!`);
    }
  }
  *checkFaint(side) {
    const m = side.mon;
    if (m.hp > 0 || side.faintHandled) return;
    side.faintHandled = true;
    Sound.cry(m.sp, { faint: true });
    yield 16;
    Sound.sfx('faint');
    for (let i = 1; i <= 24; i++) { side.vis.faint = i / 24; yield 1; }
    side.vis.show = false; side.vis.faint = 0;
    side.infoShow = false;
    yield this.msg(`${side.name()} fainted!`);
    m.status = null;
    if (side.isEnemy) yield* this.giveExp(m);
    else if (this.o.canLose) { /* story battle */ }
  }
  *replaceFainted() {
    const P = this.P, E = this.E;
    if (E.mon.fainted) {
      const next = E.party.findIndex(m => !m.fainted);
      if (next < 0) { this.result = 'win'; return; }
      yield* this.sendOut(E, next);
    }
    if (P.mon.fainted) {
      if (!P.party.some(m => !m.fainted)) { this.result = 'lose'; return; }
      if (this.wild && !this.o.noRun) {
        const r = yield* ask('Use next Pokémon?', ['Yes', 'No'], { battle: true });
        if (r === 1) {
          const ps = this.speedOf(P) || 1;
          const alive = P.party.find(m => !m.fainted);
          if (alive.stats.spe >= this.E.mon.stats.spe || chance(0.5)) { Sound.sfx('run'); yield this.msg('Got away safely!'); this.result = 'run'; return; }
          yield this.msg('Can’t escape!'); void ps;
        }
      }
      const idx = yield new SceneWait(new PartyScene({ mode: 'forced', battle: this }));
      yield* this.sendOut(P, idx);
    }
  }
  *giveExp(foeMon) {
    const party = G.party;
    const L = foeMon.level, base = foeMon.S.exp;
    const mul = (this.wild ? 1 : 1.5) * EXP_MULT;
    const parts = [...this.participants].filter(i => party[i] && !party[i].fainted);
    let sharedMsg = false;
    for (let i = 0; i < party.length; i++) {
      const m = party[i];
      if (!m || m.fainted || m.level >= 100) continue;
      const isPart = parts.includes(i);
      let amt = Math.floor((base * L / 5) * Math.pow((2 * L + 10) / (L + m.level + 10), 2.5) * mul) + 1;
      if (!isPart) amt = Math.max(1, Math.floor(amt / 2));
      if (isPart) yield this.msg(`${m.name} gained ${amt} Exp. Points!`);
      else if (!sharedMsg) { sharedMsg = true; yield this.msg('The rest of your team gained Exp. Points thanks to the Exp. Share!'); }
      yield* this.addExp(m, amt, i === this.P.idx && !this.P.mon.fainted);
    }
    this.participants = new Set([this.P.idx]);
  }
  *addExp(m, amt, animate) {
    while (amt > 0 && m.level < 100) {
      const need = m.expToNext();
      const step = Math.min(need, amt);
      const from = m.expFrac();
      m.exp += step; amt -= step;
      if (animate) {
        const to = step >= need ? 1 : m.expFrac();
        const frames = Math.max(8, Math.round((to - from) * 40));
        for (let i = 1; i <= frames; i++) { this.expShown = lerp(from, to, i / frames); if (i % 3 === 0) Sound.sfx('expTick', { pitch: 76 + Math.floor(this.expShown * 20) }); yield 1; }
      }
      if (step >= need) {
        const rec = m.levelUp();
        this.leveled.add(m);
        this.expShown = 0;
        if (animate) { this.P.shownHp = Math.min(this.P.shownHp + (rec.now.hp - rec.old.hp), m.hp); }
        Sound.jingle('levelup', null);
        yield this.msg(`${m.name} grew to Lv. ${m.level}!`, { wait: 1 });
        yield new StatBox(m, rec);
        for (const mv of rec.moves) yield* teachMove(m, mv, t => this.msg(t, { wait: 1 }), true);
      }
    }
    if (animate) this.expShown = null;
  }
  *doSwitch(side, to) {
    yield* this.recall(side);
    yield* this.sendOut(side, to);
  }
  *recall(side) {
    if (side.isEnemy) yield this.msg(`${side.trainer.title} withdrew ${side.mon.name}!`);
    else yield this.msg(`${side.mon.name}, come back!`);
    Sound.sfx('ballIn');
    for (let i = 1; i <= 14; i++) { side.vis.scale = 1 - i / 14; side.vis.red = 1; yield 1; }
    side.vis.show = false; side.vis.scale = 1; side.vis.red = 0;
    side.infoShow = false;
    yield 8;
  }
  *sendOut(side, idx, intro) {
    side.idx = idx;
    side.resetBattleState();
    const m = side.mon;
    side.shownHp = m.hp;
    if (side.isEnemy) {
      if (!this.wild) yield this.msg(`${side.trainer.title} sent out ${m.name}!`);
    } else {
      const f = this.E.mon && !this.E.mon.fainted ? this.E.mon.hp / this.E.mon.stats.hp : 1;
      yield this.msg(intro ? `Go! ${m.name}!` : f < 0.3 ? `The foe’s weak! Get ’em, ${m.name}!` : `Go! ${m.name}!`);
      this.participants.add(idx);
    }
    // ball flight
    const b = side.base();
    const from = side.isEnemy ? { x: 270, y: 30 } : { x: intro ? 50 : -10, y: intro ? 100 : 110 };
    const to = { x: b.x, y: b.y - 16 };
    Sound.sfx('throw');
    const ball = { x: from.x, y: from.y, rot: 0, type: 'pokeball' };
    this.balls.push(ball);
    for (let i = 1; i <= 20; i++) { const t = i / 20; ball.x = lerp(from.x, to.x, t); ball.y = lerp(from.y, to.y, t) - Math.sin(t * Math.PI) * 30; ball.rot += 0.5; yield 1; }
    this.balls.splice(this.balls.indexOf(ball), 1);
    Sound.sfx('ballOpen');
    fx(this, { life: 14, draw(c, e) { PX.ring(c, to.x, to.y + 4, 4 + e.t * 1.8, '#ffffff', 2); for (let k = 0; k < 8; k++) { const a = k * 0.785; PX.star(c, to.x + Math.cos(a) * e.t * 2.2, to.y + Math.sin(a) * e.t * 1.6, 2, '#fff8c0'); } } });
    side.vis.show = true; side.vis.white = 1;
    for (let i = 1; i <= 12; i++) { side.vis.scale = Ease.back(i / 12); side.vis.white = 1 - i / 12; yield 1; }
    side.vis.scale = 1; side.vis.white = 0;
    Sound.cry(m.sp);
    if (m.shiny) { Sound.sfx('sparkle'); sparkle(this, side.pos(), '#fff8a0', 16); }
    side.infoShow = true;
    yield 18;
    // intimidate
    if (m.ability === 'intimidate') {
      const foe = side === this.P ? this.E : this.P;
      if (foe.mon && !foe.mon.fainted && foe.vis.show) { yield this.msg(`${side.name()}’s Intimidate cuts ${foe.name(true)}’s Attack!`); yield* this.applyStats(foe, { atk: -1 }, true); }
    }
  }
  *intro() {
    const P = this.P, E = this.E;
    E.shownHp = E.mon.hp; P.shownHp = P.mon.hp;
    if (this.wild) { E.vis.show = true; E.vis.sil = true; }
    for (let i = 0; i <= 44; i++) { this.slide = 1 - Ease.cubicOut(i / 44); yield 1; }
    this.slide = 0;
    if (this.wild) {
      E.vis.sil = false; E.vis.white = 1;
      for (let i = 1; i <= 10; i++) { E.vis.white = 1 - i / 10; yield 1; }
      Sound.cry(E.mon.sp);
      if (E.mon.shiny) { Sound.sfx('sparkle'); sparkle(this, E.pos(), '#fff8a0', 18); yield 20; }
      E.infoShow = true;
      yield 10;
      yield this.msg(this.o.appearText || `A wild ${E.mon.name} appeared!`);
    } else {
      this.showBalls = true;
      yield this.msg(this.o.trainer.intro2 || `${this.o.trainer.title} would like to battle!`);
      this.showBalls = false;
      for (let i = 1; i <= 18; i++) { this.trainerE.x = i * 9; yield 1; }
      this.trainerE.show = false;
      yield* this.sendOut(E, E.idx);
    }
    // player throws
    this.trainerP.fr = 1; yield 8; this.trainerP.fr = 2; yield 4;
    const go = this.sendOut(P, P.idx, true);
    for (let i = 1; i <= 16; i++) { this.trainerP.x = -i * 8; if (i === 4) this.trainerP.fr = 0; yield 1; }
    this.trainerP.show = false;
    yield* go;
  }
  *outro() {
    const r = this.result;
    if (r === 'win' && !this.wild) {
      Sound.play(this.o.victory || 'victory', { restart: true });
      const tr = this.o.trainer;
      this.trainerE.show = true;
      for (let i = 18; i >= 0; i--) { this.trainerE.x = i * 9; yield 1; }
      yield this.msg(`${G.name} defeated ${tr.title}!`, { wait: 1 });
      if (tr.lose) for (const l of [].concat(tr.lose)) yield this.msg(l, { wait: 1 });
      const prize = tr.prize != null ? tr.prize : (TRAINER_CLASSES[tr.cls] || { pay: 20 }).pay * Math.max(...tr.party.map(m => m.level));
      if (prize > 0) { G.money += prize; yield this.msg(`${G.name} got ₽${prize} for winning!`, { wait: 1 }); }
    } else if (r === 'win' && this.wild) {
      if (Sound.current() !== 'victory_wild') Sound.play('victory_wild', { restart: true });
      yield 30;
    } else if (r === 'caught') {
      yield 10;
    } else if (r === 'lose') {
      if (this.o.canLose) {
        if (this.o.trainer && this.o.trainer.win) for (const l of [].concat(this.o.trainer.win)) yield this.msg(l, { wait: 1 });
      } else {
        yield this.msg(`${G.name} is out of usable Pokémon!`, { wait: 1 });
        const lost = Math.min(G.money, Math.floor(G.money / 2));
        G.money -= lost;
        if (!this.wild) yield this.msg(`${G.name} paid ₽${lost} to the winner.`, { wait: 1 });
        else yield this.msg(`${G.name} panicked and dropped ₽${lost}...`, { wait: 1 });
        yield this.msg('... ... ... ...', { wait: 1 });
        yield this.msg(`${G.name} blacked out!`, { wait: 1 });
      }
    }
    // reset battle-only state
    for (const m of G.party) { if (m.status === 'tox') m.status = 'psn'; }
    yield new Fade(1, 24);
    this.done = true;
  }

  // ── items ──
  *useItem(side, act) {
    const it = ITEMS[act.item];
    if (act.enemy) {
      const m = side.party[act.target];
      yield this.msg(`${side.trainer.title} used a ${it.name}!`);
      if (it.heal) { yield* ANIMS.heal(this, side); yield* this.heal(side, it.heal); }
      if (it.cure) m.status = null;
      return;
    }
    if (it.ball) { yield* this.throwBall(act.item); return; }
    const m = G.party[act.target];
    yield this.msg(`${G.name} used ${it.name}!`);
    if (it.revive) { m.hp = Math.max(1, Math.floor(m.stats.hp * it.revive)); yield this.msg(`${m.name} was revived!`); return; }
    if (it.heal) {
      const before = m.hp;
      if (act.target === this.P.idx) { yield* ANIMS.heal(this, this.P); yield* this.heal(this.P, it.heal); }
      else m.hp = Math.min(m.stats.hp, m.hp + it.heal);
      yield this.msg(`${m.name}’s HP was restored by ${m.hp - before} point${m.hp - before === 1 ? '' : 's'}.`);
    }
    if (it.cure) { m.status = null; m.sleep = 0; if (act.target === this.P.idx) { this.P.vol.conf = 0; } yield this.msg(`${m.name} is cured!`); }
  }
  catchShakes(mult) {
    const m = this.E.mon, sp = m.S;
    const sb = (m.status === 'slp' || m.status === 'frz') ? 2 : m.status ? 1.5 : 1;
    const a = ((3 * m.stats.hp - 2 * m.hp) * sp.catchRate * mult) / (3 * m.stats.hp) * sb;
    if (a >= 255) return 4;
    const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
    let s = 0;
    for (; s < 4; s++) if (rand(65536) >= b) break;
    return s;
  }
  *throwBall(id) {
    const it = ITEMS[id];
    Bag.take(id, 1);
    yield this.msg(`${G.name} used ${it.name}!`);
    const E = this.E;
    const tgt = E.pos();
    const ball = { x: 30, y: 130, rot: 0, type: id };
    this.balls.push(ball);
    Sound.sfx('throw');
    for (let i = 1; i <= 26; i++) { const t = i / 26; ball.x = lerp(30, tgt.x, t); ball.y = lerp(130, tgt.y - 6, t) - Math.sin(t * Math.PI) * 50; ball.rot += 0.6; yield 1; }
    if (!this.wild) {
      for (let i = 1; i <= 14; i++) { ball.x += 3; ball.y += 4; yield 1; }
      this.balls.splice(this.balls.indexOf(ball), 1);
      yield this.msg('The Trainer blocked the Ball!'); yield this.msg('Don’t be a thief!');
      return;
    }
    ball.open = true; Sound.sfx('ballOpen');
    for (let i = 1; i <= 14; i++) { E.vis.red = 1; E.vis.scale = 1 - i / 14; yield 1; }
    E.vis.show = false; E.vis.scale = 1; E.vis.red = 0; ball.open = false;
    const ground = ENEMY_BASE.y - 4;
    for (let i = 1; i <= 16; i++) { ball.y = lerp(tgt.y - 6, ground, Ease.in(i / 16)); yield 1; }
    Sound.sfx('land');
    for (let i = 1; i <= 8; i++) { ball.y = ground - Math.sin(i / 8 * Math.PI) * 6; yield 1; }
    ball.rot = 0;
    const shakes = this.catchShakes(it.ball);
    yield 20;
    for (let s = 0; s < Math.min(3, shakes); s++) {
      Sound.sfx('ballShake');
      for (let i = 0; i < 16; i++) { ball.rot = Math.sin(i / 16 * Math.PI * 2) * 0.5; ball.x = tgt.x + Math.sin(i / 16 * Math.PI * 2) * 2; yield 1; }
      ball.rot = 0; ball.x = tgt.x;
      yield 18;
    }
    if (shakes >= 4) {
      Sound.sfx('ballClick');
      ball.dark = true;
      fx(this, { life: 24, draw(c, e) { for (let k = 0; k < 3; k++) PX.star(c, ball.x - 10 + k * 10, ball.y - 8 - e.t * 0.6, 2, '#f8e060'); } });
      yield 26;
      const m = E.mon;
      Sound.play('caught', { restart: true });
      yield this.msg(`Gotcha! ${m.name} was caught!`, { wait: 1 });
      m.ball = id; m.ot = G.name; m.met = G.mapName || 'Lumira';
      const firstTime = !G.dex.caught[m.sp];
      Dex.catch(m.sp);
      if (firstTime) yield this.msg(`${m.name}’s data was added to the Pokédex.`, { wait: 1 });
      const r = yield* ask(`Give a nickname to the captured ${m.name}?`, ['Yes', 'No'], { battle: true });
      if (r === 0) { const nm = yield new SceneWait(new NameEntry({ title: `${m.S.name}’s nickname?`, max: 10, icon: m.sp })); if (nm) m.nick = nm; }
      m.status = m.status === 'tox' ? 'psn' : m.status;
      if (G.party.length < 6) G.party.push(m);
      else { G.box.push(m); yield this.msg(`${m.name} was transferred to the PC Box.`, { wait: 1 }); }
      this.balls.splice(this.balls.indexOf(ball), 1);
      this.result = 'caught';
      return;
    }
    // break free
    Sound.sfx('ballOpen');
    this.balls.splice(this.balls.indexOf(ball), 1);
    E.vis.show = true; E.vis.white = 1;
    for (let i = 1; i <= 10; i++) { E.vis.scale = i / 10; E.vis.white = 1 - i / 10; yield 1; }
    E.vis.scale = 1; E.vis.white = 0;
    yield this.msg(['Oh no! The Pokémon broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Gah! It was so close, too!'][shakes]);
  }

  // ── update / draw ──
  update() {
    this.t++;
    if (!this.done) this.co.update();
    for (const s of [this.P, this.E]) {
      const target = s.mon ? s.mon.hp : 0;
      if (s.shownHp !== target) {
        const step = Math.max(1, Math.ceil(s.mon.stats.hp / 48));
        s.shownHp = s.shownHp < target ? Math.min(target, s.shownHp + step) : Math.max(target, s.shownHp - step);
      }
      const want = s.infoShow ? 1 : 0;
      s.infoX = lerp(s.infoX, want, 0.25);
      if (Math.abs(s.infoX - want) < 0.01) s.infoX = want;
      if (s.vis.blink > 0) s.vis.blink--;
      if (s.vis.tintT > 0) s.vis.tintT--;
      if (s.vis.shakeT > 0) s.vis.shakeT--;
      if (s.vis.warp > 0) s.vis.warp--;
    }
    for (const e of this.fx) { e.t++; if (e.t >= e.life) e.done = true; }
    this.fx = this.fx.filter(e => !e.done);
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - (this.flashDecay || 0.05));
    // low hp alarm
    const pm = this.P.mon;
    if (pm && !pm.fainted && this.P.vis.show && pm.hp <= pm.stats.hp * 0.2 && !this.result) { if (this.t % 40 === 0) Sound.sfx('lowhp'); }
    if (this.done && !this.closed) Game.pop(this.result);
  }
  draw(c) {
    const bg = this.bg;
    c.drawImage(bg.c, 0, 0);
    // animated extras
    if (bg.e.aurora || (this.night && !bg.e.indoor && !bg.e.cave)) this.drawAurora(c, bg.e.aurora ? 1 : 0.35);
    if (bg.e.snow) { c.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) { const x = (i * 53 + this.t * (0.3 + (i % 3) * 0.2)) % 256, y = (i * 29 + this.t * (0.6 + (i % 4) * 0.2)) % 144; c.fillRect(Math.round(x), Math.round(y), 1 + (i % 2), 1 + (i % 2)); } }
    if (bg.e.embers) { for (let i = 0; i < 16; i++) { const x = (i * 71 + Math.sin(this.t * 0.02 + i) * 10) % 256, y = 144 - ((i * 37 + this.t * (0.4 + (i % 3) * 0.2)) % 144); c.fillStyle = i % 2 ? '#f8a040' : '#f86020'; c.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    const sl = this.slide * 220;
    BattleBG.platform(c, ENEMY_BASE.x - sl, ENEMY_BASE.y, 50, 13, bg.e);
    BattleBG.platform(c, PLAYER_BASE.x + sl, PLAYER_BASE.y - 4, 64, 15, bg.e);
    // enemy trainer
    if (this.trainerE && this.trainerE.show) {
      const img = TrainerArt.front(this.o.trainer.art);
      c.drawImage(img, Math.round(ENEMY_BASE.x - 32 - sl + this.trainerE.x), ENEMY_BASE.y - 62);
    }
    this.drawMon(c, this.E);
    // player trainer
    if (this.trainerP.show) {
      const img = TrainerArt.back(G.gender === 'f' ? 'girl' : 'boy', this.trainerP.fr);
      c.drawImage(img, Math.round(PLAYER_BASE.x - 40 + sl + this.trainerP.x), PLAYER_BASE.y - 80 + 4);
    }
    this.drawMon(c, this.P);
    for (const b of this.balls) drawBall(c, b.x, b.y, b.rot, b.type, b.open, b.dark);
    for (const e of this.fx) if (e.draw) e.draw(c, e);
    this.drawInfo(c, this.E);
    this.drawInfo(c, this.P);
    if (this.showBalls) this.drawPartyBalls(c);
    // bottom panel (widgets that own the panel simply draw over it)
    UI.battlePanel(c);
    if (this.lastText) Font.wrap(UI.subst(this.lastText), 218).slice(-2).forEach((l, k) => Font.draw(c, l, 16, 152 + k * 16));
    if (this.flashA > 0) { c.globalAlpha = this.flashA; c.fillStyle = this.flashC; c.fillRect(0, 0, W, 144); c.globalAlpha = 1; }
    if (this.o.faded) desaturateRegion(c, 0.85, null);
  }
  drawAurora(c, strength) {
    const hues = ['rgba(120,255,180,', 'rgba(120,200,255,', 'rgba(200,140,255,'];
    for (let b = 0; b < 3; b++) {
      for (let x = 0; x < 256; x += 2) {
        const y = 14 + b * 9 + Math.sin(x * 0.03 + this.t * 0.02 + b) * 8 + Math.sin(x * 0.011 + this.t * 0.013) * 6;
        const h = 10 + Math.sin(x * 0.05 + this.t * 0.03 + b * 2) * 5;
        c.fillStyle = hues[b] + (0.16 * strength) + ')';
        c.fillRect(x, Math.round(y), 2, Math.round(h));
        c.fillStyle = hues[b] + (0.3 * strength) + ')';
        c.fillRect(x, Math.round(y + h - 2), 2, 1);
      }
    }
  }
  drawMon(c, side) {
    if (!side.vis.show || side.vis.hidden || !side.mon) return;
    const v = side.vis;
    if (v.blink > 0 && ((v.blink >> 1) % 2)) return;
    const frame = (Math.floor(this.t / 22) + (side.isEnemy ? 0 : 1)) % 2;
    let { x, y } = side.drawPos();
    const spr = side.sprite(frame);
    if (side.mon.S.float) y += Math.round(Math.sin(this.t * 0.08 + (side.isEnemy ? 0 : 2)) * 2);
    if (!side.isEnemy && this.widgets.some(w => w instanceof ActionMenu || w instanceof MoveMenu)) y += (Math.floor(this.t / 16) % 2);
    if (v.shakeT > 0) x += Math.round(Math.sin(v.shakeT * 1.7) * v.shakeM);
    x = Math.round(x); y = Math.round(y);
    if (side.isEnemy && !v.sil && v.faint <= 0 && v.scale === 1) {
      const b = side.base(), fl = side.mon.S.float, bw = spr.bb.x1 - spr.bb.x0;
      const cx = Math.round(b.x + v.offX - (this.slide ? this.slide * 220 : 0)), cy = b.y + 1;
      const rx = Math.max(6, Math.round(bw * (fl ? 0.28 : 0.38))), ry = fl ? 2 : 3;
      c.fillStyle = fl ? 'rgba(20,30,40,0.14)' : 'rgba(20,30,40,0.22)';
      for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))); c.fillRect(cx - w, cy + dy, w * 2, 1); }
    }
    let img = spr;
    if (v.sil) img = silhouetteCached(spr, '#282838');
    const scale = v.scale;
    const drawIt = (im, alpha = 1) => {
      c.globalAlpha = alpha;
      if (v.faint > 0) {
        const base = side.base().y + (side.isEnemy ? 4 : 0);
        const dy = Math.round(v.faint * 64);
        c.save(); c.beginPath(); c.rect(0, 0, 256, base); c.clip();
        c.drawImage(im, x, y + dy);
        c.restore();
      } else if (scale !== 1) {
        const w = im.width * scale, h = im.height * scale;
        const bx = x + im.width / 2, by = y + spr.bb.y1;
        c.drawImage(im, Math.round(bx - w / 2), Math.round(by - spr.bb.y1 * scale), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      } else if (v.warp > 0) {
        for (let r = 0; r < im.height; r++) c.drawImage(im, 0, r, im.width, 1, x + Math.round(Math.sin(r * 0.3 + v.warp * 0.5) * 3 * (v.warp / 30)), y + r, im.width, 1);
      } else c.drawImage(im, x, y);
      c.globalAlpha = 1;
    };
    drawIt(img);
    if (v.white > 0) drawIt(silhouetteCached(spr, '#ffffff'), v.white);
    if (v.red > 0) drawIt(silhouetteCached(spr, '#f86060'), 0.8);
    if (v.tintT > 0 && v.tint) drawIt(silhouetteCached(spr, v.tint), 0.55 * Math.sin((v.tintT / v.tintMax) * Math.PI));
  }
  drawInfo(c, side) {
    if (!side.mon || side.infoX <= 0.01) return;
    const m = side.mon;
    const isE = side.isEnemy;
    const w = isE ? 112 : 118, h = isE ? 32 : 42;
    const x0 = isE ? 6 : 256 - w - 8, y0 = isE ? 10 : 96;
    const x = Math.round(isE ? lerp(-w - 16, x0, side.infoX) : lerp(274, x0, side.infoX)), y = y0;
    const R = (xx, yy, ww, hh, col) => { c.fillStyle = col; c.fillRect(xx, yy, ww, hh); };
    const edge = '#262a3c', top = '#fcfbf5', bot = '#e9ecdd', acc = isE ? '#e8704e' : '#4a94e6';
    // shadow
    R(x + 3, y + 4, w, h, 'rgba(10,14,30,0.28)');
    // body with rounded corners and a pointer tail towards the Pokémon
    R(x + 2, y, w - 4, h, edge); R(x, y + 2, w, h - 4, edge); R(x + 1, y + 1, w - 2, h - 2, edge);
    const tail = (i, n) => Math.round(i * 0.8);
    for (let i = 0; i < 9; i++) {
      const ty = y + h - 9 + i, ext = tail(i);
      if (isE) { R(x + w - 1, ty, ext + 2, 1, edge); if (ext > 0) R(x + w - 1, ty, ext, 1, bot); }
      else { R(x - ext - 1, ty, ext + 2, 1, edge); if (ext > 0) R(x - ext + 1, ty, ext, 1, bot); }
    }
    if (isE) R(x + w - 1, y + h - 1, 9, 1, edge); else R(x - 8, y + h - 1, 9, 1, edge);
    const mid = y + (isE ? 14 : 15);
    R(x + 2, y + 1, w - 4, mid - y - 1, top); R(x + 1, y + 2, w - 2, mid - y - 2, top);
    R(x + 1, mid, w - 2, y + h - 2 - mid, bot); R(x + 2, y + h - 2, w - 4, 1, bot);
    R(x + 3, y + 1, w - 6, 1, '#ffffff');
    R(x + 1, mid, w - 2, 1, '#d4d8c6');
    // accent tab
    R(x + 1, y + 2, 4, h - 4, acc); R(x + 2, y + 1, 3, 1, acc); R(x + 1, y + 2, 1, h - 4, Col.light(acc, 0.8)); R(x + 4, y + 2, 1, h - 4, Col.shade(acc, 0.6));
    Font.draw(c, m.name, x + 9, y + 3);
    const nw = Font.width(m.name);
    UI.gender(c, m.gender, x + 11 + nw, y + 3);
    Tiny.draw(c, 'Lv', x + w - 30, y + 5, '#404048');
    Font.drawR(c, String(m.level), x + w - 6, y + 3);
    if (m.status) UI.statusTag(c, m.status, x + 9, y + 17);
    UI.hpBar(c, x + w - 72, y + 17, 50, side.shownHp / m.stats.hp);
    if (!isE) {
      Font.drawR(c, `${side.shownHp}/${m.stats.hp}`, x + w - 6, y + 25);
      const ex = this.expShown != null ? this.expShown : m.expFrac();
      Tiny.draw(c, 'EXP', x + 9, y + h - 7, '#4a6a98');
      UI.expBar(c, x + 25, y + h - 7, w - 32, ex);
    }
    if (isE && G.dex.caught[m.sp]) { drawBall(c, x + w - 42, y + 7, 0, 'pokeball', false, false, 0.5); }
  }
  drawPartyBalls(c) {
    const party = this.E.party;
    c.fillStyle = 'rgba(40,48,74,0.85)'; c.fillRect(0, 22, 112, 14); c.fillStyle = '#e87858'; c.fillRect(0, 22, 3, 14);
    for (let i = 0; i < 6; i++) {
      const m = party[i];
      const x = 16 + i * 16, y = 29;
      if (!m) { PX.ring(c, x, y, 4, '#8890a8'); continue; }
      drawBall(c, x, y, 0, 'pokeball', false, m.fainted, 0.7);
    }
  }
}

const silCache = new WeakMap();
function silhouetteCached(img, col) {
  let m = silCache.get(img);
  if (!m) { m = {}; silCache.set(img, m); }
  if (!m[col]) m[col] = silhouette(img, col);
  return m[col];
}
function drawBall(c, x, y, rot, type = 'pokeball', open, dark, scale = 1) {
  const top = { pokeball: '#e83838', greatball: '#3868e0', ultraball: '#383838' }[type] || '#e83838';
  const r = Math.round(5 * scale);
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(rot || 0);
  PX.circle(c, 0, 0, r + 1, '#202028');
  PX.circle(c, 0, 0, r, dark ? '#9898a0' : '#f8f8f8');
  c.fillStyle = dark ? '#6a6a70' : top;
  for (let dy = -r; dy < 0; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); c.fillRect(-w, dy, w * 2 + 1, 1); }
  if (type === 'ultraball' && !dark) { c.fillStyle = '#f8d030'; c.fillRect(-r, -Math.ceil(r / 2), 2, 2); c.fillRect(r - 1, -Math.ceil(r / 2), 2, 2); }
  if (type === 'greatball' && !dark) { c.fillStyle = '#e84848'; c.fillRect(-r + 1, -2, 2, 1); c.fillRect(r - 2, -2, 2, 1); }
  c.fillStyle = '#202028'; c.fillRect(-r, 0, r * 2 + 1, 1);
  c.fillStyle = '#f8f8f8'; c.fillRect(-1, -1, 3, 3); c.fillStyle = '#202028'; c.fillRect(0, 0, 1, 1);
  if (open) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-r - 2, -r - 4, r * 2 + 5, 3); }
  c.fillStyle = 'rgba(255,255,255,0.7)'; if (!dark) c.fillRect(-r + 2, -r + 1, 2, 1);
  c.restore();
}

// ── battle menus ──
function pill(c, x, y, w, h, col, sel) {
  const R = (xx, yy, ww, hh, cc) => { c.fillStyle = cc; c.fillRect(xx, yy, ww, hh); };
  const base = sel ? col : Col.mix(col, '#7a7e8e', 0.38);
  const edge = sel ? '#ffffff' : Col.dark(base, 0.55);
  if (sel) { R(x + 1, y - 1, w - 2, h + 2, '#1a1e2e'); R(x - 1, y + 1, w + 2, h - 2, '#1a1e2e'); R(x, y, w, h, '#1a1e2e'); }
  R(x + 1, y, w - 2, h, edge); R(x, y + 1, w, h - 2, edge);
  const hh = Math.floor(h / 2);
  R(x + 1, y + 1, w - 2, hh - 1, Col.light(base, 0.55)); R(x + 1, y + hh, w - 2, h - hh - 1, base);
  R(x + 2, y + 1, w - 4, 1, Col.light(base, 1.2));
  R(x + 1, y + h - 2, w - 2, 1, Col.shade(base, 0.6));
}
class ActionMenu {
  constructor(S) { this.S = S; this.i = S.menuMem || 0; this.done = false; }
  update() {
    const i = this.i;
    if (Input.repeat('left') && i % 2 === 1) { this.i--; Sound.sfx('cursor'); }
    if (Input.repeat('right') && i % 2 === 0) { this.i++; Sound.sfx('cursor'); }
    if (Input.repeat('up') && i >= 2) { this.i -= 2; Sound.sfx('cursor'); }
    if (Input.repeat('down') && i < 2) { this.i += 2; Sound.sfx('cursor'); }
    if (Input.confirm()) { Sound.sfx('select'); this.S.menuMem = this.i; this.result = this.i; this.done = true; }
    if (Input.cancel()) { this.i = 3; Sound.sfx('cursor'); }
  }
  draw(c) {
    c.fillStyle = '#1c2236'; c.fillRect(0, 144, 256, 48); c.fillStyle = '#2a3250'; c.fillRect(0, 144, 256, 1);
    UI.box(c, 2, 146, 128, 44);
    Font.draw(c, 'What will', 14, 153); Font.draw(c, `${this.S.P.mon.name} do?`, 14, 169);
    const labels = ['FIGHT', 'BAG', 'POKéMON', 'RUN'];
    const cols = ['#e0503e', '#e8a42c', '#4aaa52', '#4a82d8'];
    labels.forEach((l, k) => {
      const sel = k === this.i;
      const x = 134 + (k % 2) * 61, y = 149 + Math.floor(k / 2) * 21 - (sel && (Math.floor(Game.frame / 16) % 2) ? 1 : 0);
      pill(c, x, y, 58, 18, cols[k], sel);
      Font.drawC(c, l, x + 29, y + 5, sel ? '#ffffff' : '#eceef4', Col.dark(cols[k], sel ? 0.5 : 0.35));
    });
  }
}
class MoveMenu {
  constructor(S) { this.S = S; this.i = Math.min(S.moveMem || 0, S.P.mon.moves.length - 1); this.done = false; }
  update() {
    const n = this.S.P.mon.moves.length, i = this.i;
    const go = j => { if (j >= 0 && j < n && j !== this.i) { this.i = j; Sound.sfx('cursor'); } };
    if (Input.repeat('left') && i % 2 === 1) go(i - 1);
    if (Input.repeat('right') && i % 2 === 0) go(i + 1);
    if (Input.repeat('up') && i >= 2) go(i - 2);
    if (Input.repeat('down') && i < 2) go(i + 2);
    if (Input.confirm()) { Sound.sfx('select'); this.S.moveMem = this.i; this.result = this.i; this.done = true; }
    if (Input.cancel()) { Sound.sfx('cancel'); this.result = -1; this.done = true; }
  }
  draw(c) {
    const m = this.S.P.mon;
    c.fillStyle = '#1c2236'; c.fillRect(0, 144, 256, 48); c.fillStyle = '#2a3250'; c.fillRect(0, 144, 256, 1);
    for (let k = 0; k < 4; k++) {
      const x = 4 + (k % 2) * 85, y = 149 + Math.floor(k / 2) * 21;
      const mv = m.moves[k];
      if (!mv) { pill(c, x, y, 82, 18, '#6a6e7e', false); Font.drawC(c, '-', x + 41, y + 5, '#c0c4d0', null); continue; }
      const md = MOVES[mv.id], sel = k === this.i;
      const col = mv.pp ? TYPE_COLOR[md.type] : '#8a8a92';
      pill(c, x, y - (sel && (Math.floor(Game.frame / 16) % 2) ? 1 : 0), 82, 18, col, sel);
      Font.drawC(c, md.name, x + 41, y + 5 - (sel && (Math.floor(Game.frame / 16) % 2) ? 1 : 0), '#ffffff', Col.dark(col, 0.5));
    }
    UI.box(c, 176, 146, 78, 44);
    const cur = m.moves[this.i], md = MOVES[cur.id];
    Font.draw(c, 'PP', 186, 153);
    const ppc = cur.pp === 0 ? '#d03030' : cur.pp <= cur.max / 4 ? '#e08020' : '#404048';
    Font.drawR(c, `${cur.pp}/${cur.max}`, 246, 153, ppc);
    UI.typeBadge(c, md.type, 184, 170, 36);
    const catc = { P: '#e07040', S: '#5880e0', X: '#a0a0a8' }[md.cat];
    c.fillStyle = Col.shade(catc, 1); c.fillRect(223, 170, 24, 11); c.fillStyle = catc; c.fillRect(224, 171, 22, 9); c.fillStyle = Col.light(catc); c.fillRect(224, 171, 22, 1);
    Font.drawC(c, { P: 'PHY', S: 'SPC', X: 'STA' }[md.cat], 235, 172, '#ffffff', null);
  }
}
// level-up stat window: first shows gains, then totals
class StatBox {
  constructor(m, rec) { this.m = m; this.rec = rec; this.stage = 0; this.done = false; this.t = 0; }
  update() { this.t++; if (this.t > 6 && (Input.confirm() || Input.cancel())) { Sound.sfx('text'); if (++this.stage > 1) this.done = true; this.t = 0; } }
  draw(c) {
    UI.box(c, 150, 44, 104, 98);
    const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const labels = ['Max. HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
    keys.forEach((k, i) => {
      const y = 54 + i * 14;
      Font.draw(c, labels[i], 160, y);
      const txt = this.stage === 0 ? `+${this.rec.now[k] - this.rec.old[k]}` : String(this.rec.now[k]);
      Font.drawR(c, txt, 244, y, this.stage === 0 ? '#d05838' : '#404048');
    });
  }
}

// teaching a move (level-up, TM); say(t) returns a Say waiter
function* teachMove(m, id, sayFn, battle) {
  const mv = MOVES[id];
  if (!mv || m.moves.some(x => x.id === id)) return false;
  if (m.moves.length < 4) {
    m.addMove(id);
    Sound.jingle('levelup', null);
    yield sayFn(`${m.name} learned ${mv.name}!`);
    return true;
  }
  yield sayFn(`${m.name} wants to learn the move ${mv.name}.`);
  yield sayFn(`However, ${m.name} already knows four moves.`);
  while (true) {
    const r = yield* ask(`Should a move be forgotten and replaced with ${mv.name}?`, ['Yes', 'No'], { battle });
    if (r === 0) {
      const i = yield new ForgetMenu(m, id);
      if (i >= 0 && i < 4) {
        const old = MOVES[m.moves[i].id].name;
        yield sayFn('1, 2, and... ... ... Poof!');
        yield sayFn(`${m.name} forgot how to use ${old}.`);
        yield sayFn('And...');
        m.replaceMove(i, id);
        Sound.jingle('levelup', null);
        yield sayFn(`${m.name} learned ${mv.name}!`);
        return true;
      }
    }
    const r2 = yield* ask(`Stop trying to teach ${mv.name}?`, ['Yes', 'No'], { battle });
    if (r2 === 0) { yield sayFn(`${m.name} did not learn ${mv.name}.`); return false; }
  }
}
class ForgetMenu {
  constructor(m, newId) { this.m = m; this.newId = newId; this.i = 0; this.done = false; }
  update() {
    const n = 5;
    if (Input.repeat('up')) { this.i = (this.i + n - 1) % n; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.i = (this.i + 1) % n; Sound.sfx('cursor'); }
    if (Input.confirm()) { Sound.sfx('select'); this.result = this.i === 4 ? -1 : this.i; this.done = true; }
    if (Input.cancel()) { Sound.sfx('cancel'); this.result = -1; this.done = true; }
  }
  draw(c) {
    c.fillStyle = 'rgba(16,20,40,0.7)'; c.fillRect(0, 0, 256, 192);
    UI.box(c, 8, 10, 240, 118);
    Font.draw(c, `Forget which move?`, 20, 18, '#3060c8', '#b8c8f0');
    const ids = this.m.moves.map(x => x.id).concat([this.newId]);
    ids.forEach((id, k) => {
      const md = MOVES[id], y = 36 + k * 16 + (k === 4 ? 4 : 0);
      UI.typeBadge(c, md.type, 30, y - 1, 34);
      Font.draw(c, md.name, 72, y, k === 4 ? '#3a8a3a' : '#404048');
      Font.drawR(c, md.pow > 1 ? String(md.pow) : '--', 190, y);
      Font.drawR(c, `${k < 4 ? this.m.moves[k].max : md.pp}PP`, 232, y);
      if (k === this.i) UI.cursor(c, 18, y);
    });
    c.fillStyle = '#c8c0b0'; c.fillRect(20, 99, 216, 1);
  }
}
