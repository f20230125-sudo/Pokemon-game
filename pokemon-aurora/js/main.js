'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Boot, game state, saving
// ─────────────────────────────────────────────────────────────────────────────
var G = null; // var so it is also window.G
function newGameState(name, gender) {
  return {
    name, gender, id: randInt(10000, 65535), money: 3000,
    party: [], box: [], bag: {}, dex: { seen: {}, caught: {} }, badges: {}, flags: {},
    defeated: {}, picked: {}, visited: {}, map: 'house', x: 2, y: 3, dir: 'down', time: 0,
    options: { textSpeed: 1, frame: 0, music: 3, sfx: 4, timeIdx: 0 },
    back: { map: 'dawnmere', x: 5, y: 6, dir: 'down' }, lastHeal: { map: 'house', x: 3, y: 3 }, repel: 0, starter: null,
  };
}
const Save = {
  key: 'pokemon-aurora-save-v1',
  exists() { try { return !!localStorage.getItem(this.key); } catch (e) { return false; } },
  write() {
    try {
      const ow = Game.scenes.find(s => s instanceof Overworld);
      if (ow) ow.syncG();
      const data = Object.assign({}, G, { party: G.party.map(m => m.toJSON()), box: G.box.map(m => m.toJSON()) });
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (e) { console.error(e); return false; }
  },
  load() {
    const d = JSON.parse(localStorage.getItem(this.key));
    G = Object.assign(newGameState(d.name, d.gender), d);
    G.party = d.party.map(Mon.from); G.box = (d.box || []).map(Mon.from);
    applyOptions();
    return G;
  },
};
let OW = null;
function startOverworld(fresh) {
  if (fresh) { G.map = 'house'; G.x = 2; G.y = 3; G.dir = 'down'; }
  applyOptions();
  OW = new Overworld();
  Game.replaceAll(OW);
  OW.load(G.map, G.x, G.y, G.dir);
  Game.fadeA = 1;
  OW.runScript((function* () {
    yield fadeIn(30);
    if (!fresh) OW.banner = new Banner(MAPS[G.map].name);
    const hk = OW.enterHook(); if (hk) yield* hk;
  })());
}

// small patch-ups that depend on every module being loaded
(function wire() {
  // Say: optional pre-draw hook (used for previews under dialogue)
  const sayDraw = Say.prototype.draw;
  Say.prototype.draw = function (c) { if (this.o.pre) this.o.pre(c); sayDraw.call(this, c); };
  // Overworld extras
  Overworld.prototype.rebuild = function () {
    for (const k of [...MapCache.keys()]) if (k.startsWith(this.map.id)) MapCache.delete(k);
    this.L = mapLayers(this.map.id, this.night || this.forceNight);
    this.buildSolid();
  };
  const owDraw = Overworld.prototype.draw;
  Overworld.prototype.draw = function (c) {
    owDraw.call(this, c);
    if (this.healing) {
      const cam = this.cam, h = this.healing;
      for (let i = 0; i < (h.shown || 0); i++) {
        const x = h.x * 16 - cam.x + 2 + (i % 3) * 4, y = h.y * 16 - cam.y + 3 + Math.floor(i / 3) * 3;
        const on = (this.t >> 3) % 2;
        c.fillStyle = on ? '#fff0a0' : '#f86060'; c.fillRect(x, y, 3, 2);
      }
    }
    if (this.auroraSky) { c.globalCompositeOperation = 'lighter'; drawAuroraOverlay(c, this.t, 1.2, 0); c.globalCompositeOperation = 'source-over'; }
  };
  // Ho-Oh circling in a grey sky on the summit
  const drawSky = Overworld.prototype.drawSky;
  Overworld.prototype.drawSky = function (c) {
    drawSky.call(this, c);
    if (this.hoohCircle) {
      const a = this.t * 0.012;
      const x = 128 + Math.cos(a) * 90, y = 40 + Math.sin(a) * 18;
      const spr = PokeArt.get('hooh', { frame: (this.t >> 3) % 2 });
      c.globalAlpha = 0.55; c.drawImage(silhouetteCachedGrey(spr), Math.round(x - 24), Math.round(y - 24), 48, 48); c.globalAlpha = 1;
    }
  };
  // make battles remember which Pokémon levelled so evolution only follows growth
  const afterBattle = Overworld.prototype.afterBattle;
  Overworld.prototype.afterBattle = function* (res, o = {}) {
    const B = Game.lastBattle;
    for (const m of G.party) m._leveledThisBattle = B ? B.leveled.has(m) : false;
    yield* afterBattle.call(this, res, o);
  };
  const benter = Battle.prototype.enter;
  Battle.prototype.enter = function () { Game.lastBattle = this; Sound.play(this.music); Game.fadeA = 0; void benter; };
})();

// ── debugging / automated test hooks ──
window.DEBUG = {
  newGame(name = 'Rowan', gender = 'm', starter = 'charmander', level = 5) {
    G = newGameState(name, gender);
    if (starter) G.flags.mom_intro = true;
    if (starter) { G.party.push(new Mon(starter, level, { ot: name })); G.starter = starter; G.flags.starter = true; G.flags.dex = true; G.flags.lab_intro_done = true; G.flags.sable_left_lab = true; G.flags['starter_' + starter + '_taken'] = true; G.flags['starter_' + COUNTER[starter][0] + '_taken'] = true; Dex.catch(starter); }
    Bag.add('pokeball', 10); Bag.add('potion', 5);
    return G;
  },
  strong() { G.party = [new Mon('charizard', 70, { moves: ['flamethrower', 'airslash', 'dragonpulse', 'slash'], ot: G.name }), new Mon('blastoise', 70, { moves: ['surf', 'icebeam', 'bite', 'rapidspin'], ot: G.name })]; },
  go(map, x, y, dir = 'down') { G.map = map; G.x = x; G.y = y; G.dir = dir; startOverworld(false); },
  wild(sp, lv) { OW.runScript(OW.wildBattle(sp, lv)); },
  trainer(party, cls = 'youngster') { OW.runScript(OW.battle({ cls, name: 'Test', art: cls, party })); },
  flag(k, v = true) { G.flags[k] = v; },
  give(sp, lv) { const m = new Mon(sp, lv); G.party.push(m); Dex.catch(sp); return m; },
  state() { const s = Game.top(); return { busy: !!(s && s.co && !s.co.done) || Game.fadeA > 0, scene: s && s.constructor.name, map: G && G.map, x: G && G.x, y: G && G.y, widgets: s && s.widgets ? s.widgets.map(w => w.constructor.name) : [], errors: Loop.errors.slice(-5) }; },
  step(n = 1) { Loop.advance(n); },
  // BFS path (list of directions) from the player to a tile on the current map
  path(tx, ty) {
    const ow = OW, m = ow.map, p = ow.player;
    const key = (x, y) => x + ',' + y, prev = new Map([[key(p.x, p.y), null]]), q = [[p.x, p.y]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) break;
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        let nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        if (ow.tile(nx, ny) === 'v' && m.ts !== 'in') { if (d !== 'down') continue; ny++; }
        if (!(nx === tx && ny === ty) && ow.blockedAt(nx, ny, p)) continue;
        if (nx === tx && ny === ty && ow.solid[ny][nx]) continue;
        const k = key(nx, ny); if (prev.has(k)) continue; prev.set(k, [x, y, d]); q.push([nx, ny]);
      }
    }
    const out = []; let k = key(tx, ty);
    if (!prev.has(k)) return null;
    while (prev.get(k)) { const [x, y, d] = prev.get(k); out.unshift(d); k = key(x, y); }
    return out;
  },
};

// ── boot ──
(function boot() {
  const q = new URLSearchParams(location.search);
  G = newGameState('', 'm');
  try { applyOptions(); } catch (e) { /* audio not ready */ }
  if (q.get('test')) { Loop.start(); return; }
  Game.push(new TitleScene());
  Loop.start();
})();
