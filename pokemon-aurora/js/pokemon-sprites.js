'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Procedural Pokémon pixel art.  Each species paints itself onto a 64x64
//  logical canvas facing left.  Back sprites reuse the drawing without the face
//  (and with back-specific details), mirrored.  Frame 1 adds a breathing squash
//  and species-specific motion (flames, wings, gas...).
// ─────────────────────────────────────────────────────────────────────────────
const PA = {};
const INK = '#1c1828', WHITE = '#fbfbf8', MOUTH = '#4a1e2c', TONGUE = '#f07888';

// ── shared helpers ──
function teardrop(x, y, r, h, tilt = 0) {
  const pts = [];
  for (let a = 0; a <= 180; a += 20) { const t = a * Math.PI / 180; pts.push([x + Math.cos(t) * r, y + Math.sin(t) * r * 0.85]); }
  pts.push([x - r * 0.85, y - h * 0.3]);
  pts.push([x + tilt, y - h]);
  pts.push([x + r * 0.85, y - h * 0.3]);
  return pts;
}
function flame(p, x, y, sz, tilt = 0) {
  const fl = p.f ? 1.2 : 0;
  p.part(q => {
    q.poly(teardrop(x, y, sz, sz * 2.1 + fl, tilt + (p.f ? -1 : 1)), '#f04a26', { k: 1 });
    q.fpoly(teardrop(x, y + sz * 0.15, sz * 0.7, sz * 1.45 + fl * 0.6, tilt * 0.8), '#fa9a2c');
    q.fpoly(teardrop(x, y + sz * 0.35, sz * 0.4, sz * 0.8, tilt * 0.5), '#fde466');
  }, { ot: 0.4 });
}
function mouthLine(p, pts, col = '#3a2030') { if (!p.back) p.line(pts, 0.5, col); }
function fang(p, x, y, h = 2) { if (!p.back) p.fpoly([[x - 1, y], [x + 1, y], [x, y + h]], WHITE); }
// turtle shell: hexagonal plate seams radiating from the centre
function shellHex(q, cx, cy, R, out, col) {
  q.within(r => {
    const P = [];
    for (let i = 0; i < 6; i++) { const a = (i * 60 + 30) * Math.PI / 180; P.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.95]); }
    for (let i = 0; i < 6; i++) r.line([P[i], P[(i + 1) % 6]], 0.7, col);
    for (const [x, y] of P) r.line([[x, y], [cx + (x - cx) / R * out, cy + (y - cy) / (R * 0.95) * out * 0.95]], 0.7, col);
  });
}
// a chunky angular rock, for Onix and friends
function boulderP(q, x, y, r, col, seed = 0) {
  const pts = [], n = 7;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + seed; const rr = r * (0.8 + ((i * 7 + seed * 13) % 5) * 0.06); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.95]); }
  q.poly(pts, col, { hl: 0.9, k: 1.8 });
}
// quadruped limbs: a tapered leg, and a paw with toe splits
function legP(q, x0, y0, x1, y1, w0, w1, col, k = 1.4) { q.stroke([[x0, y0], [x1, y1]], w0, w1, col, { k }); }
function pawP(q, x, y, rx, col, toe) {
  q.ell(x, y, rx, rx * 0.66, col, { k: 1.2 });
  if (toe) q.within(r => { for (let i = -1; i <= 1; i++) r.line([[x + i * rx * 0.52, y - rx * 0.2], [x + i * rx * 0.52, y + rx * 0.6]], 0.5, toe); });
}
// a mane / ruff of overlapping tufts
function ruffP(q, cx, cy, rx, ry, col, dk, n = 5) {
  q.ell(cx, cy, rx, ry, col, { hl: 0.9, k: 1.7 });
  const ln = Col.mix(col, dk || Col.shade(col, 1), 0.45);
  q.within(r => {
    for (let i = 1; i < n; i++) {
      const x = cx - rx + (i / n) * rx * 2;
      r.line([[x + rx * 0.1, cy - ry * 0.5], [x - rx * 0.12, cy + ry * 0.7]], 0.5, ln);
    }
  });
}
function star(cx, cy, r1, r2, n = 5, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1; const a = (rot + i * 180 / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
function wingPts(x, y, span, h, dir, scallops = 3, lift = 0) {
  // membrane wing: attached at (x,y), extending horizontally by span*dir
  const tipX = x + span * dir, tipY = y - h - lift;
  const pts = [[x, y], [x + span * 0.35 * dir, tipY + h * 0.2], [tipX, tipY]];
  for (let i = 1; i <= scallops; i++) {
    const t = i / scallops;
    const bx = lerp(tipX, x + span * 0.1 * dir, t);
    const by = lerp(tipY + h * 0.35, y + h * 0.35, t);
    pts.push([bx + 2 * dir * (i % 2 ? 1 : 0), by + 3]);
    if (i < scallops) pts.push([lerp(tipX, x, t + 0.5 / scallops), lerp(tipY + h * 0.15, y + h * 0.2, t + 0.5 / scallops)]);
  }
  return pts;
}

// ═══════════════════════════════ STARTERS ═══════════════════════════════════
PA.bulbasaur = p => {
  const skin = '#7ac8a4', spot = '#4c9878', bulb = '#5eb84e', bulbL = '#86d46a';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.ell(50, 54, 5, 6.2, '#65b492', { k: 1.3 }); q.ell(31, 55, 5, 6.2, '#65b492', { k: 1.3 }); });
  const head = () => p.part(q => {
    q.poly([[10, 36], [9, 23], [20, 31]], skin, { k: 1.3 });
    q.poly([[25, 30], [33, 21], [34, 33]], skin, { k: 1.3 });
    q.ball(21, 40, 13, 11, skin, { hl: 1.1 });
    q.within(r => { r.fell(22, 32, 3, 1.8, spot); r.fell(30, 36, 2, 1.4, spot); r.fell(12, 34, 2, 1.2, spot); });
    if (!q.back) {
      q.eye(13, 39, 2.8, 3.8, { iris: '#e04444', white: WHITE, px: -0.5, pw: 0.6 });
      q.eye(26, 39, 3.2, 4.2, { iris: '#e04444', white: WHITE, px: -0.5, pw: 0.6 });
      q.line([[8, 45], [14, 48], [23, 48], [30, 45]], 0.6, '#2c5e4c');
      q.fell(17, 48.5, 3, 1.2, TONGUE);
    }
  });
  if (p.back) head();
  p.part(q => {
    q.ball(38, 48, 16.5, 10.5, skin, { hl: 0.9 });
    q.within(r => { r.fell(43, 44, 3.2, 2.2, spot); r.fell(50, 50, 2.6, 1.8, spot); r.fell(34, 52, 2.2, 1.6, spot); });
  });
  p.part(q => { q.ell(45, 56, 5.4, 6, skin, { k: 1.3 }); q.ell(25, 57, 5.4, 6, skin, { k: 1.3 }); });
  if (!p.back) p.part(q => { for (const x of [21, 25, 29]) q.dot(x, 61, '#e8f4e8'); for (const x of [41, 45, 49]) q.dot(x, 60, '#e8f4e8'); }, { outline: false });
  p.part(q => {
    const by = 35 - sw;
    q.ell(40, by, 15, 13, bulb, { hl: 1.25, k: 2 });
    q.within(r => {
      r.ell(34, by - 6, 4.8, 3, bulbL, { rot: 28, k: 1 });
      r.ell(40, by + 9, 10, 3.2, '#4aa044', { k: 1.2 });
    });
    q.poly([[37, by - 12], [40, by - 18 - sw], [43, by - 12]], bulbL, { k: 1 });
  }, { ao: 0.28 });
  if (!p.back) head();
};

PA.ivysaur = p => {
  const skin = '#68b6ae', spot = '#428c86', leaf = '#3e9c50', bud = '#ec7c9c';
  const head = () => p.part(q => {
    q.poly([[8, 36], [9, 26], [17, 31]], skin);
    q.poly([[23, 30], [30, 23], [31, 33]], skin);
    q.ball(20, 41, 13, 10.5, skin);
    q.within(r => { r.fell(19, 34, 2.5, 1.5, spot); r.fell(28, 37, 1.5, 1.2, spot); });
    q.eye(13, 40, 2.5, 3, { iris: '#e44040' });
    q.eye(25, 40, 3, 3.5, { iris: '#e44040' });
    if (!q.back) { q.line([[10, 36.5], [15, 37.5]], 0.5, '#2a5c56'); q.line([[22, 36.5], [28, 37]], 0.5, '#2a5c56'); }
    mouthLine(q, [[8, 45], [14, 48], [22, 48.5], [29, 46]], '#2a5c56');
    fang(q, 12, 47, 1.5); fang(q, 24, 48, 1.5);
  });
  p.part(q => { q.ball(55, 55, 5.5, 6, skin); q.ball(46, 57, 5.5, 5.5, skin); });
  if (p.back) head();
  p.part(q => { q.ball(39, 47, 17, 11, skin); q.within(r => { r.fell(44, 50, 3, 2, spot); r.fell(35, 53, 2, 1.5, spot); }); });
  const w = p.f ? 2 : 0;
  p.part(q => {
    q.ell(27, 30 + w * 0.5, 13, 4, leaf, { rot: -18 + w * 2 });
    q.ell(56, 30 + w * 0.5, 13, 4, leaf, { rot: 18 - w * 2 });
    q.ell(33, 23, 10, 3.5, '#4aac5a', { rot: -55 });
    q.ell(50, 22, 10, 3.5, '#4aac5a', { rot: 55 });
    q.ball(41, 33, 9, 6, '#5a9c5c');
  });
  p.part(q => { q.ball(41, 23, 6.5, 8, bud, { hl: 1.2 }); q.fpoly([[38, 16], [41, 10], [44, 16]], '#f090b0'); });
  p.part(q => { q.ball(30, 57, 5.5, 5, skin); q.ball(18, 56, 5.5, 5, skin); if (!q.back) { q.dot(15, 60, WHITE); q.dot(17, 60.5, WHITE); q.dot(27, 61, WHITE); q.dot(29, 61, WHITE); } });
  if (!p.back) head();
};

PA.venusaur = p => {
  const skin = '#5aa89a', spot = '#3a8074', petal = '#f47a8c';
  const head = () => p.part(q => {
    q.poly([[4, 42], [6, 33], [13, 38]], skin);
    q.poly([[18, 36], [24, 30], [25, 39]], skin);
    q.ball(15, 46, 12, 9.5, skin);
    q.within(r => r.fell(14, 40, 2.5, 1.5, spot));
    q.eye(9, 45, 2, 2.5, { iris: '#e04040' }); q.eye(20, 45, 2.5, 3, { iris: '#e04040' });
    if (!q.back) { q.line([[6, 42], [11, 43]], 0.6, '#284e48'); q.line([[17, 42], [23, 42.5]], 0.6, '#284e48'); }
    mouthLine(q, [[4, 50], [10, 53], [18, 53.5], [25, 51]], '#284e48');
    fang(q, 8, 52, 1.5); fang(q, 20, 53, 1.5);
  });
  p.part(q => { q.ball(56, 55, 7, 7, skin); q.ball(46, 57, 7, 6, skin); });
  if (p.back) head();
  p.part(q => { q.ball(36, 48, 22, 12, skin); q.within(r => { r.fell(42, 45, 3, 2, spot); r.fell(52, 50, 2.5, 2, spot); r.fell(30, 54, 2.5, 1.5, spot); }); });
  // palm leaves
  p.part(q => {
    q.ell(18, 32, 13, 4, '#3c9a4c', { rot: 18 }); q.ell(52, 32, 14, 4, '#3c9a4c', { rot: -18 });
    q.ell(26, 26, 11, 3.5, '#48aa56', { rot: 35 }); q.ell(46, 26, 11, 3.5, '#48aa56', { rot: -35 });
    q.ball(35, 34, 8, 6, '#8a6040');
  });
  // flower
  const fy = p.f ? 1 : 0;
  p.part(q => {
    const petals = [[20, 22, -20], [50, 22, 20], [27, 15, -60], [43, 15, 60], [35, 24, 0]];
    for (const [x, y, r] of petals) q.ell(x, y + fy, 10, 5.5, petal, { rot: r, hl: 1 });
    q.within(r => { for (const [x, y] of [[17, 22], [53, 22], [26, 13], [44, 13], [23, 25], [47, 25]]) r.fell(x, y + fy, 1.6, 1.2, '#fff4f4'); });
    q.ball(35, 19 + fy, 5, 3.5, '#f8d840');
  });
  p.part(q => { q.ball(28, 58, 7, 5.5, skin); q.ball(14, 57, 6.5, 5.5, skin); if (!q.back) { q.dot(10, 61, WHITE); q.dot(13, 62, WHITE); q.dot(24, 62, WHITE); q.dot(27, 62, WHITE); } });
  if (!p.back) head();
};

PA.charmander = p => {
  const o = '#f4913e', oD = '#d06c22', belly = '#fbe0a0', bellyD = '#e0be78';
  const head = () => p.part(q => {
    q.ball(27, 26, 11.5, 11, o, { hl: 1.1 });
    q.ell(17, 30, 8, 6.5, o, { k: 1.3 });
    q.eye(20, 24, 2.5, 4, { iris: '#2e5e9a' });
    q.eye(30, 24, 2, 3.5, { iris: '#2e5e9a' });
    if (!q.back) { q.line([[11, 32], [15, 34.5], [21, 35], [25, 33]], 0.5, '#8a3a18'); q.fell(17, 34.5, 2, 1, TONGUE); q.dot(12, 28, '#8a3a18'); }
  });
  const sw = p.f ? 1 : 0;
  p.part(q => q.stroke([[36, 52], [46, 52], [52, 45], [53, 38 - sw]], 3.4, 2.2, o, { k: 1.4 }));
  flame(p, 53, 36 - sw, 3.4, 1);
  p.part(q => { q.ell(38, 57, 5.2, 4, oD, { k: 1.2 }); });
  if (p.back) head();
  p.part(q => {
    q.ball(31, 46, 10, 11, o, { hl: 0.95 });
    if (!q.back) q.within(r => { r.ell(28, 49, 6.5, 8, belly, { k: 1.2 }); for (let y = 44; y < 56; y += 3.4) r.line([[22, y], [34, y]], 0.5, bellyD); });
  });
  p.part(q => { q.ell(25, 58, 5.2, 4, o, { k: 1.2 }); if (!q.back) { q.dot(21, 60, WHITE); q.dot(23, 61, WHITE); } });
  p.part(q => { q.ell(22, 44, 2.9, 5, o, { rot: 35, k: 1.3 }); if (!q.back) { q.dot(19, 47, WHITE); q.dot(20, 48.5, WHITE); } });
  p.part(q => q.ell(40, 43, 2.6, 4.6, oD, { rot: -35, k: 1.3 }));
  if (!p.back) head();
};

PA.charmeleon = p => {
  const o = '#e2593a', belly = '#f8d8a0';
  const head = () => p.part(q => {
    q.poly([[34, 18], [44, 12], [38, 24]], o);
    q.ball(27, 22, 11, 10, o);
    q.ell(16, 26, 9, 5.5, o, { hl: false });
    q.eye(21, 20, 2.2, 3.2, { iris: '#3e7a6e' });
    q.eye(30, 20, 1.8, 2.8, { iris: '#3e7a6e' });
    if (!q.back) { q.line([[18, 16.5], [23, 17.5]], 0.6, '#7a2412'); q.line([[8, 28], [14, 30.5], [22, 30.5]], 0.5, '#7a2412'); fang(q, 12, 29, 2); q.dot(9, 24, '#7a2412'); }
  });
  const sw = p.f ? 1 : 0;
  p.part(q => q.stroke([[38, 52], [48, 54], [56, 48], [57, 40 - sw]], 3.8, 2.2, o));
  flame(p, 57, 38 - sw, 4, 1);
  p.part(q => { q.ball(38, 56, 5, 5, o); });
  if (p.back) head();
  p.part(q => { q.ball(31, 43, 10, 13, o); if (!q.back) q.within(r => r.ball(28, 46, 6, 10, belly, { hl: false })); });
  p.part(q => { q.ball(25, 57, 5, 5, o); if (!q.back) { q.dot(21, 61, WHITE); q.dot(23, 61.5, WHITE); } });
  p.part(q => { q.ell(21, 41, 2.8, 6, o, { rot: 40 }); if (!q.back) { q.dot(17, 45, WHITE); q.dot(16, 43, WHITE); } });
  p.part(q => q.ell(40, 40, 2.6, 5, o, { rot: -40 }));
  if (!p.back) head();
};

PA.charizard = p => {
  const o = '#f0883a', oD = '#c96520', belly = '#f8dc9a', bellyD = '#dcbb72', wing = '#3f96a4', wingD = '#2a6d79';
  const lift = p.f ? 3 : 0;
  // membrane wings with finger bones
  const boneWing = (q, pts, inner, bones) => {
    q.poly(pts, o, { k: 1.6 });
    q.within(r => { r.poly(inner, wing, { k: 2.2, sd: 1.2 }); for (const bn of bones) r.line(bn, 0.6, wingD); });
  };
  p.part(q => boneWing(q,
    [[28, 30], [14, 10 - lift], [2, 4 - lift], [4, 16 - lift], [8, 22], [12, 26], [18, 32]],
    [[26, 30], [14, 13 - lift], [5, 9 - lift], [7, 16 - lift], [11, 22], [15, 26], [19, 31]],
    [[[25, 29], [8, 12 - lift]], [[25, 29], [7, 18 - lift]], [[25, 29], [12, 24]]]));
  p.part(q => boneWing(q,
    [[38, 28], [50, 8 - lift], [62, 2 - lift], [61, 16 - lift], [58, 22], [54, 27], [46, 32]],
    [[40, 28], [50, 11 - lift], [59, 7 - lift], [58, 16 - lift], [55, 22], [51, 27], [45, 31]],
    [[[40, 28], [56, 10 - lift]], [[40, 28], [57, 17 - lift]], [[40, 28], [52, 25]]]));
  const sw = p.f ? 1 : 0;
  p.part(q => q.stroke([[40, 56], [50, 58], [57, 54], [59, 48 - sw]], 4, 2.4, o, { k: 1.5 }));
  flame(p, 59, 46 - sw, 4.2, 1);
  p.part(q => q.ell(43, 57, 6.2, 4.6, oD, { k: 1.2 }));
  const head = () => p.part(q => {
    q.stroke([[30, 36], [26, 26], [22, 18]], 5, 4, o, { k: 1.6 });
    q.poly([[24, 10], [30, 4], [27, 13]], o, { k: 1.3 }); q.poly([[20, 10], [22, 3], [24, 11]], o, { k: 1.3 });
    q.ball(20, 15, 8, 6.5, o, { hl: 1.1 });
    q.ell(11, 18, 7, 4.2, o, { k: 1.3 });
    q.eye(16, 13, 1.8, 2.4, { iris: '#3a7a6a' });
    if (!q.back) { q.line([[13, 10.5], [19, 11.5]], 0.6, '#7a3412'); q.line([[5, 20], [10, 21], [17, 20]], 0.5, '#7a3412'); fang(q, 8, 20, 1.5); q.dot(5, 16, '#7a3412'); }
  });
  if (p.back) head();
  p.part(q => {
    q.ball(34, 44, 12, 14, o, { hl: 0.95 });
    if (!q.back) q.within(r => { r.ell(31, 46, 7, 11, belly, { k: 1.2 }); for (let y = 38; y < 58; y += 3.6) r.line([[24, y], [38, y]], 0.5, bellyD); });
  });
  p.part(q => { q.ell(28, 58, 6.2, 4.6, o, { k: 1.2 }); if (!q.back) { q.dot(22, 61, WHITE); q.dot(25, 62, WHITE); } });
  p.part(q => { q.ell(24, 42, 3.1, 6, o, { rot: 40, k: 1.3 }); if (!q.back) { q.dot(20, 46, WHITE); q.dot(21, 47.5, WHITE); } });
  if (!p.back) head();
};

PA.squirtle = p => {
  const b = '#84ccf4', shell = '#c87e3e', shellD = '#8a4f1c', rim = '#f6e6bc', plate = '#f6dc9c';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[41, 56], [50, 56], [54, 49], [49, 43 - sw], [45, 47]], 3.4, 2, b, { k: 1.4 }); });
  p.part(q => {
    q.ball(38, 44, 12, 12.5, shell, { hl: 1.2 });
    shellHex(q, 38, 44, 6, 12, shellD);
    q.stroke([[28, 38], [33, 32], [45, 34], [50, 43], [48, 53], [38, 58], [29, 52]], 1.6, 1.6, rim, { k: 1.1 });
  });
  p.part(q => q.ell(37, 58, 5, 3.6, b, { k: 1.2 }));
  const head = () => p.part(q => {
    q.ball(26, 25, 12, 11, b, { hl: 1.1 });
    q.eye(20, 23, 3, 4, { iris: '#983a2a', white: WHITE, px: -0.6, pw: 0.62 });
    q.eye(31, 23, 2.5, 3.5, { iris: '#983a2a', white: WHITE, px: -0.7, pw: 0.62 });
    if (!q.back) { q.line([[14, 30], [19, 32.5], [25, 32.5], [28, 30]], 0.5, '#2c5a78'); q.fell(20, 33, 2.2, 1.1, TONGUE); }
  });
  if (p.back) {
    head();
    p.part(q => {
      q.ball(33, 45, 13, 13, shell, { hl: 1.2 });
      shellHex(q, 33, 45, 6.5, 13, shellD);
      q.stroke([[21, 40], [26, 33], [40, 33], [46, 42], [44, 53], [33, 58], [22, 52]], 1.6, 1.6, rim, { k: 1.1 });
    });
  } else {
    p.part(q => {
      q.ball(29, 45, 9, 11, b, { hl: 0.9 });
      q.within(r => {
        r.ell(27, 46, 6.5, 9, plate, { k: 1.2 });
        r.line([[21, 42], [33, 42]], 0.5, '#cba55e'); r.line([[20, 47], [33, 47]], 0.5, '#cba55e'); r.line([[21, 52], [32, 52]], 0.5, '#cba55e');
      });
    });
  }
  p.part(q => { q.ell(25, 58, 5, 3.6, b, { k: 1.2 }); });
  p.part(q => q.ell(20, 44, 2.9, 5, b, { rot: 35, k: 1.2 }));
  if (!p.back) head();
};

PA.wartortle = p => {
  const b = '#7494da', shell = '#bb7440', shellD = '#84491c', rim = '#f4e8c4', plate = '#f0d492', fluff = '#eaf0fd';
  const sw = p.f ? 2 : 0;
  p.part(q => {
    q.stroke([[40, 52], [50, 52], [58, 46 - sw], [57, 38 - sw], [52, 40]], 5, 3, fluff, { k: 1.6 });
    q.within(r => { r.line([[46, 50], [54, 45 - sw]], 0.5, '#aebde4'); r.line([[53, 42 - sw], [56, 40]], 0.5, '#aebde4'); });
  });
  p.part(q => {
    q.ball(37, 43, 11.5, 12.5, shell, { hl: 1.2 });
    shellHex(q, 37, 43, 6, 11.5, shellD);
    q.stroke([[28, 36], [33, 31], [45, 34], [49, 43], [47, 52], [37, 56], [29, 50]], 1.5, 1.5, rim, { k: 1.1 });
  });
  p.part(q => q.ell(37, 57, 5, 3.8, b, { k: 1.2 }));
  const head = () => p.part(q => {
    q.stroke([[17, 16], [12, 9], [14, 4], [18, 7]], 2.3, 1.4, fluff, { k: 1.3 });
    q.stroke([[33, 15], [40, 7], [38, 2], [35, 6]], 2.5, 1.4, fluff, { k: 1.3 });
    q.ball(25, 23, 11, 10, b, { hl: 1.1 });
    q.eye(19, 22, 2.5, 3.5, { iris: '#7a2a3a', white: WHITE, px: -0.6, pw: 0.6 });
    q.eye(30, 22, 2.2, 3.2, { iris: '#7a2a3a', white: WHITE, px: -0.6, pw: 0.6 });
    if (!q.back) { q.line([[16, 18], [21, 19]], 0.6, '#2c4478'); q.line([[13, 28], [18, 30], [25, 29.5]], 0.5, '#2c4478'); fang(q, 17, 29.5, 1.5); }
  });
  if (p.back) {
    head();
    p.part(q => {
      q.ball(32, 44, 13.5, 13.5, shell, { hl: 1.2 });
      shellHex(q, 32, 44, 7, 13.5, shellD);
      q.stroke([[20, 40], [26, 32], [40, 32], [45, 42], [42, 53], [32, 57], [21, 51]], 1.5, 1.5, rim, { k: 1.1 });
    });
  } else {
    p.part(q => { q.ball(29, 44, 9, 11, b, { hl: 0.9 }); q.within(r => { r.ell(27, 45, 6.5, 9, plate, { k: 1.2 }); r.line([[21, 41], [33, 41]], 0.5, '#c8a458'); r.line([[21, 46], [33, 46]], 0.5, '#c8a458'); r.line([[22, 51], [32, 51]], 0.5, '#c8a458'); }); });
  }
  p.part(q => q.ell(25, 57, 5, 3.8, b, { k: 1.2 }));
  p.part(q => { q.ell(19, 42, 3, 5.5, b, { rot: 35, k: 1.2 }); if (!q.back) q.dot(16, 46, WHITE); });
  if (!p.back) head();
};

PA.blastoise = p => {
  const b = '#5a86d0', shell = '#ab6d38', shellD = '#7b4517', rim = '#f2e4bc', plate = '#eed49a', gun = '#aab2c4', gunD = '#7d8496';
  p.part(q => {
    q.ball(38, 38, 17, 17, shell, { hl: 1.2 });
    shellHex(q, 38, 38, 8, 17, shellD);
    q.stroke([[25, 27], [33, 21], [48, 25], [54, 38], [50, 51], [38, 56], [27, 48]], 1.7, 1.7, rim, { k: 1.1 });
  });
  const cannon = (x, y, a) => p.part(q => {
    q.stroke([[x, y], [x + Math.cos(a) * 12, y + Math.sin(a) * 12]], 3.6, 3.2, gun, { k: 1.5 });
    q.within(r => r.stroke([[x, y], [x + Math.cos(a) * 12, y + Math.sin(a) * 12]], 1.2, 1, '#cdd4e0', { flat: true }));
    q.ell(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 3.4, 3.4, gunD, { k: 1.2 });
    q.fell(x + Math.cos(a) * 11.5, y + Math.sin(a) * 11.5, 2.2, 2.2, '#20242e');
  });
  cannon(47, 25, -1.45); cannon(31, 22, -1.8);
  p.part(q => q.ell(42, 57, 7, 5, b, { k: 1.2 }));
  const head = () => p.part(q => {
    q.poly([[14, 20], [15, 13], [20, 18]], b, { k: 1.3 }); q.poly([[26, 18], [30, 12], [31, 20]], b, { k: 1.3 });
    q.ball(22, 25, 10, 9, b, { hl: 1.1 });
    q.eye(16, 23, 2, 2.8, { iris: '#7a2a3a', white: WHITE, px: -0.5, pw: 0.6 });
    q.eye(26, 23, 1.8, 2.6, { iris: '#7a2a3a', white: WHITE, px: -0.5, pw: 0.6 });
    if (!q.back) { q.line([[13, 19.5], [18, 20.5]], 0.6, '#1e3466'); q.line([[23, 20], [28, 19]], 0.6, '#1e3466'); q.line([[12, 29], [18, 31], [26, 30]], 0.5, '#1e3466'); }
  });
  if (p.back) {
    head();
    p.part(q => {
      q.ball(32, 42, 18, 17, shell, { hl: 1.2 });
      shellHex(q, 32, 42, 8.5, 18, shellD);
      q.stroke([[16, 38], [22, 28], [40, 26], [48, 36], [46, 52], [32, 58], [18, 52]], 1.7, 1.7, rim, { k: 1.1 });
    });
    cannon(42, 28, -1.4); cannon(24, 28, -1.75);
  } else {
    p.part(q => { q.ball(31, 43, 12, 13, b, { hl: 0.9 }); q.within(r => { r.ell(29, 45, 9, 11, plate, { k: 1.2 }); for (let y = 38; y < 56; y += 5) r.line([[20, y], [38, y]], 0.5, '#c4a660'); }); });
  }
  p.part(q => { q.ell(26, 58, 7, 5, b, { k: 1.2 }); if (!q.back) { q.dot(21, 60, WHITE); q.dot(24, 61, WHITE); } });
  p.part(q => { q.ell(16, 42, 4.5, 7, b, { rot: 30, k: 1.3 }); if (!q.back) { q.dot(12, 47, WHITE); q.dot(14, 48, WHITE); } });
  if (!p.back) head();
};

// ═══════════════════════════════ BIRDS ══════════════════════════════════════
PA.pidgey = p => {
  const br = '#c49a6a', cream = '#f2e0b6', dk = '#7a5436';
  p.part(q => { q.poly([[40, 48], [54, 44], [56, 50], [44, 54]], dk); q.within(r => r.line([[44, 49], [54, 47]], 0.5, '#5a3a22')); });
  p.part(q => { q.ball(34, 48, 11, 9, br); if (!q.back) q.within(r => r.ball(30, 51, 7, 6, cream, { hl: false })); });
  p.part(q => { q.ell(40, 46 - (p.f ? 1 : 0), 8, 5, '#a87c50', { rot: -15 }); q.within(r => { r.line([[36, 48], [46, 44]], 0.5, dk); }); });
  const head = () => p.part(q => {
    q.poly([[26, 26], [31, 22], [30, 29]], '#e0c080');
    q.ball(27, 35, 9, 8.5, br);
    if (!q.back) {
      q.within(r => r.ball(23, 38, 6, 5, cream, { hl: false }));
      q.line([[18, 34], [24, 32.5], [31, 31.5]], 0.7, INK);
      q.eye(24, 32.5, 2, 2.4, { white: '#fbf4e4', px: -0.3, pw: 0.62 });
      q.poly([[13, 36], [19, 34], [19, 38]], '#b8a8a8');
    }
  });
  if (!p.back) head(); else { p.part(q => q.ball(27, 35, 9, 8.5, br)); p.part(q => q.poly([[26, 26], [31, 22], [30, 29]], '#e0c080')); }
  p.part(q => { q.line([[29, 56], [28, 61]], 0.8, '#e0909a'); q.line([[34, 56], [34, 61]], 0.8, '#e0909a'); q.line([[25, 61], [30, 61]], 0.6, '#e0909a'); q.line([[31, 61], [36, 61]], 0.6, '#e0909a'); });
};

PA.pidgeotto = p => {
  const br = '#be9060', cream = '#f2e0b6', red = '#e84c3a', yel = '#f8c848';
  const f = p.f ? 1 : 0;
  p.part(q => { q.poly([[40, 46], [60, 40], [62, 46], [58, 50], [44, 52]], red); q.within(r => r.fpoly([[44, 48], [60, 43], [60, 47], [46, 51]], yel)); });
  p.part(q => { q.ell(40, 40 - f, 14, 7, '#9c7048', { rot: -20 }); q.within(r => { r.line([[32, 44], [50, 36 - f]], 0.5, '#6c4a2a'); r.line([[36, 46], [52, 40 - f]], 0.5, '#6c4a2a'); }); });
  p.part(q => { q.ball(32, 45, 12, 11, br); if (!q.back) q.within(r => r.ball(28, 49, 8, 8, cream, { hl: false })); });
  const head = () => p.part(q => {
    q.stroke([[30, 22], [38, 14], [46, 12]], 2.4, 1.2, red); q.stroke([[30, 22], [36, 18], [44, 18]], 1.6, 0.8, yel);
    q.ball(26, 28, 9, 8, br);
    if (!q.back) {
      q.within(r => r.ball(22, 31, 6, 5, cream, { hl: false }));
      q.line([[16, 27.5], [23, 26], [31, 25]], 0.7, INK);
      q.eye(23, 26, 2, 2.4, { white: '#fbf4e4', px: -0.3, pw: 0.62 });
      q.poly([[10, 30], [18, 27], [18, 32]], '#b0a4a4');
    }
  });
  head();
  p.part(q => { q.stroke([[28, 55], [27, 61]], 1, 1, '#e8a0a0'); q.stroke([[35, 55], [35, 61]], 1, 1, '#e8a0a0'); q.line([[23, 61], [30, 61]], 0.6, '#e8a0a0'); q.line([[32, 61], [38, 61]], 0.6, '#e8a0a0'); });
};

PA.pidgeot = p => {
  const br = '#c2925e', cream = '#f4e2b8', red = '#e8483a', yel = '#f8cc4c';
  const f = p.f ? 2 : 0;
  // wings raised
  p.part(q => { q.poly([[36, 36], [54, 14 - f], [62, 12 - f], [58, 24 - f], [52, 34], [44, 42]], '#a87848'); q.within(r => { r.line([[42, 38], [56, 18 - f]], 0.5, '#6c4a2a'); r.line([[46, 40], [58, 24 - f]], 0.5, '#6c4a2a'); }); });
  p.part(q => { q.poly([[40, 48], [60, 50], [62, 56], [54, 58], [42, 54]], red); q.within(r => r.fpoly([[44, 50], [60, 52], [58, 56], [46, 54]], yel)); });
  p.part(q => { q.ball(32, 44, 12, 12, br); if (!q.back) q.within(r => r.ball(28, 48, 8, 9, cream, { hl: false })); });
  p.part(q => { q.poly([[28, 36], [14, 18 - f], [8, 18 - f], [12, 28], [20, 40]], '#a87848'); q.within(r => r.line([[22, 36], [12, 22 - f]], 0.5, '#6c4a2a')); });
  const head = () => p.part(q => {
    q.stroke([[28, 20], [36, 12], [46, 8], [56, 10], [62, 16]], 2.6, 1.4, red); q.stroke([[28, 20], [38, 16], [48, 14], [56, 16]], 1.6, 0.8, yel);
    q.ball(25, 24, 8.5, 7.5, br);
    if (!q.back) {
      q.within(r => r.ball(21, 27, 5.5, 4.5, cream, { hl: false }));
      q.line([[15, 23.5], [22, 22], [30, 21]], 0.7, INK);
      q.eye(22, 22, 1.8, 2.2, { white: '#fbf4e4', px: -0.3, pw: 0.62 });
      q.poly([[9, 26], [17, 23], [17, 28]], '#b0a4a4');
    }
  });
  head();
  p.part(q => { q.stroke([[28, 55], [27, 61]], 1, 1, '#e8a0a0'); q.stroke([[35, 55], [35, 61]], 1, 1, '#e8a0a0'); q.line([[23, 61], [30, 61]], 0.6, '#e8a0a0'); q.line([[32, 61], [38, 61]], 0.6, '#e8a0a0'); });
};

PA.hoothoot = p => {
  const br = '#b87e4e', brD = '#8a5a30', face = '#f2dcb6', dk = '#6a4228', foot = '#f0a050';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.ell(27, 57, 3.4, 3, foot, { k: 1.2 }); q.ell(37, 57, 3.4, 3, foot, { k: 1.2 }); });
  p.part(q => { for (const cx of [27, 37]) { q.line([[cx - 3, 60], [cx + 3, 60]], 0.7, '#e08c34'); q.line([[cx, 58], [cx, 61]], 0.7, '#e08c34'); } }, { ao: 0 });
  p.part(q => {
    q.stroke([[25, 30], [21, 19], [18, 12]], 1.9, 0.9, '#3a2a20');
    q.stroke([[39, 30], [43, 19], [46, 12]], 1.9, 0.9, '#3a2a20');
    q.ball(32, 40, 15, 15, br, { hl: 1.1 });
    q.within(r => r.ell(30, 48, 11, 7, '#d0a070', { k: 1.4 }));
    if (!q.back) {
      q.within(r => r.ell(30, 37, 11.5, 9.5, face, { k: 1.3 }));
      q.ell(26, 37, 5.2, 5.2, dk, { flat: true }); q.ell(37, 37, 5.2, 5.2, dk, { flat: true });
      q.eye(26, 37, 3.4, 3.4, { dark: '#e83440', white: '#fdf6e0', px: 0, pw: 0.45, ph: 0.45 });
      q.eye(37, 37, 3.4, 3.4, { dark: '#e83440', white: '#fdf6e0', px: 0, pw: 0.45, ph: 0.45 });
      q.poly([[29, 42], [34, 42], [31.5, 47.5]], '#f4c040', { k: 1 });
      q.line([[28.6, 42], [34.4, 42]], 0.5, '#c08818');
    }
  });
  // folded wing, outlined so it lifts off the body
  p.part(q => {
    q.ell(42, 44 + sw, 6, 9.5, brD, { rot: -8, k: 1.7 });
    q.within(r => { r.line([[37, 38], [46, 42]], 0.6, dk); r.line([[37, 43], [47, 47]], 0.6, dk); r.line([[38, 48], [46, 51]], 0.6, dk); });
  });
};

PA.noctowl = p => {
  const br = '#a06e46', brD = '#764026', face = '#ead1a2', dk = '#5a3822', foot = '#f0a850';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.ell(28, 56, 3.6, 3.2, foot, { k: 1.2 }); q.ell(39, 56, 3.6, 3.2, foot, { k: 1.2 }); });
  p.part(q => { for (const cx of [28, 39]) { q.line([[cx - 3.4, 60], [cx + 3.4, 60]], 0.8, '#dc8c34'); q.line([[cx, 57], [cx, 61]], 0.8, '#dc8c34'); } }, { ao: 0 });
  p.part(q => {
    q.poly([[22, 26], [15, 7], [25, 12], [29, 23]], brD, { k: 1.4 });
    q.poly([[43, 26], [50, 7], [40, 12], [36, 23]], brD, { k: 1.4 });
    q.within(r => { r.line([[20, 14], [25, 23]], 0.6, '#e8c070'); r.line([[45, 14], [40, 23]], 0.6, '#e8c070'); });
  });
  p.part(q => {
    q.ball(33, 40, 15, 17, br, { hl: 1.1 });
    q.within(r => { for (let y = 42; y < 57; y += 4) { r.line([[26, y], [31, y + 1.4]], 0.6, dk); r.line([[34, y + 2], [39, y + 3.4]], 0.6, dk); } });
    if (!q.back) {
      q.within(r => r.ell(32, 32, 12.5, 8.5, face, { k: 1.3 }));
      q.ell(26, 31, 5, 5, INK, { flat: true }); q.ell(38, 31, 5, 5, INK, { flat: true });
      q.eye(26, 31, 3.2, 3.2, { dark: '#e02e38', white: '#fdf6e0', px: 0, pw: 0.48, ph: 0.48 });
      q.eye(38, 31, 3.2, 3.2, { dark: '#e02e38', white: '#fdf6e0', px: 0, pw: 0.48, ph: 0.48 });
      q.poly([[30, 35], [34.5, 35], [32.2, 40.5]], '#f4c040', { k: 1 });
    }
  });
  // folded wing, lifted a little on frame 1
  p.part(q => {
    q.ell(44, 44 + sw, 6.5, 11, brD, { rot: -8, k: 1.8 });
    q.within(r => { r.line([[38, 37], [49, 42]], 0.6, dk); r.line([[38, 43], [50, 48]], 0.6, dk); r.line([[39, 49], [48, 53]], 0.6, dk); });
  });
  p.part(q => q.poly([[40, 52], [52, 57], [44, 61]], brD, { k: 1.3 }));
};

PA.murkrow = p => {
  const bk = '#323c6c', dk = '#20264a', beak = '#f6c434';
  const f = p.f ? 1 : 0;
  p.part(q => { q.poly([[40, 46], [56, 50], [58, 56], [44, 54]], bk); q.within(r => { r.line([[44, 50], [56, 53]], 0.5, dk); }); });
  p.part(q => { q.stroke([[30, 54], [29, 61]], 1, 1, beak); q.stroke([[36, 54], [36, 61]], 1, 1, beak); q.line([[25, 61], [31, 61]], 0.6, beak); q.line([[33, 61], [39, 61]], 0.6, beak); });
  p.part(q => { q.ball(33, 45, 11, 10, bk); if (!q.back) q.within(r => r.ball(29, 48, 6, 6, '#ececf0', { hl: false })); });
  p.part(q => { q.ell(40, 43 - f, 9, 5, '#2a3460', { rot: -15 }); });
  p.part(q => {
    q.ball(27, 30, 9, 8, bk);
    q.poly([[14, 24], [44, 22], [40, 27], [18, 27]], bk);
    q.poly([[24, 23], [38, 8], [34, 24]], bk);
    if (!q.back) { q.eye(24, 30, 2.2, 2.4, { iris: '#e03040' }); q.poly([[12, 33], [21, 31], [21, 36]], beak); }
  });
};

// ═══════════════════════════════ ROUTE CRITTERS ═════════════════════════════
PA.sentret = p => {
  const br = '#a2714e', brD = '#7a5236', cream = '#f2dab2', dk = '#6a4630';
  const sw = p.f ? 1 : 0;
  p.part(q => {
    q.stroke([[33, 50], [44, 47], [50, 38], [48, 26 - sw], [42, 19 - sw]], 7, 3.6, br, { k: 1.8 });
    q.within(r => {
      r.stroke([[46, 44], [52, 41]], 3.2, 3.2, cream, { flat: true });
      r.stroke([[48, 31 - sw], [53, 30 - sw]], 2.8, 2.8, cream, { flat: true });
    });
  });
  p.part(q => { q.ball(28, 46, 8.5, 10.5, br, { hl: 0.9 }); if (!q.back) q.within(r => r.ell(26, 48, 5.5, 7.5, cream, { k: 1.2 })); });
  p.part(q => { pawP(q, 24, 58, 4, br); pawP(q, 33, 58, 4, br); });
  p.part(q => {
    q.ball(18, 22, 4.2, 6, br, { k: 1.3 }); q.ball(32, 21, 4.2, 6, br, { k: 1.3 });
    q.ball(25, 31, 10, 9, br, { hl: 1.1 });
    if (!q.back) {
      q.within(r => { r.ell(22, 34, 6.5, 5.5, cream, { k: 1.2 }); });
      q.fell(18, 22, 2, 3.5, '#d89080'); q.fell(32, 21, 2, 3.5, '#d89080');
      q.eye(20, 29, 2.4, 3, { white: WHITE, dark: INK, px: 0.3, pw: 0.65 });
      q.eye(29, 29, 2.4, 3, { white: WHITE, dark: INK, px: 0.3, pw: 0.65 });
      q.dot(24, 33, INK); q.line([[22, 36], [24, 37], [26, 36]], 0.5, dk);
    }
  });
  // short forelegs held in front
  p.part(q => { q.stroke([[22, 42], [19, 47], [19, 50]], 2.6, 2.1, br, { k: 1.3 }); q.stroke([[34, 42], [36, 46], [36, 49]], 2.4, 2, brD, { k: 1.3 }); });
  p.part(q => { pawP(q, 19, 51, 2.8, cream); pawP(q, 36, 50, 2.6, cream); });
};

PA.furret = p => {
  const br = '#946244', brD = '#6f472f', cream = '#f2d8aa', creamD = '#d6b986';
  const sw = p.f ? 1 : 0;
  // one long low body that runs straight out into the tail
  const spine = [[16, 30], [26, 37 + sw], [38, 39], [49, 34], [58, 23]];
  p.part(q => {
    q.stroke(spine, 7.5, 2.4, cream, { k: 1.9 });
    q.within(r => {
      for (const [x, y, a] of [[24, 36 + sw, 1.3], [32, 38.5, 1.5], [40, 38.5, 1.6], [48, 35, 1.9]]) {
        const dx = Math.cos(a) * 8, dy = Math.sin(a) * 8;
        r.stroke([[x - dx, y - dy], [x + dx, y + dy]], 2.1, 2.1, br, { k: 1 });
      }
    });
  });
  p.part(q => { legP(q, 24, 41, 23, 49, 2.8, 2.2, brD); legP(q, 42, 43, 43, 50, 2.8, 2.2, brD); });
  p.part(q => { pawP(q, 23, 50, 3, creamD); pawP(q, 43, 51, 3, creamD); });
  p.part(q => { legP(q, 28, 42, 28, 51, 3, 2.4, cream); legP(q, 46, 42, 48, 51, 3, 2.4, cream); });
  p.part(q => { pawP(q, 28, 52, 3.2, cream, creamD); pawP(q, 48, 52, 3.2, cream, creamD); });
  p.part(q => {
    q.ball(11, 21, 3.2, 4.2, br, { k: 1.3 }); q.ball(21, 20, 3.2, 4.2, br, { k: 1.3 });
    q.ball(16, 27, 8.5, 7.5, cream, { hl: 1.1 });
    q.within(r => r.ell(16, 22, 6.8, 3.2, br, { k: 1.1 }));
    if (!q.back) {
      q.eye(11.5, 26, 1.6, 1.9); q.eye(19.5, 26, 1.6, 1.9);
      q.dot(15.5, 29.5, INK); q.line([[13.5, 32], [15.5, 33], [17.5, 32]], 0.5, '#6a4630');
    }
  });
};

PA.caterpie = p => {
  const g = '#7cc052', belly = '#f6e4a0';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.ball(52, 56, 5, 4.5, g); q.fpoly([[54, 52], [60, 48], [57, 54]], g); });
  p.part(q => { q.ball(44, 56, 6, 5, g); q.within(r => r.ell(44, 59, 5, 2.5, belly, { flat: true })); });
  p.part(q => { q.ball(35, 53, 7, 6.5, g); q.within(r => r.ell(34, 57, 6, 3, belly, { flat: true })); });
  p.part(q => {
    q.stroke([[24, 25], [26, 18 - sw], [22, 14 - sw]], 1.4, 1, '#e8503c'); q.stroke([[26, 18 - sw], [31, 15 - sw]], 1.2, 1, '#e8503c');
    q.ball(25, 40, 11, 11, g);
    if (!q.back) {
      q.within(r => r.ell(24, 49, 8, 3, belly, { flat: true }));
      q.fell(18, 38, 4.5, 5, '#f4d040'); q.fell(18, 38, 3, 3.5, INK); q.dot(17, 36, WHITE);
      q.fell(29, 37, 2.8, 3.8, '#f4d040'); q.fell(29, 37, 1.8, 2.5, INK); q.dot(28, 36, WHITE);
      q.line([[14, 45], [18, 46]], 0.5, '#3c6a2a');
    }
  });
};

PA.metapod = p => {
  const g = '#6caa4a';
  p.part(q => {
    q.poly([[34, 12], [44, 20], [48, 34], [46, 48], [40, 58], [30, 62], [22, 60], [26, 52], [24, 40], [24, 28], [28, 18]], g, { hl: 1.2 });
    q.within(r => { r.line([[26, 44], [46, 40]], 0.5, '#3e7a2c'); r.line([[26, 52], [44, 50]], 0.5, '#3e7a2c'); r.line([[30, 30], [46, 28]], 0.5, '#3e7a2c'); });
    if (!q.back) {
      q.fpoly([[24, 33], [31, 31], [31, 35], [25, 36]], WHITE); q.fpoly([[26, 33], [30, 32], [30, 35], [27, 35]], INK);
      q.line([[24, 32], [31, 30]], 0.6, '#2c5a1e');
      q.fpoly([[34, 31], [40, 30], [40, 34], [35, 34]], WHITE); q.fpoly([[35, 31], [39, 31], [39, 34], [36, 34]], INK);
      q.line([[34, 30.5], [40, 29.5]], 0.6, '#2c5a1e');
    }
  });
};

PA.butterfree = p => {
  const body = '#5a62aa', wing = '#f6f6fc', wingD = '#c9cadf', vein = '#303044', eye = '#e03a52';
  const f = p.f ? 3 : 0;
  const pane = (q, pts, veins, tip) => {
    q.poly(pts, wing, { k: 2.4, sd: 0.7 });
    q.within(r => { for (const v of veins) r.line(v, 0.5, wingD); if (tip) r.poly(tip, vein, { flat: true }); });
  };
  p.part(q => {
    pane(q, [[34, 30], [48, 6 + f], [62, 10 + f], [60, 26], [48, 34]],
      [[[34, 30], [58, 12 + f]], [[38, 31], [60, 22]], [[36, 33], [52, 33]]],
      [[58, 10 + f], [62, 10 + f], [61, 17 + f], [56, 14 + f]]);
    pane(q, [[34, 38], [52, 40], [58, 50 - f * 0.5], [48, 56 - f * 0.5], [38, 46]],
      [[[36, 40], [54, 50 - f * 0.5]], [[38, 44], [50, 52 - f * 0.5]]],
      [[54, 47], [58, 50 - f * 0.5], [55, 54]]);
  });
  p.part(q => {
    q.ball(30, 42, 6, 9, body, { hl: 0.9 });
    q.stroke([[25, 28], [20, 18], [16, 14]], 0.8, 0.6, INK, { k: 1 });
    q.stroke([[29, 27], [30, 16], [28, 11]], 0.8, 0.6, INK, { k: 1 });
    q.ball(26, 30, 8, 7, body, { hl: 1.1 });
    if (!q.back) {
      q.ball(21, 30, 4, 4.5, eye, { hl: 1.3 }); q.ball(31, 30, 3.5, 4, eye, { hl: 1.3 });
      q.within(r => { r.line([[18, 29], [24, 29]], 0.4, '#a02038'); });
      q.line([[23, 35], [26, 36]], 0.5, '#2c2c50');
    }
    q.ell(24, 46, 2, 3.5, '#84d0c8', { rot: 30, k: 1.2 }); q.ell(33, 50, 2, 3, '#84d0c8', { rot: -20, k: 1.2 });
  });
  p.part(q => {
    pane(q, [[26, 32], [8, 12 + f], [2, 20 + f], [6, 32], [20, 38]],
      [[[26, 32], [6, 18 + f]], [[24, 34], [4, 26 + f]], [[24, 36], [10, 34]]],
      [[8, 12 + f], [2, 20 + f], [5, 15 + f]]);
    pane(q, [[26, 40], [12, 44], [8, 54 - f * 0.5], [18, 56 - f * 0.5], [28, 46]],
      [[[26, 42], [10, 52 - f * 0.5]], [[25, 45], [14, 53 - f * 0.5]]], null);
  });
};

PA.pikachu = p => {
  const y = '#f8d434', yd = '#dfa81e', dk = '#241c22', cheek = '#ec3c3c', brn = '#9c5c1a';
  const sw = p.f ? 1 : 0;
  p.part(q => {
    q.poly([[38, 50], [44, 44], [42, 40], [52, 30 - sw], [48, 26 - sw], [60, 18 - sw], [58, 30 - sw], [50, 34], [52, 38], [44, 46], [42, 52]], y, { k: 1.5 });
    q.within(r => r.fpoly([[37, 51], [44, 43], [46, 47], [42, 53]], brn));
  }, { ot: 0.5 });
  p.part(q => q.ell(40, 57, 5.4, 3.6, yd, { k: 1.2 }));
  const head = () => p.part(q => {
    q.poly([[21, 25], [15, 12], [10, 1], [16, 1], [22, 12], [27, 22]], y, { k: 1.5 });
    q.within(r => r.fpoly([[10, 1], [16, 1], [19, 10], [13, 11]], dk));
    q.poly([[33, 22], [39, 11 + sw], [45, 2 + sw], [49, 6 + sw], [42, 15 + sw], [37, 24]], y, { k: 1.5 });
    q.within(r => r.fpoly([[45, 2 + sw], [49, 6 + sw], [43, 14 + sw], [40, 10 + sw]], dk));
    q.ball(26, 29, 12.5, 11, y, { hl: 1.1 });
    if (!q.back) {
      q.eye(20, 26, 2.5, 2.9, { shineSize: 1.2 });
      q.eye(32, 26, 2.2, 2.6, { shineSize: 1.2 });
      q.ball(16, 34, 3.3, 2.9, cheek, { hl: false });
      q.ball(35, 34, 2.9, 2.6, cheek, { hl: false });
      q.fpoly([[24, 30], [28, 30], [26, 32]], dk);
      q.line([[22, 34], [24, 35.5], [26, 34], [28, 35.5], [30, 34]], 0.5, '#7a3e18');
    }
  });
  if (p.back) head();
  p.part(q => {
    q.ball(30, 47, 9.5, 10.5, y, { hl: 1 });
    if (q.back) q.within(r => { r.fpoly([[21, 40], [39, 40], [39, 42.6], [21, 42.6]], brn); r.fpoly([[22, 46], [38, 46], [38, 48.6], [22, 48.6]], brn); });
  });
  p.part(q => q.ell(24, 58, 5.4, 3.8, y, { k: 1.2 }));
  p.part(q => { q.ell(20.5, 45, 2.8, 4.4, yd, { rot: 38, k: 1.3 }); q.ell(39, 44, 2.5, 3.8, yd, { rot: -38, k: 1.3 }); });
  if (!p.back) head();
};

PA.raichu = p => {
  const o = '#f2a03e', cream = '#f8e6c0', dk = '#3a2a24', brn = '#8a5a2a';
  const sw = p.f ? 1 : 0;
  p.part(q => {
    q.stroke([[38, 54], [48, 56], [56, 50], [58, 40], [56, 30 - sw]], 1.9, 1.5, brn, { k: 1.3 });
    q.poly([[56, 30 - sw], [50, 22 - sw], [56, 22 - sw], [54, 13 - sw], [63, 22 - sw], [58, 22 - sw], [60, 31 - sw]], '#f8d44a', { k: 1.4 });
  });
  p.part(q => q.ell(39, 58, 5.2, 3.6, o, { k: 1.2 }));
  const head = () => p.part(q => {
    q.stroke([[18, 24], [10, 14], [6, 8], [9, 3]], 3.8, 1.6, brn, { k: 1.4 });
    q.within(r => r.stroke([[18, 24], [11, 15], [8, 9]], 2.4, 1, '#f8d44a', { k: 1 }));
    q.stroke([[34, 22], [42, 12], [46, 6], [43, 1]], 3.8, 1.6, brn, { k: 1.4 });
    q.within(r => r.stroke([[34, 22], [41, 13], [44, 8]], 2.4, 1, '#f8d44a', { k: 1 }));
    q.ball(26, 28, 12, 10.5, o, { hl: 1.1 });
    if (!q.back) {
      q.eye(21, 26, 2.3, 2.8); q.eye(32, 26, 2.1, 2.6);
      q.ball(17, 33, 3.1, 2.6, '#f8e050', { hl: false }); q.ball(35, 33, 2.7, 2.4, '#f8e050', { hl: false });
      q.fpoly([[24, 30], [28, 30], [26, 32]], dk);
      q.line([[23, 33.5], [25, 35], [27, 33.5], [29, 35]], 0.5, '#6a3a1e'); fang(q, 24, 34.5, 1.5);
    }
  });
  if (p.back) head();
  p.part(q => { q.ball(31, 46, 10, 11, o, { hl: 0.95 }); if (!q.back) q.within(r => r.ell(29, 49, 6.5, 8, cream, { k: 1.2 })); });
  p.part(q => q.ell(24, 58, 5.4, 3.6, o, { k: 1.2 }));
  p.part(q => { q.ell(21, 44, 2.7, 4.6, o, { rot: 40, k: 1.3 }); q.ell(39, 43, 2.5, 4.1, '#dd8c2c', { rot: -40, k: 1.3 }); });
  if (!p.back) head();
};

PA.oddish = p => {
  const b = '#5272c2', leaf = '#54b848', leafD = '#2f7c2c', leafL = '#7ad064';
  const sw = p.f ? 2 : 0;
  p.part(q => {
    const blade = (cx, cy, len, rot) => {
      const a = rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const P = [];
      for (const [t, wOff] of [[0, 0], [0.3, 1], [0.62, 1], [1, 0], [0.62, -1], [0.3, -1]]) {
        const wid = 4.6 * Math.sin(Math.max(0.08, t) * Math.PI) * (wOff === 0 ? 0.25 : 1);
        P.push([cx + ca * len * t - sa * wid * wOff, cy + sa * len * t + ca * wid * wOff]);
      }
      q.poly(P, leaf, { k: 1.8 });
      q.within(r => { r.line([[cx, cy], [cx + ca * len, cy + sa * len]], 0.5, leafD); r.line([[cx + ca * len * 0.35 - sa * 2, cy + sa * len * 0.35 + ca * 2], [cx + ca * len * 0.7, cy + sa * len * 0.7]], 0.5, leafL); });
    };
    blade(32, 30, 22, -126 - sw); blade(32, 30, 24, -96); blade(32, 30, 22, -60 + sw);
    blade(32, 31, 19, -150 - sw); blade(32, 31, 19, -32 + sw);
  });
  p.part(q => { q.ell(26, 58, 4.2, 3, b, { k: 1.2 }); q.ell(38, 58, 4.2, 3, b, { k: 1.2 }); });
  p.part(q => {
    q.ball(32, 45, 12.5, 11.5, b, { hl: 1.2 });
    if (!q.back) {
      q.eye(26, 44, 2.4, 2.8, { white: '#fdf4e8', dark: '#d0303e', px: 0, pw: 0.55, ph: 0.6, shineSize: 1 });
      q.eye(37, 44, 2.4, 2.8, { white: '#fdf4e8', dark: '#d0303e', px: 0, pw: 0.55, ph: 0.6, shineSize: 1 });
      q.line([[28, 50], [31, 51.5], [34, 50]], 0.5, '#26407e');
    }
  });
};

PA.gloom = p => {
  const b = '#5c6aa4', pet = '#b8402e', spot = '#f0b040';
  const f = p.f ? 1 : 0;
  p.part(q => { q.ball(25, 59, 5, 3.5, b); q.ball(39, 59, 5, 3.5, b); });
  p.part(q => {
    q.ball(32, 46, 13, 13, b);
    if (!q.back) {
      q.fpoly([[23, 42], [29, 41], [29, 44], [24, 44]], INK); q.line([[22, 41], [29, 40]], 0.6, '#2a3060');
      q.fpoly([[35, 41], [41, 42], [40, 44], [35, 44]], INK); q.line([[35, 40], [42, 41]], 0.6, '#2a3060');
      q.fell(32, 50, 3, 2.5, MOUTH);
      q.stroke([[34, 52], [35, 56 + f]], 0.8, 0.8, '#8ad0f0', { flat: true });
    }
    q.ell(20, 50, 2.5, 4, b, { rot: 30 }); q.ell(44, 50, 2.5, 4, b, { rot: -30 });
  });
  p.part(q => {
    q.ell(18, 28 + f, 12, 6, pet, { rot: 20 }); q.ell(46, 28 + f, 12, 6, pet, { rot: -20 });
    q.ell(26, 20, 10, 6, pet, { rot: -35 }); q.ell(40, 20, 10, 6, pet, { rot: 35 });
    q.within(r => { for (const [x, y] of [[12, 27], [20, 30], [44, 30], [52, 27], [24, 18], [42, 18], [30, 22], [36, 22]]) r.fell(x, y + f * (y > 25 ? 1 : 0), 1.8, 1.4, spot); });
    q.ball(32, 28, 5, 3.5, '#7a2a20', { hl: false });
  });
};

PA.tangela = p => {
  const b = '#5480d2', b2 = '#7098e4', b3 = '#3f66b6', gap = '#1d2a58', shoe = '#e44848';
  const f = p.f ? 1 : 0;
  p.part(q => { q.ell(24, 59, 6, 3.6, shoe, { k: 1.2 }); q.ell(40, 59, 6, 3.6, shoe, { k: 1.2 }); });
  p.part(q => {
    q.ball(32, 38, 17.5, 17.5, gap, { hl: false });
    q.within(r => {
      const rng = seeded(5), cols = [b, b2, b3];
      for (let i = 0; i < 16; i++) {
        const a0 = rng() * Math.PI * 2, r0 = 4 + rng() * 12, sweep = 0.5 + rng() * 0.3;
        const pts = [];
        for (let k = 0; k <= 4; k++) { const a = a0 + k * sweep, rr = r0 + Math.sin(k * 1.6 + i) * 3.5; pts.push([32 + Math.cos(a) * rr, 38 + Math.sin(a) * rr * 0.95]); }
        r.stroke(pts, 3.2, 2.6, gap, { flat: true });
        r.stroke(pts, 2.2, 1.7, cols[i % 3], { k: 1.2 });
      }
    });
  });
  // vine ends curling off the mass
  p.part(q => {
    for (const [x, y, a] of [[17, 25, 1], [48, 23, -1], [17, 49, 1], [47, 50, -1], [27, 21, 0.6], [38, 21, -0.6]])
      q.stroke([[x, y], [x - 6 * a, y - 5 + f], [x - 11 * a, y - 1]], 1.8, 1.1, b, { k: 1.2 });
  });
  if (!p.back) {
    p.part(q => {
      q.fell(32, 39, 9.5, 4.6, '#100e26');
      q.eye(27, 39, 2.3, 2.7, { white: WHITE, px: 0, pw: 0.5, ph: 0.6 });
      q.eye(37, 39, 2.3, 2.7, { white: WHITE, px: 0, pw: 0.5, ph: 0.6 });
    }, { ao: 0, outline: false });
  }
};

// ═══════════════════════════════ ELECTRIC SHEEP ═════════════════════════════
PA.mareep = p => {
  const wool = '#f6f4e6', y = '#f8d85c', dk = '#2a2a40';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[50, 44], [56, 38 - sw], [58, 30 - sw]], 1.6, 1.4, y); q.within(r => { r.dot(53, 41, dk, 1.5); r.dot(56, 35 - sw, dk, 1.5); }); q.ball(58, 28 - sw, 3.2, 3.2, '#ec3838'); });
  p.part(q => { for (const x of [24, 32, 40, 46]) q.stroke([[x, 50], [x, 60]], 2, 2, y); });
  p.part(q => {
    const bumps = [[30, 38, 10], [42, 38, 10], [36, 30, 9], [24, 46, 8], [48, 46, 8], [36, 48, 10]];
    for (const [x, yy, r] of bumps) q.ball(x, yy, r, r * 0.9, wool, { hl: 0.8 });
  });
  p.part(q => {
    q.ell(10, 30, 6, 2.5, y, { rot: -20 }); q.ell(30, 26, 6, 2.5, y, { rot: 20 });
    q.within(r => { r.fell(5, 32, 2.5, 2.5, dk); r.fell(35, 28, 2.5, 2.5, dk); });
    q.ball(20, 34, 9, 8, y);
    q.ball(21, 25, 5, 3.5, wool, { hl: false });
    if (!q.back) { q.eye(16, 33, 2, 3, { dark: dk }); q.eye(24, 33, 2, 3, { dark: dk }); q.line([[18, 39], [20, 40], [22, 39]], 0.5, '#8a6a1e'); }
  });
};

PA.flaaffy = p => {
  const pk = '#f2a8c2', wool = '#f6f4ea', dk = '#2c3450';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[40, 52], [50, 52], [56, 44], [56, 36 - sw]], 1.6, 1.4, pk); q.within(r => { r.dot(46, 52, dk, 1.5); r.dot(54, 47, dk, 1.5); r.dot(56, 40, dk, 1.5); }); q.ball(56, 34 - sw, 3.2, 3.2, '#3c8cf0'); });
  p.part(q => { q.ball(26, 58, 4.5, 3.5, pk); q.ball(36, 58, 4.5, 3.5, pk); });
  p.part(q => { q.ball(31, 46, 10, 11, pk); q.ball(30, 38, 9, 5, wool, { hl: false }); q.ball(40, 50, 4, 5, wool); });
  p.part(q => { q.ell(21, 46, 2.5, 4.5, pk, { rot: 35 }); q.ell(40, 44, 2.4, 4, pk, { rot: -35 }); });
  p.part(q => {
    q.ell(14, 17, 6, 2.5, pk, { rot: -30 }); q.ell(34, 16, 6, 2.5, pk, { rot: 30 });
    q.within(r => { r.dot(10, 19, dk, 2); r.dot(37, 18, dk, 2); });
    q.ball(24, 25, 9, 8, pk);
    q.ball(25, 17, 6, 3.5, wool, { hl: false });
    if (!q.back) { q.eye(20, 24, 2, 3, { dark: dk }); q.eye(28, 24, 2, 3, { dark: dk }); q.line([[21, 30], [24, 31], [26, 30]], 0.5, '#8a3a5a'); }
  });
};

PA.ampharos = p => {
  const y = '#f8d044', wh = '#f4f2ea', dk = '#262a3a', red = '#ee3a3a';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[40, 54], [50, 56], [56, 50], [58, 42]], 3, 2, y); q.within(r => { r.dot(46, 55, dk, 2); r.dot(53, 53, dk, 2); }); q.ball(58, 40 - sw, 3.2, 3.2, red); });
  p.part(q => { q.ball(27, 58, 5, 4, y); q.ball(38, 58, 5, 4, y); });
  p.part(q => { q.ball(32, 46, 10, 12, y); if (!q.back) q.within(r => r.ball(30, 49, 6.5, 9, wh, { hl: false })); });
  p.part(q => { q.stroke([[30, 36], [28, 26], [26, 20]], 4.5, 4, y); if (!q.back) q.within(r => r.stroke([[28, 36], [26, 26], [24, 21]], 2.2, 2, wh)); q.within(r => { r.line([[27, 30], [33, 31]], 0.8, dk); }); });
  p.part(q => { q.ell(22, 44, 2.6, 5, y, { rot: 40 }); q.ell(41, 44, 2.6, 5, y, { rot: -40 }); q.within(r => { r.dot(20, 42, dk, 1.5); }); });
  p.part(q => {
    q.ell(16, 14, 6, 2.5, y, { rot: -30 }); q.ell(34, 13, 6, 2.5, y, { rot: 30 });
    q.within(r => { r.dot(11, 16, dk, 2); r.dot(38, 15, dk, 2); });
    q.ball(25, 19, 8, 7, y);
    q.ball(25, 12 - sw * 0.5, 2.6, 2.6, red);
    if (!q.back) { q.eye(21, 19, 1.8, 2.8, { dark: dk }); q.eye(29, 19, 1.8, 2.8, { dark: dk }); q.line([[22, 24], [25, 25], [27, 24]], 0.5, '#8a6a1e'); }
  });
};

// ═══════════════════════════════ CAVE ═══════════════════════════════════════
PA.zubat = p => {
  const b = '#5a92e2', mem = '#a67ad6';
  const f = p.f ? 5 : 0;
  p.part(q => { q.stroke([[29, 42], [28, 52], [27, 60]], 1.3, 0.9, b); q.stroke([[35, 42], [37, 52], [39, 60]], 1.3, 0.9, b); });
  p.part(q => {
    q.poly(wingPts(28, 32, 26, 12 - f, -1, 3), b); q.within(r => r.fpoly(wingPts(26, 33, 20, 9 - f, -1, 3), mem));
  });
  p.part(q => {
    q.poly(wingPts(36, 32, 26, 12 - f, 1, 3), b); q.within(r => r.fpoly(wingPts(38, 33, 20, 9 - f, 1, 3), mem));
  });
  p.part(q => {
    q.poly([[26, 30], [22, 14], [30, 26]], b); q.poly([[34, 26], [42, 14], [38, 30]], b);
    q.within(r => { r.fpoly([[26, 28], [23.5, 18], [28, 26]], mem); r.fpoly([[36, 26], [40, 18], [37, 28]], mem); });
    q.ball(32, 35, 8, 9, b);
    if (!q.back) { q.fell(32, 38, 4.5, 3, MOUTH); q.fpoly([[28.5, 36], [30, 36], [29.5, 39]], WHITE); q.fpoly([[34, 36], [35.5, 36], [34.5, 39]], WHITE); }
  });
};

PA.golbat = p => {
  const b = '#4c86d6', mem = '#9a6ad0';
  const f = p.f ? 4 : 0;
  p.part(q => { q.stroke([[29, 50], [28, 58]], 1.6, 1.2, b); q.stroke([[37, 50], [38, 58]], 1.6, 1.2, b); });
  p.part(q => { q.poly(wingPts(24, 30, 24, 16 - f, -1, 3), b); q.within(r => r.fpoly(wingPts(22, 31, 18, 12 - f, -1, 3), mem)); });
  p.part(q => { q.poly(wingPts(40, 30, 24, 16 - f, 1, 3), b); q.within(r => r.fpoly(wingPts(42, 31, 18, 12 - f, 1, 3), mem)); });
  p.part(q => {
    q.poly([[24, 24], [22, 12], [29, 20]], b); q.poly([[35, 20], [42, 12], [40, 24]], b);
    q.ball(32, 36, 13, 15, b);
    if (!q.back) {
      q.fell(32, 40, 10, 10, '#8c1a3a');
      q.within(r => r.ball(32, 46, 6, 4, '#e0506a', { hl: false }));
      q.fpoly([[24, 32], [27, 32], [25.5, 37]], WHITE); q.fpoly([[37, 32], [40, 32], [38.5, 37]], WHITE);
      q.fpoly([[26, 49], [28, 49], [27, 46]], WHITE); q.fpoly([[36, 49], [38, 49], [37, 46]], WHITE);
      q.eye(26, 25, 2, 1.4, { dark: INK, shine: false }); q.eye(38, 25, 2, 1.4, { dark: INK, shine: false });
      q.dot(26, 25, '#f04a58'); q.dot(38, 25, '#f04a58');
    }
  });
};

PA.geodude = p => {
  const g = '#a49a8c';
  const f = p.f ? 1 : 0;
  p.part(q => {
    q.stroke([[40, 36], [50, 34], [56, 26 - f]], 3.5, 3, g); q.ball(57, 22 - f, 5, 5, g);
    q.within(r => { r.line([[54, 20 - f], [58, 20 - f]], 0.5, '#6a6258'); r.line([[54, 23 - f], [59, 23 - f]], 0.5, '#6a6258'); });
  });
  p.part(q => {
    q.ball(32, 38, 13, 12, g, { hl: 1.1 });
    q.within(r => { r.line([[38, 29], [42, 34], [40, 38]], 0.5, '#6a6258'); r.line([[23, 44], [27, 47]], 0.5, '#6a6258'); r.fell(40, 45, 2, 1.5, '#8a8274'); r.fell(26, 30, 1.5, 1, '#c4bcb0'); });
    if (!q.back) {
      q.line([[23, 33], [30, 35]], 0.8, '#2a2622'); q.line([[34, 35], [41, 33]], 0.8, '#2a2622');
      q.eye(27, 37, 1.6, 1.4, { dark: INK }); q.eye(37, 37, 1.6, 1.4, { dark: INK });
      q.line([[28, 43], [32, 42], [36, 43]], 0.5, '#2a2622');
    }
  });
  p.part(q => {
    q.stroke([[24, 38], [14, 36], [8, 28 + f]], 3.5, 3, g); q.ball(7, 24 + f, 5, 5, g);
    q.within(r => { r.line([[5, 22 + f], [9, 22 + f]], 0.5, '#6a6258'); r.line([[4, 25 + f], [9, 25 + f]], 0.5, '#6a6258'); });
  });
};

PA.graveler = p => {
  const g = '#a09888', dk = '#6a6258';
  const f = p.f ? 1 : 0;
  p.part(q => { q.stroke([[44, 36], [54, 30 - f]], 3.2, 2.8, g); q.ball(56, 28 - f, 4.5, 4.5, g); q.stroke([[44, 46], [54, 50 + f]], 3.2, 2.8, g); q.ball(56, 52 + f, 4.5, 4.5, g); });
  p.part(q => { q.ball(26, 58, 5, 3.5, g); q.ball(38, 58, 5, 3.5, g); });
  p.part(q => {
    const rocks = [[32, 42, 15, 14], [22, 34, 7, 6], [42, 32, 7, 6], [30, 28, 7, 6], [20, 48, 6, 5], [44, 50, 6, 5]];
    for (const [x, y, rx, ry] of rocks) q.ball(x, y, rx, ry, g, { hl: 0.8 });
    q.within(r => { r.line([[26, 40], [22, 44]], 0.5, dk); r.line([[40, 38], [44, 42]], 0.5, dk); });
    if (!q.back) {
      q.line([[24, 39], [30, 41]], 0.8, '#2a2622'); q.line([[34, 41], [40, 39]], 0.8, '#2a2622');
      q.eye(27, 43, 1.6, 1.5); q.eye(37, 43, 1.6, 1.5);
      q.fell(32, 49, 4, 2, MOUTH); q.dot(30, 48, WHITE); q.dot(34, 48, WHITE);
    }
  });
  p.part(q => { q.stroke([[20, 38], [10, 32 + f]], 3.2, 2.8, g); q.ball(8, 30 + f, 4.5, 4.5, g); q.stroke([[20, 48], [10, 52 - f]], 3.2, 2.8, g); q.ball(8, 54 - f, 4.5, 4.5, g); });
};

PA.onix = p => {
  const g = '#b2b0a8', dk = '#6c6a64';
  const f = p.f ? 1 : 0;
  const chain = [[58, 60, 5], [52, 55, 5.5], [46, 58, 6], [38, 58, 6.5], [30, 54, 7], [26, 46, 7.5], [30, 38, 7.5], [38, 32, 7], [42, 24, 6.5]];
  for (let i = 0; i < chain.length; i++) {
    const [x, y, r] = chain[i];
    p.part(q => {
      boulderP(q, x, y - (i > 5 ? f : 0), r, g, i * 0.9);
      q.within(rr => { rr.line([[x - r * 0.55, y - r * 0.35], [x + r * 0.45, y + r * 0.2]], 0.5, dk); rr.line([[x - r * 0.2, y + r * 0.45], [x + r * 0.5, y + r * 0.3]], 0.5, dk); });
    });
  }
  p.part(q => {
    q.poly([[34, 6 - f], [41, -4 - f], [44, 9 - f]], g, { k: 1.4 });
    boulderP(q, 34, 15 - f, 11, g, 0.4);
    if (!q.back) {
      q.line([[24, 11 - f], [30, 13 - f]], 0.8, '#2a2622');
      q.eye(27, 15 - f, 1.8, 1.6); q.eye(36, 14 - f, 1.5, 1.4);
      q.line([[24, 19 - f], [30, 21 - f], [38, 20 - f]], 0.5, '#2a2622');
    }
  });
};

// ═══════════════════════════════ WATER ══════════════════════════════════════
PA.magikarp = p => {
  const o = '#f06a48', bel = '#f8e2c4', fin = '#f8d860';
  const f = p.f ? 2 : 0;
  p.part(q => { q.poly([[46, 42], [60, 30 + f], [58, 42], [60, 56 - f], [46, 46]], fin); q.within(r => { r.line([[50, 42], [58, 34 + f]], 0.5, '#c8a030'); r.line([[50, 45], [58, 52 - f]], 0.5, '#c8a030'); }); });
  p.part(q => { q.poly([[20, 28], [26, 14], [32, 22], [38, 12], [42, 24], [46, 20], [44, 32]], fin); });
  p.part(q => {
    q.ell(30, 42, 18, 14, o, { hl: 1.2 });
    q.within(r => { r.ell(28, 52, 16, 6, bel, { flat: true }); for (let x = 30; x < 46; x += 5) for (let y = 34; y < 50; y += 5) r.line([[x, y], [x + 2, y + 2], [x, y + 4]], 0.5, '#c24a30'); });
    if (!q.back) {
      q.fell(20, 38, 5.5, 5.5, WHITE); q.fell(19.5, 38, 1.4, 1.4, INK);
      q.fell(12, 48, 3, 4, '#f8c8b8'); q.line([[10, 45], [14, 50]], 0.5, '#9a3a2a');
    }
  });
  p.part(q => { q.stroke([[12, 44], [6, 46], [4, 54]], 0.9, 0.7, fin); q.stroke([[16, 50], [14, 56], [16, 60]], 0.9, 0.7, fin); });
  p.part(q => q.poly([[30, 52], [36, 62], [40, 54]], fin));
};

PA.gyarados = p => {
  const b = '#3a72d2', bel = '#f2e2a4', fin = '#f0f4fc';
  const f = p.f ? 1 : 0;
  const body = [[58, 60], [60, 48], [52, 40], [40, 42], [34, 52], [24, 54], [18, 44], [20, 30], [24, 20]];
  p.part(q => { q.poly([[54, 60], [62, 50], [64, 62]], fin); });
  p.part(q => {
    q.stroke(body, 5, 7, b);
    q.within(r => { r.stroke([[56, 60], [57, 50], [50, 44], [42, 46], [36, 55], [26, 57], [22, 50]], 2, 2.5, bel, { flat: true }); });
  });
  for (const [x, y] of [[52, 36], [38, 38], [18, 38]]) p.part(q => q.poly([[x - 3, y + 4], [x, y - 5], [x + 3, y + 4]], fin));
  p.part(q => {
    q.poly([[26, 4], [32, -2 - f], [34, 10]], fin); q.poly([[30, 8], [40, 4 - f], [36, 14]], fin);
    q.ball(22, 16, 11, 9, b);
    q.poly([[4, 16], [20, 10], [24, 20], [10, 24]], b);
    if (!q.back) {
      q.fpoly([[4, 18], [20, 16], [22, 26], [8, 26]], '#7a1a2a');
      q.fpoly([[7, 18], [9, 18], [8, 21]], WHITE); q.fpoly([[13, 17.5], [15, 17.5], [14, 20.5]], WHITE); q.fpoly([[10, 26], [12, 26], [11, 23]], WHITE); q.fpoly([[16, 26], [18, 26], [17, 23]], WHITE);
      q.eye(21, 12, 2.2, 2, { iris: '#e03030' });
      q.line([[17, 9], [24, 11]], 0.7, '#1c3a78');
    }
    q.stroke([[10, 16], [2, 12], [0, 6]], 1, 0.6, fin);
  });
};

PA.staryu = p => {
  const b = '#c89250', gold = '#f8d050';
  const r = p.f ? 3 : 0;
  p.part(q => {
    q.poly(star(32, 38, 22, 9, 5, -90 + r), b, { hl: 1.1 });
    q.within(rr => rr.poly(star(32, 38, 16, 6, 5, -90 + r), '#d8a466', { flat: true }));
  });
  p.part(q => { q.ball(32, 38, 6.5, 6.5, gold, { hl: false }); q.ball(32, 38, 4.5, 4.5, '#ec3a58', { hl: 1.5 }); });
};

PA.starmie = p => {
  const b = '#8a6cc0', gold = '#f8d050';
  const r = p.f ? 4 : 0;
  p.part(q => q.poly(star(32, 36, 22, 9, 5, -54 - r), '#6e52a4'));
  p.part(q => { q.poly(star(32, 36, 23, 9, 5, -90 + r), b, { hl: 1.1 }); });
  p.part(q => { q.ball(32, 36, 7.5, 7.5, gold, { hl: false }); q.ball(32, 36, 5.5, 5.5, '#ec3a58', { hl: 1.5 }); q.dot(30, 33, WHITE, 1.5); });
};

// ═══════════════════════════════ GHOSTS ═════════════════════════════════════
PA.gastly = p => {
  const gas = '#8a5ad0', core = '#2a1f38';
  const f = p.f ? 1.5 : 0;
  p.part(q => {
    const pts = [];
    for (let a = 0; a < 360; a += 12) { const rr = 21 + Math.sin(a * 5 * Math.PI / 180 + f) * 3.2 + Math.sin(a * 2 * Math.PI / 180) * 1.5; pts.push([32 + Math.cos(a * Math.PI / 180) * rr, 35 + Math.sin(a * Math.PI / 180) * rr * 0.95]); }
    q.poly(pts, gas, { flat: true });
    q.within(r => { const pts2 = pts.map(([x, y]) => [32 + (x - 32) * 0.82, 34 + (y - 34) * 0.82]); r.fpoly(pts2, '#a878e0'); });
  }, { outline: false });
  p.part(q => {
    q.ball(32, 35, 11, 11, core, { hl: 0.8 });
    if (!q.back) {
      q.fpoly([[21, 30], [30, 27], [30, 34], [23, 34]], WHITE); q.fell(27, 31, 1.6, 2, INK);
      q.fpoly([[34, 27], [43, 30], [41, 34], [34, 34]], WHITE); q.fell(37, 31, 1.6, 2, INK);
      q.fpoly([[24, 38], [40, 38], [37, 43], [27, 43]], '#d84868');
      q.fpoly([[26, 38], [28.5, 38], [27, 41]], WHITE); q.fpoly([[35.5, 38], [38, 38], [37, 41]], WHITE);
    }
  });
};

PA.haunter = p => {
  const b = '#7456aa', dk = '#4a3478';
  const f = p.f ? 2 : 0;
  p.part(q => { q.stroke([[34, 44], [40, 52], [36, 58], [42, 62]], 5, 1, b); });
  p.part(q => {
    q.poly([[14, 20], [18, 8], [22, 16], [28, 4], [32, 14], [38, 6], [42, 16], [48, 10], [50, 22], [50, 40], [40, 48], [24, 48], [14, 38]], b, { hl: 1.1 });
    if (!q.back) {
      q.fpoly([[18, 22], [28, 25], [27, 30], [20, 29]], WHITE); q.fell(25, 27, 1.5, 1.6, INK);
      q.fpoly([[46, 22], [36, 25], [37, 30], [44, 29]], WHITE); q.fell(39, 27, 1.5, 1.6, INK);
      q.fpoly([[20, 34], [44, 34], [40, 42], [24, 42]], '#241536');
      q.fpoly([[22, 34], [42, 34], [42, 36], [22, 36]], WHITE); q.fpoly([[24, 40], [40, 40], [39, 42], [25, 42]], WHITE);
      q.ball(31, 45, 3, 6, '#f07898', { hl: false });
    }
  });
  const hand = (x, y, dir) => p.part(q => { q.ball(x, y, 5, 4.5, b); for (let i = 0; i < 3; i++) q.stroke([[x + dir * 3, y - 3 + i * 3], [x + dir * 7, y - 5 + i * 4]], 1.6, 1.2, b); });
  hand(6, 38 - f, -1); hand(58, 36 + f, 1);
};

PA.gengar = p => {
  const b = '#6a5aa8', dk = '#4a3c80';
  const f = p.f ? 1 : 0;
  p.part(q => { q.ball(22, 58, 6, 4, b); q.ball(42, 58, 6, 4, b); });
  p.part(q => {
    q.poly([[12, 26], [14, 10], [22, 20]], b); q.poly([[42, 20], [50, 10], [52, 26]], b);
    q.poly([[44, 30], [58, 28], [52, 36], [60, 40], [50, 44]], b);
    q.ball(32, 40, 18, 18, b, { hl: 1.1 });
    if (!q.back) {
      q.fpoly([[18, 30], [28, 32], [27, 37], [20, 35]], '#f23a4a'); q.fell(24, 34, 1.2, 1.4, INK);
      q.fpoly([[46, 30], [36, 32], [37, 37], [44, 35]], '#f23a4a'); q.fell(40, 34, 1.2, 1.4, INK);
      q.fpoly([[18, 42], [46, 42], [40, 50], [24, 50]], '#241536');
      q.fpoly([[19, 42], [45, 42], [44, 45], [20, 45]], WHITE);
      for (let x = 22; x < 44; x += 4) q.line([[x, 42], [x, 45]], 0.4, '#b0b0c0');
    }
  });
  p.part(q => { q.ell(12, 44 - f, 5, 3.5, b, { rot: 30 }); q.ell(52, 44 + f, 5, 3.5, b, { rot: -30 }); });
};

PA.misdreavus = p => {
  const b = '#3e6c7c', hair = '#a8488e', pearl = '#e8385c';
  const f = p.f ? 1.5 : 0;
  p.part(q => {
    q.poly([[18, 26], [12, 40], [16, 50 + f], [20, 44], [24, 56 - f], [30, 48], [34, 58 + f], [38, 48], [44, 56 - f], [48, 44], [52, 50 + f], [52, 38], [46, 26]], b);
    q.within(r => { r.fpoly([[12, 40], [16, 50 + f], [20, 44], [24, 56 - f], [28, 50], [22, 46], [18, 40]], hair); r.fpoly([[52, 38], [52, 50 + f], [48, 44], [44, 56 - f], [40, 50], [46, 46], [50, 40]], hair); r.fpoly([[30, 48], [34, 58 + f], [38, 48], [34, 52]], hair); });
  });
  p.part(q => {
    q.ball(32, 28, 13, 12, b, { hl: 1.1 });
    q.within(r => { r.poly([[20, 22], [26, 14], [32, 18], [38, 14], [44, 22], [44, 26], [20, 26]], '#2c5664', { flat: true }); });
    if (!q.back) { q.eye(26, 29, 3, 3.2, { white: '#f8e040', dark: '#e02830', px: 0, pw: 0.45, ph: 0.8 }); q.eye(38, 29, 3, 3.2, { white: '#f8e040', dark: '#e02830', px: 0, pw: 0.45, ph: 0.8 }); q.line([[29, 36], [32, 37], [35, 36]], 0.5, '#1c3440'); }
  });
  p.part(q => { for (const [x, y] of [[22, 38], [27, 41], [32, 42], [37, 41], [42, 38]]) q.ball(x, y, 2.3, 2.3, pearl, { hl: 1.5 }); });
};

// ═══════════════════════════════ EEVEE / DARK ═══════════════════════════════
PA.eevee = p => {
  const br = '#c08a52', brD = '#976734', cream = '#f5e7c6', creamD = '#dbc498', dk = '#7a5230';
  const sw = p.f ? 1 : 0;
  p.part(q => {
    q.ell(48, 37 - sw, 9.5, 12, br, { rot: 22, k: 2 });
    q.within(r => { r.ell(53, 30 - sw, 6, 6.5, cream, { k: 1.4 }); r.line([[43, 46], [49, 34]], 0.6, brD); });
  });
  p.part(q => q.ell(42, 54, 4, 6.5, brD, { k: 1.2 }));
  const head = () => p.part(q => {
    q.poly([[15, 26], [6, 9], [15, 10], [24, 21]], br, { k: 1.7 });
    q.within(r => r.fpoly([[15, 22], [11, 12], [16, 13], [21, 21]], '#8a5c30'));
    q.poly([[30, 20], [38, 6], [43, 11], [37, 25]], br, { k: 1.7 });
    q.within(r => r.fpoly([[32, 20], [37, 11], [40, 14], [36, 22]], '#8a5c30'));
    q.ball(24, 28, 11.5, 10.5, br, { hl: 1.1 });
    q.within(r => r.ell(21, 35, 5.5, 3.2, cream, { k: 1 }));
    if (!q.back) {
      q.eye(18, 27, 2.9, 3.5, { iris: '#7a4420', shineSize: 1.3 });
      q.eye(29, 27, 2.5, 3.1, { iris: '#7a4420', shineSize: 1.3 });
      q.fpoly([[21, 32], [25, 32], [23, 35]], INK);
      q.line([[19.5, 36.5], [23, 38], [26.5, 36.5]], 0.5, dk);
    }
  });
  if (p.back) head();
  p.part(q => q.ball(35, 48, 12.5, 9, br, { hl: 0.9 }));
  p.part(q => { q.ell(24, 53, 3.6, 7, br, { k: 1.2 }); q.ell(32, 54, 3.8, 7, br, { k: 1.2 }); });
  p.part(q => { q.ell(24, 60, 4.3, 2.6, cream, { k: 1 }); q.ell(32, 61, 4.3, 2.6, cream, { k: 1 }); });
  // fluffy neck ring: a rounded mass with a few tufts poking out
  p.part(q => {
    q.ell(26, 40, 10, 7, cream, { hl: 0.9, k: 1.8 });
    for (const [x, yy, r0] of [[17, 40, 3.4], [21, 45, 3.4], [28, 46, 3.4], [34, 42, 3.4], [33, 35, 3], [19, 34, 3]]) q.ell(x, yy, r0, r0 * 0.9, cream, { k: 1.4 });
    q.within(r => {
      for (const [x, yy] of [[18, 42], [23, 46], [30, 45], [34, 40]]) r.ell(x, yy, 2.6, 1.6, creamD, { k: 1 });
    });
  });
  if (!p.back) head();
};

PA.umbreon = p => {
  const bk = '#363a4e', bkD = '#262a3c', ring = '#f6d24a';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[44, 44], [52, 38 - sw], [56, 29 - sw]], 3.6, 2.4, bk, { k: 1.5 }); q.within(r => r.stroke([[53, 36 - sw], [55, 32 - sw]], 2.8, 2.8, ring, { flat: true })); });
  p.part(q => { legP(q, 44, 47, 46, 57, 3.2, 2.4, bkD); legP(q, 34, 49, 33, 57, 3.2, 2.4, bkD); });
  p.part(q => { pawP(q, 46, 59, 3.4, bkD); pawP(q, 33, 59, 3.4, bkD); });
  const head = () => p.part(q => {
    q.poly([[14, 25], [5, 2], [13, 3], [23, 19]], bk, { k: 1.7 });
    q.poly([[30, 19], [39, 0], [43, 5], [37, 25]], bk, { k: 1.7 });
    q.within(r => { r.stroke([[10, 10], [14, 12]], 1.5, 1.5, ring, { flat: true }); r.stroke([[35, 8], [38, 10]], 1.5, 1.5, ring, { flat: true }); });
    q.ball(24, 28, 11, 10, bk, { hl: 0.9 });
    q.within(r => r.fell(24, 20, 3.5, 2, ring));
    if (!q.back) {
      q.eye(18, 29, 2.8, 2.8, { iris: '#e8303e', shineSize: 1.2 }); q.eye(29, 29, 2.6, 2.6, { iris: '#e8303e', shineSize: 1.2 });
      q.dot(21, 34, '#0c0c14');
    }
  });
  if (p.back) head();
  p.part(q => { q.ball(36, 46, 14, 9.5, bk, { hl: 0.8 }); q.within(r => r.fell(40, 42, 3, 1.5, ring)); });
  p.part(q => { legP(q, 41, 48, 43, 58, 3.4, 2.5, bk); legP(q, 28, 50, 27, 58, 3.4, 2.5, bk); q.within(r => { r.line([[41, 53], [45, 53]], 0.9, ring); r.line([[25, 54], [29, 54]], 0.9, ring); }); });
  p.part(q => { pawP(q, 43, 60, 3.7, bk); pawP(q, 27, 60, 3.7, bk); });
  if (!p.back) head();
};

PA.houndour = p => {
  const bk = '#3c404c', bkD = '#282c38', tan = '#d0844e', bone = '#ededed';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.stroke([[46, 42], [54, 36 - sw], [58, 30 - sw]], 1.7, 1.2, bk, { k: 1.3 }); q.poly([[55, 24 - sw], [63, 27 - sw], [57, 33 - sw]], bk, { k: 1.2 }); });
  p.part(q => { legP(q, 45, 49, 46, 57, 3.2, 2.4, bkD); legP(q, 34, 50, 33, 57, 3.2, 2.4, bkD); });
  p.part(q => { pawP(q, 46, 59, 3.4, tan); pawP(q, 33, 59, 3.4, tan); });
  p.part(q => {
    q.ball(37, 45, 14, 9.5, bk, { hl: 0.8 });
    q.within(r => { r.ell(33, 52, 9, 3.5, tan, { k: 1.1 }); r.line([[32, 37], [46, 37.5]], 1.1, bone); r.line([[30, 40.5], [46, 41]], 1.1, bone); });
  });
  p.part(q => { legP(q, 41, 50, 43, 58, 3.4, 2.5, bk); legP(q, 28, 51, 27, 58, 3.4, 2.5, bk); });
  p.part(q => { pawP(q, 43, 60, 3.7, tan, '#a86238'); pawP(q, 27, 60, 3.7, tan, '#a86238'); });
  p.part(q => {
    q.poly([[17, 20], [12, 8], [23, 15]], bk, { k: 1.4 });
    q.poly([[28, 15], [35, 6], [33, 18]], bk, { k: 1.4 });
    q.ball(24, 28, 11, 10, bk, { hl: 0.9 });
    q.ell(13, 33, 7.5, 5, tan, { k: 1.2 });
    q.within(r => { r.fell(25, 20, 4.5, 2.8, bone); r.dot(23, 20, bk); r.dot(26, 20, bk); });
    if (!q.back) {
      q.eye(19, 27, 2, 2.2, { iris: '#e04040' }); q.eye(28, 27, 1.8, 2, { iris: '#e04040' });
      q.dot(6, 31, '#0c0c14', 1.5); q.line([[7, 35], [13, 36], [19, 35]], 0.5, '#6a3018'); fang(q, 11, 36, 1.5);
    }
  });
};

PA.houndoom = p => {
  const bk = '#3a3e52', bkD = '#282c3c', tan = '#d07a44', bone = '#eceae6';
  const sw = p.f ? 1 : 0;
  // arrow-tipped tail
  p.part(q => { q.stroke([[48, 40], [56, 34 - sw], [60, 26 - sw]], 1.8, 1.2, bk, { k: 1.3 }); q.poly([[56, 19 - sw], [64, 24 - sw], [58, 30 - sw]], bk, { k: 1.2 }); });
  p.part(q => { legP(q, 47, 47, 48, 57, 3.4, 2.6, bkD); legP(q, 36, 48, 35, 57, 3.4, 2.6, bkD); });
  p.part(q => { pawP(q, 48, 59, 3.6, tan); pawP(q, 35, 59, 3.6, tan); });
  p.part(q => {
    q.ball(38, 42, 15, 10.5, bk, { hl: 0.8 });
    q.within(r => {
      r.ell(34, 50, 10, 4, tan, { k: 1.1 });
      r.stroke([[33, 32], [41, 30.5], [50, 32]], 1.1, 1.1, bone, { k: 1 });
      r.stroke([[31, 36], [40, 34.5], [50, 36]], 1.1, 1.1, bone, { k: 1 });
      r.stroke([[33, 40], [40, 38.5], [48, 40]], 1.1, 1.1, bone, { k: 1 });
    });
  });
  p.part(q => { legP(q, 43, 48, 45, 58, 3.6, 2.7, bk); legP(q, 30, 49, 29, 58, 3.6, 2.7, bk); });
  p.part(q => { pawP(q, 45, 60, 3.9, tan, '#a85c30'); pawP(q, 29, 60, 3.9, tan, '#a85c30'); });
  p.part(q => { q.ell(25, 37, 7, 2.4, bone, { k: 1 }); q.within(r => { r.dot(21, 37, bk); r.dot(27, 37, bk); }); });
  p.part(q => {
    q.stroke([[22, 16], [28, 6], [37, 5], [42, 11]], 2, 1.1, bone, { k: 1.2 });
    q.stroke([[26, 18], [34, 12], [43, 14]], 1.5, 0.8, bone, { k: 1.2 });
    q.ball(22, 25, 10.5, 9.5, bk, { hl: 0.9 });
    q.ell(11, 30, 8, 5, tan, { k: 1.2 });
    if (!q.back) {
      q.eye(17, 24, 2, 2, { iris: '#e04040' }); q.eye(26, 24, 1.8, 1.8, { iris: '#e04040' });
      q.line([[14, 21], [20, 22]], 0.6, '#101018'); q.dot(4, 28, '#0c0c14', 1.5);
      q.line([[5, 32], [11, 33], [18, 32]], 0.5, '#6a3018'); fang(q, 9, 33, 2); fang(q, 14, 33, 2);
    }
  });
};

PA.sneasel = p => {
  const bk = '#36466e', red = '#e2444a', cream = '#f0e2b8';
  const f = p.f ? 1 : 0;
  p.part(q => { q.stroke([[42, 44], [50, 40], [54, 32]], 1.6, 1, red); q.stroke([[44, 46], [54, 44], [58, 38]], 1.6, 1, red); });
  p.part(q => { q.ball(36, 58, 5, 3, bk); q.stroke([[34, 50], [36, 58]], 2.6, 2.4, bk); });
  p.part(q => { q.ball(34, 44, 9, 10, bk); if (!q.back) q.within(r => r.ball(31, 42, 5, 5, cream, { hl: false })); });
  p.part(q => { q.ball(24, 58, 5, 3, bk); q.stroke([[27, 50], [24, 58]], 2.6, 2.4, bk); });
  p.part(q => {
    q.poly([[30, 18], [42, 6 - f], [38, 20]], red); q.poly([[32, 18], [46, 12 - f], [38, 22]], red);
    q.poly([[16, 20], [14, 10], [22, 16]], bk);
    q.ball(24, 26, 10, 8.5, bk);
    q.within(r => r.fell(22, 18.5, 2, 1.5, '#f8d030'));
    if (!q.back) {
      q.fpoly([[16, 24], [23, 24], [22, 28], [17, 27]], '#f8e8a0'); q.fell(19, 26, 1, 1.4, INK);
      q.fpoly([[26, 24], [32, 24], [31, 27], [27, 28]], '#f8e8a0'); q.fell(28, 26, 1, 1.4, INK);
      q.line([[14, 31], [20, 32], [26, 31]], 0.5, '#101020'); fang(q, 18, 32, 1.2);
    }
  });
  p.part(q => {
    q.stroke([[26, 42], [18, 40], [12, 36]], 2.2, 2, bk);
    q.stroke([[12, 36], [6, 30 + f]], 0.8, 0.5, WHITE); q.stroke([[12, 36], [4, 34 + f]], 0.8, 0.5, WHITE); q.stroke([[12, 36], [6, 38 + f]], 0.8, 0.5, WHITE);
  });
};

PA.tyranitar = p => {
  const g = '#6e9c5c', belly = '#a8b4c8', dia = '#4a6ec4', dk = '#3e5c34';
  const f = p.f ? 1 : 0;
  p.part(q => { q.stroke([[40, 52], [52, 54], [60, 50]], 5, 2.5, g); });
  p.part(q => { q.ball(42, 57, 7, 6, g); });
  p.part(q => {
    for (const [x, y] of [[44, 18], [48, 28], [48, 40]]) q.poly([[x - 3, y + 4], [x + 5, y - 4], [x + 3, y + 6]], g);
    q.ball(34, 38, 14, 18, g);
    if (!q.back) q.within(r => { r.ball(30, 42, 9, 12, belly, { hl: false }); r.poly([[30, 34], [35, 40], [30, 46], [25, 40]], dia, { flat: true }); r.line([[23, 50], [37, 50]], 0.5, '#7a88a0'); });
    else q.within(r => { for (let y = 26; y < 52; y += 6) r.line([[26, y], [44, y + 1]], 0.5, dk); });
  });
  p.part(q => { q.ball(24, 58, 7, 5.5, g); if (!q.back) { q.dot(18, 61, WHITE); q.dot(21, 62, WHITE); } });
  p.part(q => { q.ell(20, 36, 3.5, 7, g, { rot: 35 }); q.within(r => { r.dot(16, 41, WHITE); }); });
  p.part(q => {
    q.poly([[26, 6 - f], [32, -2 - f], [32, 10 - f]], g);
    q.ball(26, 14 - f, 9, 8, g);
    q.ell(18, 16 - f, 7, 5, g, { hl: false });
    if (!q.back) {
      q.within(r => r.poly([[30, 10 - f], [35, 14 - f], [30, 18 - f]], dia, { flat: true }));
      q.eye(21, 12 - f, 1.8, 1.6, { iris: '#e0a030' });
      q.line([[17, 10 - f], [23, 11 - f]], 0.7, dk);
      q.line([[11, 18 - f], [17, 20 - f], [24, 19 - f]], 0.5, '#1e2c18'); fang(q, 14, 19 - f, 1.5);
    }
  });
};

// ═══════════════════════════════ POISON / STEEL ═════════════════════════════
PA.koffing = p => {
  const pu = '#9272ba', gas = '#c9b6dc', skull = '#f2e2b4';
  const f = p.f ? 1 : 0;
  p.part(q => { for (const [x, y, r] of [[14, 20 - f, 4], [50, 16 + f, 5], [54, 44 - f, 3.5], [10, 46 + f, 3]]) q.ball(x, y, r, r, gas, { hl: 1.2 }); });
  p.part(q => {
    q.ball(32, 34, 17, 17, pu, { hl: 1.1 });
    q.within(r => { for (const [x, y, rr] of [[18, 26, 2.5], [44, 22, 3], [46, 40, 2.5], [20, 44, 2], [30, 18, 2]]) { r.fell(x, y, rr, rr, '#6a4c92'); r.fell(x - 0.5, y - 0.5, rr * 0.6, rr * 0.6, '#7a5aa2'); } });
    if (!q.back) {
      q.fell(32, 44, 4, 3.5, skull); q.fpoly([[26, 48], [38, 50], [38, 51], [26, 49]], skull); q.fpoly([[26, 51], [38, 48], [38, 49], [26, 52]], skull);
      q.dot(30, 43, INK); q.dot(33, 43, INK);
      q.eye(25, 30, 2.4, 2.6, { white: WHITE, px: 0, pw: 0.5 }); q.eye(38, 30, 2.4, 2.6, { white: WHITE, px: 0, pw: 0.5 });
      q.line([[21, 26], [28, 28]], 0.6, INK); q.line([[35, 28], [42, 26]], 0.6, INK);
      q.line([[28, 37], [32, 36], [36, 37]], 0.5, INK);
    }
  });
};

PA.weezing = p => {
  const pu = '#8a6cae', gas = '#c9b6dc', skull = '#f2e2b4';
  const f = p.f ? 1 : 0;
  p.part(q => { for (const [x, y, r] of [[8, 16 - f, 4], [56, 50 + f, 4], [58, 10, 3.5], [30, 6 + f, 3]]) q.ball(x, y, r, r, gas, { hl: 1.2 }); });
  p.part(q => {
    q.ball(46, 24 - f, 11, 11, pu, { hl: 1.1 });
    if (!q.back) { q.eye(42, 22 - f, 1.8, 2, { white: WHITE, px: 0, pw: 0.5 }); q.eye(50, 22 - f, 1.8, 2, { white: WHITE, px: 0, pw: 0.5 }); q.line([[43, 28 - f], [49, 28 - f]], 0.5, INK); q.line([[39, 19 - f], [44, 20 - f]], 0.6, INK); }
    q.within(r => { r.fell(52, 30 - f, 2, 2, '#664a8a'); r.fell(40, 16 - f, 1.5, 1.5, '#664a8a'); });
  });
  p.part(q => q.stroke([[30, 34], [38, 28]], 4, 3, pu));
  p.part(q => {
    q.ball(24, 40, 16, 16, pu, { hl: 1.1 });
    q.within(r => { for (const [x, y, rr] of [[12, 34, 2.5], [34, 48, 2.5], [16, 50, 2]]) r.fell(x, y, rr, rr, '#664a8a'); });
    if (!q.back) {
      q.fell(24, 49, 3.5, 3, skull); q.dot(22, 48, INK); q.dot(25, 48, INK);
      q.eye(18, 36, 2.4, 2.6, { white: WHITE, px: 0, pw: 0.5 }); q.eye(30, 36, 2.4, 2.6, { white: WHITE, px: 0, pw: 0.5 });
      q.line([[14, 32], [21, 34]], 0.6, INK); q.line([[27, 34], [34, 32]], 0.6, INK);
      q.fell(24, 43, 3, 1.5, MOUTH);
    }
  });
};

PA.magnemite = p => {
  const st = '#bcc4cc', dk = '#6a7482';
  const f = p.f ? 1 : 0;
  const magnet = (x, dir) => p.part(q => {
    q.stroke([[x, 28], [x + 7 * dir, 30], [x + 9 * dir, 36], [x + 7 * dir, 42], [x, 44]], 2.4, 2.4, '#9aa2ae');
    q.fell(x + 0.5 * dir, 28, 2.4, 2.2, '#e84848'); q.fell(x + 0.5 * dir, 44, 2.4, 2.2, '#4870e8');
  });
  magnet(18 - f, -1); magnet(46 + f, 1);
  p.part(q => { q.stroke([[32, 26], [32, 18]], 1.6, 1.6, dk); q.ball(32, 16, 3, 2, '#a0a8b4'); });
  p.part(q => {
    q.ball(32, 36, 11, 11, st, { hl: 1.3 });
    if (!q.back) { q.fell(32, 36, 5.5, 5.5, WHITE); q.fell(32, 36, 2, 2, INK); q.dot(31, 35, WHITE); }
    q.within(r => { r.fell(24, 44, 1.5, 1.5, dk); r.fell(41, 28, 1.2, 1.2, dk); });
  });
};

PA.magneton = p => {
  const st = '#b8c0ca', dk = '#6a7482';
  const unit = (cx, cy, sc) => {
    p.part(q => {
      q.stroke([[cx - 8 * sc, cy - 6 * sc], [cx - 13 * sc, cy], [cx - 8 * sc, cy + 6 * sc]], 1.8 * sc, 1.8 * sc, '#9aa2ae');
      q.stroke([[cx + 8 * sc, cy - 6 * sc], [cx + 13 * sc, cy], [cx + 8 * sc, cy + 6 * sc]], 1.8 * sc, 1.8 * sc, '#9aa2ae');
      q.fell(cx - 8 * sc, cy - 6 * sc, 1.8, 1.6, '#e84848'); q.fell(cx - 8 * sc, cy + 6 * sc, 1.8, 1.6, '#4870e8');
      q.fell(cx + 8 * sc, cy - 6 * sc, 1.8, 1.6, '#e84848'); q.fell(cx + 8 * sc, cy + 6 * sc, 1.8, 1.6, '#4870e8');
    });
    p.part(q => {
      q.ball(cx, cy, 8 * sc, 8 * sc, st, { hl: 1.3 });
      if (!q.back) { q.fell(cx, cy, 4 * sc, 4 * sc, WHITE); q.fell(cx, cy, 1.5 * sc, 1.5 * sc, INK); }
      q.within(r => r.fell(cx - 5 * sc, cy + 5 * sc, 1, 1, dk));
    });
  };
  const f = p.f ? 1 : 0;
  unit(32, 18 - f, 1); unit(18, 42 + f, 1); unit(46, 42 - f, 1);
};

// ═══════════════════════════════ FIRE DOGS / HORSE ═══════════════════════════
PA.growlithe = p => {
  const o = '#f28a3c', oD = '#cf6a22', cream = '#f8ecc6', creamD = '#ddcfa4', bk = '#2a2228';
  const sw = p.f ? 1 : 0;
  p.part(q => { q.ell(50, 37 - sw, 7, 8.5, cream, { rot: 25, k: 1.7 }); q.within(r => { for (let i = 0; i < 4; i++) r.line([[45 + i * 2, 45 - i * 2], [53 + i * 2, 32 - i * 2]], 0.5, creamD); }); });
  p.part(q => { legP(q, 44, 47, 46, 57, 3.2, 2.2, oD); legP(q, 33, 48, 32, 57, 3.2, 2.2, oD); });
  p.part(q => { pawP(q, 46, 59, 3.4, oD); pawP(q, 32, 59, 3.4, oD); });
  p.part(q => {
    q.ball(37, 44, 12.5, 9, o, { hl: 0.9 });
    q.within(r => { r.fpoly([[33, 35], [35.4, 35], [37.4, 43], [35, 43]], bk); r.fpoly([[40, 35], [42.4, 35], [44.4, 43], [42, 43]], bk); r.fpoly([[46, 37], [48.4, 37], [49.4, 44], [47, 44]], bk); });
  });
  p.part(q => { legP(q, 41, 48, 43, 58, 3.4, 2.4, o); legP(q, 28, 49, 27, 58, 3.4, 2.4, o); });
  p.part(q => { pawP(q, 43, 60, 3.8, cream, creamD); pawP(q, 27, 60, 3.8, cream, creamD); });
  p.part(q => ruffP(q, 27, 43, 8, 7.5, cream, creamD, 5));
  p.part(q => {
    q.poly([[17, 20], [14, 8], [24, 16]], o, { k: 1.4 });
    q.poly([[29, 17], [36, 7], [34, 20]], o, { k: 1.4 });
    q.ball(24, 28, 10.5, 9.5, o, { hl: 1.1 });
    q.ell(25, 18, 7.5, 4.2, cream, { k: 1.2 });
    q.ell(14, 32, 6.5, 4.2, cream, { k: 1.2 });
    if (!q.back) {
      q.eye(19, 27, 2.2, 2.8, { iris: '#5a2a1a' }); q.eye(28, 27, 2, 2.6, { iris: '#5a2a1a' });
      q.dot(9, 31, INK, 1.5); q.line([[11, 35], [14, 36], [17, 35]], 0.5, '#6a3a1e');
    }
  });
  void sw;
};

PA.arcanine = p => {
  const o = '#f2863a', oD = '#cd6520', cream = '#f8e8be', creamD = '#dccda0', bk = '#2a2228';
  const sw = p.f ? 1 : 0;
  // big plume of a tail
  p.part(q => {
    q.stroke([[50, 32], [58, 25 - sw], [62, 16 - sw]], 6, 3.4, cream, { k: 1.8 });
    q.within(r => { for (let i = 0; i < 4; i++) r.line([[50 + i * 3, 30 - i * 2], [57 + i * 2, 20 - i * 3]], 0.5, creamD); });
  });
  p.part(q => { legP(q, 50, 43, 53, 58, 3.4, 2.4, oD); legP(q, 39, 45, 38, 58, 3.4, 2.4, oD); });
  p.part(q => { pawP(q, 53, 60, 3.6, creamD); pawP(q, 38, 60, 3.6, creamD); });
  p.part(q => {
    q.ball(42, 38, 15, 10, o, { hl: 0.9 });
    q.within(r => { for (const x of [34, 40, 46, 52]) r.stroke([[x, 29], [x + 2, 35], [x, 41]], 1, 0.6, bk, { flat: true }); });
  });
  p.part(q => { legP(q, 46, 44, 49, 59, 3.6, 2.6, o); legP(q, 34, 46, 33, 59, 3.6, 2.6, o); });
  p.part(q => { pawP(q, 49, 61, 4, cream, creamD); pawP(q, 33, 61, 4, cream, creamD); });
  p.part(q => ruffP(q, 28, 36, 11.5, 12, cream, creamD, 6));
  p.part(q => {
    q.poly([[14, 10], [16, 1], [23, 8]], o, { k: 1.4 }); q.poly([[26, 8], [33, 1], [33, 12]], o, { k: 1.4 });
    q.ball(22, 18, 10, 8.5, o, { hl: 1.1 });
    q.ell(26, 10, 7.5, 4, cream, { k: 1.2 });
    q.ell(12, 22, 7, 4.2, cream, { k: 1.2 });
    if (!q.back) {
      q.eye(17, 16, 2, 2.2, { iris: '#5a2a1a' }); q.eye(26, 16, 1.8, 2, { iris: '#5a2a1a' });
      q.line([[14, 13.5], [19, 14.5]], 0.6, '#8a3a18'); q.dot(6, 20, INK, 1.5);
      q.line([[8, 24], [12, 25], [17, 24]], 0.5, '#6a3a1e'); fang(q, 10, 25, 1.4);
    }
  });
};

PA.ponyta = p => {
  const c = '#faf2d6', cD = '#ddd2ae', hoof = '#8a8a9a';
  const f = p.f ? 1 : 0;
  const fl = (x, y, s, t) => flame(p, x, y, s, t);
  // tail of fire
  fl(50, 32, 3.4, 3); fl(54, 37, 3.8, 4); fl(52, 42, 3.2, 4);
  p.part(q => { legP(q, 44, 44, 47, 56, 3, 1.9, cD); legP(q, 34, 45, 33, 56, 3, 1.9, cD); });
  p.part(q => { q.ell(47, 58, 2.6, 2, hoof, { k: 1.2 }); q.ell(33, 58, 2.6, 2, hoof, { k: 1.2 }); });
  p.part(q => q.ball(38, 41, 14, 9.5, c, { hl: 1 }));
  p.part(q => { legP(q, 41, 45, 44, 58, 3.2, 2, c); legP(q, 30, 46, 29, 58, 3.2, 2, c); });
  p.part(q => { q.ell(44, 60, 2.8, 2.1, hoof, { k: 1.2 }); q.ell(29, 60, 2.8, 2.1, hoof, { k: 1.2 }); });
  // mane running down the neck
  fl(33, 30, 3.4, -1); fl(30, 24, 3.2, -2); fl(27, 18, 2.8, -3);
  p.part(q => {
    q.stroke([[30, 40], [25, 29], [22, 22]], 4.4, 3.4, c, { k: 1.6 });
    q.poly([[19, 12], [21, 4], [25, 13]], c, { k: 1.2 });
    q.ball(19, 19, 7, 6.2, c, { hl: 1.1 });
    q.ell(12, 23, 6, 4.2, c, { k: 1.2 });
    if (!q.back) { q.eye(17, 18, 1.9, 2.3, { iris: '#b83a2a' }); q.dot(8, 23, '#9a7a7a'); q.line([[9, 26], [13, 27]], 0.5, '#c8b898'); }
  });
  fl(23, 13, 2.6, -3);
  void f;
};

// ═══════════════════════════════ BIG GUYS ═══════════════════════════════════
PA.snorlax = p => {
  const b = '#3a6272', cream = '#f2e2c2';
  const f = p.f ? 1 : 0;
  p.part(q => { q.ball(18, 58, 8, 5, cream); q.ball(46, 58, 8, 5, cream); q.within(r => { r.dot(13, 57, '#b8a888'); r.dot(16, 55, '#b8a888'); r.dot(41, 57, '#b8a888'); r.dot(44, 55, '#b8a888'); }); });
  p.part(q => {
    q.ball(32, 40 - f * 0.5, 26, 22 + f * 0.5, b);
    if (!q.back) q.within(r => r.ball(32, 45, 19, 16 + f * 0.5, cream, { hl: false }));
  });
  p.part(q => { q.ell(8, 42, 5, 9, b, { rot: 20 }); q.ell(56, 42, 5, 9, b, { rot: -20 }); q.within(r => { r.dot(5, 50, WHITE); r.dot(58, 50, WHITE); }); });
  p.part(q => {
    q.poly([[18, 10], [20, 2], [25, 8]], b); q.poly([[39, 8], [44, 2], [46, 10]], b);
    q.ball(32, 16, 15, 11, b);
    if (!q.back) {
      q.within(r => r.ball(32, 19, 11, 8, cream, { hl: false }));
      q.line([[24, 17], [30, 17]], 0.6, INK); q.line([[35, 17], [41, 17]], 0.6, INK);
      q.line([[27, 23], [32, 23.5], [37, 23]], 0.5, '#6a5a44'); fang(q, 28, 23, 1.2); fang(q, 36, 23, 1.2);
    }
  });
};

PA.hooh = p => {
  const red = '#e2442e', gold = '#f8c63a', green = '#48b25a', wh = '#f8f2e2', dk = '#8a2418';
  const f = p.f ? 3 : 0;
  // tail plumes
  p.part(q => { q.stroke([[40, 50], [52, 58], [62, 60]], 3, 1.2, gold); q.stroke([[38, 52], [46, 60], [54, 63]], 2.6, 1, green); q.stroke([[42, 48], [56, 52], [63, 50]], 2.4, 1, wh); });
  // far wing
  p.part(q => {
    q.poly([[36, 26], [46, 8 - f], [58, 0 - f], [64, 4 - f], [62, 12 - f], [60, 18 - f], [56, 24], [48, 30]], red);
    q.within(r => { r.fpoly([[54, 4 - f], [64, 4 - f], [62, 12 - f], [58, 18 - f], [52, 14 - f]], gold); r.fpoly([[60, 12 - f], [64, 8 - f], [63, 14 - f]], green); r.line([[44, 20 - f * 0.5], [58, 8 - f]], 0.5, dk); r.line([[48, 24], [60, 14 - f]], 0.5, dk); });
  });
  // body
  p.part(q => { q.ball(34, 38, 11, 14, red); if (!q.back) q.within(r => r.ball(31, 42, 7, 10, wh, { hl: false })); });
  p.part(q => { q.stroke([[30, 50], [28, 58]], 1.2, 1, gold); q.stroke([[36, 50], [37, 58]], 1.2, 1, gold); q.line([[24, 59], [31, 59]], 0.6, gold); q.line([[34, 59], [40, 59]], 0.6, gold); });
  // near wing
  p.part(q => {
    q.poly([[28, 30], [16, 8 - f], [4, 0 - f], [0, 6 - f], [2, 14 - f], [4, 22 - f], [10, 28], [20, 36]], red);
    q.within(r => { r.fpoly([[8, 2 - f], [0, 6 - f], [2, 14 - f], [6, 20 - f], [12, 14 - f]], gold); r.fpoly([[0, 8 - f], [3, 16 - f], [1, 14 - f]], green); r.line([[22, 26 - f * 0.5], [6, 8 - f]], 0.5, dk); r.line([[18, 30], [4, 16 - f]], 0.5, dk); r.line([[24, 34], [8, 24 - f * 0.5]], 0.5, dk); });
  });
  // neck/head/crest
  p.part(q => {
    q.stroke([[36, 16], [42, 6], [48, 2]], 1.8, 0.8, gold); q.stroke([[34, 16], [38, 4], [42, -1]], 1.6, 0.8, gold);
    q.stroke([[32, 28], [28, 20]], 4.5, 4, red);
    q.ball(28, 17, 7, 6, red);
    if (!q.back) {
      q.within(r => r.fpoly([[22, 18], [30, 20], [26, 24]], wh));
      q.poly([[16, 18], [23, 15], [23, 20]], gold);
      q.eye(25, 15.5, 1.6, 1.8, { iris: '#e0a020' });
      q.line([[22, 13], [28, 14]], 0.5, dk);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  Rendering + caching
// ─────────────────────────────────────────────────────────────────────────────
const PokeArt = (() => {
  const cache = new Map();
  function breathe(r) {
    // shift rows above the sprite's middle down by one pixel → gentle "inhale"
    const bb = r.bbox();
    if (bb.y1 < 0) return r;
    const split = Math.round(bb.y0 + (bb.y1 - bb.y0) * 0.55);
    const out = new Raster(r.w, r.h);
    out.px.set(r.px);
    for (let y = split; y > 0; y--) for (let x = 0; x < r.w; x++) out.px[y * r.w + x] = r.px[(y - 1) * r.w + x];
    for (let x = 0; x < r.w; x++) out.px[x] = 0;
    return out;
  }
  function render(id, { back = false, frame = 0, icon = false } = {}) {
    const key = id + (back ? 'B' : 'F') + frame + (icon ? 'i' : '');
    if (cache.has(key)) return cache.get(key);
    const fn = PA[id] || PA.pikachu;
    const size = icon ? 32 : back ? 80 : 64;
    const s = icon ? 0.5 : back ? 1.25 : 1;
    const p = new Painter(size, size, s);
    p.back = back; p.f = frame;
    try { fn(p); } catch (e) { console.error('art', id, e); }
    let r = p.finish();
    if (frame === 1 && !icon) r = breathe(r);
    if (back) r.flipH();
    const c = r.toCanvas();
    const bb = r.bbox();
    c.bb = bb;
    cache.set(key, c);
    return c;
  }
  const shinyCache = new Map();
  function get(id, opts = {}) {
    const c = render(id, opts);
    if (!opts.shiny) return c;
    const key = id + JSON.stringify(opts);
    if (!shinyCache.has(key)) { const sc = hueCanvas(c, SHINY_HUE[id] != null ? SHINY_HUE[id] : 150, 0.02, 0.02); sc.bb = c.bb; shinyCache.set(key, sc); }
    return shinyCache.get(key);
  }
  return { get, render };
})();
const SHINY_HUE = { charizard: 180, gyarados: -120, pikachu: 25, umbreon: 160, gengar: 60, hooh: 40, magikarp: 30, eevee: 180, snorlax: 40, tyranitar: 60 };
