'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Battle effects: crisp pixel particles + per-move animation scripts.
//  Each anim is a generator run by the battle coroutine: (S, atk, def, move)
//  where atk/def are "sides" with a .pos() centre.
// ─────────────────────────────────────────────────────────────────────────────
const PX = {
  circle(c, x, y, r, col) {
    x = Math.round(x); y = Math.round(y); r = Math.max(0, Math.round(r));
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); c.fillRect(x - w, y + dy, w * 2 + 1, 1); }
  },
  ring(c, x, y, r, col, th = 1) {
    x = Math.round(x); y = Math.round(y); c.fillStyle = col;
    const steps = Math.max(12, Math.floor(r * 5));
    for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2; c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.8), th, th); }
  },
  line(c, x0, y0, x1, y1, col, w = 1) {
    c.fillStyle = col;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) { const t = i / n; c.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w); }
  },
  star(c, x, y, r, col, inner = '#ffffff') {
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    c.fillStyle = col;
    for (let i = -r; i <= r; i++) { const w = Math.max(0, Math.round((r - Math.abs(i)) / 3)); c.fillRect(x + i, y - w, 1, w * 2 + 1); c.fillRect(x - w, y + i, w * 2 + 1, 1); }
    c.fillStyle = inner; c.fillRect(x - 1, y - 1, 3, 3);
  },
  diamond(c, x, y, r, col) { x = Math.round(x); y = Math.round(y); c.fillStyle = col; for (let i = -r; i <= r; i++) { const w = r - Math.abs(i); c.fillRect(x - w, y + i, w * 2 + 1, 1); } },
  bolt(c, x0, y0, x1, y1, col, seed) {
    const rng = seeded(seed);
    let px = x0, py = y0; const segs = 7;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const nx = lerp(x0, x1, t) + (i < segs ? (rng() - 0.5) * 14 : 0), ny = lerp(y0, y1, t);
      PX.line(c, px, py, nx, ny, '#fff8c0', 3); PX.line(c, px, py, nx, ny, col, 1);
      px = nx; py = ny;
    }
  },
  flame(c, x, y, s, t) {
    const f = (t >> 2) % 2;
    PX.circle(c, x, y, s, '#f04a26');
    c.fillStyle = '#f04a26'; c.fillRect(Math.round(x - s * 0.5), Math.round(y - s * 1.8 - f), Math.max(1, Math.round(s)), Math.round(s * 1.5));
    PX.circle(c, x, y + 1, s * 0.65, '#fa9a2c');
    PX.circle(c, x, y + 1, s * 0.3, '#fde466');
  },
  z(c, x, y, col) { c.fillStyle = col; c.fillRect(x, y, 5, 1); c.fillRect(x + 3, y + 1, 1, 1); c.fillRect(x + 2, y + 2, 1, 1); c.fillRect(x + 1, y + 3, 1, 1); c.fillRect(x, y + 4, 5, 1); },
  heart(c, x, y, col) { c.fillStyle = col; c.fillRect(x - 3, y - 1, 3, 2); c.fillRect(x + 1, y - 1, 3, 2); c.fillRect(x - 3, y + 1, 7, 1); c.fillRect(x - 2, y + 2, 5, 1); c.fillRect(x - 1, y + 3, 3, 1); c.fillRect(x, y + 4, 1, 1); },
};

// spawn an effect object into the scene
function fx(S, o) { const e = Object.assign({ t: 0, life: 30, done: false }, o); S.fx.push(e); return e; }
const lerpP = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

const TYPE_FX = {
  normal: 'tackle', fire: 'ember', water: 'watergun', grass: 'leaf', electric: 'thunder', ice: 'ice', fighting: 'punch', poison: 'sludge', ground: 'mud',
  flying: 'wind', psychic: 'psychic', bug: 'bugbite', rock: 'rock', ghost: 'shadow', dragon: 'dragon', dark: 'pulse', steel: 'steel', fairy: 'moon',
};
const TYPE_TINT = { fire: '#f86030', water: '#50a0f8', grass: '#58c850', electric: '#f8d030', ice: '#98e0f0', poison: '#b050c0', psychic: '#f870a8', ghost: '#7050a0', dark: '#403048', dragon: '#7058f0', steel: '#c0c8d8', rock: '#c0a060', ground: '#c09050', bug: '#a8c030', fighting: '#e05030', flying: '#c0d0f8', fairy: '#f8a8c8', normal: '#ffffff' };

const ANIMS = {
  *tackle(S, a, d) {
    yield* S.lunge(a, d, 10, 5);
    Sound.sfx('hit'); impact(S, d.pos());
    yield 10;
  },
  *quick(S, a, d) {
    const A = a.pos(), B = d.pos();
    Sound.sfx('whoosh');
    a.vis.hidden = true;
    for (let i = 0; i < 4; i++) fx(S, { life: 10, draw(c, e) { const p = lerpP(A, B, e.t / 10); PX.line(c, p.x - 14, p.y - 6 + i * 4, p.x, p.y - 6 + i * 4, '#ffffff'); } });
    yield 10;
    impact(S, B); Sound.sfx('hit');
    yield 6; a.vis.hidden = false; yield 6;
  },
  *punch(S, a, d) { yield* S.lunge(a, d, 12, 4); Sound.sfx('hitSuper'); impact(S, d.pos(), 1.5, '#f8a040'); S.shakeSide(d, 3, 10); yield 12; },
  *scratch(S, a, d) {
    const B = d.pos(); Sound.sfx('hit');
    fx(S, { life: 18, draw(c, e) { const k = Math.min(1, e.t / 8); for (let i = 0; i < 3; i++) { const x0 = B.x - 12 + i * 8, y0 = B.y - 14; PX.line(c, x0, y0, x0 + 10 * k, y0 + 26 * k, e.t > 12 ? '#e0e0e0' : '#ffffff', 2); } } });
    yield 14;
  },
  *slash(S, a, d) {
    const B = d.pos(); Sound.sfx('whoosh');
    fx(S, { life: 16, draw(c, e) { const k = e.t / 16; for (let i = 0; i < 14; i++) { const ang = -2.4 + (i / 14) * 2.2 * Math.min(1, k * 2); PX.circle(c, B.x + Math.cos(ang) * 18, B.y + Math.sin(ang) * 18, 1.5 - k, '#ffffff'); } } });
    yield 8; Sound.sfx('hit'); yield 8;
  },
  *bite(S, a, d) {
    const B = d.pos(); Sound.sfx('bite');
    fx(S, { life: 20, draw(c, e) {
      const k = Math.min(1, e.t / 10), gap = lerp(18, 3, k);
      for (const s of [-1, 1]) {
        c.fillStyle = '#ffffff';
        for (let i = -3; i <= 3; i++) { const x = B.x + i * 5; const y = B.y + s * gap; c.fillRect(x - 2, y - (s < 0 ? 0 : 5), 5, 5); PX.diamond(c, x, y + s * -3, 2, '#e8e8f0'); }
      }
    } });
    yield 12; impact(S, B, 0.8); yield 8;
  },
  *ember(S, a, d, mv) {
    const A = a.pos(), B = d.pos(); Sound.sfx('fire');
    for (let i = 0; i < 3; i++) fx(S, { life: 22, delay: i * 5, draw(c, e) { const t = (e.t - this.delay) / 16; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); PX.flame(c, p.x, p.y - Math.sin(t * Math.PI) * 12, 3, e.t); } });
    yield 24;
    burst(S, B, 'fire'); yield 14;
  },
  *flamethrower(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('fire');
    fx(S, { life: 34, draw(c, e) { for (let i = 0; i < 10; i++) { const t = ((e.t * 0.05 + i * 0.1) % 1); if (e.t < 26 || t > 0.6) { const p = lerpP(A, B, t); PX.flame(c, p.x + Math.sin(i + e.t) * 3, p.y + Math.cos(i * 2 + e.t) * 3, 2 + t * 3, e.t + i); } } } });
    yield 20; Sound.sfx('fire'); burst(S, B, 'fire'); yield 20;
  },
  *fireblast(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('fire');
    fx(S, { life: 16, draw(c, e) { const p = lerpP(A, B, e.t / 16); PX.flame(c, p.x, p.y, 5, e.t); } });
    yield 16;
    S.flash('#f8a040', 10, 0.5); Sound.sfx('fire');
    fx(S, { life: 30, draw(c, e) { const r = Math.min(20, e.t * 2); for (const [dx, dy] of [[0, -1], [-1, 0.3], [1, 0.3], [-0.6, 1], [0.6, 1]]) for (let k = 0; k < r; k += 4) PX.flame(c, B.x + dx * k, B.y + dy * k, 3, e.t + k); } });
    S.shakeSide(d, 3, 20); yield 30;
  },
  *sacredfire(S, a, d) {
    const B = d.pos(); Sound.sfx('fire'); S.flash('#fff0c0', 8, 0.6);
    const hues = ['#f85050', '#f8a030', '#f8e040', '#60d060', '#50a0f8', '#a060f0'];
    fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 6; i++) { const x = B.x - 20 + i * 8, h = Math.min(40, e.t * 3) * (0.7 + 0.3 * Math.sin(e.t * 0.5 + i)); c.fillStyle = hues[(i + (e.t >> 2)) % 6]; c.fillRect(x - 2, B.y + 16 - h, 5, h); PX.flame(c, x, B.y + 16 - h, 3, e.t + i); } } });
    S.shakeSide(d, 3, 30); yield 40;
  },
  *wisp(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('fire');
    for (let i = 0; i < 3; i++) fx(S, { life: 36, draw(c, e) { const t = Math.min(1, e.t / 26); const p = lerpP(A, B, t); const ang = e.t * 0.3 + i * 2.1; PX.circle(c, p.x + Math.cos(ang) * 8, p.y + Math.sin(ang) * 6, 3, '#6080f8'); PX.circle(c, p.x + Math.cos(ang) * 8, p.y + Math.sin(ang) * 6, 1, '#d0e0ff'); } });
    yield 36;
  },
  *watergun(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('water');
    fx(S, { life: 26, draw(c, e) { for (let i = 0; i < 8; i++) { const t = (e.t / 18) - i * 0.06; if (t < 0 || t > 1) continue; const p = lerpP(A, B, t); PX.circle(c, p.x, p.y - Math.sin(t * Math.PI) * 10, 2, '#58a8f8'); c.fillStyle = '#e0f4ff'; c.fillRect(Math.round(p.x) - 1, Math.round(p.y - Math.sin(t * Math.PI) * 10) - 1, 1, 1); } } });
    yield 20; splash(S, B); yield 14;
  },
  *bubble(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('water');
    for (let i = 0; i < 6; i++) fx(S, { life: 32, draw(c, e) { const t = e.t / 24 - i * 0.05; if (t < 0) return; if (t > 1) { if (e.t < 30) PX.ring(c, B.x + (i - 3) * 5, B.y + (i % 2) * 6, 5, '#e0f4ff'); return; } const p = lerpP(A, B, t); const x = p.x + Math.sin(t * 10 + i) * 5, y = p.y + Math.cos(t * 8 + i) * 5; PX.ring(c, x, y, 4, '#78c8f8'); c.fillStyle = '#ffffff'; c.fillRect(Math.round(x - 2), Math.round(y - 2), 1, 1); } });
    yield 32;
  },
  *pulse(S, a, d, mv) {
    const A = a.pos(), B = d.pos(); const col = TYPE_TINT[mv ? mv.type : 'water'];
    Sound.sfx(mv && mv.type === 'dark' ? 'shadow' : 'water');
    fx(S, { life: 30, draw(c, e) { for (let i = 0; i < 4; i++) { const t = e.t / 22 - i * 0.12; if (t < 0 || t > 1) continue; const p = lerpP(A, B, t); PX.ring(c, p.x, p.y, 4 + t * 8, col, 2); } } });
    yield 26; impact(S, B, 1, col); yield 10;
  },
  *surf(S, a, d) {
    Sound.sfx('water');
    const dir = d.isEnemy ? 1 : -1;
    fx(S, { life: 44, draw(c, e) {
      const x = dir > 0 ? lerp(-60, 300, e.t / 44) : lerp(300, -60, e.t / 44);
      c.fillStyle = 'rgba(64,144,240,0.8)'; c.fillRect(Math.round(x - 40), 30, 60, 120);
      c.fillStyle = '#88c8f8'; c.fillRect(Math.round(x - 40), 30, 60, 6);
      for (let y = 30; y < 150; y += 8) { c.fillStyle = '#ffffff'; c.fillRect(Math.round(x + 18 * dir + Math.sin(y + e.t) * 3), y, 3, 3); }
    } });
    yield 30; S.shakeSide(d, 3, 12); Sound.sfx('hitSuper'); yield 14;
  },
  *hydropump(S, a, d) { yield* beam(S, a, d, '#3880e8', '#d0f0ff', 5, 'water'); splash(S, d.pos()); yield 10; },
  *vine(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('whoosh');
    fx(S, { life: 22, draw(c, e) { const k = Math.min(1, e.t / 8); const mid = { x: (A.x + B.x) / 2, y: Math.min(A.y, B.y) - 30 }; let px = A.x, py = A.y; for (let i = 1; i <= 12; i++) { const t = (i / 12) * k; const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * mid.x + t * t * B.x, y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * mid.y + t * t * B.y; PX.line(c, px, py, x, y, '#3a9a3a', 2); px = x; py = y; } } });
    yield 10; Sound.sfx('hit'); impact(S, B, 0.9, '#a8f080'); yield 12;
  },
  *leaf(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('leaf');
    for (let i = 0; i < 6; i++) fx(S, { life: 30, draw(c, e) { const t = e.t / 20 - i * 0.07; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); const x = p.x + Math.sin(t * 6 + i) * 8, y = p.y + Math.cos(t * 6 + i * 2) * 8; PX.diamond(c, x, y, 3, '#58c050'); c.fillStyle = '#b8f098'; c.fillRect(Math.round(x), Math.round(y) - 2, 1, 4); } });
    yield 22; Sound.sfx('hit'); impact(S, B, 0.9, '#a8f080'); yield 14;
  },
  *petals(S, a, d) {
    const B = d.pos(); Sound.sfx('leaf');
    fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 14; i++) { const ang = e.t * 0.15 + i * 0.45; const r = 26 - e.t * 0.5; PX.diamond(c, B.x + Math.cos(ang) * r, B.y + Math.sin(ang) * r * 0.7, 2, i % 2 ? '#f8a0c0' : '#fbd0e0'); } } });
    yield 26; Sound.sfx('hit'); S.shakeSide(d, 2, 10); yield 14;
  },
  *drain(S, a, d, mv) {
    const A = a.pos(), B = d.pos(); Sound.sfx('shimmer');
    const col = mv && mv.type === 'bug' ? '#f06060' : mv && mv.type === 'psychic' ? '#f870c0' : '#60e060';
    impact(S, B, 0.8, col);
    for (let i = 0; i < 6; i++) fx(S, { life: 36, draw(c, e) { const t = e.t / 26 - i * 0.06; if (t < 0 || t > 1) return; const p = lerpP(B, A, t); PX.circle(c, p.x + Math.sin(t * 9 + i) * 8, p.y + Math.cos(t * 7 + i) * 6, 2, col); } });
    yield 36; sparkle(S, A, '#c0ffc0'); yield 10;
  },
  *powder(S, a, d, mv) {
    const B = d.pos(); Sound.sfx('leaf');
    const col = mv.st ? { slp: '#70d0a0', par: '#f8d048', psn: '#c070d0' }[mv.st[0]] || '#e0e0e0' : '#f0f0f0';
    fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 16; i++) { const x = B.x - 20 + ((i * 11) % 40), y = B.y - 34 + ((e.t * 1.2 + i * 7) % 50); c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 2, 2); } } });
    yield 40;
  },
  *seed(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('leaf');
    fx(S, { life: 40, draw(c, e) { const t = Math.min(1, e.t / 16); const p = lerpP(A, B, t); if (e.t < 16) PX.circle(c, p.x, p.y - Math.sin(t * Math.PI) * 18, 2, '#a07840'); else { const k = Math.min(1, (e.t - 16) / 12); for (let i = -1; i <= 1; i++) PX.line(c, B.x + i * 8, B.y + 10, B.x + i * 8 + i * 4 * k, B.y + 10 - 16 * k, '#48b048', 2); } } });
    yield 40;
  },
  *thunder(S, a, d) {
    const B = d.pos(); Sound.sfx('thunder'); S.flash('#fff8b0', 6, 0.7);
    fx(S, { life: 24, draw(c, e) { if ((e.t >> 1) % 2) return; for (let i = 0; i < 2; i++) PX.bolt(c, B.x + (i ? 8 : -6), 0, B.x + (i ? 4 : -2), B.y + 8, '#f8e040', e.t * 7 + i * 99); } });
    yield 12; S.flash('#fff8b0', 4, 0.5); Sound.sfx('zap'); sparks(S, B); S.shakeSide(d, 2, 10); yield 14;
  },
  *ice(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('ice');
    for (let i = 0; i < 5; i++) fx(S, { life: 26, draw(c, e) { const t = e.t / 18 - i * 0.05; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); PX.diamond(c, p.x + (i - 2) * 3, p.y + (i % 3 - 1) * 5, 3, '#b8f0f8'); c.fillStyle = '#ffffff'; c.fillRect(Math.round(p.x + (i - 2) * 3), Math.round(p.y + (i % 3 - 1) * 5) - 1, 1, 1); } });
    yield 20; Sound.sfx('ice'); sparkle(S, B, '#e0ffff'); impact(S, B, 0.9, '#b8f0f8'); yield 14;
  },
  *beam(S, a, d, mv) {
    const cols = { normal: ['#f8a040', '#fff0c0'], grass: ['#f8f0a0', '#ffffff'], ice: ['#88d8f0', '#ffffff'], psychic: ['#f070c0', '#ffe0f0'], steel: ['#c8d0e0', '#ffffff'], electric: ['#f8e040', '#ffffff'] };
    const [a0, b0] = cols[mv ? mv.type : 'normal'] || ['#ffffff', '#ffffff'];
    yield* beam(S, a, d, a0, b0, 4, 'beam');
    impact(S, d.pos(), 1.2, a0); yield 10;
  },
  *aurora(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('colorBurst');
    const hues = ['#f85858', '#f8a838', '#f8e848', '#68d868', '#58a8f8', '#a870f0'];
    fx(S, { life: 36, draw(c, e) { const k = Math.min(1, e.t / 10); for (let i = 0; i <= 40; i++) { const t = (i / 40) * k; const p = lerpP(A, B, t); const w = Math.sin(t * 12 - e.t * 0.6) * 4; c.fillStyle = hues[(i + (e.t >> 1)) % 6]; c.fillRect(Math.round(p.x) - 2, Math.round(p.y + w) - 2, 5, 5); } } });
    yield 26; S.flash('#e0f0ff', 8, 0.5); sparkle(S, B, '#ffffff'); yield 12;
  },
  *psychic(S, a, d) {
    const B = d.pos(); Sound.sfx('psychic');
    d.vis.warp = 30;
    fx(S, { life: 34, draw(c, e) { for (let i = 0; i < 3; i++) { const r = ((e.t * 1.5 + i * 12) % 36); PX.ring(c, B.x, B.y, r, i % 2 ? '#f870c0' : '#c080f8', 2); } } });
    yield 34;
  },
  *orb(S, a, d, mv) {
    const A = a.pos(), B = d.pos(); Sound.sfx('shadow');
    const col = mv && mv.type === 'ghost' ? '#503870' : '#403048';
    fx(S, { life: 22, draw(c, e) { const p = lerpP(A, B, Math.min(1, e.t / 18)); PX.circle(c, p.x, p.y, 7, col); PX.circle(c, p.x - 1, p.y - 1, 4, '#8a60c8'); PX.ring(c, p.x, p.y, 9 + (e.t % 3), '#302040'); } });
    yield 20; impact(S, B, 1.3, '#8060c0'); S.shakeSide(d, 2, 10); Sound.sfx('hit'); yield 12;
  },
  *shadow(S, a, d) {
    const B = d.pos(); Sound.sfx('shadow');
    fx(S, { life: 34, draw(c, e) { for (let i = 0; i < 8; i++) { const x = B.x - 18 + i * 5; const h = Math.min(30, e.t * 2) * (0.6 + 0.4 * Math.sin(e.t * 0.4 + i)); PX.line(c, x, B.y + 18, x + Math.sin(e.t * 0.3 + i) * 4, B.y + 18 - h, i % 2 ? '#402858' : '#6a48a0', 2); } } });
    yield 22; Sound.sfx('hit'); S.shakeSide(d, 2, 10); yield 12;
  },
  *sludge(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('poison');
    for (let i = 0; i < 4; i++) fx(S, { life: 34, draw(c, e) { const t = e.t / 20 - i * 0.08; if (t < 0) return; if (t > 1) { if (e.t < 32) PX.circle(c, B.x + (i - 2) * 7, B.y + 6 + (i % 2) * 4, 3, '#a048b0'); return; } const p = lerpP(A, B, t); PX.circle(c, p.x, p.y - Math.sin(t * Math.PI) * 16, 3, '#b050c0'); c.fillStyle = '#e8b0f0'; c.fillRect(Math.round(p.x - 1), Math.round(p.y - Math.sin(t * Math.PI) * 16 - 1), 1, 1); } });
    yield 26; Sound.sfx('hit'); yield 10;
  },
  *smoke(S, a, d) {
    const B = d.pos(); Sound.sfx('whoosh');
    fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 8; i++) { const r = 4 + Math.min(8, e.t * 0.4); PX.circle(c, B.x + Math.cos(i * 0.8 + e.t * 0.05) * 16, B.y + Math.sin(i * 1.3) * 10 - e.t * 0.2, r, i % 2 ? '#a8a0b0' : '#8a8494'); } } });
    yield 40;
  },
  *sand(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('whoosh');
    fx(S, { life: 26, draw(c, e) { for (let i = 0; i < 14; i++) { const t = e.t / 20 - i * 0.02; if (t < 0 || t > 1) continue; const p = lerpP(A, B, t); c.fillStyle = i % 2 ? '#c8a060' : '#e0c080'; c.fillRect(Math.round(p.x + (i % 5 - 2) * 4), Math.round(p.y + (i % 3 - 1) * 5), 2, 2); } } });
    yield 26;
  },
  *mud(S, a, d) { const B = d.pos(); Sound.sfx('hit'); splash(S, B, '#a07040'); S.shakeSide(d, 2, 8); yield 18; },
  *quake(S, a, d) { Sound.sfx('quake'); Game.shake(5, 34); for (let i = 0; i < 10; i++) debris(S, { x: 20 + i * 24, y: 140 }, '#b09060'); yield 36; },
  *rock(S, a, d) {
    const B = d.pos(); Sound.sfx('whoosh');
    for (let i = 0; i < 4; i++) fx(S, { life: 30, draw(c, e) { const t = e.t / 16 - i * 0.12; if (t < 0) return; const y = lerp(-10, B.y + (i % 2) * 6, Math.min(1, t)); const x = B.x - 12 + i * 8; PX.circle(c, x, y, 4, '#a08a68'); PX.circle(c, x - 1, y - 1, 2, '#c8b490'); } });
    yield 20; Sound.sfx('hitSuper'); S.shakeSide(d, 3, 10); yield 14;
  },
  *gem(S, a, d, mv) {
    const A = a.pos(), B = d.pos(); Sound.sfx('sparkle');
    const col = mv && mv.type === 'fairy' ? '#f8b0d0' : '#f07080';
    for (let i = 0; i < 5; i++) fx(S, { life: 26, draw(c, e) { const t = e.t / 18 - i * 0.05; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); PX.diamond(c, p.x + (i - 2) * 4, p.y + ((i * 3) % 5 - 2) * 3, 3, col); c.fillStyle = '#ffffff'; c.fillRect(Math.round(p.x + (i - 2) * 4), Math.round(p.y + ((i * 3) % 5 - 2) * 3) - 1, 1, 1); } });
    yield 20; sparkle(S, B, '#ffffff'); impact(S, B, 1, col); yield 12;
  },
  *wind(S, a, d) {
    const B = d.pos(); Sound.sfx('wind');
    fx(S, { life: 36, draw(c, e) { for (let i = 0; i < 3; i++) { const ang0 = e.t * 0.35 + i * 2.1; for (let k = 0; k < 8; k++) { const ang = ang0 + k * 0.15, r = 22 - k * 1.2; c.fillStyle = k < 4 ? '#ffffff' : '#c8d8f0'; c.fillRect(Math.round(B.x + Math.cos(ang) * r), Math.round(B.y + Math.sin(ang) * r * 0.6), 2, 2); } } } });
    yield 24; Sound.sfx('hit'); S.shakeSide(d, 2, 8); yield 12;
  },
  *feathers(S, a, d) {
    const B = d.pos();
    fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 6; i++) { const x = B.x - 16 + i * 6 + Math.sin(e.t * 0.2 + i) * 4, y = B.y - 30 + e.t * 0.9 + (i % 3) * 5; c.fillStyle = '#f8f8f8'; c.fillRect(Math.round(x), Math.round(y), 4, 2); c.fillStyle = '#c0b8a8'; c.fillRect(Math.round(x), Math.round(y) + 1, 4, 1); } } });
    yield 40;
  },
  *string(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('whoosh');
    fx(S, { life: 30, draw(c, e) { const k = Math.min(1, e.t / 12); for (let i = 0; i < 3; i++) PX.line(c, A.x, A.y, lerp(A.x, B.x + (i - 1) * 10, k), lerp(A.y, B.y + (i - 1) * 6, k), '#f0f0f0'); } });
    yield 30;
  },
  *sound(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('beam');
    fx(S, { life: 30, draw(c, e) { for (let i = 0; i < 4; i++) { const t = ((e.t / 24) + i * 0.25) % 1; const p = lerpP(A, B, t); const dir = Math.atan2(B.y - A.y, B.x - A.x); for (let k = -3; k <= 3; k++) { const ang = dir + Math.PI / 2 + k * 0.15; c.fillStyle = '#ffffff'; c.fillRect(Math.round(p.x + Math.cos(dir) * 0 + Math.cos(ang) * 8 * (k / 3)), Math.round(p.y + Math.sin(ang) * 8 * (k / 3)), 2, 2); } } } });
    yield 30;
  },
  *glare(S, a, d) {
    const A = a.pos(); Sound.sfx('sparkle');
    fx(S, { life: 20, draw(c, e) { if ((e.t >> 2) % 2) { PX.star(c, A.x - 5, A.y - 6, 4, '#f8f080'); PX.star(c, A.x + 5, A.y - 6, 4, '#f8f080'); } } });
    yield 20; S.shakeSide(d, 2, 10); yield 10;
  },
  *wiggle(S, a, d) { for (let i = 0; i < 4; i++) { a.vis.offX = i % 2 ? 4 : -4; yield 5; } a.vis.offX = 0; yield 6; },
  *hearts(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('sparkle');
    for (let i = 0; i < 4; i++) fx(S, { life: 36, draw(c, e) { const t = e.t / 28 - i * 0.08; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); PX.heart(c, Math.round(p.x + Math.sin(t * 8 + i) * 6), Math.round(p.y - Math.sin(t * Math.PI) * 10), '#f878a8'); } });
    yield 36;
  },
  *moon(S, a, d) {
    const A = a.pos(); Sound.sfx('sparkle');
    fx(S, { life: 20, draw(c, e) { PX.circle(c, A.x, A.y - 30, 8, '#fff4c0'); PX.circle(c, A.x + 3, A.y - 32, 7, 'rgba(0,0,0,0)'); PX.ring(c, A.x, A.y - 30, 10 + (e.t % 4), '#f8c0e0'); } });
    yield 16;
    yield* beam(S, a, d, '#f8a8d0', '#ffffff', 4, 'sparkle');
    sparkle(S, d.pos(), '#fff0f8'); yield 10;
  },
  *dragon(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('fire');
    fx(S, { life: 30, draw(c, e) { for (let i = 0; i < 8; i++) { const t = ((e.t * 0.05 + i * 0.12) % 1); const p = lerpP(A, B, t); PX.circle(c, p.x + Math.sin(i + e.t) * 3, p.y, 3, i % 2 ? '#7058f0' : '#50a0f8'); } } });
    yield 22; impact(S, B, 1.2, '#8070f0'); Sound.sfx('hit'); yield 12;
  },
  *stars(S, a, d) {
    const A = a.pos(), B = d.pos(); Sound.sfx('sparkle');
    for (let i = 0; i < 5; i++) fx(S, { life: 26, draw(c, e) { const t = e.t / 18 - i * 0.06; if (t < 0 || t > 1) return; const p = lerpP(A, B, t); PX.star(c, p.x + (i - 2) * 3, p.y + ((i * 7) % 5 - 2) * 4, 3, '#f8e060'); } });
    yield 22; Sound.sfx('hit'); impact(S, B, 0.9, '#f8e060'); yield 10;
  },
  *splash(S, a) { for (let i = 0; i < 3; i++) { a.vis.offY = -8; Sound.sfx('water'); yield 6; a.vis.offY = 0; yield 6; } },
  *bugbite(S, a, d) { yield* ANIMS.bite(S, a, d); },
  *steel(S, a, d) { S.flashSide(a, '#ffffff', 10); Sound.sfx('sparkle'); yield 10; yield* S.lunge(a, d, 10, 5); Sound.sfx('hit'); impact(S, d.pos(), 1, '#d0d8e8'); yield 10; },
  *self(S, a) { Sound.sfx('shimmer'); fx(S, { life: 30, draw(c, e) { const A = a.pos(); for (let i = 0; i < 3; i++) PX.ring(c, A.x, A.y + 16 - ((e.t * 1.2 + i * 10) % 30), 18 - i * 2, '#f8f0c0'); } }); yield 30; },
  *heal(S, a) { Sound.sfx('heal'); sparkle(S, a.pos(), '#a8f8a8', 24); yield 34; },
};

function* beam(S, a, d, col, core, w, sfxName) {
  const A = a.pos(), B = d.pos(); Sound.sfx(sfxName || 'beam');
  fx(S, { life: 30, draw(c, e) { const k = Math.min(1, e.t / 8); const E = lerpP(A, B, k); const ww = w + (e.t % 3 === 0 ? 1 : 0); PX.line(c, A.x, A.y, E.x, E.y, col, ww); PX.line(c, A.x, A.y, E.x, E.y, core, Math.max(1, ww - 3)); if (k >= 1) PX.circle(c, B.x, B.y, 5 + (e.t % 4), col); } });
  yield 22; S.shakeSide(d, 2, 10); Sound.sfx('hit'); yield 8;
}
function impact(S, p, scale = 1, col = '#f8f0a0') {
  fx(S, { life: 12, draw(c, e) { const r = (4 + e.t * 1.6) * scale; if (e.t < 10) PX.star(c, p.x, p.y, r, col); } });
}
function burst(S, p, kind) { fx(S, { life: 20, draw(c, e) { for (let i = 0; i < 6; i++) { const ang = i * 1.05, r = e.t * 1.2; PX.flame(c, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.7, 2.5, e.t + i); } } }); Sound.sfx('hit'); }
function splash(S, p, col = '#78c0f8') { fx(S, { life: 18, draw(c, e) { for (let i = 0; i < 8; i++) { const ang = -Math.PI + i * (Math.PI / 7); const r = e.t * 1.4; PX.circle(c, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r + e.t * 0.4, 2, col); } } }); Sound.sfx('hit'); }
function sparkle(S, p, col = '#ffffff', n = 12) { fx(S, { life: 34, draw(c, e) { for (let i = 0; i < n; i++) { const x = p.x - 20 + ((i * 13) % 40), y = p.y + 16 - ((e.t * 1.3 + i * 9) % 40); if ((e.t + i) % 6 < 4) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); } } } }); }
function sparks(S, p) { fx(S, { life: 20, draw(c, e) { for (let i = 0; i < 6; i++) { if ((e.t + i) % 3) continue; const ang = i + e.t; PX.line(c, p.x + Math.cos(ang) * 10, p.y + Math.sin(ang) * 10, p.x + Math.cos(ang) * 18, p.y + Math.sin(ang) * 18, '#f8e040'); } } }); }
function debris(S, p, col) { fx(S, { life: 30, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, draw(c, e) { const x = p.x + this.vx * e.t, y = p.y + this.vy * e.t + 0.15 * e.t * e.t; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 3, 3); } }); }

// status / stat animations
const STATUS_FX = {
  *psn(S, side) { Sound.sfx('poison'); const P = side.pos(); fx(S, { life: 34, draw(c, e) { for (let i = 0; i < 6; i++) { const y = P.y + 10 - ((e.t + i * 6) % 30); PX.ring(c, P.x - 14 + i * 6, y, 2 + (i % 2), '#b050c0'); } } }); S.tintSide(side, '#b050c0', 30); yield 34; },
  *brn(S, side) { Sound.sfx('fire'); const P = side.pos(); fx(S, { life: 34, draw(c, e) { for (let i = 0; i < 4; i++) PX.flame(c, P.x - 12 + i * 8, P.y + 10 - ((e.t * 0.8 + i * 5) % 16), 3, e.t + i); } }); S.tintSide(side, '#f86030', 30); yield 34; },
  *par(S, side) { Sound.sfx('zap'); sparks(S, side.pos()); S.tintSide(side, '#f8e040', 24); yield 26; },
  *slp(S, side) { const P = side.pos(); fx(S, { life: 40, draw(c, e) { for (let i = 0; i < 3; i++) { const k = ((e.t + i * 12) % 36) / 36; PX.z(c, Math.round(P.x + 8 + k * 14 + i * 2), Math.round(P.y - 10 - k * 20), '#ffffff'); } } }); yield 40; },
  *frz(S, side) { Sound.sfx('ice'); const P = side.pos(); fx(S, { life: 30, draw(c, e) { for (let i = 0; i < 7; i++) PX.diamond(c, P.x - 18 + i * 6, P.y - 8 + (i % 3) * 8, 3, 'rgba(180,240,255,0.9)'); } }); S.tintSide(side, '#a8e8f8', 28); yield 30; },
  *tox(S, side) { yield* STATUS_FX.psn(S, side); },
  *conf(S, side) { const P = side.pos(); fx(S, { life: 36, draw(c, e) { for (let i = 0; i < 3; i++) { const ang = e.t * 0.25 + i * 2.1; PX.star(c, P.x + Math.cos(ang) * 14, P.y - 22 + Math.sin(ang) * 4, 2, '#f8e060'); } } }); yield 36; },
  *leech(S, side) { const P = side.pos(); Sound.sfx('shimmer'); fx(S, { life: 30, draw(c, e) { for (let i = 0; i < 5; i++) PX.circle(c, P.x - 12 + i * 6, P.y - ((e.t + i * 4) % 20), 2, '#60e060'); } }); yield 30; },
};
function* statAnim(S, side, up) {
  Sound.sfx(up ? 'statUp' : 'statDown');
  const P = side.pos();
  S.tintSide(side, up ? '#f86040' : '#4880f0', 30);
  fx(S, { life: 34, draw(c, e) {
    for (let i = 0; i < 7; i++) {
      const k = ((e.t * 2 + i * 9) % 40);
      const y = up ? P.y + 20 - k : P.y - 20 + k;
      c.fillStyle = up ? 'rgba(255,170,120,0.9)' : 'rgba(140,180,255,0.9)';
      c.fillRect(Math.round(P.x - 20 + i * 7), Math.round(y), 2, 6);
    }
  } });
  yield 34;
}
