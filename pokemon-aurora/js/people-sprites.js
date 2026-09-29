'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  People: overworld walking sprites (hand-authored templates, palette-swapped)
//  and battle trainer sprites (procedural painter).
// ─────────────────────────────────────────────────────────────────────────────
const HEADS = {
  short: {
    down: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHSSHHHSSSHH..
..HSSESSSSESSH..
..HSSESSSSESSH..
..hSSSSSSSSSSh..
...SSSSSSSSSS...
....ssssssss....`,
    up: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..hHHHHHHHHHHh..
..hhHHHHHHHHhh..
...hhhhhhhhhh...
....ssssssss....`,
    left: `
................
................
......HHHHHH....
....HHHHHHHHHH..
...HHHHHHHHHHHH.
...HHHHHHHHHHHH.
...HSSSHHHHHHHH.
...SSSSSSHHHHHh.
..SSESSSSSHHHHh.
..SSESSSSSSHHhh.
...SSSSSSSShh...
....sssssss.....`,
  },
  cap: {
    down: `
................
.....MMMMMM.....
...MMMMWWMMMM...
..MMMMMWWMMMMM..
..MMMMMMMMMMMM..
.mmmmmmmmmmmmmm.
..HSSSSSSSSSSH..
..HSSESSSSESSH..
..HSSESSSSESSH..
..hSSSSSSSSSSh..
...SSSSSSSSSS...
....ssssssss....`,
    up: `
................
.....MMMMMM.....
...MMMMMMMMMM...
..MMMMMMMMMMMM..
..MMMMMMMMMMMM..
..mmmmmmmmmmmm..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..hHHHHHHHHHHh..
...hhHHHHHHhh...
....ssssssss....`,
    left: `
................
......MMMMMM....
....MMMMMMMMMM..
...MMMWMMMMMMMM.
...MMMMMMMMMMMM.
.mmmmmmmMMMMMMM.
...SSSSSSHHHHHH.
...SESSSSHHHHHh.
..SSESSSSSHHHHh.
..SSSSSSSSHHHh..
...SSSSSSShhh...
....sssssss.....`,
  },
  girl: {
    down: `
................
.....MMMMMM.....
...MMMMMMMMMM...
..MMMMMMMMMMMM..
.AMMMMMMMMMMMMA.
.mmmmmmmmmmmmmm.
.HHSSHHHHHHSSHH.
HHHSSESSSSESSHHH
HHHSSESSSSESSHHH
HH.SSSSSSSSSS.HH
HH..SSSSSSSS..HH
hh...ssssss...hh
hh............hh
.h............h.`,
    up: `
................
.....MMMMMM.....
...MMMMMMMMMM...
..MMMMMMMMMMMM..
.AMMMMMMMMMMMMA.
.mmmmmmmmmmmmmm.
.HHHHHHHHHHHHHH.
HHHHHHHHHHHHHHHH
HHHHHHHHHHHHHHHH
HH.hHHHHHHHHh.HH
HH..hhhhhhhh..HH
hh...ssssss...hh
hh............hh
.h............h.`,
    left: `
................
......MMMMMM....
....MMMMMMMMMM..
...MMMMMMMMMMMMA
...MMMMMMMMMMMM.
..mmmmmmmmmmmmm.
...HSSSHHHHHHHH.
...SSSSSSHHHHHHH
..SSESSSSHHHHHHH
..SSESSSSSHHH.HH
...SSSSSSShh..HH
....sssssss...hh
..............hh
...............h`,
  },
  long: {
    down: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHSSSHHSSSHH..
.HHSSESSSSESSHH.
.HHSSESSSSESSHH.
.HHSSSSSSSSSSHH.
.HH.SSSSSSSS.HH.
.hh..ssssss..hh.
.hh..........hh.
.h............h.`,
    up: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
.HHHHHHHHHHHHHH.
.HHHHHHHHHHHHHH.
.HHHHHHHHHHHHHH.
.hHHHHHHHHHHHHh.
.hhHHHHHHHHHHhh.
..hhhhhhhhhhhh..
...hhhhhhhhhh...`,
    left: `
................
................
......HHHHHH....
....HHHHHHHHHH..
...HHHHHHHHHHHH.
...HHHHHHHHHHHH.
...HSSSHHHHHHHH.
...SSSSSHHHHHHH.
..SSESSSSHHHHHH.
..SSESSSSHHHHHH.
...SSSSSSHHHHHh.
....sssssHHHHhh.
.........hhhhh..
..........hhh...`,
  },
  bun: {
    down: `
......hHHh......
......HHHH......
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHSSSSSSSSHH..
..HSSSSSSSSSSH..
..HSSESSSSESSH..
..HSSESSSSESSH..
...SSSSSSSSSS...
....SSSSSSSS....
.....ssssss.....`,
    up: `
......hHHh......
......HHHH......
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..hHHHHHHHHHHh..
...hhHHHHHHhh...
....hhhhhhhh....
.....ssssss.....`,
    left: `
..........hHh...
.........HHHH...
......HHHHHHH...
....HHHHHHHHHH..
...HHHHHHHHHHHH.
...HSSSSHHHHHHH.
...SSSSSSHHHHHH.
..SSESSSSSHHHHh.
..SSESSSSSHHHhh.
...SSSSSSSShh...
....SSSSSSS.....
.....ssss.......`,
  },
  bald: {
    down: `
................
................
.....SSSSSS.....
...SSSSSSSSSS...
..SSSSSSSSSSSS..
..HSSSSSSSSSSH..
..HSSSSSSSSSSH..
..HSSESSSSESSH..
..HSSESSSSESSH..
..HSSSHHHHSSSH..
...SSSSSSSSSS...
....ssssssss....`,
    up: `
................
................
.....SSSSSS.....
...SSSSSSSSSS...
..SSSSSSSSSSSS..
..SSSSSSSSSSSS..
..HSSSSSSSSSSH..
..HHSSSSSSSSHH..
..HHHHHHHHHHHH..
..hHHHHHHHHHHh..
...hhhhhhhhhh...
....ssssssss....`,
    left: `
................
................
......SSSSSS....
....SSSSSSSSSS..
...SSSSSSSSSSSS.
...SSSSSSSSSSSS.
...SSSSSSSHHHHH.
...SSSSSSSHHHHh.
..SSESSSSSSHHHh.
..SHHHSSSSSHHh..
...SSSSSSSShh...
....sssssss.....`,
  },
  hood: {
    down: `
................
.....MMMMMM.....
...MMMMMMMMMM...
..MMMMMMMMMMMM..
..MMMMMMMMMMMM..
.MMMmmmmmmmmMMM.
.MMmSSSSSSSSmMM.
.MMmSESSSSESmMM.
.MMmSESSSSESmMM.
.MMmSSSSSSSSmMM.
..MMmSSSSSSmMM..
...MMmmmmmmMM...`,
    up: `
................
.....MMMMMM.....
...MMMMMMMMMM...
..MMMMMMMMMMMM..
..MMMMMMMMMMMM..
.MMMMMMMMMMMMMM.
.MMMMMMMMMMMMMM.
.MMMMMMMMMMMMMM.
.MMMMMMMMMMMMMM.
.mMMMMMMMMMMMMm.
..mmMMMMMMMMmm..
...mmmmmmmmmm...`,
    left: `
................
......MMMMMM....
....MMMMMMMMMM..
...MMMMMMMMMMMM.
...MMMMMMMMMMMM.
..MmmmmmMMMMMMM.
..mSSSSmMMMMMMM.
..SSESSmMMMMMMM.
..SSESSmMMMMMMm.
..SSSSSmMMMMMMm.
...SSSmMMMMMmm..
....mmmmmmmm....`,
  },
  widehat: {
    down: `
................
......MMMM......
.....MMMMMM.....
....MAAAAAAM....
mmmmmmmmmmmmmmmm
.mmmmmmmmmmmmmm.
..HSSSSSSSSSSH..
..HSSESSSSESSH..
..HSSESSSSESSH..
..hSSSSSSSSSSh..
...SSSSSSSSSS...
....ssssssss....`,
    up: `
................
......MMMM......
.....MMMMMM.....
....MAAAAAAM....
mmmmmmmmmmmmmmmm
.mmmmmmmmmmmmmm.
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
..hHHHHHHHHHHh..
...hhhhhhhhhh...
....ssssssss....`,
    left: `
................
.......MMMM.....
......MMMMMM....
.....AAAAAAAM...
.mmmmmmmmmmmmmmm
..mmmmmmmmmmmmm.
...SSSSSSHHHHHH.
...SESSSSHHHHHh.
..SSESSSSSHHHHh.
..SSSSSSSSHHHh..
...SSSSSSShhh...
....sssssss.....`,
  },
  bob: {
    down: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
.HHHHHHHHHSSSHH.
.HHHSSESSSESSHH.
.HHSSSESSSESSHH.
.HHSSSSSSSSSSHH.
.hHH.SSSSSSS.Hh.
..hh.ssssss..hh.`,
    up: `
................
................
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHHHHHHHHHH..
.HHHHHHHHHHHHHH.
.HHHHHHHHHHHHHH.
.HHHHHHHHHHHHHH.
.hHHHHHHHHHHHHh.
.hhhHHHHHHHHhhh.
..hhhhhhhhhhhh..`,
    left: `
................
................
......HHHHHH....
....HHHHHHHHHH..
...HHHHHHHHHHHH.
..HHHHHHHHHHHHH.
..HHHHSHHHHHHHH.
...SSSSSHHHHHHH.
..SSESSSSHHHHHh.
..SSESSSSHHHHhh.
...SSSSSShhhhh..
....ssss..hhh...`,
  },
};
HEADS.spiky = {
  down: HEADS.short.down.replace(/^\n?................\n................\n/, '\n..H...H..H...H..\n..HH.HHHHHH.HH..\n'),
  up: HEADS.short.up.replace(/^\n?................\n................\n/, '\n..H...H..H...H..\n..HH.HHHHHH.HH..\n'),
  left: HEADS.short.left.replace(/^\n?................\n................\n/, '\n.....H...H..H...\n.....HH.HHHHHH..\n'),
};

// bodies: 9 rows (y 12..20). frames: stand, stepA (B is mirrored for up/down)
const BODIES = {
  down: [`
.....cCCCCc.....
...CCCCCCCCCC...
..SCCCCCCCCCCS..
..SCCCCCCCCCCS..
...cPPPPPPPPc...
....PPPPPPPP....
....PPP..PPP....
....PPP..PPP....
....BBB..BBB....`, `
.....cCCCCc.....
...CCCCCCCCCC...
..CCCCCCCCCCCS..
..SCCCCCCCCCCS..
..ScPPPPPPPPc...
....PPPPPPPP....
....PPP..PPP....
....PPP..BBB....
....BBB.........`],
  up: [`
.....cCCCCc.....
...CCCCCCCCCC...
..SCCAAAAAACCS..
..SCCAAAAAACCS..
...cPaaaaaaPc...
....PPPPPPPP....
....PPP..PPP....
....PPP..PPP....
....BBB..BBB....`, `
.....cCCCCc.....
...CCCCCCCCCC...
..SCCAAAAAACCC..
..SCCAAAAAACCS..
...cPaaaaaaPcS..
....PPPPPPPP....
....PPP..PPP....
....BBB..PPP....
.........BBB....`],
  left: [`
.....cCCCCc.....
....CCCCCCCC....
....CCCCSCCC....
....CCCCSCCC....
.....cPPPPc.....
.....PPPPPP.....
......PPPP......
......PPPP......
.....BBBBB......`, `
.....cCCCCc.....
....CCCCCCCC....
...SCCCCCCCC....
....CCCCCCCS....
.....cPPPPc.....
.....PPPPPP.....
....PPP..PP.....
...PPP....PP....
..BBB.....BB....`, `
.....cCCCCc.....
....CCCCCCCC....
....CCCCCCCCS...
...SCCCCCCCC....
.....cPPPPc.....
.....PPPPPP.....
.....PP..PPP....
....PP....PPP...
...BB.....BBB...`],
};
const parseT = s => s.replace(/^\n/, '').split('\n');

const People = (() => {
  const cache = new Map();
  const DEF = { skin: '#f8d0a8', hair: '#5a3a28', top: '#e84848', bottom: '#384878', shoes: '#383040', hat: '#e84848', band: '#f8f8f8', pack: '#f0c040', eye: '#282030' };
  function palette(o) {
    const P = Object.assign({}, DEF, o);
    return {
      H: P.hair, h: Col.shade(P.hair), S: P.skin, s: Col.shade(P.skin, 0.7), E: P.eye, W: P.band,
      C: P.top, c: Col.shade(P.top), P: P.bottom, p: Col.shade(P.bottom), B: P.shoes,
      M: P.hat, m: Col.shade(P.hat, 0.8), A: P.pack || P.top, a: Col.shade(P.pack || P.top),
    };
  }
  function bodyRows(dir, frame, o) {
    const set = BODIES[dir];
    let rows = parseT(set[Math.min(frame, set.length - 1)]);
    if (dir !== 'left' && frame === 2) rows = parseT(set[1]).map(r => r.split('').reverse().join(''));
    if (!o.pack && dir === 'up') rows = rows.map(r => r.replace(/A/g, 'C').replace(/a/g, 'c'));
    if (o.body === 'dress') {
      rows = rows.map((r, i) => {
        if (i === 4) return dir === 'left' ? '....PPPPPPP.....' : '...PPPPPPPPPP...';
        if (i === 5) return dir === 'left' ? '...PPPPPPPPP....' : '..PPPPPPPPPPPP..';
        if (i >= 6 && i <= 7) return r.replace(/P/g, 'S');
        return r;
      });
    }
    if (o.body === 'coat') {
      rows = rows.map((r, i) => {
        if (i === 4) return dir === 'left' ? '....cCCCCCC.....' : '...cCCCCCCCCc...';
        if (i === 5) return dir === 'left' ? '....CCCCCCCc....' : '...CCCCCCCCCC...';
        if (i === 6) return r.replace(/P/g, 'c');
        return r;
      });
    }
    return rows;
  }
  function frame(o, dir, fr) {
    const key = JSON.stringify(o) + dir + fr;
    if (cache.has(key)) return cache.get(key);
    const mirror = dir === 'right';
    const d = mirror ? 'left' : dir;
    const pal = palette(o);
    const R = new Raster(18, 24);
    const chars = new Uint8Array(18 * 24);
    const put = (rows, oy) => rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.' && pal[ch]) { R.set(x + 1, y + oy + 1, Col.pack(pal[ch])); chars[(y + oy + 1) * 18 + x + 1] = ch.charCodeAt(0); } } });
    const bob = fr > 0 && d !== 'left' ? 0 : 0;
    put(bodyRows(d, fr, o), 12);
    const head = (HEADS[o.style] || HEADS.short)[d];
    put(parseT(head), bob);
    // rim light: the top edge of each hair / hat / clothing region catches the light,
    // with a brighter corner where the top-left is open (gives the 3-tone HGSS look)
    const LIT = 'HMCPAB', mat = c => String.fromCharCode(c).toUpperCase();
    for (let y = 1; y < 24; y++) for (let x = 1; x < 17; x++) {
      const i = y * 18 + x, c = chars[i];
      if (!c || LIT.indexOf(String.fromCharCode(c)) < 0) continue;
      const m = mat(c), up = chars[i - 18], left = chars[i - 1];
      const openUp = !up || mat(up) !== m, openLeft = !left || mat(left) !== m;
      const base = pal[String.fromCharCode(c)];
      if (openUp && openLeft) R.px[i] = Col.pack(Col.light(base, 1.1));
      else if (openUp) R.px[i] = Col.pack(Col.light(base, 0.55));
    }
    // auto outline
    const src = R.px.slice();
    const w = R.w, h = R.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (src[i]) continue;
      let n = 0;
      if (x > 0 && src[i - 1]) n = src[i - 1]; else if (x < w - 1 && src[i + 1]) n = src[i + 1];
      else if (y > 0 && src[i - w]) n = src[i - w]; else if (y < h - 1 && src[i + w]) n = src[i + w];
      if (n) R.px[i] = packedDark(n, 0.72);
    }
    if (mirror) R.flipH();
    const c = R.toCanvas();
    cache.set(key, c);
    return c;
  }
  return { frame, DEF };
})();

// overworld character looks
const LOOKS = {
  boy: { style: 'cap', hair: '#3a2a22', top: '#e04038', bottom: '#384a78', hat: '#e84040', band: '#f8f8f8', pack: '#f0b838', shoes: '#c03030' },
  girl: { style: 'girl', hair: '#7a4428', top: '#f06890', bottom: '#f0f0f8', hat: '#f8f8f8', band: '#f8f8f8', pack: '#f8d048', body: 'dress', shoes: '#e04868' },
  mom: { style: 'long', hair: '#8a4a2a', top: '#f0a060', bottom: '#b85a48', body: 'dress', shoes: '#704030' },
  prof: { style: 'short', hair: '#c8c8d0', top: '#f4f4f0', bottom: '#6a6a74', body: 'coat', shoes: '#504848' },
  sable: { style: 'bob', hair: '#2a2838', top: '#6a6a78', bottom: '#2c2c3a', shoes: '#e8e8e8', skin: '#f4d0b0' },
  sableAsh: { style: 'bob', hair: '#2a2838', top: '#8a8a90', bottom: '#4a4a52', body: 'coat', shoes: '#303038', skin: '#f4d0b0' },
  grunt: { style: 'hood', hat: '#7a7a82', top: '#8a8a92', bottom: '#4a4a52', body: 'coat', shoes: '#303038' },
  gruntf: { style: 'hood', hat: '#8a8490', top: '#9a94a0', bottom: '#4a4a52', body: 'coat', shoes: '#303038' },
  slate: { style: 'short', hair: '#5a6070', top: '#50545e', bottom: '#30323a', body: 'coat', shoes: '#202028' },
  gris: { style: 'long', hair: '#c8ccd8', top: '#70707e', bottom: '#40404a', body: 'coat', shoes: '#202028' },
  vane: { style: 'short', hair: '#e0e0e8', top: '#2c2c38', bottom: '#1e1e28', body: 'coat', shoes: '#101018' },
  bramble: { style: 'widehat', hair: '#d8d8d8', hat: '#e8c878', band: '#58a048', top: '#6aa860', bottom: '#8a6a48', body: 'dress', shoes: '#6a4a2a' },
  maris: { style: 'widehat', hair: '#2a4a8a', hat: '#2a3a68', band: '#f0c040', top: '#f4f4f4', bottom: '#2a4a8a', shoes: '#302820' },
  blaise: { style: 'spiky', hair: '#e05028', top: '#3a3a3a', bottom: '#6a4a38', body: 'coat', shoes: '#302018' },
  youngster: { style: 'cap', hair: '#6a4028', hat: '#3888e0', top: '#f8f8f8', bottom: '#384878', band: '#f8f8f8' },
  lass: { style: 'long', hair: '#c86030', top: '#e8d048', bottom: '#4868c8', body: 'dress' },
  bugcatcher: { style: 'widehat', hair: '#4a3020', hat: '#e8e0b0', band: '#4aa048', top: '#78c050', bottom: '#b89060' },
  hiker: { style: 'bald', hair: '#5a3a20', top: '#c88a48', bottom: '#6a5a40', skin: '#e8b890' },
  oldman: { style: 'bald', hair: '#e0e0e0', top: '#8a7a9a', bottom: '#5a5060' },
  oldwoman: { style: 'bun', hair: '#d8d8e0', top: '#a878a8', bottom: '#6a5070', body: 'dress' },
  fisher: { style: 'cap', hair: '#5a4030', hat: '#e8d048', band: '#e8d048', top: '#58a0d8', bottom: '#4a4a58' },
  sailor: { style: 'short', hair: '#3a3028', top: '#f8f8f8', bottom: '#3a58a8' },
  kid: { style: 'short', hair: '#e0a040', top: '#58c070', bottom: '#586878' },
  girlkid: { style: 'bob', hair: '#f0c060', top: '#f07878', bottom: '#f07878', body: 'dress' },
  man: { style: 'short', hair: '#4a3020', top: '#5890c8', bottom: '#3a3a48' },
  woman: { style: 'long', hair: '#e8b848', top: '#88c8a8', bottom: '#4a6a8a', body: 'dress' },
  nurse: { style: 'long', hair: '#f090a8', top: '#f8f8f8', bottom: '#f8c8d8', body: 'dress' },
  clerk: { style: 'short', hair: '#4a3a30', top: '#4878d0', bottom: '#384060' },
  keeper: { style: 'bald', hair: '#c8c8c8', top: '#3a5a8a', bottom: '#3a3a48' },
  scientist: { style: 'short', hair: '#6a6a70', top: '#f0f0f0', bottom: '#5a5a70', body: 'coat' },
  hexmaniac: { style: 'long', hair: '#5a3a8a', top: '#3a2a5a', bottom: '#2a1a3a', body: 'dress' },
  acetrainer: { style: 'spiky', hair: '#2a8a6a', top: '#e8e8f0', bottom: '#2a3a6a' },
  acetrainerf: { style: 'long', hair: '#e84860', top: '#e8e8f0', bottom: '#2a3a6a', body: 'dress' },
  skier: { style: 'hood', hat: '#e04848', top: '#e04848', bottom: '#3a3a58' },
  swimmer: { style: 'short', hair: '#3a2a20', top: '#f8c8a0', bottom: '#3a78d8', skin: '#f8c8a0' },
  firebreather: { style: 'bald', hair: '#e06020', top: '#e8a040', bottom: '#6a2a1a' },
  picnicker: { style: 'girl', hair: '#6a3a20', hat: '#f0e070', band: '#e05858', top: '#f8a848', bottom: '#4878b8', body: 'dress' },
  camper: { style: 'cap', hair: '#5a3a20', hat: '#58a048', top: '#e0c070', bottom: '#6a5a40' },
  gardener: { style: 'widehat', hair: '#4a3020', hat: '#d8c070', band: '#c05050', top: '#80a870', bottom: '#6a5a40' },
  beauty: { style: 'long', hair: '#f0d070', top: '#e878b0', bottom: '#e878b0', body: 'dress' },
  birdkeeper: { style: 'spiky', hair: '#3a2a20', top: '#e8a040', bottom: '#4a6a38' },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Battle trainer sprites (front) + player back sprites
// ─────────────────────────────────────────────────────────────────────────────
const TRAINER_ART = {
  boy: { skin: '#f8d0a8', hair: '#3a2a22', hs: 'cap', hat: '#e84040', top: '#e04038', top2: '#f8f8f8', bottom: '#384a78', shoes: '#c03030', bag: '#f0b838' },
  girl: { skin: '#f8d0a8', hair: '#7a4428', hs: 'pigtails', hat: '#f8f8f8', hatRibbon: '#e04868', top: '#f06890', bottom: '#f4f4fa', dress: 1, shoes: '#e04868', bag: '#f8d048' },
  prof: { skin: '#f0c8a0', hair: '#d0d0d8', hs: 'swept', top: '#f4f4f0', inner: '#6a88b8', bottom: '#5a5a64', coat: 1, shoes: '#4a4040', glasses: 1, beard: '#d0d0d8' },
  sable: { skin: '#f4d0b0', hair: '#2a2838', hs: 'bob', top: '#6a6a78', inner: '#e8e8e8', bottom: '#2c2c3a', shoes: '#e8e8e8', scarf: '#3a3a48' },
  sableAsh: { skin: '#f4d0b0', hair: '#2a2838', hs: 'bob', top: '#8a8a90', inner: '#50505a', bottom: '#40404a', coat: 1, shoes: '#303038', emblem: 1 },
  grunt: { skin: '#e8c0a0', hs: 'hood', hat: '#7a7a82', top: '#8a8a92', inner: '#4a4a52', bottom: '#4a4a52', coat: 1, shoes: '#303038', emblem: 1, mask: 1 },
  gruntf: { skin: '#f0c8a8', hs: 'hood', hat: '#8a8490', top: '#9a94a0', inner: '#4a4a52', bottom: '#4a4a52', coat: 1, shoes: '#303038', emblem: 1, mask: 1, lips: 1 },
  slate: { skin: '#e0b898', hair: '#5a6070', hs: 'slick', top: '#50545e', inner: '#c8c8d0', bottom: '#30323a', coat: 1, shoes: '#202028', emblem: 1, tie: '#8a8a92' },
  gris: { skin: '#f0d0c0', hair: '#c8ccd8', hs: 'long', top: '#70707e', inner: '#40404a', bottom: '#40404a', coat: 1, shoes: '#202028', emblem: 1, visor: '#60e0f0' },
  vane: { skin: '#e8c4a8', hair: '#e0e0e8', hs: 'swept', top: '#2c2c38', inner: '#6a6a78', bottom: '#1e1e28', coat: 1, shoes: '#101018', emblem: 1, cape: '#1a1a24' },
  bramble: { skin: '#f0c8a8', hair: '#e0e0e0', hs: 'bun', hat: '#e8c878', hatRibbon: '#58a048', hatWide: 1, top: '#6aa860', bottom: '#8a6a48', dress: 1, shoes: '#6a4a2a', apron: '#f0e0b8' },
  maris: { skin: '#e0a878', hair: '#2a4a8a', hs: 'long', hat: '#2a3a68', hatRibbon: '#f0c040', captain: 1, top: '#f4f4f4', inner: '#2a4a8a', bottom: '#2a4a8a', coat: 1, shoes: '#302820', patch: 1 },
  blaise: { skin: '#e0a880', hair: '#e05028', hs: 'spiky', top: '#3a3a3a', inner: '#e8a040', bottom: '#6a4a38', shoes: '#302018', apron: '#8a5a38', goggles: '#f0a030', bandana: '#e05028' },
  youngster: { skin: '#f8d0a8', hair: '#6a4028', hs: 'cap', hat: '#3888e0', top: '#f8f8f8', bottom: '#e8c060', shorts: 1, shoes: '#3a3a4a' },
  lass: { skin: '#f8d0a8', hair: '#c86030', hs: 'long', top: '#e8d048', bottom: '#4868c8', dress: 1, shoes: '#6a3a28' },
  bugcatcher: { skin: '#f8d0a8', hair: '#4a3020', hs: 'cap', hat: '#e8e0b0', top: '#78c050', bottom: '#b89060', shorts: 1, shoes: '#6a4a2a', net: 1 },
  hiker: { skin: '#e8b890', hair: '#5a3a20', hs: 'bald', top: '#c88a48', bottom: '#6a5a40', shoes: '#4a3020', beard: '#5a3a20', bag: '#8a5a30', big: 1 },
  sailor: { skin: '#e8b890', hair: '#3a3028', hs: 'short', hat: '#f8f8f8', sailorHat: 1, top: '#f8f8f8', inner: '#3a58a8', bottom: '#3a58a8', shoes: '#202020', big: 1 },
  fisher: { skin: '#e8b890', hair: '#5a4030', hs: 'cap', hat: '#e8d048', top: '#58a0d8', bottom: '#4a4a58', shoes: '#303030', rod: 1 },
  acetrainer: { skin: '#f0c8a8', hair: '#2a8a6a', hs: 'spiky', top: '#e8e8f0', inner: '#2a3a6a', bottom: '#2a3a6a', shoes: '#202028', gloves: '#2a3a6a' },
  acetrainerf: { skin: '#f8d0b0', hair: '#e84860', hs: 'long', top: '#e8e8f0', inner: '#2a3a6a', bottom: '#2a3a6a', dress: 1, shoes: '#202028' },
  beauty: { skin: '#f8d0b0', hair: '#f0d070', hs: 'long', top: '#e878b0', bottom: '#e878b0', dress: 1, shoes: '#c04880' },
  picnicker: { skin: '#f8d0a8', hair: '#6a3a20', hs: 'pigtails', hat: '#f0e070', hatRibbon: '#e05858', top: '#f8a848', bottom: '#4878b8', shorts: 1, shoes: '#6a3a28' },
  camper: { skin: '#f8d0a8', hair: '#5a3a20', hs: 'cap', hat: '#58a048', top: '#e0c070', bottom: '#6a5a40', shorts: 1, shoes: '#4a3020', bag: '#6a8a48' },
  gardener: { skin: '#f0c8a8', hair: '#4a3020', hs: 'short', hat: '#d8c070', hatRibbon: '#c05050', hatWide: 1, top: '#80a870', bottom: '#6a5a40', shoes: '#4a3020', apron: '#e0d0a0' },
  birdkeeper: { skin: '#f0c8a8', hair: '#3a2a20', hs: 'spiky', top: '#e8a040', bottom: '#4a6a38', shoes: '#3a2a20' },
  hexmaniac: { skin: '#f0e0e8', hair: '#5a3a8a', hs: 'long', top: '#3a2a5a', bottom: '#2a1a3a', dress: 1, shoes: '#1a1020' },
  skier: { skin: '#f0c8a8', hair: '#3a2a20', hs: 'hood', hat: '#e04848', top: '#e04848', inner: '#f8f8f8', bottom: '#3a3a58', shoes: '#f8f8f8', goggles: '#40a0f0' },
  scientist: { skin: '#f0c8a8', hair: '#6a6a70', hs: 'short', top: '#f0f0f0', inner: '#4a88c8', bottom: '#5a5a70', coat: 1, shoes: '#303030', glasses: 1 },
  swimmer: { skin: '#f0b890', hair: '#3a2a20', hs: 'short', top: '#f0b890', bottom: '#3a78d8', shorts: 1, shoes: '#f0b890', goggles: '#f0d040' },
  firebreather: { skin: '#e0a880', hair: '#e06020', hs: 'bald', top: '#e8a040', bottom: '#6a2a1a', shoes: '#2a1a10', beard: '#e06020', big: 1 },
  mom: { skin: '#f8d0a8', hair: '#8a4a2a', hs: 'long', top: '#f0a060', bottom: '#b85a48', dress: 1, shoes: '#704030', apron: '#f8f0e0' },
};

// per-class personality: pose, brows, mouth, iris colour
const TRAINER_STYLE = {
  boy: { pose: 'ball', mouth: 'grin', sneakers: 1 }, girl: { pose: 'ball', mouth: 'smile', blush: 1, sneakers: 1 },
  prof: { pose: 'down', mouth: 'smile', brow: 'soft' }, sable: { pose: 'cross', brow: 'angry', mouth: 'flat', eye: '#4a4a5a' },
  sableAsh: { pose: 'down', brow: 'sad', mouth: 'flat', eye: '#4a4a5a' }, grunt: { pose: 'hip', brow: 'angry' }, gruntf: { pose: 'hip', brow: 'angry' },
  slate: { pose: 'cross', brow: 'angry', mouth: 'flat', eye: '#5a6a80' }, gris: { pose: 'down', mouth: 'flat' },
  vane: { pose: 'down', brow: 'angry', mouth: 'frown', eye: '#6a2a38' }, bramble: { pose: 'hip', mouth: 'smile', brow: 'soft', eye: '#3a6a3a' },
  maris: { pose: 'point', mouth: 'grin', eye: '#2a4a8a' }, blaise: { pose: 'raise', mouth: 'grin', brow: 'angry', eye: '#8a3a18' },
  youngster: { pose: 'point', mouth: 'grin', sneakers: 1 }, lass: { pose: 'hip', mouth: 'smile', blush: 1 },
  bugcatcher: { pose: 'net', mouth: 'grin', sneakers: 1 }, hiker: { pose: 'raise', mouth: 'grin' }, sailor: { pose: 'cross', mouth: 'grin', brow: 'angry' },
  fisher: { pose: 'rod', mouth: 'smile' }, acetrainer: { pose: 'ball', mouth: 'flat', brow: 'angry', eye: '#2a6a5a' },
  acetrainerf: { pose: 'hip', mouth: 'smile', eye: '#8a2a3a' }, beauty: { pose: 'hip', mouth: 'smile', blush: 1, eye: '#6a3a5a' },
  picnicker: { pose: 'raise', mouth: 'smile', blush: 1, sneakers: 1 }, camper: { pose: 'point', mouth: 'grin', sneakers: 1 },
  gardener: { pose: 'down', mouth: 'smile', brow: 'soft' }, birdkeeper: { pose: 'raise', mouth: 'grin' },
  hexmaniac: { pose: 'down', brow: 'sad', mouth: 'smile', eye: '#6a3a9a' }, skier: { pose: 'ball', mouth: 'grin' },
  scientist: { pose: 'down', mouth: 'flat' }, swimmer: { pose: 'raise', mouth: 'grin' }, firebreather: { pose: 'raise', mouth: 'grin', brow: 'angry' },
  mom: { pose: 'down', mouth: 'smile', brow: 'soft', blush: 1 },
};

// one mask built from several shapes, shaded once so there are no seams
function shapeP(q, parts, col, o = {}) {
  const m = q.mask();
  for (const [kind, ...a] of parts) { if (kind === 'e') q.mEll(m, ...a); else if (kind === 'p') q.mPoly(m, a[0]); else if (kind === 's') q.mStroke(m, ...a); }
  q.paint(m, col, o);
}

function paintTrainer(p, o) {
  const st = TRAINER_STYLE[o.key] || {};
  const skin = o.skin || '#f8d0a8', top = o.top || '#888', bottom = o.bottom || '#444', hair = o.hair || '#333';
  const SK = { sd: 0.5, k: 1.5 };
  const B = o.big ? 1.12 : 1;
  const cx = 32;
  const bare = o.top === skin;
  const sleeve = bare ? skin : top;
  const pose = st.pose || 'down';
  const shL = [cx - 10 * B, 28], shR = [cx + 10 * B, 28];
  const downL = [shL, [cx - 13.5 * B, 37], [cx - 12.5 * B, 45]], downR = [shR, [cx + 13.5 * B, 37], [cx + 12.5 * B, 45]];
  const hipR = [shR, [cx + 17 * B, 35], [cx + 9.5, 41.5]];
  const ARMS = {
    down: [downL, downR], hip: [downL, hipR],
    ball: [[shL, [cx - 17, 34], [cx - 21, 29]], downR],
    cross: [[shL, [cx - 12.5, 36], [cx + 5, 36.5]], [shR, [cx + 12.5, 35], [cx - 5, 34.5]]],
    point: [[shL, [cx - 18, 31], [cx - 26, 28]], hipR],
    raise: [downL, [shR, [cx + 17, 21], [cx + 15, 12]]],
    rod: [downL, [shR, [cx + 15, 36], [cx + 13, 41]]], net: [downL, [shR, [cx + 15, 36], [cx + 13, 41]]],
  };
  const [armL, armR] = ARMS[pose] || ARMS.down;

  // ── behind the body: cape, long hair, pigtails ──
  if (o.cape) p.part(q => { q.poly([[cx - 11, 26], [cx + 11, 26], [cx + 18, 61], [cx + 6, 58], [cx, 61], [cx - 6, 58], [cx - 18, 61]], o.cape, { k: 2 }); q.within(r => { r.line([[cx - 8, 34], [cx - 12, 58]], 0.5, Col.light(o.cape, 0.6)); r.line([[cx + 8, 34], [cx + 12, 58]], 0.5, Col.shade(o.cape, 0.6)); }); });
  if (o.hs === 'long') p.part(q => q.poly([[cx - 10.5, 11], [cx + 10.5, 11], [cx + 12, 38], [cx + 7, 36], [cx, 38], [cx - 7, 36], [cx - 12, 38]], hair, { k: 2, hl: 0.6 }));
  if (o.hs === 'pigtails') p.part(q => {
    q.stroke([[cx - 9, 14], [cx - 15, 22], [cx - 16, 32], [cx - 13, 38]], 3.8, 2, hair, { k: 1.7 });
    q.stroke([[cx + 9, 14], [cx + 15, 22], [cx + 16, 32], [cx + 13, 38]], 3.8, 2, hair, { k: 1.7 });
    q.within(r => { r.line([[cx - 14, 20], [cx - 15.5, 30]], 0.5, Col.light(hair, 0.8)); r.line([[cx + 14, 20], [cx + 15.5, 30]], 0.5, Col.light(hair, 0.5)); });
  });

  // ── legs and shoes ──
  const legCol = (o.shorts || o.dress) ? skin : bottom;
  p.part(q => {
    const lo = legCol === skin ? SK : { k: 1.5 };
    q.stroke([[cx - 4.3, 44], [cx - 4.7, 51], [cx - 5.2, 58]], 3.2, 2.6, legCol, lo);
    q.stroke([[cx + 4.3, 44], [cx + 4.7, 51], [cx + 5.2, 58]], 3.2, 2.6, legCol, lo);
    if (legCol !== skin) q.within(r => { r.line([[cx - 4.6, 50], [cx - 4.8, 57]], 0.5, Col.shade(bottom, 0.5)); r.line([[cx + 4.6, 50], [cx + 4.8, 57]], 0.5, Col.shade(bottom, 0.5)); });
  });
  const shoe = o.shoes || '#333';
  p.part(q => {
    q.ell(cx - 5.8, 59.6, 4.3, 2.6, shoe, { k: 1.3, hl: 0.8 }); q.ell(cx + 5.8, 59.6, 4.3, 2.6, shoe, { k: 1.3, hl: 0.8 });
    if (st.sneakers) q.within(r => { r.rect(cx - 10, 61, 8.5, 1, '#f4f2ec'); r.rect(cx + 1.5, 61, 8.5, 1, '#f4f2ec'); });
  });
  if (o.shorts) p.part(q => {
    q.poly([[cx - 9, 42], [cx + 9, 42], [cx + 9.8, 49], [cx + 1.2, 49], [cx, 46.5], [cx - 1.2, 49], [cx - 9.8, 49]], bottom, { k: 1.6 });
    q.within(r => r.rect(cx - 10, 48, 20, 1, Col.shade(bottom, 0.4)));
  });
  else if (!o.dress) p.part(q => q.poly([[cx - 9, 42], [cx + 9, 42], [cx + 7.6, 48], [cx + 1, 48], [cx, 46], [cx - 1, 48], [cx - 7.6, 48]], bottom, { k: 1.6 }));
  if (o.dress) p.part(q => {
    const sk = o.bottom === '#f4f4fa' ? '#f4f4fa' : bottom;
    q.poly([[cx - 8.5, 37], [cx + 8.5, 37], [cx + 13.5, 51], [cx + 7, 52.5], [cx, 51.5], [cx - 7, 52.5], [cx - 13.5, 51]], sk, { k: 2 });
    q.within(r => { for (const dx of [-7, -2.5, 2.5, 7]) r.line([[cx + dx * 0.55, 40], [cx + dx, 51]], 0.5, Col.shade(sk, 0.45)); });
  });

  // ── torso ──
  p.part(q => {
    const T = [[cx - 6.5, 24.5], [cx + 6.5, 24.5], [cx + 11.5 * B, 27.5], [cx + 10.6 * B, 35], [cx + 9, 44], [cx - 9, 44], [cx - 10.6 * B, 35], [cx - 11.5 * B, 27.5]];
    if (o.coat) shapeP(q, [['p', T], ['p', [[cx - 10.4 * B, 31], [cx + 10.4 * B, 31], [cx + 12.5 * B, 55], [cx + 1.5, 55], [cx, 49], [cx - 1.5, 55], [cx - 12.5 * B, 55]]]], top, { k: 2 });
    else q.poly(T, top, bare ? SK : { k: 2 });
    q.within(r => {
      if (o.inner) r.poly([[cx - 3.4, 24.5], [cx + 3.4, 24.5], [cx + 2.6, 45], [cx - 2.6, 45]], o.inner, { k: 1.5 });
      if (o.top2) r.poly([[cx - 2.6, 24.5], [cx + 2.6, 24.5], [cx + 2.6, 44], [cx - 2.6, 44]], o.top2, { k: 1.3 });
      if (o.apron) r.poly([[cx - 7, 31], [cx + 7, 31], [cx + 8.5, 52], [cx - 8.5, 52]], o.apron, { k: 1.6 });
      if (o.tie) r.poly([[cx - 1, 25.5], [cx + 1, 25.5], [cx + 1.8, 36], [cx, 38], [cx - 1.8, 36]], o.tie, { k: 1.2 });
      if (o.emblem) { r.ell(cx + 5.5, 31.5, 3, 3, '#dedee6', { k: 1.2 }); r.ell(cx + 5.5, 31.5, 1.7, 1.7, o.inner || '#444', { flat: true }); r.dot(cx + 5.5, 29.5, '#dedee6'); }
      if (!bare && !o.inner && !o.top2) r.line([[cx, 26], [cx, 43]], 0.5, Col.shade(top, 0.55));
      // lapels
      if (!bare) { r.poly([[cx - 6.5, 24.5], [cx - 1.5, 24.5], [cx - 3, 29]], Col.light(top, 0.55), { flat: true }); r.poly([[cx + 1.5, 24.5], [cx + 6.5, 24.5], [cx + 3, 29]], Col.shade(top, 0.3), { flat: true }); }
      if (!o.coat && !o.dress && !bare) r.rect(cx - 9.5, 42.5, 19, 1.5, Col.shade(bottom, 0.9));
    });
    if (o.scarf) q.stroke([[cx - 7, 25], [cx, 27.5], [cx + 7, 25]], 2.4, 2.4, o.scarf, { k: 1.3 });
    if (o.bag) q.line([[cx - 9.5, 26], [cx + 9, 43]], 1, o.bag);
  });

  // ── arms (+ what they hold) ──
  const arm = (pts) => p.part(q => {
    const [s, e, w] = pts;
    q.stroke([s, e], 3.2 * B, 2.8, sleeve, bare ? SK : { k: 1.5 });
    q.stroke([e, w], 2.8, 2.3, sleeve, bare ? SK : { k: 1.5 });
    q.ball(w[0], w[1] + 0.5, 2.5, 2.5, o.gloves || skin, o.gloves ? { k: 1.2 } : SK);
  });
  arm(armR);
  if (pose === 'rod') p.part(q => { q.line([[armR[2][0], armR[2][1]], [cx + 27, 3]], 0.7, '#8a6a40'); q.line([[cx + 27, 3], [cx + 29, 28]], 0.3, '#e8e8f0'); });
  if (pose === 'net') p.part(q => { q.line([[armR[2][0], armR[2][1]], [cx + 22, 16]], 0.8, '#8a6a40'); q.ell(cx + 24, 11, 5.4, 5.4, '#f4f4f0', { k: 1.2 }); q.within(r => { for (let i = -3; i <= 3; i += 2) { r.line([[cx + 24 + i, 6], [cx + 24 + i, 16]], 0.4, '#b8b8b0'); r.line([[cx + 19, 11 + i], [cx + 29, 11 + i]], 0.4, '#b8b8b0'); } }); });
  arm(armL);
  if (pose === 'ball') p.part(q => {
    const bx = armL[2][0] - 2, by = armL[2][1] - 3;
    q.ball(bx, by, 3.6, 3.6, '#f2f2f2', { hl: 1.1 });
    q.within(r => { r.ell(bx, by - 1.6, 3.8, 2.6, '#e83838', { hl: 1 }); r.rect(bx - 4, by - 0.4, 8, 1, '#2a2a30'); r.dot(bx - 0.5, by - 0.5, '#ffffff'); });
  });

  // ── neck and head ──
  p.part(q => q.rect(cx - 2.6, 20, 5.2, 6, Col.shade(skin, 0.45)));
  p.part(q => {
    q.ell(cx - 8.6, 15.5, 1.7, 2.4, skin, SK); q.ell(cx + 8.6, 15.5, 1.7, 2.4, skin, SK);
    shapeP(q, [['e', cx, 13.5, 8.4, 8.4], ['p', [[cx - 7.9, 14], [cx + 7.9, 14], [cx + 6.4, 20.2], [cx + 2.6, 23.3], [cx - 2.6, 23.3], [cx - 6.4, 20.2]]]], skin, SK);
    // eyes: lash, iris, catchlight
    const iris = st.eye || o.eye || '#3a2c34', lash = '#231a22';
    const brow = Col.shade(o.hair && o.hs !== 'hood' && o.hs !== 'bald' ? hair : '#5a4a44', 0.55);
    const eyeAt = (x, y, out) => {
      q.rect(x, y + 1, 2, 3, iris); q.rect(x, y + 3, 2, 1, Col.shade(iris, 0.8)); q.dot(x, y + 1, '#ffffff');
      q.rect(out < 0 ? x - 1 : x, y, 3, 1, lash);
      const b = st.brow || 'neutral';
      const ox = out < 0 ? x - 1 : x + 2.5, ix = out < 0 ? x + 2.5 : x - 1;
      const oy = b === 'angry' ? y - 3 : b === 'sad' ? y - 1.4 : y - 2, iy = b === 'angry' ? y - 1.4 : b === 'sad' ? y - 3 : b === 'soft' ? y - 2.4 : y - 2;
      q.line([[ox, oy], [ix, iy]], 0.5, brow);
    };
    if (!o.visor) { eyeAt(cx - 5, 14, -1); eyeAt(cx + 3, 14, 1); }
    q.dot(cx - 0.5, 18.2, Col.shade(skin, 0.6));
    const mc = Col.mix(Col.shade(skin, 1.1), '#3e2228', 0.6), m = st.mouth || 'flat';
    if (m === 'smile') q.line([[cx - 2.5, 19.8], [cx - 1, 20.8], [cx + 1, 20.8], [cx + 2.5, 19.8]], 0.5, mc);
    else if (m === 'grin') { q.rect(cx - 1.5, 20, 3, 2, '#6e3236'); q.rect(cx - 1.5, 20, 3, 1, '#fbf8f4'); q.dot(cx - 2.5, 19.5, mc); q.dot(cx + 1.5, 19.5, mc); }
    else if (m === 'frown') q.line([[cx - 2.5, 21], [cx - 1, 20.2], [cx + 1, 20.2], [cx + 2.5, 21]], 0.5, mc);
    else q.line([[cx - 1.5, 20.5], [cx + 1.5, 20.5]], 0.5, mc);
    if (st.blush) { q.rect(cx - 7, 18.5, 2, 1, '#f4a0a0'); q.rect(cx + 5, 18.5, 2, 1, '#f4a0a0'); }
    if (o.lips) q.line([[cx - 1.5, 21], [cx + 1.5, 21]], 0.5, '#c04858');
    if (o.glasses) {
      const fc = '#3a3a48';
      for (const x of [cx - 6, cx + 2]) { q.rect(x, 13.6, 4.2, 0.8, fc); q.rect(x, 18.2, 4.2, 0.8, fc); q.rect(x, 13.6, 0.8, 5.4, fc); q.rect(x + 3.4, 13.6, 0.8, 5.4, fc); q.dot(x + 3, 14.6, '#ffffff'); }
      q.rect(cx - 2, 15, 4, 0.8, fc);
    }
    if (o.visor) { q.poly([[cx - 8.2, 13.2], [cx + 8.2, 13.2], [cx + 8, 17.6], [cx - 8, 17.6]], o.visor, { k: 1.2, hl: 1.2 }); q.rect(cx - 7, 14, 6, 0.8, '#e8ffff'); }
    if (o.patch) { q.ell(cx + 4, 16, 2.6, 2.6, '#1a1a1a', { k: 1 }); q.line([[cx - 8, 11], [cx + 8, 19]], 0.5, '#1a1a1a'); }
    if (o.mask) q.poly([[cx - 7, 18], [cx + 7, 18], [cx + 5.4, 23], [cx - 5.4, 23]], '#4a4a54', { k: 1.4 });
    if (o.beard) {
      // full beard below the cheeks, a mustache that curls over the mouth, and a few strands
      q.poly([[cx - 7.8, 17.5], [cx - 5.5, 20.5], [cx - 2.5, 21.4], [cx, 20.6], [cx + 2.5, 21.4], [cx + 5.5, 20.5], [cx + 7.8, 17.5], [cx + 6.6, 23], [cx + 2.4, 26.4], [cx - 2.4, 26.4], [cx - 6.6, 23]], o.beard, { k: 1.6 });
      q.poly([[cx - 4.6, 19], [cx - 1, 18.6], [cx, 19.4], [cx + 1, 18.6], [cx + 4.6, 19], [cx + 3, 20.6], [cx, 20], [cx - 3, 20.6]], o.beard, { k: 1.2 });
      for (const dx of [-4, -1.5, 1.5, 4]) q.line([[cx + dx, 22.4], [cx + dx * 0.8, 25]], 0.5, Col.shade(o.beard, 0.4));
    }
    if (o.goggles) { q.line([[cx - 8.8, 9.5], [cx + 8.8, 9.5]], 0.9, '#302820'); q.ell(cx - 3.6, 9.5, 2.4, 2, o.goggles, { hl: 1.5 }); q.ell(cx + 3.6, 9.5, 2.4, 2, o.goggles, { hl: 1.5 }); }
  });

  // ── hair and hats ──
  p.part(q => {
    const H = { hl: 0.85, k: 2 };
    switch (o.hs) {
      case 'short': q.poly([[cx - 9, 16], [cx - 9.6, 8.5], [cx - 6, 4.2], [cx, 2.8], [cx + 6, 4.2], [cx + 9.6, 8.5], [cx + 9, 16], [cx + 7.4, 11.6], [cx + 5, 10.4], [cx + 3, 12], [cx + 1, 10], [cx - 2, 12], [cx - 4, 10], [cx - 6.5, 12], [cx - 7.6, 11.6]], hair, H); break;
      case 'swept': q.poly([[cx - 9, 15], [cx - 9.4, 8], [cx - 5, 3.4], [cx + 2, 2.4], [cx + 8, 4.4], [cx + 10.6, 9], [cx + 9.6, 15], [cx + 8, 10], [cx + 4, 7.4], [cx - 2, 7], [cx - 7, 9.4]], hair, H); break;
      case 'slick': q.poly([[cx - 9, 14], [cx - 8.6, 6.4], [cx - 3, 3.2], [cx + 4, 3.2], [cx + 8.6, 6.4], [cx + 9, 14], [cx + 7, 9], [cx, 7.2], [cx - 7, 9]], hair, H); break;
      case 'spiky': q.poly([[cx - 9, 16], [cx - 12.5, 7], [cx - 7, 6.4], [cx - 7, -0.5], [cx - 2, 3.8], [cx + 1, -1.5], [cx + 4, 3.8], [cx + 9, -0.5], [cx + 8.6, 6], [cx + 12.5, 7], [cx + 9, 16], [cx + 7, 11.5], [cx + 4, 12.2], [cx + 2, 10.4], [cx - 1, 12.2], [cx - 4, 10.4], [cx - 7, 12.2]], hair, H); break;
      case 'bob': q.poly([[cx - 10, 23], [cx - 10.6, 9], [cx - 6, 4], [cx + 1, 2.6], [cx + 7, 4.2], [cx + 10.6, 9], [cx + 10, 23], [cx + 7.6, 23], [cx + 7.2, 13], [cx + 4, 11], [cx, 11.6], [cx - 4, 11], [cx - 7.2, 13], [cx - 7.6, 23]], hair, H); break;
      case 'long': q.poly([[cx - 10.2, 25], [cx - 10.6, 9], [cx - 6, 4], [cx + 1, 2.6], [cx + 7, 4.2], [cx + 10.6, 9], [cx + 10.2, 25], [cx + 7.8, 25], [cx + 7.4, 13], [cx + 3, 10.6], [cx + 1, 12], [cx - 2, 10.6], [cx - 7.4, 13], [cx - 7.8, 25]], hair, H); break;
      case 'pigtails': q.poly([[cx - 9, 15], [cx - 9.6, 8.5], [cx - 5, 4], [cx + 3, 3.4], [cx + 8.6, 6.6], [cx + 9.6, 12], [cx + 9, 15], [cx + 7, 11.4], [cx + 3, 10.6], [cx, 12.2], [cx - 3, 10.6], [cx - 7, 11.6]], hair, H); break;
      case 'bun': q.poly([[cx - 9, 14], [cx - 8.6, 6.8], [cx, 3.8], [cx + 8.6, 6.8], [cx + 9, 14], [cx + 5, 9], [cx - 5, 9]], hair, H); q.ball(cx, 2.6, 4.2, 3.2, hair, H); break;
      case 'bald': q.poly([[cx - 9, 17], [cx - 9.4, 11], [cx - 7, 11.4], [cx - 7.2, 17]], hair, { k: 1.3 }); q.poly([[cx + 9, 17], [cx + 9.4, 11], [cx + 7, 11.4], [cx + 7.2, 17]], hair, { k: 1.3 }); break;
      case 'hood': q.poly([[cx - 11.4, 26], [cx - 11.4, 8], [cx - 4, 1.6], [cx + 4, 1.6], [cx + 11.4, 8], [cx + 11.4, 26], [cx + 8.2, 26], [cx + 8.2, 11], [cx, 8.2], [cx - 8.2, 11], [cx - 8.2, 26]], o.hat, { k: 2, hl: 0.7 }); break;
      case 'cap': q.poly([[cx - 9, 17], [cx - 9.6, 11], [cx - 6.5, 11.6], [cx - 7.4, 15]], hair, { k: 1.3 }); q.poly([[cx + 9, 17], [cx + 9.6, 11], [cx + 6.5, 11.6], [cx + 7.4, 15]], hair, { k: 1.3 }); break;
    }
    if (o.hs === 'cap') {
      q.ball(cx, 7.4, 9.4, 6, o.hat, { hl: 1, k: 2 });
      q.within(r => { r.ell(cx, 5.2, 3.4, 3, '#fafafa', { k: 1 }); r.line([[cx - 9, 9], [cx + 9, 9]], 0.5, Col.shade(o.hat, 0.6)); });
      q.ell(cx - 1.5, 11.4, 10.8, 2.2, Col.shade(o.hat, 0.35), { k: 1.2 });
    }
    if (o.hatWide) {
      q.ell(cx, 9.4, 15.5, 3.4, o.hat, { k: 1.6 });
      q.ball(cx, 5.6, 8.2, 4.8, o.hat, { hl: 1, k: 1.8 });
      if (o.hatRibbon) q.within(r => r.rect(cx - 8.4, 6.8, 16.8, 2, o.hatRibbon));
    }
    if (o.captain) { q.ball(cx, 5.8, 10, 5, o.hat, { hl: 1, k: 1.8 }); q.poly([[cx - 9, 9], [cx + 9, 9], [cx + 7, 12], [cx - 7, 12]], '#1e1e24', { k: 1.2 }); q.within(r => r.ell(cx, 5.6, 2.6, 2, o.hatRibbon, { k: 1 })); }
    if (o.sailorHat) { q.ell(cx, 6.8, 9.4, 3.8, '#f8f8f8', { k: 1.6 }); q.within(r => r.rect(cx - 10, 8, 20, 2, '#3a58a8')); }
    if (o.hs === 'pigtails' && o.hat) {
      q.ball(cx, 6.6, 10.4, 5.4, o.hat, { hl: 1, k: 1.8 });
      q.ell(cx, 10.4, 11.4, 1.8, Col.shade(o.hat, 0.35), { k: 1.2 });
      if (o.hatRibbon) q.ell(cx + 8, 4.6, 3.2, 2.2, o.hatRibbon, { k: 1.2 });
    }
    if (o.bandana) { q.poly([[cx - 9.4, 7.6], [cx + 9.4, 7.6], [cx + 9.4, 10.8], [cx - 9.4, 10.8]], o.bandana, { k: 1.5 }); q.poly([[cx + 9, 8], [cx + 14, 12], [cx + 10, 13]], o.bandana, { k: 1.2 }); }
  });
}

const TrainerArt = (() => {
  const cache = new Map();
  function front(key) {
    if (cache.has(key)) return cache.get(key);
    const o = TRAINER_ART[key] || TRAINER_ART.youngster;
    const p = new Painter(64, 64, 1);
    paintTrainer(p, Object.assign({ key }, o));
    const c = p.finish().toCanvas();
    cache.set(key, c);
    return c;
  }
  function big(key, scale = 1.5) {
    const k = key + '@' + scale;
    if (cache.has(k)) return cache.get(k);
    const o = TRAINER_ART[key] || TRAINER_ART.youngster;
    const sz = Math.round(64 * scale);
    const p = new Painter(sz, sz, scale);
    paintTrainer(p, Object.assign({ key }, o));
    const c = p.finish().toCanvas();
    cache.set(k, c);
    return c;
  }
  // player back sprite with throw frames: 0 idle, 1 wind-up, 2 release
  function back(gender, fr = 0) {
    const k = 'back' + gender + fr;
    if (cache.has(k)) return cache.get(k);
    const o = TRAINER_ART[gender] || TRAINER_ART.boy;
    const p = new Painter(80, 80, 1);
    const cx = 36, SK = { sd: 0.5, k: 1.5 }, top = o.top, hair = o.hair;
    // torso: sloped shoulders, collar, centre seam
    p.part(q => {
      q.poly([[cx - 19, 47], [cx - 8, 41.5], [cx + 8, 41.5], [cx + 19, 47], [cx + 22, 80], [cx - 22, 80]], top, { k: 2.6 });
      q.within(r => {
        r.poly([[cx - 8, 41.5], [cx + 8, 41.5], [cx + 7, 44.5], [cx - 7, 44.5]], Col.shade(top, 0.35), { k: 1.2 });
        r.line([[cx, 45], [cx, 80]], 0.5, Col.shade(top, 0.5));
        if (o.dress) r.rect(cx - 22, 74, 44, 6, Col.light(top, 0.5));
      });
    });
    // backpack with straps, flap and buckle
    if (o.bag) {
      const bag = o.bag, bagD = Col.shade(bag, 0.7);
      p.part(q => { q.stroke([[cx - 10, 43], [cx - 9, 53]], 1.6, 1.6, bagD, { k: 1 }); q.stroke([[cx + 10, 43], [cx + 9, 53]], 1.6, 1.6, bagD, { k: 1 }); });
      p.part(q => {
        shapeP(q, [['p', [[cx - 12, 56], [cx + 12, 56], [cx + 12, 74], [cx + 9, 78], [cx - 9, 78], [cx - 12, 74]]], ['e', cx, 56, 12, 4.5]], bag, { k: 2.2, hl: 0.8 });
        q.within(r => { r.line([[cx - 11, 67], [cx - 7, 67]], 0.5, bagD); r.line([[cx + 7, 67], [cx + 11, 67]], 0.5, bagD); });
      });
      p.part(q => {
        q.poly([[cx - 11.5, 53], [cx + 11.5, 53], [cx + 10.5, 63], [cx, 65], [cx - 10.5, 63]], Col.light(bag, 0.35), { k: 1.6 });
        q.rect(cx - 2, 61, 4, 4, '#4a3a30'); q.rect(cx - 1, 62, 2, 2, '#e8d8a0');
      });
    }
    // pigtails hang down the back
    if (o.hs === 'pigtails') p.part(q => {
      for (const d of [-1, 1]) { q.stroke([[cx + d * 11, 30], [cx + d * 16, 42], [cx + d * 18, 55], [cx + d * 16, 62]], 4.4, 2.2, hair, { k: 1.8 }); }
      q.within(r => { for (const d of [-1, 1]) r.line([[cx + d * 14, 38], [cx + d * 17, 52]], 0.5, Col.light(hair, 0.6)); });
    });
    const arm = pts => p.part(q => {
      const [s0, e, w] = pts;
      q.stroke([s0, e], 4.4, 3.8, top, { k: 1.7 });
      q.stroke([e, w], 3.8, 3.3, top, { k: 1.7 });
      q.within(r => r.stroke([[lerp(e[0], w[0], 0.78), lerp(e[1], w[1], 0.78)], w], 3.6, 3.4, Col.shade(top, 0.5), { flat: true }));
      q.ball(w[0], w[1] + 1, 3.4, 3.2, o.skin, SK);
    });
    arm([[cx - 18, 49], [cx - 22.5, 63], [cx - 21, 76]]);
    // head from behind: ears, hair with strands, nape tufts, then the hat
    p.part(q => q.rect(cx - 4.5, 35, 9, 9, Col.shade(o.skin, 0.5)));
    p.part(q => { q.ell(cx - 13.4, 29.5, 2.4, 3.6, o.skin, SK); q.ell(cx + 13.4, 29.5, 2.4, 3.6, o.skin, SK); });
    p.part(q => {
      q.ball(cx, 28, 13.6, 13.6, hair, { hl: 0.7, k: 2.6 });
      q.poly([[cx - 9, 36], [cx - 6, 43], [cx - 3, 38], [cx, 44], [cx + 3, 38], [cx + 6, 43], [cx + 9, 36]], hair, { k: 1.4 });
      q.within(r => { for (const d of [-8, -3, 2, 7]) r.line([[cx + d * 0.4, 24], [cx + d, 38]], 0.5, Col.light(hair, d < 0 ? 0.6 : 0.2)); });
    });
    if (o.hs === 'cap') p.part(q => {
      q.ball(cx, 20, 14.6, 9.6, o.hat, { hl: 1, k: 2.2 });
      q.within(r => {
        for (const d of [-9, -3, 3, 9]) r.line([[cx, 11], [cx + d, 28]], 0.5, Col.shade(o.hat, 0.5));
        r.ell(cx, 28.5, 3.4, 3, hair, { k: 1 });
        r.rect(cx - 3.5, 27, 7, 1, Col.shade(o.hat, 0.9));
      });
      q.dot(cx - 0.5, 10.5, Col.shade(o.hat, 0.6));
    });
    if (o.hs === 'pigtails') p.part(q => {
      q.ball(cx, 18.5, 16, 9.4, o.hat, { hl: 1, k: 2.2 });
      q.ell(cx, 24.4, 16.6, 2.4, Col.shade(o.hat, 0.3), { k: 1.2 });
      if (o.hatRibbon) q.ell(cx + 12, 16, 4.4, 3.2, o.hatRibbon, { k: 1.4 });
    });
    // throwing arm: idle, wind-up (ball in hand), release
    const ARMS = [[[cx + 18, 49], [cx + 22.5, 63], [cx + 21, 76]], [[cx + 18, 49], [cx + 27, 40], [cx + 30, 27]], [[cx + 18, 49], [cx + 31, 46], [cx + 43, 43]]];
    arm(ARMS[fr]);
    if (fr === 1) p.part(q => {
      const bx = cx + 31, by = 23;
      q.ball(bx, by, 4, 4, '#f2f2f2', { hl: 1.1 });
      q.within(r => { r.ell(bx, by - 1.8, 4.2, 3, '#e83838', { hl: 1 }); r.rect(bx - 4.5, by - 0.5, 9, 1, '#2a2a30'); r.dot(bx - 0.5, by - 0.5, '#ffffff'); });
    });
    const c = p.finish().toCanvas();
    cache.set(k, c);
    return c;
  }
  return { front, back, big };
})();
