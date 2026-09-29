'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Title, introduction, ending and credits
// ─────────────────────────────────────────────────────────────────────────────
const SkyCache = {};
// dithered night sky with a star field (static part cached)
function skyBase(o) {
  const key = (o.grey ? 'g' : 'c') + (o.top || '') + (o.mid || '') + (o.bot || '');
  if (SkyCache[key]) return SkyCache[key];
  const cv = mkCanvas(W, H), x = cv.ctx;
  const cols = o.grey ? ['#141418', '#1e1e26', '#2c2c36', '#3a3a46'] : [o.top || '#060920', '#0e1238', o.mid || '#1c1a52', '#2c2466', o.bot || '#3e2c70'];
  const id = x.createImageData(W, H), d = new Uint32Array(id.data.buffer), P = cols.map(Col.pack);
  for (let yy = 0; yy < H; yy++) { const tt = (yy / (H - 1)) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(tt)), f = tt - i; for (let xx = 0; xx < W; xx++) d[yy * W + xx] = f > bayer(xx, yy) ? P[i + 1] : P[i]; }
  x.putImageData(id, 0, 0);
  const r = seeded(7);
  for (let i = 0; i < 150; i++) { const sx = Math.floor(r() * W), sy = Math.floor(r() * H * 0.78), b = r(); x.fillStyle = o.grey ? (b < 0.3 ? '#9a9aa4' : '#5a5a66') : (b < 0.12 ? '#fff4c8' : b < 0.5 ? '#b8c6f0' : '#6a78b8'); x.fillRect(sx, sy, 1, 1); }
  SkyCache[key] = cv;
  return cv;
}
function drawAuroraSky(c, t, o = {}) {
  c.drawImage(skyBase(o), 0, 0);
  const r = seeded(19);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H * 0.7), tw = Math.sin(t * 0.045 + i * 2.3);
    if (tw < 0.2) continue;
    c.fillStyle = o.grey ? '#b0b0b8' : tw > 0.85 ? '#ffffff' : '#dce4ff'; c.fillRect(x, y, 1, 1);
    if (tw > 0.95 && !o.grey) { c.fillStyle = 'rgba(220,230,255,0.6)'; c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); }
  }
  const bands = o.grey ? [[170, 170, 180]] : [[80, 255, 170], [100, 210, 255], [190, 120, 255], [255, 140, 200]];
  const k = o.strength != null ? o.strength : 1;
  bands.forEach(([rr, gg, bb], b) => {
    const rgb = 'rgba(' + rr + ',' + gg + ',' + bb + ',';
    for (let x = 0; x < W; x += 2) {
      const y = 22 + b * 15 + Math.sin(x * 0.022 + t * 0.012 + b * 1.3) * 16 + Math.sin(x * 0.007 + t * 0.008) * 12;
      const h = 24 + Math.sin(x * 0.035 + t * 0.02 + b * 2) * 10;
      const ray = 0.65 + 0.35 * Math.sin(x * 0.55 + b * 3 + Math.sin(t * 0.03 + x * 0.05) * 2);
      const yi = Math.round(y), hi = Math.round(h);
      c.fillStyle = rgb + (0.07 * k * ray) + ')'; c.fillRect(x, yi, 2, Math.round(hi * 0.45));
      c.fillStyle = rgb + (0.16 * k * ray) + ')'; c.fillRect(x, yi + Math.round(hi * 0.45), 2, Math.round(hi * 0.4));
      c.fillStyle = rgb + (0.34 * k * ray) + ')'; c.fillRect(x, yi + Math.round(hi * 0.85), 2, hi - Math.round(hi * 0.85));
      c.fillStyle = rgb + (0.5 * k * ray) + ')'; c.fillRect(x, yi + hi - 1, 2, 1);
    }
  });
}
// moonlit ranges, cached; the Prism Spire glows on the far peak
const MtnCache = {};
function mountainLayers(grey) {
  const key = grey ? 'g' : 'c';
  if (MtnCache[key]) return MtnCache[key];
  const mk = (fn, col, lit, cap, shade) => {
    const cv = mkCanvas(W, H), x = cv.ctx;
    for (let i = 0; i < W; i++) {
      const y = Math.round(fn(i)), d = fn(i + 1) - fn(i);
      x.fillStyle = col; x.fillRect(i, y, 1, H - y);
      if (lit && d > 0.2) { x.fillStyle = lit; x.fillRect(i, y, 1, 2 + (d > 0.8 ? 1 : 0)); }
      if (shade && d < -0.3) { x.fillStyle = shade; x.fillRect(i, y + 1, 1, 4); }
      if (cap && y < cap.y) { x.fillStyle = cap.col; x.fillRect(i, y, 1, Math.min(cap.y - y + 2, 3 + ((i * 5) % 4))); }
    }
    return cv;
  };
  const pk = (base, amp, seed, sharp) => i => base - amp * (Math.abs(Math.sin(i * 0.019 + seed)) ** sharp * 0.75 + fbm(i / 18, seed, seed) * 0.4);
  const far = mk(pk(148, 62, 1.3, 1.8), grey ? '#34343e' : '#2a2c62', grey ? '#50505c' : '#4a4e90', { y: 104, col: grey ? '#6a6a76' : '#8a90cc' }, grey ? '#2a2a32' : '#22245a');
  const mid = mk(pk(160, 34, 4.1, 1.4), grey ? '#24242c' : '#1a1c46', grey ? '#3a3a44' : '#2e3272', null, null);
  const near = mk(i => 162 - 7 * (Math.sin(i * 0.05 + 7) * 0.5 + fbm(i / 12, 3, 9)), grey ? '#16161c' : '#0e1030', null, null, null);
  MtnCache[key] = { far, mid, near };
  return MtnCache[key];
}
function drawSpire(c, t, sx, top, base, grey) {
  if (!grey) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
    c.globalCompositeOperation = 'lighter';
    for (let r = 26; r > 4; r -= 4) { c.fillStyle = 'rgba(150,170,255,' + (0.03 + pulse * 0.02) + ')'; c.beginPath(); c.arc(sx, top + 18, r, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(200,210,255,' + (0.06 + pulse * 0.05) + ')'; c.fillRect(sx - 1, 0, 3, top);
    c.globalCompositeOperation = 'source-over';
  }
  const hw = 8, cols = grey ? ['#8a8a96', '#6a6a76', '#50505c'] : ['#e6ecff', '#a8b2f0', '#7078c8'];
  c.fillStyle = cols[1]; c.beginPath(); c.moveTo(sx, top); c.lineTo(sx + hw, base); c.lineTo(sx - hw, base); c.closePath(); c.fill();
  c.fillStyle = cols[0]; c.beginPath(); c.moveTo(sx, top); c.lineTo(sx - 2, base); c.lineTo(sx - hw, base); c.closePath(); c.fill();
  c.fillStyle = cols[2]; c.beginPath(); c.moveTo(sx, top); c.lineTo(sx + hw, base); c.lineTo(sx + 3, base); c.closePath(); c.fill();
  if (!grey) {
    const hues = ['#ff8080', '#ffc860', '#80e890', '#70c0ff', '#c090ff'];
    hues.forEach((h, i) => { c.fillStyle = h; c.fillRect(sx - 1, top + 10 + i * 9, 2, 5); });
    if ((t >> 4) % 6 === 0) PX.star(c, sx, top, 4, '#ffffff');
  }
}
function drawMountains(c, t, grey) {
  const L = mountainLayers(grey);
  c.drawImage(L.far, 0, 0);
  drawSpire(c, t, 176, 66, 124, grey);
  c.drawImage(L.mid, 0, 0);
  c.drawImage(L.near, 0, 0);
}
// mirror everything above y0 into a rippling lake below it
function drawLake(c, t, y0) {
  const h = H - y0;
  for (let k = 0; k < h; k++) {
    const src = y0 - 1 - Math.floor(k * 2.4), off = Math.round(Math.sin(k * 0.7 + t * 0.08) * (0.5 + k / h * 2));
    if (src < 0) break;
    c.drawImage(c.canvas, 0, src, W, 1, off, y0 + k, W, 1);
  }
  c.fillStyle = 'rgba(8,14,44,0.38)'; c.fillRect(0, y0, W, h);
  c.fillStyle = 'rgba(160,190,255,0.35)'; c.fillRect(0, y0, W, 1);
  for (let i = 0; i < 18; i++) { const x = (i * 47 + Math.floor(t * 0.3)) % (W + 20) - 10, y = y0 + 3 + (i * 13) % (h - 4); c.fillStyle = 'rgba(200,220,255,' + (0.15 + 0.15 * Math.sin(t * 0.06 + i)) + ')'; c.fillRect(x, y, 4 + (i % 3) * 2, 1); }
}
// dark pine silhouettes framing the scene
const ShoreCache = {};
function drawShore(c) {
  if (!ShoreCache.c) {
    const cv = mkCanvas(W, H), x = cv.ctx;
    const r = seeded(33);
    x.fillStyle = '#05061a';
    const pine = (px, base, hgt) => { for (let yy = 0; yy < hgt; yy++) { const hw = Math.round((yy / hgt) * hgt * 0.32 + (yy % 4 === 3 ? 1 : 0)); x.fillRect(Math.round(px - hw), Math.round(base - hgt + yy), hw * 2 + 1, 1); } x.fillRect(Math.round(px), Math.round(base), 1, 3); };
    for (let i = 0; i < 7; i++) pine(4 + i * 9 + r() * 4, 178 - i * 2 + r() * 4, 34 - i * 3 + r() * 6);
    for (let i = 0; i < 6; i++) pine(W - 6 - i * 10 - r() * 4, 180 - i * 2, 32 - i * 3 + r() * 6);
    x.fillRect(0, 176, 70, 16); x.fillRect(W - 66, 177, 66, 15);
    for (let i = 0; i < 40; i++) { const px = r() * 70, hh = 2 + r() * 5; x.fillRect(Math.round(px), Math.round(176 - hh), 1, Math.round(hh)); }
    ShoreCache.c = cv;
  }
  c.drawImage(ShoreCache.c, 0, 0);
}

// intro backdrop: dithered dawn light with a ringed stage
function introStage() {
  if (SkyCache.intro) return SkyCache.intro;
  const cv = mkCanvas(W, H), x = cv.ctx, id = x.createImageData(W, H), d = new Uint32Array(id.data.buffer);
  const P = ['#bcdcf4', '#cfe6f8', '#e2effa', '#f2f4f2', '#faf4e6', '#f4ead6'].map(Col.pack);
  for (let yy = 0; yy < H; yy++) { const tt = (yy / (H - 1)) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(tt)), f = tt - i; for (let xx = 0; xx < W; xx++) { const r = Math.hypot((xx - 128) / 1.6, yy - 110) / 150; const ff = clamp(f + (0.25 - r) * 0.6, 0, 0.999); d[yy * W + xx] = ff > bayer(xx, yy) ? P[i + 1] : P[i]; } }
  x.putImageData(id, 0, 0);
  SkyCache.intro = cv;
  return cv;
}
function introDisc() {
  if (SkyCache.disc) return SkyCache.disc;
  const cv = mkCanvas(160, 34), x = cv.ctx, cx = 80, cy = 14, rx = 76, ry = 13;
  const rows = (r0, rr, col, oy = 0) => { x.fillStyle = col; for (let dy = -rr; dy <= rr; dy++) { const w = Math.round(r0 * Math.sqrt(1 - (dy * dy) / (rr * rr))); x.fillRect(cx - w, cy + dy + oy, w * 2, 1); } };
  rows(rx, ry, 'rgba(90,110,150,0.18)', 5);
  rows(rx, ry, '#c8d4e6', 3);
  rows(rx, ry, '#e6eef8');
  rows(rx - 6, ry - 1, '#f4f8fd');
  x.fillStyle = '#b8c8e0'; for (let a = 0; a < 120; a++) { const t = a / 120 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(t) * (rx - 14)), Math.round(cy + Math.sin(t) * (ry - 3)), 1, 1); }
  x.fillStyle = '#d0dcee'; for (let a = 0; a < 80; a++) { const t = a / 80 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(t) * (rx - 34)), Math.round(cy + Math.sin(t) * (ry - 6)), 1, 1); }
  x.fillStyle = '#ffffff'; x.fillRect(cx - 40, cy - ry + 1, 80, 1);
  SkyCache.disc = cv;
  return cv;
}

class TitleScene {
  constructor() { this.opaque = true; this.t = 0; this.widgets = []; this.co = null; this.phase = 0; this.hoohT = 200; }
  enter() { Sound.play('title', { restart: true }); Game.fadeA = 1; this.fadeIn = true; }
  logo() {
    if (this._logo) return this._logo;
    const c = mkCanvas(256, 80);
    Font.big(c.ctx, 'POKéMON', 128 - Font.width('POKéMON') * 3 / 2, 14, 3, null, '#1a3a8a', (ry, n) => ['#fff4a0', '#f8e058', '#f8d040', '#f8c030', '#f0a820', '#e89018', '#e08010', '#d87010', '#d06010'][Math.min(8, ry)]);
    this._logo = c;
    const a = mkCanvas(256, 60);
    Font.big(a.ctx, 'AURORA', 128 - Font.width('AURORA') * 4 / 2, 10, 4, '#ffffff', null);
    this._aur = a;
    return c;
  }
  update() {
    this.t++;
    if (this.fadeIn) { Game.fadeA = Math.max(0, Game.fadeA - 0.03); if (Game.fadeA <= 0) this.fadeIn = false; }
    if (this.co) { this.co.update(); if (this.co.done) this.co = null; return; }
    if (this.phase === 0 && (Input.confirm() || Input.pressed('a'))) { Sound.sfx('select'); this.co = new Co(this.menuFlow(), this); }
  }
  *menuFlow() {
    const has = Save.exists();
    const items = has ? ['CONTINUE', 'NEW GAME', 'OPTIONS'] : ['NEW GAME', 'OPTIONS'];
    this.phase = 1;
    const r = yield new Choice(items, { x: 88, y: 118, w: 80, cancel: -1 });
    if (r < 0) { this.phase = 0; return; }
    const pickd = items[r];
    if (pickd === 'OPTIONS') { if (!window.G) window.G = newGameState('', 'm'); yield new SceneWait(new OptionsScene()); this.phase = 0; return; }
    if (pickd === 'CONTINUE') {
      Save.load();
      yield fadeOut(30);
      Sound.stop();
      startOverworld(false);
      return;
    }
    if (has) {
      const c = yield* ask('Start a new game? Your saved progress will be lost when you next save.', ['Yes', 'No']);
      if (c !== 0) { this.phase = 0; return; }
    }
    yield fadeOut(40);
    Sound.stop();
    Game.replaceAll(new IntroScene());
  }
  draw(c) {
    const t = this.t;
    drawAuroraSky(c, t);
    // Ho-Oh silhouette crossing with a rainbow trail
    const cycle = 900, ht = (t + this.hoohT) % cycle;
    if (ht < 260) {
      const k = ht / 260;
      const x = lerp(-60, 300, k), y = 70 - Math.sin(k * Math.PI) * 40;
      const hues = ['#ff6060', '#ffb040', '#ffe860', '#70e070', '#60b0ff', '#b070ff'];
      for (let i = 0; i < 40; i++) { const tx = x - i * 3 - 14, ty = y + 10 + Math.sin((i + t) * 0.15) * 2; c.fillStyle = hues[Math.floor(i / 7) % 6]; c.globalAlpha = 0.5 * (1 - i / 40); c.fillRect(Math.round(tx), Math.round(ty), 3, 2); }
      c.globalAlpha = 1;
      const spr = PokeArt.get('hooh', { frame: (t >> 3) % 2 });
      const sil = silhouetteCached(spr, '#141434');
      c.drawImage(sil, Math.round(x - 32), Math.round(y - 30), 64, 64);
    }
    drawMountains(c, t);
    drawLake(c, t, 161);
    drawShore(c);
    // drifting light motes
    for (let i = 0; i < 14; i++) { const mx = (i * 61 + t * 0.25 + Math.sin(t * 0.02 + i) * 8) % (W + 20) - 10, my = 150 - ((i * 29 + t * 0.18) % 120); const a = 0.3 + 0.3 * Math.sin(t * 0.07 + i * 2); c.fillStyle = 'rgba(200,255,220,' + a + ')'; c.fillRect(Math.round(mx), Math.round(my), 1, 1); if (a > 0.5) { c.fillStyle = 'rgba(200,255,220,' + (a * 0.3) + ')'; c.fillRect(Math.round(mx) - 1, Math.round(my), 3, 1); } }
    const logo = this.logo();
    const bob = Math.round(Math.sin(t * 0.04) * 2);
    c.drawImage(logo, 0, 4 + bob);
    // periodic shine sweep across the logo
    const sw = (t % 300) * 2.2 - 60;
    if (sw < 300) {
      const sh = this._shine || (this._shine = mkCanvas(256, 80));
      const x2 = sh.ctx; x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, 256, 80); x2.drawImage(logo, 0, 0);
      x2.globalCompositeOperation = 'source-in'; x2.fillStyle = 'rgba(255,255,255,0.85)';
      x2.beginPath(); x2.moveTo(sw, 0); x2.lineTo(sw + 10, 0); x2.lineTo(sw - 14, 80); x2.lineTo(sw - 24, 80); x2.fill();
      c.drawImage(sh, 0, 4 + bob);
    }
    // rainbow AURORA
    const tmp = this._tmp || (this._tmp = mkCanvas(256, 60));
    const x = tmp.ctx;
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 256, 60);
    x.drawImage(this._aur, 0, 0);
    x.globalCompositeOperation = 'source-in';
    const g = x.createLinearGradient((t * 1.5) % 512 - 256, 0, (t * 1.5) % 512, 0);
    ['#ff7080', '#ffc060', '#fff080', '#80f0a0', '#70c8ff', '#b080ff', '#ff7080'].forEach((col, i) => g.addColorStop(i / 6, col));
    x.fillStyle = g; x.fillRect(0, 0, 256, 60);
    x.globalCompositeOperation = 'source-over';
    // outline for AURORA
    const ol = this._aurO || (this._aurO = (() => { const o = mkCanvas(256, 60); Font.big(o.ctx, 'AURORA', 128 - Font.width('AURORA') * 4 / 2, 10, 4, '#1a1440', '#1a1440'); return o; })());
    c.drawImage(ol, 0, 40 + bob);
    c.drawImage(tmp, 0, 40 + bob);
    Font.drawC(c, '~ The Greyfall ~', 128, 92 + bob, '#e8e0ff', '#3a2a6a');
    if (this.phase === 0 && (t >> 5) % 2 === 0) Font.drawC(c, 'PRESS  START', 128, 128, '#ffffff', '#2a2a5a');
    Font.drawC(c, 'Z: A    X: B    Enter: Menu    Hold X: Run', 128, 181, '#9aa0d0', '#10102a');
  }
}

// ── introduction with Professor Linden ──
class IntroScene {
  constructor() { this.opaque = true; this.t = 0; this.widgets = []; this.show = { prof: 0, eevee: 0, player: 0, sable: 0 }; this.co = new Co(this.flow(), this); this.gSel = 0; }
  enter() { Game.fadeA = 1; Sound.play('dawnmere', { restart: true }); if (!window.G || !G.options) window.G = newGameState('', 'm'); }
  update() { this.t++; this.co.update(); }
  *appear(key, v = 1, frames = 20) { const from = this.show[key]; for (let i = 1; i <= frames; i++) { this.show[key] = lerp(from, v, i / frames); yield 1; } }
  *flow() {
    yield new Fade(0, 40);
    yield* this.appear('prof', 1, 30);
    const P = SPK.linden;
    const s = t => new Say(t, P);
    yield s('Ah, there you are! Welcome, welcome — to the world of Pokémon!');
    yield s('My name is Linden. Folks around here call me the Aurora Professor... though mostly I just stay up too late staring at the sky.');
    Sound.sfx('throw'); yield 16; Sound.sfx('ballOpen'); this.flashT = 12;
    yield* this.appear('eevee', 1, 14);
    Sound.cry('eevee');
    yield s('This little one is a Pokémon.');
    yield s('Creatures like Eevee live all across our world — in the tall grass, the deep sea, the high mountains... even in the light itself, some say.');
    yield s('Here in the Lumira region, people and Pokémon live side by side. We work together, play together... and battle together, to grow stronger.');
    this.showSky = true;
    yield s('And at night, the sky over Lumira fills with the Veil — ribbons of light in every color you can imagine.');
    yield s('Legend says it’s the trail of the Rainbow Pokémon, which painted the world its colors long, long ago.');
    this.showSky = 'grey';
    yield s('But lately... something is wrong. Colors have begun to drain from places. Flowers. Rooftops. Even Pokémon.');
    yield s('We call it the Greyfall.');
    this.showSky = false;
    yield s('...Ah, but I’m getting ahead of myself! Let’s start with you.');
    yield* this.appear('eevee', 0, 12);
    yield* this.appear('prof', 0, 16);
    this.picking = true;
    yield new Say('Now tell me — which of these is you?', Object.assign({ noWait: true }, P));
    const ch = yield new GenderPick(this);
    this.picking = false;
    G.gender = ch === 1 ? 'f' : 'm';
    this.gSel = ch;
    yield* this.appear('player', 1, 16);
    yield s('And what’s your name?');
    let nm = yield new SceneWait(new NameEntry({ title: 'Your name?', max: 8, gender: G.gender }));
    if (!nm) nm = G.gender === 'f' ? 'Ivy' : 'Rowan';
    G.name = nm;
    yield s(`${nm}, is it? What a fine name!`);
    yield* this.appear('player', 0, 16);
    yield* this.appear('sable', 1, 20);
    yield s('This is my granddaughter, Sable. You two have been friends since you were both in diapers...');
    yield s('...and rivals for just as long, if I recall. She’s a sharp one. Sees things other people miss.');
    yield* this.appear('sable', 0, 16);
    yield* this.appear('player', 1, 16);
    yield s(`${nm}! Your very own Pokémon story is about to unfold.`);
    yield s('A world of dreams and colors — and perhaps a few shadows — awaits you!');
    yield s('Let’s go!');
    this.shrink = 1;
    Sound.sfx('whoosh');
    for (let i = 0; i < 40; i++) { this.shrink = 1 - i / 40; yield 1; }
    yield new Fade(1, 30, '#ffffff');
    Sound.stop();
    startOverworld(true);
  }
  draw(c) {
    const t = this.t;
    if (this.showSky) drawAuroraSky(c, t, { grey: this.showSky === 'grey', strength: this.showSky === 'grey' ? 0.6 : 1 });
    else {
      c.drawImage(introStage(), 0, 0);
      // soft aurora ribbon high above
      for (let x = 0; x < W; x += 2) {
        const y = 18 + Math.sin(x * 0.03 + t * 0.015) * 8 + Math.sin(x * 0.011 + t * 0.01) * 6;
        c.fillStyle = 'rgba(120,230,200,0.10)'; c.fillRect(x, Math.round(y), 2, 14);
        c.fillStyle = 'rgba(150,170,255,0.10)'; c.fillRect(x, Math.round(y) + 12, 2, 10);
      }
      for (let i = 0; i < 26; i++) {
        const x = (i * 53 + t * 0.2) % 270 - 10, y = (i * 37 + Math.sin(t * 0.02 + i) * 10) % 150, a = 0.35 + 0.35 * Math.sin(t * 0.05 + i);
        c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (a > 0.55) { c.fillStyle = `rgba(255,255,255,${a * 0.5})`; c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); c.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
      }
    }
    // stage disc
    if (!this.showSky) c.drawImage(introDisc(), 128 - 80, 118);
    else { c.fillStyle = 'rgba(120,150,190,0.25)'; for (let dy = -8; dy <= 8; dy++) { const w = Math.round(70 * Math.sqrt(1 - dy * dy / 64)); c.fillRect(128 - w, 132 + dy, w * 2, 1); } }
    const drawBig = (img, x, alpha, scale = 1) => { if (alpha <= 0) return; c.globalAlpha = alpha; const w = img.width * scale, h = img.height * scale; c.drawImage(img, Math.round(x - w / 2), Math.round(136 - h)); c.globalAlpha = 1; };
    if (this.show.prof > 0) drawBig(TrainerArt.big('prof', 1.6), 128 - (1 - this.show.prof) * 40, this.show.prof);
    if (this.show.eevee > 0) { const spr = PokeArt.get('eevee', { frame: (t >> 4) % 2 }); c.globalAlpha = this.show.eevee; c.drawImage(spr, 170, 138 - spr.bb.y1); c.globalAlpha = 1; }
    if (this.show.sable > 0) drawBig(TrainerArt.big('sable', 1.6), 128 + (1 - this.show.sable) * 40, this.show.sable);
    if (this.show.player > 0) {
      const img = TrainerArt.big(G.gender === 'f' ? 'girl' : 'boy', 1.6);
      drawBig(img, 128, this.show.player, this.shrink != null ? Math.max(0.05, this.shrink) : 1);
    }
    if (this.picking) {
      [['boy', 80], ['girl', 176]].forEach(([k, x], i) => {
        const sel = this.gpick && this.gpick.i === i;
        c.globalAlpha = sel ? 1 : 0.55;
        drawBig(TrainerArt.big(k, 1.4), x, sel ? 1 : 0.55);
        c.globalAlpha = 1;
        if (sel) { Font.drawC(c, '▼', x, 30 + (t >> 3) % 2 * 2, '#e05848', null); }
      });
    }
    if (this.flashT > 0) { this.flashT--; c.fillStyle = `rgba(255,255,255,${this.flashT / 12})`; c.fillRect(0, 0, W, H); }
  }
}
class GenderPick {
  constructor(scene) { this.scene = scene; this.i = 0; this.done = false; scene.gpick = this; }
  update() {
    if (Input.repeat('left') || Input.repeat('right')) { this.i = 1 - this.i; Sound.sfx('cursor'); }
    if (Input.confirm()) { Sound.sfx('select'); this.result = this.i; this.done = true; this.scene.gpick = null; }
  }
  draw(c) { UI.box(c, 4, 144, 248, 44); Font.draw(c, 'Now tell me — which of these is you?', 16, 152); Font.draw(c, this.i === 0 ? '▶ This one!  (boy)' : '▶ This one!  (girl)', 16, 168, '#3060c8', '#b8c8f0'); }
}

// ── ending ──
class EndingScene {
  constructor() { this.opaque = true; this.t = 0; this.widgets = []; this.sat = 0; this.wave = 0; this.focus = null; this.pop = null; this.co = new Co(this.flow(), this); }
  enter() { Game.fadeA = 1; Sound.play('title', { restart: true }); }
  update() { this.t++; this.co.update(); if (this.co.done && !this.closed) Game.pop(); }
  *flow() {
    yield new Fade(0, 60, '#ffffff');
    yield 30;
    yield new Say('Ho-Oh’s light spilled down from the summit of the Prism Spire...', { auto: 140 });
    Sound.sfx('colorBurst');
    for (let i = 0; i <= 150; i++) { this.wave = i / 150; yield 1; }
    yield new Say('...and one by one, the colors of Lumira came home.', { auto: 120 });
    const beats = [
      ['mossgrove', 'tangela', 'In Mossgrove, the Elder Tree bloomed for the first time in twenty years. Bramble cried, and pretended it was pollen.'],
      ['brinecrest', 'ampharos', 'In Brinecrest, Beacon’s light guided the whole fishing fleet home through the night. Maris sailed out to meet every boat.'],
      ['cinderfall', 'arcanine', 'In Cinderfall, Blaise began forging a fourth prism — one of clear crystal, for a Trainer who sees in shades of grey.'],
      ['dawnmere', 'umbreon', 'And in Dawnmere, on the old pier at the edge of the world...'],
    ];
    for (const [loc, sp, text] of beats) {
      this.focus = loc; this.pop = { sp, t: 0 };
      Sound.cry(sp);
      yield new Say(text, { auto: 170 });
    }
    yield new Fade(1, 60, '#000');
    Game.pop();
  }
  draw(c) {
    const t = this.t;
    drawRegionMap(c, t, 1);
    // grey veil receding as a wave from the Spire
    if (this.wave < 1) {
      const R = REGION.spire, r = this.wave * 340;
      const id = c.getImageData(0, 0, W, H), d = id.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dist = Math.hypot(x - R[0], y - R[1]);
        if (dist < r) continue;
        const i = (y * W + x) * 4, l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        d[i] = d[i + 1] = d[i + 2] = l;
        if (dist < r + 6) { d[i] += 80; d[i + 1] += 70; d[i + 2] += 90; }
      }
      c.putImageData(id, 0, 0);
    }
    for (const k of Object.keys(REGION)) {
      const [x, y, , kind] = REGION[k];
      if (kind === 'town') { c.fillStyle = '#303848'; c.fillRect(x - 4, y - 4, 9, 9); c.fillStyle = k === this.focus ? '#f8e060' : '#f05848'; c.fillRect(x - 3, y - 3, 7, 7); }
    }
    if (this.focus) {
      const [x, y] = REGION[this.focus];
      const p = this.pop; p.t++;
      const s = Math.min(1, p.t / 15);
      const spr = PokeArt.get(p.sp, { frame: (t >> 4) % 2 });
      c.drawImage(spr, Math.round(x - 32), Math.round(y - 70 + (1 - s) * 20), 64, 64);
      if ((t >> 3) % 2) { c.strokeStyle = '#ffffff'; c.strokeRect(x - 7.5, y - 7.5, 15, 15); }
    }
    // gentle aurora over the map
    if (this.wave >= 1) { c.globalCompositeOperation = 'lighter'; drawAuroraOverlay(c, t, 0.5); c.globalCompositeOperation = 'source-over'; }
  }
}
function drawAuroraOverlay(c, t, k = 1, top = 0) {
  const bands = [[60, 220, 140], [70, 150, 240], [170, 90, 230]];
  bands.forEach(([r, g, b], i) => {
    for (let x = 0; x < W; x += 2) {
      const y = top + 4 + i * 9 + Math.sin(x * 0.03 + t * 0.015 + i) * 7;
      const grad = c.createLinearGradient(0, y, 0, y + 14);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`); grad.addColorStop(0.7, `rgba(${r},${g},${b},${0.14 * k})`); grad.addColorStop(1, `rgba(${r},${g},${b},${0.3 * k})`);
      c.fillStyle = grad;
      c.fillRect(x, Math.round(y), 2, 14);
    }
  });
}

// ── credits ──
class CreditsScene {
  constructor() {
    this.opaque = true; this.t = 0; this.widgets = []; this.y = H + 10; this.done = false;
    const party = G.party.map(m => m.sp);
    this.parade = party.concat(DEX_ORDER.filter(s => G.dex.caught[s] && !party.includes(s))).slice(0, 14);
    this.lines = [
      ['big', 'POKéMON AURORA'], ['sub', '~ The Greyfall ~'], ['', ''], ['', ''],
      ['h', 'THE LUMIRA REGION'], ['', 'Dawnmere Town'], ['', 'Mossgrove Town'], ['', 'Glimmerwood'], ['', 'Brinecrest Harbor'], ['', 'Emberpeak Tunnel'], ['', 'Cinderfall City'], ['', 'Frostveil Path'], ['', 'The Prism Spire'], ['', ''],
      ['h', 'STARRING'], ['', 'Sable'], ['', 'Professor Everett Linden'], ['', 'Aldric Vane'], ['', 'Bramble, the Evergreen Gardener'], ['', 'Captain Maris'], ['', 'Blaise, the Prism Smith'], ['', 'Admin Slate  ·  Admin Gris'], ['', 'Keeper Ansel & Beacon'], ['', 'Umbreon'], ['', 'Ho-Oh, the Rainbow Pokémon'], ['', ''],
      ['h', 'AND YOU'], ['', G.name], ['', ''],
      ['h', 'STORY, ART, MUSIC & CODE'], ['', 'Built from scratch with Claude Code'], ['', 'Every sprite, tile, and note generated in code'], ['', ''],
      ['h', 'SPECIAL THANKS'], ['', 'Everyone who ever looked up'], ['', 'at the night sky and felt something'], ['', ''],
      ['s', 'Pokémon is © Nintendo, Creatures Inc. and GAME FREAK.'], ['s', 'This is a non-commercial fan work.'], ['', ''], ['', ''],
      ['big2', 'THE END'], ['', ''], ['sub', 'Thank you for playing.'],
    ];
    this.total = this.lines.length * 16 + 80;
  }
  enter() { Game.fadeA = 1; Sound.play('ending', { restart: true }); }
  update() {
    this.t++;
    if (Game.fadeA > 0 && this.t < 60) Game.fadeA = Math.max(0, Game.fadeA - 0.03);
    const speed = Input.held('a') ? 1.5 : 0.35;
    if (this.y > -this.total + 110) this.y -= speed;
    else if (!this.done) { this.done = true; this.endT = this.t; }
    if (this.done && this.t - this.endT > 90 && (Input.confirm() || Input.cancel())) { Sound.sfx('select'); this.closing = true; }
    if (this.closing) { Game.fadeA = Math.min(1, Game.fadeA + 0.03); if (Game.fadeA >= 1 && !this.closed) Game.pop(); }
  }
  draw(c) {
    const t = this.t;
    drawAuroraSky(c, t);
    drawMountains(c, t);
    let y = this.y;
    c.save(); c.beginPath(); c.rect(0, 0, W, 150); c.clip();
    for (const [k, s] of this.lines) {
      if (y > -20 && y < H) {
        if (k === 'big' || k === 'big2') Font.drawC(c, s, 128, y, '#fff4a0', '#6a4a10');
        else if (k === 'sub') Font.drawC(c, s, 128, y, '#e8e0ff', '#3a2a6a');
        else if (k === 'h') Font.drawC(c, s, 128, y, '#90e0ff', '#1a2a5a');
        else if (k === 's') Font.drawC(c, s, 128, y, '#a0a8c8', '#101028');
        else Font.drawC(c, s, 128, y, '#ffffff', '#202048');
      }
      y += 16;
    }
    c.restore();
    c.fillStyle = 'rgba(8,8,24,0.55)'; c.fillRect(0, 152, W, 40);
    // parade
    this.parade.forEach((sp, i) => {
      const x = ((i * 34 + t * 0.4) % (W + 60)) - 30;
      const bob = ((t >> 3) + i) % 2 ? 1 : 0;
      c.drawImage(PokeArt.get(sp, { icon: true }), Math.round(x), 158 - bob * 2);
    });
    if (this.done && (t >> 5) % 2) Font.drawC(c, 'Press A', 128, 136, '#ffffff', '#202048');
  }
}
