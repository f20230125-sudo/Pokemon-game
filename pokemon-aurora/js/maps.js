'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  The Lumira region.  Maps are ASCII grids + buildings, NPCs, warps, etc.
//  Outdoor legend:  . grass  , grass alt  : path  ; sand  " tall grass  f flowers
//   ~ water  = bridge  w dock  T tree  P pine  k dead tree  b bush  r rock  # cliff
//   v ledge  F fence  s sign  l lamp  * snow  ^ snowy grass  a ash  L lava
//   c cave floor  C cave wall  o boulder  x crystal  X crystal pillar  V sky
//  Indoor legend: _ wood  - tile  z gym  u metal  W wall  O window  n counter
//   B shelf  t table  d bed  p plant  R rug  M exit mat  Q PC  $ healer  K stove
//   Y TV  S stairs  G statue  h hedge  q machine  J crystal pillar  ~ water  L lava
// ─────────────────────────────────────────────────────────────────────────────
const MAPS = {};
function defMap(id, m) {
  m.id = id;
  m.grid = m.grid.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  m.h = m.grid.length; m.w = m.grid[0].length;
  m.ts = m.ts || 'out';
  m.npcs = m.npcs || []; m.warps = m.warps || []; m.signs = m.signs || []; m.items = m.items || []; m.triggers = m.triggers || []; m.buildings = m.buildings || [];
  m.conn = m.conn || {};
  MAPS[id] = m;
  return m;
}
const T_ = (cls, name, art, party, o = {}) => Object.assign({ cls, name, art, party }, o);

// ═════════════════════════════ DAWNMERE ═════════════════════════════════════
defMap('house', {
  name: 'Your House', ts: 'in', floor: '_', music: 'dawnmere', wallColor: '#f4e2c4', region: 'dawnmere',
  grid: `
WWWWWWWWWW
WOWWBBWWOW
d_____Y_KK
d_________
___RRR_t__
p__RRR_t__
__________
____M_____`,
  warps: [{ x: 4, y: 7, to: 'dawnmere', tx: 5, ty: 6, dir: 'down' }],
  npcs: [{ id: 'mom', x: 8, y: 3, look: 'mom', dir: 'left', g: 'f', script: 'momTalk' }],
});
defMap('dawnmere', {
  name: 'Dawnmere Town', music: 'dawnmere', region: 'dawnmere', env: 'water', weather: 'petals', heal: { map: 'house', x: 3, y: 3 },
  grid: `
TTTTTTTTTTT::TTTTTTTTTTT
T.,........::..........T
T..........::..........T
T..........::..........T
T.f........::..........T
T.f........::..........T
T....::::::::::::::....T
T.....s....::..f.....,.T
T..........::..........T
T.ff.......::......b...T
T..........::..........T
T..........::..........T
T..........::....s.....T
T...::::::::::::::::...T
T;;;;;;;;;;ww;;;;fff;;;T
T;;;;;;;;;;ww;;;;;;;;;;T
T~~~~~~~~~~ww~~~~~~~~~~T
T~~~~~~~~~~ww~~~~~~~~~~T
T~~~~~~~~~~ww~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~T`,
  buildings: [
    { t: 'house', x: 3, y: 3, w: 4, h: 3, roof: '#d8584a', door: 2, to: { map: 'house', tx: 4, ty: 6 } },
    { t: 'lab', x: 13, y: 2, w: 6, h: 4, door: 2, to: { map: 'lab', tx: 5, ty: 8 } },
    { t: 'house', x: 3, y: 10, w: 4, h: 3, roof: '#4a7ac8', door: 1, to: { map: 'house_dawn', tx: 3, ty: 6 } },
  ],
  signs: [{ x: 6, y: 7, text: 'DAWNMERE TOWN\nWhere the first light touches Lumira.' }, { x: 17, y: 12, text: 'DAWNMERE PIER\nThe southernmost point of the Lumira region.' }],
  faded: [{ x: 15, y: 13, w: 7, h: 3, until: 'ending' }],
  npcs: [
    { id: 'fisher', x: 13, y: 15, look: 'fisher', dir: 'right', g: 'm', text: ['These flowers were bright red yesterday. Now look at ’em.', 'Like somebody washed the color right out.'], alt: { flag: 'ending', text: ['The flowers are red again! Brighter than I’ve ever seen ’em.'] } },
    { id: 'girlkid', x: 8, y: 9, look: 'girlkid', dir: 'down', move: 'wander', g: 'f', text: ['My Pidgey’s feathers went all grey, and now it won’t play with me.', 'Mom says it’s just tired. I don’t think so.'], alt: { flag: 'moss_restored', text: ['Pidgey started singing again this morning! I think you did something, didn’t you?'] } },
    { id: 'pidgey', x: 9, y: 10, poke: 'pidgey', dir: 'down', text: ['Pidgey: ...pip.'], faded: 'moss_restored', cry: 'pidgey' },
    { id: 'oldman', x: 20, y: 8, look: 'oldman', dir: 'left', g: 'm', text: ['When I was a boy, the Veil lit up the whole night sky over Dawnmere.', 'These days it’s thinner. Fainter. Like a song you can’t quite remember.'] },
    { id: 'blocker', x: 10, y: 1, look: 'kid', dir: 'down', g: 'm', cond: '!starter', script: 'blocker' },
  ],
  triggers: [{ x: 11, y: 2, w: 2, h: 1, id: 'blk', cond: '!starter', script: 'blockerTrig' }],
  conn: { north: { map: 'route1', off: -2 } },
});
defMap('house_dawn', {
  name: 'Dawnmere Town', ts: 'in', floor: '_', music: 'dawnmere', wallColor: '#e4ecf4', region: 'dawnmere',
  grid: `
WWWWWWWWWW
WOWBBWOWWW
__________
_tt____p__
_tt_______
______RR__
______RR__
___M______`,
  warps: [{ x: 3, y: 7, to: '@back' }],
  npcs: [
    { id: 'woman', x: 3, y: 5, look: 'woman', dir: 'right', g: 'f', text: ['Professor Linden used to work with another scientist, you know. A brilliant young man.', 'He left years ago. The Professor doesn’t talk about him.'] },
    { id: 'man', x: 7, y: 3, look: 'man', dir: 'left', g: 'm', text: ['Pokémon are stronger when they battle alongside people they trust.', 'Funny how that works for people, too.'] },
  ],
});
defMap('lab', {
  name: 'Linden’s Aurora Lab', ts: 'in', floor: '-', music: 'dawnmere', wallColor: '#e8f0f8', region: 'dawnmere',
  grid: `
WWWWWWWWWWWW
WBBOWWWWOBBW
------------
-QQ----nnnn-
------------
---ttt------
------------
p----------p
------------
-----MM-----`,
  warps: [{ x: 5, y: 9, to: 'dawnmere', tx: 15, ty: 6, dir: 'down' }, { x: 6, y: 9, to: 'dawnmere', tx: 15, ty: 6, dir: 'down' }],
  npcs: [
    { id: 'linden', x: 4, y: 4, look: 'prof', dir: 'down', g: 'm', script: 'lindenTalk' },
    { id: 'sable', x: 8, y: 6, look: 'sable', dir: 'left', g: 'f', cond: '!sable_left_lab', script: 'sableLab' },
    { id: 'aide', x: 9, y: 2, look: 'scientist', dir: 'down', g: 'm', text: ['The Professor stays up every night charting the Veil.', 'Lately his charts just say “fainter” over and over.'] },
    { id: 'ball0', x: 3, y: 5, ball: 1, cond: '!starter_bulbasaur_taken', script: 'starterBall', data: 'bulbasaur' },
    { id: 'ball1', x: 4, y: 5, ball: 1, cond: '!starter_charmander_taken', script: 'starterBall', data: 'charmander' },
    { id: 'ball2', x: 5, y: 5, ball: 1, cond: '!starter_squirtle_taken', script: 'starterBall', data: 'squirtle' },
    { id: 'sable_post', x: 8, y: 6, look: 'sable', dir: 'left', g: 'f', cond: 'postgame', script: 'sableRematch' },
  ],
  signs: [{ x: 1, y: 3, text: 'A screen full of shimmering aurora charts. The newest ones are pale grey.' }, { x: 2, y: 3, text: 'The PC is humming. A folder is open: “HUE — A. Vane & E. Linden”.' }],
});

// ═════════════════════════════ ROUTE 1 ══════════════════════════════════════
const ROUTE1_DAY = [['pidgey', 2, 4, 40], ['sentret', 2, 4, 40], ['caterpie', 2, 3, 20]];
const ROUTE1_NIGHT = [['hoothoot', 2, 4, 45], ['sentret', 2, 4, 35], ['caterpie', 2, 3, 20]];
defMap('route1', {
  name: 'Route 1', music: 'route', region: 'route1', env: 'grass', weather: 'leaves',
  grid: `
TTTTTTTTT::TTTTTTTTT
TT.......::.....TTTT
T""".....::........T
T""".....::....,...T
T"""....,::........T
T.....r..::...""""."
T..b.....::...""""..
Tvvvvvvv.::...""""..
T........::........T
T..."""".::........T
T..."""".::::::....T
T...""""......::...T
T.............::TTTT
TTTTT.........::...T
T.......::::::::...T
T..f....::.....s...T
T..f..""::"""".....T
T.....""::""""..b..T
T.....""::"""".....T
T.......::.........T
T..vvvvv::vvvvvvvvvT
T.......::.........T
T..TTT..::.......b.T
T..TTT..::.........T
T"""""..::.......r.T
T"""""..::.........T
T"""""..:::::..f...T
T...........::.....T
T...b.......::.....T
T...........::.....T
T.......:::::::....T
T....s..::.........T
T.......::.........T
T.......:::........T
T........::........T
TTTTTTTTT::TTTTTTTTT`,
  signs: [{ x: 15, y: 15, text: 'ROUTE 1\nNorth: Mossgrove Town   South: Dawnmere Town' }, { x: 5, y: 31, text: 'TRAINER TIPS\nTall grass hides wild Pokémon. Weaken one before throwing a Poké Ball!' }],
  items: [{ x: 1, y: 2, item: 'potion', id: 'r1_potion' }, { x: 17, y: 24, item: 'pokeball', n: 2, id: 'r1_balls' }, { x: 3, y: 16, item: 'antidote', id: 'r1_antidote' }],
  npcs: [
    { id: 'tim', x: 6, y: 9, look: 'youngster', dir: 'right', g: 'm', trainer: T_('youngster', 'Tim', 'youngster', [['sentret', 4], ['pidgey', 4]], { sight: 4, intro: 'My Sentret is in the top percentage of Sentret! Let me show you!', lose: 'Whoa... your Pokémon is on another level.', after: 'I’m gonna keep training. Top percentage, here we come!' }) },
    { id: 'rosa', x: 14, y: 19, look: 'lass', dir: 'left', g: 'f', trainer: T_('lass', 'Rosa', 'lass', [['caterpie', 4], ['pidgey', 5]], { sight: 5, intro: 'Ooh, a new Trainer! Let’s have a friendly battle!', lose: 'You’re really good! Did you just start?', after: 'Mossgrove’s Elder Tree used to glow pink every spring. I hope it’s okay...' }) },
    { id: 'r1man', x: 12, y: 29, look: 'man', dir: 'down', move: 'wander', g: 'm', text: ['If your Pokémon are hurt, head back to town and rest up.', 'Your mom’s cooking works wonders too, I bet.'] },
  ],
  encounters: { grass: { day: ROUTE1_DAY, night: ROUTE1_NIGHT }, rate: 0.12 },
  conn: { south: { map: 'dawnmere', off: 2 }, north: { map: 'mossgrove', off: 4 } },
});

// ═════════════════════════════ MOSSGROVE ════════════════════════════════════
defMap('mossgrove', {
  name: 'Mossgrove Town', music: 'dawnmere', musicFn: 'mossMusic', region: 'mossgrove', env: 'grass', weather: 'petals', heal: { map: 'center_moss', x: 5, y: 6 },
  grid: `
TTTTTTTTTTTTTTTTTTTTTTTTTT
T..........ffff..........T
T........f......f........T
T.......f........f.......T
T.......f........f.......T
T........f......f........T
T...:.....ff..ff.....:...T
T...:::::::::::::::::::..T
T.......,....::..........T
T............:::::::::::::
T............:::::::::::::
T..b.........::.......,..T
T...,........::..........T
T............::..........T
T..f.........::..........T
T...:::::::::::..........T
T.....f......::..........T
T............:::::::.....T
T..""""......::......""""T
T..""""......::......""""T
TT...........::.........TT
TTTTTTTTTTTTT::TTTTTTTTTTT`,
  buildings: [
    { t: 'center', x: 2, y: 2, w: 5, h: 4, door: 2, to: { map: 'center_moss', tx: 5, ty: 7 } },
    { t: 'mart', x: 20, y: 2, w: 4, h: 4, door: 1, to: { map: 'mart_moss', tx: 4, ty: 6 } },
    { t: 'eldertree', x: 11, y: 2, w: 4, h: 4, bloom: () => G.flags.moss_restored },
    { t: 'gym', x: 17, y: 12, w: 6, h: 5, color: '#4aa858', door: 2, to: { map: 'gym1', tx: 5, ty: 14 }, lockedFlag: 'moss_restored', locked: 'The Gym’s doors are locked.\n“Gone to the Elder Tree. —Bramble”' },
    { t: 'house', x: 3, y: 12, w: 4, h: 3, roof: '#7a5ab8', door: 1, to: { map: 'house_moss', tx: 3, ty: 6 } },
  ],
  signs: [{ x: 10, y: 8, text: 'MOSSGROVE TOWN\nGreen grows where hearts are kind.' }],
  faded: [{ x: 0, y: 0, w: 26, h: 22, until: 'moss_restored', cx: 13, cy: 5 }],
  npcs: [
    { id: 'grunt1', x: 12, y: 6, look: 'grunt', dir: 'down', g: 'm', cond: '!moss_restored', script: 'mossGrunts' },
    { id: 'grunt2', x: 13, y: 6, look: 'gruntf', dir: 'down', g: 'f', cond: '!moss_restored', script: 'mossGrunts' },
    { id: 'rod', x: 14, y: 6, obj: 'rod', cond: '!moss_restored', text: ['A humming grey pylon is driven into the Elder Tree’s roots.', 'It’s drinking in something you can’t see.'] },
    { id: 'bramble', x: 10, y: 7, look: 'bramble', dir: 'right', g: 'f', cond: '!moss_bramble_gym', script: 'brambleTree' },
    { id: 'mwoman', x: 6, y: 9, look: 'woman', dir: 'down', move: 'wander', g: 'f', text: ['The Elder Tree started losing its color two days ago.', 'Now the whole town looks like an old photograph.'], alt: { flag: 'moss_restored', text: ['Look at the tree! I haven’t seen blossoms like that in twenty years!'] } },
    { id: 'mkid', x: 20, y: 10, look: 'kid', dir: 'left', g: 'm', text: ['Those grey-coat people keep saying “for the Director.”', 'Who’s the Director? Sounds like a boring movie.'] },
    { id: 'mold', x: 7, y: 16, look: 'oldwoman', dir: 'right', g: 'f', text: ['Bramble has tended that tree since she was a girl.', 'When it went grey, I think a little of her went grey too.'], alt: { flag: 'moss_restored', text: ['Bramble is smiling again. That’s the real miracle, dear.'] } },
    { id: 'gymguide', x: 21, y: 17, look: 'man', dir: 'left', g: 'm', text: ['The Mossgrove Gym uses Grass-type Pokémon.', 'Fire and Flying moves will serve you well in there!'] },
    { id: 'ranger', x: 24, y: 8, look: 'camper', dir: 'down', g: 'm', cond: '!badge_green', text: ['Glimmerwood’s gotten dangerous since the grey-coats showed up.', 'Only Trainers with a Prism Badge can pass. Bramble’s orders!'] },
  ],
  triggers: [{ x: 24, y: 9, w: 1, h: 2, id: 'mossE', cond: '!badge_green', script: 'mossEastBlock' }],
  encounters: { grass: { day: [['pidgey', 5, 7, 35], ['oddish', 5, 7, 35], ['sentret', 5, 7, 30]], night: [['hoothoot', 5, 7, 40], ['oddish', 5, 7, 40], ['sentret', 5, 7, 20]] }, rate: 0.12 },
  conn: { south: { map: 'route1', off: -4 }, east: { map: 'glimmerwood', off: 0 } },
});
defMap('house_moss', {
  name: 'Mossgrove Town', ts: 'in', floor: '_', music: 'dawnmere', wallColor: '#e8f4e0', region: 'mossgrove',
  grid: `
WWWWWWWWWW
WOWBBWOWWW
__________
_tt____p__
_tt_______
______RR__
______RR__
___M______`,
  warps: [{ x: 3, y: 7, to: '@back' }],
  npcs: [
    { id: 'gardener', x: 6, y: 4, look: 'gardener', dir: 'left', g: 'm', script: 'mossRepel' },
  ],
});
function mkCenter(id, region, backLabel) {
  defMap(id, {
    name: 'Pokémon Center', ts: 'in', floor: '-', music: 'center', wallColor: '#f8e8e8', region,
    grid: `
WWWWWWWWWWWW
WOWWWWWWWWOW
-p-$------p-
--nnnnnnn-Q-
------------
p----------p
----RRRR----
----RRRR----
-----MM-----`,
    warps: [{ x: 5, y: 8, to: '@back' }, { x: 6, y: 8, to: '@back' }],
    npcs: [
      { id: 'nurse', x: 5, y: 2, look: 'nurse', dir: 'down', g: 'f', script: 'nurse' },
      { id: 'pc', x: 10, y: 3, obj: 'pc', script: 'pc' },
    ].concat(CENTER_NPCS[id] || []),
    heal: true,
  });
  void backLabel;
}
function mkMart(id, region, stock) {
  defMap(id, {
    name: 'Poké Mart', ts: 'in', floor: '-', music: 'center', wallColor: '#e8eef8', region,
    grid: `
WWWWWWWWWW
WOWBBBBWOW
----------
nnn-------
----------
--BB--BB--
----------
----MM----`,
    warps: [{ x: 4, y: 7, to: '@back' }, { x: 5, y: 7, to: '@back' }],
    npcs: [{ id: 'clerk', x: 1, y: 2, look: 'clerk', dir: 'down', g: 'm', script: 'shop', data: stock }].concat(MART_NPCS[id] || []),
  });
}
const CENTER_NPCS = {
  center_moss: [{ id: 'cm1', x: 2, y: 5, look: 'kid', dir: 'right', g: 'm', text: ['The nurse here says Pokémon from the grey places come in tired. Not hurt. Just... tired.'] }],
  center_brine: [{ id: 'cb1', x: 9, y: 6, look: 'sailor', dir: 'left', g: 'm', text: ['The lighthouse went dark three nights ago. Ships have been turning back ever since.'] }],
  center_cinder: [{ id: 'cc1', x: 2, y: 6, look: 'firebreather', dir: 'right', g: 'm', text: ['Even the lava looks grey lately. Lava! Grey! It’s unnatural!'] }],
};
const MART_NPCS = {
  mart_moss: [{ id: 'mm1', x: 7, y: 4, look: 'lass', dir: 'left', g: 'f', text: ['Poké Balls work better when a Pokémon is weak or asleep!'] }],
};
mkCenter('center_moss', 'mossgrove');
mkMart('mart_moss', 'mossgrove', ['pokeball', 'potion', 'antidote', 'parlyzheal', 'awakening', 'repel']);

defMap('gym1', {
  name: 'Mossgrove Gym', ts: 'in', floor: 'z', gymColor: '#58b060', music: 'gym', region: 'mossgrove', env: 'gym',
  grid: `
WWWWWWWWWWWW
WWWWWOOWWWWW
zzzzzzzzzzzz
hhhhhhhhhhzh
hhhhhzzzzzzh
hhhhhzhhzhhh
zzzzzzhhhhhh
zzhhhhhhhhhh
zhhhhhhhhhhh
zhhzhhhhhhhh
zzzzzzzzzzzz
hhhhhzzhhhhh
zzzzzzzzzzzz
zzGzzzzzzGzz
zzzzzzzzzzzz
zzzzzMMzzzzz`,
  warps: [{ x: 5, y: 15, to: 'mossgrove', tx: 19, ty: 17, dir: 'down' }, { x: 6, y: 15, to: 'mossgrove', tx: 19, ty: 17, dir: 'down' }],
  npcs: [
    { id: 'bramble', x: 6, y: 2, look: 'bramble', dir: 'down', g: 'f', script: 'brambleGym' },
    { id: 'g1t1', x: 3, y: 9, look: 'gardener', dir: 'down', g: 'm', trainer: T_('gardener', 'Liam', 'gardener', [['oddish', 9], ['caterpie', 9]], { sight: 1, intro: 'Bramble taught me everything! Well, almost everything.', lose: 'I got pruned...', after: 'Bramble’s Tangela is tough. Its vines soak up hits like a sponge.' }) },
    { id: 'g1t2', x: 1, y: 7, look: 'picnicker', dir: 'left', g: 'f', trainer: T_('picnicker', 'Fern', 'picnicker', [['sentret', 9], ['oddish', 10]], { sight: 1, intro: 'The hedges are my home turf!', lose: 'Wilted...', after: 'Grass is weak to Fire, Flying, Bug, Poison and Ice. Write that down!' }) },
    { id: 'g1t3', x: 8, y: 5, look: 'lass', dir: 'up', g: 'f', trainer: T_('lass', 'Poppy', 'lass', [['pidgey', 10], ['oddish', 11]], { sight: 1, intro: 'Boo! Did I scare you? I’ve been hiding in the hedge all day!', lose: 'Hmph. You didn’t even flinch.', after: 'Bramble says the Verdant Prism glows brighter the more you care for your Pokémon.' }) },
    { id: 'g1guide', x: 8, y: 14, look: 'man', dir: 'left', g: 'm', text: ['Yo, champ-in-the-making! Bramble’s Grass-types are gentle but stubborn.', 'Burn ’em, peck ’em, or just outlast ’em!'] },
  ],
  signs: [{ x: 2, y: 13, text: 'MOSSGROVE GYM\nLeader: Bramble\n“The Evergreen Gardener”' }, { x: 9, y: 13, text: 'MOSSGROVE GYM\nVerdant Prism winners: Sable' }],
});

// ═════════════════════════════ GLIMMERWOOD (Route 2) ═════════════════════════
defMap('glimmerwood', {
  name: 'Glimmerwood', music: 'forest', region: 'glimmerwood', env: 'forest', weather: 'fireflies', dim: 0.18, shafts: 1,
  grid: `
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTT"""".TTTTTTT""""TTTTTTT.....TTT
TT""""""..TTTT"""""".TTTT..""""..T
TT"""TT"...""""""TT"".TTT..""""..T
TT"""TT"...""""""TT"".....:::::..T
TT........TTT..........TT.:TTTT..T
TTT..TTT..TTTT..:::::::::::TTTT..T
TTT..TTT..TTTT..:TTTTTTTTTTTTTT..T
::::::::::::::::::TTTTTTT"""...:::
::::::::::::::::::TTTTTTT"""...:::
TTTTT..TT....TTT::TTTTTTT"""...TTT
TTTTT..TT....TTT::.......:::::::TT
TT"""""TT..""TTT::::::::::TTT..TTT
TT"""""....""TTTTTTTTTTT..TTT""TTT
TT.....TTTT....."""""""""""".."TTT
TTT..""""""""..""""""""""""..""TTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`,
  items: [{ x: 3, y: 2, item: 'tm04', id: 'gw_tm04' }, { x: 30, y: 3, item: 'superpotion', id: 'gw_super' }, { x: 3, y: 15, item: 'pokeball', n: 3, id: 'gw_balls' }, { x: 29, y: 14, item: 'thunderstone', id: 'gw_stone' }],
  npcs: [
    { id: 'bug1', x: 9, y: 5, look: 'bugcatcher', dir: 'down', g: 'm', trainer: T_('bugcatcher', 'Wade', 'bugcatcher', [['caterpie', 9], ['metapod', 9], ['butterfree', 11]], { sight: 4, intro: 'The forest glows at night because of Butterfree! Probably!', lose: 'My bugs got squashed!', after: 'Did you know Pikachu live here? They’re super shy though.' }) },
    { id: 'camp1', x: 21, y: 12, look: 'camper', dir: 'left', g: 'm', trainer: T_('camper', 'Hugo', 'camper', [['sentret', 11], ['furret', 12]], { sight: 4, intro: 'Halt! This path is guarded by the Glimmerwood Scouts!', lose: 'The Scouts... have been defeated...', after: 'Brinecrest is just east of here. Smell that sea air?' }) },
    { id: 'bug2', x: 14, y: 15, look: 'bugcatcher', dir: 'down', g: 'm', trainer: T_('bugcatcher', 'Nico', 'bugcatcher', [['oddish', 11], ['butterfree', 11]], { sight: 3, intro: 'Hey! You stepped on my net!', lose: 'Aww, I lost...', after: 'I’m looking for a Pikachu with a lightning-bolt tail. So... any Pikachu.' }) },
    { id: 'gwlady', x: 26, y: 9, look: 'beauty', dir: 'down', g: 'f', text: ['Light filters down between the leaves like threads of gold...', 'I come here to remember that the world is beautiful.'] },
    { id: 'sable_gw', x: 31, y: 10, look: 'sable', dir: 'left', g: 'f', cond: 'sable_gw_ready', script: 'sableForest' },
  ],
  triggers: [{ x: 30, y: 9, w: 1, h: 2, id: 'gwSable', cond: '!sable_gw_done', script: 'sableForestTrigger' }],
  encounters: { grass: { day: [['caterpie', 7, 9, 22], ['metapod', 7, 9, 10], ['oddish', 7, 10, 20], ['pidgey', 8, 10, 20], ['pikachu', 8, 10, 8], ['mareep', 8, 10, 15], ['eevee', 9, 9, 5]], night: [['hoothoot', 8, 10, 30], ['oddish', 8, 10, 25], ['gastly', 8, 10, 15], ['pikachu', 8, 10, 10], ['mareep', 8, 10, 15], ['caterpie', 7, 9, 5]] }, rate: 0.13 },
  conn: { west: { map: 'mossgrove', off: 0 }, east: { map: 'brinecrest', off: 1 } },
});

// ═════════════════════════════ BRINECREST ═══════════════════════════════════
defMap('brinecrest', {
  name: 'Brinecrest Harbor', music: 'harbor', region: 'brinecrest', env: 'water', weather: 'spray', heal: { map: 'center_brine', x: 5, y: 6 },
  grid: `
TTTTTTTTTTTTTT::TTTTTTTTTTTTTT
T............::..............T
T............::..............T
T............::..............T
T............::..............T
T............::..............T
T....::::::::::::::::::::....T
T....:..........:.......:....T
T....:..........:.......:....T
T....:..........:.......:....T
:::::::.........:.......:....T
:::::::.........:.......:....T
T....::::::::::::::::::::::..T
T;;;;;;;;;;;;;;;;;;;;;;;;;:;;T
T;;;;;;;;;;;;;;;;;;;;;;;;;:;;T
T;;;;wwwwww;;;;;;;;;;;;;;;w;;T
T~~~~wwwwww~~~~~~~~~~~~~~~w~~T
T~~~~~~~ww~~~~~~~~~~~~~~~~w~~T
T~~~~~~~ww~~~~~~~~~~~~~~wwwww~
T~~~~~~~ww~~~~~~~~~~~~~~wwwww~
T~~~~~~~~~~~~~~~~~~~~~~~wwwww~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  buildings: [
    { t: 'center', x: 1, y: 1, w: 5, h: 4, door: 2, to: { map: 'center_brine', tx: 5, ty: 7 } },
    { t: 'mart', x: 7, y: 2, w: 4, h: 3, door: 1, to: { map: 'mart_brine', tx: 4, ty: 6 } },
    { t: 'gym', x: 18, y: 1, w: 6, h: 5, color: '#3a80d8', door: 2, to: { map: 'gym2', tx: 6, ty: 14 }, lockedFlag: 'light_restored', locked: 'The Gym’s doors are locked.\n“Out at sea. Back when the light is. —Capt. Maris”' },
    { t: 'house', x: 7, y: 7, w: 4, h: 3, roof: '#3a8a9a', door: 2, to: { map: 'house_brine', tx: 3, ty: 6 } },
    { t: 'house', x: 18, y: 8, w: 4, h: 3, roof: '#c86a48', door: 1, to: { map: 'house_brine2', tx: 3, ty: 6 } },
    { t: 'lighthouse', x: 25, y: 13, w: 3, h: 5, door: 1, to: { map: 'lighthouse', tx: 4, ty: 8 }, lit: () => G.flags.light_restored },
    { t: 'boat', x: 12, y: 15, w: 6, h: 3 },
  ],
  signs: [{ x: 14, y: 7, text: 'BRINECREST HARBOR\nWhere every sailor finds the way home.' }],
  faded: [{ x: 15, y: 13, w: 15, h: 9, until: 'light_restored', cx: 26, cy: 14 }],
  npcs: [
    { id: 'karpman', x: 5, y: 12, look: 'sailor', dir: 'down', g: 'm', script: 'magikarpSale' },
    { id: 'bsailor', x: 22, y: 12, look: 'sailor', dir: 'down', g: 'm', text: ['Without the lighthouse, the fishing fleet can’t come home after dark.', 'Old Beacon kept that light burning for a hundred years.'], alt: { flag: 'light_restored', text: ['The light’s back! Beacon’s shining brighter than ever!'] } },
    { id: 'bkid', x: 10, y: 11, look: 'girlkid', dir: 'down', move: 'wander', g: 'f', text: ['I found a Staryu on the beach last summer! Its gem blinked at me!'] },
    { id: 'bfisher', x: 7, y: 16, look: 'fisher', dir: 'up', g: 'm', trainer: T_('fisher', 'Owen', 'fisher', [['magikarp', 12], ['magikarp', 14], ['gyarados', 15]], { sight: 3, intro: 'You scared the fish away! Now you owe me a battle!', lose: 'I’ll catch a bigger one next time...', after: 'Magikarp are weak, sure. But you should see what they turn into.' }) },
    { id: 'slate_dock', x: 11, y: 13, look: 'slate', dir: 'right', g: 'm', cond: 'brine_scene', script: 'none' },
    { id: 'sable_dock', x: 12, y: 13, look: 'sable', dir: 'left', g: 'f', cond: 'brine_scene', script: 'none' },
    { id: 'lhgrunt', x: 26, y: 18, look: 'grunt', dir: 'up', g: 'm', cond: '!light_restored&!lh_guard_moved', script: 'lhGuard' },
  ],
  triggers: [{ x: 6, y: 10, w: 1, h: 2, id: 'brineScene', cond: '!brine_scene_done', script: 'brineDocks' }],
  conn: { west: { map: 'glimmerwood', off: -1 }, north: { map: 'route3', off: -3 } },
});
defMap('house_brine', {
  name: 'Brinecrest Harbor', ts: 'in', floor: '_', music: 'harbor', wallColor: '#dceef0', region: 'brinecrest',
  grid: `
WWWWWWWWWW
WOWBBWOWWW
__________
_tt____p__
_tt_______
______RR__
______RR__
___M______`,
  warps: [{ x: 3, y: 7, to: '@back' }],
  npcs: [{ id: 'bh1', x: 7, y: 4, look: 'oldwoman', dir: 'left', g: 'f', script: 'brineGift' }],
});
defMap('house_brine2', {
  name: 'Brinecrest Harbor', ts: 'in', floor: '_', music: 'harbor', wallColor: '#f4e8dc', region: 'brinecrest',
  grid: `
WWWWWWWWWW
WOWBBWOWWW
__________
_tt____p__
_tt_______
______RR__
______RR__
___M______`,
  warps: [{ x: 3, y: 7, to: '@back' }],
  npcs: [{ id: 'bh2', x: 2, y: 5, look: 'man', dir: 'right', g: 'm', text: ['A man in a grey coat came through last week asking about the Prism Spire.', 'He had eyes like a winter sky. Cold, but... sad, somehow.'] }],
});
mkCenter('center_brine', 'brinecrest');
mkMart('mart_brine', 'brinecrest', ['pokeball', 'greatball', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'repel']);
defMap('lighthouse', {
  name: 'Brinecrest Lighthouse', ts: 'in', floor: '_', music: 'ashen', musicFn: 'lhMusic', wallColor: '#e0d8d0', region: 'brinecrest', env: 'gym',
  grid: `
WWWWWWWWW
WOWWSWWOW
_________
_p_____p_
_________
___RRR___
___RRR___
_________
____M____`,
  warps: [{ x: 4, y: 8, to: 'brinecrest', tx: 26, ty: 18, dir: 'down' }, { x: 4, y: 1, to: 'lighthouse_top', tx: 4, ty: 7, dir: 'up' }],
  npcs: [
    { id: 'lhg1', x: 2, y: 4, look: 'grunt', dir: 'right', g: 'm', cond: '!light_restored', trainer: T_('grunt', 'Grunt', 'grunt', [['zubat', 14], ['koffing', 15]], { sight: 3, title: 'Ashen Grunt', intro: 'The Admin is busy upstairs. Nobody goes up!', lose: 'Tch! Slate won’t be happy...', after: 'The hue from that old Ampharos is worth more than this whole town.' }) },
    { id: 'lhg2', x: 6, y: 2, look: 'gruntf', dir: 'down', g: 'f', cond: '!light_restored', trainer: T_('gruntf', 'Grunt', 'gruntf', [['houndour', 15], ['murkrow', 14]], { sight: 3, title: 'Ashen Grunt', intro: 'You’re the kid from Mossgrove! You’ve got some nerve!', lose: 'Ugh! Fine, go get yourself in trouble!', after: 'Admin Slate has a way with words. You’ll see.' }) },
    { id: 'keeper', x: 7, y: 6, look: 'keeper', dir: 'left', g: 'm', script: 'keeper' },
  ],
});
defMap('lighthouse_top', {
  name: 'Lighthouse Lamp Room', ts: 'in', floor: '_', music: 'ashen', musicFn: 'lhMusic', wallColor: '#d8d0e0', region: 'brinecrest', env: 'gym',
  grid: `
WWWWWWWWW
WOOOOOOOW
_________
_________
_________
_________
_________
____S____`,
  warps: [{ x: 4, y: 7, to: 'lighthouse', tx: 4, ty: 2, dir: 'down' }],
  npcs: [
    { id: 'beacon', x: 4, y: 2, poke: 'ampharos', dir: 'down', cry: 'ampharos', faded: 'light_restored', text: ['Beacon: ...amph...'], script: 'beaconTalk' },
    { id: 'slate', x: 4, y: 4, look: 'slate', dir: 'up', g: 'm', cond: '!light_restored', script: 'slateLighthouse' },
    { id: 'lhrod', x: 5, y: 2, obj: 'rod', cond: '!light_restored' },
  ],
});
defMap('gym2', {
  name: 'Brinecrest Gym', ts: 'in', floor: 'z', gymColor: '#3a88e0', music: 'gym', region: 'brinecrest', env: 'gym',
  grid: `
WWWWWWWWWWWWWW
WWWWWOOOOWWWWW
zzzzzzzzzzzzzz
~~~z~~~~~~z~~~
~~~z~~~~~~z~~~
zzzz~~zz~~zzzz
z~~~~~~~~~~~~z
zzz~~~~~~~~zzz
z~~~~~~~~~~~~z
zzzzzzzzzzzzzz
~~~~~~zz~~~~~~
~~~~~~zz~~~~~~
zzGzzzzzzzzGzz
zzzzzzzzzzzzzz
zzzzzzMMzzzzzz`,
  warps: [{ x: 6, y: 14, to: 'brinecrest', tx: 20, ty: 6, dir: 'down' }, { x: 7, y: 14, to: 'brinecrest', tx: 20, ty: 6, dir: 'down' }],
  npcs: [
    { id: 'maris', x: 6, y: 2, look: 'maris', dir: 'down', g: 'f', script: 'marisGym' },
    { id: 'g2t1', x: 6, y: 10, look: 'swimmer', dir: 'down', g: 'm', trainer: T_('swimmer', 'Kai', 'swimmer', [['staryu', 17], ['magikarp', 16]], { sight: 2, intro: 'Splash! Welcome aboard!', lose: 'Wiped out!', after: 'The Captain’s Gyarados could sink a battleship. Electric or Rock moves are your friend.' }) },
    { id: 'g2t2', x: 2, y: 7, look: 'sailor', dir: 'left', g: 'm', trainer: T_('sailor', 'Dunn', 'sailor', [['staryu', 17], ['gyarados', 16]], { sight: 2, intro: 'Ahoy! Show me your sea legs!', lose: 'Keelhauled!', after: 'Captain Maris sailed through three storms looking for that light.' }) },
    { id: 'g2t3', x: 11, y: 7, look: 'beauty', dir: 'right', g: 'f', trainer: T_('beauty', 'Nerissa', 'beauty', [['staryu', 18], ['butterfree', 17]], { sight: 2, intro: 'The Captain lets me tan on the deck if I guard this side!', lose: 'Ugh, my sunscreen...', after: 'Maris brought back a Starmie from the edge of the world. Or so she says.' }) },
    { id: 'g2guide', x: 11, y: 13, look: 'man', dir: 'left', g: 'm', text: ['Captain Maris uses Water-types! Grass and Electric moves will make waves.'] },
  ],
  signs: [{ x: 2, y: 12, text: 'BRINECREST GYM\nLeader: Maris\n“The Storm-Chasing Captain”' }, { x: 11, y: 12, text: 'BRINECREST GYM\nTidal Prism winners: Sable' }],
});

// ═════════════════════════════ ROUTE 3 ══════════════════════════════════════
defMap('route3', {
  name: 'Route 3', music: 'route', region: 'route3', env: 'grass', weather: 'spray',
  grid: `
##########ee########
##########..########
#..........:......##
#.""""....:::.""".##
#.""""....:.:.""".##
#.........:.:.....##
#...r.....:.:..r..##
#.........:.:.....##
#vvvvvv...:.:..vvv##
#.........:::......#
#..""".....:......;;
#..""".....:.....;;~
#..........:....;;~~
#....TT....:....;~~~
#....TT....:....;~~~
#..........::...;~~~
#"""".......:...;~~~
#"""".......:...;~~~
#...........:...;;~~
#vvvvvvvvv..:.vvv;;~
#...........:.....;;
#.."""".....:......#
#..""""....:::.....#
#......r...:.:.....#
#..........:.:.""".#
#..TT......:.:.""".#
#..TT......:::.....#
#...........:......#
#.""".......:...b..#
#.""".......:......#
#...........:......#
#..s........:......#
###########::#######`,
  signs: [{ x: 3, y: 31, text: 'ROUTE 3\nNorth: Emberpeak Tunnel   South: Brinecrest Harbor' }],
  items: [{ x: 1, y: 3, item: 'greatball', n: 2, id: 'r3_great' }, { x: 17, y: 2, item: 'revive', id: 'r3_revive' }, { x: 3, y: 25, item: 'superpotion', id: 'r3_super' }],
  npcs: [
    { id: 'snorlax', x: 10, y: 9, poke: 'snorlax', size: 2, cond: '!snorlax_done', script: 'snorlax', dir: 'down' },
    { id: 'r3hiker', x: 6, y: 22, look: 'hiker', dir: 'right', g: 'm', trainer: T_('hiker', 'Bram', 'hiker', [['geodude', 17], ['geodude', 18], ['onix', 18]], { sight: 4, intro: 'Mountains don’t move, and neither do I!', lose: 'Rockslide of shame...', after: 'A Snorlax has been napping on the path north for days. Nothing wakes it!' }) },
    { id: 'r3bird', x: 15, y: 16, look: 'birdkeeper', dir: 'left', g: 'm', trainer: T_('birdkeeper', 'Toby', 'birdkeeper', [['pidgeotto', 18], ['hoothoot', 17]], { sight: 4, intro: 'My birds ride the sea wind! Can you keep up?', lose: 'Grounded!', after: 'The keeper at the lighthouse knows an old song that can wake anything.' }) },
    { id: 'r3beauty', x: 7, y: 5, look: 'beauty', dir: 'down', g: 'f', trainer: T_('beauty', 'Celine', 'beauty', [['flaaffy', 18], ['butterfree', 18]], { sight: 3, intro: 'The sea breeze is lovely. Almost as lovely as my Pokémon!', lose: 'Oh my, how rude!', after: 'Cinderfall is past the tunnel. Bring Burn Heals!' }) },
    { id: 'r3ace', x: 13, y: 26, look: 'acetrainer', dir: 'left', g: 'm', trainer: T_('acetrainer', 'Rhys', 'acetrainer', [['growlithe', 19], ['pikachu', 19], ['wartortle', 20]], { sight: 4, intro: 'Two badges? Let’s see if you’ve earned them.', lose: 'You’ve earned them. And then some.', after: 'Keep pushing. The Spire only opens for someone with all three lights.' }) },
  ],
  encounters: { grass: { day: [['mareep', 15, 18, 25], ['flaaffy', 16, 18, 8], ['pidgeotto', 16, 18, 15], ['growlithe', 15, 18, 15], ['ponyta', 15, 18, 15], ['furret', 16, 18, 12], ['pikachu', 15, 17, 5], ['eevee', 16, 16, 5]], night: [['noctowl', 16, 18, 20], ['mareep', 15, 18, 25], ['gastly', 15, 18, 20], ['growlithe', 15, 18, 15], ['ponyta', 15, 18, 15], ['eevee', 16, 16, 5]] }, rate: 0.12 },
  warps: [{ x: 10, y: 0, to: 'tunnel', tx: 13, ty: 22, dir: 'up' }, { x: 11, y: 0, to: 'tunnel', tx: 14, ty: 22, dir: 'up' }],
  conn: { south: { map: 'brinecrest', off: 3 } },
});

// ═════════════════════════════ EMBERPEAK TUNNEL ═════════════════════════════
defMap('tunnel', {
  name: 'Emberpeak Tunnel', music: 'cave', region: 'tunnel', env: 'cave', dark: 0.62, baseTile: 'c', border: 'C',
  grid: `
CCCCCCCCCCCCCCCCCCCCCCCCCCCC
CCCCCCCCCCCCCccCCCCCCCCCCCCC
CCccccccCCCCCccCCCCCCccccCCC
CCccoccccccccccccccccccocccC
CCcccccCCCCCCCCccCCCCcccccCC
CCCccCCCCCCCCCCccCCCCCCccCCC
CCCccCCccccccCCccCCccccccCCC
CCcccCCccoccccccccccccoccCCC
CCccccccccCCCCCCCCCCCcccccCC
CCCCCCccCCCCCCCCCCCCCCCccCCC
CCcccccccCCCccccccCCCccccCCC
CCcocCCccccccccocccccccCCCCC
CCcccCCccCCCCCCCCCCCcccCCCCC
CCCccCCccCCCCccccccCCcccccCC
CCCccccccCCCCccocccccccocCCC
CCCCCCCccCCCCccccCCCCCcccCCC
CCccccccccccccccCCCCCCcccCCC
CCccoCCCCCCCCccccccccccccCCC
CCcccCCCCCCCCccCCCCCCCCccCCC
CCCcccccccccccccccccccccccCC
CCCCCCCCCCCCCccCCCCCCCCCCCCC
CCCCCCCCCCCCCccCCCCCCCCCCCCC
CCCCCCCCCCCCCccCCCCCCCCCCCCC
CCCCCCCCCCCCCccCCCCCCCCCCCCC`,
  warps: [{ x: 13, y: 23, to: 'route3', tx: 10, ty: 1, dir: 'down' }, { x: 14, y: 23, to: 'route3', tx: 11, ty: 1, dir: 'down' }, { x: 13, y: 1, to: 'cinderfall', tx: 22, ty: 20, dir: 'up' }, { x: 14, y: 1, to: 'cinderfall', tx: 23, ty: 20, dir: 'up' }],
  items: [{ x: 3, y: 11, item: 'tm05', id: 'tn_tm05' }, { x: 24, y: 3, item: 'burnheal', n: 2, id: 'tn_burn' }, { x: 4, y: 17, item: 'fullheal', id: 'tn_full' }, { x: 9, y: 7, item: 'firestone', id: 'tn_firestone' }, { x: 23, y: 14, item: 'rarecandy', id: 'tn_candy' }],
  npcs: [
    { id: 'tg1', x: 14, y: 14, look: 'grunt', dir: 'left', g: 'm', trainer: T_('grunt', 'Grunt', 'grunt', [['zubat', 19], ['koffing', 20], ['houndour', 20]], { sight: 4, title: 'Ashen Grunt', intro: 'These hue crystals belong to Team Ashen! Beat it!', lose: 'My crystals...!', after: 'The Director says every grey stone brings us closer to peace.' }) },
    { id: 'tg2', x: 22, y: 10, look: 'gruntf', dir: 'down', g: 'f', trainer: T_('gruntf', 'Grunt', 'gruntf', [['murkrow', 20], ['magnemite', 21]], { sight: 4, title: 'Ashen Grunt', intro: 'Mining is hard work. Beating you will be a nice break.', lose: 'Break’s over, I guess...', after: 'Admin Gris runs the plant in Cinderfall. She’s scary smart.' }) },
    { id: 'thiker', x: 6, y: 16, look: 'hiker', dir: 'right', g: 'm', trainer: T_('hiker', 'Gordon', 'hiker', [['graveler', 20], ['onix', 21]], { sight: 4, intro: 'Tunnels are my second home! My first home is also a tunnel!', lose: 'Cave-in!', after: 'Watch out for grey-coats. They’ve been digging where they shouldn’t.' }) },
    { id: 'crystal1', x: 16, y: 7, obj: 'crystal', text: ['A grey crystal, humming faintly. It feels cold and... empty.'] },
    { id: 'crystal2', x: 7, y: 13, obj: 'crystal', text: ['A grey crystal. Something was drained into it.'] },
  ],
  encounters: { cave: { day: [['zubat', 18, 21, 35], ['geodude', 18, 21, 30], ['onix', 19, 21, 10], ['graveler', 20, 22, 10], ['golbat', 21, 22, 5], ['gastly', 18, 20, 10]], night: null }, rate: 0.09 },
});

// ═════════════════════════════ CINDERFALL ═══════════════════════════════════
defMap('cinderfall', {
  name: 'Cinderfall City', music: 'cinderfall', musicFn: 'cinderMusic', region: 'cinderfall', env: 'volcano', baseTile: 'a', weather: 'embers', heal: { map: 'center_cinder', x: 5, y: 6 },
  grid: `
##########::################
#a........::.............a.#
#a........::...............#
#.........::...............#
#.........::...............#
#.........::...............#
#..:::::::::::::::::::::::.#
#..:.......:..........:....#
#..:.......:..........:....#
#..:.......:..........:....#
#..:.......:..........:....#
#:::::::::::::::::::::::::.#
#.....LLL....::............#
#.....LLL....::.......a....#
#.a..........::............#
#......l.....::.....l......#
#............::............#
#.:::::::::::::::::::::::..#
#..........................#
#...........::.............#
#...........::.............#
######################ee####`,
  buildings: [
    { t: 'center', x: 2, y: 1, w: 5, h: 4, door: 2, to: { map: 'center_cinder', tx: 5, ty: 7 } },
    { t: 'mart', x: 12, y: 1, w: 4, h: 4, door: 1, to: { map: 'mart_cinder', tx: 4, ty: 6 } },
    { t: 'gym', x: 17, y: 1, w: 6, h: 5, color: '#e05030', door: 2, to: { map: 'gym3', tx: 5, ty: 14 }, lockedFlag: 'plant_down', locked: 'The Gym’s doors are locked.\n“Gone to melt down that plant. —Blaise”' },
    { t: 'forge', x: 4, y: 7, w: 5, h: 4, roof: '#6a4a3a', door: 2, chimney: 1, to: { map: 'forge', tx: 4, ty: 6 } },
    { t: 'forge', x: 13, y: 7, w: 4, h: 4, roof: '#5a3a3a', door: 1, chimney: 1, to: { map: 'house_cinder', tx: 3, ty: 6 } },
    { t: 'plant', x: 18, y: 12, w: 8, h: 4, door: 3, to: { map: 'plant', tx: 9, ty: 13 } },
  ],
  signs: [{ x: 11, y: 18, text: 'CINDERFALL CITY\nForged in fire, cooled by kindness.' }],
  faded: [{ x: 0, y: 0, w: 28, h: 22, until: 'plant_down', cx: 22, cy: 14 }],
  npcs: [
    { id: 'cf1', x: 8, y: 16, look: 'firebreather', dir: 'right', g: 'm', text: ['That factory showed up last month. Since then the whole city’s gone grey.', 'Even my flames look like smoke.'], alt: { flag: 'plant_down', text: ['My flames are orange again! ORANGE!'] } },
    { id: 'cf2', x: 16, y: 18, look: 'woman', dir: 'up', move: 'wander', g: 'f', text: ['Blaise makes the Prism Badges by hand in his forge.', 'He says each one holds a little of the Veil’s light.'] },
    { id: 'cfguard', x: 21, y: 16, look: 'grunt', dir: 'down', g: 'm', cond: '!plant_down', text: ['Hey! Nobody enters the Dimmer Plant without authorization!', '...Wait, the Director said to let YOU in? Weird. Go on, then.'] },
    { id: 'lindencf', x: 12, y: 13, look: 'prof', dir: 'down', g: 'm', cond: 'linden_cinder', script: 'lindenCinder' },
  ],
  warps: [{ x: 22, y: 21, to: 'tunnel', tx: 13, ty: 2, dir: 'down' }, { x: 23, y: 21, to: 'tunnel', tx: 14, ty: 2, dir: 'down' }],
  conn: { north: { map: 'frostveil', off: 1 } },
});
defMap('forge', {
  name: 'Blaise’s Forge', ts: 'in', floor: '_', music: 'cinderfall', wallColor: '#c8a088', region: 'cinderfall',
  grid: `
WWWWWWWWWW
WOWKKKKWOW
__________
_tt____tt_
__________
_p______p_
__________
____M_____`,
  warps: [{ x: 4, y: 7, to: '@back' }],
  npcs: [{ id: 'apprentice', x: 5, y: 3, look: 'kid', dir: 'down', g: 'm', text: ['I’m Blaise’s apprentice! These are prism blanks, see?', 'Clear as glass. They only take on color when a Trainer earns them.'] }],
});
defMap('house_cinder', {
  name: 'Cinderfall City', ts: 'in', floor: '_', music: 'cinderfall', wallColor: '#e8d8c8', region: 'cinderfall',
  grid: `
WWWWWWWWWW
WOWBBWOWWW
__________
_tt____p__
_tt_______
______RR__
______RR__
___M______`,
  warps: [{ x: 3, y: 7, to: '@back' }],
  npcs: [{ id: 'ch1', x: 6, y: 4, look: 'oldman', dir: 'left', g: 'm', script: 'cinderGift' }],
});
mkCenter('center_cinder', 'cinderfall');
mkMart('mart_cinder', 'cinderfall', ['greatball', 'ultraball', 'superpotion', 'hyperpotion', 'revive', 'fullheal', 'burnheal', 'iceheal', 'repel']);
defMap('plant', {
  name: 'Dimmer Plant', ts: 'in', floor: 'u', music: 'ashen', region: 'cinderfall', env: 'plant', wallColor: '#6a6e7a',
  grid: `
WWWWWWWWWWWWWWWWWWWW
WqqqqqqqWWWWqqqqqqqW
uuuuuuuuuuuuuuuuuuuu
uqquuuuuuqquuuuuuqqu
uuuuuquuuuuuuuuquuuu
uuuuuquuuqqqqququuuu
qqquuquuuuuuuuuquqqq
uuuuuuuuuuuuuuuuuuuu
uuqqqqquuuuuuqqqqquu
uuuuuuuuuuuuuuuuuuuu
uqquuuuuuuuuuuuuuqqu
uuuuuuuqquuqquuuuuuu
uuuuuuuuuuuuuuuuuuuu
uuuuuuuuuMMuuuuuuuuu`,
  warps: [{ x: 9, y: 13, to: 'cinderfall', tx: 21, ty: 16, dir: 'down' }, { x: 10, y: 13, to: 'cinderfall', tx: 21, ty: 16, dir: 'down' }],
  npcs: [
    { id: 'pg1', x: 3, y: 9, look: 'grunt', dir: 'right', g: 'm', cond: '!plant_down', trainer: T_('grunt', 'Grunt', 'grunt', [['golbat', 23], ['weezing', 24]], { sight: 4, title: 'Ashen Grunt', intro: 'Intruder! Intruder! ...Oh, it’s just a kid. INTRUDER!', lose: 'Security has failed!', after: 'Go ahead. The Admin is waiting for you.' }) },
    { id: 'pg2', x: 16, y: 7, look: 'gruntf', dir: 'left', g: 'f', cond: '!plant_down', trainer: T_('gruntf', 'Grunt', 'gruntf', [['magnemite', 23], ['houndour', 23], ['koffing', 24]], { sight: 4, title: 'Ashen Grunt', intro: 'The Dimmer is almost at full capacity. You won’t stop it now!', lose: 'Nooo! My quota!', after: 'There’s a new recruit up by the core. She’s... different.' }) },
    { id: 'pg3', x: 6, y: 4, look: 'scientist', dir: 'down', g: 'm', cond: '!plant_down', trainer: T_('scientist', 'Merritt', 'scientist', [['magnemite', 24], ['magneton', 25]], { sight: 3, intro: 'Hue is measurable! Quantifiable! And we’re harvesting it!', lose: 'My calculations... did not include you.', after: 'Hue is emotion made visible. Joy radiates it. So does grief.' }) },
    { id: 'gris', x: 13, y: 4, look: 'gris', dir: 'down', g: 'f', cond: '!plant_gris', script: 'grisPlant' },
    { id: 'sable_plant', x: 10, y: 2, look: 'sableAsh', dir: 'down', g: 'f', cond: '!plant_down', script: 'sablePlant' },
    { id: 'core', x: 10, y: 1, obj: 'core', cond: '!plant_off' },
  ],
  triggers: [{ x: 0, y: 3, w: 20, h: 1, id: 'gris', cond: '!plant_gris', script: 'grisTrig' }, { x: 0, y: 2, w: 20, h: 1, id: 'sablep', cond: 'plant_gris&!plant_sable', script: 'sablePlant' }],
});
defMap('gym3', {
  name: 'Cinderfall Gym', ts: 'in', floor: 'z', gymColor: '#e8583a', music: 'gym', region: 'cinderfall', env: 'gym',
  grid: `
WWWWWWWWWWWW
WWWWWOOWWWWW
zzzzzzzzzzzz
zLLLzzzzLLLz
zLLLzLLzLLLz
zzzzzLLzzzzz
LLLzzzzzzLLL
zzzzLLLLzzzz
zLLzLLLLzLLz
zzzzzzzzzzzz
LLLLzzzzLLLL
zzzzzzzzzzzz
zzGzzzzzzGzz
zzzzzzzzzzzz
zzzzzzzzzzzz
zzzzzMMzzzzz`,
  warps: [{ x: 5, y: 15, to: 'cinderfall', tx: 19, ty: 6, dir: 'down' }, { x: 6, y: 15, to: 'cinderfall', tx: 19, ty: 6, dir: 'down' }],
  npcs: [
    { id: 'blaise', x: 6, y: 2, look: 'blaise', dir: 'down', g: 'm', script: 'blaiseGym' },
    { id: 'g3t1', x: 3, y: 9, look: 'firebreather', dir: 'right', g: 'm', trainer: T_('firebreather', 'Otis', 'firebreather', [['ponyta', 25], ['growlithe', 25]], { sight: 4, intro: 'FWOOOSH! Feel the heat!', lose: 'Extinguished...', after: 'Blaise’s Arcanine is fast. Faster than you think.' }) },
    { id: 'g3t2', x: 8, y: 5, look: 'acetrainerf', dir: 'left', g: 'f', trainer: T_('acetrainerf', 'Vera', 'acetrainerf', [['houndour', 25], ['charmeleon', 26]], { sight: 3, intro: 'I trained here since I was ten. Don’t expect mercy.', lose: 'You’re the real thing.', after: 'Water, Ground and Rock moves cool this place down.' }) },
    { id: 'g3guide', x: 10, y: 13, look: 'man', dir: 'left', g: 'm', text: ['Phew, it’s hot! Blaise uses Fire-types. Water, Ground and Rock will cool him off!'] },
  ],
  signs: [{ x: 2, y: 12, text: 'CINDERFALL GYM\nLeader: Blaise\n“The Prism Smith”' }, { x: 9, y: 12, text: 'CINDERFALL GYM\nEmber Prism winners: (none this year)' }],
});

// ═════════════════════════════ FROSTVEIL PATH ═══════════════════════════════
defMap('frostveil', {
  name: 'Frostveil Path', music: 'snow', region: 'frostveil', env: 'snow', baseTile: '*', weather: 'snow', border: 'P',
  grid: `
PPPPPPPPPPPPPPPPPPPPPP
P****P**********P****P
P**P*************P***P
P****************....P
P****************....P
P****************....P
P****************....P
P****************....P
P****************....P
P*******::::::::::...P
P*******:*****:****..P
P^^^^***:*****:**^^^^P
P^^^^***:*****:**^^^^P
P*******:*****:******P
P##########::########P
P*********:::********P
P**^^^^****:****^^^**P
P**^^^^****:****^^^**P
P*********::*********P
P***PP***::***PP*****P
P***PP***:****PP*****P
P********:***********P
P^^^^****:****^^^^***P
P^^^^****:****^^^^***P
P********::**********P
P*********:::::******P
P*****PP******:******P
P*****PP******:**^^^*P
P**^^^********:**^^^*P
P**^^^********:******P
P********::::::******P
P********:***********P
P********:*****PP****P
P*^^^^***:*****PP****P
P*^^^^***:***********P
P********:**^^^^*****P
P********::*^^^^*****P
P*********:**********P
P*********:::********P
P***********:********P
P*****s*****:********P
P***********:********P
PPPPPPPPPPP::PPPPPPPPP`,
  buildings: [
    { t: 'spire', x: 7, y: 3, w: 8, h: 6, door: 3, to: { map: 'spire1', tx: 7, ty: 12 }, lockedFlag: 'spire_open', lockScript: 'spireDoor', open: () => G.flags.spire_open, sockets: i => G.flags.spire_open || [G.badges.red, G.badges.green, G.badges.blue][i] },
    { t: 'cabin', x: 16, y: 26, w: 4, h: 3, roof: '#8a5a48', door: 1, to: { map: 'cabin', tx: 3, ty: 5 } },
  ],
  signs: [{ x: 6, y: 40, text: 'FROSTVEIL PATH\nNorth: The Prism Spire. Travellers, keep warm!' }],
  items: [{ x: 1, y: 11, item: 'ultraball', n: 2, id: 'fv_ultra' }, { x: 20, y: 16, item: 'fullrestore', id: 'fv_restore' }, { x: 2, y: 33, item: 'tm09', id: 'fv_tm09' }, { x: 19, y: 4, item: 'hyperpotion', n: 2, id: 'fv_hyper' }],
  npcs: [
    { id: 'fvski1', x: 5, y: 36, look: 'skier', dir: 'right', g: 'm', trainer: T_('skier', 'Anders', 'skier', [['sneasel', 29], ['ponyta', 29]], { sight: 4, intro: 'Nothing beats fresh powder and a fresh battle!', lose: 'Wiped out on the slopes!', after: 'The Veil used to be so bright up here you could read by it.' }) },
    { id: 'fvhex', x: 15, y: 23, look: 'hexmaniac', dir: 'left', g: 'f', trainer: T_('hexmaniac', 'Morwen', 'hexmaniac', [['misdreavus', 29], ['haunter', 30]], { sight: 4, intro: 'The spirits whisper... they say the sky is afraid.', lose: 'The spirits... approve of you.', after: 'Something enormous is circling above the Spire. I can feel its heartbeat.' }) },
    { id: 'fvace', x: 10, y: 17, look: 'acetrainerf', dir: 'down', g: 'f', trainer: T_('acetrainerf', 'Lena', 'acetrainerf', [['ampharos', 30], ['noctowl', 29], ['arcanine', 30]], { sight: 4, intro: 'Heading for the Spire? Prove you’re ready.', lose: 'Okay. You’re ready.', after: 'Whatever’s up there, don’t face it alone. Trust your team.' }) },
    { id: 'fvgrunt', x: 11, y: 13, look: 'grunt', dir: 'down', g: 'm', cond: '!spire_open', trainer: T_('grunt', 'Grunt', 'grunt', [['golbat', 29], ['houndoom', 30], ['weezing', 29]], { sight: 3, title: 'Ashen Grunt', intro: 'The Director’s orders: nobody gets past this point!', lose: 'The Director will handle you himself...', after: 'He’s already at the top. You’re too late.' }) },
  ],
  encounters: { grass: { day: [['sneasel', 26, 29, 25], ['ponyta', 26, 29, 15], ['growlithe', 26, 29, 10], ['misdreavus', 26, 28, 10], ['golbat', 27, 29, 15], ['graveler', 27, 29, 15], ['haunter', 27, 29, 10]], night: [['sneasel', 26, 29, 20], ['misdreavus', 26, 29, 25], ['haunter', 27, 29, 20], ['noctowl', 27, 29, 20], ['golbat', 27, 29, 15]] }, rate: 0.12 },
  conn: { south: { map: 'cinderfall', off: -1 } },
});
defMap('cabin', {
  name: 'Traveller’s Cabin', ts: 'in', floor: '_', music: 'center', wallColor: '#d8b890', region: 'frostveil',
  grid: `
WWWWWWWW
WOWKKWOW
________
_d____p_
_d______
________
___M____`,
  warps: [{ x: 3, y: 6, to: '@back' }],
  heal: true,
  npcs: [{ id: 'cabinlady', x: 5, y: 3, look: 'oldwoman', dir: 'down', g: 'f', script: 'cabinHeal' }, { id: 'cabinpc', x: 6, y: 2, obj: 'pc', script: 'pc' }],
});

// ═════════════════════════════ THE PRISM SPIRE ══════════════════════════════
defMap('spire1', {
  name: 'Prism Spire', ts: 'in', floor: 'x', music: 'spire', region: 'spire', env: 'spire', wallColor: '#b8c0e8',
  grid: `
WWWWWWWWWWWWWWWW
WWWWWWWSWWWWWWWW
xxxxxxxxxxxxxxxx
xJxxxJxxxxJxxxJx
xxxxxxxxxxxxxxxx
xxJxxxxJJxxxxJxx
xxxxxxxxxxxxxxxx
xJxxJxxxxxxJxxJx
xxxxxxxxxxxxxxxx
xxxJxxxxxxxxJxxx
xxxxxxJxxJxxxxxx
xJxxxxxxxxxxxxJx
xxxxxxxxxxxxxxxx
xxxxxxxMMxxxxxxx`,
  warps: [{ x: 7, y: 13, to: 'frostveil', tx: 10, ty: 9, dir: 'down' }, { x: 8, y: 13, to: 'frostveil', tx: 10, ty: 9, dir: 'down' }, { x: 7, y: 1, to: 'spire2', tx: 7, ty: 11, dir: 'up' }],
  npcs: [
    { id: 's1g1', x: 3, y: 8, look: 'grunt', dir: 'right', g: 'm', trainer: T_('grunt', 'Grunt', 'grunt', [['houndoom', 31], ['golbat', 31]], { sight: 4, title: 'Ashen Grunt', intro: 'So pretty in here. We’ll fix that.', lose: 'Shattered!', after: 'The Admins are upstairs. Good luck, kid. Honestly.' }) },
    { id: 's1g2', x: 12, y: 4, look: 'gruntf', dir: 'left', g: 'f', trainer: T_('gruntf', 'Grunt', 'gruntf', [['weezing', 31], ['murkrow', 31], ['magneton', 32]], { sight: 4, title: 'Ashen Grunt', intro: 'You brought the three lights. The Director said you would.', lose: 'So this is what hope looks like...', after: 'Sometimes I wonder if we’re doing the right thing.' }) },
  ],
});
defMap('spire2', {
  name: 'Prism Spire', ts: 'in', floor: 'x', music: 'spire', region: 'spire', env: 'spire', wallColor: '#a8b0e0',
  grid: `
WWWWWWWWWWWWWWWW
WWWWWWWSWWWWWWWW
xxxxxxxxxxxxxxxx
xxJxxxxxxxxxxJxx
xxxxxxxxxxxxxxxx
xJxxxJxxxxJxxxJx
xxxxxxxxxxxxxxxx
xxxJxxxxxxxxJxxx
xxxxxxxxxxxxxxxx
xJxxxxJxxJxxxxJx
xxxxxxxxxxxxxxxx
xxxxxxxSxxxxxxxx`,
  warps: [{ x: 7, y: 11, to: 'spire1', tx: 7, ty: 2, dir: 'down' }, { x: 7, y: 1, to: 'summit', tx: 7, ty: 11, dir: 'up' }],
  npcs: [
    { id: 'slate2', x: 7, y: 3, look: 'slate', dir: 'down', g: 'm', cond: '!slate2_done', script: 'slateSpire' },
  ],
});
defMap('summit', {
  name: 'Spire Summit', ts: 'out', music: 'spire', musicFn: 'summitMusic', region: 'spire', env: 'summit', sky: 1, baseTile: 'x', border: 'V',
  grid: `
VVVVVVVVVVVVVVVV
VVVVxxxxxxxxVVVV
VVVxxxxxxxxxxVVV
VVxxXxxxxxxXxxVV
VxxxxxxxxxxxxxxV
VxxxxxxxxxxxxxxV
VxxXxxxxxxxxXxxV
VxxxxxxxxxxxxxxV
VxxxxxxxxxxxxxxV
VVxxxxxxxxxxxxVV
VVVxxxxxxxxxxVVV
VVVVxxxxxxxxVVVV
VVVVVVVVVVVVVVVV`,
  warps: [{ x: 7, y: 11, to: 'spire2', tx: 7, ty: 2, dir: 'down' }],
  buildings: [{ t: 'machine', x: 7, y: 1, w: 2, h: 2, cond: '!machine_broken' }],
  npcs: [
    { id: 'vane', x: 7, y: 4, look: 'vane', dir: 'up', g: 'm', cond: '!summit_done', script: 'none' },
    { id: 'sable_s', x: 9, y: 5, look: 'sableAsh', dir: 'up', g: 'f', cond: '!summit_done', script: 'none' },
    { id: 'umbreon_s', x: 10, y: 5, poke: 'umbreon', dir: 'down', faded: 'summit_done', cond: '!summit_done', script: 'none' },
    { id: 'hooh', x: 7, y: 2, poke: 'hooh', size: 2, cond: 'hooh_landed', script: 'hoohTalk' },
  ],
  triggers: [{ x: 5, y: 9, w: 6, h: 1, id: 'summitScene', cond: '!summit_done', script: 'summitScene' }],
});
