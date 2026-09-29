'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  World tiles & buildings, painted procedurally into per-map layers:
//  ground (4 animation frames), overhead (canopies drawn above characters).
//  Base colours are finished by a per-pixel pass (seamless noise, water depth).
// ─────────────────────────────────────────────────────────────────────────────
const PAL = {
  g0: '#8ed36c', g1: '#6dba55', g2: '#abe488', g3: '#58a446', g4: '#c9f2a6', gD: '#86cb65', gB: '#97d974',
  p0: '#e8d29c', p1: '#d0b67e', p2: '#f5e6bf', p3: '#ad8f5e', pD: '#dfc68e', pB: '#efdcac',
  s0: '#f2e0ac', s1: '#dcc48a', s2: '#fcf3d6', sD: '#e9d59e', sW: '#dcc592', sW2: '#c9af7c',
  t0: '#4ca84e', t1: '#2f7c3a', t2: '#78c862', t3: '#2d7036',
  w0: '#4a9cf0', w1: '#9ad8fc', w2: '#2f78d2', w3: '#eefaff', w4: '#2a62b4',
  WD: ['#6cc0f7', '#58aef2', '#4a9fea', '#3f90e0', '#3584d6'],
  trunk: '#8a5a34', trunk2: '#5e3a20',
  c0: '#b88c62', c1: '#8e6644', c2: '#d6ae80', c3: '#6a4a30', cD: '#aa7f57', cB: '#c49a6e',
  sn0: '#eef4fc', sn1: '#d2def0', sn2: '#ffffff', sn3: '#b4c4de', snD: '#e1eaf7',
  sp0: '#dbe5f3', sp1: '#c3d1e7', spD: '#d2ddef',
  a0: '#8c7c72', a1: '#6c5c56', a2: '#a8988a', a3: '#e86a2a', aD: '#83736a', aB: '#968679',
  cv0: '#b89470', cv1: '#94724e', cv2: '#d0ae88', cvD: '#ab8864', cvB: '#c4a07c',
  cvw: '#6c5040', cvw2: '#4a3428', cvw3: '#8c6c54', cvT: '#5a4234', cvTD: '#4e382c', cvF: '#86664c', cvFD: '#76583f',
  x0: '#e2e8f8', x1: '#c4cce8', x2: '#ffffff',
  // rock markers (replaced by the cellular rock texture in the finishing pass)
  rkG: '#b88c61', rkS: '#9aa6bb', rkA: '#6c5a51', rkC: '#86664b', rkT: '#5a4233',
  hdT: '#4aa54f', hdF: '#2f8039',
};
const ROCKPAL = {
  rkG: ['#5e4028', '#8a6442', '#a87e56', '#c49a6c', '#dcb888'],
  rkS: ['#4e5872', '#74809c', '#929eb6', '#b2bccf', '#d4dbe8'],
  rkA: ['#2c2220', '#4a3c36', '#62524a', '#7a6a60', '#96867a'],
  rkC: ['#3a2820', '#5e4432', '#76583f', '#8e6e52', '#a88a6a'],
  rkT: ['#2e2018', '#46342a', '#523c30', '#5e4638', '#6c5444'],
  hdT: ['#236a32', '#3a9446', '#4aa852', '#62bc5e', '#86d274'],
  hdF: ['#154a22', '#22602e', '#2c7036', '#387e40', '#4a924c'],
};
const TSOLID = {
  out: new Set('TPbr#FslL~CoXVkyiIj'.split('')),
  in: new Set('WOnBtdpQ$KYGhq~ACJL'.split('')),
};
const WALKABLE_LEDGE = 'v';

function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return map.border || 'T';
  return map.grid[y][x];
}
// smooth value noise in world space (seamless across tiles)
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s = 0) { return vnoise(x, y, s) * 0.62 + vnoise(x * 2.3, y * 2.3, s + 17) * 0.28 + vnoise(x * 5.1, y * 5.1, s + 31) * 0.1; }
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER4[((y & 3) << 2) | (x & 3)];
// cellular "rock chunk" texture: returns 0 (crack) .. 4 (highlight), lit from the top-left
function rockTone(x, y, sx, sy, seed) {
  const fx = x / sx, fy = y / sy, gx = Math.floor(fx), gy = Math.floor(fy);
  let d1 = 9, d2 = 9, ox = 0, oy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i + 0.15 + hash2(gx + i, gy + j, seed) * 0.7, cy = gy + j + 0.15 + hash2(gx + i, gy + j, seed + 1) * 0.7;
    const dx = fx - cx, dy = fy - cy, d = dx * dx + dy * dy;
    if (d < d1) { d2 = d1; d1 = d; ox = dx; oy = dy; } else if (d < d2) d2 = d;
  }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  if (edge < 0.09) return 0;
  const lit = -(ox * 0.7 + oy * 0.9) + (bayer(x, y) - 0.5) * 0.22;
  if (edge < 0.2 && lit < 0) return 1;
  return lit > 0.28 ? 4 : lit > 0.08 ? 3 : lit > -0.2 ? 2 : 1;
}

const Tiles = (() => {
  let C; // current ctx
  const px = (x, y, col) => { C.fillStyle = col; C.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { C.fillStyle = col; C.fillRect(x, y, w, h); };
  const H = (x, y, s) => hash2(x, y, s);
  // crisp pixel ellipse (used for soft ground shadows)
  function ellRows(cx, cy, rx, ry, col) {
    C.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
      if (w > 0) C.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1);
    }
  }
  const shadowAt = (cx, cy, rx, ry, a = 0.22) => ellRows(cx, cy, rx, ry, `rgba(16,40,24,${a})`);

  const isPath = ch => ch === ':' || ch === '=' || ch === 'w' || ch === 'e';
  const isWater = ch => ch === '~';
  const isTall = ch => ch === '"' || ch === '^';
  const isSnow = ch => ch === '*' || ch === '^' || ch === 'P';
  const isGrassy = ch => '.,"fTbrslvFy'.includes(ch);
  const waterish = ch => ch === '~' || ch === 'w' || ch === '=';

  // ── per-pixel finishing pass ──
  const PK = h => Col.pack(h);
  const POST = new Map();
  function defPost(base, fn) { POST.set(PK(base), fn); }
  const P2 = {};
  for (const k of Object.keys(PAL)) if (typeof PAL[k] === 'string') P2[k] = PK(PAL[k]);
  const WDK = PAL.WD.map(PK);
  defPost(PAL.g0, (x, y) => {
    const n = fbm(x / 38, y / 38, 3), b = bayer(x, y) * 0.07;
    if (n > 0.6 + b) return P2.gD;
    if (n < 0.33 - b) return P2.gB;
    return 0;
  });
  defPost(PAL.p0, (x, y) => {
    const n = fbm(x / 11, y / 11, 5), b = bayer(x, y) * 0.09;
    if (n > 0.63 + b) return P2.pD;
    if (n < 0.31 - b) return P2.pB;
    return 0;
  });
  defPost(PAL.s0, (x, y) => {
    const n = fbm(x / 26, y / 26, 8);
    const r = (((y + n * 16 + Math.sin(x * 0.21 + n * 5) * 1.6) % 7) + 7) % 7;
    if (r < 1 && bayer(x, y) < 0.8) return P2.sD;
    if (n > 0.68 && bayer(x, y) < 0.5) return P2.sD;
    return 0;
  });
  defPost(PAL.sn0, (x, y) => {
    const n = fbm(x / 30, y / 18, 11), b = bayer(x, y) * 0.08;
    if (n > 0.6 + b) return P2.snD;
    if (hash2(x, y, 77) < 0.006) return P2.sn2;
    return 0;
  });
  defPost(PAL.sp0, (x, y) => { const n = fbm(x / 9, y / 9, 12), b = bayer(x, y) * 0.1; return n > 0.62 + b ? P2.spD : 0; });
  defPost(PAL.a0, (x, y) => {
    const n = fbm(x / 16, y / 16, 14), b = bayer(x, y) * 0.08;
    if (n > 0.62 + b) return P2.aD;
    if (n < 0.32 - b) return P2.aB;
    return 0;
  });
  defPost(PAL.cv0, (x, y) => {
    const n = fbm(x / 15, y / 15, 13), b = bayer(x, y) * 0.08;
    if (n > 0.62 + b) return P2.cvD;
    if (n < 0.32 - b) return P2.cvB;
    return 0;
  });
  for (const [k, sx, sy, seed] of [['rkG', 7, 6, 51], ['rkS', 7, 6, 53], ['rkA', 7, 6, 55], ['rkC', 6, 5, 57], ['rkT', 5, 5, 59], ['hdT', 4, 3, 61], ['hdF', 3, 5, 63]]) {
    const pal = ROCKPAL[k].map(PK);
    defPost(PAL[k], (x, y) => pal[rockTone(x, y, sx, sy, seed)]);
  }
  defPost(PAL.w0, (x, y, map) => {
    const D = map._depth; if (!D) return WDK[2];
    const fx = x / 16 - 0.5, fy = y / 16 - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    const g = (i, j) => Math.min(4, D[clamp(j, 0, map.h - 1) * map.w + clamp(i, 0, map.w - 1)]);
    const d = lerp(lerp(g(x0, y0), g(x0 + 1, y0), ax), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), ax), ay);
    const v = d * 1.25 - 0.55 + (bayer(x, y) - 0.5) * 0.9 + (fbm(x / 20, y / 20, 41) - 0.5) * 0.8;
    return WDK[clamp(Math.floor(v), 0, 4)];
  });
  function postPass(ctx, map, w, h, pad) {
    const id = ctx.getImageData(0, 0, w, h);
    const d = new Uint32Array(id.data.buffer);
    for (let y = 0; y < h; y++) {
      const wy = y - pad;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, fn = POST.get(d[i]);
        if (fn) { const v = fn(x, wy, map); if (v) d[i] = v; }
      }
    }
    ctx.putImageData(id, 0, 0);
  }
  function depthField(map) {
    const { w, h, grid } = map;
    let any = false;
    const D = new Float32Array(w * h).fill(99), q = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!waterish(grid[y][x])) { D[y * w + x] = 0; q.push(y * w + x); } else any = true; }
    if (!any) return null;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (D[j] > D[i] + 1) { D[j] = D[i] + 1; q.push(j); }
      }
    }
    return D;
  }

  // ── small stamps ──
  function tuft(x, y, k, dk = PAL.g1, lt = PAL.g2) {
    if (k === 0) { px(x + 2, y, lt); px(x, y + 1, lt); px(x + 2, y + 1, dk); px(x + 4, y + 1, lt); px(x + 1, y + 2, dk); px(x + 2, y + 2, dk); px(x + 3, y + 2, dk); }
    else if (k === 1) { px(x, y, lt); px(x + 2, y, lt); px(x + 1, y + 1, dk); px(x, y + 1, dk); }
    else { px(x + 1, y, lt); px(x, y + 1, lt); px(x + 1, y + 1, dk); px(x + 3, y + 1, lt); px(x + 1, y + 2, dk); px(x + 2, y + 2, dk); px(x + 3, y + 2, dk); }
  }
  function daisy(x, y, pet = '#ffffff', cen = '#f8d048') { px(x, y - 1, pet); px(x - 1, y, pet); px(x + 1, y, pet); px(x, y + 1, pet); px(x, y, cen); }

  // ── ground paints ──
  function grass(ox, oy, tx, ty, alt) {
    rect(ox, oy, 16, 16, PAL.g0);
    const n = alt ? 4 : (H(tx, ty, 1) < 0.5 ? 2 : 3);
    for (let i = 0; i < n; i++) tuft(ox + 1 + Math.floor(H(tx, ty, i * 7) * 11), oy + 1 + Math.floor(H(tx, ty, i * 7 + 3) * 12), Math.floor(H(tx, ty, i * 7 + 5) * 3));
    if (alt) {
      const x = ox + 3 + Math.floor(H(tx, ty, 96) * 10), y = oy + 3 + Math.floor(H(tx, ty, 97) * 10);
      daisy(x, y, H(tx, ty, 98) < 0.5 ? '#ffffff' : '#fff4a0', H(tx, ty, 98) < 0.5 ? '#f8c838' : '#f89838');
      if (H(tx, ty, 99) < 0.5) px(x + 5 - Math.floor(H(tx, ty, 94) * 10), y + 4, '#f87890');
    } else if (H(tx, ty, 91) < 0.07) {
      const x = ox + 4 + Math.floor(H(tx, ty, 92) * 8), y = oy + 4 + Math.floor(H(tx, ty, 93) * 8);
      px(x, y, '#ffffff'); px(x + 1, y, '#f8e070');
    }
  }
  function sand(map, ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, PAL.s0);
    if (H(tx, ty, 3) < 0.25) { const x = ox + 3 + Math.floor(H(tx, ty, 4) * 10), y = oy + 3 + Math.floor(H(tx, ty, 5) * 10); px(x, y, PAL.s1); px(x + 1, y, PAL.s2); px(x, y - 1, PAL.s2); }
    if (H(tx, ty, 6) < 0.06) { const x = ox + 4 + Math.floor(H(tx, ty, 7) * 8), y = oy + 4 + Math.floor(H(tx, ty, 8) * 8); px(x, y, '#f8b8a8'); px(x + 1, y, '#f8d0c0'); px(x, y + 1, '#e89888'); px(x + 1, y + 1, '#f8b8a8'); }
    if (map) {
      const grassy = ch => '.,"fvbrsTlF'.includes(ch) && (map.baseTile || '.') === '.';
      if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => grassy(tileAt(map, tx + dx, ty + dy))))
        patchEdges(map, ox, oy, tx, ty, ch => !grassy(ch), PAL.g0, PAL.sW2, PAL.s1, PAL.g1);
    }
    // wet sand where it meets water
    if (map) {
      const wtr = (dx, dy) => isWater(tileAt(map, tx + dx, ty + dy));
      if (wtr(0, 1)) { rect(ox, oy + 12, 16, 4, PAL.sW); rect(ox, oy + 11, 16, 1, PAL.sD); for (let i = 0; i < 16; i++) if (H(tx * 16 + i, ty, 41) < 0.3) px(ox + i, oy + 11, PAL.sW); rect(ox, oy + 15, 16, 1, PAL.sW2); }
      if (wtr(0, -1)) { rect(ox, oy, 16, 3, PAL.sW); rect(ox, oy, 16, 1, PAL.sW2); }
      if (wtr(-1, 0)) { rect(ox, oy, 3, 16, PAL.sW); rect(ox, oy, 1, 16, PAL.sW2); }
      if (wtr(1, 0)) { rect(ox + 13, oy, 3, 16, PAL.sW); rect(ox + 15, oy, 1, 16, PAL.sW2); }
    }
  }
  function snow(ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, PAL.sn0);
    if (H(tx, ty, 2) < 0.5) { const x = ox + 1 + Math.floor(H(tx, ty, 3) * 10), y = oy + 2 + Math.floor(H(tx, ty, 4) * 12); rect(x, y, 4, 1, PAL.sn1); rect(x + 1, y - 1, 3, 1, PAL.sn2); }
    if (H(tx, ty, 5) < 0.1) { const x = ox + 4 + Math.floor(H(tx, ty, 6) * 8), y = oy + 4 + Math.floor(H(tx, ty, 7) * 8); px(x, y, '#6a7a90'); px(x + 1, y, '#8a9ab0'); px(x, y - 1, PAL.sn2); }
  }
  function ash(ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, PAL.a0);
    for (let i = 0; i < 3; i++) px(ox + Math.floor(H(tx, ty, i) * 16), oy + Math.floor(H(tx, ty, i + 9) * 16), i % 2 ? PAL.a1 : PAL.a2);
    if (H(tx, ty, 77) < 0.12) { const x = ox + 4 + Math.floor(H(tx, ty, 78) * 8), y = oy + 4 + Math.floor(H(tx, ty, 79) * 8); px(x, y, PAL.a3); px(x + 1, y, '#f8b040'); px(x, y + 1, '#8a3a1a'); }
  }
  function base(map, ox, oy, tx, ty) {
    const b = map.baseTile || '.';
    if (b === '*') snow(ox, oy, tx, ty);
    else if (b === 'a') ash(ox, oy, tx, ty);
    else if (b === ';') sand(null, ox, oy, tx, ty);
    else if (b === 'c') caveFloor(ox, oy, tx, ty);
    else if (b === 'x') crystalFloor(ox, oy, tx, ty, 0);
    else grass(ox, oy, tx, ty, false);
  }
  const baseCol = map => { const b = map.baseTile || '.'; return b === '*' ? PAL.sn0 : b === 'a' ? PAL.a0 : b === ';' ? PAL.s0 : b === 'c' ? PAL.cv0 : PAL.g0; };
  // soft organic edge between a "patch" tile and its surroundings.
  // lo = rim colour on the lit (bottom/right) sides, hi = shadowed (top/left) rim
  function patchEdges(map, ox, oy, tx, ty, same, fillCol, shadowRim, litRim, blade) {
    const n = { u: same(tileAt(map, tx, ty - 1)), d: same(tileAt(map, tx, ty + 1)), l: same(tileAt(map, tx - 1, ty)), r: same(tileAt(map, tx + 1, ty)) };
    const wob = (u, v, s) => (vnoise(u / 3.2, v, s) < 0.5 ? 1 : 2);
    for (let i = 0; i < 16; i++) {
      const a = wob(tx * 16 + i, ty * 7, 5), b = wob(tx * 16 + i, ty * 7 + 3, 5);
      const c = wob(ty * 16 + i, tx * 7, 6), e = wob(ty * 16 + i, tx * 7 + 3, 6);
      if (!n.u) { rect(ox + i, oy, 1, a, fillCol); px(ox + i, oy + a, shadowRim); }
      if (!n.d) { rect(ox + i, oy + 16 - b, 1, b, fillCol); px(ox + i, oy + 15 - b, litRim); }
      if (!n.l) { rect(ox, oy + i, c, 1, fillCol); px(ox + c, oy + i, shadowRim); }
      if (!n.r) { rect(ox + 16 - e, oy + i, e, 1, fillCol); px(ox + 15 - e, oy + i, litRim); }
    }
    // blades of grass leaning over the edge
    if (blade) {
      for (let i = 1; i < 15; i += 3) {
        if (!n.u && H(tx * 16 + i, ty, 8) < 0.5) { px(ox + i, oy + 2, blade); px(ox + i, oy + 3, shadowRim); }
        if (!n.l && H(tx, ty * 16 + i, 9) < 0.4) { px(ox + 2, oy + i, blade); }
        if (!n.r && H(tx + 1, ty * 16 + i, 9) < 0.4) { px(ox + 13, oy + i, blade); }
        if (!n.d && H(tx * 16 + i, ty + 1, 8) < 0.4) { px(ox + i, oy + 13, blade); }
      }
    }
    const corner = (cx, cy, sx, sy, rim) => { rect(cx, cy, 2, 2, fillCol); px(cx + (sx > 0 ? 2 : -1), cy + (sy > 0 ? 0 : 1), rim); px(cx + (sx > 0 ? 0 : 1), cy + (sy > 0 ? 2 : -1), rim); px(cx + (sx > 0 ? 1 : 0), cy + (sy > 0 ? 1 : 0), fillCol); };
    if (!n.u && !n.l) corner(ox, oy, 1, 1, shadowRim);
    if (!n.u && !n.r) corner(ox + 14, oy, -1, 1, shadowRim);
    if (!n.d && !n.l) corner(ox, oy + 14, 1, -1, litRim);
    if (!n.d && !n.r) corner(ox + 14, oy + 14, -1, -1, litRim);
    // inner corners: a nibble of surrounding ground
    const diag = (dx, dy) => same(tileAt(map, tx + dx, ty + dy));
    if (n.u && n.l && !diag(-1, -1)) { px(ox, oy, fillCol); px(ox + 1, oy, shadowRim); px(ox, oy + 1, shadowRim); }
    if (n.u && n.r && !diag(1, -1)) { px(ox + 15, oy, fillCol); px(ox + 14, oy, shadowRim); px(ox + 15, oy + 1, litRim); }
    if (n.d && n.l && !diag(-1, 1)) { px(ox, oy + 15, fillCol); px(ox + 1, oy + 15, litRim); px(ox, oy + 14, shadowRim); }
    if (n.d && n.r && !diag(1, 1)) { px(ox + 15, oy + 15, fillCol); px(ox + 14, oy + 15, litRim); px(ox + 15, oy + 14, litRim); }
  }
  const pathLike = ch => isPath(ch) || ch === 'D' || ch === 'M';
  function path(map, ox, oy, tx, ty) {
    const bt = map.baseTile || '.';
    if (bt === '*') return snowPath(map, ox, oy, tx, ty);
    if (bt === 'a') return cobble(map, ox, oy, tx, ty);
    rect(ox, oy, 16, 16, PAL.p0);
    for (let i = 0; i < 3; i++) if (H(tx, ty, 11 + i) < 0.4) {
      const x = ox + 2 + Math.floor(H(tx, ty, 21 + i) * 12), y = oy + 2 + Math.floor(H(tx, ty, 31 + i) * 12);
      if (i === 0) { px(x, y, PAL.p3); px(x + 1, y, PAL.p1); px(x, y - 1, PAL.p2); px(x + 1, y - 1, PAL.p2); }
      else { px(x, y, PAL.p1); px(x, y - 1, PAL.p2); }
    }
    const fillCol = bt === ';' ? PAL.s0 : PAL.g0;
    patchEdges(map, ox, oy, tx, ty, pathLike, fillCol, PAL.p3, PAL.p1, bt === ';' ? null : PAL.g1);
  }
  function snowPath(map, ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, PAL.sp0);
    // footprints
    for (let i = 0; i < 2; i++) if (H(tx, ty, 50 + i) < 0.55) { const x = ox + 3 + Math.floor(H(tx, ty, 52 + i) * 9), y = oy + 2 + i * 7 + Math.floor(H(tx, ty, 54 + i) * 4); rect(x, y, 2, 3, PAL.sp1); rect(x + 3, y + 2, 2, 3, PAL.sp1); }
    patchEdges(map, ox, oy, tx, ty, pathLike, PAL.sn0, PAL.sn3, PAL.sn2, null);
  }
  function cobble(map, ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, '#6e625c');
    for (let row = 0; row < 4; row++) {
      let x = -((row * 3 + tx * 5) % 5);
      while (x < 16) {
        const w = 4 + Math.floor(H(tx * 16 + x, ty * 4 + row, 61) * 3);
        const x0 = Math.max(0, x), x1 = Math.min(16, x + w - 1);
        if (x1 > x0) {
          const y = oy + row * 4, tone = H(tx * 16 + x, ty * 4 + row, 62);
          const c = tone < 0.33 ? '#a4968c' : tone < 0.66 ? '#9a8c84' : '#ae9f94';
          rect(ox + x0, y, x1 - x0, 3, c); rect(ox + x0, y, x1 - x0, 1, Col.light(c, 0.6)); rect(ox + x0, y + 2, x1 - x0, 1, Col.shade(c, 0.5));
        }
        x += w;
      }
    }
    patchEdges(map, ox, oy, tx, ty, pathLike, PAL.a0, '#5a4e48', '#a89a90', null);
  }

  // ── tall grass: two staggered rows of pointed blades, gently swaying ──
  const TG = {
    g: { O: '#1d5a2b', D: '#2d7838', M: '#43a047', L: '#62bb56', W: '#94da74' },
    s: { O: '#27544f', D: '#3a7670', M: '#529c90', L: '#74bcac', W: '#eef9fb' },
  };
  function blade(g, x, tipY, h, pal, sway) {
    const P = (xx, yy, col) => { if (xx >= 0 && xx < 16) { g.fillStyle = col; g.fillRect(xx, yy, 1, 1); } };
    for (let i = 0; i < h; i++) {
      const y = tipY + i, hw = i < 1 ? 0 : i < 3 ? 1 : 2, sx = sway && i < 3 ? 1 : 0;
      const low = i >= 5;
      for (let dx = -hw; dx <= hw; dx++) P(x + dx + sx, y, i === 0 ? pal.W : dx < 0 ? (low ? pal.M : pal.L) : dx === 0 ? (i < 3 ? pal.L : low ? pal.D : pal.M) : (low ? pal.D : pal.M));
      P(x - hw - 1 + sx, y, pal.O); P(x + hw + 1 + sx, y, pal.O);
    }
    P(x + (sway ? 1 : 0), tipY - 1, pal.O);
  }
  const tallCache = {};
  // rows: 0 = back row (tips at y=0), 1 = front row (tips at y=7). Canvas is 16×20; tile body starts at y=4.
  function tallSprite(snowy, sway, only) {
    const key = (snowy ? 's' : 'g') + sway + (only == null ? '' : only);
    if (tallCache[key]) return tallCache[key];
    const c = mkCanvas(16, 20), g = c.ctx, pal = snowy ? TG.s : TG.g;
    const rows = [[4, [1, 5, 9, 13]], [11, [3, 7, 11, 15]]];
    rows.forEach(([tip, xs], ri) => {
      if (only != null && only !== ri) return;
      for (const x of [...xs, xs[0] - 4, xs[0] + 16]) blade(g, x, tip, ri ? 9 : 8, pal, sway && ((x >> 2) + ri) % 2 === 0);
    });
    tallCache[key] = c;
    return c;
  }
  function tallGrass(map, ox, oy, tx, ty, snowy, fr) {
    rect(ox, oy, 16, 16, (snowy ? TG.s : TG.g).D);
    const sway = ((fr + tx + (ty >> 1)) & 3) === 1 ? 1 : 0;
    C.drawImage(tallSprite(snowy, sway), 0, 4, 16, 16, ox, oy, 16, 16);
    if (!isTall(tileAt(map, tx, ty - 1))) C.drawImage(tallSprite(snowy, 0), 0, 0, 16, 4, ox, oy - 4, 16, 4);
  }

  // ── flowers: little bobbing blooms ──
  const FLOWERS = [['#f85060', '#fce070', '#b82838'], ['#f8e048', '#f89020', '#c8a018'], ['#fafaff', '#f8c838', '#b8c0d8'], ['#f890c8', '#fff0f8', '#c05890']];
  function bloom(x, y, pet, cen, dk) {
    px(x + 1, y, pet); px(x + 2, y, pet);
    px(x, y + 1, pet); px(x + 1, y + 1, cen); px(x + 2, y + 1, pet); px(x + 3, y + 1, dk);
    px(x, y + 2, pet); px(x + 1, y + 2, pet); px(x + 2, y + 2, dk); px(x + 3, y + 2, dk);
    px(x + 1, y + 3, dk); px(x + 2, y + 3, dk);
  }
  function flowers(map, ox, oy, tx, ty, fr) {
    grass(ox, oy, tx, ty, false);
    const [pet, cen, dk] = FLOWERS[Math.floor(H(tx, ty, 3) * FLOWERS.length)];
    const spots = [[2, 2], [9, 5], [3, 10], [10, 12]];
    spots.forEach(([fx, fy], i) => {
      if (i === 3 && H(tx, ty, 4) < 0.5) return;
      const ph = (fr + i + tx) & 3, bob = ph === 1 ? -1 : 0;
      const x = ox + fx + Math.floor(H(tx, ty, 10 + i) * 3), y = oy + fy;
      px(x + 1, y + 4, PAL.g3); px(x + 2, y + 5, PAL.g3); px(x, y + 5, PAL.g1); px(x + 3, y + 4, PAL.g1);
      bloom(x, y + bob, pet, cen, dk);
    });
  }

  // ── water ──
  function water(map, ox, oy, tx, ty, fr) {
    rect(ox, oy, 16, 16, PAL.w0);
    // drifting glints
    for (let i = 0; i < 2; i++) {
      const y = oy + 3 + Math.floor(H(tx, ty, i + 20) * 10) + i * 2;
      const x = ox + ((Math.floor(H(tx, ty, i + 30) * 16) + fr * 2 + i * 5) % 16) - 1;
      if (((fr + i + tx + ty) & 3) === 3) continue;
      px(x, y, PAL.w1); px(x + 1, y + 1, PAL.w1); px(x + 2, y + 1, PAL.w1); px(x + 3, y, PAL.w1);
    }
    if (H(tx, ty, 40) < 0.25 && ((fr + tx) & 3) === 0) { const x = ox + 4 + Math.floor(H(tx, ty, 41) * 8), y = oy + 4 + Math.floor(H(tx, ty, 42) * 8); px(x, y, '#ffffff'); px(x - 1, y, PAL.w1); px(x + 1, y, PAL.w1); px(x, y - 1, PAL.w1); px(x, y + 1, PAL.w1); }
    const land = ch => !isWater(ch) && ch !== '=' && ch !== 'w' && ch !== 'y';
    const at = (dx, dy) => tileAt(map, tx + dx, ty + dy);
    const up = land(at(0, -1)), dn = land(at(0, 1)), lf = land(at(-1, 0)), rt = land(at(1, 0));
    const grassy = ch => !(ch === ';' || ch === ':' || ch === '*' || ch === 'a');
    const f = fr & 1;
    if (up) {
      if (grassy(at(0, -1))) { rect(ox, oy, 16, 3, '#a8845a'); rect(ox, oy, 16, 1, '#c8a070'); rect(ox, oy + 3, 16, 1, '#7a5c3c'); rect(ox, oy + 4, 16, 2, PAL.w2); }
      else rect(ox, oy, 16, 2, PAL.w2);
      for (let i = f; i < 16; i += 3) px(ox + i, grassy(at(0, -1)) ? oy + 6 : oy + 2, PAL.w3);
    }
    if (dn) { rect(ox, oy + 15, 16, 1, PAL.w3); for (let i = f; i < 16; i += 2) px(ox + i, oy + 14, PAL.w3); for (let i = 1 - f; i < 16; i += 4) px(ox + i, oy + 13, PAL.w1); }
    if (lf) { rect(ox, oy, 1, 16, PAL.w3); for (let i = f; i < 16; i += 2) px(ox + 1, oy + i, PAL.w3); }
    if (rt) { rect(ox + 15, oy, 1, 16, PAL.w3); for (let i = 1 - f; i < 16; i += 2) px(ox + 14, oy + i, PAL.w3); }
    // inner corners
    if (!up && !lf && land(at(-1, -1))) { px(ox, oy, PAL.w3); px(ox + 1, oy, PAL.w1); px(ox, oy + 1, PAL.w1); }
    if (!up && !rt && land(at(1, -1))) { px(ox + 15, oy, PAL.w3); px(ox + 14, oy, PAL.w1); px(ox + 15, oy + 1, PAL.w1); }
    if (!dn && !lf && land(at(-1, 1))) { px(ox, oy + 15, PAL.w3); px(ox + 1, oy + 15, PAL.w1); }
    if (!dn && !rt && land(at(1, 1))) { px(ox + 15, oy + 15, PAL.w3); px(ox + 14, oy + 15, PAL.w1); }
  }
  function lava(ox, oy, tx, ty, fr, map) {
    rect(ox, oy, 16, 16, '#e24e1a');
    for (let y = 0; y < 16; y += 4) for (let x = ((y >> 2) & 1) * 4; x < 16; x += 8) rect(ox + x + ((fr + (y >> 2)) & 3), oy + y + 1, 4, 1, '#f07428');
    for (let i = 0; i < 3; i++) {
      const x = ox + 2 + Math.floor(H(tx, ty, i) * 11), y = oy + 2 + Math.floor(H(tx, ty, i + 5) * 11);
      const s = (fr + i * 2 + tx) & 3;
      if (s === 3) continue;
      rect(x, y, 3 - (s === 2 ? 1 : 0), 2, s === 0 ? '#fde68a' : '#f8b040');
      if (s === 0) px(x + 1, y - 1, '#fff4c0');
    }
    if (!map) { rect(ox, oy, 16, 1, '#a8301a'); return; }
    const L = (dx, dy) => tileAt(map, tx + dx, ty + dy) === 'L';
    const crust = '#3a2622', crustL = '#6a4a3e', glow = '#f8a040';
    if (!L(0, -1)) { rect(ox, oy, 16, 3, crust); for (let i = 0; i < 16; i++) if (hash2(tx * 16 + i, ty, 3) < 0.4) px(ox + i, oy + 3, crust); rect(ox, oy, 16, 1, crustL); rect(ox, oy + 4, 16, 1, glow); }
    if (!L(0, 1)) { rect(ox, oy + 14, 16, 2, crust); rect(ox, oy + 13, 16, 1, '#c83a14'); }
    if (!L(-1, 0)) { rect(ox, oy, 2, 16, crust); rect(ox + 2, oy, 1, 16, glow); rect(ox, oy, 1, 16, crustL); }
    if (!L(1, 0)) { rect(ox + 14, oy, 2, 16, crust); rect(ox + 13, oy, 1, 16, '#c83a14'); }
  }
  function caveFloor(ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, PAL.cv0);
    if (H(tx, ty, 17) < 0.35) { const x = ox + 3 + Math.floor(H(tx, ty, 18) * 9), y = oy + 3 + Math.floor(H(tx, ty, 19) * 9); rect(x, y, 2, 1, PAL.cv1); px(x, y - 1, PAL.cv2); px(x + 1, y - 1, PAL.cv2); }
    if (H(tx, ty, 27) < 0.2) { const x = ox + 2 + Math.floor(H(tx, ty, 28) * 10), y = oy + 3 + Math.floor(H(tx, ty, 29) * 10); px(x, y, PAL.cv1); px(x + 1, y + 1, PAL.cv1); px(x + 2, y + 1, PAL.cv1); px(x + 3, y + 2, PAL.cv1); }
  }
  // cave walls: flat dark "top" surface; vertical face where the floor is below
  function caveWall(map, ox, oy, tx, ty) {
    const isC = (dx, dy) => { const ch = tileAt(map, tx + dx, ty + dy); return ch === 'C' || ch === 'A'; };
    const rp = ROCKPAL.rkC;
    if (!isC(0, 1)) { // vertical face above open floor
      rect(ox, oy, 16, 16, PAL.rkC);
      rect(ox, oy + 13, 16, 3, rp[0]);
      for (let i = 0; i < 16; i++) if (vnoise((tx * 16 + i) / 2.5, ty, 9) < 0.5) px(ox + i, oy + 12, rp[0]);
      if (isC(0, -1)) { rect(ox, oy, 16, 1, rp[4]); rect(ox, oy + 1, 16, 1, rp[3]); }
    } else rect(ox, oy, 16, 16, PAL.rkT);
    // rims where the wall top meets open floor
    if (!isC(0, -1)) { rect(ox, oy, 16, 1, '#2a1c14'); rect(ox, oy + 1, 16, 1, '#b8987a'); rect(ox, oy + 2, 16, 1, '#8c6c52'); }
    if (!isC(-1, 0)) { rect(ox, oy, 1, 16, '#2a1c14'); rect(ox + 1, oy, 1, 16, '#a08060'); }
    if (!isC(1, 0)) { rect(ox + 15, oy, 1, 16, '#2a1c14'); rect(ox + 14, oy, 1, 16, rp[1]); }
  }
  function cliff(map, ox, oy, tx, ty) {
    const snowy = map.baseTile === '*', ashy = map.baseTile === 'a';
    const mk = snowy ? PAL.rkS : ashy ? PAL.rkA : PAL.rkG, rp = ROCKPAL[snowy ? 'rkS' : ashy ? 'rkA' : 'rkG'];
    const isK = (dx, dy) => tileAt(map, tx + dx, ty + dy) === '#';
    rect(ox, oy, 16, 16, mk);
    if (!isK(0, -1)) { // grassy / snowy lip
      const lip = snowy ? PAL.sn0 : ashy ? PAL.a2 : PAL.g0, lipD = snowy ? PAL.sn3 : ashy ? PAL.a1 : '#4c9a3e', lipL = snowy ? PAL.sn2 : ashy ? '#c0b0a2' : PAL.g2;
      rect(ox, oy, 16, 4, lip);
      for (let i = 0; i < 16; i++) { const d = vnoise((tx * 16 + i) / 3, ty, 3) < 0.5 ? 1 : 0; if (d) px(ox + i, oy + 4, lip); px(ox + i, oy + 4 + d, lipD); px(ox + i, oy + 5 + d, rp[1]); }
      rect(ox, oy, 16, 1, lipL);
    }
    if (!isK(0, 1)) { rect(ox, oy + 14, 16, 2, rp[0]); for (let i = 0; i < 16; i++) if (vnoise((tx * 16 + i) / 2.5, ty, 9) < 0.45) px(ox + i, oy + 13, rp[0]); }
    if (!isK(-1, 0)) { rect(ox, oy, 1, 16, rp[0]); }
    if (!isK(1, 0)) { rect(ox + 15, oy, 1, 16, rp[0]); rect(ox + 14, oy, 1, 16, rp[1]); }
  }
  function ledge(map, ox, oy, tx, ty) {
    grass(ox, oy, tx, ty, false);
    const l = tileAt(map, tx - 1, ty) === 'v', r = tileAt(map, tx + 1, ty) === 'v';
    const x0 = l ? 0 : 1, x1 = r ? 16 : 15, w = x1 - x0;
    const rows = ['#66b04c', '#5ca646', '#549c40', '#4c903a', '#438434'];
    rect(ox + x0, oy + 7, w, 1, PAL.g4);
    rows.forEach((c, i) => rect(ox + x0, oy + 8 + i, w, 1, c));
    for (let i = x0; i < x1; i++) {
      const hh = hash2(tx * 16 + i, ty, 7);
      if (hh < 0.3) rect(ox + i, oy + 9, 1, 3, '#478a38');
      else if (hh < 0.45) px(ox + i, oy + 8, '#7cc25c');
      const drip = hash2(tx * 16 + i, ty, 8) < 0.28 ? 1 : 0;
      rect(ox + i, oy + 13, 1, 1 + drip, '#2e6a2c');
    }
    rect(ox + x0, oy + 14, w, 1, 'rgba(20,56,24,0.3)');
    rect(ox + x0, oy + 15, w, 1, 'rgba(20,56,24,0.14)');
    if (!l) { rect(ox, oy + 8, 1, 5, '#3f7c32'); px(ox, oy + 7, PAL.g2); px(ox + 1, oy + 13, '#2e6a2c'); }
    if (!r) { rect(ox + 15, oy + 8, 1, 5, '#2e6a2c'); px(ox + 15, oy + 7, PAL.g2); }
  }
  function fence(map, ox, oy, tx, ty) {
    base(map, ox, oy, tx, ty);
    const wood = '#f4ece0', mid = '#d8ccb8', dark = '#9a8a74';
    const l = tileAt(map, tx - 1, ty) === 'F', r = tileAt(map, tx + 1, ty) === 'F', u = tileAt(map, tx, ty - 1) === 'F', d = tileAt(map, tx, ty + 1) === 'F';
    rect(ox + 3, oy + 14, 11, 2, 'rgba(16,40,24,0.18)');
    if (l || r || (!u && !d)) {
      const x0 = l ? 0 : 6, x1 = r ? 16 : 10;
      for (const y of [5, 10]) { rect(ox + x0, oy + y, x1 - x0, 2, wood); rect(ox + x0, oy + y + 2, x1 - x0, 1, dark); rect(ox + x0, oy + y, x1 - x0, 1, '#ffffff'); }
    }
    if (u || d) { rect(ox + 6, oy + (u ? 0 : 3), 4, 13 - (u ? 0 : 3), wood); rect(ox + 9, oy + (u ? 0 : 3), 1, 13 - (u ? 0 : 3), mid); }
    // post with pointed cap
    rect(ox + 6, oy + 3, 4, 11, wood); rect(ox + 9, oy + 3, 1, 11, mid); rect(ox + 6, oy + 3, 1, 11, '#ffffff');
    px(ox + 7, oy + 1, wood); px(ox + 8, oy + 1, mid); rect(ox + 6, oy + 2, 4, 1, wood);
    rect(ox + 6, oy + 14, 4, 1, dark);
  }
  const spriteCache = {};
  function cached(key, w, h, fn) { if (!spriteCache[key]) { const P = new Painter(w, h, 1); fn(P); spriteCache[key] = P.finish({ ot: 0.66 }).toCanvas(); } return spriteCache[key]; }
  function bush(map, ox, oy, tx, ty) {
    base(map, ox, oy, tx, ty);
    shadowAt(ox + 8, oy + 14, 7, 2, 0.24);
    const v = H(tx, ty, 5) < 0.5 ? 0 : 1;
    C.drawImage(cached('bush' + v, 16, 16, P => {
      const g = v ? '#4aa452' : '#47a04e';
      P.part(q => { q.ell(8, 9.5, 7, 5.6, g, { k: 1.6 }); q.ell(4.5, 7.5, 3.5, 3, g, { k: 1.2 }); q.ell(11.5, 7, 3.8, 3.2, g, { k: 1.2 }); q.ell(8, 5, 4, 3, g, { k: 1.2 }); });
      P.within(q => { q.fell(6, 4.5, 1.6, 1, '#8ed072'); q.fell(3.8, 6.8, 1.2, 0.8, '#8ed072'); q.fell(11, 5.8, 1.4, 0.8, '#78c060'); q.dot(9, 9, '#2f7a3a'); q.dot(5, 11, '#2f7a3a'); q.dot(12, 11, '#2f7a3a'); });
      if (v) P.within(q => { q.dot(5, 8, '#f86878'); q.dot(10, 6, '#f86878'); q.dot(12, 10, '#f86878'); });
    }), ox, oy);
  }
  function hedge(map, ox, oy, tx, ty) {
    const isH = (dx, dy) => tileAt(map, tx + dx, ty + dy) === 'h';
    const face = !isH(0, 1);
    rect(ox, oy, 16, 16, PAL.hdT);
    if (face) { rect(ox, oy + 9, 16, 7, PAL.hdF); rect(ox, oy + 9, 16, 1, '#5cb45c'); rect(ox, oy + 15, 16, 1, '#123e1c'); }
    if (!isH(0, -1)) { rect(ox, oy, 16, 1, '#1e5a2a'); rect(ox, oy + 1, 16, 1, '#9ade84'); for (let i = 0; i < 16; i += 3) px(ox + i + (ty & 1), oy, '#9ade84'); }
    if (!isH(-1, 0)) { rect(ox, oy, 1, 16, '#1e5a2a'); rect(ox + 1, oy + 1, 1, face ? 8 : 15, '#7ccc6c'); }
    if (!isH(1, 0)) { rect(ox + 15, oy, 1, 16, '#123e1c'); rect(ox + 14, oy + 1, 1, 15, '#2a6a34'); }
  }
  function rock(map, ox, oy, tx, ty, cave) {
    if (cave) caveFloor(ox, oy, tx, ty); else base(map, ox, oy, tx, ty);
    shadowAt(ox + 8, oy + 14, 7, 2, 0.26);
    C.drawImage(cached('rock' + (cave ? 1 : 0), 16, 16, P => {
      const col = cave ? '#9a8674' : '#a9a6a2';
      P.part(q => { q.ball(8, 9.5, 6.8, 5.4, col, { hl: 1.1, k: 1.8 }); q.ball(6, 7, 4, 3.4, col, { hl: 1, k: 1.2 }); });
      P.within(q => { q.line([[5, 10], [7.5, 11.5], [10, 10.5]], 0.5, cave ? '#6a5848' : '#78746f'); q.dot(10, 6, Col.light(col, 1.5)); if (!cave) { q.fell(4.5, 11.5, 1.8, 0.8, '#7cb060'); q.dot(12, 12, '#7cb060'); } });
    }), ox, oy);
  }
  function sign(map, ox, oy, tx, ty) {
    base(map, ox, oy, tx, ty);
    rect(ox + 3, oy + 14, 11, 2, 'rgba(16,40,24,0.2)');
    rect(ox + 4, oy + 9, 2, 6, '#6a4424'); rect(ox + 10, oy + 9, 2, 6, '#6a4424'); rect(ox + 5, oy + 9, 1, 6, '#4e301a'); rect(ox + 11, oy + 9, 1, 6, '#4e301a');
    rect(ox + 1, oy + 2, 14, 9, '#5a3618'); rect(ox + 2, oy + 3, 12, 7, '#c89058'); rect(ox + 2, oy + 3, 12, 1, '#e8b87c'); rect(ox + 2, oy + 6, 12, 1, '#b07a44'); rect(ox + 2, oy + 9, 12, 1, '#a06c3a');
    rect(ox + 4, oy + 4, 7, 1, '#7a4e28'); rect(ox + 4, oy + 7, 5, 1, '#7a4e28');
    px(ox + 2, oy + 3, '#f4d0a0');
  }
  function lamp(map, ox, oy, tx, ty) {
    base(map, ox, oy, tx, ty);
    shadowAt(ox + 8, oy + 15, 4, 1, 0.26);
    rect(ox + 7, oy + 1, 2, 13, '#3e3e50'); rect(ox + 7, oy + 1, 1, 13, '#5a5a70');
    rect(ox + 5, oy + 13, 6, 2, '#2e2e3e'); rect(ox + 6, oy + 12, 4, 1, '#4a4a5c');
  }
  function lampTop(ox, oy, night) {
    rect(ox + 4, oy - 7, 8, 2, '#2e2e3e'); rect(ox + 5, oy - 8, 6, 1, '#3e3e50');
    rect(ox + 5, oy - 5, 6, 5, night ? '#fff0a8' : '#f4e8b8'); rect(ox + 5, oy - 5, 1, 5, '#3e3e50'); rect(ox + 10, oy - 5, 1, 5, '#3e3e50');
    rect(ox + 6, oy - 5, 4, 1, night ? '#ffffff' : '#fffae0');
    rect(ox + 4, oy, 8, 1, '#2e2e3e'); px(ox + 7, oy + 1, '#3e3e50');
  }
  function bridge(map, ox, oy, tx, ty, fr) {
    const at = (dx, dy) => tileAt(map, tx + dx, ty + dy) === '=';
    let hr = 1, vr = 1;
    for (let i = 1; at(-i, 0); i++) hr++; for (let i = 1; at(i, 0); i++) hr++;
    for (let i = 1; at(0, -i); i++) vr++; for (let i = 1; at(0, i); i++) vr++;
    const vert = vr >= hr;
    const nearW = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => isWater(tileAt(map, tx + dx, ty + dy)));
    if (nearW) water(map, ox, oy, tx, ty, fr); else base(map, ox, oy, tx, ty);
    const deck = '#c89060', seam = '#9a6436', rail = '#7a4a28', railL = '#b07a48';
    if (vert) {
      const l = at(-1, 0), r = at(1, 0);
      const x0 = l ? 0 : 2, x1 = r ? 16 : 14;
      rect(ox + x0, oy, x1 - x0, 16, deck);
      for (let i = 0; i < 16; i += 4) { rect(ox + x0, oy + i + 3, x1 - x0, 1, seam); rect(ox + x0, oy + i, x1 - x0, 1, '#dca878'); }
      if (!l) { rect(ox + 1, oy, 2, 16, rail); rect(ox + 1, oy, 1, 16, railL); if (nearW) rect(ox - 1 + 1, oy, 1, 16, 'rgba(0,30,80,0.25)'); }
      if (!r) { rect(ox + 13, oy, 2, 16, rail); rect(ox + 13, oy, 1, 16, railL); if (nearW) rect(ox + 15, oy, 1, 16, 'rgba(0,30,80,0.3)'); }
    } else {
      const u = at(0, -1), d = at(0, 1);
      const y0 = u ? 0 : 2, y1 = d ? 16 : 14;
      rect(ox, oy + y0, 16, y1 - y0, deck);
      for (let i = 0; i < 16; i += 4) { rect(ox + i + 3, oy + y0, 1, y1 - y0, seam); rect(ox + i, oy + y0, 1, y1 - y0, '#dca878'); }
      if (!u) { rect(ox, oy + 1, 16, 2, rail); rect(ox, oy + 1, 16, 1, railL); }
      if (!d) { rect(ox, oy + 13, 16, 2, rail); rect(ox, oy + 13, 16, 1, railL); if (nearW) rect(ox, oy + 15, 16, 1, 'rgba(0,30,80,0.3)'); }
    }
  }
  function dock(map, ox, oy, tx, ty, fr) {
    water(map, ox, oy, tx, ty, fr);
    const isD = (dx, dy) => tileAt(map, tx + dx, ty + dy) === 'w';
    const l = isD(-1, 0), r = isD(1, 0), dn = isD(0, 1);
    const x0 = l ? 0 : 1, x1 = r ? 16 : 15;
    rect(ox + x0, oy, x1 - x0, 16, '#b88450');
    for (let x = x0; x < x1; x += 4) { rect(ox + x, oy, 1, 16, '#8a5a30'); rect(ox + x + 1, oy, 1, 16, '#cc9860'); }
    for (let i = 0; i < 2; i++) { const y = oy + 3 + Math.floor(H(tx, ty, i) * 10), x = ox + x0 + 2 + Math.floor(H(tx, ty, i + 5) * (x1 - x0 - 4)); px(x, y, '#5a3a20'); }
    if (!l) { rect(ox, oy, 1, 16, '#5a3a20'); }
    if (!r) { rect(ox + 15, oy, 1, 16, '#5a3a20'); rect(ox + 14, oy, 1, 16, '#8a5a30'); }
    if (!dn && isWater(tileAt(map, tx, ty + 1))) {
      rect(ox + x0, oy + 13, x1 - x0, 2, '#7a4e2a'); rect(ox + x0, oy + 15, x1 - x0, 1, 'rgba(0,30,80,0.35)');
      if (!l) { rect(ox + 1, oy + 12, 3, 4, '#6a4428'); rect(ox + 1, oy + 12, 3, 1, '#9a6a3c'); }
      if (!r) { rect(ox + 12, oy + 12, 3, 4, '#6a4428'); rect(ox + 12, oy + 12, 3, 1, '#9a6a3c'); }
    }
  }
  function crystalFloor(ox, oy, tx, ty, fr) {
    rect(ox, oy, 16, 16, PAL.x0);
    rect(ox, oy, 16, 1, '#f8faff'); rect(ox, oy, 1, 16, '#f8faff');
    rect(ox, oy + 15, 16, 1, PAL.x1); rect(ox + 15, oy, 1, 16, PAL.x1);
    // faint diagonal sheen on alternate tiles
    if ((tx + ty) % 2 === 0) for (let i = 0; i < 6; i++) px(ox + 3 + i, oy + 9 - i, '#eef2ff');
    const hues = ['#f8b8c8', '#f8e0a0', '#b8f0c8', '#a8d8f8', '#d0b8f8'];
    const h = hues[(tx * 3 + ty + fr) % hues.length];
    if (hash2(tx, ty, 71) < 0.4) { const x = ox + 3 + Math.floor(hash2(tx, ty, 72) * 10), y = oy + 3 + Math.floor(hash2(tx, ty, 73) * 10); px(x, y, h); px(x + 1, y, PAL.x2); px(x, y + 1, Col.mix(h, PAL.x0, 0.5)); }
  }
  function metalFloor(ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, '#8c909c'); rect(ox, oy, 16, 1, '#a8acb8'); rect(ox, oy, 1, 16, '#a8acb8'); rect(ox + 15, oy, 1, 16, '#6c707c'); rect(ox, oy + 15, 16, 1, '#6c707c');
    for (let i = 3; i < 14; i += 3) rect(ox + i, oy + 3, 1, 10, '#848894');
    px(ox + 2, oy + 2, '#5c606c'); px(ox + 13, oy + 2, '#5c606c'); px(ox + 2, oy + 13, '#5c606c'); px(ox + 13, oy + 13, '#5c606c');
  }
  function machine(ox, oy, tx, ty, fr) {
    rect(ox, oy, 16, 16, '#5a5e6a'); rect(ox + 1, oy + 1, 14, 9, '#2a2e3a'); rect(ox + 1, oy + 11, 14, 4, '#7a7e8a');
    const on = (fr + tx) % 2;
    rect(ox + 3, oy + 3, 3, 2, on ? '#60f0a0' : '#2a8a5a'); rect(ox + 8, oy + 3, 5, 1, '#60c0f0'); rect(ox + 8, oy + 6, 3, 1, on ? '#f06060' : '#8a3a3a');
    rect(ox + 3, oy + 12, 10, 1, '#4a4e5a');
  }
  // ── indoor ──
  const theme = map => map.id && map.id.startsWith('center') ? 'center' : map.id && map.id.startsWith('mart') ? 'mart' : map.id === 'lab' ? 'lab' : 'home';
  function woodFloor(ox, oy, tx, ty) {
    const tones = ['#d8a66a', '#d09c60', '#dcae74'];
    for (let r = 0; r < 4; r++) {
      const y = oy + r * 4, row = ty * 4 + r, sx = (row * 7 + 3) % 16;
      const tA = tones[Math.floor(hash2(tx * 2, row, 3) * 3)], tB = tones[Math.floor(hash2(tx * 2 + 1, row, 3) * 3)];
      rect(ox, y, sx, 4, tA); rect(ox + sx, y, 16 - sx, 4, tB);
      rect(ox, y, 16, 1, '#e8bc84');
      rect(ox, y + 3, 16, 1, '#a8733e');
      rect(ox + sx, y, 1, 3, '#a8733e'); px(ox + sx + 1, y + 1, '#e8bc84');
      if (hash2(tx, row, 5) < 0.5) { const gx = ox + Math.floor(hash2(tx, row, 6) * 12); rect(gx, y + 1 + (row & 1), 3, 1, '#c48e52'); }
    }
  }
  function tileFloor(ox, oy, tx, ty, c1 = '#f4f1e8', c2 = '#e6eaee') {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const X0 = ox + x * 8, Y0 = oy + y * 8, col = (x + y + tx + ty) % 2 ? c2 : c1;
      rect(X0, Y0, 8, 8, col);
      rect(X0, Y0, 7, 1, Col.light(col, 0.4)); px(X0, Y0, '#ffffff');
      rect(X0 + 7, Y0, 1, 8, '#c9ccd2'); rect(X0, Y0 + 7, 8, 1, '#c9ccd2');
    }
  }
  function gymFloor(map, ox, oy, tx, ty) {
    const c = map.gymColor || '#58a868';
    const a = Col.mix(c, '#f4f4f0', 0.78), b = Col.mix(c, '#ffffff', 0.86);
    rect(ox, oy, 16, 16, a); rect(ox + 1, oy + 1, 14, 14, b);
    rect(ox + 1, oy + 1, 14, 1, '#ffffff');
    if ((tx + ty) % 2 === 0) { rect(ox + 6, oy + 6, 4, 4, Col.mix(c, '#ffffff', 0.45)); px(ox + 6, oy + 6, Col.mix(c, '#ffffff', 0.7)); }
  }
  const wallish = ch => ch === 'W' || ch === 'O' || ch === 'B' || ch === 'K';
  function wall(map, ox, oy, tx, ty) {
    const wc = map.wallColor || (map.gymColor ? Col.mix(map.gymColor, '#f6f2e8', 0.78) : '#f2e6c8');
    rect(ox, oy, 16, 16, wc);
    const st = Col.shade(wc, 0.18);
    for (let i = 1; i < 16; i += 4) rect(ox + i, oy, 1, 16, st);
    for (let i = 3; i < 16; i += 8) for (let j = 4; j < 16; j += 8) { px(ox + i, oy + j, Col.light(wc, 0.5)); px(ox + i, oy + j + 1, st); }
    const above = tileAt(map, tx, ty - 1), below = tileAt(map, tx, ty + 1);
    if (!wallish(above)) { rect(ox, oy, 16, 3, '#8a5a36'); rect(ox, oy, 16, 1, '#b07c4e'); rect(ox, oy + 3, 16, 1, Col.shade(wc, 0.5)); }
    if (!wallish(below)) {
      rect(ox, oy + 8, 16, 8, '#b98a58'); rect(ox, oy + 8, 16, 1, '#dcae78'); rect(ox, oy + 9, 16, 1, '#8e6238');
      rect(ox + 2, oy + 11, 12, 3, '#a87a4a'); rect(ox + 2, oy + 11, 12, 1, '#94683c'); rect(ox + 2, oy + 13, 12, 1, '#c89a66');
      rect(ox, oy + 14, 16, 2, '#6e4628'); rect(ox, oy + 14, 16, 1, '#8a5a36');
    }
  }
  function windowTile(map, ox, oy, tx, ty, night) {
    wall(map, ox, oy, tx, ty);
    const below = tileAt(map, tx, ty + 1), low = !wallish(below);
    const y0 = low ? oy - 2 : oy + 3;
    rect(ox + 2, y0, 12, 10, '#7a5436');
    for (let i = 0; i < 8; i++) rect(ox + 3, y0 + 1 + i, 10, 1, night ? Col.mix('#1a2450', '#2e3c78', i / 7) : Col.mix('#9cd4f8', '#d8f0ff', i / 7));
    if (night) { px(ox + 5, y0 + 2, '#fff8d0'); px(ox + 10, y0 + 4, '#c8d4ff'); } else { rect(ox + 8, y0 + 3, 4, 1, '#ffffff'); rect(ox + 9, y0 + 2, 2, 1, '#ffffff'); }
    rect(ox + 7, y0 + 1, 2, 8, '#7a5436'); rect(ox + 3, y0 + 4, 10, 1, '#7a5436');
    // curtains + sill
    const cc = map.curtain || '#d86a5a';
    rect(ox + 1, y0 - 1, 3, 12, cc); rect(ox + 12, y0 - 1, 3, 12, cc); rect(ox + 1, y0 - 1, 1, 12, Col.light(cc, 0.6)); rect(ox + 14, y0 - 1, 1, 12, Col.shade(cc, 0.6));
    rect(ox, y0 - 2, 16, 1, '#6a4428');
    rect(ox + 1, y0 + 10, 14, 2, '#f4ece0'); rect(ox + 1, y0 + 11, 14, 1, '#c8b8a0');
  }
  function counter(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    const th = theme(map);
    const face = th === 'center' ? '#e86a6a' : th === 'mart' ? '#5a86d8' : '#b87844', top = th === 'center' || th === 'mart' ? '#fbf8f2' : '#e0a868';
    const l = tileAt(map, tx - 1, ty) === 'n', r = tileAt(map, tx + 1, ty) === 'n';
    const x0 = ox + (l ? 0 : 1), x1 = ox + (r ? 16 : 15);
    rect(x0, oy + 14, x1 - x0, 2, 'rgba(30,20,20,0.2)');
    rect(x0, oy + 1, x1 - x0, 6, top); rect(x0, oy + 1, x1 - x0, 1, '#ffffff'); rect(x0, oy + 6, x1 - x0, 1, Col.shade(top, 0.5));
    rect(x0, oy + 7, x1 - x0, 7, face); rect(x0, oy + 7, x1 - x0, 1, Col.shade(face, 0.8)); rect(x0, oy + 13, x1 - x0, 1, Col.shade(face, 0.9));
    if (th === 'center' || th === 'mart') { rect(x0, oy + 10, x1 - x0, 1, '#ffffff'); }
    else for (let x = x0 + 3; x < x1 - 1; x += 5) rect(x, oy + 8, 1, 5, Col.shade(face, 0.5));
    if (!l) { rect(ox, oy + 1, 1, 13, Col.shade(face, 1.2)); }
    if (!r) { rect(ox + 15, oy + 1, 1, 13, Col.shade(face, 1.2)); }
  }
  function bookshelf(map, ox, oy, tx, ty) {
    const onFloor = !wallish(tileAt(map, tx, ty - 1)) || ty > 1;
    if (onFloor) floorFor(map, ox, oy, tx, ty); else wall(map, ox, oy, tx, ty);
    if (onFloor) rect(ox + 1, oy + 14, 15, 2, 'rgba(30,20,20,0.22)');
    rect(ox, oy, 16, 15, '#6e4424'); rect(ox, oy, 16, 1, '#9a6a40'); rect(ox + 15, oy, 1, 15, '#4e2e18');
    rect(ox + 1, oy + 1, 14, 6, '#3e2414'); rect(ox + 1, oy + 8, 14, 6, '#3e2414');
    rect(ox, oy + 7, 16, 1, '#9a6a40');
    if (theme(map) === 'mart') {
      // stocked goods: potions, balls, boxes
      for (let i = 0; i < 4; i++) { const x = ox + 2 + i * 3; rect(x, oy + 3, 2, 4, ['#b070e0', '#60c0f0', '#f07070', '#70d080'][(i + tx) % 4]); px(x, oy + 2, '#e8e8f0'); px(x, oy + 3, '#ffffff'); }
      for (let i = 0; i < 3; i++) { const x = ox + 3 + i * 4; rect(x, oy + 10, 3, 4, '#f4f4f4'); rect(x, oy + 10, 3, 2, (i + tx) % 2 ? '#e84040' : '#3868e0'); px(x + 1, oy + 11, '#282828'); }
      return;
    }
    const bc = ['#d84a4a', '#4a78d8', '#4aaa5a', '#e0b840', '#9a5ac0', '#f0ece0', '#e07838'];
    for (let s = 0; s < 2; s++) {
      let x = ox + 2;
      for (let i = 0; x < ox + 14; i++) {
        const w = 1 + Math.floor(hash2(tx * 9 + i, s + ty * 2, 7) * 2), hgt = 4 + Math.floor(hash2(tx * 9 + i, s + ty * 2, 8) * 2);
        const col = bc[Math.floor(hash2(tx * 9 + i, s + ty * 2, 9) * bc.length)];
        if (x + w > ox + 14) break;
        rect(x, oy + 1 + s * 7 + (6 - hgt), w, hgt, col); px(x, oy + 1 + s * 7 + (6 - hgt), Col.light(col, 0.8));
        x += w + (hash2(tx, i + s * 7, 10) < 0.15 ? 1 : 0);
      }
    }
  }
  function table(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    const l = tileAt(map, tx - 1, ty) === 't', r = tileAt(map, tx + 1, ty) === 't', u = tileAt(map, tx, ty - 1) === 't', d = tileAt(map, tx, ty + 1) === 't';
    const x0 = ox + (l ? 0 : 1), x1 = ox + (r ? 16 : 15), y0 = oy + (u ? 0 : 3);
    if (!d) rect(x0 + 1, oy + 13, x1 - x0, 3, 'rgba(30,20,20,0.2)');
    rect(x0, y0, x1 - x0, (d ? 16 : 10) - (y0 - oy), '#c07a44');
    if (!u) { rect(x0, y0, x1 - x0, 1, '#e4a268'); }
    if (!d) { rect(x0, oy + 10, x1 - x0, 2, '#8a5028'); rect(x0, oy + 9, x1 - x0, 1, '#a8683a'); if (!l) rect(x0, oy + 12, 2, 3, '#6e3e1e'); if (!r) rect(x1 - 2, oy + 12, 2, 3, '#6e3e1e'); }
    // something on the table
    const k = hash2(tx, ty, 21);
    if (!u && k < 0.3) { rect(ox + 6, y0 + 1, 4, 3, '#f4f4f8'); rect(ox + 6, y0 + 1, 4, 1, '#ffffff'); px(ox + 10, y0 + 2, '#f4f4f8'); rect(ox + 7, y0 + 1, 2, 1, '#8a5a3a'); }
    else if (!u && k < 0.5) { rect(ox + 5, y0 + 1, 6, 3, '#4a78d8'); rect(ox + 5, y0 + 1, 6, 1, '#7aa0f0'); }
    else if (!u && k < 0.65) { rect(ox + 7, y0 - 3, 3, 5, '#e8e0f0'); px(ox + 7, y0 - 5, '#f86878'); px(ox + 9, y0 - 5, '#f8d048'); px(ox + 8, y0 - 6, '#f86878'); px(ox + 8, y0 - 4, '#4a9a40'); }
  }
  function bed(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    const head = tileAt(map, tx, ty - 1) !== 'd', foot = tileAt(map, tx, ty + 1) !== 'd';
    const blanket = map.blanket || '#5890e0';
    rect(ox + 1, oy, 14, 16, '#8a5a34');
    if (head) { rect(ox + 1, oy, 14, 4, '#a06a3e'); rect(ox + 1, oy, 14, 1, '#c08a58'); rect(ox + 3, oy + 3, 10, 5, '#fafafa'); rect(ox + 3, oy + 7, 10, 1, '#d8d8e4'); rect(ox + 2, oy + 8, 12, 8, blanket); rect(ox + 2, oy + 8, 12, 2, Col.light(blanket, 0.7)); }
    else { rect(ox + 2, oy, 12, foot ? 12 : 16, blanket); for (let y = oy + 3; y < oy + (foot ? 12 : 16); y += 5) rect(ox + 2, y, 12, 1, Col.shade(blanket, 0.4)); }
    if (foot) { rect(ox + 1, oy + 12, 14, 3, '#7a4a28'); rect(ox + 1, oy + 12, 14, 1, '#a06a3e'); rect(ox + 1, oy + 15, 14, 1, 'rgba(30,20,20,0.3)'); }
  }
  function plant(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    rect(ox + 3, oy + 14, 11, 2, 'rgba(30,20,20,0.22)');
    C.drawImage(cached('pot', 16, 18, P => {
      P.part(q => { q.poly([[4, 11], [12, 11], [11, 17], [5, 17]], '#c8663a', { k: 1.2, rim: true }); q.rect(3, 10, 10, 2, '#e08a5a'); });
      P.part(q => { q.ball(8, 6, 5.5, 4.5, '#43a04e', { hl: false, k: 1.4 }); q.ell(3.5, 8, 3, 1.8, '#3a9048', { rot: 25, k: 1 }); q.ell(12.5, 8, 3, 1.8, '#3a9048', { rot: -25, k: 1 }); q.ell(8, 2, 2, 3, '#4aaa54', { k: 1 }); });
      P.within(q => { q.dot(6, 4, '#8ed070'); q.dot(9, 3, '#8ed070'); q.dot(4, 7, '#78c060'); });
    }), ox, oy - 3);
  }
  function rug(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    const s = ch => ch === 'R';
    const base = map.rug || '#c84848', gold = '#f0c050';
    rect(ox, oy, 16, 16, base);
    const u = s(tileAt(map, tx, ty - 1)), d = s(tileAt(map, tx, ty + 1)), l = s(tileAt(map, tx - 1, ty)), r = s(tileAt(map, tx + 1, ty));
    if (!u) { rect(ox, oy, 16, 1, Col.shade(base, 0.8)); rect(ox, oy + 2, 16, 1, gold); }
    if (!d) { rect(ox, oy + 15, 16, 1, Col.shade(base, 0.8)); rect(ox, oy + 13, 16, 1, gold); for (let i = 1; i < 16; i += 2) px(ox + i, oy + 15, '#f4e8d0'); }
    if (!l) { rect(ox, oy, 1, 16, Col.shade(base, 0.8)); rect(ox + 2, oy, 1, 16, gold); }
    if (!r) { rect(ox + 15, oy, 1, 16, Col.shade(base, 0.8)); rect(ox + 13, oy, 1, 16, gold); }
    // diamond motif on a world-space lattice
    const cx = ox + 8, cy = oy + 8;
    if (u || d || l || r) { rect(cx - 1, cy - 3, 2, 1, gold); rect(cx - 2, cy - 2, 4, 1, Col.light(base, 0.6)); rect(cx - 3, cy - 1, 6, 2, gold); rect(cx - 2, cy + 1, 4, 1, Col.light(base, 0.6)); rect(cx - 1, cy + 2, 2, 1, gold); px(cx, cy, base); }
  }
  function mat(map, ox, oy) {
    floorFor(map, ox, oy, 0, 0);
    rect(ox + 1, oy + 3, 14, 12, '#8a3a34'); rect(ox + 2, oy + 4, 12, 10, '#c05048');
    for (let i = 0; i < 3; i++) rect(ox + 3, oy + 6 + i * 3, 10, 1, '#e07068');
    px(ox + 7, oy + 13, '#f8d0c8'); px(ox + 8, oy + 13, '#f8d0c8');
  }
  function pc(map, ox, oy, tx, ty, fr = 0) {
    floorFor(map, ox, oy, tx, ty);
    rect(ox + 2, oy + 14, 13, 2, 'rgba(30,20,20,0.22)');
    rect(ox + 1, oy + 9, 14, 6, '#b8bcc8'); rect(ox + 1, oy + 9, 14, 1, '#e0e4ec'); rect(ox + 1, oy + 14, 14, 1, '#7a7e8a');
    rect(ox + 3, oy, 10, 9, '#d4d8e2'); rect(ox + 3, oy, 10, 1, '#f0f2f8');
    rect(ox + 4, oy + 1, 8, 6, '#1e2a48');
    const glow = (fr + tx) & 1;
    rect(ox + 5, oy + 2, 6, 4, glow ? '#58b0f8' : '#4a9ae8'); rect(ox + 5, oy + 2, 6, 1, '#a8e0ff');
    rect(ox + 6, oy + 4, 3, 1, '#e8f6ff'); rect(ox + 6, oy + 5, 4, 1, '#88c8f8');
    rect(ox + 3, oy + 10, 10, 2, '#9aa0ae'); for (let i = 0; i < 5; i++) px(ox + 4 + i * 2, oy + 10, '#e0e4ec');
    px(ox + 12, oy + 7, (fr & 2) ? '#60f0a0' : '#2a8a5a');
  }
  function healer(map, ox, oy, tx, ty, fr = 0) {
    floorFor(map, ox, oy, tx, ty);
    rect(ox, oy + 1, 16, 14, '#c83a3a'); rect(ox, oy + 1, 16, 1, '#f07070'); rect(ox + 15, oy + 1, 1, 14, '#8a2020');
    rect(ox + 1, oy + 2, 14, 7, '#f4f4f4'); rect(ox + 1, oy + 2, 14, 1, '#ffffff');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = ox + 2 + i * 4, y = oy + 3 + j * 3; rect(x, y, 3, 2, '#e84848'); px(x, y, '#ff9a9a'); rect(x, y + 1, 3, 1, '#b82828'); }
    rect(ox + 2, oy + 10, 12, 4, '#8a2020'); rect(ox + 3, oy + 11, 5, 2, (fr & 1) ? '#70f0a0' : '#40c070'); rect(ox + 10, oy + 11, 3, 2, '#f8d048');
    rect(ox, oy + 15, 16, 1, 'rgba(30,20,20,0.25)');
  }
  function stove(ox, oy, tx, ty) {
    rect(ox, oy, 16, 16, '#e8e8f0'); rect(ox, oy, 16, 4, '#cfd0da'); rect(ox, oy, 16, 1, '#f4f4fa');
    rect(ox + 2, oy + 1, 5, 2, '#3a3a48'); rect(ox + 9, oy + 1, 5, 2, '#3a3a48'); px(ox + 4, oy + 1, '#e86030');
    rect(ox + 1, oy + 5, 14, 9, '#d6d8e2'); rect(ox + 3, oy + 7, 10, 5, '#44485a'); rect(ox + 3, oy + 7, 10, 1, '#6a6e80'); rect(ox + 6, oy + 6, 4, 1, '#8a8e9e');
    rect(ox, oy + 14, 16, 2, '#9a9cac');
    if (hash2(tx, ty, 3) < 0.5) { rect(ox + 9, oy - 2, 5, 3, '#8a8e9e'); rect(ox + 9, oy - 2, 5, 1, '#b4b8c6'); px(ox + 14, oy - 1, '#5a5e6a'); }
  }
  function tv(map, ox, oy, tx, ty, fr) {
    floorFor(map, ox, oy, tx, ty);
    rect(ox + 1, oy + 14, 15, 2, 'rgba(30,20,20,0.22)');
    rect(ox + 2, oy + 11, 12, 4, '#8a5a34'); rect(ox + 2, oy + 11, 12, 1, '#b07a4a');
    rect(ox + 1, oy, 14, 11, '#34343e'); rect(ox + 1, oy, 14, 1, '#5a5a68');
    const scr = ['#58a0f0', '#70c070', '#f0a060', '#a080f0'][fr % 4];
    rect(ox + 2, oy + 1, 10, 8, scr); rect(ox + 2, oy + 1, 10, 2, Col.light(scr, 0.8)); rect(ox + 3, oy + 5, 4, 3, Col.shade(scr, 0.5));
    px(ox + 13, oy + 3, '#e0e0e8'); px(ox + 13, oy + 6, '#e05050');
  }
  function stairs(ox, oy) { rect(ox, oy, 16, 16, '#7a5a3e'); for (let i = 0; i < 4; i++) { rect(ox + 1, oy + i * 4, 14, 3, Col.mix('#c8a078', '#8a6a4e', i / 4)); rect(ox + 1, oy + i * 4, 14, 1, '#e0bc92'); rect(ox + 1, oy + i * 4 + 3, 14, 1, '#4e3422'); } rect(ox, oy, 1, 16, '#5a3e28'); rect(ox + 15, oy, 1, 16, '#5a3e28'); }
  function statue(map, ox, oy, tx, ty) {
    floorFor(map, ox, oy, tx, ty);
    rect(ox + 1, oy + 14, 15, 2, 'rgba(30,20,20,0.24)');
    rect(ox + 2, oy + 9, 12, 6, '#9a9aa8'); rect(ox + 2, oy + 9, 12, 2, '#c8c8d4'); rect(ox + 2, oy + 14, 12, 1, '#6a6a78'); rect(ox + 3, oy + 12, 10, 1, map.gymColor || '#8a8a98');
    C.drawImage(cached('statue', 16, 16, P => { P.part(q => { q.ball(8, 7, 4.6, 4.4, '#b8b8c6', { hl: 1.2 }); q.ell(5, 3, 1.6, 2.8, '#b8b8c6', { rot: -15 }); q.ell(11, 3, 1.6, 2.8, '#b8b8c6', { rot: 15 }); q.ball(8, 11, 3.6, 2.4, '#b8b8c6'); }); }), ox, oy - 3);
  }
  function crystalPillar(ox, oy, tx, ty, fr) {
    crystalFloor(ox, oy, tx, ty, fr);
    rect(ox + 2, oy + 12, 12, 4, '#8a8ab0'); rect(ox + 2, oy + 12, 12, 1, '#b0b0d8');
    const hue = ['#f8a8c8', '#a8e8f8', '#c8b8f8', '#b8f8c8'][(tx + ty) % 4];
    rect(ox + 5, oy - 8, 6, 20, hue); rect(ox + 5, oy - 8, 2, 20, '#ffffff'); rect(ox + 10, oy - 8, 1, 20, Col.shade(hue));
    rect(ox + 6, oy - 10, 4, 2, hue); px(ox + 7, oy - 11, '#ffffff');
    if (((fr + tx) & 3) === 0) px(ox + 8, oy - 4 + ((tx * 5) % 12), '#ffffff');
  }
  function floorFor(map, ox, oy, tx, ty) {
    const f = map.floor || '_';
    if (f === '-') tileFloor(ox, oy, tx, ty); else if (f === 'z') gymFloor(map, ox, oy, tx, ty); else if (f === 'u') metalFloor(ox, oy, tx, ty);
    else if (f === 'x') crystalFloor(ox, oy, tx, ty, 0); else if (f === 'c') caveFloor(ox, oy, tx, ty); else woodFloor(ox, oy, tx, ty);
  }

  // ── trees: 20×30 sprites anchored 2px left / 13px above their tile ──
  const TREE_OX = 2, TREE_OY = 13;
  const treeCache = {};
  function treeSprite(kind, variant) {
    const key = kind + variant;
    if (treeCache[key]) return treeCache[key];
    const P = new Painter(20, 30, 1);
    if (kind === 'pine') {
      P.rect(9, 24, 2, 5, PAL.trunk); P.rect(10, 24, 1, 5, PAL.trunk2);
      const g = variant ? '#2f7c5c' : '#2c7658';
      const tiers = [[10, 1, 5, 9], [10, 6, 7, 15], [10, 12, 9, 21], [10, 17, 10, 26]];
      for (const [cx, top, hw, bot] of tiers) P.part(q => q.poly([[cx, top], [cx + hw, bot], [cx + hw - 2, bot + 1], [cx - hw + 2, bot + 1], [cx - hw, bot]], g, { k: 1.6, rim: true }), { ot: 0.5 });
      P.within(q => {
        q.fpoly([[10, 1], [13, 6], [11, 5.5], [9, 7], [7, 6]], PAL.sn0);
        for (const [cx, top, hw, bot] of tiers.slice(1)) { q.fpoly([[cx - hw + 1, bot - 1], [cx - 2, top + 4], [cx + 1, top + 5], [cx + hw - 3, bot - 2], [cx + 1, bot - 3], [cx - 3, bot]], PAL.sn0); q.dot(cx - hw + 3, bot - 1, PAL.sn1); }
      });
    } else if (kind === 'dead') {
      P.stroke([[10, 29], [10, 16], [7, 8]], 1.8, 0.8, '#6a5448'); P.stroke([[10, 16], [14, 8], [15, 5]], 1.1, 0.5, '#6a5448'); P.stroke([[10, 21], [5, 16]], 0.9, 0.5, '#6a5448'); P.stroke([[14, 9], [17, 8]], 0.6, 0.4, '#6a5448');
    } else {
      const g = variant ? '#3f9e4e' : '#3a984a';
      P.rect(8, 23, 4, 6, PAL.trunk); P.rect(11, 23, 1, 6, PAL.trunk2); P.rect(8, 23, 1, 6, '#a87448');
      P.dot(7, 28, PAL.trunk2); P.dot(12, 28, PAL.trunk2);
      // leafy canopy built from overlapping clumps, back to front
      const clumps = variant
        ? [[10, 6, 6, 5], [5, 10, 4.6, 4.4], [15, 9, 4.8, 4.6], [10, 12, 8, 6.5], [5.5, 17, 5, 4.2], [14.5, 17, 5.2, 4.4], [10, 19, 6.5, 4.6]]
        : [[10, 5.5, 6.2, 5], [4.8, 10.5, 4.6, 4.6], [15.2, 10, 4.6, 4.6], [10, 12, 8.2, 6.5], [5, 17.5, 4.8, 4], [15, 17, 5, 4.2], [10, 19.5, 6.8, 4.4]];
      P.part(q => { for (const [x, y, rx, ry] of clumps) q.ell(x, y, rx, ry, g, { k: 1.8, rim: true, hk: 0.7 }); }, { ot: 0.5 });
      P.within(q => {
        q.fell(7, 5, 2.4, 1.6, '#7ccc66'); q.fell(4, 9.5, 1.6, 1.2, '#7ccc66'); q.fell(12.5, 4, 1.4, 1, '#96dc78');
        q.fell(8, 10.5, 2, 1.2, '#6abe5c'); q.fell(14.5, 8.5, 1.4, 1, '#6abe5c');
        q.dot(6, 4, '#b8ec98'); q.dot(3, 9, '#b8ec98'); q.dot(12, 3, '#c8f4a8');
        q.fell(11, 22, 5, 1.4, '#2c7438'); q.fell(16, 20, 2, 1.4, '#2c7438');
      });
    }
    const c = P.finish({ ot: 0.72 }).toCanvas();
    treeCache[key] = c;
    return c;
  }
  // ── buildings ──
  // Each building is painted into its own sprite (with margins for chimneys,
  // eaves and antennas), outlined, then stamped with a soft ground shadow.
  const BM = { x: 6, top: 28, bot: 2 };
  function outlineCanvas(cv, t = 0.62) {
    const w = cv.width, h = cv.height, x = cv.ctx;
    const id = x.getImageData(0, 0, w, h), d = new Uint32Array(id.data.buffer), out = new Uint32Array(d);
    const op = v => (v >>> 24) > 200;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      if (op(d[i])) continue;
      let n = 0;
      if (xx > 0 && op(d[i - 1])) n = d[i - 1]; else if (xx < w - 1 && op(d[i + 1])) n = d[i + 1];
      else if (yy > 0 && op(d[i - w])) n = d[i - w]; else if (yy < h - 1 && op(d[i + w])) n = d[i + w];
      if (n) out[i] = packedDark(n, t);
    }
    new Uint32Array(id.data.buffer).set(out);
    x.putImageData(id, 0, 0);
  }
  function roofSlab(x, y, w, h, col, o = {}) {
    const lt = Col.light(col, 0.7), lt2 = Col.light(col, 1.4), dk = Col.shade(col, 0.7), dk2 = Col.shade(col, 1.5);
    rect(x, y, w, h, col);
    rect(x, y, w, Math.max(2, Math.floor(h * 0.34)), Col.mix(col, lt, 0.45));
    const step = o.step || 4;
    for (let r = 0, yy = y + 3 + step - 1; yy < y + h - 3; r++, yy += step) {
      rect(x, yy, w, 1, dk);
      for (let xx = x + ((r & 1) ? 2 : 6); xx < x + w - 1; xx += 8) { rect(xx, yy - step + 1, 1, step - 1, Col.mix(col, dk, 0.55)); px(xx + 1, yy - step + 1, Col.mix(col, lt, 0.8)); }
    }
    rect(x, y, w, 1, lt2); rect(x, y + 1, w, 1, lt); rect(x, y + 2, w, 1, Col.mix(col, dk, 0.35));
    rect(x, y + h - 3, w, 1, dk); rect(x, y + h - 2, w, 2, dk2);
    rect(x, y, 1, h - 2, lt); rect(x + w - 1, y, 1, h - 2, dk);
    if (o.snow) {
      rect(x, y, w, 5, PAL.sn0); rect(x, y, w, 1, PAL.sn2);
      for (let i = 0; i < w; i++) { const d = vnoise(i / 3, y, 7) < 0.5 ? 1 : 2; rect(x + i, y + 5, 1, d, PAL.sn0); px(x + i, y + 5 + d, PAL.sn1); }
      for (let i = 2; i < w - 1; i += 3 + (i % 2)) { rect(x + i, y + h, 1, 1 + (i % 3 === 0 ? 1 : 0), '#e8f6ff'); }
    }
  }
  function wallFace(x, y, w, h, col, o = {}) {
    rect(x, y, w, h, col);
    const ln = Col.shade(col, 0.2), mortar = Col.shade(col, 0.55);
    if (o.brick) {
      for (let yy = y; yy < y + h - 3; yy += 4) { rect(x, yy + 3, w, 1, mortar); for (let xx = x + (((yy - y) >> 2) & 1) * 4; xx < x + w; xx += 8) rect(xx, yy, 1, 3, mortar); rect(x, yy, w, 1, Col.light(col, 0.25)); }
    } else if (o.logs) {
      for (let yy = y; yy < y + h - 3; yy += 4) { rect(x, yy, w, 1, Col.light(col, 0.5)); rect(x, yy + 3, w, 1, Col.shade(col, 0.8)); px(x, yy + 1, Col.light(col, 0.8)); rect(x + w - 2, yy + 1, 2, 2, Col.light(col, 0.9)); px(x + w - 2, yy + 1, '#e8c89a'); }
    } else if (o.panels) {
      for (let xx = x + 7; xx < x + w - 2; xx += 8) { rect(xx, y, 1, h - 3, ln); rect(xx + 1, y, 1, h - 3, Col.light(col, 0.3)); }
    } else if (o.siding !== false) for (let yy = y + 3; yy < y + h - 4; yy += 3) rect(x, yy, w, 1, ln);
    rect(x, y + h - 3, w, 3, o.base || '#a59e94'); rect(x, y + h - 3, w, 1, '#c8c2b8'); rect(x, y + h - 1, w, 1, '#7e776e');
    rect(x, y, 1, h - 3, Col.light(col, 0.6)); rect(x + w - 1, y, 1, h - 3, Col.shade(col, 0.7));
    rect(x, y, w, 2, 'rgba(50,24,24,0.25)'); rect(x, y + 2, w, 1, 'rgba(50,24,24,0.1)');
  }
  function pane(x, y, w, h, night, o = {}) {
    const fr = o.frame || '#fbf7ee';
    rect(x - 1, y - 1, w + 2, h + 2, '#7c6c5c');
    rect(x, y, w, h, fr);
    const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
    for (let i = 0; i < gh; i++) rect(gx, gy + i, gw, 1, night ? Col.mix('#fff4b8', '#f2b048', i / Math.max(1, gh - 1)) : Col.mix('#dcf4ff', '#68b0e6', i / Math.max(1, gh - 1)));
    if (!night) { rect(gx, gy, 2, 1, '#ffffff'); px(gx, gy + 1, '#ffffff'); px(gx + gw - 2, gy + gh - 1, '#c8ecff'); }
    else { rect(gx, gy, gw, 1, '#fffbe0'); if (o.curtain) { rect(gx, gy, 1, gh, '#e07060'); rect(gx + gw - 1, gy, 1, gh, '#e07060'); } }
    if (!o.noCross) { rect(x + (w >> 1), y, 1, h, fr); if (h >= 8) rect(x, y + (h >> 1), w, 1, fr); }
    rect(x - 2, y + h + 1, w + 4, 1, '#f4efe4'); rect(x - 2, y + h + 2, w + 4, 1, 'rgba(50,30,20,0.3)');
    if (o.flowers) {
      rect(x - 1, y + h + 2, w + 2, 3, '#8e5230'); rect(x - 1, y + h + 2, w + 2, 1, '#b4703e');
      const fl = ['#f85868', '#f8d048', '#ffffff', '#f890c8'];
      for (let i = 0; i < w + 2; i += 2) { px(x - 1 + i, y + h + 1, fl[(i >> 1) % 4]); px(x + i, y + h + 1, '#4a9a40'); }
    }
  }
  function woodDoor(x, y, col = '#8a5430') {
    rect(x + 2, y, 12, 16, '#4a2e1a');
    rect(x + 3, y + 1, 10, 15, col); rect(x + 3, y + 1, 10, 1, Col.light(col));
    const pn = Col.shade(col, 0.55);
    rect(x + 4, y + 3, 3, 5, pn); rect(x + 9, y + 3, 3, 5, pn); rect(x + 4, y + 9, 3, 4, pn); rect(x + 9, y + 9, 3, 4, pn);
    px(x + 4, y + 3, Col.shade(col, 1.1)); px(x + 9, y + 3, Col.shade(col, 1.1));
    px(x + 11, y + 8, '#f8d860'); px(x + 11, y + 9, '#a88018');
    rect(x + 1, y + 15, 14, 1, '#9a938a');
  }
  function slideDoor(x, y, frame = '#5a6878', o = {}) {
    rect(x + 1, y, 14, 16, frame);
    for (const gx of [x + 2, x + 9]) {
      rect(gx, y + 1, 5, 14, '#8ccaf0'); rect(gx, y + 1, 5, 4, '#b8e2fa');
      px(gx + 1, y + 6, '#e4f6ff'); px(gx + 2, y + 5, '#e4f6ff'); px(gx + 3, y + 4, '#e4f6ff');
    }
    rect(x + 7, y + 1, 2, 14, Col.shade(frame, 0.6));
    if (o.mat) rect(x + 2, y + 15, 12, 1, o.mat); else rect(x + 1, y + 15, 14, 1, '#6a7888');
  }
  function sprite(b, fn) {
    const w = b.w * 16, h = b.h * 16;
    const cv = mkCanvas(w + BM.x * 2, h + BM.top + BM.bot);
    const prev = C; C = cv.ctx; C.translate(BM.x, BM.top);
    fn(w, h);
    C.setTransform(1, 0, 0, 1, 0, 0);
    C = prev;
    return cv;
  }
  function stamp(b, cv, o = {}) {
    const ox = b.x * 16, oy = b.y * 16, w = b.w * 16, h = b.h * 16;
    if (o.outline !== false) outlineCanvas(cv, o.ot || 0.66);
    if (o.shadow !== false) {
      const sy = oy + (o.shadowTop || Math.round(h * 0.4));
      C.fillStyle = 'rgba(16,36,28,0.2)'; C.fillRect(ox + w, sy, 4, oy + h - sy); C.fillRect(ox + w + 4, sy + 3, 2, oy + h - sy - 3);
      C.fillStyle = 'rgba(16,36,28,0.12)'; C.fillRect(ox + 2, oy + h, w, 2);
    }
    C.drawImage(cv, ox - BM.x, oy - BM.top);
  }
  const doorX = b => (b.door != null ? b.door : Math.floor(b.w / 2)) * 16;
  function winRow(b, w, y, ww, hh, night, gap, o = {}) {
    const dx = doorX(b), m = o.doorGap || 3;
    const xs = [];
    for (const [a, z] of [[3, dx - m], [dx + 16 + m, w - 3]]) {
      const span = z - a;
      if (span < ww + 2) continue;
      const n = Math.max(1, Math.floor((span + 8) / (ww + (gap - ww))));
      const step = span / n;
      for (let i = 0; i < n; i++) xs.push(Math.round(a + step * (i + 0.5) - ww / 2));
    }
    for (const x of xs) { pane(x, y, ww, hh, night, o); b._lights.push({ x: b.x * 16 + x + ww / 2, y: b.y * 16 + y + hh / 2, r: 22, c: o.light || 'rgba(255,210,120,0.55)' }); }
  }
  function pokeball(cx, cy, r) {
    C.fillStyle = '#2a2a30'; C.beginPath(); C.arc(cx, cy, r + 1, 0, Math.PI * 2); C.fill();
    C.fillStyle = '#ffffff'; C.beginPath(); C.arc(cx, cy, r, 0, Math.PI * 2); C.fill();
    C.fillStyle = '#e83838'; C.beginPath(); C.arc(cx, cy, r, Math.PI, 0); C.fill();
    rect(cx - r, cy - 1, r * 2, 2, '#2a2a30'); rect(cx - 2, cy - 2, 4, 4, '#2a2a30'); rect(cx - 1, cy - 1, 2, 2, '#ffffff');
    rect(cx - r + 2, cy - r + 2, 2, 1, '#ff9a9a');
  }
  function signPlate(cx, y, text, bg, fg, o = {}) {
    const tw = Tiny.width(text), w = tw + 6;
    rect(cx - (w >> 1) - 1, y - 1, w + 2, 9, o.edge || Col.shade(bg, 1.2));
    rect(cx - (w >> 1), y, w, 7, bg); rect(cx - (w >> 1), y, w, 1, Col.light(bg, 0.8));
    Tiny.draw(C, text, cx - (tw >> 1), y + 1, fg);
  }
  function building(map, b, night) {
    const ox = b.x * 16, oy = b.y * 16, w = b.w * 16, h = b.h * 16;
    const lights = map._lights;
    b._lights = lights;
    switch (b.t) {
      case 'house': case 'cabin': case 'forge': {
        const roofCol = b.roof || '#d85848';
        const cabin = b.t === 'cabin', forge = b.t === 'forge';
        const roofH = Math.round(h * 0.56);
        const cv = sprite(b, (w, h) => {
          if (b.chimney || forge) { const cx = w - 17; rect(cx, -9, 8, 16, '#8a4e3c'); for (let yy = -8; yy < 7; yy += 3) rect(cx, yy, 8, 1, '#6e3a2c'); rect(cx - 1, -11, 10, 3, '#5a4a44'); rect(cx - 1, -11, 10, 1, '#7a6a64'); rect(cx + 2, -10, 4, 1, '#20181a'); }
          const wallC = forge ? '#b0634a' : cabin ? '#a0683e' : (b.wall || '#f6ecd6');
          wallFace(0, roofH - 2, w, h - roofH + 2, wallC, { brick: forge, logs: cabin });
          roofSlab(-2, 0, w + 4, roofH, roofCol, { snow: cabin });
          const wy = roofH + 3;
          winRow(b, w, wy, 12, 9, night, 24, { flowers: !forge && !cabin, curtain: true });
          woodDoor(doorX(b), h - 16, forge ? '#5a3a2a' : cabin ? '#6a4428' : '#8a5430');
          if (forge) { rect(doorX(b) + 2, h - 19, 12, 2, '#3a2a24'); }
        });
        stamp(b, cv, { shadowTop: roofH - 4 });
        if (forge && night) lights.push({ x: ox + doorX(b) + 8, y: oy + h - 6, r: 30, c: 'rgba(255,140,60,0.6)' });
        break;
      }
      case 'center': {
        const roofH = 30;
        const cv = sprite(b, (w, h) => {
          wallFace(0, roofH - 2, w, h - roofH + 2, '#fbf8f4', { siding: false });
          rect(1, roofH + 1, w - 2, 3, '#e04848'); rect(1, roofH + 4, w - 2, 1, '#b83030');
          roofSlab(-2, 0, w + 4, roofH, '#e24a4a');
          pokeball(w / 2, 14, 8);
          const dx = doorX(b);
          winRow(b, w, roofH + 9, 12, 9, night, 20, { light: 'rgba(255,215,170,0.5)' });
          signPlate(dx + 8, roofH + 2, 'POKEMON', '#e04848', '#ffffff', { edge: '#8a2020' });
          slideDoor(dx, h - 16, '#c83a3a', { mat: '#e86060' });
        });
        stamp(b, cv, { shadowTop: roofH - 4 });
        lights.push({ x: ox + doorX(b) + 8, y: oy + h - 8, r: 32, c: 'rgba(255,200,200,0.55)' });
        break;
      }
      case 'mart': {
        const roofH = b.h >= 4 ? 28 : 24;
        const cv = sprite(b, (w, h) => {
          wallFace(0, roofH - 2, w, h - roofH + 2, '#f6f8fc', { siding: false });
          rect(1, roofH + 1, w - 2, 3, '#4878d8'); rect(1, roofH + 4, w - 2, 1, '#2f58a8');
          roofSlab(-2, 0, w + 4, roofH, '#4a7ad6');
          signPlate(w / 2, 9, 'MART', '#fdfdff', '#2f58b8', { edge: '#2a4a90' });
          winRow(b, w, roofH + 7, 12, 8, night, 20, { light: 'rgba(200,220,255,0.5)', noCross: true });
          slideDoor(doorX(b), h - 16, '#3a62b8', { mat: '#6a9ae8' });
        });
        stamp(b, cv, { shadowTop: roofH - 4 });
        break;
      }
      case 'gym': {
        const col = b.color || '#58a868';
        const roofH = 34;
        const cv = sprite(b, (w, h) => {
          wallFace(0, roofH - 2, w, h - roofH + 2, '#eeebe4', { panels: true });
          roofSlab(-3, 0, w + 6, roofH, col, { step: 5 });
          const cx = w / 2;
          // emblem
          C.fillStyle = '#2a2a30'; C.beginPath(); C.moveTo(cx, 5); C.lineTo(cx + 11, 16); C.lineTo(cx, 27); C.lineTo(cx - 11, 16); C.closePath(); C.fill();
          C.fillStyle = '#fafaf4'; C.beginPath(); C.moveTo(cx, 7); C.lineTo(cx + 9, 16); C.lineTo(cx, 25); C.lineTo(cx - 9, 16); C.closePath(); C.fill();
          C.fillStyle = col; C.beginPath(); C.moveTo(cx, 10); C.lineTo(cx + 6, 16); C.lineTo(cx, 22); C.lineTo(cx - 6, 16); C.closePath(); C.fill();
          C.fillStyle = Col.light(col, 1.2); C.beginPath(); C.moveTo(cx, 10); C.lineTo(cx - 6, 16); C.lineTo(cx, 16); C.closePath(); C.fill();
          const dx = doorX(b);
          // pillars flanking the door
          for (const px0 of [dx - 6, dx + 17]) { rect(px0, roofH, 5, h - roofH - 3, '#f8f6f0'); rect(px0, roofH, 1, h - roofH - 3, '#ffffff'); rect(px0 + 4, roofH, 1, h - roofH - 3, '#bdb8ae'); rect(px0 - 1, roofH, 7, 2, '#d8d4cc'); rect(px0 - 1, h - 5, 7, 2, '#c8c2b8'); }
          signPlate(dx + 8, roofH + 3, 'GYM', col, '#ffffff', { edge: Col.shade(col, 1.3) });
          winRow(b, w, roofH + 14, 12, 10, night, 22, { light: 'rgba(255,230,160,0.5)', doorGap: 10 });
          slideDoor(dx, h - 16, Col.shade(col, 0.8), { mat: Col.light(col, 0.6) });
        });
        stamp(b, cv, { shadowTop: roofH - 4 });
        break;
      }
      case 'lab': {
        const roofH = 26;
        const cv = sprite(b, (w, h) => {
          // satellite dish + antenna
          rect(w - 20, -8, 2, 12, '#8a90a0'); C.fillStyle = '#e4e8f0'; C.beginPath(); C.arc(w - 19, -9, 7, Math.PI * 0.85, Math.PI * 2.15); C.fill(); C.fillStyle = '#b8c0d0'; C.beginPath(); C.arc(w - 19, -9, 7, Math.PI * 1.5, Math.PI * 2.15); C.fill(); rect(w - 20, -12, 2, 2, '#e04848');
          rect(12, -12, 1, 14, '#7a8090'); rect(9, -10, 7, 1, '#7a8090'); px(12, -13, '#f8e060');
          wallFace(0, roofH - 2, w, h - roofH + 2, '#f8f9fb', { panels: true });
          // aurora stripe
          const au = ['#64e0a8', '#5cc8e8', '#7aa0f0', '#b08af0'];
          for (let i = 0; i < w - 2; i++) rect(1 + i, roofH + 1, 1, 3, au[Math.floor(i / (w - 2) * 4)]);
          rect(1, roofH + 4, w - 2, 1, '#8890a8');
          roofSlab(-2, 0, w + 4, roofH, '#7688a4');
          winRow(b, w, roofH + 8, 14, 10, night, 22, { light: 'rgba(200,230,255,0.55)' });
          slideDoor(doorX(b), h - 16, '#6a7890', { mat: '#98a8c0' });
          signPlate(doorX(b) + 8, roofH + 7, 'LAB', '#5a6a88', '#ffffff');
        });
        stamp(b, cv, { shadowTop: roofH - 4 });
        break;
      }
      case 'lighthouse': {
        const lit = b.lit && b.lit();
        const cv = sprite(b, (w, h) => {
          const cx = w / 2;
          // tapered striped tower with cylindrical shading
          for (let y = 22; y < h - 4; y++) {
            const t = (y - 22) / (h - 26), hw = Math.round(lerp(9, 15, t));
            const band = Math.floor((y - 22) / 11) % 2 ? '#e44848' : '#f8f6f2';
            for (let x = -hw; x < hw; x++) {
              const k = (x + hw) / (hw * 2);
              const c = k < 0.18 ? Col.light(band, 0.5) : k > 0.72 ? Col.shade(band, k > 0.88 ? 1 : 0.5) : band;
              px(cx + x, y, c);
            }
          }
          rect(cx - 17, h - 5, 34, 5, '#9a948a'); rect(cx - 17, h - 5, 34, 1, '#c4beb4');
          // gallery + lantern room
          rect(cx - 13, 18, 26, 4, '#3a3a48'); rect(cx - 13, 18, 26, 1, '#6a6a78');
          for (let x = cx - 12; x < cx + 13; x += 3) rect(x, 14, 1, 4, '#4a4a58');
          rect(cx - 13, 13, 26, 1, '#4a4a58');
          rect(cx - 8, 3, 16, 11, lit ? '#fff6b8' : '#9aa0b0'); rect(cx - 8, 3, 16, 2, lit ? '#ffffff' : '#c0c6d4');
          for (let x = cx - 8; x < cx + 8; x += 5) rect(x, 3, 1, 11, '#2e2e3a');
          C.fillStyle = '#3a3a48'; C.beginPath(); C.moveTo(cx - 10, 3); C.lineTo(cx, -5); C.lineTo(cx + 10, 3); C.closePath(); C.fill();
          rect(cx - 1, -9, 2, 5, '#3a3a48');
          woodDoor(cx - 8, h - 16, '#5a4a3e');
        });
        shadowAt(ox + w / 2 + 3, oy + h - 1, 18, 3, 0.24);
        stamp(b, cv, { shadow: false });
        if (lit) {
          lights.push({ x: ox + w / 2, y: oy + 8, r: 64, c: 'rgba(255,240,150,0.75)' });
          // beam
          C.fillStyle = 'rgba(255,248,200,0.18)'; C.beginPath(); C.moveTo(ox + w / 2, oy + 8); C.lineTo(ox + w / 2 - 70, oy - 20); C.lineTo(ox + w / 2 - 70, oy + 20); C.closePath(); C.fill();
        }
        break;
      }
      case 'eldertree': {
        const cx = ox + w / 2;
        const bloom = b.bloom && b.bloom();
        shadowAt(cx, oy + h - 2, w / 2 + 6, 4, 0.28);
        const trunk = new Painter(40, 34, 1);
        trunk.part(q => { q.poly([[13, 0], [27, 0], [29, 26], [36, 33], [4, 33], [11, 26]], '#7a4a2a', { k: 2.2, rim: true }); });
        trunk.within(q => { q.line([[18, 4], [17, 14], [19, 26]], 0.6, '#5a3418'); q.line([[24, 6], [25, 18]], 0.5, '#5a3418'); q.line([[14, 22], [8, 31]], 0.6, '#9a6a44'); q.line([[26, 22], [32, 31]], 0.6, '#5a3418'); });
        C.drawImage(trunk.finish({ ot: 0.7 }).toCanvas(), cx - 20, oy + h - 34);
        const r = new Painter(w + 8, h - 6, 1);
        const g = '#3a9a4a';
        const lobes = [[w / 2 + 4, 24, 26, 20], [w / 2 - 18, 32, 17, 14], [w / 2 + 26, 32, 17, 14], [w / 2 - 8, 14, 15, 12], [w / 2 + 16, 12, 15, 12], [w / 2 + 4, 36, 22, 12]];
        r.part(q => { for (const [x, y, rx, ry] of lobes) q.ell(x, y, rx, ry, g, { k: 2.4, rim: true, hk: 0.6 }); }, { ot: 0.5 });
        r.within(q => {
          const rng = seeded(11);
          for (let i = 0; i < 46; i++) { const x = 8 + rng() * (w - 8), y = 4 + rng() * 40; q.ell(x, y, 3.2, 2.4, bloom ? (i % 3 ? '#f8a8c8' : '#fcd6e6') : (i % 2 ? '#5cb85c' : '#6cc466'), { k: 1, flat: false }); }
          for (let i = 0; i < 20; i++) q.dot(10 + rng() * (w - 12), 4 + rng() * 26, bloom ? '#ffffff' : '#a8e490');
        });
        C.drawImage(r.finish({ ot: 0.7 }).toCanvas(), ox - 4, oy - 10);
        break;
      }
      case 'spire': {
        const cx = ox + w / 2;
        const open = b.open && b.open();
        const facets = [
          [[cx, oy - 44], [cx - 10, oy - 10], [ox + 8, oy + h - 22], [ox, oy + h], [cx - 14, oy + h]],
          [[cx, oy - 44], [cx - 10, oy - 10], [cx - 14, oy + h], [cx + 2, oy + h], [cx + 2, oy - 8]],
          [[cx, oy - 44], [cx + 2, oy - 8], [cx + 2, oy + h], [cx + 16, oy + h], [cx + 11, oy - 10]],
          [[cx, oy - 44], [cx + 11, oy - 10], [cx + 16, oy + h], [ox + w, oy + h], [ox + w - 8, oy + h - 22]],
        ];
        const fc = ['#f0f4ff', '#d8def8', '#c0c6ec', '#a4aad8'];
        C.fillStyle = 'rgba(16,24,40,0.2)'; C.fillRect(ox + w - 6, oy + h - 30, 10, 30);
        facets.forEach((f, i) => { C.fillStyle = fc[i]; C.beginPath(); f.forEach(([x, y], j) => j ? C.lineTo(x, y) : C.moveTo(x, y)); C.closePath(); C.fill(); });
        C.strokeStyle = '#6e74a8'; C.lineWidth = 1; C.beginPath(); C.moveTo(cx, oy - 44); C.lineTo(ox + w - 8, oy + h - 22); C.lineTo(ox + w, oy + h); C.lineTo(ox, oy + h); C.lineTo(ox + 8, oy + h - 22); C.closePath(); C.stroke();
        const hues = ['#f87878', '#f8c858', '#78d878', '#68b8f8', '#b888f8'];
        hues.forEach((hc, i) => { rect(cx - 1, oy - 32 + i * 16, 2, 11, hc); px(cx - 1, oy - 32 + i * 16, '#ffffff'); });
        for (let i = 0; i < 6; i++) { const gx = ox + 10 + ((i * 37) % (w - 20)), gy = oy - 4 + ((i * 23) % (h - 20)); px(gx, gy, '#ffffff'); px(gx + 1, gy + 1, hues[i % 5]); }
        const dx = ox + b.door * 16;
        rect(dx - 4, oy + h - 22, 24, 22, open ? '#fffbe8' : '#4a4a78');
        C.fillStyle = open ? '#fffbe8' : '#4a4a78'; C.beginPath(); C.arc(dx + 8, oy + h - 22, 12, Math.PI, 0); C.fill();
        rect(dx - 2, oy + h - 20, 20, 20, open ? '#ffffff' : '#2e2e5a');
        C.fillStyle = open ? '#ffffff' : '#2e2e5a'; C.beginPath(); C.arc(dx + 8, oy + h - 20, 10, Math.PI, 0); C.fill();
        [[dx, '#f05050'], [dx + 8, '#50c060'], [dx + 16, '#5080f0']].forEach(([x, c], i) => { const on = b.sockets && b.sockets(i); C.fillStyle = '#1e1e38'; C.beginPath(); C.arc(x, oy + h - 36, 4, 0, Math.PI * 2); C.fill(); C.fillStyle = on ? c : '#34345a'; C.beginPath(); C.arc(x, oy + h - 36, 3, 0, Math.PI * 2); C.fill(); if (on) px(x - 1, oy + h - 38, '#ffffff'); });
        lights.push({ x: cx, y: oy + h / 2, r: 54, c: 'rgba(200,210,255,0.45)' });
        break;
      }
      case 'plant': {
        const cv = sprite(b, (w, h) => {
          for (const sx of [10, w - 22]) { rect(sx, -22, 10, 40, '#6a6e7a'); for (let y = -20; y < 16; y += 8) rect(sx, y, 10, 3, y % 16 === 0 ? '#e8c040' : '#5a5e6a'); rect(sx - 1, -24, 12, 3, '#3a3e4a'); rect(sx, -22, 2, 40, '#8a8e9a'); }
          rect(0, 12, w, 6, '#4a4e5a'); rect(0, 12, w, 1, '#9a9eaa'); rect(0, 17, w, 1, '#3a3e48');
          wallFace(0, 18, w, h - 18, '#767a86', { panels: true, base: '#5a5e68' });
          for (let x = 6; x < w - 12; x += 18) { rect(x, 24, 12, 7, '#2a3040'); rect(x + 1, 25, 10, 5, night ? '#c8f0a8' : '#40506a'); rect(x + 1, 25, 10, 1, night ? '#e8ffd0' : '#6a7a90'); lights.push({ x: ox + x + 6, y: oy + 28, r: 16, c: 'rgba(160,255,180,0.4)' }); }
          // pipes
          rect(0, 34, w, 3, '#8a8e9a'); rect(0, 34, w, 1, '#b0b4c0'); rect(0, 36, w, 1, '#5a5e6a');
          const cx = w / 2; C.fillStyle = '#d8d8e0'; C.beginPath(); C.arc(cx, 26, 6, 0, Math.PI * 2); C.fill(); C.fillStyle = '#6a6e7a'; C.beginPath(); C.arc(cx, 26, 3.5, 0, Math.PI * 2); C.fill();
          const dx = b.door * 16;
          rect(dx + 1, h - 18, 14, 18, '#2a2e3a'); for (let i = 0; i < 14; i += 4) { rect(dx + 1 + i, h - 18, 2, 2, '#e8c040'); }
          rect(dx + 3, h - 14, 10, 14, '#3a3e4c'); rect(dx + 7, h - 14, 1, 14, '#22262e');
        });
        stamp(b, cv, { shadowTop: 16 });
        break;
      }
      case 'boat': {
        const cv = sprite(b, (w, h) => {
          // hull
          C.fillStyle = '#f4f4f4'; C.beginPath(); C.moveTo(-2, 16); C.lineTo(w + 2, 16); C.lineTo(w - 12, h); C.lineTo(10, h); C.closePath(); C.fill();
          C.fillStyle = '#d0d4dc'; C.beginPath(); C.moveTo(w * 0.62, 16); C.lineTo(w + 2, 16); C.lineTo(w - 12, h); C.lineTo(w * 0.55, h); C.closePath(); C.fill();
          rect(4, h - 12, w - 18, 3, '#3a58a8'); rect(6, h - 6, w - 22, 3, '#c83838');
          for (let x = 10; x < w - 16; x += 8) { rect(x, 22, 4, 4, '#3a4a68'); px(x, 22, '#a8d8f8'); }
          rect(-2, 15, w + 4, 2, '#8a8e98');
          // cabin
          rect(16, 0, w - 40, 16, '#fafafa'); rect(16, 0, w - 40, 3, '#3a58a8'); rect(16, 13, w - 40, 3, '#c8ccd4');
          for (let x = 20; x < w - 28; x += 9) { rect(x, 6, 6, 5, '#5a8ac0'); rect(x, 6, 6, 1, '#a8d8f8'); }
          // funnel
          rect(w - 30, -14, 8, 15, '#f4f4f4'); rect(w - 30, -10, 8, 3, '#c83838'); rect(w - 30, -14, 8, 1, '#2a2a30'); rect(w - 23, -14, 1, 15, '#c0c4cc');
        });
        stamp(b, cv, { shadow: false, ot: 0.55 });
        C.fillStyle = 'rgba(10,40,90,0.25)'; C.fillRect(ox + 12, oy + h, w - 24, 3);
        break;
      }
      case 'cave': {
        cliffBlock(map, b, ox, oy, w, h);
        rect(ox + w / 2 - 10, oy + h - 20, 20, 20, '#1e1410'); C.fillStyle = '#1e1410'; C.beginPath(); C.arc(ox + w / 2, oy + h - 20, 10, Math.PI, 0); C.fill();
        break;
      }
      case 'machine': {
        // the Null Prism: a dark tower with a pale beam
        const cv = sprite(b, (w, h) => {
          const cx = w / 2;
          rect(cx - 11, h - 14, 22, 14, '#3a3a4a'); rect(cx - 11, h - 14, 22, 2, '#5a5a6a');
          rect(cx - 6, 6, 12, h - 20, '#4a4a5c'); rect(cx - 6, 6, 3, h - 20, '#6a6a7c'); rect(cx + 4, 6, 2, h - 20, '#34344a');
          for (let y = 10; y < h - 16; y += 5) rect(cx - 4, y, 8, 1, '#8a8aa8');
          C.fillStyle = '#9a9ab0'; C.beginPath(); C.moveTo(cx, -8); C.lineTo(cx + 8, 4); C.lineTo(cx, 14); C.lineTo(cx - 8, 4); C.closePath(); C.fill();
          C.fillStyle = '#c8c8dc'; C.beginPath(); C.moveTo(cx, -8); C.lineTo(cx - 8, 4); C.lineTo(cx, 4); C.closePath(); C.fill();
        });
        stamp(b, cv, { shadowTop: 8 });
        break;
      }
    }
  }
  function cliffBlock(map, b, ox, oy, w, h) {
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) cliff({ grid: map.grid, w: map.w, h: map.h, baseTile: map.baseTile, border: '#' }, ox + x * 16, oy + y * 16, b.x + x, b.y + y);
  }

  function drawTile(map, ch, ox, oy, tx, ty, fr, night) {
    const ts = map.ts || 'out';
    if (ts === 'in') {
      switch (ch) {
        case '_': woodFloor(ox, oy, tx, ty); break;
        case '-': tileFloor(ox, oy, tx, ty); break;
        case 'z': gymFloor(map, ox, oy, tx, ty); break;
        case 'u': metalFloor(ox, oy, tx, ty); break;
        case 'x': crystalFloor(ox, oy, tx, ty, fr); break;
        case 'c': caveFloor(ox, oy, tx, ty); break;
        case 'W': return wall(map, ox, oy, tx, ty);
        case 'O': return windowTile(map, ox, oy, tx, ty, night);
        case 'n': counter(map, ox, oy, tx, ty); break;
        case 'B': bookshelf(map, ox, oy, tx, ty); break;
        case 't': table(map, ox, oy, tx, ty); break;
        case 'd': bed(map, ox, oy, tx, ty); break;
        case 'p': plant(map, ox, oy, tx, ty); break;
        case 'R': rug(map, ox, oy, tx, ty); break;
        case 'M': mat(map, ox, oy); break;
        case 'Q': pc(map, ox, oy, tx, ty, fr); break;
        case '$': healer(map, ox, oy, tx, ty, fr); break;
        case 'K': return stove(ox, oy, tx, ty);
        case 'Y': tv(map, ox, oy, tx, ty, fr); break;
        case 'S': return stairs(ox, oy);
        case 'G': return statue(map, ox, oy, tx, ty);
        case 'h': hedge(map, ox, oy, tx, ty); break;
        case 'q': return machine(ox, oy, tx, ty, fr);
        case '~': return water(map, ox, oy, tx, ty, fr);
        case 'L': { lava(ox, oy, tx, ty, fr); const up = tileAt(map, tx, ty - 1); if (up !== 'L') { rect(ox, oy, 16, 2, '#6a3a2a'); rect(ox, oy + 2, 16, 1, '#f8b060'); } return; }
        case 'J': return crystalPillar(ox, oy, tx, ty, fr);
        case 'C': return caveWall(map, ox, oy, tx, ty);
        case 'A': rect(ox, oy, 16, 16, '#101018'); return;
        case '=': return bridge(map, ox, oy, tx, ty, fr);
        case 'w': return dock(map, ox, oy, tx, ty, fr);
        default: floorFor(map, ox, oy, tx, ty);
      }
      // soft contact shadow where the floor meets the wall
      const up = tileAt(map, tx, ty - 1);
      if ((up === 'W' || up === 'O' || up === 'B' || up === 'K' || up === 'h') && !'WOBKCh'.includes(ch)) { rect(ox, oy, 16, 2, 'rgba(40,24,16,0.22)'); rect(ox, oy + 2, 16, 2, 'rgba(40,24,16,0.1)'); }
      return;
    }
    switch (ch) {
      case '.': if (map.baseTile && map.baseTile !== '.') base(map, ox, oy, tx, ty); else grass(ox, oy, tx, ty, false); break;
      case ',': grass(ox, oy, tx, ty, true); break;
      case ':': path(map, ox, oy, tx, ty); break;
      case ';': sand(map, ox, oy, tx, ty); break;
      case '"': tallGrass(map, ox, oy, tx, ty, false, fr); break;
      case '^': tallGrass(map, ox, oy, tx, ty, true, fr); break;
      case 'f': flowers(map, ox, oy, tx, ty, fr); break;
      case '~': water(map, ox, oy, tx, ty, fr); break;
      case '=': bridge(map, ox, oy, tx, ty, fr); break;
      case 'w': dock(map, ox, oy, tx, ty, fr); break;
      case '#': cliff(map, ox, oy, tx, ty); break;
      case 'v': ledge(map, ox, oy, tx, ty); break;
      case 'F': fence(map, ox, oy, tx, ty); break;
      case 'b': bush(map, ox, oy, tx, ty); break;
      case 'r': rock(map, ox, oy, tx, ty, false); break;
      case 's': sign(map, ox, oy, tx, ty); break;
      case 'l': lamp(map, ox, oy, tx, ty); break;
      case '*': snow(ox, oy, tx, ty); break;
      case 'a': ash(ox, oy, tx, ty); break;
      case 'L': lava(ox, oy, tx, ty, fr, map); break;
      case 'c': caveFloor(ox, oy, tx, ty); break;
      case 'C': caveWall(map, ox, oy, tx, ty); break;
      case 'o': rock(map, ox, oy, tx, ty, true); break;
      case 'e': rect(ox, oy, 16, 16, '#1e1410'); break;
      case 'x': crystalFloor(ox, oy, tx, ty, fr); break;
      case 'X': crystalPillar(ox, oy, tx, ty, fr); break;
      case 'u': metalFloor(ox, oy, tx, ty); break;
      case 'q': machine(ox, oy, tx, ty, fr); break;
      case 'V': return; // transparent: sky drawn behind
      default: base(map, ox, oy, tx, ty);
    }
    // shadows cast by raised ground just above
    const above = tileAt(map, tx, ty - 1);
    if (ch !== '#' && above === '#' && ch !== '~') { rect(ox, oy, 16, 2, 'rgba(20,24,40,0.24)'); rect(ox, oy + 2, 16, 1, 'rgba(20,24,40,0.12)'); }
    if (ch !== 'v' && above === 'v' && !isTall(ch)) rect(ox, oy, 16, 1, 'rgba(24,60,24,0.12)');
    if (ch !== 'C' && ch !== 'e' && (above === 'C')) { rect(ox, oy, 16, 3, 'rgba(24,12,6,0.28)'); rect(ox, oy + 3, 16, 2, 'rgba(24,12,6,0.14)'); }
  }

  const PAD = 16;
  const ANIM = { out: new Set('~f"^Lxq=wX'), in: new Set('~LxqYJ$Q') };
  // Build all layers for a map. Canvases carry PAD extra pixels on top so
  // canopies on the first row are not clipped; callers draw them at y - pad.
  function build(map, night) {
    const W2 = map.w * 16, H2 = map.h * 16, CH = H2 + PAD;
    const ts = map.ts || 'out';
    map._lights = [];
    map._depth = depthField(map);
    // 1) static ground
    const ground = mkCanvas(W2, CH);
    C = ground.ctx; C.setTransform(1, 0, 0, 1, 0, PAD);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) drawTile(map, map.grid[y][x], x * 16, y * 16, x, y, 0, night);
    C.setTransform(1, 0, 0, 1, 0, 0);
    postPass(ground.ctx, map, W2, CH, PAD);
    // 2) objects: trees, lamp heads, buildings
    const objs = mkCanvas(W2, CH);
    C = objs.ctx; C.setTransform(1, 0, 0, 1, 0, PAD);
    if (ts === 'out') {
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        const ch = map.grid[y][x];
        if (ch === 'T' || ch === 'P' || ch === 'k') {
          const below = tileAt(map, x, y + 1);
          if (below !== 'T' && below !== 'P') shadowAt(x * 16 + 9, y * 16 + 15, 8, 2, 0.26);
          C.drawImage(treeSprite(ch === 'P' ? 'pine' : ch === 'k' ? 'dead' : 'tree', hash2(x, y, 9) < 0.5 ? 1 : 0), x * 16 - TREE_OX, y * 16 - TREE_OY);
        }
        if (ch === 'l') { lampTop(x * 16, y * 16, night); map._lights.push({ x: x * 16 + 8, y: y * 16 - 3, r: 34, c: 'rgba(255,230,150,0.75)' }); }
      }
    }
    if (ts === 'in' && !night) {
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        if (map.grid[y][x] !== 'O' || tileAt(map, x, y + 1) === 'W' || tileAt(map, x, y + 1) === 'O') continue;
        C.fillStyle = 'rgba(255,248,214,0.16)';
        C.beginPath(); C.moveTo(x * 16 + 3, y * 16 + 16); C.lineTo(x * 16 + 13, y * 16 + 16); C.lineTo(x * 16 + 19, y * 16 + 42); C.lineTo(x * 16 + 7, y * 16 + 42); C.closePath(); C.fill();
        C.fillStyle = 'rgba(255,248,214,0.1)'; C.fillRect(x * 16 + 8, y * 16 + 16, 1, 24);
      }
    }
    for (const b of map.buildings || []) { if (b.cond && typeof checkCond === 'function' && !checkCond(b.cond)) continue; building(map, b, night); }
    C.setTransform(1, 0, 0, 1, 0, 0);
    postPass(objs.ctx, map, W2, CH, PAD);
    // 3) animation frames: copy the static ground, repaint animated tiles
    const animSet = ANIM[ts] || ANIM.out, anim = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (animSet.has(map.grid[y][x])) anim.push([x, y, map.grid[y][x]]);
    const frames = [];
    for (let fr = 0; fr < 4; fr++) {
      const c = mkCanvas(W2, CH);
      c.ctx.drawImage(ground, 0, 0);
      if (fr > 0 && anim.length) {
        C = c.ctx; C.setTransform(1, 0, 0, 1, 0, PAD);
        for (const [x, y, ch] of anim) { C.save(); C.beginPath(); C.rect(x * 16, y * 16 - 4, 16, 20); C.clip(); drawTile(map, ch, x * 16, y * 16, x, y, fr, night); C.restore(); }
        C.setTransform(1, 0, 0, 1, 0, 0);
        postPass(c.ctx, map, W2, CH, PAD);
      }
      c.ctx.drawImage(objs, 0, 0);
      frames.push(c);
    }
    // 4) overhead: the part of each canopy that reaches into the tile above
    const over = mkCanvas(W2, CH);
    if (ts === 'out') {
      const oc = over.ctx;
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        const ch = map.grid[y][x];
        if (ch === 'T' || ch === 'P') oc.drawImage(treeSprite(ch === 'P' ? 'pine' : 'tree', hash2(x, y, 9) < 0.5 ? 1 : 0), 0, 0, 20, TREE_OY, x * 16 - TREE_OX, y * 16 - TREE_OY + PAD, 20, TREE_OY);
      }
    }
    return { frames, over, pad: PAD };
  }

  // tall grass front overlay (drawn over characters standing in grass)
  const overlayCache = {};
  function grassOverlay(snowy, fr = 0, tx = 0, ty = 0) {
    const sway = ((fr + tx + (ty >> 1)) & 3) === 1 ? 1 : 0;
    const key = (snowy ? 's' : 'g') + sway;
    if (overlayCache[key]) return overlayCache[key];
    const out = mkCanvas(16, 10);
    out.ctx.drawImage(tallSprite(snowy, sway, 1), 0, 10, 16, 10, 0, 0, 16, 10);
    overlayCache[key] = out;
    return out;
  }
  // one border tile: ground only (trees are drawn separately so they can overlap)
  const borderCache = {};
  function borderGround(kind, baseTile) {
    const key = kind + (baseTile || '.');
    if (borderCache[key]) return borderCache[key];
    const cv = mkCanvas(16, 16);
    C = cv.ctx;
    const fake = { grid: [kind + kind + kind, kind + kind + kind, kind + kind + kind], w: 3, h: 3, baseTile, ts: 'out', border: kind };
    if (kind === 'T' || kind === 'P' || kind === 'k') base(fake, 0, 0, 1, 1);
    else if (kind !== 'V') drawTile(fake, kind, 0, 0, 1, 1, 0, false);
    postPass(cv.ctx, fake, 16, 16, 0);
    borderCache[key] = cv;
    return cv;
  }
  return {
    build, grassOverlay, treeSprite, drawTile, borderGround, TREE_OX, TREE_OY, PAD,
    isTree: ch => ch === 'T' || ch === 'P' || ch === 'k',
    set ctx(v) { C = v; },
  };
})();
