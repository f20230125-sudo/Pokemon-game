'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Bitmap font (hand-drawn 5x7 with descenders) + tiny 3x5 HUD font
// ─────────────────────────────────────────────────────────────────────────────
const FONT_SRC = `
A .###. #...# #...# ##### #...# #...# #...#
B ####. #...# #...# ####. #...# #...# ####.
C .###. #...# #.... #.... #.... #...# .###.
D ####. #...# #...# #...# #...# #...# ####.
E ##### #.... #.... ####. #.... #.... #####
F ##### #.... #.... ####. #.... #.... #....
G .###. #...# #.... #.### #...# #...# .####
H #...# #...# #...# ##### #...# #...# #...#
I ### .#. .#. .#. .#. .#. ###
J ....# ....# ....# ....# #...# #...# .###.
K #...# #..#. #.#.. ##... #.#.. #..#. #...#
L #.... #.... #.... #.... #.... #.... #####
M #...# ##.## #.#.# #.#.# #...# #...# #...#
N #...# ##..# #.#.# #..## #...# #...# #...#
O .###. #...# #...# #...# #...# #...# .###.
P ####. #...# #...# ####. #.... #.... #....
Q .###. #...# #...# #...# #.#.# #..#. .##.#
R ####. #...# #...# ####. #.#.. #..#. #...#
S .###. #...# #.... .###. ....# #...# .###.
T ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
U #...# #...# #...# #...# #...# #...# .###.
V #...# #...# #...# #...# #...# .#.#. ..#..
W #...# #...# #...# #.#.# #.#.# ##.## #...#
X #...# #...# .#.#. ..#.. .#.#. #...# #...#
Y #...# #...# .#.#. ..#.. ..#.. ..#.. ..#..
Z ##### ....# ...#. ..#.. .#... #.... #####
a ..... ..... .###. ....# .#### #...# .####
b #.... #.... ####. #...# #...# #...# ####.
c .... .... .### #... #... #... .###
d ....# ....# .#### #...# #...# #...# .####
e ..... ..... .###. #...# ##### #.... .###.
f ..## .#.. ###. .#.. .#.. .#.. .#..
g ..... ..... .#### #...# #...# #...# .#### ....# .###.
h #.... #.... ####. #...# #...# #...# #...#
i # . # # # # #
j ..# ... .## ..# ..# ..# ..# #.# .#.
k #... #... #..# #.#. ##.. #.#. #..#
l #. #. #. #. #. #. .#
m ..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#
n ..... ..... #.##. ##..# #...# #...# #...#
o ..... ..... .###. #...# #...# #...# .###.
p ..... ..... ####. #...# #...# #...# ####. #.... #....
q ..... ..... .#### #...# #...# #...# .#### ....# ....#
r .... .... #.## ##.. #... #... #...
s ..... ..... .#### #.... .###. ....# ####.
t .#.. .#.. #### .#.. .#.. .#.. ..##
u ..... ..... #...# #...# #...# #..## .##.#
v ..... ..... #...# #...# #...# .#.#. ..#..
w ..... ..... #...# #...# #.#.# #.#.# .#.#.
x ..... ..... #...# .#.#. ..#.. .#.#. #...#
y ..... ..... #...# #...# #...# #...# .#### ....# .###.
z ..... ..... ##### ...#. ..#.. .#... #####
0 .###. #...# #..## #.#.# ##..# #...# .###.
1 ..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.
2 .###. #...# ....# ...#. ..#.. .#... #####
3 .###. #...# ....# ..##. ....# #...# .###.
4 ...#. ..##. .#.#. #..#. ##### ...#. ...#.
5 ##### #.... ####. ....# ....# #...# .###.
6 ..##. .#... #.... ####. #...# #...# .###.
7 ##### ....# ...#. ..#.. .#... .#... .#...
8 .###. #...# #...# .###. #...# #...# .###.
9 .###. #...# #...# .#### ....# ...#. .##..
! # # # # # . #
? .###. #...# ....# ...#. ..#.. ..... ..#..
. . . . . . . #
, .. .. .. .. .. .# .# #.
' # # . . . . .
" #.# #.# ... ... ... ... ...
- .... .... .... #### .... .... ....
: . . # . . # .
; .. .. .# .. .. .# .# #.
/ ....# ...#. ...#. ..#.. .#... .#... #....
( .# #. #. #. #. #. .#
) #. .# .# .# .# .# #.
+ ..... ..#.. ..#.. ##### ..#.. ..#.. .....
= .... .... #### .... #### .... ....
% ##..# ##.#. ...#. ..#.. .#... .#.## #..##
& .##.. #..#. #.#.. .#... #.#.# #..#. .##.#
* ..... #.#.# .###. ##### .###. #.#.# .....
# .#.#. ##### .#.#. .#.#. .#.#. ##### .#.#.
< ...# ..#. .#.. #... .#.. ..#. ...#
> #... .#.. ..#. ...# ..#. .#.. #...
[ ## #. #. #. #. #. ##
] ## .# .# .# .# .# ##
_ ..... ..... ..... ..... ..... ..... #####
~ ..... ..... .#..# #.##. ..... ..... .....
é ...#. ..#.. .###. #...# ##### #.... .###.
… ..... ..... ..... ..... ..... ..... #.#.#
♂ ..### ...## ..#.# .##.. #..#. #..#. .##..
♀ .###. #...# #...# .###. ..#.. .###. ..#..
▶ #... ##.. ###. #### ###. ##.. #...
▼ ..... ..... ##### .###. ..#.. ..... .....
▲ ..... ..... ..#.. .###. ##### ..... .....
₽ ####. #...# #...# ####. #.... ###.. #....
× ..... #...# .#.#. ..#.. .#.#. #...# .....
♥ ..... .#.#. ##### ##### .###. ..#.. .....
♪ ..##. ..#.# ..#.. ..#.. ###.. ###.. .....
→ ..... ..#.. ...#. ##### ...#. ..#.. .....
◀ ...# ..## .### #### .### ..## ...#
— ...... ...... ...... ###### ...... ...... ......
– .... .... .... #### .... .... ....
· . . . # . . .
★ ..#.. ..#.. ##### .###. .#.#. #...# .....
© .###. #...# #.#.# ##..# #.#.# #...# .###.
`;

const Font = (() => {
  const glyphs = {};
  for (const line of FONT_SRC.split('\n')) {
    if (line.length < 3) continue;
    const ch = line[0];
    const rows = line.slice(2).trim().split(/\s+/);
    glyphs[ch] = { w: rows[0].length, rows };
  }
  glyphs[' '] = { w: 3, rows: [] };
  for (const [k, v] of [['’', "'"], ['‘', "'"], ['“', '"'], ['”', '"'], ['è', 'e'], ['ê', 'e'], [' ', ' ']]) glyphs[k] = glyphs[v];
  const LH = 12; // line height
  const atlases = new Map();

  function atlas(color, shadow) {
    const key = color + '|' + shadow;
    let a = atlases.get(key);
    if (a) return a;
    const chars = Object.keys(glyphs);
    const cw = 8, ch = 11;
    const c = mkCanvas(chars.length * cw, ch);
    const x = c.ctx;
    const map = {};
    chars.forEach((k, i) => {
      const g = glyphs[k];
      const ox = i * cw;
      map[k] = ox;
      const draw = (col, dx, dy) => {
        x.fillStyle = col;
        g.rows.forEach((r, y) => { for (let j = 0; j < r.length; j++) if (r[j] === '#') x.fillRect(ox + j + dx, y + dy, 1, 1); });
      };
      if (shadow) { draw(shadow, 1, 0); draw(shadow, 0, 1); draw(shadow, 1, 1); }
      draw(color, 0, 0);
    });
    a = { c, map };
    atlases.set(key, a);
    return a;
  }

  function charW(ch) { const g = glyphs[ch] || glyphs['?']; return g.w + 1; }
  function width(str) { let w = 0; for (const ch of str) w += charW(ch); return Math.max(0, w - 1); }

  // draws text; returns width. color defaults to dark-grey-on-white style.
  function draw(c, str, x, y, color = '#404048', shadow = '#d0d0c8') {
    str = String(str);
    const a = atlas(color, shadow);
    let cx = Math.round(x);
    y = Math.round(y);
    for (const ch of str) {
      const g = glyphs[ch] || glyphs['?'];
      const ox = a.map[glyphs[ch] ? ch : '?'];
      if (ch !== ' ') c.drawImage(a.c, ox, 0, 8, 11, cx, y, 8, 11);
      cx += g.w + 1;
    }
    return cx - x;
  }
  function drawR(c, str, xr, y, color, shadow) { return draw(c, str, xr - width(String(str)), y, color, shadow); }
  function drawC(c, str, xc, y, color, shadow) { return draw(c, str, Math.round(xc - width(String(str)) / 2), y, color, shadow); }

  // word-wrap to pixel width; respects \n
  function wrap(str, maxW) {
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (width(test) > maxW && line) { out.push(line); line = wd; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }

  // large text: glyphs scaled with outline, used for titles
  function big(c, str, x, y, scale, fill, outline, grad) {
    const tw = width(str) * scale;
    const tmp = mkCanvas(tw + scale * 4 + 4, 9 * scale + scale * 4 + 4);
    const t = tmp.ctx;
    let cx = 2 + scale * 2;
    for (const ch of str) {
      const g = glyphs[ch] || glyphs['?'];
      g.rows.forEach((r, ry) => {
        for (let j = 0; j < r.length; j++) if (r[j] === '#') {
          t.fillStyle = grad ? grad(ry, g.rows.length) : fill;
          t.fillRect(cx + j * scale, 2 + scale * 2 + ry * scale, scale, scale);
        }
      });
      cx += (g.w + 1) * scale;
    }
    if (outline) {
      const src = t.getImageData(0, 0, tmp.width, tmp.height);
      const out = t.createImageData(tmp.width, tmp.height);
      const [r, gg, b] = Col.rgb(outline);
      const d = src.data, o = out.data, w = tmp.width, h = tmp.height;
      const R = Math.max(1, Math.round(scale * 0.6));
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4;
        if (d[i + 3]) { o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = 255; continue; }
        let near = false;
        for (let dy = -R; dy <= R && !near; dy++) for (let dx = -R; dx <= R; dx++) {
          const nx = xx + dx, ny = yy + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && d[(ny * w + nx) * 4 + 3]) { near = true; break; }
        }
        if (near) { o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255; }
      }
      t.putImageData(out, 0, 0);
    }
    c.drawImage(tmp, Math.round(x - 2 - scale * 2), Math.round(y - 2 - scale * 2));
    return tw;
  }

  return { draw, drawR, drawC, width, wrap, big, LH, glyphs };
})();

// tiny 3x5 digits + a few letters for HUDs
const Tiny = (() => {
  const SRC = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    '/': '001001010100100', 'L': '100100100100111', 'v': '000000101101010', 'H': '101101111101101', 'P': '110101110100100',
    ' ': '000000000000000', '-': '000000111000000', 'N': '110101101101101', 'o': '000010101101010', '.': '000000000000010',
    'E': '111100110100111', 'X': '101101010101101',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'F': '111100110100100', 'G': '011100101101011', 'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101', 'M': '101111111101101', 'O': '010101101101010', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'Y': '101101010010010', 'Z': '111001010100111',
  };
  const cache = new Map();
  function sheet(col) {
    if (cache.has(col)) return cache.get(col);
    const keys = Object.keys(SRC);
    const c = mkCanvas(keys.length * 4, 5);
    c.ctx.fillStyle = col;
    const map = {};
    keys.forEach((k, i) => { map[k] = i * 4; const s = SRC[k]; for (let j = 0; j < 15; j++) if (s[j] === '1') c.ctx.fillRect(i * 4 + (j % 3), (j / 3) | 0, 1, 1); });
    const r = { c, map }; cache.set(col, r); return r;
  }
  function draw(c, str, x, y, col = '#404048', shadow) {
    str = String(str);
    if (shadow) draw(c, str, x + 1, y + 1, shadow);
    const s = sheet(col);
    let cx = x;
    for (const ch of str) { const ox = s.map[ch]; if (ox != null) c.drawImage(s.c, ox, 0, 3, 5, cx, y, 3, 5); cx += 4; }
    return cx - x;
  }
  const width = str => String(str).length * 4 - 1;
  return { draw, width, drawR: (c, str, xr, y, col, sh) => draw(c, str, xr - width(str), y, col, sh) };
})();
