'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Pixel-art toolkit: colour math, rasters, and a shape "Painter" that
//  produces crisp, shaded, outlined sprites without anti-aliasing.
// ─────────────────────────────────────────────────────────────────────────────
const Col = (() => {
  const cache = new Map();
  function rgb(h) {
    let v = cache.get(h);
    if (v) return v;
    let s = h.replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const n = parseInt(s, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(h, v);
    return v;
  }
  const hex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  function towards(h, target, amt) { let d = ((target - h + 540) % 360) - 180; return h + clamp(d, -amt, amt); }
  const memo = new Map();
  // shadow: darker, hue-shifted towards blue-violet (classic pixel-art shading)
  function shade(h, k = 1) {
    const key = 's' + h + k; if (memo.has(key)) return memo.get(key);
    const [r, g, b] = rgb(h); const [hh, s, l] = toHsl(r, g, b);
    const out = fromHsl(s < 0.08 ? hh : towards(hh, 250, 14 * k), clamp(s + 0.06 * k, 0, 1), clamp(l - 0.15 * k, 0, 1));
    memo.set(key, out); return out;
  }
  function light(h, k = 1) {
    const key = 'l' + h + k; if (memo.has(key)) return memo.get(key);
    const [r, g, b] = rgb(h); const [hh, s, l] = toHsl(r, g, b);
    const out = fromHsl(s < 0.08 ? hh : towards(hh, 55, 10 * k), clamp(s - 0.04 * k, 0, 1), clamp(l + 0.14 * k, 0, 0.97));
    memo.set(key, out); return out;
  }
  function dark(h, t = 0.62) { return mix(h, '#0e0a1a', t); }
  function pack(h) { const [r, g, b] = rgb(h); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; }
  function unpack(u) { return hex(u & 255, (u >>> 8) & 255, (u >>> 16) & 255); }
  function hueShift(h, deg, sat = 0, lig = 0) { const [r, g, b] = rgb(h); const [hh, s, l] = toHsl(r, g, b); return fromHsl(hh + deg, clamp(s + sat, 0, 1), clamp(l + lig, 0, 1)); }
  function grey(h) { const [r, g, b] = rgb(h); const y = r * 0.3 + g * 0.59 + b * 0.11; return hex(y, y, y); }
  // 5-step shading ramp: shadows cool and saturate, highlights warm and desaturate
  const ramps = new Map();
  function ramp(h, spread = 1) {
    const key = h + '|' + spread;
    let v = ramps.get(key);
    if (v) return v;
    v = [shade(h, 1.85 * spread), shade(h, 0.92 * spread), h, light(h, 0.8 * spread), light(h, 1.6 * spread)];
    ramps.set(key, v);
    return v;
  }
  return { rgb, hex, mix, shade, light, dark, pack, unpack, toHsl, fromHsl, hueShift, grey, ramp };
})();

class Raster {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint32Array(w * h); }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : 0; }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  toCanvas() {
    const c = mkCanvas(this.w, this.h);
    const id = c.ctx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.px);
    c.ctx.putImageData(id, 0, 0);
    return c;
  }
  flipH() {
    const { w, h, px } = this;
    for (let y = 0; y < h; y++) for (let x = 0; x < (w >> 1); x++) { const a = y * w + x, b = y * w + (w - 1 - x); const t = px[a]; px[a] = px[b]; px[b] = t; }
  }
  bbox() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.px[y * this.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1 };
  }
}

// 4x4 ordered dither, kept local so gfx.js has no load-order dependencies
const DITH4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const dith = (x, y) => DITH4[((y & 3) << 2) | (x & 3)];
const rampCache = new Map();
function packedRamp(col, spread) {
  const key = col + '|' + spread;
  let v = rampCache.get(key);
  if (!v) { v = Col.ramp(col, spread).map(Col.pack); rampCache.set(key, v); }
  return v;
}
const aoCache = new Map();
function packedAO(u, t) {
  const k = u * 31 + Math.round(t * 100);
  let v = aoCache.get(k);
  if (v === undefined) { v = Col.pack(Col.mix(Col.unpack(u), '#241c38', t)); aoCache.set(k, v); }
  return v;
}

const darkCache = new Map();
function packedDark(u, t = 0.55) {
  const k = u * 7 + Math.round(t * 100);
  let v = darkCache.get(k);
  if (v === undefined) { v = Col.pack(Col.dark(Col.unpack(u), t)); darkCache.set(k, v); }
  return v;
}

// Painter: draws in a logical coordinate space (default 64x64) scaled by s.
class Painter {
  constructor(w, h, s = 1) {
    this.w = w; this.h = h; this.s = s;
    this.base = new Raster(w, h);
    this.cur = this.base;
    this.f = 0; this.back = false;
    this.ox = 0; this.oy = 0;
  }
  mask() { return new Uint8Array(this.w * this.h); }
  tx(x) { return (x + this.ox) * this.s; }
  ty(y) { return (y + this.oy) * this.s; }

  // ── mask builders ──
  mEll(m, cx, cy, rx, ry, rot = 0) {
    const s = this.s; cx = this.tx(cx); cy = this.ty(cy); rx = Math.max(0.5, rx * s); ry = Math.max(0.5, ry * s);
    const a = -rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const R = Math.max(rx, ry) + 1;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(this.w - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(this.h - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = dx * c - dy * sn, v = dx * sn + dy * c;
      if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1.0) m[y * this.w + x] = 1;
    }
    return m;
  }
  mPoly(m, pts) {
    const P = pts.map(([x, y]) => [this.tx(x), this.ty(y)]);
    let y0 = Infinity, y1 = -Infinity;
    for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(this.h - 1, Math.ceil(y1));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0; i < P.length; i++) {
        const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + (sy - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.round(xs[i])), xb = Math.min(this.w - 1, Math.round(xs[i + 1]) - 1);
        for (let x = xa; x <= xb; x++) m[y * this.w + x] = 1;
      }
    }
    return m;
  }
  // thick curve through points (Catmull-Rom) with radius tapering r0 → r1
  mStroke(m, pts, r0, r1 = r0) {
    const s = this.s;
    const P = pts.map(([x, y]) => [this.tx(x), this.ty(y)]);
    const samples = [];
    if (P.length === 1) samples.push([P[0][0], P[0][1], 0]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(2, Math.ceil(len * 2));
      for (let j = 0; j <= n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        samples.push([x, y, (i + t) / Math.max(1, P.length - 1)]);
      }
    }
    for (const [x, y, t] of samples) {
      const r = Math.max(0.5, lerp(r0, r1, t) * s);
      if (r < 0.9) { const xi = Math.floor(x), yi = Math.floor(y); if (xi >= 0 && yi >= 0 && xi < this.w && yi < this.h) m[yi * this.w + xi] = 1; continue; }
      const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(this.w - 1, Math.ceil(x + r));
      const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(this.h - 1, Math.ceil(y + r));
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - x, dy = yy + 0.5 - y;
        if (dx * dx + dy * dy <= r * r) m[yy * this.w + xx] = 1;
      }
    }
    return m;
  }
  mRect(m, x, y, w, h) {
    const x0 = Math.max(0, Math.round(this.tx(x))), y0 = Math.max(0, Math.round(this.ty(y)));
    const x1 = Math.min(this.w, Math.round(this.tx(x + w))), y1 = Math.min(this.h, Math.round(this.ty(y + h)));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) m[yy * this.w + xx] = 1;
    return m;
  }

  // ── painting a mask with shading ──
  // Light comes from the upper left.  For every pixel we march toward the light
  // and away from it until we leave the shape; the ratio of those two distances
  // says where the pixel sits between the lit rim and the shadow rim, so the
  // shading follows the contour of whatever shape was drawn.
  // o: {flat, k (shadow bias), hl (spot highlight), rim, inside (clip to layer),
  //     sd (ramp spread), dir (shadow direction), dither}
  // Scans the mask along the light direction and records, for every pixel, how
  // far it sits from each end of the unbroken run it belongs to.
  scanRuns(m, sx, sy) {
    const w = this.w, h = this.h, n = w * h;
    let lt = this._lt, dk = this._dk;
    if (!lt || lt.length !== n) { lt = this._lt = new Int16Array(n); dk = this._dk = new Int16Array(n); }
    const run = this._run && this._run.length >= Math.max(w, h) * 2 ? this._run : (this._run = new Int32Array(Math.max(w, h) * 2 + 4));
    const flush = len => { for (let j = 0; j < len; j++) { const i = run[j]; lt[i] = j; dk[i] = len - 1 - j; } };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // only start a walk where the previous pixel on this line is off-canvas
      const px = x - sx, py = y - sy;
      if (px >= 0 && py >= 0 && px < w && py < h) continue;
      let cx = x, cy = y, len = 0;
      while (cx >= 0 && cy >= 0 && cx < w && cy < h) {
        const i = cy * w + cx;
        if (m[i]) run[len++] = i;
        else if (len) { flush(len); len = 0; }
        cx += sx; cy += sy;
      }
      if (len) flush(len);
    }
    return { lt, dk };
  }
  // ── painting a mask with shading ──
  // Light comes from the upper left.  Every pixel is placed on a ramp by where
  // it sits between the lit rim and the shadow rim of its own run, so shading
  // follows the contour of whatever shape was drawn.
  // o: {flat, k (shadow bias), hl (spot highlight), rim, inside (clip to layer),
  //     sd (ramp spread), dir (shadow direction), dither}
  paint(m, col, o = {}) {
    const L = this.cur, w = this.w, h = this.h;
    const base = Col.pack(col);
    const inside = o.inside ? this.clip || L : null;
    if (o.flat) {
      for (let i = 0; i < m.length; i++) if (m[i] && (!inside || inside.px[i])) L.px[i] = base;
      return;
    }
    const R = packedRamp(col, o.sd || 1);
    const dir = o.dir || [1, 1];
    const ax = Math.abs(dir[0]), ay = Math.abs(dir[1]);
    let sx = dir[0] >= 0 ? 1 : -1, sy = dir[1] >= 0 ? 1 : -1;
    if (ay > ax * 2.2) sx = 0; else if (ax > ay * 2.2) sy = 0;
    const { lt, dk } = this.scanRuns(m, sx, sy);
    const bias = (o.k != null ? (o.k - 1.7) * 0.045 : 0);
    const dth = o.dither != null ? o.dither : (this.s < 0.75 ? 0 : 0.05);
    // specular spot
    let hx = 0, hy = 0, hrx = 0, hry = 0;
    if (o.hl) {
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let i = 0; i < m.length; i++) if (m[i]) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const hs = typeof o.hl === 'number' ? o.hl : 1;
      hx = x0 + bw * 0.31; hy = y0 + bh * 0.28; hrx = Math.max(0.9, bw * 0.15 * hs); hry = Math.max(0.9, bh * 0.12 * hs);
    }
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      if (inside && !inside.px[i]) continue;
      const x = i % w, y = (i / w) | 0;
      const a = lt[i], b = dk[i];
      let u = (a + 0.5) / (a + b + 1) + bias + (dith(x, y) - 0.5) * dth;
      let c = u < 0.17 ? R[4] : u < 0.37 ? R[3] : u < 0.66 ? R[2] : u < 0.87 ? R[1] : R[0];
      if (o.rim && a === 0 && a + b > 1) c = R[4];
      if (o.hl && c !== R[0] && c !== R[1]) { const ex = (x + 0.5 - hx) / hrx, ey = (y + 0.5 - hy) / hry; if (ex * ex + ey * ey <= 1) c = R[4]; }
      L.px[i] = c;
    }
  }

  // ── convenient primitives (shaded by default) ──
  ell(cx, cy, rx, ry, col, o = {}) { this.paint(this.mEll(this.mask(), cx, cy, rx, ry, o.rot || 0), col, o); return this; }
  ball(cx, cy, rx, ry, col, o = {}) { return this.ell(cx, cy, rx, ry, col, Object.assign({ hl: true }, o)); }
  poly(pts, col, o = {}) { this.paint(this.mPoly(this.mask(), pts), col, o); return this; }
  stroke(pts, r0, r1, col, o = {}) { this.paint(this.mStroke(this.mask(), pts, r0, r1), col, o); return this; }
  rect(x, y, w, h, col, o = {}) { this.paint(this.mRect(this.mask(), x, y, w, h), col, Object.assign({ flat: true }, o)); return this; }
  // flat helpers
  fell(cx, cy, rx, ry, col, rot = 0) { return this.ell(cx, cy, rx, ry, col, { flat: true, rot }); }
  fpoly(pts, col) { return this.poly(pts, col, { flat: true }); }
  line(pts, r, col) { return this.stroke(pts, r, r, col, { flat: true }); }
  dot(x, y, col, size = 1) {
    const sz = Math.max(1, Math.round(size * this.s));
    const px = Math.floor(this.tx(x)), py = Math.floor(this.ty(y));
    const c = Col.pack(col);
    for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) this.cur.set(px + xx, py + yy, c);
    return this;
  }
  // cute Pokémon eye: dark oval, white shine, optional coloured iris
  eye(x, y, rx, ry, o = {}) {
    if (this.back) return this;
    const dark = o.dark || '#20182a';
    const AND = (a, b) => { for (let i = 0; i < a.length; i++) a[i] = a[i] && b[i]; return a; };
    const em = this.mEll(this.mask(), x, y, rx, ry, o.rot || 0);
    let pm = em;
    if (o.white) {
      this.paint(em, o.white, { flat: true });
      pm = AND(this.mEll(this.mask(), x + (o.px != null ? o.px : -0.25 * rx), y + (o.py || 0), rx * (o.pw || 0.6), ry * (o.ph || 0.75)), em);
      this.paint(pm, dark, { flat: true });
    } else this.paint(em, dark, { flat: true });
    if (o.iris) this.paint(AND(this.mEll(this.mask(), x + (o.ix || 0), y + ry * 0.4, rx * 0.85, ry * 0.55), pm), o.iris, { flat: true });
    if (o.shine !== false) this.dot(x - rx * 0.4 + (o.sx || 0), y - ry * 0.5 + (o.sy || 0), '#ffffff', o.shineSize || 1);
    return this;
  }
  // part: draw into a fresh layer, then composite with an inner outline
  part(fn, o = {}) {
    const prev = this.cur;
    const L = new Raster(this.w, this.h);
    this.cur = L;
    fn(this);
    this.cur = prev;
    // tiny sprites (icons) keep inner lines light and skip contact shadows so they stay readable
    const small = this.s < 0.75;
    this.composite(L, prev, o.outline !== false, small ? Math.min(0.4, (o.ot || 0.55) * 0.7) : (o.ot || 0.55), small ? 0 : (o.ao != null ? o.ao : 0.2));
    return this;
  }
  // draw only where the current layer already has pixels
  within(fn) {
    const prevClip = this.clip;
    this.clip = new Raster(this.w, this.h); this.clip.px.set(this.cur.px);
    const prev = this.cur; const L = new Raster(this.w, this.h); this.cur = L; fn(this); this.cur = prev;
    for (let i = 0; i < L.px.length; i++) if (L.px[i] && this.clip.px[i]) prev.px[i] = L.px[i];
    this.clip = prevClip;
    return this;
  }
  composite(L, dst, outline, t, ao = 0.2) {
    const w = this.w, h = this.h, s = L.px, d = dst.px;
    if (outline) {
      // contact shadow: the layer below darkens just beyond the new part's edge
      if (ao > 0) {
        const near = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (!s[i]) continue;
          for (let oy = 0; oy <= 2; oy++) for (let ox = 0; ox <= 2; ox++) {
            if (ox + oy === 0 || ox + oy > 3) continue;
            const nx = x + ox, ny = y + oy;
            if (nx < w && ny < h) { const j = ny * w + nx; if (!s[j] && d[j]) near[j] = 1; }
          }
        }
        for (let i = 0; i < near.length; i++) if (near[i]) d[i] = packedAO(d[i], ao);
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (s[i] || !d[i]) continue;
        let n = 0;
        if (x > 0 && s[i - 1]) n = s[i - 1]; else if (x < w - 1 && s[i + 1]) n = s[i + 1];
        else if (y > 0 && s[i - w]) n = s[i - w]; else if (y < h - 1 && s[i + w]) n = s[i + w];
        if (n) d[i] = packedDark(n, t);
      }
    }
    for (let i = 0; i < s.length; i++) if (s[i]) d[i] = s[i];
  }
  // final outer outline
  finish(o = {}) {
    const R = this.base, w = this.w, h = this.h, s = R.px;
    const out = new Uint32Array(s);
    const t = o.ot || 0.68;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (s[i]) continue;
      // an outline pixel sitting above/left of the shape catches the light
      let n = 0, lit = false;
      if (y < h - 1 && s[i + w]) { n = s[i + w]; lit = true; }
      else if (x < w - 1 && s[i + 1]) { n = s[i + 1]; lit = true; }
      else if (x > 0 && s[i - 1]) n = s[i - 1];
      else if (y > 0 && s[i - w]) n = s[i - w];
      if (n) out[i] = packedDark(n, lit ? t * 0.82 : t);
    }
    R.px = out;
    return R;
  }
}

// ── canvas post effects ─────────────────────────────────────────────────────
function tintCanvas(src, fn) {
  const c = mkCanvas(src.width, src.height);
  c.ctx.drawImage(src, 0, 0);
  const id = c.ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2];
  }
  c.ctx.putImageData(id, 0, 0);
  return c;
}
function silhouette(src, color) {
  const [r, g, b] = Col.rgb(color);
  return tintCanvas(src, () => [r, g, b]);
}
function greyCanvas(src, amt = 1) {
  return tintCanvas(src, (r, g, b) => { const y = r * 0.3 + g * 0.59 + b * 0.11; return [lerp(r, y, amt), lerp(g, y, amt), lerp(b, y, amt)]; });
}
function hueCanvas(src, deg, sat = 0, lig = 0) {
  const memo = new Map();
  return tintCanvas(src, (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    let v = memo.get(k);
    if (!v) { v = Col.rgb(Col.hueShift(Col.hex(r, g, b), deg, sat, lig)); memo.set(k, v); }
    return v;
  });
}
// in-place desaturation of a region of the main canvas, with a circular
// "colour returns" wavefront (used by the Greyfall effect)
function desaturateRegion(c, amount, wave) {
  if (amount <= 0) return;
  const id = c.getImageData(0, 0, W, H);
  const d = id.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let a = amount;
    if (wave) {
      const dist = Math.hypot(x - wave.x, y - wave.y);
      if (dist < wave.r - 10) a = 0; else if (dist < wave.r) a = amount * ((dist - (wave.r - 10)) / 10);
    }
    if (a <= 0) continue;
    const i = (y * W + x) * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = r * 0.3 + g * 0.59 + b * 0.11;
    const cool = lum * 0.96 + 4;
    d[i] = r + (cool - r) * a; d[i + 1] = g + (cool - g) * a; d[i + 2] = b + (lum * 1.02 + 6 - b) * a;
    if (wave && a > 0 && a < amount) { // sparkling rim
      const f = 1 - Math.abs(a / amount - 0.5) * 2;
      d[i] += 60 * f; d[i + 1] += 50 * f; d[i + 2] += 70 * f;
    }
  }
  c.putImageData(id, 0, 0);
}
