'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Pokémon instances
// ─────────────────────────────────────────────────────────────────────────────
const GENDERLESS = new Set(['magnemite', 'magneton', 'staryu', 'starmie', 'hooh']);
let MON_UID = 1;

class Mon {
  constructor(sp, level, o = {}) {
    this.uid = MON_UID++;
    this.sp = sp;
    this.level = level;
    const r = () => randInt(0, 31);
    this.ivs = o.ivs || { hp: r(), atk: r(), def: r(), spa: r(), spd: r(), spe: r() };
    this.nature = o.nature != null ? o.nature : rand(25);
    this.gender = GENDERLESS.has(sp) ? null : (o.gender || (chance(0.5) ? 'm' : 'f'));
    this.shiny = o.shiny != null ? o.shiny : rand(512) === 0;
    this.exp = expForLevel(this.S.growth, level);
    this.nick = o.nick || null;
    this.ot = o.ot || null;
    this.ball = o.ball || 'pokeball';
    this.met = o.met || null;
    this.status = null; this.sleep = 0;
    this.friend = 70;
    this.moves = [];
    if (o.moves) o.moves.forEach(m => this.addMove(m));
    else this.defaultMoves();
    this.calc();
    this.hp = this.stats.hp;
  }
  get S() { return SPECIES[this.sp]; }
  get name() { return this.nick || this.S.name; }
  get types() { return this.S.types; }
  get fainted() { return this.hp <= 0; }
  get ability() { return this.S.ability || 'none'; }
  defaultMoves() {
    const learned = this.S.learn.filter(([lv]) => lv <= this.level).map(([, m]) => m);
    const uniq = [...new Set(learned)];
    uniq.slice(-4).forEach(m => this.addMove(m));
  }
  addMove(id) { const mv = MOVES[id]; if (!mv || this.moves.some(m => m.id === id)) return false; if (this.moves.length >= 4) return false; this.moves.push({ id, pp: mv.pp, max: mv.pp }); return true; }
  replaceMove(i, id) { const mv = MOVES[id]; this.moves[i] = { id, pp: mv.pp, max: mv.pp }; }
  calc() {
    const b = this.S.base, L = this.level, iv = this.ivs;
    const nat = NATURES[this.nature];
    const mod = k => (nat[1] === k ? 1.1 : nat[2] === k ? 0.9 : 1);
    const old = this.stats;
    this.stats = {
      hp: Math.floor((2 * b[0] + iv.hp) * L / 100) + L + 10,
      atk: Math.floor((Math.floor((2 * b[1] + iv.atk) * L / 100) + 5) * mod('atk')),
      def: Math.floor((Math.floor((2 * b[2] + iv.def) * L / 100) + 5) * mod('def')),
      spa: Math.floor((Math.floor((2 * b[3] + iv.spa) * L / 100) + 5) * mod('spa')),
      spd: Math.floor((Math.floor((2 * b[4] + iv.spd) * L / 100) + 5) * mod('spd')),
      spe: Math.floor((Math.floor((2 * b[5] + iv.spe) * L / 100) + 5) * mod('spe')),
    };
    if (old && this.hp != null) this.hp = Math.max(this.fainted ? 0 : 1, Math.min(this.stats.hp, this.hp + (this.stats.hp - old.hp)));
    return old;
  }
  expToNext() { return this.level >= 100 ? 0 : expForLevel(this.S.growth, this.level + 1) - this.exp; }
  expFrac() {
    if (this.level >= 100) return 1;
    const a = expForLevel(this.S.growth, this.level), b = expForLevel(this.S.growth, this.level + 1);
    return clamp((this.exp - a) / (b - a), 0, 1);
  }
  // add exp; returns array of level-up records {level, old, now, moves:[...]}
  movesAt(level) { return this.S.learn.filter(([lv]) => lv === level).map(([, m]) => m); }
  levelUp() {
    this.level++;
    const old = this.calc();
    return { level: this.level, old, now: Object.assign({}, this.stats), moves: this.movesAt(this.level) };
  }
  evoTarget(o = {}) {
    const e = this.S.evo;
    if (!e) return null;
    if (o.item) return e.item === o.item ? e.into : null;
    if (e.item) return null;
    if (e.level && this.level >= e.level) {
      if (e.time === 'night' && !isNight()) return null;
      return e.into;
    }
    return null;
  }
  evolveInto(sp) {
    const wasNamed = this.nick;
    this.sp = sp;
    const oldMax = this.stats.hp;
    this.calc();
    this.hp = Math.min(this.stats.hp, this.hp + (this.stats.hp - oldMax));
    void wasNamed;
  }
  heal() { this.hp = this.stats.hp; this.status = null; this.sleep = 0; this.moves.forEach(m => { m.pp = m.max; }); }
  toJSON() {
    return { sp: this.sp, level: this.level, ivs: this.ivs, nature: this.nature, gender: this.gender, shiny: this.shiny, exp: this.exp, nick: this.nick, ot: this.ot, ball: this.ball, met: this.met, status: this.status, sleep: this.sleep, hp: this.hp, moves: this.moves, friend: this.friend };
  }
  static from(o) {
    const m = new Mon(o.sp, o.level, { ivs: o.ivs, nature: o.nature, gender: o.gender, shiny: o.shiny, moves: [] });
    Object.assign(m, { exp: o.exp, nick: o.nick, ot: o.ot, ball: o.ball, met: o.met, status: o.status, sleep: o.sleep || 0, friend: o.friend || 70 });
    m.moves = o.moves.map(x => ({ id: x.id, pp: x.pp, max: x.max }));
    m.calc();
    m.hp = o.hp;
    return m;
  }
}

function timeOfDay() {
  const o = window.G && G.options && G.options.time;
  if (o === 'day') return 'day';
  if (o === 'night') return 'night';
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}
function isNight() { return timeOfDay() === 'night'; }
