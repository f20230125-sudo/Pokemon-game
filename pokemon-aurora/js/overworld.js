'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Overworld: movement, collision, maps, NPCs, encounters, rendering, scripts
// ─────────────────────────────────────────────────────────────────────────────
const WALK = 16, RUN = 8;

class Ent {
  constructor(o) {
    Object.assign(this, o);
    this.px = this.x * 16; this.py = this.y * 16;
    this.dir = o.dir || 'down';
    this.moving = false; this.mt = 0; this.mdur = WALK; this.step = 0; this.jz = 0;
    this.home = { x: this.x, y: this.y };
    this.wanderT = 60 + rand(120);
  }
}

const MapCache = new Map();
function mapLayers(id, night) {
  const key = id + (night ? 'N' : 'D');
  if (MapCache.has(key)) return MapCache.get(key);
  const m = MAPS[id];
  const L = Tiles.build(m, night);
  L.lights = m._lights.slice();
  if (m.faded) { L.grey = L.frames.map(f => greyCanvas(f, 0.92)); L.greyOver = greyCanvas(L.over, 0.92); }
  MapCache.set(key, L);
  if (MapCache.size > 10) MapCache.delete(MapCache.keys().next().value);
  return L;
}

class Overworld {
  constructor() {
    this.opaque = true; this.widgets = []; this.t = 0;
    this.co = null; this.banner = null; this.particles = [];
    this.emotes = []; this.cam = { x: 0, y: 0 }; this.camOverride = null;
    this.restoreFx = null; this.encounterCooldown = 0;
    this.lockInput = 0;
  }
  // ── map loading ──
  load(id, x, y, dir, o = {}) {
    const m = MAPS[id];
    if (!m) throw new Error('no map ' + id);
    this.map = m;
    this.night = (m.ts !== 'in' && !m.dark && isNight() && !m.sky) || (o.night === true);
    this.L = mapLayers(id, this.night);
    G.map = id; G.mapName = m.name;
    if (m.region) G.visited[m.region] = true;
    this.buildSolid();
    this.player = this.player || new Ent({ x, y, look: G.gender === 'f' ? LOOKS.girl : LOOKS.boy, isPlayer: true });
    Object.assign(this.player, { x, y, px: x * 16, py: y * 16, moving: false, jz: 0 });
    this.player.look = G.gender === 'f' ? LOOKS.girl : LOOKS.boy;
    if (dir) this.player.dir = dir;
    this.spawnNpcs();
    this.particles = [];
    if (!o.keepMusic) this.playMapMusic();
    if (m.heal && m.ts === 'in') G.lastHeal = { map: id, x: 5, y: 5 };
    if (m.heal && m.ts !== 'in' && !G.lastHealSet) { /* outdoor heal fallbacks */ }
    this.syncG();
  }
  playMapMusic() {
    const m = this.map;
    let mus = m.music;
    if (m.musicFn && STORY[m.musicFn]) mus = STORY[m.musicFn]() || mus;
    if (G.musicOverride) mus = G.musicOverride;
    Sound.play(mus);
  }
  buildSolid() {
    const m = this.map;
    const solidSet = TSOLID[m.ts] || TSOLID.out;
    this.solid = [];
    for (let y = 0; y < m.h; y++) { this.solid.push([]); for (let x = 0; x < m.w; x++) this.solid[y].push(solidSet.has(m.grid[y][x])); }
    this.doors = [];
    for (const b of m.buildings) {
      if (b.cond && !checkCond(b.cond)) continue;
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (y >= 0 && x >= 0 && y < m.h && x < m.w) this.solid[y][x] = true;
      if (b.door != null && b.to) { const dx = b.x + b.door, dy = b.y + b.h - 1; this.solid[dy][dx] = false; this.doors.push({ x: dx, y: dy, b }); }
    }
  }
  spawnNpcs() {
    this.npcs = [];
    for (const d of this.map.npcs) {
      if (d.cond && !checkCond(d.cond)) continue;
      if (d.trainer && G.defeated[this.map.id + ':' + d.id] && d.cond && d.cond.startsWith('!')) { /* keep */ }
      const look = typeof d.look === 'string' ? LOOKS[d.look] : d.look;
      const e = new Ent(Object.assign({}, d, { def: d, look }));
      if (d.size === 2) e.big = true;
      this.npcs.push(e);
    }
    this.items = this.map.items.filter(it => !G.picked[it.id]);
  }
  npc(id) { return this.npcs.find(n => n.id === id); }
  syncG() { G.x = this.player.x; G.y = this.player.y; G.dir = this.player.dir; }

  // ── collision ──
  tile(x, y) { return tileAt(this.map, x, y); }
  blockedAt(x, y, who) {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (this.solid[y][x]) return true;
    for (const n of this.npcs) {
      if (n === who || n.hidden || n.ghost) continue;
      if (n.big) { if (x >= n.x && x <= n.x + 1 && y >= n.y && y <= n.y + 1) return true; continue; }
      if ((n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)) return true;
    }
    if (who !== this.player && ((this.player.x === x && this.player.y === y) || (this.player.moving && this.player.tx === x && this.player.ty === y))) return true;
    if (this.items.some(it => it.x === x && it.y === y)) return true;
    return false;
  }
  startMove(e, dir, dur = WALK, o = {}) {
    const [dx, dy] = DIRS[dir];
    e.dir = dir;
    e.fx = e.x; e.fy = e.y; e.tx = e.x + dx * (o.jump ? 2 : 1); e.ty = e.y + dy * (o.jump ? 2 : 1);
    e.moving = true; e.mt = 0; e.mdur = o.jump ? 20 : dur; e.jumping = !!o.jump; e.step++;
  }
  updateEnt(e) {
    if (!e.moving) return false;
    e.mt++;
    const t = Math.min(1, e.mt / e.mdur);
    e.px = lerp(e.fx * 16, e.tx * 16, t); e.py = lerp(e.fy * 16, e.ty * 16, t);
    e.jz = e.jumping ? Math.sin(t * Math.PI) * 10 : 0;
    if (e.mt >= e.mdur) {
      e.moving = false; e.x = e.tx; e.y = e.ty; e.px = e.x * 16; e.py = e.y * 16; e.jz = 0;
      if (e.jumping) { Sound.sfx('land'); e.jumping = false; this.dust(e); }
      this.stepFx(e);
      return true;
    }
    return false;
  }
  frameOf(e) {
    if (!e.moving) return 0;
    const t = e.mt / e.mdur;
    if (e.mdur <= RUN) return t < 0.5 ? 1 + (e.step % 2) : 0;
    return t >= 0.2 && t < 0.7 ? 1 + (e.step % 2) : 0;
  }

  // ── main update ──
  update() {
    this.t++;
    if (G) G.time++;
    for (const n of this.npcs) this.updateEnt(n);
    const arrived = this.updateEnt(this.player);
    if (this.banner) { this.banner.update(); if (!this.banner.alive) this.banner = null; }
    this.emotes = this.emotes.filter(em => ++em.t < em.life);
    this.updateParticles();
    if (this.restoreFx) this.restoreFx.t++;
    if (this.co) {
      this.co.update();
      if (this.co.done) { this.co = null; this.afterScript(); if (this.pendingHook) { const g = this.pendingHook; this.pendingHook = null; this.runScript(g); } }
      return;
    }
    if (arrived) { if (this.onArrive()) return; }
    if (this.player.moving) return;
    this.wanderNpcs();
    if (this.lockInput > 0) { this.lockInput--; return; }
    this.playerInput();
  }
  afterScript() {
    this.buildSolid();
    this.syncG();
    // trainers might see you after a cutscene
    this.checkTrainers();
  }
  runScript(gen) { this.co = new Co(gen, this); this.co.update(); }
  playerInput() {
    const p = this.player;
    if (Input.pressed('start')) { Sound.sfx('select'); Game.push(new StartMenu(this)); return; }
    if (Input.pressed('a')) { if (this.interact()) return; }
    const d = Input.dir();
    if (!d) { p.turnT = 0; return; }
    if (p.dir !== d && !Input.pressed(d) && p.turnT == null) p.turnT = 0;
    if (p.dir !== d) { p.dir = d; p.turnT = 5; return; }
    if (p.turnT > 0) { p.turnT--; return; }
    this.tryMove(d);
  }
  tryMove(d) {
    const p = this.player;
    const [dx, dy] = DIRS[d];
    const nx = p.x + dx, ny = p.y + dy;
    const m = this.map;
    const running = (Input.held('b') || Input.held('run')) && m.ts !== 'in';
    // leaving the map through a connection
    if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) {
      const side = nx < 0 ? 'west' : nx >= m.w ? 'east' : ny < 0 ? 'north' : 'south';
      const c = m.conn[side];
      if (c) { this.startMove(p, d, running ? RUN : WALK); p.pendingConn = { side, c }; return; }
      this.bump(); return;
    }
    const tt = this.tile(nx, ny);
    if (tt === 'v' && d === 'down' && m.ts !== 'in') {
      if (!this.blockedAt(nx, ny + 1, p)) { Sound.sfx('jump'); this.startMove(p, d, WALK, { jump: true }); return; }
    }
    if (tt === 'v' && m.ts !== 'in') { this.bump(); return; }
    if (this.blockedAt(nx, ny, p)) {
      // locked door?
      this.bump(); return;
    }
    // locked building doors
    const door = this.doors.find(o => o.x === nx && o.y === ny);
    if (door && door.b.lockedFlag && !G.flags[door.b.lockedFlag] && d === 'up') {
      if (door.b.lockScript) { this.runScript(STORY[door.b.lockScript](this, door.b)); return; }
      this.runScript((function* () { Sound.sfx('bump'); yield new Say(door.b.locked); })());
      return;
    }
    this.startMove(p, d, running ? RUN : WALK);
    if (this.tile(nx, ny) === '"' || this.tile(nx, ny) === '^') Sound.sfx('grass');
  }
  // little world reactions to footsteps
  stepFx(e) {
    const m = this.map; if (m.ts === 'in' || e.hidden) return;
    const t = tileAt(m, e.x, e.y);
    const soft = t === ';' || t === '*' || (t === ':' && m.baseTile === '*') || (t === '.' && m.baseTile === '*');
    this.prints = (this.prints || []).filter(p => p.t < 240);
    if (soft) { this.prints.push({ x: e.px, y: e.py, dir: e.dir, t: 0, snow: t !== ';', alt: (e.step || 0) & 1 }); if (this.prints.length > 40) this.prints.shift(); }
    if (t === '"' || t === '^') {
      this.bits = this.bits || [];
      const col = t === '^' ? ['#74bcac', '#eef9fb'] : ['#62bb56', '#94da74'];
      for (let i = 0; i < 5; i++) this.bits.push({ x: e.px + 4 + Math.random() * 8, y: e.py + 10, vx: (Math.random() - 0.5) * 1.1, vy: -0.8 - Math.random() * 0.9, t: 0, col: col[i & 1] });
    }
  }
  dust(e) {
    this.puffs = this.puffs || [];
    for (const dx of [-3, 3]) this.puffs.push({ x: e.px + 8 + dx, y: e.py + 14, vx: dx * 0.12, t: 0 });
  }
  bump() {
    const p = this.player;
    if ((this.t - (this.lastBump || -99)) > 18) { Sound.sfx('bump'); this.lastBump = this.t; }
    p.bumpT = (p.bumpT || 0) + 1;
  }
  // called when the player finishes a step; returns true if it started something
  onArrive() {
    const p = this.player, m = this.map;
    if (p.pendingConn) {
      const { side, c } = p.pendingConn; p.pendingConn = null;
      const to = MAPS[c.map];
      let nx = p.x, ny = p.y;
      if (side === 'north') { nx = p.x + c.off; ny = to.h - 1; }
      if (side === 'south') { nx = p.x + c.off; ny = 0; }
      if (side === 'west') { ny = p.y + c.off; nx = to.w - 1; }
      if (side === 'east') { ny = p.y + c.off; nx = 0; }
      const oldRegion = m.region, oldMusic = Sound.current();
      this.load(c.map, nx, ny, p.dir, { keepMusic: true });
      this.playMapMusic();
      if (MAPS[c.map].name !== m.name || oldRegion !== MAPS[c.map].region) this.banner = new Banner(MAPS[c.map].name);
      void oldMusic;
      this.onEnterMap();
      return true;
    }
    this.syncG();
    if (G.repel > 0) { G.repel--; if (G.repel === 0) { this.runScript((function* () { yield new Say('The Repel’s effect wore off...'); })()); return true; } }
    // warps & doors
    const door = this.doors.find(o => o.x === p.x && o.y === p.y);
    if (door) { this.runScript(this.enterDoor(door.b)); return true; }
    const w = m.warps.find(o => o.x === p.x && o.y === p.y);
    if (w) { this.runScript(this.doWarp(w)); return true; }
    // triggers
    for (const tr of m.triggers) {
      if (p.x >= tr.x && p.x < tr.x + tr.w && p.y >= tr.y && p.y < tr.y + tr.h) {
        if (tr.cond && !checkCond(tr.cond)) continue;
        if (tr.once && G.flags[tr.once]) continue;
        if (tr.once) G.flags[tr.once] = true;
        this.runScript(STORY[tr.script](this, tr));
        return true;
      }
    }
    if (this.checkTrainers()) return true;
    if (this.checkEncounter()) return true;
    return false;
  }
  *enterDoor(b) {
    const p = this.player;
    Sound.sfx('door');
    yield 6;
    if (MAPS[this.map.id].ts !== 'in') G.back = { map: this.map.id, x: p.x, y: p.y + 1, dir: 'down' };
    yield fadeOut(14);
    this.load(b.to.map, b.to.tx, b.to.ty, 'up');
    yield 4;
    yield fadeIn(14);
    const hk = this.enterHook(); if (hk) yield* hk;
  }
  *doWarp(w) {
    const p = this.player;
    const isStairs = this.tile(w.x, w.y) === 'S';
    Sound.sfx(isStairs ? 'stairs' : 'door');
    yield fadeOut(14);
    let dest = w;
    if (w.to === '@back') dest = { to: G.back.map, tx: G.back.x, ty: G.back.y, dir: 'down' };
    const toMap = MAPS[dest.to];
    if (toMap.ts !== 'in' || this.map.ts === 'in') { /* keep back */ }
    this.load(dest.to, dest.tx, dest.ty, dest.dir || p.dir);
    if (this.map.name !== MAPS[dest.to].name) { /* noop */ }
    yield 4;
    yield fadeIn(14);
    if (this.map.ts !== 'in' && dest.to !== w.to) { /* back outdoors */ }
    if (MAPS[dest.to].ts !== 'in' || dest.to === 'tunnel' || dest.to.startsWith('spire') || dest.to === 'summit' || dest.to === 'cinderfall' || dest.to === 'route3') this.banner = new Banner(MAPS[dest.to].name);
    const hk = this.enterHook(); if (hk) yield* hk;
  }
  enterHook() {
    const hook = STORY.onEnter && STORY.onEnter[this.map.id];
    return hook ? hook(this) : null;
  }
  onEnterMap() {
    const g = this.enterHook();
    if (!g) return;
    if (this.co && !this.co.done) { this.pendingHook = g; return; }
    this.runScript(g);
  }
  warpTo(map, x, y, dir) { this.load(map, x, y, dir); }

  // ── trainers ──
  checkTrainers() {
    const p = this.player;
    for (const n of this.npcs) {
      const tr = n.def && n.def.trainer;
      if (!tr || G.defeated[this.map.id + ':' + n.id] || n.hidden) continue;
      const sight = tr.sight || 3;
      const [dx, dy] = DIRS[n.dir];
      for (let k = 1; k <= sight; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (x === p.x && y === p.y) { this.runScript(this.trainerSpotted(n, k)); return true; }
        if (this.solid[y] === undefined || this.solid[y][x] === undefined || this.solid[y][x] || this.npcs.some(o => o !== n && o.x === x && o.y === y)) break;
      }
    }
    return false;
  }
  *trainerSpotted(n, dist) {
    const tr = n.def.trainer;
    const ashen = tr.cls === 'grunt' || tr.cls === 'gruntf' || tr.cls === 'admin';
    Sound.play(ashen ? 'eyes_ashen' : 'eyes');
    Sound.sfx('exclaim');
    yield this.emote(n, '!');
    for (let k = 1; k < dist; k++) yield* this.moveEnt(n, n.dir);
    this.face(this.player, OPP[n.dir]);
    yield* this.trainerBattle(n);
  }
  *trainerBattle(n) {
    const tr = n.def.trainer;
    yield new Say(tr.intro, { color: n.def.g || 'n', name: tr.title || `${TRAINER_CLASSES[tr.cls].title} ${tr.name}` });
    const res = yield* this.battle(tr);
    if (res === 'win') {
      G.defeated[this.map.id + ':' + n.id] = true;
      if (tr.onWin) yield* STORY[tr.onWin](this, n);
    }
  }
  *battle(tr, o = {}) {
    const party = tr.party.map(([sp, lv, moves]) => new Mon(sp, lv, { moves, shiny: false }));
    const title = tr.title || `${TRAINER_CLASSES[tr.cls].title} ${tr.name}`;
    const trainer = { cls: tr.cls, title: tr.title === 'Ashen Grunt' ? 'Ashen Grunt' : title, art: tr.art, party, lose: tr.lose, win: tr.win, prize: tr.prize, items: (tr.items || []).slice(), smart: tr.smart, intro2: tr.intro2 };
    for (const m of party) Dex.see(m.sp);
    const music = o.music || tr.music || (tr.cls === 'leader' ? 'battle_gym' : tr.cls === 'rival' ? 'battle_rival' : tr.cls === 'boss' ? 'battle_boss' : 'battle_trainer');
    yield new BattleTransition('trainer', music);
    const B = new Battle({ trainer, env: o.env || this.map.env || (this.map.ts === 'in' ? 'gym' : 'grass'), music, canLose: o.canLose, victory: o.victory, faded: o.faded });
    const res = yield new SceneWait(B);
    yield* this.afterBattle(res, o);
    return res;
  }
  *wildBattle(sp, lv, o = {}) {
    const mon = new Mon(sp, lv, o.mon || {});
    Dex.see(sp);
    const music = o.music || 'battle_wild';
    yield new BattleTransition('wild', music);
    const zone = this.inFaded(this.player.x, this.player.y);
    const B = new Battle({ wild: mon, env: o.env || this.map.env || 'grass', music, noRun: o.noRun, smart: o.smart, appearText: o.appearText, faded: zone && !o.color });
    const res = yield new SceneWait(B);
    yield* this.afterBattle(res, o);
    return res;
  }
  *afterBattle(res, o = {}) {
    // evolutions
    if (res !== 'lose' || o.canLose) {
      for (const m of G.party) {
        if (m.fainted) continue;
        const into = m.evoTarget();
        if (into && m._leveledThisBattle !== false) {
          Game.fadeA = 0;
          yield new SceneWait(new EvolutionScene(m, into));
        }
      }
    }
    if (res === 'lose' && !o.canLose) {
      Game.fadeA = 1;
      this.whiteOut();
      yield 20;
      yield fadeIn(24);
      yield new Say(G.lastHeal && G.lastHeal.map === 'house' ? 'Mom: Oh, sweetie! You look exhausted. Rest up, and try again!' : 'Your Pokémon have been healed. Please be careful out there!', { color: 'f' });
      return;
    }
    if (o.canLose) for (const m of G.party) if (m.fainted) m.hp = 1;
    this.playMapMusic();
    yield fadeIn(16);
  }
  whiteOut() {
    for (const m of G.party) m.heal();
    const h = G.lastHeal || { map: 'house', x: 3, y: 3 };
    const m = MAPS[h.map];
    let x = h.x, y = h.y;
    if (m.id.startsWith('center')) { x = 5; y = 4; }
    G.back = G.back || { map: 'dawnmere', x: 5, y: 6 };
    const hb = { center_moss: { map: 'mossgrove', x: 4, y: 6 }, center_brine: { map: 'brinecrest', x: 3, y: 5 }, center_cinder: { map: 'cinderfall', x: 4, y: 5 }, cabin: { map: 'frostveil', x: 17, y: 29 } }[h.map];
    if (hb) G.back = { map: hb.map, x: hb.x, y: hb.y, dir: 'down' };
    this.load(h.map, x, y, 'up');
  }
  checkEncounter() {
    const p = this.player, m = this.map, enc = m.encounters;
    if (!enc || this.encounterCooldown-- > 0) return false;
    const t = this.tile(p.x, p.y);
    let table = null;
    if ((t === '"' || t === '^') && enc.grass) table = enc.grass;
    else if (m.env === 'cave' && enc.cave && t === 'c') table = enc.cave;
    if (!table) return false;
    if (Math.random() > (enc.rate || 0.1)) return false;
    const list = (isNight() && table.night) ? table.night : table.day;
    const total = list.reduce((a, r) => a + r[3], 0);
    let r = Math.random() * total, pickd = list[0];
    for (const row of list) { r -= row[3]; if (r <= 0) { pickd = row; break; } }
    const lv = randInt(pickd[1], pickd[2]);
    const lead = G.party.find(mm => !mm.fainted);
    if (G.repel > 0 && lead && lv < lead.level) return false;
    this.encounterCooldown = 3;
    this.runScript(this.wildBattle(pickd[0], lv));
    return true;
  }

  // ── interaction ──
  interact() {
    const p = this.player;
    const [dx, dy] = DIRS[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    if (this.tile(tx, ty) === 'n' && this.map.ts === 'in') { tx += dx; ty += dy; }
    const n = this.npcs.find(o => !o.hidden && (o.big ? tx >= o.x && tx <= o.x + 1 && ty >= o.y && ty <= o.y + 1 : o.x === tx && o.y === ty));
    if (n) { this.runScript(this.talkTo(n)); return true; }
    const it = this.items.find(o => o.x === tx && o.y === ty);
    if (it) { this.runScript(this.pickItem(it)); return true; }
    const sg = this.map.signs.find(o => o.x === p.x + dx && o.y === p.y + dy);
    if (sg) { this.runScript((function* () { for (const l of [].concat(sg.text)) yield new Say(l); })()); return true; }
    const ch = this.tile(p.x + dx, p.y + dy);
    const flavor = this.map.ts === 'in' ? { B: 'It’s crammed with books about Pokémon and the aurora.', Y: 'A documentary is on: “The Veil — Lumira’s Living Sky.”', K: 'Something delicious is simmering.', d: 'A cozy bed. It smells like sunshine.', G: 'A Pokémon statue. The plaque lists the Gym’s greatest challengers.', q: 'A machine hums, pulling pale light into glass tubes.', J: 'A pillar of living crystal. Faint colors swirl inside it.' }[ch] : { '~': null, X: 'The crystal is cold. Faint colors flicker deep inside.' }[ch];
    if (flavor) { this.runScript((function* () { yield new Say(flavor); })()); return true; }
    return false;
  }
  *talkTo(n) {
    const d = n.def;
    if (!d.ball && !d.obj && !d.poke) this.faceTo(n, this.player);
    if (d.cry || d.poke) Sound.cry(d.cry || d.poke);
    if (d.trainer && !G.defeated[this.map.id + ':' + n.id]) { yield* this.trainerBattle(n); return; }
    if (d.trainer) { yield new Say(d.trainer.after, { color: d.g || 'n' }); return; }
    if (d.script && d.script !== 'none' && STORY[d.script]) { yield* STORY[d.script](this, n); return; }
    let text = d.text;
    if (d.alt && checkCond(d.alt.flag)) text = d.alt.text;
    if (text) for (const l of [].concat(text)) yield new Say(l, { color: d.g || 'n' });
  }
  *pickItem(it) {
    G.picked[it.id] = true;
    this.items = this.items.filter(o => o !== it);
    yield* this.give(it.item, it.n || 1, true);
  }

  // ── script API ──
  say(t, o) { return new Say(t, o); }
  wait(n) { return new Wait(n); }
  face(e, d) { e.dir = d; }
  faceTo(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? 'right' : 'left'; else if (dy !== 0) e.dir = dy > 0 ? 'down' : 'up';
  }
  *moveEnt(e, dir, speed = WALK) {
    this.startMove(e, dir, speed);
    while (e.moving) yield 1;
    if (e === this.player) this.syncG();
  }
  // path: string like "uu ll d" (u/d/l/r letters, optional digits)
  *move(e, path, speed = WALK) {
    const map = { u: 'up', d: 'down', l: 'left', r: 'right' };
    for (const tok of path.replace(/\s+/g, '').match(/[udlr]\d*/g) || []) {
      const n = tok.length > 1 ? +tok.slice(1) : 1;
      for (let k = 0; k < n; k++) yield* this.moveEnt(e, map[tok[0]], speed);
    }
  }
  *moveAll(pairs) { // [[ent, path], ...] in parallel
    const gens = pairs.map(([e, p, s]) => this.move(e, p, s));
    yield new Par(gens, this);
  }
  emote(e, kind, life = 34) { const em = { e, kind, t: 0, life }; this.emotes.push(em); return new Wait(life); }
  *give(item, n = 1, found) {
    const it = ITEMS[item];
    Bag.add(item, n);
    const cur = Sound.current();
    Sound.jingle('item', cur);
    yield new Say(found ? `${G.name} found ${n > 1 ? n + ' ' : it.name.match(/^[AEIOU]/) ? 'an ' : 'a '}${it.name}${n > 1 && !it.name.endsWith('s') ? 's' : ''}!` : `${G.name} received ${n > 1 ? n + ' ' : it.name.match(/^[AEIOU]/) ? 'an ' : 'a '}${it.name}${n > 1 && !it.name.endsWith('s') ? 's' : ''}!`, { wait: 1 });
    yield new Say(`${G.name} put the ${it.name} in the ${{ items: 'Items', balls: 'Poké Balls', key: 'Key Items', tms: 'TMs' }[it.pocket]} Pocket.`);
  }
  *givePoke(sp, lv, o = {}) {
    const m = new Mon(sp, lv, Object.assign({ ot: G.name, met: this.map.name }, o));
    Dex.catch(sp);
    Sound.jingle('caught', Sound.current());
    yield new Say(`${G.name} received ${m.name}!`, { wait: 1 });
    const r = yield* ask(`Give a nickname to ${m.name}?`);
    if (r === 0) { const nm = yield new SceneWait(new NameEntry({ title: `${m.S.name}’s nickname?`, max: 10, icon: sp })); if (nm) m.nick = nm; }
    if (G.party.length < 6) G.party.push(m); else { G.box.push(m); yield new Say(`${m.name} was sent to the PC Box.`); }
    return m;
  }
  heal() { for (const m of G.party) m.heal(); }
  *warp(map, x, y, dir, o = {}) {
    yield fadeOut(o.frames || 18, o.color || '#000');
    this.load(map, x, y, dir, o);
    yield 6;
    yield fadeIn(o.frames || 18);
  }
  *restore(zoneIdx, flag) {
    const z = this.map.faded[zoneIdx];
    const cx = (z.cx != null ? z.cx : z.x + z.w / 2) * 16 + 8, cy = (z.cy != null ? z.cy : z.y + z.h / 2) * 16 + 8;
    this.restoreFx = { zone: z, x: cx, y: cy, t: 0 };
    Sound.sfx('colorBurst');
    Game.shake(1, 20);
    const maxR = 600;
    while (this.restoreFx.t < 110) { this.restoreFx.r = Ease.inOut(this.restoreFx.t / 110) * maxR; yield 1; }
    G.flags[flag] = true;
    this.restoreFx = null;
    Sound.sfx('shimmer');
  }
  *badge(color, name) {
    G.badges[color] = true; G.flags['badge_' + color] = true;
    Sound.play('badge', { restart: true, onEnd: () => this.playMapMusic() });
    yield new Say(`${G.name} received the ${name}!`, { wait: 1 });
  }
  pan(tx, ty) { this.camOverride = { x: tx * 16 + 8 - W / 2, y: ty * 16 + 8 - H / 2 + 4, cur: this.camOverride ? this.camOverride.cur : { x: this.cam.x, y: this.cam.y } }; }
  *panTo(tx, ty, frames = 40) {
    const from = { x: this.cam.x, y: this.cam.y };
    const to = { x: tx * 16 + 8 - W / 2, y: ty * 16 + 8 - H / 2 };
    for (let i = 1; i <= frames; i++) { const k = Ease.inOut(i / frames); this.camOverride = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) }; yield 1; }
  }
  *panBack(frames = 30) {
    if (!this.camOverride) return;
    const from = { x: this.camOverride.x, y: this.camOverride.y };
    for (let i = 1; i <= frames; i++) { const k = Ease.inOut(i / frames); const t = this.playerCam(); this.camOverride = { x: lerp(from.x, t.x, k), y: lerp(from.y, t.y, k) }; yield 1; }
    this.camOverride = null;
  }
  addNpc(spec) { const look = typeof spec.look === 'string' ? LOOKS[spec.look] : spec.look; const e = new Ent(Object.assign({}, spec, { def: spec, look })); if (spec.size === 2) e.big = true; this.npcs.push(e); return e; }
  removeNpc(id) { this.npcs = this.npcs.filter(n => n.id !== id); }

  // ── NPC wandering ──
  wanderNpcs() {
    for (const n of this.npcs) {
      if (n.moving || !n.def) continue;
      if (n.def.move === 'wander') {
        if (--n.wanderT > 0) continue;
        n.wanderT = 70 + rand(140);
        const d = pick(['up', 'down', 'left', 'right']);
        const [dx, dy] = DIRS[d];
        const nx = n.x + dx, ny = n.y + dy;
        if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2 || this.blockedAt(nx, ny, n) || this.tile(nx, ny) === 'v') { n.dir = d; continue; }
        const door = this.doors.find(o => o.x === nx && o.y === ny); if (door) continue;
        this.startMove(n, d, 20);
      } else if (n.def.move === 'look') {
        if (--n.wanderT > 0) continue;
        n.wanderT = 90 + rand(160); n.dir = pick(['up', 'down', 'left', 'right']);
      }
    }
  }

  // ── rendering ──
  playerCam() {
    const p = this.player, m = this.map;
    let x = Math.round(p.px + 8 - W / 2), y = Math.round(p.py + 8 - H / 2);
    if (m.ts === 'in' || m.sky) {
      const mw = m.w * 16, mh = m.h * 16;
      x = mw <= W ? Math.round((mw - W) / 2) : clamp(x, 0, mw - W);
      y = mh <= H - 16 ? Math.round((mh - H) / 2) + 8 : clamp(y, -8, mh - H + 8);
    }
    return { x, y };
  }
  inFaded(x, y) {
    const zs = this.map.faded || [];
    return zs.find(z => !G.flags[z.until] && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
  }
  draw(c) {
    const m = this.map;
    const cam = this.camOverride ? { x: Math.round(this.camOverride.x), y: Math.round(this.camOverride.y) } : this.playerCam();
    this.cam = cam;
    const fr = Math.floor(this.t / 18) % 4;
    // backdrop
    if (m.sky) this.drawSky(c);
    else { c.fillStyle = m.ts === 'in' ? '#0a0a12' : '#000'; c.fillRect(0, 0, W, H); }
    // border tiles outside the map
    if (m.ts !== 'in' && !m.sky) this.drawBorder(c, cam, fr);
    // neighbours
    for (const [side, cn] of Object.entries(m.conn)) this.drawNeighbour(c, side, cn, cam, fr);
    const L = this.L;
    c.drawImage(L.frames[fr], -cam.x, -cam.y - L.pad);
    this.drawFadedLayer(c, L.grey && L.grey[fr], cam);
    this.drawPrints(c, cam);
    // ground items
    for (const it of this.items) this.drawItemBall(c, it.x * 16 - cam.x, it.y * 16 - cam.y);
    // entities sorted by y
    const ents = this.npcs.filter(n => !n.hidden).concat(this.player.hidden ? [] : [this.player]);
    ents.sort((a, b) => (a.py + (a.big ? 16 : 0)) - (b.py + (b.big ? 16 : 0)));
    for (const e of ents) this.drawEnt(c, e, cam);
    // overhead canopies
    c.drawImage(L.over, -cam.x, -cam.y - L.pad);
    this.drawFadedLayer(c, L.greyOver, cam);
    if (m.ts !== 'in' && !m.sky) this.drawBorderFront(c, cam);
    this.drawBits(c, cam);
    this.drawSmoke(c, cam);
    this.drawCloudShadows(c, cam);
    for (const [side, cn] of Object.entries(m.conn)) this.drawNeighbour(c, side, cn, cam, fr, true);
    this.drawWeather(c, cam);
    this.drawLighting(c, cam);
    if (this.puffs && this.puffs.length) {
      for (const p of this.puffs) { p.t++; p.x += p.vx; const r = 1 + p.t / 5, a = 1 - p.t / 18; c.fillStyle = `rgba(240,240,230,${a})`; c.fillRect(Math.round(p.x - cam.x - r), Math.round(p.y - cam.y - r / 2), Math.round(r * 2), Math.round(r)); }
      this.puffs = this.puffs.filter(p => p.t < 18);
    }
    for (const em of this.emotes) this.drawEmote(c, em, cam);
    if (this.banner) this.banner.draw(c);
    if (this.restoreFx) this.drawRestoreRing(c, cam);
  }
  drawFadedLayer(c, grey, cam) {
    if (!grey) return;
    for (const z of this.map.faded) {
      if (G.flags[z.until]) continue;
      // feathered edge: a few expanding rects at decreasing opacity
      for (const [pad, alpha] of [[10, 0.25], [5, 0.5], [0, 1]]) {
        c.save();
        c.globalAlpha = alpha;
        c.beginPath();
        c.rect(z.x * 16 - cam.x - pad, z.y * 16 - cam.y - 8 - pad, z.w * 16 + pad * 2, z.h * 16 + 8 + pad * 2);
        if (this.restoreFx && this.restoreFx.zone === z) { c.arc(this.restoreFx.x - cam.x, this.restoreFx.y - cam.y, Math.max(0, this.restoreFx.r || 0), 0, Math.PI * 2, true); }
        c.clip('evenodd');
        c.drawImage(grey, -cam.x, -cam.y - this.L.pad);
        c.restore();
      }
    }
  }
  drawRestoreRing(c, cam) {
    const f = this.restoreFx; if (!f.r) return;
    const x = f.x - cam.x, y = f.y - cam.y;
    const hues = ['#ff8080', '#ffc860', '#fff080', '#80f0a0', '#80c8ff', '#c090ff'];
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2 + f.t * 0.02;
      const px = x + Math.cos(a) * f.r, py = y + Math.sin(a) * f.r;
      if (px < -4 || py < -4 || px > W + 4 || py > H + 4) continue;
      c.fillStyle = hues[(i + (f.t >> 2)) % 6];
      c.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
      c.fillStyle = '#ffffff'; c.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
  borderCells(cam) {
    const m = this.map, conn = m.conn, out = [];
    const x0 = Math.floor(cam.x / 16) - 2, y0 = Math.floor(cam.y / 16) - 1, x1 = x0 + 20, y1 = y0 + 15;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && y >= 0 && x < m.w && y < m.h) continue;
      if ((y < 0 && conn.north) || (y >= m.h && conn.south) || (x < 0 && conn.west) || (x >= m.w && conn.east)) { if (this.neighbourCovers(x, y)) continue; }
      out.push([x, y]);
    }
    return out;
  }
  drawBorder(c, cam) {
    const m = this.map, b = m.border || 'T';
    const cells = this.borderCells(cam);
    const g = Tiles.borderGround(b, m.baseTile);
    for (const [x, y] of cells) c.drawImage(g, x * 16 - cam.x, y * 16 - cam.y);
    if (Tiles.isTree(b)) {
      const kind = b === 'P' ? 'pine' : b === 'k' ? 'dead' : 'tree';
      for (const [x, y] of cells) c.drawImage(Tiles.treeSprite(kind, hash2(x, y, 9) < 0.5 ? 1 : 0), x * 16 - cam.x - Tiles.TREE_OX, y * 16 - cam.y - Tiles.TREE_OY);
    }
  }
  // border trees below / beside the map overlap its edge rows: redraw them on top
  drawBorderFront(c, cam) {
    const m = this.map, b = m.border || 'T';
    if (!Tiles.isTree(b)) return;
    const kind = b === 'P' ? 'pine' : b === 'k' ? 'dead' : 'tree';
    for (const [x, y] of this.borderCells(cam)) {
      if (y < m.h) continue;
      c.drawImage(Tiles.treeSprite(kind, hash2(x, y, 9) < 0.5 ? 1 : 0), x * 16 - cam.x - Tiles.TREE_OX, y * 16 - cam.y - Tiles.TREE_OY);
    }
  }
  neighbourCovers(x, y) {
    const m = this.map;
    for (const [side, cn] of Object.entries(m.conn)) {
      const o = MAPS[cn.map];
      const org = this.neighbourOrigin(side, cn);
      if (x >= org.x && y >= org.y && x < org.x + o.w && y < org.y + o.h) return true;
    }
    return false;
  }
  neighbourOrigin(side, cn) {
    const m = this.map, o = MAPS[cn.map];
    if (side === 'north') return { x: -cn.off, y: -o.h };
    if (side === 'south') return { x: -cn.off, y: m.h };
    if (side === 'west') return { x: -o.w, y: -cn.off };
    return { x: m.w, y: -cn.off };
  }
  drawNeighbour(c, side, cn, cam, fr, over) {
    const o = MAPS[cn.map];
    const L = mapLayers(cn.map, this.night);
    const org = this.neighbourOrigin(side, cn);
    const x = org.x * 16 - cam.x, y = org.y * 16 - cam.y;
    if (x > W || y > H || x + o.w * 16 < 0 || y + o.h * 16 < 0) return;
    if (over) { c.drawImage(L.over, x, y - L.pad); if (L.greyOver && o.faded.some(z => !G.flags[z.until])) this.drawNeighbourGrey(c, o, L.greyOver, x, y, L.pad); return; }
    c.drawImage(L.frames[fr], x, y - L.pad);
    if (L.grey && o.faded.some(z => !G.flags[z.until])) this.drawNeighbourGrey(c, o, L.grey[fr], x, y, L.pad);
  }
  drawNeighbourGrey(c, o, img, x, y, pad = 0) {
    for (const z of o.faded) { if (G.flags[z.until]) continue; c.save(); c.beginPath(); c.rect(x + z.x * 16, y + z.y * 16 - 8, z.w * 16, z.h * 16 + 8); c.clip(); c.drawImage(img, x, y - pad); c.restore(); }
  }
  drawPrints(c, cam) {
    if (!this.prints || !this.prints.length) return;
    for (const p of this.prints) {
      p.t++;
      const a = p.t < 180 ? 1 : 1 - (p.t - 180) / 60;
      if (a <= 0) continue;
      c.fillStyle = p.snow ? `rgba(130,150,200,${0.7 * a})` : `rgba(160,124,72,${0.62 * a})`;
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      const side = p.alt ? 1 : -1;
      if (p.dir === 'up' || p.dir === 'down') { c.fillRect(x + 6 + (side > 0 ? 3 : 0), y + 8 + (p.dir === 'down' ? 0 : 3), 2, 3); c.fillRect(x + 6 + (side > 0 ? 0 : 3), y + 12 - (p.dir === 'down' ? 0 : 3), 2, 3); }
      else { c.fillRect(x + 4, y + 10 + (side > 0 ? 3 : 0), 3, 2); c.fillRect(x + 9, y + 10 + (side > 0 ? 0 : 3), 3, 2); }
    }
  }
  drawBits(c, cam) {
    if (!this.bits || !this.bits.length) return;
    for (const b of this.bits) { b.t++; b.x += b.vx; b.y += b.vy; b.vy += 0.09; c.fillStyle = b.col; c.fillRect(Math.round(b.x - cam.x), Math.round(b.y - cam.y), 2, 1); }
    this.bits = this.bits.filter(b => b.t < 22);
  }
  // chimney smoke from houses / forges on this map
  drawSmoke(c, cam) {
    const m = this.map;
    if (m.ts === 'in') return;
    const stacks = m._stacks || (m._stacks = (m.buildings || []).filter(b => b.chimney || b.t === 'forge').map(b => ({ x: b.x * 16 + b.w * 16 - 13, y: b.y * 16 - 12, b })));
    if (!stacks.length) return;
    this.smoke = this.smoke || [];
    if (this.t % 14 === 0) for (const st of stacks) { if (st.b.cond && !checkCond(st.b.cond)) continue; this.smoke.push({ x: st.x + Math.random() * 2, y: st.y, t: 0, s: Math.random() }); }
    for (const p of this.smoke) {
      p.t++; p.y -= 0.35; p.x += 0.18 + Math.sin(p.t * 0.05 + p.s * 6) * 0.15;
      const r = 1 + p.t / 22, a = Math.max(0, 0.55 - p.t / 150);
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
      c.fillStyle = `rgba(236,236,240,${a})`; c.fillRect(Math.round(x - r), y - Math.round(r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
      c.fillStyle = `rgba(255,255,255,${a * 0.6})`; c.fillRect(Math.round(x - r) + 1, y - Math.round(r * 0.7), Math.max(1, Math.round(r)), 1);
    }
    this.smoke = this.smoke.filter(p => p.t < 82);
  }
  // slow, soft cloud shadows drifting over outdoor maps in daylight
  drawCloudShadows(c, cam) {
    const m = this.map;
    if (m.ts === 'in' || m.dark || m.sky || this.night || this.forceNight || m.env === 'cave' || m.noClouds || m.weather === 'snow' || m.weather === 'embers') return;
    if (!Overworld.cloudTex) {
      const S = 256, cv = mkCanvas(S, S), x = cv.ctx, id = x.createImageData(S, S), d = new Uint32Array(id.data.buffer);
      const col = Col.pack('#102038') & 0x00ffffff;
      for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
        const nz = (u, v) => vnoise(u / 46, v / 32, 91) * 0.82 + vnoise(u / 18, v / 14, 92) * 0.18;
        const n = (nz(xx, yy) * (S - xx) * (S - yy) + nz(xx - S, yy) * xx * (S - yy) + nz(xx, yy - S) * (S - xx) * yy + nz(xx - S, yy - S) * xx * yy) / (S * S);
        if (n > 0.57 + bayer(xx, yy) * 0.035) d[yy * S + xx] = (col | (22 << 24)) >>> 0;
      }
      x.putImageData(id, 0, 0);
      Overworld.cloudTex = cv;
    }
    const tex = Overworld.cloudTex, S = 256;
    const ox = ((Math.floor(-cam.x * 1 + this.t * 0.12) % S) + S) % S - S, oy = ((Math.floor(-cam.y + this.t * 0.05) % S) + S) % S - S;
    for (let y = oy; y < H; y += S) for (let x = ox; x < W; x += S) c.drawImage(tex, x, y);
  }
  drawItemBall(c, x, y) {
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + 4, y + 12, 9, 3);
    drawBall(c, x + 8, y + 9 - (Math.floor(this.t / 30) % 2), 0, 'pokeball');
  }
  drawEnt(c, e, cam) {
    const x = Math.round(e.px - cam.x), y = Math.round(e.py - cam.y);
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
    const d = e.def || {};
    // shadow
    if (!d.ball && !d.obj) {
      c.fillStyle = 'rgba(16,24,40,0.24)';
      const cx = x + (e.big ? 16 : 8), cy = y + (e.big ? 30 : 14), sw = e.big ? 26 : 12, k = e.jz ? Math.max(0.6, 1 - e.jz / 20) : 1;
      const w = Math.round(sw * k);
      c.fillRect(cx - (w >> 1) + 2, cy - 1, w - 4, 1); c.fillRect(cx - (w >> 1), cy, w, 2); c.fillRect(cx - (w >> 1) + 2, cy + 2, w - 4, 1);
    }
    if (d.ball) { drawBall(c, x + 8, y + 6, 0, 'pokeball'); return; }
    if (d.obj) { this.drawObj(c, d.obj, x, y); return; }
    if (d.poke) {
      const faded = d.faded && !checkCond(d.faded);
      let img = PokeArt.get(d.poke, { icon: !d.front && !e.big, frame: 0 });
      if (e.big) img = PokeArt.get(d.poke, { frame: Math.floor(this.t / 30) % 2 });
      if (faded) img = silhouetteCachedGrey(img);
      const bob = (Math.floor(this.t / 20) % 2) && !faded ? 1 : 0;
      if (e.big) c.drawImage(img, x - 16, y - 32 + 4 - bob);
      else c.drawImage(img, x - 8, y - 14 - bob);
      return;
    }
    const fr = this.frameOf(e);
    const img = People.frame(e.look || LOOKS.man, e.dir, fr);
    c.drawImage(img, x - 1, y - 6 - Math.round(e.jz));
    // tall grass overlay
    const t = tileAt(this.map, e.moving ? e.tx : e.x, e.moving ? e.ty : e.y);
    if ((t === '"' || t === '^') && !e.jumping && (!e.moving || e.mt > e.mdur * 0.4)) {
      const gx = e.moving ? e.tx : e.x, gy = e.moving ? e.ty : e.y;
      c.drawImage(Tiles.grassOverlay(t === '^', Math.floor(this.t / 18) % 4, gx, gy), gx * 16 - cam.x, gy * 16 - cam.y + 6);
    }
  }
  drawObj(c, kind, x, y) {
    const t = this.t;
    if (kind === 'rod') {
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, y + 12, 10, 3);
      c.fillStyle = '#4a4a58'; c.fillRect(x + 6, y - 10, 4, 24); c.fillStyle = '#6a6a78'; c.fillRect(x + 6, y - 10, 1, 24);
      c.fillStyle = '#3a3a48'; c.fillRect(x + 4, y + 10, 8, 4);
      const pulse = (Math.sin(t * 0.1) + 1) / 2;
      c.fillStyle = `rgba(210,210,230,${0.5 + pulse * 0.5})`; c.fillRect(x + 5, y - 14, 6, 5);
      c.fillStyle = `rgba(255,255,255,${pulse})`; c.fillRect(x + 7, y - 13, 2, 3);
      for (let i = 0; i < 3; i++) { const k = ((t * 0.8 + i * 20) % 60) / 60; c.fillStyle = `rgba(200,200,220,${1 - k})`; c.fillRect(Math.round(x + 8 + Math.sin(i * 2 + t * 0.05) * 14 * (1 - k)), Math.round(y + 12 - k * 26), 2, 2); }
    } else if (kind === 'crystal') {
      c.fillStyle = '#8a8a9a'; c.beginPath(); c.moveTo(x + 8, y - 6); c.lineTo(x + 13, y + 6); c.lineTo(x + 8, y + 14); c.lineTo(x + 3, y + 6); c.closePath(); c.fill();
      c.fillStyle = '#c8c8d8'; c.fillRect(x + 7, y - 2, 2, 10);
    } else if (kind === 'core') {
      const pulse = (Math.sin(t * 0.08) + 1) / 2;
      c.fillStyle = '#3a3a4a'; c.fillRect(x - 8, y - 6, 32, 22); c.fillStyle = '#5a5a6a'; c.fillRect(x - 6, y - 4, 28, 18);
      c.fillStyle = `rgba(220,220,240,${0.6 + pulse * 0.4})`; PX.circle(c, x + 8, y + 5, 6, `rgba(220,220,240,${0.6 + pulse * 0.4})`);
      PX.circle(c, x + 8, y + 5, 3, '#ffffff');
    }
  }
  drawEmote(c, em, cam) {
    const e = em.e;
    const x = Math.round(e.px - cam.x) + (e.big ? 12 : 3), y = Math.round(e.py - cam.y) - (e.big ? 44 : 22) - Math.round(Math.min(1, em.t / 6) * 3);
    if (em.t < 3) return;
    c.fillStyle = '#202028'; c.fillRect(x - 1, y - 1, 13, 13); c.fillStyle = '#ffffff'; c.fillRect(x, y, 11, 11);
    c.fillStyle = '#202028'; c.fillRect(x + 3, y + 12, 3, 1); c.fillStyle = '#ffffff'; c.fillRect(x + 4, y + 11, 2, 1);
    const k = em.kind;
    if (k === '!') { c.fillStyle = '#e03030'; c.fillRect(x + 4, y + 2, 3, 5); c.fillRect(x + 4, y + 8, 3, 2); }
    else if (k === '?') Font.draw(c, '?', x + 3, y + 2, '#3060c8', null);
    else if (k === '...') { c.fillStyle = '#404048'; for (let i = 0; i < 3; i++) if (em.t > 6 + i * 6) c.fillRect(x + 2 + i * 3, y + 7, 2, 2); }
    else if (k === '♪') Font.draw(c, '♪', x + 3, y + 2, '#3a9a4a', null);
    else if (k === '♥') Font.draw(c, '♥', x + 3, y + 2, '#e04868', null);
  }
  drawSky(c) {
    const restored = G.flags.summit_done || G.flags.sky_restored;
    const g = c.createLinearGradient(0, 0, 0, H);
    if (restored) { g.addColorStop(0, '#0c1040'); g.addColorStop(1, '#3a2a70'); } else { g.addColorStop(0, '#1a1a22'); g.addColorStop(1, '#3a3a44'); }
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const r = seeded(99);
    for (let i = 0; i < 70; i++) { c.fillStyle = restored ? (r() < 0.3 ? '#fff8d0' : '#c8d8ff') : '#8a8a90'; c.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
    const hues = restored ? ['rgba(90,255,170,', 'rgba(110,190,255,', 'rgba(210,130,255,', 'rgba(255,150,190,'] : ['rgba(170,170,180,', 'rgba(140,140,150,'];
    hues.forEach((h, b) => {
      for (let x = 0; x < W; x += 2) {
        const y = 20 + b * 22 + Math.sin(x * 0.025 + this.t * 0.015 + b) * 14 + Math.sin(x * 0.009 + this.t * 0.01) * 10;
        const hh = 18 + Math.sin(x * 0.04 + this.t * 0.02 + b) * 8;
        c.fillStyle = h + (restored ? 0.22 : 0.08) + ')'; c.fillRect(x, Math.round(y), 2, Math.round(hh));
        c.fillStyle = h + (restored ? 0.45 : 0.12) + ')'; c.fillRect(x, Math.round(y + hh - 2), 2, 2);
      }
    });
  }

  // ── weather & lighting ──
  updateParticles() {
    const w = this.map.weather;
    if (!w) return;
    const P = this.particles;
    const cam = this.cam;
    const spawn = { petals: 0.05, leaves: 0.04, fireflies: 0.06, snow: 0.35, embers: 0.18, spray: 0.02 }[w] || 0;
    if (Math.random() < spawn && P.length < 80) {
      const p = { t: 0, life: 400, seed: Math.random() * 100 };
      if (w === 'snow') Object.assign(p, { x: cam.x + Math.random() * (W + 60) - 30, y: cam.y - 6, vx: -0.2 + Math.random() * 0.3, vy: 0.4 + Math.random() * 0.5, s: Math.random() < 0.3 ? 2 : 1 });
      else if (w === 'embers') Object.assign(p, { x: cam.x + Math.random() * W, y: cam.y + H + 4, vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.5, life: 300 });
      else if (w === 'fireflies') Object.assign(p, { x: cam.x + Math.random() * W, y: cam.y + Math.random() * H, vx: 0, vy: 0, life: 260 });
      else if (w === 'spray') Object.assign(p, { gull: true, x: cam.x - 20, y: cam.y + 20 + Math.random() * 80, vx: 0.9 + Math.random() * 0.4, vy: 0, life: 400 });
      else Object.assign(p, { x: cam.x + Math.random() * W + 40, y: cam.y - 8, vx: -0.5 - Math.random() * 0.4, vy: 0.35 + Math.random() * 0.3 });
      P.push(p);
    }
    for (const p of P) {
      p.t++;
      if (w === 'fireflies') { p.x += Math.sin(p.t * 0.03 + p.seed) * 0.3; p.y += Math.cos(p.t * 0.025 + p.seed) * 0.25; }
      else { p.x += p.vx + (w === 'petals' || w === 'leaves' ? Math.sin(p.t * 0.05 + p.seed) * 0.3 : 0); p.y += p.vy; }
    }
    this.particles = P.filter(p => p.t < p.life && p.y < cam.y + H + 20 && p.y > cam.y - 40 && p.x > cam.x - 60 && p.x < cam.x + W + 60);
  }
  drawWeather(c, cam) {
    const w = this.map.weather;
    const faded = this.inFaded(this.player.x, this.player.y);
    for (const p of this.particles) {
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      if (w === 'snow') { c.fillStyle = '#ffffff'; c.fillRect(x, y, p.s, p.s); }
      else if (w === 'embers') { c.fillStyle = faded ? '#a0a0a0' : (p.t % 20 < 10 ? '#f8a040' : '#f86020'); c.fillRect(x, y, 1, 1); }
      else if (w === 'fireflies') { const on = Math.sin(p.t * 0.08 + p.seed) > 0.2; if (on) { c.fillStyle = 'rgba(220,255,140,0.35)'; c.fillRect(x - 1, y - 1, 3, 3); c.fillStyle = '#f0ffb0'; c.fillRect(x, y, 1, 1); } }
      else if (w === 'petals') { c.fillStyle = faded ? '#c8c8c8' : (p.seed > 50 ? '#f8b8d0' : '#fbd8e4'); c.fillRect(x, y, 2, 1); c.fillRect(x + 1, y + 1, 1, 1); }
      else if (w === 'leaves') { c.fillStyle = p.seed > 50 ? '#78c050' : '#a8d868'; c.fillRect(x, y, 2, 2); c.fillStyle = '#4a9a38'; c.fillRect(x + 1, y + 1, 1, 1); }
      else if (w === 'spray' && p.gull) { const f = (p.t >> 3) % 2; c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x, y + 30, 6, 2); c.fillStyle = '#f8f8f8'; c.fillRect(x - 3, y - f, 3, 1); c.fillRect(x, y, 2, 1); c.fillRect(x + 2, y - f, 3, 1); }
    }
    if (this.map.shafts && !this.night) {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 97 - cam.x * 0.5) % 360 + 360) % 360 - 60;
        const a = 0.06 + 0.03 * Math.sin(this.t * 0.02 + i);
        c.fillStyle = `rgba(255,240,180,${a})`;
        c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + 24, 0); c.lineTo(bx + 80, H); c.lineTo(bx + 50, H); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
  }
  drawLighting(c, cam) {
    const m = this.map;
    const tod = m.ts === 'in' || m.sky ? 'day' : timeOfDay();
    if (m.dim) { c.fillStyle = `rgba(10,30,20,${m.dim})`; c.fillRect(0, 0, W, H); }
    if (m.ts !== 'in' && !m.dark && !m.sky && (tod !== 'day' || this.forceNight)) {
      const nightish = this.night || this.forceNight;
      const tint = nightish ? '#5462aa' : tod === 'evening' ? '#f4b88e' : '#ffe8d0';
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = tint; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      if (nightish) { c.fillStyle = 'rgba(30,40,110,0.12)'; c.fillRect(0, 0, W, H); this.drawVignette(c, 0.42); }
      else if (tod === 'evening') { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,140,80,0.14)'); g.addColorStop(1, 'rgba(120,60,140,0.1)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
      if (this.night || tod === 'evening' || this.forceNight) {
        c.globalCompositeOperation = 'lighter';
        const lights = this.L.lights || [];
        for (const l of lights) {
          const x = l.x - cam.x, y = l.y - cam.y;
          if (x < -l.r || y < -l.r || x > W + l.r || y > H + l.r) continue;
          const g = c.createRadialGradient(x, y, 0, x, y, l.r);
          g.addColorStop(0, l.c.replace(/[\d.]+\)$/, (0.5 * (this.night ? 1 : 0.5)) + ')')); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
        }
        c.globalCompositeOperation = 'source-over';
      }
    }
    if (m.dark) {
      const lc = this.darkCanvas || (this.darkCanvas = mkCanvas(W, H));
      const x = lc.ctx;
      x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, W, H);
      x.fillStyle = `rgba(8,4,2,${m.dark})`; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'destination-out';
      const p = this.player;
      const px = p.px - cam.x + 8, py = p.py - cam.y + 6;
      const flick = Math.sin(this.t * 0.2) * 2;
      const g = x.createRadialGradient(px, py, 10, px, py, 70 + flick);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-over';
      c.drawImage(lc, 0, 0);
      c.globalCompositeOperation = 'lighter';
      const g2 = c.createRadialGradient(px, py, 0, px, py, 60); g2.addColorStop(0, 'rgba(255,170,90,0.12)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g2; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      this.drawVignette(c, 0.35);
    }
  }
  drawVignette(c, a) {
    const v = Overworld.vig || (Overworld.vig = (() => {
      const cv = mkCanvas(W, H), x = cv.ctx, g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, 'rgba(4,6,20,0)'); g.addColorStop(1, 'rgba(4,6,20,1)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return cv;
    })());
    c.globalAlpha = a; c.drawImage(v, 0, 0); c.globalAlpha = 1;
  }
  resume(from) {
    void from;
  }
}
const greySilCache = new WeakMap();
function silhouetteCachedGrey(img) { let g = greySilCache.get(img); if (!g) { g = greyCanvas(img, 1); greySilCache.set(img, g); } return g; }

// condition strings: "flag", "!flag", "a&b"
function checkCond(cond) {
  if (!cond) return true;
  return cond.split('&').every(part => {
    part = part.trim();
    if (part.startsWith('!')) return !G.flags[part.slice(1)];
    return !!G.flags[part];
  });
}

// ── battle transitions ──
class BattleTransition {
  constructor(kind, music) { this.kind = kind; this.music = music; this.t = 0; this.done = false; }
  start() { Sound.play(this.music, { restart: true }); }
  update() { if (++this.t >= 56) { this.done = true; Game.fadeA = 1; Game.fadeColor = '#000'; } }
  draw(c) {
    const t = this.t;
    if (t < 18) { if ((t >> 2) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(0, 0, W, H); } return; }
    const k = (t - 18) / 38;
    c.fillStyle = '#05060e';
    if (this.kind === 'wild') {
      // diamond wipe rippling out from the centre
      const S = 16;
      for (let gy = 0; gy <= H / S; gy++) for (let gx = 0; gx <= W / S; gx++) {
        const cx = gx * S, cy = gy * S, dist = Math.hypot(cx - W / 2, cy - H / 2) / 160;
        const r = Math.round(clamp(k * 1.9 - dist * 0.9, 0, 1) * S * 1.05);
        if (r <= 0) continue;
        for (let i = -r; i <= r; i++) { const w = r - Math.abs(i); c.fillRect(cx - w, cy + i, w * 2 + 1, 1); }
      }
    } else {
      // closing iris ringed like a Poké Ball, then the ball spins shut
      const R = Math.max(0, (1 - Ease.inOut(Math.min(1, k * 1.25))) * 170);
      const cx = W / 2, cy = H / 2;
      c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(cx, cy, R, 0, Math.PI * 2, true); c.fill('evenodd'); c.restore();
      if (R > 2) {
        c.strokeStyle = '#e83838'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, R + 2, Math.PI, 0); c.stroke();
        c.strokeStyle = '#f4f4f4'; c.beginPath(); c.arc(cx, cy, R + 2, 0, Math.PI); c.stroke();
      }
      if (k > 0.72) {
        const s = Math.min(1, (k - 0.72) / 0.2), rot = (1 - s) * Math.PI * 1.5;
        c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(s * 3, s * 3);
        drawBall(c, 0, 0, 0, 'pokeball');
        c.restore();
      }
    }
  }
}
