'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Original soundtrack for Pokémon Aurora, written in MML with a few helpers
//  that turn chord symbols into arpeggios / bass lines.
// ─────────────────────────────────────────────────────────────────────────────
const MUSIC = (() => {
  const NAMES = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6], '5': [0, 7, 12] };
  const n = (midi, len) => `o${Math.floor(midi / 12) - 1}${NAMES[((midi % 12) + 12) % 12]}${len}`;
  function chord(sym, oct) {
    const m = sym.match(/^([A-G])([#b]?)(.*)$/);
    let root = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const iv = QUAL[m[3]] || QUAL[''];
    const base = 12 * (oct + 1) + root;
    return iv.map(i => base + i);
  }
  // chords: "D Bm G A" (one per bar) or "G.A" (split bar)
  function eachBar(chords, fn) { return chords.trim().split(/\s+/).map(c => c.split('.')).map(parts => parts.map(p => fn(p, 1 / parts.length)).join(' ')).join(' | '); }
  function arp(chords, oct, pat = '0121', len = 8) {
    return eachBar(chords, (sym, frac) => {
      const tones = chord(sym, oct); const ext = [...tones, tones[0] + 12, tones[1] + 12, tones[2] + 12];
      const count = Math.round(len * frac);
      let s = '';
      for (let i = 0; i < count; i++) s += n(ext[+pat[i % pat.length]], len) + ' ';
      return s;
    });
  }
  function bass(chords, oct, style = 'root4') {
    return eachBar(chords, (sym, frac) => {
      const t = chord(sym, oct); const r = t[0], f = t[0] + 7, th = t[1];
      const beats = 4 * frac;
      const out = [];
      if (style === 'root4') for (let i = 0; i < beats; i++) out.push(n(r, 4));
      else if (style === 'rf') for (let i = 0; i < beats; i++) out.push(n(i % 2 ? f : r, 4));
      else if (style === 'walk') { const w = [r, th, f, th]; for (let i = 0; i < beats; i++) out.push(n(w[i % 4], 4)); }
      else if (style === 'oct8') for (let i = 0; i < beats * 2; i++) out.push(n(i % 2 ? r + 12 : r, 8));
      else if (style === 'drive') for (let i = 0; i < beats * 2; i++) out.push(n([r, r, r + 12, r][i % 4], 8));
      else if (style === 'half') for (let i = 0; i < beats / 2; i++) out.push(n(i % 2 ? f : r, 2));
      else if (style === 'whole') out.push(beats === 4 ? n(r, 1) : n(r, 2));
      else if (style === 'shanty') { for (let i = 0; i < beats / 2; i++) { out.push(n(r, 3)); out.push(n(f, 6)); } }
      return out.join(' ');
    });
  }
  const D = {
    rock: 'k8 h8 s8 h8 k8 k8 s8 h8',
    soft: 'k8 h8 h8 h8 s8 h8 h8 h8',
    battle: 'k16 h16 h16 k16 s16 h16 k16 h16 k16 h16 h16 k16 s16 h16 s16 h16',
    march: 'k8 h8 s8 h8 k8 h8 s8 s16 s16',
    shanty: 'k6 h12 s6 h12 k6 h12 s6 h12',
    hats: 'h8 h8 h8 h8 h8 h8 h8 h8',
    boss: 'k16 k16 h16 k16 s16 h16 k16 h16 k16 k16 h16 k16 s16 s16 s16 h16',
    none: 'r1',
  };
  const drums = (pat, bars, v = 10) => '%v' + v + ' ' + Array(bars).fill(D[pat] || pat).join(' | ');
  const T = {};

  // ── Title: "Aurora" ──
  {
    const A = 'D Bm G A D Bm G.A D', B = 'G A F#m Bm G A Em A7';
    T.title = { bpm: 108, ch: [
      '@1 v11 y1 l8 r1 r1 L ' +
      'o5 d4. < a8 > d4 f+4 | o5 e4. d8 < b2 | o4 b4. > d8 g4 f+8 e8 | o5 e4. c+8 < a2 | o5 d4. < a8 > d4 a4 | o5 b4. a8 f+4 d4 | o5 g8 a8 b8 g8 f+4 e4 | o5 d2. r4 | ' +
      'o5 b4. a8 g4 d4 | o5 c+4. d8 e4 a4 | o5 a4. f+8 e4 c+4 | o5 d2 r8 < b8 > d8 f+8 | o5 g4. f+8 e4 d4 | o5 e4. f+8 e4 c+4 | o5 e8 f+8 g8 a8 b4 > d4 | o5 c+2 < a4 > e4',
      '@0 v6 ' + arp('D A', 4, '0121') + ' L ' + arp(A, 4, '0123') + ' | ' + arp(B, 4, '0123'),
      '@3 v13 ' + bass('D A', 2, 'half') + ' L ' + bass(A, 2, 'rf') + ' | ' + bass(B, 2, 'rf'),
      '%v7 c1 r1 L ' + Array(16).fill('k4 h8 h8 s4 h8 h8').join(' | '),
    ] };
    T.ending = { bpm: 92, gain: 0.9, ch: [T.title.ch[0].replace('@1 v11', '@2 v9'), T.title.ch[1].replace('v6', 'v5'), T.title.ch[2], '%v5 c1 r1 L ' + Array(16).fill('h4 h4 s4 h4').join(' | ')] };
  }
  // ── Dawnmere Town ──
  {
    const A = 'G Em C D G Em Am.D G', B = 'C D Bm Em C D G.C D';
    T.dawnmere = { bpm: 96, ch: [
      '@1 v10 y1 l8 L o5 d4 < b8 > d8 g4 f+8 e8 | o5 e4. d8 < b4 g4 | o5 c4 e8 g8 > c4 < b8 a8 | o5 a4. f+8 d2 | o5 d4 < b8 > d8 g4 a8 b8 | o5 b4. a8 g4 e4 | o5 e8 d8 c8 < a8 > d4 c4 | o4 b2. r4 | ' +
      'o5 e4. d8 c4 e4 | o5 f+4. e8 d4 a4 | o5 f+4. e8 d4 < b4 | o4 b2 r4 > d8 e8 | o5 g4. f+8 e4 c4 | o5 d4. e8 f+4 a4 | o5 g8 f+8 g8 a8 b4 > c4 | o5 a2 < a4 > d4',
      '@0 v6 L ' + arp(A, 4, '0121') + ' | ' + arp(B, 4, '0121'),
      '@3 v12 L ' + bass(A, 2, 'rf') + ' | ' + bass(B, 2, 'rf'),
      '%v6 L ' + Array(16).fill(D.soft).join(' | '),
    ] };
  }
  // ── Route ──
  {
    const A = 'A E F#m D A E D.E A', B = 'D E C#m F#m D E Bm7 E7';
    T.route = { bpm: 132, ch: [
      '@1 v11 l8 L o5 e4 c+8 e8 a4 g+8 f+8 | o5 e4. d8 < b4 g+4 | o5 c+4 f+8 a8 > c+4 < b8 a8 | o5 a4. f+8 d4 f+4 | o5 e4 c+8 e8 a4 b8 > c+8 | o6 d4. < b8 g+4 e4 | o5 f+8 e8 d8 f+8 e4 g+4 | o5 a2. r4 | ' +
      'o5 a4 f+8 a8 > d4 < a4 | o5 g+4 e8 g+8 b4 g+4 | o5 e4. c+8 < g+4 > c+4 | o5 f+2 e4 c+4 | o5 d8 e8 f+8 a8 > d4 < a4 | o5 b4. a8 g+4 e4 | o5 d8 c+8 < b8 > d8 f+4 a4 | o5 g+2 b4 > d4',
      '@0 v6 L ' + arp(A, 4, '0120') + ' | ' + arp(B, 4, '0120'),
      '@3 v13 L ' + bass(A, 2, 'walk') + ' | ' + bass(B, 2, 'walk'),
      '%v8 L ' + Array(16).fill(D.rock).join(' | '),
    ] };
  }
  // ── Wild battle ──
  {
    const A = 'Em C D B Em C Am.B Em', B = 'C D Bm Em C D B B7';
    T.battle_wild = { bpm: 172, ch: [
      '@1 v12 l8 o6 e16 d+16 d16 c+16 c16 < b16 a+16 a16 g+16 g16 f+16 f16 e16 d+16 d16 c+16 | o4 e8 e8 r8 e8 r8 e8 e4 L ' +
      'o5 e8 g8 b8 > e8 < b4 a8 g8 | o5 g4. e8 c4 e4 | o5 f+8 a8 > d8 < a8 f+4 d4 | o5 d+4. f+8 b2 | o5 e8 g8 b8 > e8 g4 f+8 e8 | o6 e4. d8 c4 < g4 | o5 a8 b8 > c8 < a8 b4 d+4 | o5 e2 r8 e8 f+8 g8 | ' +
      'o5 g4 e8 g8 > c4 < b8 a8 | o5 a4 f+8 a8 > d4 c8 < b8 | o5 b4. a8 f+4 d4 | o5 e2 g4 b4 | o6 c4. < b8 a4 g4 | o5 f+4. g8 a4 > d4 | o5 d+4 f+4 b4 a4 | o5 f+8 g8 f+8 d+8 < b4 > d+4',
      '@2 v5 ' + arp('Em Em', 4, '0212', 16) + ' L ' + arp(A, 4, '0120', 16) + ' | ' + arp(B, 4, '0120', 16),
      '@3 v14 o3 e8 e8 r8 e8 r8 e8 e4 | ' + bass('Em', 2, 'oct8') + ' L ' + bass(A, 2, 'oct8') + ' | ' + bass(B, 2, 'oct8'),
      '%v10 s16 s16 s16 s16 s16 s16 s16 s16 s8 s8 s8 s8 | k8 k8 r8 k8 r8 k8 c4 L ' + Array(16).fill(D.battle).join(' | '),
    ] };
  }
  // ── Trainer battle ──
  {
    const A = 'Am F G E Am F Dm.E Am', B = 'Dm Am Bb E Dm Am F E7';
    T.battle_trainer = { bpm: 164, ch: [
      '@1 v12 l8 o5 a16 g+16 a16 b16 > c16 < b16 a16 g+16 a16 e16 f16 e16 d16 c16 < b16 g+16 | o4 a8 r8 a8 r8 a8 a8 > c8 e8 L ' +
      'o5 a4 > c8 < a8 e4 a4 | o5 f4. a8 > c4 < a4 | o5 g4 b8 > d8 < b4 g4 | o5 g+4. b8 e2 | o5 e8 a8 > c8 e8 d4 c8 < b8 | o5 a4. g8 f4 c4 | o5 d8 f8 a8 f8 g+4 b4 | o5 a2 r4 e8 g+8 | ' +
      'o5 f4. e8 d4 a4 | o5 c4. < b8 a4 e4 | o5 d4 f8 d8 < a+4 > d4 | o5 e2 g+4 b4 | o5 a4. g8 f4 d4 | o5 e4. d8 c4 < a4 | o5 c8 d8 e8 f8 a4 > c4 | o5 b4 g+4 e4 d4',
      '@2 v5 ' + arp('Am Am', 4, '0120', 16) + ' L ' + arp(A, 4, '0120', 16) + ' | ' + arp(B, 4, '0120', 16),
      '@3 v14 ' + bass('Am Am', 2, 'oct8') + ' L ' + bass(A, 2, 'oct8') + ' | ' + bass(B, 2, 'oct8'),
      '%v10 s16 s16 s16 s16 k8 s8 k8 s8 s16 s16 s8 | k8 r8 k8 r8 k8 k8 c4 L ' + Array(16).fill(D.battle).join(' | '),
    ] };
  }
  // ── Gym leader battle ──
  {
    const A = 'Cm Ab Bb G Cm Ab Fm.G Cm', B = 'Ab Bb Eb Cm Ab Bb G G7';
    T.battle_gym = { bpm: 176, ch: [
      '@1 v12 l8 o5 c8 c8 c8 c8 < b8 b8 b8 b8 | o5 c4 e-4 g4 b4 L ' +
      'o5 c8 e-8 g8 > c8 < g4 e-8 d8 | o5 c4. e-8 g+4 g4 | o5 f4 d8 f8 a+4 g+8 g8 | o5 b4. d8 g2 | o5 g8 > c8 e-8 g8 f4 e-8 d8 | o6 c4. < g+8 e-4 c4 | o5 f8 g+8 > c8 < g+8 g4 b4 | o6 c2 r8 < g8 g+8 b8 | ' +
      'o6 c4. < a+8 g+4 d+4 | o5 d4. d+8 f4 a+4 | o5 g4. f8 d+4 a+4 | o5 c2 d+4 g4 | o5 g+8 a+8 > c8 d+8 d4 c4 | o5 a+4. g+8 f4 d4 | o5 g4 b4 > d4 < b4 | o5 f4 d4 < b4 > d4',
      '@2 v5 ' + arp('Cm G', 4, '0120', 16) + ' L ' + arp(A, 4, '0120', 16) + ' | ' + arp(B, 4, '0120', 16),
      '@3 v14 ' + bass('Cm G', 2, 'drive') + ' L ' + bass(A, 2, 'drive') + ' | ' + bass(B, 2, 'drive'),
      '%v11 k8 k8 k8 k8 s8 s8 s8 s8 | s16 s16 s16 s16 s16 s16 s16 s16 k4 c4 L ' + Array(16).fill(D.battle).join(' | '),
    ] };
  }
  // ── Rival battle (Sable) ──
  {
    const A = 'Bm G D A Bm G Em.F# Bm', B = 'G A F#m Bm G A Em F#7';
    T.battle_rival = { bpm: 160, ch: [
      '@1 v12 l8 o5 f+4 e8 d8 c+8 d8 < b4 | o4 b8 r8 b8 r8 > d8 f+8 b4 L ' +
      'o5 f+4 e8 d8 c+4 < b4 | o5 d4. < b8 g4 b4 | o5 a4 f+8 a8 > d4 c+8 < a8 | o5 e2 c+4 e4 | o5 f+4 e8 d8 c+4 d4 | o5 g4. f+8 e4 d4 | o5 e8 g8 b8 g8 a+4 c+4 | o5 b2 r4 f+8 a8 | ' +
      'o5 b4. a8 g4 d4 | o5 c+4. d8 e4 a4 | o5 a4. f+8 e4 c+4 | o5 d2 f+4 b4 | o5 b4 a8 g8 f+4 d4 | o5 e4. f+8 e4 c+4 | o5 e8 f+8 g8 a8 b4 g4 | o5 a+4 c+4 e4 f+4',
      '@2 v5 ' + arp('Bm Bm', 4, '0120', 16) + ' L ' + arp(A, 4, '0120', 16) + ' | ' + arp(B, 4, '0120', 16),
      '@3 v14 ' + bass('Bm Bm', 2, 'oct8') + ' L ' + bass(A, 2, 'oct8') + ' | ' + bass(B, 2, 'oct8'),
      '%v10 ' + D.battle + ' | k8 r8 k8 r8 s8 s8 c4 L ' + Array(16).fill(D.battle).join(' | '),
    ] };
  }
  // ── Director Vane ──
  {
    const A = 'Dm Bb Gm A Dm Bb Gm.A Dm', B = 'Bb C F Dm Gm Bb A A7';
    T.battle_boss = { bpm: 152, ch: [
      '@1 v12 y1 l8 o4 d4 d4 d4 d4 | o4 c+4 c+4 c+2 L ' +
      'o5 d4 a4 f8 e8 d8 c+8 | o5 d4. f8 a+4 a4 | o5 g4. a+8 > d4 < a+4 | o5 a2 c+4 e4 | o5 f8 e8 d8 f8 a4 > d4 | o6 d4. c8 < a+4 f4 | o5 g8 a8 a+8 g8 a4 c+4 | o5 d2. r4 | ' +
      'o5 f4. g8 a4 a+4 | o5 g4. e8 c4 e4 | o5 f4 a4 > c4 < a4 | o5 d2 f4 a4 | o5 a+4. a8 g4 d4 | o5 f4. g8 a+4 > d4 | o5 c+4 e4 a4 g4 | o5 e8 f8 e8 d8 c+4 < a4',
      '@2 v5 ' + arp('Dm A', 4, '0212', 16) + ' L ' + arp(A, 4, '0120', 16) + ' | ' + arp(B, 4, '0120', 16),
      '@3 v14 ' + bass('Dm A', 2, 'drive') + ' L ' + bass(A, 2, 'drive') + ' | ' + bass(B, 2, 'drive'),
      '%v11 k4 k4 k4 k4 | k4 k4 s16 s16 s16 s16 c4 L ' + Array(16).fill(D.boss).join(' | '),
    ] };
  }
  // ── Ho-Oh ──
  {
    const A = 'F C Dm Bb F C Bb.C F', B = 'Dm Bb F C Dm Bb Gm C7';
    T.battle_legend = { bpm: 144, ch: [
      '@1 v12 y1 l8 o5 c2 f2 | o5 a2 > c2 L ' +
      'o5 c4 f4 a4. g8 | o5 g2 e4 c4 | o5 d4 f4 a4 > d4 | o6 d4. c8 < a+4 f4 | o5 a4. a+8 > c4 < a4 | o5 g4. a8 g4 e4 | o5 f8 g8 a8 a+8 > c4 < e4 | o5 f2. r4 | ' +
      'o5 a4. g8 f4 d4 | o5 a+4. a8 a+4 > d4 | o6 c2 < a4 f4 | o5 g2 c4 e4 | o5 f4 a4 > d4 < a4 | o5 a+2 > d4 f4 | o6 g4. f8 d4 < a+4 | o5 a+4 g4 e4 c4',
      '@2 v5 ' + arp('F C', 4, '0123', 16) + ' L ' + arp(A, 4, '0123', 16) + ' | ' + arp(B, 4, '0123', 16),
      '@3 v14 ' + bass('F C', 2, 'half') + ' L ' + bass(A, 2, 'drive') + ' | ' + bass(B, 2, 'drive'),
      '%v10 c1 | c2 s16 s16 s16 s16 s16 s16 s16 s16 L ' + Array(16).fill(D.boss).join(' | '),
    ] };
  }
  // ── Victory (after trainer) ──
  {
    const A = 'C Am F G C Am F.G C';
    T.victory = { bpm: 128, ch: [
      '@1 v12 l8 o5 c8 c8 c8 c8 e8 g8 > c4 | o5 a4 b4 > c2 L o5 e4 g4 > c4 < g4 | o5 a4. g8 e4 c4 | o5 f4 a4 > c4 < a4 | o5 g2 b4 > d4 | o6 e4. d8 c4 < g4 | o5 a4. b8 > c4 < a4 | o5 f8 g8 a8 f8 g4 b4 | o6 c2. r4',
      '@0 v6 ' + arp('C F.G', 4, '0121') + ' L ' + arp(A, 4, '0121'),
      '@3 v13 ' + bass('C F.G', 2, 'rf') + ' L ' + bass(A, 2, 'rf'),
      '%v8 k8 k8 k8 k8 s8 s8 c4 | k4 s4 c2 L ' + Array(8).fill(D.rock).join(' | '),
    ] };
    T.victory_wild = { bpm: 128, ch: T.victory.ch.map(c => c.replace('@1 v12', '@1 v11')) };
  }
  // ── Pokémon Center ──
  {
    const A = 'F Dm Bb C F Dm Gm.C F';
    T.center = { bpm: 116, ch: [
      '@1 v10 l8 L o5 a4 f8 a8 > c4 < a4 | o5 f4. e8 d4 f4 | o5 d4 f8 d8 < a+4 > d4 | o5 e4. f8 g4 c4 | o5 a4 f8 a8 > c4 d4 | o6 c4. < a8 f4 d4 | o5 d8 e8 f8 g8 e4 c4 | o5 f2. r4',
      '@0 v6 L ' + arp(A, 4, '0121'),
      '@3 v12 L ' + bass(A, 2, 'rf'),
      '%v5 L ' + Array(8).fill(D.soft).join(' | '),
    ] };
  }
  // ── Gym ──
  {
    const A = 'C G Am F C G F.G C';
    T.gym = { bpm: 128, ch: [
      '@1 v11 l8 L o5 g4 > c4 < g8 e8 c4 | o5 d4 g4 b4 g4 | o5 a4. g8 e4 c4 | o5 f4 a4 > c2 | o6 e4. d8 c4 < g4 | o5 b4. a8 g4 d4 | o5 a8 b8 > c8 < a8 b4 > d4 | o6 c2. r4',
      '@0 v6 L ' + arp(A, 4, '0120'),
      '@3 v13 L ' + bass(A, 2, 'rf'),
      '%v8 L ' + Array(8).fill(D.march).join(' | '),
    ] };
  }
  // ── Team Ashen ──
  {
    const A = 'Cm Cm Ab G Cm Cm Db G7';
    T.ashen = { bpm: 132, ch: [
      '@1 v11 l8 L o5 c4 r8 c8 d+4 d4 | o5 c8 < b8 > c8 d8 d+4 g4 | o5 g+4. g8 f4 d+4 | o5 d2 < b4 g4 | o5 g4 r8 g8 g+4 g4 | o5 f8 d+8 d8 c8 d+4 g4 | o5 f4. c+8 g+4 f4 | o5 g4 f4 d4 < b4',
      '@0 v5 L ' + arp(A, 3, '0102'),
      '@3 v13 L ' + bass(A, 2, 'oct8'),
      '%v7 L ' + Array(8).fill('k8 h8 s8 h8 k8 k8 s8 h8').join(' | '),
    ] };
  }
  // ── Emberpeak Tunnel ──
  {
    const A = 'Am Am F E Am Dm E E';
    T.cave = { bpm: 88, ch: [
      '@1 v9 y1 l8 L o5 e2 r4 a4 | o5 c2. < b4 | o5 a2 g4 f4 | o5 e1 | o5 a4. g+8 a2 | o5 f2 e4 d4 | o5 g+2 b2 | o5 e2. r4',
      '@0 v5 L ' + arp(A, 3, '0212', 4),
      '@3 v12 L ' + bass(A, 2, 'whole'),
      '%v4 L ' + Array(8).fill('r2 h4 r4').join(' | '),
    ] };
  }
  // ── Glimmerwood ──
  {
    const A = 'Em C G D Em C Am.B7 Em';
    T.forest = { bpm: 104, ch: [
      '@1 v10 y1 l8 L o5 b4 g8 a8 b4 > d4 | o5 e4. d8 c4 < g4 | o5 g8 a8 b8 > d8 < b4 g4 | o5 a4. f+8 d2 | o5 e4 g8 b8 > e4 d4 | o6 c4. < b8 g4 e4 | o5 a8 g8 e8 g8 f+4 d+4 | o5 e2. r4',
      '@0 v5 L ' + arp(A, 4, '0123', 16),
      '@3 v12 L ' + bass(A, 2, 'rf'),
      '%v5 L ' + Array(8).fill(D.hats).join(' | '),
    ] };
  }
  // ── Brinecrest Harbor (lilting triplets) ──
  {
    const A = 'D G D A D G A D';
    T.harbor = { bpm: 112, ch: [
      '@1 v11 L o5 a6 f+12 a6 f+12 d2 | o5 b6 a12 g6 f+12 g2 | o5 f+6 e12 d6 f+12 a6 f+12 d4 | o5 e6 f+12 e6 d12 c+2 | o5 a6 f+12 a6 > d12 c+6 < a12 f+4 | o5 g6 a12 b6 > d12 < b2 | o5 a6 g12 f+6 e12 c+6 e12 a4 | o5 d2. r4',
      '@0 v6 L ' + arp(A, 4, '012', 12),
      '@3 v13 L ' + bass(A, 2, 'shanty'),
      '%v7 L ' + Array(8).fill(D.shanty).join(' | '),
    ] };
  }
  // ── Cinderfall City ──
  {
    const A = 'Dm C Bb C Dm C Bb.A Dm';
    T.cinderfall = { bpm: 116, ch: [
      '@1 v11 l8 L o5 d8 d8 f8 a8 g4 f8 e8 | o5 e4. g8 c4 e4 | o5 d4 f8 a+8 a4 f4 | o5 g2 e4 c4 | o5 a8 a8 > c8 d8 c4 < a8 g8 | o5 g4. e8 c4 g4 | o5 f8 g8 f8 d8 c+4 e4 | o5 d2. r4',
      '@0 v5 L ' + arp(A, 4, '0120'),
      '@3 v13 L ' + bass(A, 2, 'oct8'),
      '%v8 L ' + Array(8).fill('k8 h8 s8 t16 t16 k8 k8 s8 h8').join(' | '),
    ] };
  }
  // ── Frostveil Path ──
  {
    const A = 'E C#m A B E C#m F#m.B E';
    T.snow = { bpm: 88, ch: [
      '@1 v10 y1 l8 L o5 g+4 b4 > e4 < b4 | o5 c+4 e4 g+4 e4 | o5 a4. g+8 f+4 e4 | o5 f+2 d+4 b4 | o5 e4 g+8 b8 > e4 d+4 | o6 c+4. < b8 g+4 e4 | o5 f+8 a8 > c+8 < a8 b4 d+4 | o5 e2. r4',
      '@4 v8 L ' + arp(A, 5, '0121'),
      '@3 v11 L ' + bass(A, 2, 'half'),
      '%v4 L ' + Array(8).fill('r4 h4 r4 h4').join(' | '),
    ] };
  }
  // ── Prism Spire ──
  {
    const A = 'Fm Db Ab Eb Fm Db Bbm.C Fm';
    T.spire = { bpm: 96, ch: [
      '@1 v10 y1 l8 L o5 c4 f4 g+4 g8 f8 | o5 g+2 f4 c+4 | o5 d+4 g+8 a+8 > c4 < g+4 | o5 g2 a+4 g4 | o5 g+4 g8 f8 c4 f4 | o5 f4. d+8 c+4 f4 | o5 c+8 f8 a+8 f8 e4 g4 | o5 f2. r4',
      '@0 v5 L ' + arp(A, 4, '0123', 16),
      '@3 v11 L ' + bass(A, 2, 'whole'),
      '%v3 L ' + Array(8).fill('r1').join(' | '),
    ] };
  }
  // ── Sable's theme (encounter) ──
  {
    const A = 'Bm G Em F# Bm G A F#';
    T.rival = { bpm: 138, ch: [
      '@1 v11 l8 L o5 f+4 e8 d8 c+8 d8 < b4 | o5 d4. < b8 g4 b4 | o5 e4 g8 b8 > e4 d4 | o5 c+2 < a+4 f+4 | o5 f+4 e8 d8 c+8 d8 f+4 | o5 g4. f+8 e4 d4 | o5 c+4 e4 a4 g4 | o5 f+2 a+4 c+4',
      '@0 v6 L ' + arp(A, 4, '0120'),
      '@3 v13 L ' + bass(A, 2, 'oct8'),
      '%v8 L ' + Array(8).fill(D.rock).join(' | '),
    ] };
  }
  // ── emotional scenes ──
  {
    const A = 'Dm Bb F C Gm Dm Bb A';
    T.emotion = { bpm: 72, ch: [
      '@2 v9 y1 l8 L o5 a2 f4 d4 | o5 f2. d4 | o5 f2 a4 > c4 | o6 c2 < g4 e4 | o5 a+2 g4 d4 | o5 a2. f4 | o5 f4 g4 a+4 a4 | o5 e2 c+2',
      '@4 v7 L ' + arp(A, 4, '0121'),
      '@3 v10 L ' + bass(A, 2, 'whole'),
      '%v1 L ' + Array(8).fill('r1').join(' | '),
    ] };
  }
  // ── trainer eyes meet (short loop) ──
  T.eyes = { bpm: 140, ch: [
    '@1 v11 l8 L o5 e8 e8 g8 e8 a4 g4 | o5 e8 e8 g8 e8 b4 a4',
    '@0 v6 L ' + arp('Em Am', 4, '0120'),
    '@3 v13 L ' + bass('Em Am', 2, 'oct8'),
    '%v8 L ' + D.rock + ' | ' + D.rock,
  ] };
  T.eyes_ashen = { bpm: 140, ch: [
    '@1 v11 l8 L o5 c8 c8 d+8 c8 f+4 f4 | o5 c8 c8 d+8 c8 g4 f+4',
    '@0 v5 L ' + arp('Cm Cm', 3, '0102'),
    '@3 v13 L ' + bass('Cm Cm', 2, 'oct8'),
    '%v8 L ' + D.rock + ' | ' + D.rock,
  ] };
  // ── jingles (no loop) ──
  T.heal = { bpm: 140, loop: false, ch: ['@1 v11 l8 o5 c8 e8 g8 e8 > c4 < g4 | > c2 r2', '@0 v7 l8 o4 e8 g8 > c8 < g8 e4 g4 | e2 r2', '@3 v12 o3 c2 g2 | c2 r2'] };
  T.item = { bpm: 150, loop: false, ch: ['@1 v12 l8 o5 g8 g8 g8 > c4. d8 e8 | o6 d4 e2 r4', '@0 v7 l8 o5 e8 e8 e8 g4. a8 g8 | o5 a4 g2 r4', '@3 v12 o3 c4 c4 c4 r8 c8 | g4 c2 r4'] };
  T.badge = { bpm: 132, loop: false, ch: ['@1 v12 l8 o5 c4 e4 g4 > c4 | o5 b4. a8 g4 f4 | o5 e4 g4 > c2 | r1', '@0 v7 l8 o4 g4 > c4 e4 g4 | o5 g4. f8 e4 d4 | o5 c4 e4 g2 | r1', '@3 v13 o3 c2 e2 | g2 g2 | c2 < c2 | r1', '%v8 k4 s4 k4 s4 | k4 s4 k8 k8 s4 | k4 s4 c2 | r1'] };
  T.caught = { bpm: 144, loop: false, ch: ['@1 v12 l8 o5 g8 > c8 e8 g8 e8 c8 d4 | o5 b4 > c2. | r1', '@0 v7 l8 o5 e8 g8 > c8 e8 c8 < g8 b4 | o5 g4 e2. | r1', '@3 v12 o3 c4 c4 c4 g4 | c1 | r1'] };
  T.levelup = { bpm: 160, loop: false, ch: ['@1 v11 l16 o5 c16 e16 g16 > c8 r8 r4 r4'] };
  T.evolve = { bpm: 150, ch: ['@1 v10 l16 L ' + Array(2).fill('o5 c16 e16 g16 > c16 < g16 e16 c16 e16').join(' ') + ' | ' + Array(2).fill('o5 d16 f16 a16 > d16 < a16 f16 d16 f16').join(' '), '@3 v12 L o3 c1 | d1', '%v5 L ' + D.hats + ' | ' + D.hats] };
  T.evolved = T.badge;
  T.dex = T.item;
  return T;
})();
