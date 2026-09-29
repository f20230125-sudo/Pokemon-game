'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Menus: party, summary, bag, Pokédex, start menu, save, options, shop, PC,
//  name entry, trainer card, town map
// ─────────────────────────────────────────────────────────────────────────────
const Bag = {
  count: id => G.bag[id] || 0,
  add(id, n = 1) { G.bag[id] = (G.bag[id] || 0) + n; },
  take(id, n = 1) { G.bag[id] = Math.max(0, (G.bag[id] || 0) - n); if (!G.bag[id]) delete G.bag[id]; },
  pocket: p => Object.keys(G.bag).filter(id => ITEMS[id] && ITEMS[id].pocket === p && G.bag[id] > 0).sort((a, b) => Object.keys(ITEMS).indexOf(a) - Object.keys(ITEMS).indexOf(b)),
};
const Dex = {
  see(sp) { G.dex.seen[sp] = true; },
  catch(sp) { G.dex.seen[sp] = true; G.dex.caught[sp] = true; },
  seenCount: () => DEX_ORDER.filter(s => G.dex.seen[s]).length,
  caughtCount: () => DEX_ORDER.filter(s => G.dex.caught[s]).length,
};

function menuBG(c, a = '#b8d8f0', b = '#e8f4fa', t = 0) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = -12; i < 30; i++) { const x = ((i * 20 + t * 0.25) % 280) - 20; for (let y = 0; y < H; y++) c.fillRect(Math.round(x + y * 0.5), y, 6, 1); }
}
function titleBar(c, text, col = '#3a70c0') {
  c.fillStyle = col; c.fillRect(0, 0, W, 16);
  c.fillStyle = Col.light(col); c.fillRect(0, 0, W, 1); c.fillStyle = Col.shade(col); c.fillRect(0, 15, W, 1);
  Font.draw(c, text, 8, 4, '#ffffff', Col.shade(col, 1.5));
}
class Screen {
  constructor() { this.opaque = true; this.co = null; this.t = 0; }
  run(gen) { this.co = new Co(gen, this); }
  update() { this.t++; if (this.co && !this.co.done) { this.co.update(); return; } this.co = null; this.input(); }
  input() {}
  close(r) { Game.pop(r); }
}

// ── party ───────────────────────────────────────────────────────────────────
class PartyScene extends Screen {
  constructor(o = {}) { super(); this.o = o; this.i = o.start != null ? o.start : o.mode === 'forced' ? Math.max(0, G.party.findIndex(m => !m.fainted)) : 0; this.swapFrom = -1; this.msgText = o.title || (o.mode === 'forced' ? 'Choose a Pokémon.' : o.mode === 'item' ? 'Use on which Pokémon?' : o.mode === 'teach' ? 'Teach which Pokémon?' : 'Choose a Pokémon.'); }
  get party() { return G.party; }
  input() {
    const n = this.party.length, forced = this.o.mode === 'forced';
    if (Input.repeat('down')) { this.i = this.i >= n ? 0 : this.i + 2 < n ? this.i + 2 : forced ? this.i : n; Sound.sfx('cursor'); }
    if (Input.repeat('up')) { this.i = this.i >= n ? n - 1 : this.i - 2 >= 0 ? this.i - 2 : this.i; Sound.sfx('cursor'); }
    if (Input.repeat('left') && this.i < n && this.i % 2 === 1) { this.i--; Sound.sfx('cursor'); }
    if (Input.repeat('right') && this.i < n && this.i % 2 === 0 && this.i + 1 < n) { this.i++; Sound.sfx('cursor'); }
    if (Input.cancel()) {
      if (this.swapFrom >= 0) { this.swapFrom = -1; this.msgText = 'Choose a Pokémon.'; Sound.sfx('cancel'); return; }
      if (this.o.mode === 'forced') return;
      Sound.sfx('cancel'); this.close(-1); return;
    }
    if (Input.confirm()) {
      if (this.i >= n) { Sound.sfx('cancel'); this.close(-1); return; }
      Sound.sfx('select');
      this.run(this.pick(this.i));
    }
  }
  *pick(i) {
    const m = this.party[i], mode = this.o.mode;
    if (this.swapFrom >= 0) {
      const a = this.swapFrom; this.swapFrom = -1;
      [G.party[a], G.party[i]] = [G.party[i], G.party[a]];
      this.msgText = 'Choose a Pokémon.';
      return;
    }
    if (mode === 'item' || mode === 'teach' || mode === 'select') { this.close(i); return; }
    const opts = mode === 'battle' || mode === 'forced' ? ['SHIFT', 'SUMMARY', 'CANCEL'] : ['SUMMARY', 'SWITCH', 'CANCEL'];
    const ch = yield new Choice(opts, { x: 180, y: 192 - opts.length * 15 - 16, w: 72, cancel: opts.length - 1 });
    const pickd = opts[ch];
    if (pickd === 'SUMMARY') { yield new SceneWait(new SummaryScene(this.party, i)); return; }
    if (pickd === 'SWITCH') { this.swapFrom = i; this.msgText = 'Move to where?'; return; }
    if (pickd === 'SHIFT') {
      const B = this.o.battle;
      if (m.fainted) { yield new Say(`${m.name} has no energy left to battle!`); return; }
      if (B && i === B.P.idx && !B.P.mon.fainted) { yield new Say(`${m.name} is already in battle!`); return; }
      this.close(i); return;
    }
  }
  draw(c) {
    menuBG(c, '#78b870', '#c8ecc0', this.t);
    const n = this.party.length;
    for (let k = 0; k < 6; k++) {
      const x = 4 + (k % 2) * 126, y = 6 + Math.floor(k / 2) * 46;
      const m = this.party[k];
      const sel = k === this.i, swapping = k === this.swapFrom;
      if (!m) { c.fillStyle = 'rgba(40,60,40,0.25)'; c.fillRect(x, y, 122, 42); continue; }
      const fainted = m.fainted;
      const base = fainted ? '#e8b0a8' : sel ? '#fff8d8' : '#f0f4f8';
      c.fillStyle = sel ? '#e05838' : swapping ? '#e0a030' : '#3a5a48'; c.fillRect(x, y, 122, 42);
      c.fillStyle = base; c.fillRect(x + 2, y + 2, 118, 38);
      c.fillStyle = fainted ? '#d89088' : sel ? '#f8e8b0' : '#d8e4ec'; c.fillRect(x + 2, y + 30, 118, 10);
      const bob = (Math.floor(this.t / (sel ? 6 : 12)) % 2) * (fainted ? 0 : 2);
      const icon = PokeArt.get(m.sp, { icon: true, shiny: m.shiny });
      c.drawImage(icon, x - 2, y + 2 - bob);
      Font.draw(c, m.name, x + 32, y + 5);
      UI.gender(c, m.gender, x + 34 + Font.width(m.name), y + 5);
      Tiny.draw(c, 'Lv', x + 32, y + 18); Font.draw(c, String(m.level), x + 42, y + 16);
      if (this.o.mode === 'teach') {
        const able = canLearnTM(m.sp, this.o.move) && !m.moves.some(x => x.id === this.o.move);
        Font.drawR(c, m.moves.some(x => x.id === this.o.move) ? 'LEARNED' : able ? 'ABLE' : 'NOT ABLE', x + 116, y + 18, able ? '#3a8a3a' : '#a04040');
      } else {
        UI.hpBar(c, x + 56, y + 18, 44, m.hp / m.stats.hp, true);
        Font.drawR(c, `${m.hp}/${m.stats.hp}`, x + 116, y + 30);
        if (m.status || fainted) UI.statusTag(c, fainted ? 'fnt' : m.status, x + 32, y + 30);
      }
    }
    // message + cancel
    UI.box(c, 4, 146, 176, 42);
    Font.draw(c, this.msgText, 14, 160);
    if (this.o.mode !== 'forced') {
      const sel = this.i >= n;
      c.fillStyle = sel ? '#e05838' : '#3a5a48'; c.fillRect(184, 154, 68, 26);
      c.fillStyle = sel ? '#fff8d8' : '#f0f4f8'; c.fillRect(186, 156, 64, 22);
      Font.drawC(c, 'CANCEL', 218, 163, sel ? '#e05838' : '#404048');
    }
  }
}

// ── summary ─────────────────────────────────────────────────────────────────
class SummaryScene extends Screen {
  constructor(list, i) { super(); this.list = list; this.i = i; this.page = 0; }
  input() {
    if (Input.repeat('right')) { this.page = (this.page + 1) % 3; Sound.sfx('cursor'); }
    if (Input.repeat('left')) { this.page = (this.page + 2) % 3; Sound.sfx('cursor'); }
    if (Input.repeat('down') && this.list.length > 1) { this.i = (this.i + 1) % this.list.length; Sound.sfx('cursor'); Sound.cry(this.list[this.i].sp); }
    if (Input.repeat('up') && this.list.length > 1) { this.i = (this.i + this.list.length - 1) % this.list.length; Sound.sfx('cursor'); Sound.cry(this.list[this.i].sp); }
    if (Input.cancel() || Input.confirm()) { Sound.sfx('cancel'); this.close(); }
  }
  enter() { Sound.cry(this.list[this.i].sp); }
  draw(c) {
    const m = this.list[this.i], sp = m.S;
    const col = TYPE_COLOR[sp.types[0]];
    menuBG(c, Col.mix(col, '#ffffff', 0.35), Col.mix(col, '#ffffff', 0.8), this.t);
    titleBar(c, ['POKéMON INFO', 'POKéMON SKILLS', 'KNOWN MOVES'][this.page], Col.shade(col, 0.6));
    for (let k = 0; k < 3; k++) { c.fillStyle = k === this.page ? '#ffffff' : 'rgba(255,255,255,0.4)'; c.fillRect(200 + k * 16, 5, 10, 6); }
    // portrait
    UI.plain(c, 6, 22, 92, 104, 'rgba(255,255,255,0.75)', Col.shade(col));
    const fr = Math.floor(this.t / 22) % 2;
    const spr = PokeArt.get(m.sp, { frame: fr, shiny: m.shiny });
    for (let dy = -5; dy <= 5; dy++) { const w = Math.round(34 * Math.sqrt(1 - dy * dy / 25)); c.fillStyle = Col.mix(col, '#ffffff', 0.55); c.fillRect(52 - w, 108 + dy, w * 2, 1); }
    c.drawImage(spr, 20, 110 - spr.bb.y1 - (sp.float ? 8 : 0));
    Font.draw(c, m.name, 10, 130, '#ffffff', Col.shade(col, 1.2));
    UI.gender(c, m.gender, 12 + Font.width(m.name), 130);
    Tiny.draw(c, 'Lv', 10, 146, '#ffffff'); Font.draw(c, String(m.level), 20, 144, '#ffffff', Col.shade(col, 1.2));
    if (m.shiny) Font.draw(c, '★', 84, 26, '#f8c830', null);
    drawBall(c, 88, 136, 0, m.ball || 'pokeball');
    const px = 106;
    UI.plain(c, px, 22, 146, 164, '#f8f8f4', Col.shade(col));
    if (this.page === 0) {
      const rows = [['No.', String(sp.dexNo).padStart(3, '0')], ['Name', sp.name], ['Type', ''], ['OT', m.ot || G.name], ['Nature', NATURES[m.nature][0]], ['Ability', ABILITIES[m.ability][0]], ['Met at', m.met || '???']];
      rows.forEach(([k, v], j) => { const y = 30 + j * 16; Font.draw(c, k, px + 8, y, '#6a7080'); if (k === 'Type') { sp.types.forEach((t, q) => UI.typeBadge(c, t, px + 56 + q * 40, y - 1, 38)); } else Font.draw(c, v, px + 56, y); });
      Font.wrap(ABILITIES[m.ability][1], 132).slice(0, 2).forEach((l, k) => Font.draw(c, l, px + 8, 142 + k * 11, '#6a7080'));
      const nat = NATURES[m.nature];
      if (nat[1]) Font.draw(c, `+${STAT_NAME[nat[1]]}  -${STAT_NAME[nat[2]]}`, px + 8, 168, '#9a7050');
    } else if (this.page === 1) {
      const keys = STAT_KEYS, nat = NATURES[m.nature];
      Font.draw(c, 'HP', px + 8, 30, '#6a7080'); Font.drawR(c, `${m.hp}/${m.stats.hp}`, px + 138, 30);
      UI.hpBar(c, px + 60, 42, 60, m.hp / m.stats.hp);
      keys.slice(1).forEach((k, j) => {
        const y = 54 + j * 15;
        const colr = nat[1] === k ? '#d05838' : nat[2] === k ? '#3870c8' : '#6a7080';
        Font.draw(c, STAT_NAME[k], px + 8, y, colr);
        Font.drawR(c, String(m.stats[k]), px + 138, y);
        c.fillStyle = '#e0e4ea'; c.fillRect(px + 60, y + 3, 50, 3);
        c.fillStyle = col; c.fillRect(px + 60, y + 3, Math.min(50, Math.round(m.stats[k] / (m.level * 2.2 + 10) * 30)), 3);
      });
      Font.draw(c, 'Exp. Points', px + 8, 134, '#6a7080'); Font.drawR(c, String(m.exp), px + 138, 134);
      Font.draw(c, 'To next Lv.', px + 8, 150, '#6a7080'); Font.drawR(c, String(m.expToNext()), px + 138, 150);
      UI.expBar(c, px + 8, 166, 128, m.expFrac());
    } else {
      m.moves.forEach((mv, j) => {
        const md = MOVES[mv.id], y = 30 + j * 32;
        UI.typeBadge(c, md.type, px + 6, y, 36);
        Font.draw(c, md.name, px + 46, y + 2);
        Font.draw(c, 'PP', px + 46, y + 16, '#6a7080'); Font.drawR(c, `${mv.pp}/${mv.max}`, px + 100, y + 16);
        Font.drawR(c, md.pow > 1 ? `Pow ${md.pow}` : md.fixed ? 'Pow --' : '', px + 140, y + 16, '#6a7080');
        const catc = { P: '#e07040', S: '#5880e0', X: '#a0a0a8' }[md.cat];
        c.fillStyle = catc; c.fillRect(px + 118, y + 2, 22, 9);
        Font.drawC(c, { P: 'PHY', S: 'SPC', X: 'STA' }[md.cat], px + 129, y + 3, '#ffffff', null);
      });
    }
    if (this.list.length > 1) Font.draw(c, 'Up/Down: next', 8, 172, '#ffffff', Col.shade(col));
  }
}

// ── bag ─────────────────────────────────────────────────────────────────────
// ── item & menu icons (procedural, cached) ──
const ItemIcon = (() => {
  const cache = {};
  const POT = { potion: '#a060d8', superpotion: '#ec7a36', hyperpotion: '#e2488e', fullrestore: '#3aa0e8' };
  const HEAL = { antidote: '#58c060', parlyzheal: '#e8c830', awakening: '#4a88e8', burnheal: '#e85040', iceheal: '#60d0e8', fullheal: '#f0d860' };
  const STONE = { thunderstone: '#78d058', waterstone: '#4a90e8', firestone: '#f07830' };
  function build(id) {
    const it = ITEMS[id] || {};
    const P = new Painter(16, 16, 1);
    if (POT[id]) {
      const c = POT[id];
      P.part(q => { q.rect(6, 1, 4, 3, '#d8dce8'); q.rect(7, 0, 2, 2, '#9aa0b0'); q.rect(5, 4, 6, 2, '#f4f4f8'); });
      P.part(q => { q.ball(8, 10.5, 5, 5, c, { hl: 1.3 }); });
      P.within(q => { q.rect(4, 9, 8, 2, id === 'fullrestore' ? '#f8d848' : '#ffffff'); });
    } else if (HEAL[id]) {
      const c = HEAL[id];
      P.part(q => { q.rect(6, 2, 4, 3, '#e8e0d0'); q.rect(6, 1, 4, 1, '#b8a888'); });
      P.part(q => { q.poly([[4, 6], [12, 6], [12, 14], [4, 14]], c, { k: 1.2, rim: true }); });
      P.within(q => { q.rect(5, 8, 6, 3, '#ffffff'); q.dot(7, 9, c); q.dot(8, 9, c); });
    } else if (id === 'revive') {
      P.part(q => q.poly([[8, 1], [14, 8], [8, 15], [2, 8]], '#f8d040', { k: 1.4, rim: true }));
      P.within(q => { q.poly([[8, 3], [11, 8], [8, 8]], '#fff4b0', { flat: true }); });
    } else if (id === 'repel') {
      P.part(q => { q.rect(6, 0, 4, 3, '#b0b4c0'); });
      P.part(q => { q.poly([[4, 3], [12, 3], [12, 15], [4, 15]], '#58b870', { k: 1.4, rim: true }); });
      P.within(q => { q.rect(4, 7, 8, 3, '#f4f4f4'); q.dot(8, 8, '#58b870'); });
    } else if (id === 'rarecandy') {
      P.part(q => { q.poly([[1, 5], [4, 8], [1, 11]], '#8ac8f8', { flat: true }); q.poly([[15, 5], [12, 8], [15, 11]], '#8ac8f8', { flat: true }); });
      P.part(q => q.ball(8, 8, 4.5, 4, '#4a8ae8', { hl: 1.3 }));
      P.within(q => { q.line([[5, 10], [11, 6]], 0.5, '#ffffff'); });
    } else if (STONE[id]) {
      const c = STONE[id];
      P.part(q => q.poly([[8, 1], [14, 6], [12, 14], [4, 14], [2, 6]], c, { k: 1.6, rim: true }));
      P.within(q => { q.poly([[8, 1], [8, 8], [2, 6]], Col.light(c, 1), { flat: true }); if (id === 'thunderstone') q.line([[9, 5], [7, 9], [10, 9], [8, 13]], 0.5, '#f8f070'); if (id === 'firestone') q.ell(8, 10, 2, 3, '#f8d048', { flat: true }); if (id === 'waterstone') q.ell(8, 10, 2.5, 2, '#b8e8ff', { flat: true }); });
    } else if (it.ball) {
      const cv = mkCanvas(16, 16); drawBall(cv.ctx, 8, 8, 0, id, false, false, 1.2); return cv;
    } else if (it.tm) {
      const col = TYPE_COLOR[(MOVES[it.tm] || {}).type] || '#8a8a8a';
      P.part(q => q.ball(8, 8, 7, 7, col, { hl: 1.1 }));
      P.within(q => { q.ell(8, 8, 2.2, 2.2, '#f4f4f8', { flat: true }); q.dot(8, 8, Col.shade(col, 1)); q.line([[4, 4], [6, 3]], 0.5, '#ffffff'); });
    } else if (id === 'townmap') {
      P.part(q => { q.rect(2, 3, 12, 10, '#f0e2b8'); });
      P.within(q => { q.rect(2, 3, 12, 1, '#fff6d8'); q.line([[3, 10], [6, 7], [9, 9], [13, 5]], 0.5, '#58a860'); q.dot(9, 9, '#e04848'); q.rect(2, 3, 1, 10, '#c8a870'); q.rect(13, 3, 1, 10, '#c8a870'); });
    } else if (id === 'veilchime') {
      P.part(q => { q.poly([[8, 2], [12, 11], [4, 11]], '#c8d0e0', { k: 1.4, rim: true }); q.rect(3, 11, 10, 2, '#a8b0c8'); q.rect(7, 0, 2, 3, '#8a90a8'); });
      P.part(q => q.ball(8, 14, 1.6, 1.4, '#e8e8f8'));
      P.within(q => { q.dot(6, 6, '#ffffff'); q.dot(10, 8, '#b890f0'); });
    } else {
      P.part(q => q.ball(8, 8, 6, 6, '#b0b0c0'));
    }
    return P.finish({ ot: 0.6 }).toCanvas();
  }
  return { get(id) { return cache[id] || (cache[id] = build(id)); } };
})();

// tiny glyph icons for the start menu
function menuIcon(c, label, x, y) {
  const R = (xx, yy, w, h, col) => { c.fillStyle = col; c.fillRect(x + xx, y + yy, w, h); };
  switch (label) {
    case 'POKéDEX': R(1, 0, 8, 10, '#c83a3a'); R(2, 1, 6, 4, '#a8e0f0'); R(2, 1, 6, 1, '#e0f6ff'); R(2, 7, 2, 2, '#f8d048'); R(5, 7, 3, 1, '#6a1a1a'); break;
    case 'POKéMON': drawBall(c, x + 5, y + 5, 0, 'pokeball', false, false, 0.8); break;
    case 'BAG': R(1, 3, 8, 7, '#e07848'); R(1, 3, 8, 2, '#f0a070'); R(3, 1, 4, 1, '#a04828'); R(2, 2, 1, 1, '#a04828'); R(7, 2, 1, 1, '#a04828'); R(4, 5, 2, 2, '#f8d048'); break;
    case 'MAP': R(0, 1, 10, 8, '#f0e2b8'); R(0, 1, 10, 1, '#fff6d8'); R(1, 6, 3, 1, '#58a860'); R(4, 4, 3, 1, '#58a860'); R(7, 3, 2, 1, '#58a860'); R(6, 5, 1, 1, '#e04848'); break;
    case 'SAVE': R(1, 0, 8, 10, '#4a70c8'); R(2, 1, 6, 3, '#e8eef8'); R(3, 6, 4, 4, '#2a3a68'); R(5, 7, 1, 2, '#a8b8e0'); break;
    case 'OPTIONS': R(3, 0, 4, 10, '#8a90a0'); R(0, 3, 10, 4, '#8a90a0'); R(1, 1, 8, 8, '#8a90a0'); R(3, 3, 4, 4, '#dfe2ea'); R(4, 4, 2, 2, '#5a6070'); break;
    case 'EXIT': R(0, 4, 6, 2, '#e05848'); R(4, 2, 2, 6, '#e05848'); R(6, 3, 1, 4, '#e05848'); R(7, 4, 1, 2, '#e05848'); break;
    default: R(0, 1, 10, 8, '#e8d8b0'); R(0, 1, 10, 2, '#c85848'); R(1, 4, 3, 3, '#6a88c8'); R(5, 4, 4, 1, '#8a7a60'); R(5, 6, 3, 1, '#8a7a60');
  }
}
const BagArt = {};
function bagSprite(col) {
  if (BagArt[col]) return BagArt[col];
  const P = new Painter(64, 70, 1);
  P.part(q => q.stroke([[17, 26], [20, 8], [44, 8], [47, 26]], 2.6, 2.6, Col.shade(col, 0.9), { k: 1, rim: true }));
  P.part(q => q.poly([[7, 26], [57, 26], [60, 66], [4, 66]], col, { k: 2.4, rim: true, hk: 0.8 }));
  P.within(q => { q.rect(8, 56, 48, 1, Col.shade(col, 0.5)); for (let x = 10; x < 56; x += 4) q.dot(x, 60, Col.light(col, 0.8)); });
  P.part(q => q.poly([[6, 24], [58, 24], [55, 44], [32, 50], [9, 44]], Col.light(col, 0.35), { k: 1.8, rim: true, hk: 0.8 }));
  P.within(q => { for (let x = 12; x < 53; x += 4) q.dot(x, 27, Col.shade(col, 0.4)); });
  P.part(q => { q.rect(27, 42, 10, 9, '#f2d060'); });
  P.within(q => { q.rect(29, 44, 6, 5, '#b89030'); q.rect(30, 45, 4, 3, '#f8e890'); });
  BagArt[col] = P.finish({ ot: 0.7 }).toCanvas();
  return BagArt[col];
}
const POCKETS = [['items', 'ITEMS', '#e07848'], ['balls', 'POKé BALLS', '#e04848'], ['tms', 'TMs', '#4878d8'], ['key', 'KEY ITEMS', '#b8903a']];
class BagScene extends Screen {
  constructor(o = {}) { super(); this.o = o; this.p = o.battle ? 0 : (G.bagPocket || 0); this.sel = {}; this.scroll = {}; }
  get list() { return Bag.pocket(POCKETS[this.p][0]); }
  input() {
    const L = this.list;
    const i = this.sel[this.p] || 0;
    if (Input.repeat('left')) { this.p = (this.p + POCKETS.length - 1) % POCKETS.length; Sound.sfx('cursor'); }
    if (Input.repeat('right')) { this.p = (this.p + 1) % POCKETS.length; Sound.sfx('cursor'); }
    const total = L.length + 1;
    if (Input.repeat('up')) { this.sel[this.p] = (i + total - 1) % total; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.sel[this.p] = (i + 1) % total; Sound.sfx('cursor'); }
    if (Input.cancel()) { Sound.sfx('cancel'); G.bagPocket = this.p; this.close(null); return; }
    if (Input.confirm()) {
      const k = this.sel[this.p] || 0;
      if (k >= L.length) { Sound.sfx('cancel'); G.bagPocket = this.p; this.close(null); return; }
      Sound.sfx('select');
      this.run(this.useFlow(L[k]));
    }
  }
  *useFlow(id) {
    const it = ITEMS[id];
    const B = this.o.battle;
    if (B) {
      if (it.pocket === 'key' || it.pocket === 'tms' || it.repel || it.stone || it.candy) { yield new Say('That can’t be used now.'); return; }
      if (it.ball) {
        if (!B.wild) { this.close({ item: id }); return; }
        if (G.party.length >= 6 && G.box.length >= 60) { yield new Say('The PC box is full!'); return; }
        this.close({ item: id }); return;
      }
      const t = yield new SceneWait(new PartyScene({ mode: 'item' }));
      if (t == null || t < 0) return;
      const m = G.party[t];
      if (!this.itemApplies(it, m)) { yield new Say('It won’t have any effect.'); return; }
      Bag.take(id, 1);
      this.close({ item: id, target: t });
      return;
    }
    const ch = yield new Choice(it.pocket === 'key' || it.pocket === 'tms' ? ['USE', 'CANCEL'] : ['USE', 'TOSS', 'CANCEL'], { x: 190, y: 90, w: 60, cancel: it.pocket === 'key' || it.pocket === 'tms' ? 1 : 2 });
    const opt = (it.pocket === 'key' || it.pocket === 'tms' ? ['USE', 'CANCEL'] : ['USE', 'TOSS', 'CANCEL'])[ch];
    if (opt === 'TOSS') {
      const r = yield* ask(`Throw away one ${it.name}?`);
      if (r === 0) { Bag.take(id, 1); yield new Say(`Threw away the ${it.name}.`); }
      return;
    }
    if (opt !== 'USE') return;
    yield* useItemField(id, this);
  }
  itemApplies(it, m) {
    if (it.revive) return m.fainted;
    if (m.fainted) return false;
    if (it.heal && m.hp < m.stats.hp) return true;
    if (it.cure) { if (it.cure === 'all') return !!m.status; return it.cure.includes(m.status); }
    return false;
  }
  draw(c) {
    const [pid, pname, pcol] = POCKETS[this.p];
    menuBG(c, Col.mix(pcol, '#ffffff', 0.3), Col.mix(pcol, '#ffffff', 0.85), this.t);
    // bag illustration
    c.fillStyle = 'rgba(40,20,20,0.18)'; for (let dy = -3; dy <= 3; dy++) { const w = Math.round(30 * Math.sqrt(1 - dy * dy / 9)); c.fillRect(52 - w, 103 + dy, w * 2, 1); }
    c.drawImage(bagSprite(pcol), 20, 32);
    UI.plain(c, 8, 110, 90, 18, '#ffffff', Col.shade(pcol));
    Font.drawC(c, pname, 53, 115, Col.shade(pcol, 1.2), null);
    Font.draw(c, '◀', 10, 115, pcol, null); Font.drawR(c, '▶', 96, 115, pcol, null);
    for (let k = 0; k < POCKETS.length; k++) { c.fillStyle = k === this.p ? pcol : 'rgba(255,255,255,0.6)'; c.fillRect(30 + k * 12, 132, 8, 4); }
    // list
    const L = this.list, sel = this.sel[this.p] || 0;
    UI.box(c, 104, 6, 148, 132);
    let top = this.scroll[this.p] || 0;
    if (sel < top) top = sel; if (sel > top + 7) top = sel - 7;
    this.scroll[this.p] = top;
    for (let k = 0; k < 8; k++) {
      const j = top + k; if (j > L.length) break;
      const y = 14 + k * 15;
      if (j === L.length) Font.draw(c, 'CLOSE BAG', 124, y, '#707078');
      else {
        const it = ITEMS[L[j]];
        Font.draw(c, it.name.replace(/^TM\d+ /, m => m), 124, y);
        if (it.pocket !== 'key' && it.pocket !== 'tms') Font.drawR(c, `×${Bag.count(L[j])}`, 244, y);
      }
      if (j === sel) UI.cursor(c, 112, y);
    }
    // description
    UI.box(c, 4, 142, 248, 46);
    const desc = sel < L.length ? ITEMS[L[sel]].desc : 'Close the Bag and go back.';
    if (sel < L.length) { c.fillStyle = '#e8e4d8'; c.fillRect(10, 151, 24, 24); c.fillStyle = '#ffffff'; c.fillRect(11, 152, 22, 22); c.drawImage(ItemIcon.get(L[sel]), 14, 155); }
    const tx = sel < L.length ? 40 : 14;
    Font.wrap(desc, 250 - tx - 12).slice(0, 2).forEach((l, k) => Font.draw(c, l, tx, 150 + k * 15));
    UI.plain(c, 14, 8, 78, 16, 'rgba(255,255,255,0.85)', Col.shade(pcol)); Font.drawR(c, `₽${G.money}`, 86, 12, Col.shade(pcol, 1.3), null);
  }
}
// using items outside of battle
function* useItemField(id, screen) {
  const it = ITEMS[id];
  if (it.key === 'map') { yield new SceneWait(new TownMapScene()); return; }
  if (id === 'veilchime') { Sound.sfx('chime'); yield new Say('The chime rings softly... It sounds like the aurora feels.'); return; }
  if (it.repel) { G.repel = it.repel; Bag.take(id, 1); yield new Say(`${G.name} used the ${it.name}. Weak wild Pokémon will stay away.`); return; }
  if (it.ball) { yield new Say('Now isn’t the time to use that!'); return; }
  if (it.tm) {
    const mv = MOVES[it.tm];
    yield new Say(`${it.name.split(' ')[0]} contains ${mv.name}. Teach it to a Pokémon?`);
    const t = yield new SceneWait(new PartyScene({ mode: 'teach', move: it.tm }));
    if (t == null || t < 0) return;
    const m = G.party[t];
    if (!canLearnTM(m.sp, it.tm)) { yield new Say(`${m.name} can’t learn ${mv.name}.`); return; }
    if (m.moves.some(x => x.id === it.tm)) { yield new Say(`${m.name} already knows ${mv.name}.`); return; }
    yield* teachMove(m, it.tm, t2 => new Say(t2), false);
    return;
  }
  const t = yield new SceneWait(new PartyScene({ mode: 'item' }));
  if (t == null || t < 0) return;
  const m = G.party[t];
  if (it.candy) {
    if (m.level >= 100) { yield new Say('It won’t have any effect.'); return; }
    Bag.take(id, 1);
    const need = m.expToNext(); m.exp += need;
    const rec = m.levelUp();
    Sound.jingle('levelup', null);
    yield new Say(`${m.name} grew to Lv. ${m.level}!`);
    yield new StatBox(m, rec);
    for (const mv of rec.moves) yield* teachMove(m, mv, t2 => new Say(t2), false);
    const evo = m.evoTarget();
    if (evo) yield new SceneWait(new EvolutionScene(m, evo));
    return;
  }
  if (it.stone) {
    const evo = m.evoTarget({ item: id });
    if (!evo) { yield new Say('It won’t have any effect.'); return; }
    Bag.take(id, 1);
    yield new SceneWait(new EvolutionScene(m, evo, { stone: true }));
    return;
  }
  if (!screen.itemApplies(it, m)) { yield new Say('It won’t have any effect.'); return; }
  Bag.take(id, 1);
  if (it.revive) { m.hp = Math.max(1, Math.floor(m.stats.hp * it.revive)); Sound.sfx('heal'); yield new Say(`${m.name} was revived!`); return; }
  if (it.heal) { const b = m.hp; m.hp = Math.min(m.stats.hp, m.hp + it.heal); Sound.sfx('heal'); yield new Say(`${m.name}’s HP was restored by ${m.hp - b} points.`); }
  if (it.cure) { m.status = null; m.sleep = 0; Sound.sfx('heal'); yield new Say(`${m.name} was cured!`); }
}

// ── Pokédex ─────────────────────────────────────────────────────────────────
class DexScene extends Screen {
  constructor() { super(); this.i = 0; this.top = 0; this.entry = false; }
  input() {
    const n = DEX_ORDER.length;
    if (this.entry) {
      if (Input.repeat('down')) { this.i = this.next(1); Sound.sfx('cursor'); this.cry(); }
      if (Input.repeat('up')) { this.i = this.next(-1); Sound.sfx('cursor'); this.cry(); }
      if (Input.cancel() || Input.confirm()) { this.entry = false; Sound.sfx('cancel'); }
      return;
    }
    if (Input.repeat('down')) { this.i = Math.min(n - 1, this.i + 1); Sound.sfx('cursor'); }
    if (Input.repeat('up')) { this.i = Math.max(0, this.i - 1); Sound.sfx('cursor'); }
    if (Input.repeat('right')) { this.i = Math.min(n - 1, this.i + 8); Sound.sfx('cursor'); }
    if (Input.repeat('left')) { this.i = Math.max(0, this.i - 8); Sound.sfx('cursor'); }
    if (this.i < this.top) this.top = this.i; if (this.i > this.top + 8) this.top = this.i - 8;
    if (Input.confirm()) { if (G.dex.seen[DEX_ORDER[this.i]]) { this.entry = true; Sound.sfx('select'); this.cry(); } else Sound.sfx('bump'); }
    if (Input.cancel()) { Sound.sfx('cancel'); this.close(); }
  }
  next(d) { const n = DEX_ORDER.length; let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (G.dex.seen[DEX_ORDER[j]]) return j; } return this.i; }
  cry() { Sound.cry(DEX_ORDER[this.i]); }
  draw(c) {
    const sp = SPECIES[DEX_ORDER[this.i]], seen = G.dex.seen[sp.id], caught = G.dex.caught[sp.id];
    // red device frame
    c.fillStyle = '#c83838'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#e05050'; c.fillRect(0, 0, W, 3); c.fillStyle = '#a02828'; c.fillRect(0, H - 3, W, 3);
    for (let i = 0; i < 3; i++) { PX.circle(c, 12 + i * 10, 9, 3, ['#f85858', '#f8d048', '#58d058'][i]); }
    PX.circle(c, 12, 9, 1, '#ffffff');
    Font.draw(c, 'POKéDEX', 44, 5, '#ffffff', '#801818');
    Font.drawR(c, `SEEN ${Dex.seenCount()}   OWN ${Dex.caughtCount()}`, 248, 5, '#ffffff', '#801818');
    // screen
    const scr = (x, y, w, h) => { c.fillStyle = '#301818'; c.fillRect(x - 2, y - 2, w + 4, h + 4); const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d8f0e8'); g.addColorStop(1, '#a8d8c8'); c.fillStyle = g; c.fillRect(x, y, w, h); };
    scr(8, 20, 110, 116);
    if (seen) {
      const spr = PokeArt.get(sp.id, { frame: Math.floor(this.t / 22) % 2 });
      c.drawImage(caught ? spr : silhouetteCached(spr, '#384848'), 31, 120 - spr.bb.y1 - (sp.float ? 8 : 0));
    } else { Font.drawC(c, '?', 63, 70, '#6a8a80', null); }
    c.fillStyle = 'rgba(255,255,255,0.12)'; for (let y = 20; y < 136; y += 2) c.fillRect(8, y, 110, 1);
    if (this.entry) {
      scr(126, 20, 122, 116);
      Font.draw(c, `No.${String(sp.dexNo).padStart(3, '0')}  ${sp.name}`, 132, 26, '#203830', '#c0e0d8');
      Font.draw(c, `${sp.cat} Pokémon`, 132, 40, '#406858', null);
      sp.types.forEach((t, q) => UI.typeBadge(c, t, 132 + q * 40, 54, 38));
      Font.draw(c, `HT ${caught ? sp.ht.toFixed(1) + ' m' : '??? m'}`, 132, 70, '#203830', null);
      Font.draw(c, `WT ${caught ? sp.wt.toFixed(1) + ' kg' : '??? kg'}`, 132, 84, '#203830', null);
      scr(8, 142, 240, 44);
      const txt = caught ? sp.dex : 'Catch this Pokémon to learn more about it.';
      Font.wrap(txt, 228).slice(0, 3).forEach((l, k) => Font.draw(c, l, 14, 146 + k * 13, '#203830', null));
      return;
    }
    scr(126, 20, 122, 166);
    for (let k = 0; k < 9; k++) {
      const j = this.top + k; if (j >= DEX_ORDER.length) break;
      const s2 = SPECIES[DEX_ORDER[j]], y = 26 + k * 18;
      if (j === this.i) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(128, y - 3, 118, 16); }
      if (G.dex.caught[s2.id]) drawBall(c, 138, y + 4, 0, 'pokeball', false, false, 0.6);
      Font.draw(c, String(s2.dexNo).padStart(3, '0'), 148, y, '#406858', null);
      Font.draw(c, G.dex.seen[s2.id] ? s2.name : '----------', 170, y, '#203830', null);
    }
    scr(8, 142, 110, 44);
    Font.draw(c, 'A: entry', 14, 148, '#203830', null); Font.draw(c, '◀▶: page', 14, 162, '#203830', null); Font.draw(c, 'B: close', 14, 174, '#203830', null);
  }
}

// ── start menu (overlay) ────────────────────────────────────────────────────
class StartMenu {
  constructor(ow) {
    this.ow = ow; this.opaque = false; this.i = G.menuIdx || 0; this.co = null; this.t = 0;
    this.build();
  }
  build() {
    const it = [];
    if (G.flags.dex) it.push(['POKéDEX', () => new DexScene()]);
    if (G.party.length) it.push(['POKéMON', () => new PartyScene({ mode: 'menu' })]);
    it.push(['BAG', () => new BagScene()]);
    if (Bag.count('townmap')) it.push(['MAP', () => new TownMapScene()]);
    it.push([G.name, () => new TrainerCard()]);
    it.push(['SAVE', null]);
    it.push(['OPTIONS', () => new OptionsScene()]);
    it.push(['EXIT', null]);
    this.items = it;
    if (this.i >= it.length) this.i = 0;
  }
  update() {
    this.t++;
    if (this.co && !this.co.done) { this.co.update(); return; }
    this.co = null;
    const n = this.items.length;
    if (Input.repeat('up')) { this.i = (this.i + n - 1) % n; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.i = (this.i + 1) % n; Sound.sfx('cursor'); }
    if (Input.cancel() || Input.pressed('start')) { Sound.sfx('cancel'); Game.pop(); return; }
    if (Input.pressed('a')) {
      const [label, mk] = this.items[this.i];
      G.menuIdx = this.i;
      Sound.sfx('select');
      if (label === 'EXIT') { Game.pop(); return; }
      if (label === 'SAVE') { this.co = new Co(this.saveFlow(), this); return; }
      this.co = new Co((function* (self) { yield new SceneWait(mk()); self.build(); })(this), this);
    }
  }
  *saveFlow() {
    const r = yield* ask('Would you like to save the game?');
    if (r !== 0) return;
    yield new Say('Saving... Don’t turn off the power.', { auto: 30 });
    Save.write();
    Sound.sfx('save');
    yield new Say(`${G.name} saved the game!`);
  }
  draw(c) {
    const n = this.items.length, w = 100, h = n * 15 + 12;
    UI.box(c, 256 - w - 4, 4, w, h);
    const x0 = 256 - w - 4;
    this.items.forEach(([l], k) => {
      const y = 12 + k * 15;
      if (k === this.i) { c.fillStyle = 'rgba(90,140,220,0.16)'; c.fillRect(x0 + 5, y - 3, w - 10, 14); }
      menuIcon(c, ['POKéDEX', 'POKéMON', 'BAG', 'MAP', 'SAVE', 'OPTIONS', 'EXIT'].includes(l) ? l : 'CARD', x0 + 18, y);
      Font.draw(c, l, x0 + 32, y);
      if (k === this.i) UI.cursor(c, x0 + 6, y);
    });
    // hint strip
    const tips = { 'POKéDEX': 'A record of Pokémon you’ve met.', 'POKéMON': 'Check on your team.', BAG: 'Items, Poké Balls and more.', MAP: 'View the Town Map.', SAVE: 'Save your adventure.', OPTIONS: 'Adjust game settings.', EXIT: 'Close this menu.' };
    const tip = tips[this.items[this.i][0]] || 'Your Trainer Card.';
    UI.box(c, 4, 160, 248, 28);
    Font.draw(c, tip, 14, 169);
  }
}

class TrainerCard extends Screen {
  input() { if (Input.cancel() || Input.confirm()) { Sound.sfx('cancel'); this.close(); } }
  draw(c) {
    menuBG(c, '#3a4a78', '#8a9ad0', this.t);
    UI.plain(c, 12, 12, 232, 168, '#f4ecd8', '#6a5030');
    c.fillStyle = '#e0c890'; c.fillRect(14, 14, 228, 16);
    Font.draw(c, 'TRAINER CARD', 22, 18, '#6a5030', '#f8f0d8');
    Font.drawR(c, `IDNo. ${String(G.id).padStart(5, '0')}`, 234, 18, '#6a5030', '#f8f0d8');
    const rows = [['NAME', G.name], ['MONEY', `₽${G.money}`], ['POKéDEX', G.flags.dex ? `${Dex.caughtCount()}` : '---'], ['TIME', fmtTime(G.time)]];
    rows.forEach(([k, v], i) => { Font.draw(c, k, 24, 40 + i * 18, '#8a7050'); Font.drawR(c, v, 150, 40 + i * 18); c.fillStyle = '#d8c8a0'; c.fillRect(24, 52 + i * 18, 126, 1); });
    const img = TrainerArt.front(G.gender === 'f' ? 'girl' : 'boy');
    c.drawImage(img, 166, 32);
    Font.draw(c, 'PRISM BADGES', 24, 124, '#8a7050');
    const badges = [['green', '#48c060', 'Verdant'], ['blue', '#4880f0', 'Tidal'], ['red', '#f05048', 'Ember']];
    badges.forEach(([k, col, nm], i) => {
      const x = 44 + i * 64, y = 150;
      const has = G.badges[k];
      c.fillStyle = has ? Col.shade(col) : '#c8c0b0';
      c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 12, y); c.lineTo(x, y + 14); c.lineTo(x - 12, y); c.closePath(); c.fill();
      c.fillStyle = has ? col : '#ddd4c4';
      c.beginPath(); c.moveTo(x, y - 11); c.lineTo(x + 9, y); c.lineTo(x, y + 11); c.lineTo(x - 9, y); c.closePath(); c.fill();
      if (has) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x - 3, y - 6, 2, 5); if ((this.t >> 3) % 8 === i) PX.star(c, x + 5, y - 7, 3, '#ffffff'); }
      Font.drawC(c, nm, x, y + 17, has ? '#404048' : '#b0a898', null);
    });
  }
}
function fmtTime(frames) { const s = Math.floor(frames / 60); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`; }

class OptionsScene extends Screen {
  constructor() { super(); this.i = 0; }
  get rows() {
    return [
      ['TEXT SPEED', ['SLOW', 'MID', 'FAST'], 'textSpeed'],
      ['FRAME', FRAMES.map(f => f.name.toUpperCase()), 'frame'],
      ['MUSIC', ['OFF', '1', '2', '3', '4', '5'], 'music'],
      ['SOUND FX', ['OFF', '1', '2', '3', '4', '5'], 'sfx'],
      ['TIME OF DAY', ['REAL', 'DAY', 'NIGHT'], 'timeIdx'],
    ];
  }
  input() {
    const rows = this.rows, n = rows.length;
    if (Input.repeat('up')) { this.i = (this.i + n) % (n + 1); Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.i = (this.i + 1) % (n + 1); Sound.sfx('cursor'); }
    if (this.i < n) {
      const [, vals, key] = rows[this.i];
      let v = G.options[key];
      if (Input.repeat('left')) { v = (v + vals.length - 1) % vals.length; Sound.sfx('cursor'); }
      if (Input.repeat('right')) { v = (v + 1) % vals.length; Sound.sfx('cursor'); }
      G.options[key] = v;
      applyOptions();
    }
    if (Input.cancel() || (Input.confirm() && this.i === n)) { Sound.sfx('cancel'); this.close(); }
  }
  draw(c) {
    menuBG(c, '#586890', '#a8b8d8', this.t);
    titleBar(c, 'OPTIONS', '#3a4a78');
    UI.box(c, 8, 24, 240, 130);
    this.rows.forEach(([label, vals, key], k) => {
      const y = 34 + k * 20;
      Font.draw(c, label, 28, y, k === this.i ? '#e05838' : '#404048');
      Font.drawR(c, `◀ ${vals[G.options[key]]} ▶`, 236, y, k === this.i ? '#3060c8' : '#404048');
      if (k === this.i) UI.cursor(c, 16, y);
    });
    const n = this.rows.length;
    Font.draw(c, 'CLOSE', 28, 34 + n * 20, n === this.i ? '#e05838' : '#404048'); if (this.i === n) UI.cursor(c, 16, 34 + n * 20);
    UI.box(c, 8, 158, 240, 28);
    Font.draw(c, ['How quickly text appears.', 'Style of text box frames.', 'Background music volume.', 'Sound effect volume.', 'Real clock, or always day/night.', 'Return to the game.'][this.i], 18, 167);
  }
}
function applyOptions() {
  const o = G.options;
  o.time = ['real', 'day', 'night'][o.timeIdx || 0];
  Sound.setVolume('music', [0, 0.18, 0.32, 0.45, 0.58, 0.72][o.music != null ? o.music : 3]);
  Sound.setVolume('sfx', [0, 0.25, 0.4, 0.55, 0.7, 0.85][o.sfx != null ? o.sfx : 4]);
}

// ── shop ────────────────────────────────────────────────────────────────────
class ShopScene extends Screen {
  constructor(stock) { super(); this.opaque = false; this.stock = stock; this.run(this.flow()); }
  input() { this.close(); }
  *flow() {
    while (true) {
      const r = yield new Choice(['BUY', 'SELL', 'SEE YA!'], { x: 8, y: 8, w: 84, cancel: 2 });
      if (r === 2) break;
      if (r === 0) yield* this.buy();
      else yield* this.sell();
    }
    this.close();
  }
  *buy() {
    while (true) {
      const items = this.stock.map(id => ({ label: ITEMS[id].name, right: `₽${ITEMS[id].price}` }));
      const lm = new ListMenu(items.concat([{ label: 'CANCEL' }]), { x: 96, y: 8, w: 156, rows: 8 });
      this.showMoney = true;
      const k = yield lm;
      if (k < 0 || k >= this.stock.length) { this.showMoney = false; return; }
      const id = this.stock[k], it = ITEMS[id];
      const max = Math.min(99, Math.floor(G.money / it.price));
      if (max <= 0) { yield new Say('You don’t have enough money.'); continue; }
      const q = yield new QtyPicker(max, it.price);
      if (q <= 0) continue;
      const r = yield* ask(`${it.name}, and you want ${q}. That will be ₽${it.price * q}. OK?`);
      if (r !== 0) continue;
      G.money -= it.price * q; Bag.add(id, q); Sound.sfx('save');
      yield new Say('Here you are! Thank you!');
      if (id === 'pokeball' && q >= 10) { Bag.add('greatball', 1); yield new Say('I’ll throw in a Great Ball, too!'); }
    }
  }
  *sell() {
    while (true) {
      const ids = Object.keys(G.bag).filter(id => ITEMS[id].price > 0 && ITEMS[id].pocket !== 'key' && ITEMS[id].pocket !== 'tms');
      if (!ids.length) { yield new Say('You don’t have anything to sell.'); return; }
      const lm = new ListMenu(ids.map(id => ({ label: ITEMS[id].name, right: `×${Bag.count(id)}` })).concat([{ label: 'CANCEL' }]), { x: 96, y: 8, w: 156, rows: 8 });
      this.showMoney = true;
      const k = yield lm;
      if (k < 0 || k >= ids.length) { this.showMoney = false; return; }
      const id = ids[k], it = ITEMS[id], price = Math.floor(it.price / 2);
      const q = yield new QtyPicker(Bag.count(id), price);
      if (q <= 0) continue;
      const r = yield* ask(`I can pay ₽${price * q}. Would that be OK?`);
      if (r !== 0) continue;
      Bag.take(id, q); G.money += price * q; Sound.sfx('save');
      yield new Say(`Turned over the ${it.name} and received ₽${price * q}.`);
    }
  }
  draw(c) { UI.box(c, 8, 70, 84, 32); Font.draw(c, 'MONEY', 18, 77, '#6a7080'); Font.drawR(c, `₽${G.money}`, 84, 88); }
}
class QtyPicker {
  constructor(max, price) { this.max = max; this.price = price; this.q = 1; this.done = false; }
  update() {
    if (Input.repeat('up')) { this.q = this.q >= this.max ? 1 : this.q + 1; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.q = this.q <= 1 ? this.max : this.q - 1; Sound.sfx('cursor'); }
    if (Input.repeat('right')) { this.q = Math.min(this.max, this.q + 10); Sound.sfx('cursor'); }
    if (Input.repeat('left')) { this.q = Math.max(1, this.q - 10); Sound.sfx('cursor'); }
    if (Input.confirm()) { Sound.sfx('select'); this.result = this.q; this.done = true; }
    if (Input.cancel()) { Sound.sfx('cancel'); this.result = 0; this.done = true; }
  }
  draw(c) { UI.box(c, 140, 140, 112, 32); Font.draw(c, `× ${String(this.q).padStart(2, '0')}`, 152, 151); Font.drawR(c, `₽${this.q * this.price}`, 242, 151); Font.draw(c, '▲', 150, 142, '#e05848', null); }
}

// ── PC storage ──────────────────────────────────────────────────────────────
class PCScene extends Screen {
  constructor() { super(); this.opaque = false; this.run(this.flow()); }
  input() { this.close(); }
  *flow() {
    Sound.sfx('select');
    yield new Say(`${G.name} booted up the PC.`);
    yield new Say('Accessed Professor Linden’s Pokémon Storage System.');
    while (true) {
      const r = yield new Choice(['WITHDRAW', 'DEPOSIT', 'SEE YA!'], { x: 8, y: 8, w: 100, cancel: 2 });
      if (r === 2) break;
      if (r === 0) {
        if (!G.box.length) { yield new Say('There are no Pokémon in the box.'); continue; }
        if (G.party.length >= 6) { yield new Say('Your party is full!'); continue; }
        const k = yield new ListMenu(G.box.map(m => ({ label: m.name, right: `Lv${m.level}` })), { x: 112, y: 8, w: 140, rows: 8 });
        if (k < 0) continue;
        const m = G.box.splice(k, 1)[0]; G.party.push(m);
        yield new Say(`Withdrew ${m.name}.`);
      } else {
        if (G.party.length <= 1) { yield new Say('That’s your last Pokémon!'); continue; }
        const k = yield new SceneWait(new PartyScene({ mode: 'select', title: 'Deposit which Pokémon?' }));
        if (k == null || k < 0) continue;
        if (G.party.filter(m => !m.fainted).length <= 1 && !G.party[k].fainted) { yield new Say('You need at least one healthy Pokémon!'); continue; }
        const m = G.party.splice(k, 1)[0]; m.heal(); G.box.push(m);
        yield new Say(`Deposited ${m.name}.`);
      }
    }
    this.close();
  }
  draw() {}
}

// ── name entry ──────────────────────────────────────────────────────────────
class NameEntry extends Screen {
  constructor(o = {}) {
    super(); this.o = o; this.name = ''; this.max = o.max || 8; this.x = 0; this.y = 0; this.page = 0;
    this.pages = [['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ ', '.,’-!?♂♀ '], ['abcdefghi', 'jklmnopqr', 'stuvwxyz ', '0123456789'.slice(0, 9)]];
    Input.typed();
  }
  input() {
    const typed = Input.typed();
    for (const k of typed) {
      if (k === 'Backspace') { this.name = this.name.slice(0, -1); Sound.sfx('cancel'); }
      else if (k === 'Enter') { if (this.name.trim()) { this.done(); return; } }
      else if (k.length === 1 && /[A-Za-z0-9 .,'\-!?]/.test(k) && this.name.length < this.max) { this.name += k; Sound.sfx('cursor'); }
    }
    // keys that were typed as text shouldn't also drive the on-screen keyboard
    if (typed.length) return;
    if (Input.pressed('run')) { this.page = 1 - this.page; Sound.sfx('select'); }
    const rows = 5;
    if (Input.repeat('up')) { this.y = (this.y + rows - 1) % rows; Sound.sfx('cursor'); }
    if (Input.repeat('down')) { this.y = (this.y + 1) % rows; Sound.sfx('cursor'); }
    if (Input.repeat('left')) { this.x = (this.x + 8) % 9; Sound.sfx('cursor'); }
    if (Input.repeat('right')) { this.x = (this.x + 1) % 9; Sound.sfx('cursor'); }
    if (Input.cancel()) { this.name = this.name.slice(0, -1); Sound.sfx('cancel'); }
    if (Input.pressed('start')) { if (this.name.trim()) this.done(); return; }
    if (Input.pressed('a')) {
      if (this.y === 4) {
        const act = ['CASE', 'CASE', 'CASE', 'DEL', 'DEL', 'DEL', 'OK', 'OK', 'OK'][this.x];
        if (act === 'CASE') { this.page = 1 - this.page; Sound.sfx('select'); }
        else if (act === 'DEL') { this.name = this.name.slice(0, -1); Sound.sfx('cancel'); }
        else if (this.name.trim()) this.done(); else Sound.sfx('bump');
        return;
      }
      const ch = (this.pages[this.page][this.y] || '')[this.x];
      if (ch != null && this.name.length < this.max) { this.name += ch; Sound.sfx('cursor'); }
      if (this.name.length >= this.max) { this.x = 7; this.y = 4; }
    }
  }
  done() { Sound.sfx('select'); this.close(this.name.trim()); }
  draw(c) {
    menuBG(c, '#e8a060', '#f8e0c0', this.t);
    UI.box(c, 8, 8, 240, 48);
    if (this.o.icon) c.drawImage(PokeArt.get(this.o.icon, { icon: true }), 14, 14 - (Math.floor(this.t / 12) % 2) * 2);
    else if (this.o.gender) c.drawImage(People.frame(this.o.gender === 'f' ? LOOKS.girl : LOOKS.boy, 'down', (Math.floor(this.t / 16) % 2) ? 1 : 0), 22, 20);
    Font.draw(c, this.o.title || 'Your name?', 48, 16);
    for (let k = 0; k < this.max; k++) {
      const x = 48 + k * 10, y = 36;
      if (this.name[k]) Font.draw(c, this.name[k], x, y - 2); else { c.fillStyle = k === this.name.length && (this.t >> 4) % 2 ? '#e05838' : '#808890'; c.fillRect(x, y + 8, 7, 1); }
    }
    UI.box(c, 8, 62, 240, 122);
    const page = this.pages[this.page];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) {
      const ch = page[r][k]; if (!ch || ch === ' ') continue;
      const x = 28 + k * 23, y = 74 + r * 20;
      if (r === this.y && k === this.x) { c.fillStyle = '#f8d8a0'; c.fillRect(x - 5, y - 4, 17, 16); }
      Font.draw(c, ch, x, y);
    }
    const acts = ['CASE', 'DEL', 'OK'];
    acts.forEach((a, k) => { const x = 36 + k * 72, y = 158; const sel = this.y === 4 && Math.floor(this.x / 3) === k; c.fillStyle = sel ? '#e05838' : '#a09080'; c.fillRect(x - 4, y - 4, 56, 16); c.fillStyle = sel ? '#fff0e0' : '#f0e8e0'; c.fillRect(x - 3, y - 3, 54, 14); Font.drawC(c, a, x + 24, y); });
    c.fillStyle = 'rgba(255,250,240,0.85)'; c.fillRect(10, 176, 236, 13); c.fillStyle = 'rgba(154,106,64,0.5)'; c.fillRect(10, 188, 236, 1);
    Font.drawC(c, 'Type with your keyboard too!  Shift: case', 128, 178, '#8a5a30', null);
  }
}

// ── town map ────────────────────────────────────────────────────────────────
const REGION = {
  dawnmere: [60, 150, 'Dawnmere Town', 'town'], route1: [70, 124, 'Route 1', 'route'], mossgrove: [80, 98, 'Mossgrove Town', 'town'],
  glimmerwood: [112, 90, 'Glimmerwood', 'route'], brinecrest: [150, 110, 'Brinecrest Harbor', 'town'], route3: [178, 88, 'Route 3', 'route'],
  tunnel: [184, 62, 'Emberpeak Tunnel', 'route'], cinderfall: [168, 42, 'Cinderfall City', 'town'], frostveil: [124, 34, 'Frostveil Path', 'route'], spire: [90, 22, 'Prism Spire', 'special'],
};
class TownMapScene extends Screen {
  constructor() { super(); this.keys = Object.keys(REGION); const cur = (G.map && MAPS[G.map] && MAPS[G.map].region) || 'dawnmere'; this.i = Math.max(0, this.keys.indexOf(cur)); this.cur = cur; }
  input() {
    if (Input.repeat('down') || Input.repeat('left')) { this.i = (this.i + this.keys.length - 1) % this.keys.length; Sound.sfx('cursor'); }
    if (Input.repeat('up') || Input.repeat('right')) { this.i = (this.i + 1) % this.keys.length; Sound.sfx('cursor'); }
    if (Input.cancel() || Input.confirm()) { Sound.sfx('cancel'); this.close(); }
  }
  draw(c) {
    drawRegionMap(c, this.t, 1);
    // route line with a dark casing
    for (let k = 0; k < this.keys.length - 1; k++) { const [x0, y0] = REGION[this.keys[k]], [x1, y1] = REGION[this.keys[k + 1]]; PX.line(c, x0, y0 + 1, x1, y1 + 1, 'rgba(40,30,20,0.45)', 3); }
    for (let k = 0; k < this.keys.length - 1; k++) { const [x0, y0] = REGION[this.keys[k]], [x1, y1] = REGION[this.keys[k + 1]]; PX.line(c, x0, y0, x1, y1, '#f6e6b0', 2); }
    this.keys.forEach((k, j) => {
      const [x, y, , kind] = REGION[k];
      const seen = G.visited[k];
      if (kind === 'town') {
        c.fillStyle = '#262c3c'; c.fillRect(x - 5, y - 5, 11, 11);
        c.fillStyle = seen ? '#e84a3e' : '#9a9ca8'; c.fillRect(x - 4, y - 4, 9, 9);
        c.fillStyle = seen ? '#ff8a78' : '#c4c6ce'; c.fillRect(x - 4, y - 4, 9, 2);
        c.fillStyle = '#fbf6ea'; c.fillRect(x - 2, y, 5, 3); c.fillStyle = '#262c3c'; c.fillRect(x, y + 1, 1, 2);
      } else if (kind === 'special') { PX.diamond(c, x, y, 6, '#262c3c'); PX.diamond(c, x, y, 5, '#c8b8f8'); PX.diamond(c, x, y - 1, 2, '#ffffff'); }
      else { PX.circle(c, x, y, 3, '#262c3c'); PX.circle(c, x, y, 2, seen ? '#f8f0c0' : '#c8c8c0'); }
      if (k === this.cur && (this.t >> 4) % 2) { const img = People.frame(G.gender === 'f' ? LOOKS.girl : LOOKS.boy, 'down', 0); c.drawImage(img, x - 9, y - 24); }
      if (j === this.i) { const b = (this.t >> 3) % 2; c.fillStyle = '#262c3c'; c.fillRect(x - 4, y - 17 - b, 9, 3); c.fillRect(x - 3, y - 14 - b, 7, 2); c.fillRect(x - 1, y - 12 - b, 3, 1); c.fillStyle = '#f8d048'; c.fillRect(x - 3, y - 16 - b, 7, 2); c.fillRect(x - 2, y - 14 - b, 5, 1); c.fillRect(x, y - 13 - b, 1, 1); }
    });
    UI.box(c, 4, 164, 248, 26);
    Font.draw(c, REGION[this.keys[this.i]][2], 14, 172);
    Font.drawR(c, 'LUMIRA REGION', 244, 172, '#6a7080');
  }
}
const RegionArt = {};
function regionBase(sat) {
  const key = sat ? 'c' : 'g';
  if (RegionArt[key]) return RegionArt[key];
  const cv = mkCanvas(W, H), x = cv.ctx;
  const land = [[40, 170], [30, 140], [44, 110], [56, 80], [70, 40], [90, 12], [130, 14], [170, 20], [206, 36], [214, 70], [200, 96], [196, 124], [170, 132], [150, 128], [128, 138], [96, 160], [70, 176]];
  // land mask with a wobbly coastline
  const m = mkCanvas(W, H), mx = m.ctx;
  mx.fillStyle = '#fff'; mx.beginPath();
  const pts = [];
  for (let i = 0; i < land.length; i++) {
    const [ax, ay] = land[i], [bx, by] = land[(i + 1) % land.length];
    for (let s = 0; s < 8; s++) { const t = s / 8, px = ax + (bx - ax) * t, py = ay + (by - ay) * t; const n = (vnoise(px / 9, py / 9, 5) - 0.5) * 7; pts.push([px + n, py + n * 0.6]); }
  }
  pts.forEach(([px, py], i) => (i ? mx.lineTo(px, py) : mx.moveTo(px, py))); mx.closePath(); mx.fill();
  const md = mx.getImageData(0, 0, W, H).data, isLand = (i) => md[i * 4 + 3] > 128;
  // distance to the coast (both sides), chamfer passes
  const D = new Float32Array(W * H).fill(99);
  for (let i = 0; i < W * H; i++) { const xx = i % W, yy = (i / W) | 0; const l = isLand(i); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = xx + dx, ny = yy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (isLand(ny * W + nx) !== l) { D[i] = 0; break; } } }
  for (let pass = 0; pass < 2; pass++) {
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const i = yy * W + xx; if (xx > 0) D[i] = Math.min(D[i], D[i - 1] + 1); if (yy > 0) D[i] = Math.min(D[i], D[i - W] + 1); }
    for (let yy = H - 1; yy >= 0; yy--) for (let xx = W - 1; xx >= 0; xx--) { const i = yy * W + xx; if (xx < W - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (yy < H - 1) D[i] = Math.min(D[i], D[i + W] + 1); }
  }
  const id = x.createImageData(W, H), d = new Uint32Array(id.data.buffer);
  const pk = h => Col.pack(sat ? h : Col.grey(h));
  const SEA = ['#8ad4f4', '#6cc0f0', '#56ace8', '#4698de', '#3a86d0', '#3276c2'].map(pk);
  const GRN = ['#5ea848', '#6cb852', '#7ac65c', '#8cd268'].map(pk);
  const sand = pk('#f0dca0'), sandD = pk('#d8c080'), coast = pk('#4a8a3c'), foam = pk('#e8f8ff');
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = yy * W + xx, b = bayer(xx, yy);
    if (isLand(i)) {
      const dd = D[i];
      if (dd < 1) d[i] = coast;
      else if (dd < 3) d[i] = dd < 2 ? sandD : sand;
      else { const n = fbm(xx / 22, yy / 22, 3) + dd / 120; d[i] = GRN[clamp(Math.floor(n * 4 + (b - 0.5) * 0.8), 0, 3)]; }
    } else {
      const dd = D[i];
      if (dd < 1.5) { d[i] = foam; continue; }
      const v = Math.sqrt(dd) * 0.9 + (b - 0.5) * 0.9 + (fbm(xx / 30, yy / 30, 8) - 0.5) * 0.8;
      d[i] = SEA[clamp(Math.floor(v), 0, 5)];
    }
  }
  x.putImageData(id, 0, 0);
  const S = c0 => sat ? c0 : Col.grey(c0);
  // faint chart grid over the sea
  x.fillStyle = 'rgba(255,255,255,0.08)';
  for (let gx = 16; gx < W; gx += 32) x.fillRect(gx, 0, 1, H);
  for (let gy = 16; gy < H; gy += 32) x.fillRect(0, gy, W, 1);
  // forest clumps (Glimmerwood)
  const rng = seeded(4);
  for (let i = 0; i < 26; i++) {
    const tx = 98 + rng() * 30, ty = 78 + rng() * 22, r = 3 + rng() * 2;
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); x.fillStyle = S(dy > r * 0.3 ? '#2a6e38' : '#3a8a48'); x.fillRect(Math.round(tx - w), Math.round(ty + dy), w * 2, 1); }
    x.fillStyle = S('#6cc060'); x.fillRect(Math.round(tx - 1), Math.round(ty - r + 1), 2, 1);
  }
  // mountains: shaded triangles; snowy ones to the north, Emberpeak to the east
  const peak = (px, py, h, w, col, capCol) => {
    for (let yy = 0; yy < h; yy++) {
      const hw = Math.round(w * yy / h);
      x.fillStyle = S(col); x.fillRect(px - hw, py - h + yy, hw, 1);
      x.fillStyle = S(Col.shade(col, 0.8)); x.fillRect(px, py - h + yy, hw + 1, 1);
      if (capCol && yy < h * 0.4) { x.fillStyle = S(capCol); x.fillRect(px - hw, py - h + yy, hw, 1); x.fillStyle = S(Col.shade(capCol, 0.5)); x.fillRect(px, py - h + yy, hw + 1, 1); }
    }
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(px - w + 2, py, w * 2, 1);
  };
  for (const [px, py, h] of [[82, 50, 16], [98, 38, 20], [116, 32, 16], [134, 38, 14], [72, 64, 12]]) peak(px, py, h, h * 0.9, '#a8b4c8', '#f4f8ff');
  for (const [px, py, h] of [[196, 60, 16], [206, 74, 12], [180, 72, 12]]) peak(px, py, h, h * 0.9, '#9a7458', null);
  peak(188, 50, 20, 17, '#7a5a48', null);
  x.fillStyle = S('#f86820'); x.fillRect(185, 30, 7, 2); x.fillStyle = S('#ffc050'); x.fillRect(187, 29, 3, 1);
  for (let i = 0; i < 5; i++) { x.fillStyle = S(i % 2 ? '#f86820' : '#ffb040'); x.fillRect(186 + ((i * 3) % 5) - 1, 32 + i * 2, 1, 2); }
  // the Prism Spire
  x.fillStyle = S('#b8c0f0'); x.beginPath(); x.moveTo(90, 2); x.lineTo(94, 22); x.lineTo(86, 22); x.closePath(); x.fill();
  x.fillStyle = S('#f0f4ff'); x.beginPath(); x.moveTo(90, 2); x.lineTo(89, 22); x.lineTo(86, 22); x.closePath(); x.fill();
  // compass rose
  const cx = 228, cy = 150;
  x.fillStyle = 'rgba(20,40,80,0.35)'; x.beginPath(); x.arc(cx, cy + 1, 11, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#f4f0e0'; x.beginPath(); x.moveTo(cx, cy - 12); x.lineTo(cx + 3, cy); x.lineTo(cx, cy + 12); x.lineTo(cx - 3, cy); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(cx - 12, cy); x.lineTo(cx, cy - 3); x.lineTo(cx + 12, cy); x.lineTo(cx, cy + 3); x.closePath(); x.fill();
  x.fillStyle = '#e04848'; x.beginPath(); x.moveTo(cx, cy - 12); x.lineTo(cx + 3, cy); x.lineTo(cx - 3, cy); x.closePath(); x.fill();
  Tiny.draw(x, 'N', cx - 1, cy - 19, '#f4f0e0');
  cv.glints = [];
  const r2 = seeded(9);
  for (let i = 0; i < 400 && cv.glints.length < 34; i++) { const gx = Math.floor(r2() * (W - 6)), gy = Math.floor(r2() * H); if (!isLand(gy * W + gx) && !isLand(gy * W + gx + 5) && D[gy * W + gx] > 4) cv.glints.push([gx, gy, r2() * 6]); }
  RegionArt[key] = cv;
  return cv;
}
function drawRegionMap(c, t, sat = 1) {
  const base = regionBase(sat);
  c.drawImage(base, 0, 0);
  for (const [gx, gy, ph] of base.glints) {
    const a = 0.1 + 0.25 * Math.max(0, Math.sin(t * 0.04 + ph));
    c.fillStyle = `rgba(255,255,255,${a})`; c.fillRect(gx + Math.round(Math.sin(t * 0.02 + ph) * 1.5), gy, 4, 1);
  }
}

// ── evolution ───────────────────────────────────────────────────────────────
class EvolutionScene extends Screen {
  constructor(m, into, o = {}) { super(); this.m = m; this.into = into; this.o = o; this.run(this.flow()); this.phase = 0; this.flash = 0; this.sparks = []; }
  input() { this.close(); }
  *flow() {
    const m = this.m, oldName = m.name;
    Sound.play('evolve', { restart: true });
    yield 20;
    yield new Say(`What? ${oldName} is evolving!`);
    Sound.cry(m.sp);
    this.phase = 1;
    let cancelled = false;
    for (let cycle = 0; cycle < 9; cycle++) {
      const period = Math.max(4, 30 - cycle * 3);
      for (let k = 0; k < 2; k++) {
        this.showNew = k === 1;
        for (let f = 0; f < period; f++) { if (Input.held('b') && !this.o.stone) cancelled = true; yield 1; }
      }
      if (cancelled) break;
    }
    if (cancelled) {
      this.phase = 0; this.showNew = false;
      Sound.stop();
      yield new Say(`Huh? ${oldName} stopped evolving!`);
      this.close(false); return;
    }
    this.phase = 2; this.flash = 1; Sound.sfx('evolveFlash');
    yield 30;
    const oldSp = m.sp;
    m.evolveInto(this.into);
    Dex.catch(this.into);
    this.phase = 3; this.showNew = true;
    Sound.cry(this.into);
    Sound.play('evolved', { restart: true });
    yield new Say(`Congratulations! Your ${oldName} evolved into ${SPECIES[this.into].name}!`);
    for (const mv of m.movesAt(m.level)) if (!SPECIES[oldSp].learn.some(([lv, id]) => id === mv && lv <= m.level)) yield* teachMove(m, mv, t => new Say(t), false);
    this.close(true);
  }
  draw(c) {
    const g = c.createRadialGradient(128, 80, 10, 128, 80, 180);
    g.addColorStop(0, this.phase >= 1 ? '#5a4a90' : '#2a3a5a'); g.addColorStop(1, '#0a0a1a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (this.phase >= 1) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + this.t * 0.01; c.fillStyle = 'rgba(200,220,255,0.08)'; c.beginPath(); c.moveTo(128, 80); c.lineTo(128 + Math.cos(a) * 200, 80 + Math.sin(a) * 200); c.lineTo(128 + Math.cos(a + 0.1) * 200, 80 + Math.sin(a + 0.1) * 200); c.fill(); }
    const sp = this.showNew ? this.into : this.m.sp;
    const spr = PokeArt.get(sp, { frame: Math.floor(this.t / 22) % 2, shiny: this.m.shiny });
    const x = 96, y = 112 - spr.bb.y1;
    if (this.phase === 1) c.drawImage(silhouetteCached(spr, '#f0f4ff'), x, y);
    else c.drawImage(spr, x, y);
    if (this.phase >= 1 && this.phase < 3) for (let i = 0; i < 20; i++) { const a = i * 0.9 + this.t * 0.05, r = 70 - ((this.t * 1.5 + i * 12) % 70); PX.star(c, 128 + Math.cos(a) * r, 80 + Math.sin(a) * r, 2, '#ffffff'); }
    if (this.flash > 0) { c.globalAlpha = this.flash; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; this.flash = Math.max(0, this.flash - 0.02); }
    if (this.phase === 3) sparkleStatic(c, this.t);
  }
}
function sparkleStatic(c, t) { for (let i = 0; i < 14; i++) { if ((t + i * 5) % 30 < 18) PX.star(c, 60 + (i * 37) % 140, 30 + (i * 23) % 90, 2, '#fff8c0'); } }
