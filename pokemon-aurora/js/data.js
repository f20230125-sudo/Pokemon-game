'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Game data: types, moves, species (Lumira regional Pokédex), items, natures
// ─────────────────────────────────────────────────────────────────────────────
const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
const TYPE_COLOR = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#e8c020', grass: '#6cc048', ice: '#78c8d0', fighting: '#c03028',
  poison: '#a040a0', ground: '#d8b058', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820', rock: '#b8a038', ghost: '#705898',
  dragon: '#7038f8', dark: '#705848', steel: '#a8a8c0', fairy: '#e890a8',
};
const TYPE_NAME = t => t.toUpperCase();
const CHART = (() => {
  const c = {};
  const set = (atk, list, m) => { c[atk] = c[atk] || {}; for (const d of list.split(' ')) if (d) c[atk][d] = m; };
  set('normal', 'rock steel', 0.5); set('normal', 'ghost', 0);
  set('fire', 'fire water rock dragon', 0.5); set('fire', 'grass ice bug steel', 2);
  set('water', 'water grass dragon', 0.5); set('water', 'fire ground rock', 2);
  set('electric', 'electric grass dragon', 0.5); set('electric', 'water flying', 2); set('electric', 'ground', 0);
  set('grass', 'fire grass poison flying bug dragon steel', 0.5); set('grass', 'water ground rock', 2);
  set('ice', 'fire water ice steel', 0.5); set('ice', 'grass ground flying dragon', 2);
  set('fighting', 'poison flying psychic bug fairy', 0.5); set('fighting', 'normal ice rock dark steel', 2); set('fighting', 'ghost', 0);
  set('poison', 'poison ground rock ghost', 0.5); set('poison', 'grass fairy', 2); set('poison', 'steel', 0);
  set('ground', 'grass bug', 0.5); set('ground', 'fire electric poison rock steel', 2); set('ground', 'flying', 0);
  set('flying', 'electric rock steel', 0.5); set('flying', 'grass fighting bug', 2);
  set('psychic', 'psychic steel', 0.5); set('psychic', 'fighting poison', 2); set('psychic', 'dark', 0);
  set('bug', 'fire fighting poison flying ghost steel fairy', 0.5); set('bug', 'grass psychic dark', 2);
  set('rock', 'fighting ground steel', 0.5); set('rock', 'fire ice flying bug', 2);
  set('ghost', 'dark', 0.5); set('ghost', 'psychic ghost', 2); set('ghost', 'normal', 0);
  set('dragon', 'steel', 0.5); set('dragon', 'dragon', 2); set('dragon', 'fairy', 0);
  set('dark', 'fighting dark fairy', 0.5); set('dark', 'psychic ghost', 2);
  set('steel', 'fire water electric steel', 0.5); set('steel', 'ice rock fairy', 2);
  set('fairy', 'fire poison steel', 0.5); set('fairy', 'fighting dragon dark', 2);
  return c;
})();
function typeEff(atk, defTypes) { let m = 1; for (const d of defTypes) { const v = CHART[atk] && CHART[atk][d]; if (v != null) m *= v; } return m; }

// ── moves ───────────────────────────────────────────────────────────────────
// M(name, type, cat P/S/X, power, accuracy (0 = never misses), pp, effects)
const MOVES = {};
function M(id, name, type, cat, pow, acc, pp, fx = {}) { MOVES[id] = Object.assign({ id, name, type, cat, pow, acc, pp }, fx); }
const foe = (stats, chance = 100) => ({ stat: { who: 'foe', stats, chance } });
const self = (stats, chance = 100) => ({ stat: { who: 'self', stats, chance } });
// Normal
M('tackle', 'Tackle', 'normal', 'P', 40, 100, 35, { contact: 1 });
M('scratch', 'Scratch', 'normal', 'P', 40, 100, 35, { contact: 1, anim: 'scratch' });
M('quickattack', 'Quick Attack', 'normal', 'P', 40, 100, 30, { prio: 1, contact: 1, anim: 'quick' });
M('extremespeed', 'Extreme Speed', 'normal', 'P', 80, 100, 5, { prio: 2, contact: 1, anim: 'quick' });
M('headbutt', 'Headbutt', 'normal', 'P', 70, 100, 15, { flinch: 30, contact: 1 });
M('bodyslam', 'Body Slam', 'normal', 'P', 85, 100, 15, { st: ['par', 30], contact: 1 });
M('takedown', 'Take Down', 'normal', 'P', 90, 85, 20, { recoil: 0.25, contact: 1 });
M('doubleedge', 'Double-Edge', 'normal', 'P', 120, 100, 15, { recoil: 0.33, contact: 1 });
M('hyperfang', 'Hyper Fang', 'normal', 'P', 80, 90, 15, { flinch: 10, contact: 1, anim: 'bite' });
M('slam', 'Slam', 'normal', 'P', 80, 75, 20, { contact: 1 });
M('slash', 'Slash', 'normal', 'P', 70, 100, 20, { crit: 1, contact: 1, anim: 'scratch' });
M('stomp', 'Stomp', 'normal', 'P', 65, 100, 20, { flinch: 30, contact: 1 });
M('rapidspin', 'Rapid Spin', 'normal', 'P', 50, 100, 40, { contact: 1, ...self({ spe: 1 }) });
M('furyswipes', 'Fury Swipes', 'normal', 'P', 18, 80, 15, { hits: [2, 5], contact: 1, anim: 'scratch' });
M('swift', 'Swift', 'normal', 'S', 60, 0, 20, { anim: 'stars' });
M('hyperbeam', 'Hyper Beam', 'normal', 'S', 150, 90, 5, { recharge: 1, anim: 'beam' });
M('growl', 'Growl', 'normal', 'X', 0, 100, 40, { ...foe({ atk: -1 }), anim: 'sound' });
M('leer', 'Leer', 'normal', 'X', 0, 100, 30, { ...foe({ def: -1 }), anim: 'glare' });
M('tailwhip', 'Tail Whip', 'normal', 'X', 0, 100, 30, { ...foe({ def: -1 }), anim: 'wiggle' });
M('screech', 'Screech', 'normal', 'X', 0, 85, 40, { ...foe({ def: -2 }), anim: 'sound' });
M('scaryface', 'Scary Face', 'normal', 'X', 0, 100, 10, { ...foe({ spe: -2 }), anim: 'glare' });
M('smokescreen', 'Smokescreen', 'normal', 'X', 0, 100, 20, { ...foe({ acc: -1 }), anim: 'smoke' });
M('supersonic', 'Supersonic', 'normal', 'X', 0, 55, 20, { conf: 100, anim: 'sound' });
M('defensecurl', 'Defense Curl', 'normal', 'X', 0, 0, 40, self({ def: 1 }));
M('harden', 'Harden', 'normal', 'X', 0, 0, 30, self({ def: 1 }));
M('growth', 'Growth', 'normal', 'X', 0, 0, 20, self({ atk: 1, spa: 1 }));
M('swordsdance', 'Swords Dance', 'normal', 'X', 0, 0, 20, self({ atk: 2 }));
M('recover', 'Recover', 'normal', 'X', 0, 0, 10, { heal: 0.5 });
M('splash', 'Splash', 'normal', 'X', 0, 0, 40, { splash: 1, anim: 'splash' });
M('roar', 'Roar', 'normal', 'X', 0, 0, 20, { flee: 1, anim: 'sound' });
M('whirlwind', 'Whirlwind', 'normal', 'X', 0, 0, 20, { flee: 1, anim: 'wind' });
// Fire
M('ember', 'Ember', 'fire', 'S', 40, 100, 25, { st: ['brn', 10] });
M('flamewheel', 'Flame Wheel', 'fire', 'P', 60, 100, 25, { st: ['brn', 10], thaw: 1, contact: 1 });
M('firefang', 'Fire Fang', 'fire', 'P', 65, 95, 15, { st: ['brn', 10], flinch: 10, contact: 1, anim: 'bite' });
M('flamecharge', 'Flame Charge', 'fire', 'P', 50, 100, 20, { contact: 1, ...self({ spe: 1 }) });
M('flamethrower', 'Flamethrower', 'fire', 'S', 90, 100, 15, { st: ['brn', 10], anim: 'flamethrower' });
M('heatwave', 'Heat Wave', 'fire', 'S', 95, 90, 10, { st: ['brn', 10], anim: 'flamethrower' });
M('fireblast', 'Fire Blast', 'fire', 'S', 110, 85, 5, { st: ['brn', 10], anim: 'fireblast' });
M('flareblitz', 'Flare Blitz', 'fire', 'P', 120, 100, 15, { recoil: 0.33, st: ['brn', 10], thaw: 1, contact: 1 });
M('sacredfire', 'Sacred Fire', 'fire', 'P', 100, 95, 5, { st: ['brn', 50], thaw: 1, anim: 'sacredfire' });
M('willowisp', 'Will-O-Wisp', 'fire', 'X', 0, 85, 15, { st: ['brn', 100], anim: 'wisp' });
// Water
M('watergun', 'Water Gun', 'water', 'S', 40, 100, 25);
M('bubble', 'Bubble', 'water', 'S', 40, 100, 30, { ...foe({ spe: -1 }, 10), anim: 'bubble' });
M('bubblebeam', 'Bubble Beam', 'water', 'S', 65, 100, 20, { ...foe({ spe: -1 }, 10), anim: 'bubble' });
M('waterpulse', 'Water Pulse', 'water', 'S', 60, 100, 20, { conf: 20, anim: 'pulse' });
M('aquatail', 'Aqua Tail', 'water', 'P', 90, 90, 10, { contact: 1 });
M('waterfall', 'Waterfall', 'water', 'P', 80, 100, 15, { flinch: 20, contact: 1 });
M('surf', 'Surf', 'water', 'S', 90, 100, 15, { anim: 'surf' });
M('hydropump', 'Hydro Pump', 'water', 'S', 110, 80, 5, { anim: 'hydropump' });
M('withdraw', 'Withdraw', 'water', 'X', 0, 0, 40, self({ def: 1 }));
// Grass
M('vinewhip', 'Vine Whip', 'grass', 'P', 45, 100, 25, { contact: 1, anim: 'vine' });
M('razorleaf', 'Razor Leaf', 'grass', 'P', 55, 95, 25, { crit: 1, anim: 'leaf' });
M('absorb', 'Absorb', 'grass', 'S', 20, 100, 25, { drain: 0.5, anim: 'drain' });
M('megadrain', 'Mega Drain', 'grass', 'S', 40, 100, 15, { drain: 0.5, anim: 'drain' });
M('gigadrain', 'Giga Drain', 'grass', 'S', 75, 100, 10, { drain: 0.5, anim: 'drain' });
M('magicalleaf', 'Magical Leaf', 'grass', 'S', 60, 0, 20, { anim: 'leaf' });
M('seedbomb', 'Seed Bomb', 'grass', 'P', 80, 100, 15);
M('petalblizzard', 'Petal Blizzard', 'grass', 'P', 90, 100, 15, { anim: 'petals' });
M('powerwhip', 'Power Whip', 'grass', 'P', 120, 85, 10, { contact: 1, anim: 'vine' });
M('solarbeam', 'Solar Beam', 'grass', 'S', 120, 100, 10, { charge: 'took in sunlight!', anim: 'beam' });
M('sleeppowder', 'Sleep Powder', 'grass', 'X', 0, 75, 15, { st: ['slp', 100], powder: 1, anim: 'powder' });
M('stunspore', 'Stun Spore', 'grass', 'X', 0, 75, 30, { st: ['par', 100], powder: 1, anim: 'powder' });
M('cottonspore', 'Cotton Spore', 'grass', 'X', 0, 100, 40, { ...foe({ spe: -2 }), anim: 'powder' });
M('leechseed', 'Leech Seed', 'grass', 'X', 0, 90, 10, { leech: 1, anim: 'seed' });
M('synthesis', 'Synthesis', 'grass', 'X', 0, 0, 5, { heal: 0.5 });
// Electric
M('thundershock', 'Thunder Shock', 'electric', 'S', 40, 100, 30, { st: ['par', 10] });
M('spark', 'Spark', 'electric', 'P', 65, 100, 20, { st: ['par', 30], contact: 1 });
M('chargebeam', 'Charge Beam', 'electric', 'S', 50, 90, 10, { ...self({ spa: 1 }, 70), anim: 'beam' });
M('discharge', 'Discharge', 'electric', 'S', 80, 100, 15, { st: ['par', 30] });
M('thunderbolt', 'Thunderbolt', 'electric', 'S', 90, 100, 15, { st: ['par', 10], anim: 'thunder' });
M('thunder', 'Thunder', 'electric', 'S', 110, 70, 10, { st: ['par', 30], anim: 'thunder' });
M('thunderfang', 'Thunder Fang', 'electric', 'P', 65, 95, 15, { st: ['par', 10], flinch: 10, contact: 1, anim: 'bite' });
M('thunderwave', 'Thunder Wave', 'electric', 'X', 0, 90, 20, { st: ['par', 100] });
// Flying
M('gust', 'Gust', 'flying', 'S', 40, 100, 35, { anim: 'wind' });
M('peck', 'Peck', 'flying', 'P', 35, 100, 35, { contact: 1 });
M('wingattack', 'Wing Attack', 'flying', 'P', 60, 100, 35, { contact: 1 });
M('aerialace', 'Aerial Ace', 'flying', 'P', 60, 0, 20, { contact: 1, anim: 'slash' });
M('airslash', 'Air Slash', 'flying', 'S', 75, 95, 15, { flinch: 30, anim: 'slash' });
M('drillpeck', 'Drill Peck', 'flying', 'P', 80, 100, 20, { contact: 1 });
M('bravebird', 'Brave Bird', 'flying', 'P', 120, 100, 15, { recoil: 0.33, contact: 1 });
M('hurricane', 'Hurricane', 'flying', 'S', 110, 70, 10, { conf: 30, anim: 'wind' });
M('featherdance', 'Feather Dance', 'flying', 'X', 0, 100, 15, { ...foe({ atk: -2 }), anim: 'feathers' });
M('roost', 'Roost', 'flying', 'X', 0, 0, 10, { heal: 0.5 });
// Bug
M('stringshot', 'String Shot', 'bug', 'X', 0, 95, 40, { ...foe({ spe: -2 }), anim: 'string' });
M('bugbite', 'Bug Bite', 'bug', 'P', 60, 100, 20, { contact: 1, anim: 'bite' });
M('leechlife', 'Leech Life', 'bug', 'P', 80, 100, 10, { drain: 0.5, contact: 1, anim: 'drain' });
M('silverwind', 'Silver Wind', 'bug', 'S', 60, 100, 5, { ...self({ atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, 10), anim: 'wind' });
M('bugbuzz', 'Bug Buzz', 'bug', 'S', 90, 100, 10, { ...foe({ spd: -1 }, 10), anim: 'sound' });
M('xscissor', 'X-Scissor', 'bug', 'P', 80, 100, 15, { contact: 1, anim: 'slash' });
// Poison
M('poisonsting', 'Poison Sting', 'poison', 'P', 15, 100, 35, { st: ['psn', 30] });
M('acid', 'Acid', 'poison', 'S', 40, 100, 30, { ...foe({ spd: -1 }, 10), anim: 'sludge' });
M('smog', 'Smog', 'poison', 'S', 30, 70, 20, { st: ['psn', 40], anim: 'smoke' });
M('sludge', 'Sludge', 'poison', 'S', 65, 100, 20, { st: ['psn', 30], anim: 'sludge' });
M('sludgebomb', 'Sludge Bomb', 'poison', 'S', 90, 100, 10, { st: ['psn', 30], anim: 'sludge' });
M('poisonfang', 'Poison Fang', 'poison', 'P', 50, 100, 15, { st: ['tox', 50], contact: 1, anim: 'bite' });
M('crosspoison', 'Cross Poison', 'poison', 'P', 70, 100, 20, { crit: 1, st: ['psn', 10], contact: 1, anim: 'slash' });
M('poisongas', 'Poison Gas', 'poison', 'X', 0, 90, 40, { st: ['psn', 100], anim: 'smoke' });
M('poisonpowder', 'Poison Powder', 'poison', 'X', 0, 75, 35, { st: ['psn', 100], powder: 1, anim: 'powder' });
M('toxic', 'Toxic', 'poison', 'X', 0, 90, 10, { st: ['tox', 100], anim: 'sludge' });
// Ground
M('sandattack', 'Sand Attack', 'ground', 'X', 0, 100, 15, { ...foe({ acc: -1 }), anim: 'sand' });
M('mudslap', 'Mud-Slap', 'ground', 'S', 20, 100, 10, { ...foe({ acc: -1 }), anim: 'sand' });
M('bulldoze', 'Bulldoze', 'ground', 'P', 60, 100, 20, { ...foe({ spe: -1 }), anim: 'quake' });
M('earthquake', 'Earthquake', 'ground', 'P', 100, 100, 10, { anim: 'quake' });
// Rock
M('rockthrow', 'Rock Throw', 'rock', 'P', 50, 90, 15);
M('rocktomb', 'Rock Tomb', 'rock', 'P', 60, 95, 15, foe({ spe: -1 }));
M('rockslide', 'Rock Slide', 'rock', 'P', 75, 90, 10, { flinch: 30 });
M('stoneedge', 'Stone Edge', 'rock', 'P', 100, 80, 5, { crit: 1 });
M('ancientpower', 'Ancient Power', 'rock', 'S', 60, 100, 5, self({ atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, 10));
M('powergem', 'Power Gem', 'rock', 'S', 80, 100, 20, { anim: 'gem' });
M('rockpolish', 'Rock Polish', 'rock', 'X', 0, 0, 20, self({ spe: 2 }));
// Fighting
M('karatechop', 'Karate Chop', 'fighting', 'P', 50, 100, 25, { crit: 1, contact: 1 });
M('lowkick', 'Low Kick', 'fighting', 'P', 60, 100, 20, { contact: 1 });
M('brickbreak', 'Brick Break', 'fighting', 'P', 75, 100, 15, { contact: 1 });
M('seismictoss', 'Seismic Toss', 'fighting', 'P', 1, 100, 20, { fixed: 'level', contact: 1 });
// Psychic
M('confusion', 'Confusion', 'psychic', 'S', 50, 100, 25, { conf: 10, anim: 'psychic' });
M('psybeam', 'Psybeam', 'psychic', 'S', 65, 100, 20, { conf: 10, anim: 'beam' });
M('psychic', 'Psychic', 'psychic', 'S', 90, 100, 10, { ...foe({ spd: -1 }, 10), anim: 'psychic' });
M('extrasensory', 'Extrasensory', 'psychic', 'S', 80, 100, 20, { flinch: 10, anim: 'psychic' });
M('dreameater', 'Dream Eater', 'psychic', 'S', 100, 100, 15, { drain: 0.5, needSleep: 1, anim: 'drain' });
M('hypnosis', 'Hypnosis', 'psychic', 'X', 0, 60, 20, { st: ['slp', 100], anim: 'psychic' });
M('agility', 'Agility', 'psychic', 'X', 0, 0, 30, self({ spe: 2 }));
M('amnesia', 'Amnesia', 'psychic', 'X', 0, 0, 20, self({ spd: 2 }));
M('calmmind', 'Calm Mind', 'psychic', 'X', 0, 0, 20, self({ spa: 1, spd: 1 }));
M('rest', 'Rest', 'psychic', 'X', 0, 0, 10, { rest: 1 });
M('teleport', 'Teleport', 'psychic', 'X', 0, 0, 20, { flee: 1, selfFlee: 1 });
// Ghost
M('lick', 'Lick', 'ghost', 'P', 30, 100, 30, { st: ['par', 30], contact: 1 });
M('astonish', 'Astonish', 'ghost', 'P', 30, 100, 15, { flinch: 30, contact: 1 });
M('nightshade', 'Night Shade', 'ghost', 'S', 1, 100, 15, { fixed: 'level', anim: 'shadow' });
M('shadowsneak', 'Shadow Sneak', 'ghost', 'P', 40, 100, 30, { prio: 1, contact: 1, anim: 'shadow' });
M('shadowclaw', 'Shadow Claw', 'ghost', 'P', 70, 100, 15, { crit: 1, contact: 1, anim: 'slash' });
M('hex', 'Hex', 'ghost', 'S', 65, 100, 10, { hex: 1, anim: 'shadow' });
M('shadowball', 'Shadow Ball', 'ghost', 'S', 80, 100, 15, { ...foe({ spd: -1 }, 20), anim: 'orb' });
M('confuseray', 'Confuse Ray', 'ghost', 'X', 0, 100, 10, { conf: 100, anim: 'wisp' });
// Dark
M('bite', 'Bite', 'dark', 'P', 60, 100, 25, { flinch: 30, contact: 1, anim: 'bite' });
M('pursuit', 'Pursuit', 'dark', 'P', 40, 100, 20, { contact: 1 });
M('faintattack', 'Feint Attack', 'dark', 'P', 60, 0, 20, { contact: 1, anim: 'quick' });
M('crunch', 'Crunch', 'dark', 'P', 80, 100, 15, { ...foe({ def: -1 }, 20), contact: 1, anim: 'bite' });
M('nightslash', 'Night Slash', 'dark', 'P', 70, 100, 15, { crit: 1, contact: 1, anim: 'slash' });
M('darkpulse', 'Dark Pulse', 'dark', 'S', 80, 100, 15, { flinch: 20, anim: 'pulse' });
M('nastyplot', 'Nasty Plot', 'dark', 'X', 0, 0, 20, self({ spa: 2 }));
M('honeclaws', 'Hone Claws', 'dark', 'X', 0, 0, 15, self({ atk: 1, acc: 1 }));
// Ice
M('powdersnow', 'Powder Snow', 'ice', 'S', 40, 100, 25, { st: ['frz', 10] });
M('iceshard', 'Ice Shard', 'ice', 'P', 40, 100, 30, { prio: 1 });
M('icywind', 'Icy Wind', 'ice', 'S', 55, 95, 15, foe({ spe: -1 }));
M('icefang', 'Ice Fang', 'ice', 'P', 65, 95, 15, { st: ['frz', 10], flinch: 10, contact: 1, anim: 'bite' });
M('icepunch', 'Ice Punch', 'ice', 'P', 75, 100, 15, { st: ['frz', 10], contact: 1 });
M('icebeam', 'Ice Beam', 'ice', 'S', 90, 100, 10, { st: ['frz', 10], anim: 'beam' });
M('aurorabeam', 'Aurora Beam', 'ice', 'S', 65, 100, 20, { ...foe({ atk: -1 }, 10), anim: 'aurora' });
// Steel
M('metalclaw', 'Metal Claw', 'steel', 'P', 50, 95, 35, { ...self({ atk: 1 }, 10), contact: 1, anim: 'scratch' });
M('irontail', 'Iron Tail', 'steel', 'P', 100, 75, 15, { ...foe({ def: -1 }, 30), contact: 1 });
M('ironhead', 'Iron Head', 'steel', 'P', 80, 100, 15, { flinch: 30, contact: 1 });
M('magnetbomb', 'Magnet Bomb', 'steel', 'P', 60, 0, 20);
M('mirrorshot', 'Mirror Shot', 'steel', 'S', 65, 85, 10, { ...foe({ acc: -1 }, 30), anim: 'gem' });
M('flashcannon', 'Flash Cannon', 'steel', 'S', 80, 100, 10, { ...foe({ spd: -1 }, 10), anim: 'beam' });
M('metalsound', 'Metal Sound', 'steel', 'X', 0, 85, 40, { ...foe({ spd: -2 }), anim: 'sound' });
M('irondefense', 'Iron Defense', 'steel', 'X', 0, 0, 15, self({ def: 2 }));
// Dragon
M('dragonrage', 'Dragon Rage', 'dragon', 'S', 1, 100, 10, { fixed: 40, anim: 'dragon' });
M('twister', 'Twister', 'dragon', 'S', 40, 100, 20, { flinch: 20, anim: 'wind' });
M('dragonbreath', 'Dragon Breath', 'dragon', 'S', 60, 100, 20, { st: ['par', 30], anim: 'dragon' });
M('dragonpulse', 'Dragon Pulse', 'dragon', 'S', 85, 100, 10, { anim: 'pulse' });
M('dragondance', 'Dragon Dance', 'dragon', 'X', 0, 0, 20, self({ atk: 1, spe: 1 }));
// Fairy
M('charm', 'Charm', 'fairy', 'X', 0, 100, 20, { ...foe({ atk: -2 }), anim: 'hearts' });
M('moonblast', 'Moonblast', 'fairy', 'S', 95, 100, 15, { ...foe({ spa: -1 }, 30), anim: 'moon' });
M('moonlight', 'Moonlight', 'fairy', 'X', 0, 0, 5, { heal: 0.5 });
M('dazzlinggleam', 'Dazzling Gleam', 'fairy', 'S', 80, 100, 10, { anim: 'gem' });
M('struggle', 'Struggle', 'normal', 'P', 50, 0, 1, { recoilMax: 0.25, contact: 1 });

// ── species ─────────────────────────────────────────────────────────────────
// S(id, name, types, [hp,atk,def,spa,spd,spe], catchRate, baseExp, growth, learnset, extra)
const SPECIES = {};
const DEX_ORDER = [];
function S(id, name, types, base, catchRate, exp, growth, learn, x = {}) {
  SPECIES[id] = Object.assign({ id, name, types, base, catchRate, exp, growth, learn, dexNo: DEX_ORDER.length + 1 }, x);
  DEX_ORDER.push(id);
}
const L = str => str.trim().split(/\s*,\s*/).map(p => { const [lv, mv] = p.split(':'); return [+lv, mv]; });

S('bulbasaur', 'Bulbasaur', ['grass', 'poison'], [45, 49, 49, 65, 65, 45], 45, 64, 'ms',
  L('1:tackle,3:growl,7:leechseed,9:vinewhip,13:poisonpowder,14:sleeppowder,15:takedown,19:razorleaf,22:growth,25:doubleedge,27:synthesis,33:seedbomb,37:solarbeam'),
  { evo: { level: 16, into: 'ivysaur' }, ability: 'overgrow', cat: 'Seed', ht: 0.7, wt: 6.9, dex: 'Lumiran farmers plant them beside their fields. The bulb drinks in the dawn light and the whole row of crops leans toward it.' });
S('ivysaur', 'Ivysaur', ['grass', 'poison'], [60, 62, 63, 80, 80, 60], 45, 142, 'ms',
  L('1:tackle,1:growl,1:leechseed,9:vinewhip,13:poisonpowder,13:sleeppowder,15:takedown,20:razorleaf,23:growth,28:doubleedge,31:synthesis,36:seedbomb,44:solarbeam'),
  { evo: { level: 32, into: 'venusaur' }, ability: 'overgrow', cat: 'Seed', ht: 1.0, wt: 13, dex: 'The bud on its back grows heavy before blooming. It spends long afternoons lying in sunbeams, refusing to move for anyone.' });
S('venusaur', 'Venusaur', ['grass', 'poison'], [80, 82, 83, 100, 100, 80], 45, 236, 'ms',
  L('1:tackle,1:growl,1:leechseed,1:vinewhip,13:poisonpowder,13:sleeppowder,15:takedown,20:razorleaf,23:growth,28:doubleedge,31:synthesis,32:petalblizzard,39:gigadrain,45:solarbeam,50:sludgebomb'),
  { ability: 'overgrow', cat: 'Seed', ht: 2.0, wt: 100, dex: 'Its flower opens fully only under the Veil. The scent is said to calm frightened Pokémon for miles around.' });
S('charmander', 'Charmander', ['fire'], [39, 52, 43, 60, 50, 65], 45, 62, 'ms',
  L('1:scratch,1:growl,7:ember,10:smokescreen,13:metalclaw,16:dragonrage,19:scaryface,22:firefang,28:slash,34:flamethrower,40:fireblast'),
  { evo: { level: 16, into: 'charmeleon' }, ability: 'blaze', cat: 'Lizard', ht: 0.6, wt: 8.5, dex: 'The flame on its tail shows its heart. In Cinderfall, children read a Charmander’s mood the way sailors read the sky.' });
S('charmeleon', 'Charmeleon', ['fire'], [58, 64, 58, 80, 65, 80], 45, 142, 'ms',
  L('1:scratch,1:growl,1:ember,10:smokescreen,13:metalclaw,17:dragonrage,21:scaryface,24:firefang,30:slash,37:flamethrower,44:fireblast'),
  { evo: { level: 32, into: 'charizard' }, ability: 'blaze', cat: 'Flame', ht: 1.1, wt: 19, dex: 'Hot-headed and proud. When it loses a battle it sulks for days, its tail flame burning a sullen, low blue.' });
S('charizard', 'Charizard', ['fire', 'flying'], [78, 84, 78, 109, 85, 100], 45, 240, 'ms',
  L('1:scratch,1:growl,1:ember,1:wingattack,10:smokescreen,13:metalclaw,17:dragonrage,21:scaryface,24:firefang,30:slash,32:airslash,36:dragonbreath,39:flamethrower,46:fireblast,50:flareblitz'),
  { ability: 'blaze', cat: 'Flame', ht: 1.7, wt: 90.5, dex: 'It flies above the clouds to chase the Veil. Old stories say a Charizard once scorched a path across the sky to guide lost ships home.' });
S('squirtle', 'Squirtle', ['water'], [44, 48, 65, 50, 64, 43], 45, 63, 'ms',
  L('1:tackle,3:tailwhip,7:watergun,10:withdraw,13:bubble,16:bite,19:rapidspin,22:waterpulse,28:aquatail,34:irondefense,40:hydropump'),
  { evo: { level: 16, into: 'wartortle' }, ability: 'torrent', cat: 'Tiny Turtle', ht: 0.5, wt: 9, dex: 'It loves to spray unsuspecting people from the harbour steps, then hide in its shell giggling.' });
S('wartortle', 'Wartortle', ['water'], [59, 63, 80, 65, 80, 58], 45, 142, 'ms',
  L('1:tackle,1:tailwhip,1:watergun,10:withdraw,13:bubble,17:bite,20:rapidspin,24:waterpulse,30:aquatail,36:irondefense,42:hydropump'),
  { evo: { level: 32, into: 'blastoise' }, ability: 'torrent', cat: 'Turtle', ht: 1.0, wt: 22.5, dex: 'Its fluffy tail is a symbol of long life in Brinecrest. Fishermen tie a white ribbon on their nets in its honour.' });
S('blastoise', 'Blastoise', ['water'], [79, 83, 100, 85, 105, 78], 45, 239, 'ms',
  L('1:tackle,1:tailwhip,1:watergun,1:withdraw,13:bubble,17:bite,20:rapidspin,24:waterpulse,30:aquatail,32:flashcannon,36:irondefense,42:hydropump,48:surf'),
  { ability: 'torrent', cat: 'Shellfish', ht: 1.6, wt: 85.5, dex: 'The jets from its cannons can punch through steel plating. It plants its feet and braces itself before every shot.' });
S('pidgey', 'Pidgey', ['normal', 'flying'], [40, 45, 40, 35, 35, 56], 255, 50, 'ms',
  L('1:tackle,5:sandattack,9:gust,13:quickattack,17:whirlwind,21:twister,25:featherdance,29:agility,33:wingattack,37:roost,41:airslash'),
  { evo: { level: 18, into: 'pidgeotto' }, cat: 'Tiny Bird', ht: 0.3, wt: 1.8, dex: 'A gentle Pokémon that nests in the eaves of Dawnmere’s houses. Its morning song is the first sound of the day.' });
S('pidgeotto', 'Pidgeotto', ['normal', 'flying'], [63, 60, 55, 50, 50, 71], 120, 122, 'ms',
  L('1:tackle,1:sandattack,1:gust,13:quickattack,17:whirlwind,22:twister,27:featherdance,32:agility,34:wingattack,37:roost,42:airslash,47:hurricane'),
  { evo: { level: 36, into: 'pidgeot' }, cat: 'Bird', ht: 1.1, wt: 30, dex: 'It patrols a wide territory from the sky, and has been seen carrying lost Pidgey chicks back to their nests.' });
S('pidgeot', 'Pidgeot', ['normal', 'flying'], [83, 80, 75, 70, 70, 101], 45, 216, 'ms',
  L('1:tackle,1:sandattack,1:gust,13:quickattack,17:whirlwind,22:twister,27:featherdance,32:agility,34:wingattack,38:roost,44:airslash,50:hurricane,52:bravebird'),
  { cat: 'Bird', ht: 1.5, wt: 39.5, dex: 'Its crest catches the light of the Veil and glows faintly at night, like a comet skimming the sea.' });
S('sentret', 'Sentret', ['normal'], [35, 46, 34, 35, 45, 20], 255, 43, 'mf',
  L('1:scratch,1:defensecurl,4:quickattack,8:furyswipes,13:headbutt,19:slam,25:rest,31:amnesia'),
  { evo: { level: 15, into: 'furret' }, cat: 'Scout', ht: 0.8, wt: 6, dex: 'It stands on its tail to keep watch. If it spots danger, it squeaks until the whole meadow knows.' });
S('furret', 'Furret', ['normal'], [85, 76, 64, 45, 55, 90], 90, 145, 'mf',
  L('1:scratch,1:defensecurl,1:quickattack,8:furyswipes,13:headbutt,21:slam,28:rest,32:amnesia,36:doubleedge'),
  { cat: 'Long Body', ht: 1.8, wt: 32.5, dex: 'Its burrows are so twisty that even Furret sometimes get lost in them. Warm and soft to hug.' });
S('caterpie', 'Caterpie', ['bug'], [45, 30, 35, 20, 20, 45], 255, 39, 'mf',
  L('1:tackle,1:stringshot,9:bugbite'),
  { evo: { level: 7, into: 'metapod' }, cat: 'Worm', ht: 0.3, wt: 2.9, dex: 'It munches leaves from dawn to dusk. The red antenna releases a smell that birds can’t stand.' });
S('metapod', 'Metapod', ['bug'], [50, 20, 55, 25, 25, 30], 120, 72, 'mf',
  L('1:harden,7:harden'),
  { evo: { level: 10, into: 'butterfree' }, cat: 'Cocoon', ht: 0.7, wt: 9.9, dex: 'Inside its hard shell, its whole body is being rebuilt. It holds perfectly still, dreaming of wings.' });
S('butterfree', 'Butterfree', ['bug', 'flying'], [60, 45, 50, 90, 80, 70], 45, 178, 'mf',
  L('1:confusion,10:confusion,12:poisonpowder,12:stunspore,12:sleeppowder,16:gust,18:supersonic,22:psybeam,26:silverwind,30:airslash,34:bugbuzz'),
  { cat: 'Butterfly', ht: 1.1, wt: 32, dex: 'Its wings shimmer faintly with every colour of the Veil. Swarms gather in Glimmerwood on midsummer nights.' });
S('pikachu', 'Pikachu', ['electric'], [35, 55, 40, 50, 50, 90], 190, 112, 'mf',
  L('1:thundershock,1:growl,5:tailwhip,8:thunderwave,10:quickattack,16:spark,21:slam,26:agility,31:discharge,36:thunderbolt,40:irontail,44:thunder'),
  { evo: { item: 'thunderstone', into: 'raichu' }, ability: 'static', cat: 'Mouse', ht: 0.4, wt: 6, dex: 'It stores electricity in its cheeks. Groups of Pikachu in Glimmerwood light up the forest during thunderstorms.' });
S('raichu', 'Raichu', ['electric'], [60, 90, 55, 90, 80, 110], 75, 218, 'mf',
  L('1:thundershock,1:growl,1:tailwhip,8:thunderwave,10:quickattack,16:spark,21:slam,26:agility,31:discharge,36:thunderbolt,40:irontail,44:thunder'),
  { ability: 'static', cat: 'Mouse', ht: 0.8, wt: 30, dex: 'It grounds excess charge by sticking its tail into the earth. Scorched patches of soil mark where it has rested.' });
S('hoothoot', 'Hoothoot', ['normal', 'flying'], [60, 30, 30, 36, 56, 50], 255, 52, 'mf',
  L('1:tackle,1:growl,5:hypnosis,9:peck,13:confusion,21:takedown,25:airslash,29:extrasensory,33:dreameater,37:moonblast'),
  { evo: { level: 20, into: 'noctowl' }, cat: 'Owl', ht: 0.7, wt: 21.2, dex: 'It hoots at exactly the same hour each night. Lumirans once set their clocks by it.' });
S('noctowl', 'Noctowl', ['normal', 'flying'], [100, 50, 50, 86, 96, 70], 90, 158, 'mf',
  L('1:tackle,1:growl,1:hypnosis,9:peck,13:confusion,23:takedown,28:airslash,33:extrasensory,38:dreameater,43:moonblast'),
  { cat: 'Owl', ht: 1.6, wt: 40.8, dex: 'Its eyes can see the faint glow of the Veil even through heavy cloud. It is revered as a guide on winter nights.' });
S('oddish', 'Oddish', ['grass', 'poison'], [45, 50, 55, 75, 65, 30], 255, 64, 'ms',
  L('1:absorb,1:growth,7:acid,11:poisonpowder,13:stunspore,15:sleeppowder,19:megadrain,23:moonlight,27:gigadrain,31:toxic,35:petalblizzard,39:moonblast'),
  { evo: { level: 21, into: 'gloom' }, cat: 'Weed', ht: 0.5, wt: 5.4, dex: 'By day it buries itself with only its leaves showing. At night it wanders, planting seeds as it goes.' });
S('gloom', 'Gloom', ['grass', 'poison'], [60, 65, 70, 85, 75, 40], 120, 138, 'ms',
  L('1:absorb,1:growth,1:acid,11:poisonpowder,13:stunspore,15:sleeppowder,19:megadrain,24:moonlight,29:gigadrain,34:toxic,39:petalblizzard,44:moonblast'),
  { cat: 'Weed', ht: 0.8, wt: 8.6, dex: 'The nectar that drips from its mouth smells awful to people — but Mossgrove’s bees consider it a delicacy.' });
S('tangela', 'Tangela', ['grass'], [65, 55, 115, 100, 40, 60], 45, 87, 'mf',
  L('1:absorb,1:vinewhip,4:sleeppowder,10:megadrain,14:poisonpowder,17:stunspore,22:ancientpower,26:gigadrain,30:slam,36:growth,40:powerwhip'),
  { cat: 'Vine', ht: 1.0, wt: 35, dex: 'No one has ever seen what lies beneath its vines. Mossgrove’s gardeners say it is shy, not mysterious.' });
S('mareep', 'Mareep', ['electric'], [55, 40, 40, 65, 45, 35], 235, 56, 'ms',
  L('1:tackle,1:growl,4:thundershock,8:thunderwave,11:cottonspore,15:chargebeam,18:takedown,22:spark,25:confuseray,29:powergem,32:discharge,40:thunder'),
  { evo: { level: 15, into: 'flaaffy' }, ability: 'static', cat: 'Wool', ht: 0.6, wt: 7.8, dex: 'Its wool builds up static in dry weather. On cold nights the flock huddles together and glows softly.' });
S('flaaffy', 'Flaaffy', ['electric'], [70, 55, 55, 80, 60, 45], 120, 128, 'ms',
  L('1:tackle,1:growl,1:thundershock,8:thunderwave,11:cottonspore,16:chargebeam,20:takedown,24:spark,29:confuseray,34:powergem,38:discharge,46:thunder'),
  { evo: { level: 30, into: 'ampharos' }, ability: 'static', cat: 'Wool', ht: 0.8, wt: 13.3, dex: 'Its rubbery skin keeps the electricity from escaping. The blue orb on its tail flickers when it is nervous.' });
S('ampharos', 'Ampharos', ['electric'], [90, 75, 85, 115, 90, 55], 45, 230, 'ms',
  L('1:tackle,1:growl,1:thundershock,8:thunderwave,11:cottonspore,16:chargebeam,20:takedown,24:spark,29:confuseray,30:thunderbolt,34:powergem,38:discharge,42:dragonpulse,48:thunder'),
  { ability: 'static', cat: 'Light', ht: 1.4, wt: 61.5, dex: 'The light of its tail can be seen from far across the sea. The Brinecrest lighthouse has been kept by an Ampharos for a century.' });
S('zubat', 'Zubat', ['poison', 'flying'], [40, 45, 35, 30, 40, 55], 255, 49, 'mf',
  L('1:absorb,5:supersonic,7:astonish,11:bite,13:wingattack,17:confuseray,23:poisonfang,29:airslash,35:leechlife'),
  { evo: { level: 22, into: 'golbat' }, float: 1, cat: 'Bat', ht: 0.8, wt: 7.5, dex: 'It has no eyes; it maps the dark with ultrasonic cries. Emberpeak Tunnel echoes with them day and night.' });
S('golbat', 'Golbat', ['poison', 'flying'], [75, 80, 70, 65, 75, 90], 90, 159, 'mf',
  L('1:absorb,1:supersonic,1:astonish,11:bite,13:wingattack,17:confuseray,24:poisonfang,28:leechlife,33:airslash,38:crunch,43:crosspoison'),
  { float: 1, cat: 'Bat', ht: 1.6, wt: 55, dex: 'Once it bites, it will not let go until it is full. It flies clumsily when it has overeaten.' });
S('geodude', 'Geodude', ['rock', 'ground'], [40, 80, 100, 30, 30, 20], 255, 60, 'ms',
  L('1:tackle,1:defensecurl,4:mudslap,6:rockpolish,10:rockthrow,16:bulldoze,18:rocktomb,24:rockslide,30:earthquake,36:stoneedge'),
  { evo: { level: 25, into: 'graveler' }, float: 1, cat: 'Rock', ht: 0.4, wt: 20, dex: 'Travellers mistake it for an ordinary rock and trip over it. It does not find this funny.' });
S('graveler', 'Graveler', ['rock', 'ground'], [55, 95, 115, 45, 45, 35], 120, 137, 'ms',
  L('1:tackle,1:defensecurl,1:mudslap,6:rockpolish,10:rockthrow,16:bulldoze,18:rocktomb,24:rockslide,30:earthquake,38:stoneedge'),
  { cat: 'Rock', ht: 1.0, wt: 105, dex: 'It rolls down mountain slopes to travel. Cinderfall’s roads are built wide just in case.' });
S('onix', 'Onix', ['rock', 'ground'], [35, 45, 160, 30, 45, 70], 45, 77, 'mf',
  L('1:tackle,1:harden,7:rockthrow,10:rocktomb,19:rockpolish,22:screech,25:dragonbreath,28:slam,34:rockslide,40:irontail,46:stoneedge'),
  { cat: 'Rock Snake', ht: 8.8, wt: 210, dex: 'It tunnels at great speed, leaving winding caves behind. Emberpeak Tunnel is said to be the path of one ancient Onix.' });
S('magikarp', 'Magikarp', ['water'], [20, 10, 55, 15, 20, 80], 255, 40, 'slow',
  L('1:splash,15:tackle'),
  { evo: { level: 20, into: 'gyarados' }, cat: 'Fish', ht: 0.9, wt: 10, dex: 'Weak and pitiful, yet it never stops splashing. Brinecrest has a proverb: “even Magikarp swim upstream.”' });
S('gyarados', 'Gyarados', ['water', 'flying'], [95, 125, 79, 60, 100, 81], 45, 189, 'slow',
  L('1:bite,20:bite,23:dragonrage,26:leer,29:twister,32:icefang,35:aquatail,41:crunch,44:hydropump,47:dragondance,50:hyperbeam'),
  { ability: 'intimidate', cat: 'Atrocious', ht: 6.5, wt: 235, dex: 'All the frustration it endured as a Magikarp erupts at once. It is said to have levelled a harbour in a single night.' });
S('staryu', 'Staryu', ['water'], [30, 45, 55, 70, 55, 85], 225, 68, 'slow',
  L('1:tackle,1:harden,4:watergun,7:rapidspin,10:recover,13:confusion,16:swift,20:bubblebeam,26:powergem,32:surf,40:hydropump'),
  { evo: { item: 'waterstone', into: 'starmie' }, float: 1, cat: 'Star Shape', ht: 0.8, wt: 34.5, dex: 'On summer nights, Staryu wash up on Brinecrest beach and their cores blink in time with the stars.' });
S('starmie', 'Starmie', ['water', 'psychic'], [60, 75, 85, 100, 85, 115], 60, 182, 'slow',
  L('1:watergun,1:rapidspin,1:recover,1:swift,20:bubblebeam,24:psybeam,28:powergem,32:psychic,36:surf,44:hydropump'),
  { float: 1, cat: 'Mysterious', ht: 1.1, wt: 80, dex: 'Its core glows in seven colours. Some believe it sends signals to the Veil itself.' });
S('gastly', 'Gastly', ['ghost', 'poison'], [30, 35, 30, 100, 35, 80], 190, 62, 'ms',
  L('1:hypnosis,1:lick,5:astonish,15:nightshade,19:confuseray,23:hex,29:shadowball,33:dreameater,36:darkpulse,40:sludgebomb'),
  { evo: { level: 25, into: 'haunter' }, float: 1, ability: 'levitate', cat: 'Gas', ht: 1.3, wt: 0.1, dex: 'Its body is made of gas that can envelop a person. A strong wind will blow it away — it tries to avoid breezy hilltops.' });
S('haunter', 'Haunter', ['ghost', 'poison'], [45, 50, 45, 115, 55, 95], 90, 142, 'ms',
  L('1:hypnosis,1:lick,1:astonish,15:nightshade,19:confuseray,25:shadowclaw,29:hex,33:shadowball,39:dreameater,44:darkpulse,50:sludgebomb'),
  { evo: { level: 38, into: 'gengar' }, float: 1, ability: 'levitate', cat: 'Gas', ht: 1.6, wt: 0.1, dex: 'It slips through walls to tap people on the shoulder. It laughs itself silly when they jump.' });
S('gengar', 'Gengar', ['ghost', 'poison'], [60, 65, 60, 130, 75, 110], 45, 225, 'ms',
  L('1:hypnosis,1:lick,1:astonish,15:nightshade,19:confuseray,25:shadowclaw,29:hex,33:shadowball,39:dreameater,44:darkpulse,50:sludgebomb'),
  { ability: 'levitate', cat: 'Shadow', ht: 1.5, wt: 40.5, dex: 'When the room feels suddenly cold, a Gengar may be hiding in your shadow, grinning.' });
S('eevee', 'Eevee', ['normal'], [55, 55, 50, 45, 65, 55], 45, 65, 'mf',
  L('1:tackle,1:tailwhip,5:sandattack,9:growl,13:quickattack,17:bite,20:swift,25:takedown,29:charm,37:doubleedge'),
  { evo: { level: 20, time: 'night', into: 'umbreon' }, cat: 'Evolution', ht: 0.3, wt: 6.5, dex: 'Its genes are unstable. Lumiran lore says an Eevee becomes whatever its partner most needs it to be.' });
S('umbreon', 'Umbreon', ['dark'], [95, 65, 110, 60, 130, 65], 45, 184, 'mf',
  L('1:tackle,1:tailwhip,1:sandattack,9:growl,13:quickattack,17:confuseray,20:faintattack,25:moonlight,29:screech,33:darkpulse,37:crunch'),
  { cat: 'Moonlight', ht: 1.0, wt: 27, dex: 'Its rings glow when moonlight touches them. It evolved beneath the night sky, loyal to a trainer who found beauty in the dark.' });
S('houndour', 'Houndour', ['dark', 'fire'], [45, 60, 30, 80, 50, 65], 120, 66, 'slow',
  L('1:leer,1:ember,8:smog,13:roar,16:bite,20:firefang,26:faintattack,30:flamethrower,35:crunch,40:nastyplot,44:darkpulse'),
  { evo: { level: 24, into: 'houndoom' }, cat: 'Dark', ht: 0.6, wt: 10.8, dex: 'Packs communicate with eerie howls. Team Ashen trains them to guard their facilities through the night.' });
S('houndoom', 'Houndoom', ['dark', 'fire'], [75, 90, 50, 110, 80, 95], 45, 175, 'slow',
  L('1:leer,1:ember,1:smog,13:roar,16:bite,20:firefang,24:faintattack,30:flamethrower,35:crunch,40:nastyplot,44:darkpulse'),
  { cat: 'Dark', ht: 1.4, wt: 35, dex: 'The flames it breathes contain toxins; burns from them sting for days. Its howl chills anyone who hears it.' });
S('murkrow', 'Murkrow', ['dark', 'flying'], [60, 85, 42, 85, 42, 91], 30, 81, 'ms',
  L('1:peck,1:astonish,5:pursuit,11:wingattack,15:nightshade,21:faintattack,31:darkpulse,35:drillpeck,41:bravebird'),
  { cat: 'Darkness', ht: 0.5, wt: 2.1, dex: 'It steals shiny things and hoards them. Grey feathers found at a scene are a sure sign of Team Ashen.' });
S('koffing', 'Koffing', ['poison'], [40, 65, 95, 60, 45, 35], 190, 68, 'mf',
  L('1:poisongas,1:tackle,4:smog,7:smokescreen,15:sludge,21:willowisp,26:toxic,34:sludgebomb'),
  { evo: { level: 35, into: 'weezing' }, float: 1, ability: 'levitate', cat: 'Poison Gas', ht: 0.6, wt: 1, dex: 'It floats on toxic gas. Near factories it grows round and content, which says nothing good about the air.' });
S('weezing', 'Weezing', ['poison'], [65, 90, 120, 85, 70, 60], 60, 172, 'mf',
  L('1:poisongas,1:tackle,1:smog,7:smokescreen,15:sludge,21:willowisp,26:toxic,34:sludgebomb,40:darkpulse'),
  { float: 1, ability: 'levitate', cat: 'Poison Gas', ht: 1.2, wt: 9.5, dex: 'Two Koffing that share one cloud of gas. The heads argue constantly but never drift apart.' });
S('magnemite', 'Magnemite', ['electric', 'steel'], [25, 35, 70, 95, 55, 45], 190, 65, 'mf',
  L('1:tackle,1:supersonic,5:thundershock,7:thunderwave,11:magnetbomb,15:spark,19:mirrorshot,23:metalsound,29:flashcannon,33:screech,37:discharge,43:thunder'),
  { evo: { level: 30, into: 'magneton' }, float: 1, ability: 'levitate', cat: 'Magnet', ht: 0.3, wt: 6, dex: 'It feeds on electricity from power lines. Team Ashen uses swarms of them to run their Dimmer machines.' });
S('magneton', 'Magneton', ['electric', 'steel'], [50, 60, 95, 120, 70, 70], 60, 163, 'mf',
  L('1:tackle,1:supersonic,1:thundershock,7:thunderwave,11:magnetbomb,15:spark,19:mirrorshot,23:metalsound,29:flashcannon,33:screech,37:discharge,43:thunder'),
  { float: 1, ability: 'levitate', cat: 'Magnet', ht: 1.0, wt: 60, dex: 'Three Magnemite linked by magnetism. It makes the air crackle and dries the ground wherever it hovers.' });
S('sneasel', 'Sneasel', ['dark', 'ice'], [55, 95, 55, 35, 75, 115], 60, 86, 'ms',
  L('1:scratch,1:leer,8:quickattack,10:faintattack,14:iceshard,16:furyswipes,20:agility,22:metalclaw,25:honeclaws,32:screech,35:slash,40:icepunch,45:nightslash'),
  { cat: 'Sharp Claw', ht: 0.9, wt: 28, dex: 'It prowls the snowfields of Frostveil, climbing trees to raid nests. Its hooked claws leave telltale tracks.' });
S('misdreavus', 'Misdreavus', ['ghost'], [60, 60, 60, 85, 85, 85], 45, 87, 'fast',
  L('1:growl,1:confusion,5:astonish,10:confuseray,19:hex,24:psybeam,30:shadowball,37:powergem'),
  { float: 1, ability: 'levitate', cat: 'Screech', ht: 0.7, wt: 1, dex: 'It sobs softly in the dark to startle people, then drinks in their fright. The pearls on its neck glow at dusk.' });
S('growlithe', 'Growlithe', ['fire'], [55, 70, 45, 70, 50, 60], 190, 70, 'slow',
  L('1:bite,1:roar,6:ember,8:leer,17:flamewheel,21:firefang,23:takedown,30:agility,34:flamethrower,39:crunch,45:heatwave,50:flareblitz'),
  { evo: { item: 'firestone', into: 'arcanine' }, ability: 'intimidate', cat: 'Puppy', ht: 0.7, wt: 19, dex: 'Fiercely loyal. Cinderfall’s fire brigade has partnered with Growlithe for generations.' });
S('arcanine', 'Arcanine', ['fire'], [90, 110, 80, 100, 80, 95], 75, 194, 'slow',
  L('1:bite,1:roar,1:extremespeed,6:ember,8:leer,17:flamewheel,21:firefang,23:takedown,30:agility,34:flamethrower,39:crunch,45:heatwave,50:flareblitz'),
  { ability: 'intimidate', cat: 'Legendary', ht: 1.9, wt: 155, dex: 'Its majestic bearing has captivated people for ages. It is said to run ten thousand kilometres in a single day and night.' });
S('ponyta', 'Ponyta', ['fire'], [50, 85, 55, 65, 65, 90], 190, 82, 'mf',
  L('1:growl,1:tackle,4:tailwhip,9:ember,13:flamewheel,17:stomp,21:flamecharge,29:takedown,33:agility,37:flamethrower,41:fireblast,49:flareblitz'),
  { cat: 'Fire Horse', ht: 1.0, wt: 30, dex: 'Its mane burns gently for those it trusts, and fiercely for everyone else. Foals race along the volcanic ridges at dawn.' });
S('snorlax', 'Snorlax', ['normal'], [160, 110, 65, 65, 110, 30], 25, 189, 'slow',
  L('1:tackle,4:defensecurl,9:amnesia,12:lick,17:headbutt,25:bodyslam,28:rest,36:crunch,44:earthquake,50:hyperbeam'),
  { cat: 'Sleeping', ht: 2.1, wt: 460, dex: 'It sleeps wherever it pleases, even across main roads. Only certain sounds can rouse it — old songs, mostly.' });
S('tyranitar', 'Tyranitar', ['rock', 'dark'], [100, 134, 110, 95, 100, 61], 45, 270, 'slow',
  L('1:bite,1:leer,1:screech,10:rockslide,14:scaryface,23:darkpulse,31:crunch,34:earthquake,40:stoneedge,50:hyperbeam'),
  { cat: 'Armor', ht: 2.0, wt: 202, dex: 'Mountains crumble to make room for it. It walks the world looking for an opponent worthy of its strength.' });
S('hooh', 'Ho-Oh', ['fire', 'flying'], [106, 130, 90, 110, 154, 90], 3, 306, 'slow',
  L('1:gust,9:flamewheel,15:recover,23:extrasensory,29:airslash,37:sacredfire,43:ancientpower,51:bravebird,65:fireblast'),
  { ability: 'pressure', legendary: 1, cat: 'Rainbow', ht: 3.8, wt: 199, dex: 'Lumiran legend says its feathers painted every colour in the world. The Veil that dances over the region each night is the trail of its flight.' });

// ── natures ─────────────────────────────────────────────────────────────────
const NATURES = [
  ['Hardy', null, null], ['Lonely', 'atk', 'def'], ['Brave', 'atk', 'spe'], ['Adamant', 'atk', 'spa'], ['Naughty', 'atk', 'spd'],
  ['Bold', 'def', 'atk'], ['Docile', null, null], ['Relaxed', 'def', 'spe'], ['Impish', 'def', 'spa'], ['Lax', 'def', 'spd'],
  ['Timid', 'spe', 'atk'], ['Hasty', 'spe', 'def'], ['Serious', null, null], ['Jolly', 'spe', 'spa'], ['Naive', 'spe', 'spd'],
  ['Modest', 'spa', 'atk'], ['Mild', 'spa', 'def'], ['Quiet', 'spa', 'spe'], ['Bashful', null, null], ['Rash', 'spa', 'spd'],
  ['Calm', 'spd', 'atk'], ['Gentle', 'spd', 'def'], ['Sassy', 'spd', 'spe'], ['Careful', 'spd', 'spa'], ['Quirky', null, null],
];
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_NAME = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' };

const ABILITIES = {
  overgrow: ['Overgrow', 'Powers up Grass moves in a pinch.'], blaze: ['Blaze', 'Powers up Fire moves in a pinch.'],
  torrent: ['Torrent', 'Powers up Water moves in a pinch.'], static: ['Static', 'Contact may paralyze the attacker.'],
  levitate: ['Levitate', 'Gives full immunity to Ground moves.'], intimidate: ['Intimidate', 'Lowers the foe’s Attack on entry.'],
  pressure: ['Pressure', 'A majestic, overwhelming aura.'], none: ['Keen Spirit', 'A spirited Pokémon.'],
};

// ── items ───────────────────────────────────────────────────────────────────
const ITEMS = {
  potion: { name: 'Potion', pocket: 'items', price: 200, heal: 20, desc: 'Restores 20 HP to one Pokémon.' },
  superpotion: { name: 'Super Potion', pocket: 'items', price: 700, heal: 60, desc: 'Restores 60 HP to one Pokémon.' },
  hyperpotion: { name: 'Hyper Potion', pocket: 'items', price: 1200, heal: 120, desc: 'Restores 120 HP to one Pokémon.' },
  fullrestore: { name: 'Full Restore', pocket: 'items', price: 3000, heal: 9999, cure: 'all', desc: 'Fully restores HP and heals any status.' },
  antidote: { name: 'Antidote', pocket: 'items', price: 100, cure: ['psn', 'tox'], desc: 'Cures a poisoned Pokémon.' },
  parlyzheal: { name: 'Paralyze Heal', pocket: 'items', price: 200, cure: ['par'], desc: 'Cures a paralyzed Pokémon.' },
  awakening: { name: 'Awakening', pocket: 'items', price: 250, cure: ['slp'], desc: 'Wakes up a sleeping Pokémon.' },
  burnheal: { name: 'Burn Heal', pocket: 'items', price: 250, cure: ['brn'], desc: 'Heals a burned Pokémon.' },
  iceheal: { name: 'Ice Heal', pocket: 'items', price: 250, cure: ['frz'], desc: 'Thaws a frozen Pokémon.' },
  fullheal: { name: 'Full Heal', pocket: 'items', price: 600, cure: 'all', desc: 'Heals any status problem.' },
  revive: { name: 'Revive', pocket: 'items', price: 1500, revive: 0.5, desc: 'Revives a fainted Pokémon with half its HP.' },
  repel: { name: 'Repel', pocket: 'items', price: 350, repel: 100, desc: 'Keeps weak wild Pokémon away for 100 steps.' },
  rarecandy: { name: 'Rare Candy', pocket: 'items', price: 0, candy: 1, desc: 'Raises a Pokémon’s level by one.' },
  thunderstone: { name: 'Thunder Stone', pocket: 'items', price: 2100, stone: 1, desc: 'A peculiar stone that crackles with static.' },
  waterstone: { name: 'Water Stone', pocket: 'items', price: 2100, stone: 1, desc: 'A clear blue stone. It feels cool to the touch.' },
  firestone: { name: 'Fire Stone', pocket: 'items', price: 2100, stone: 1, desc: 'A stone with a flame flickering at its core.' },
  pokeball: { name: 'Poké Ball', pocket: 'balls', price: 200, ball: 1, desc: 'A device for catching wild Pokémon.' },
  greatball: { name: 'Great Ball', pocket: 'balls', price: 600, ball: 1.5, desc: 'A good ball with a higher catch rate.' },
  ultraball: { name: 'Ultra Ball', pocket: 'balls', price: 1200, ball: 2, desc: 'A very high-performance ball.' },
  townmap: { name: 'Town Map', pocket: 'key', price: 0, key: 'map', desc: 'A map of Lumira. Shows where you are.' },
  veilchime: { name: 'Veil Chime', pocket: 'key', price: 0, desc: 'An old silver chime. Its tone sounds like the aurora feels.' },
  tm01: { name: 'TM01 Magical Leaf', pocket: 'tms', price: 0, tm: 'magicalleaf', desc: 'Teaches Magical Leaf. It never misses.' },
  tm02: { name: 'TM02 Water Pulse', pocket: 'tms', price: 0, tm: 'waterpulse', desc: 'Teaches Water Pulse. May confuse.' },
  tm03: { name: 'TM03 Flame Charge', pocket: 'tms', price: 0, tm: 'flamecharge', desc: 'Teaches Flame Charge. Raises Speed.' },
  tm04: { name: 'TM04 Aerial Ace', pocket: 'tms', price: 0, tm: 'aerialace', desc: 'Teaches Aerial Ace. It never misses.' },
  tm05: { name: 'TM05 Rock Tomb', pocket: 'tms', price: 0, tm: 'rocktomb', desc: 'Teaches Rock Tomb. Lowers Speed.' },
  tm06: { name: 'TM06 Shadow Ball', pocket: 'tms', price: 0, tm: 'shadowball', desc: 'Teaches Shadow Ball.' },
  tm07: { name: 'TM07 Thunder Wave', pocket: 'tms', price: 0, tm: 'thunderwave', desc: 'Teaches Thunder Wave. Paralyzes.' },
  tm08: { name: 'TM08 Brick Break', pocket: 'tms', price: 0, tm: 'brickbreak', desc: 'Teaches Brick Break.' },
  tm09: { name: 'TM09 Aurora Beam', pocket: 'tms', price: 0, tm: 'aurorabeam', desc: 'Teaches Aurora Beam, a rainbow ray.' },
  tm10: { name: 'TM10 Dazzling Gleam', pocket: 'tms', price: 0, tm: 'dazzlinggleam', desc: 'Teaches Dazzling Gleam.' },
};
const TM_COMPAT = {
  magicalleaf: { types: ['grass'], extra: ['butterfree', 'hooh', 'eevee'] },
  waterpulse: { types: ['water'], extra: ['ampharos', 'flaaffy', 'mareep', 'eevee', 'umbreon', 'snorlax', 'tyranitar', 'gyarados', 'hoothoot', 'noctowl'] },
  flamecharge: { types: ['fire'], extra: ['snorlax', 'eevee', 'umbreon'] },
  aerialace: { types: ['flying'], extra: ['charmander', 'charmeleon', 'sneasel', 'sentret', 'furret', 'pikachu', 'raichu', 'eevee', 'umbreon', 'growlithe', 'arcanine', 'gengar', 'haunter'] },
  rocktomb: { types: ['rock', 'ground'], extra: ['charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise', 'snorlax', 'gengar', 'ampharos', 'furret', 'raichu', 'pikachu', 'tangela'] },
  shadowball: { types: ['ghost', 'psychic', 'dark'], extra: ['snorlax', 'eevee', 'noctowl', 'hoothoot', 'butterfree', 'starmie', 'staryu', 'weezing', 'koffing', 'hooh'] },
  thunderwave: { types: ['electric'], extra: ['starmie', 'staryu', 'gastly', 'haunter', 'gengar', 'tyranitar', 'misdreavus'] },
  brickbreak: { types: ['fighting'], extra: ['charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise', 'pikachu', 'raichu', 'geodude', 'graveler', 'snorlax', 'gengar', 'haunter', 'sneasel', 'tyranitar', 'ampharos', 'flaaffy', 'sentret', 'furret'] },
  aurorabeam: { types: ['ice', 'water'], extra: ['hooh', 'misdreavus', 'ampharos', 'starmie', 'umbreon'] },
  dazzlinggleam: { types: ['fairy', 'psychic'], extra: ['hooh', 'misdreavus', 'ampharos', 'butterfree', 'oddish', 'gloom', 'eevee', 'umbreon', 'staryu', 'starmie', 'venusaur', 'gengar'] },
};
function canLearnTM(speciesId, move) {
  const c = TM_COMPAT[move]; if (!c) return false;
  const sp = SPECIES[speciesId];
  if (sp.id === 'magikarp' || sp.id === 'caterpie' || sp.id === 'metapod') return false;
  return sp.types.some(t => c.types.includes(t)) || c.extra.includes(speciesId);
}

// ── experience ──────────────────────────────────────────────────────────────
function expForLevel(growth, n) {
  if (n <= 1) return 0;
  switch (growth) {
    case 'fast': return Math.floor(4 * n * n * n / 5);
    case 'ms': return Math.max(0, Math.floor(1.2 * n * n * n - 15 * n * n + 100 * n - 140));
    case 'slow': return Math.floor(5 * n * n * n / 4);
    default: return n * n * n;
  }
}

const TRAINER_CLASSES = {
  youngster: { title: 'Youngster', pay: 16 }, lass: { title: 'Lass', pay: 16 }, bugcatcher: { title: 'Bug Catcher', pay: 12 },
  picnicker: { title: 'Picnicker', pay: 20 }, camper: { title: 'Camper', pay: 20 }, hiker: { title: 'Hiker', pay: 36 },
  sailor: { title: 'Sailor', pay: 32 }, fisher: { title: 'Fisherman', pay: 32 }, gardener: { title: 'Gardener', pay: 28 },
  beauty: { title: 'Beauty', pay: 56 }, birdkeeper: { title: 'Bird Keeper', pay: 32 }, acetrainer: { title: 'Ace Trainer', pay: 60 },
  grunt: { title: 'Ashen Grunt', pay: 40 }, gruntf: { title: 'Ashen Grunt', pay: 40 }, admin: { title: 'Ashen Admin', pay: 80 },
  leader: { title: 'Gym Leader', pay: 100 }, rival: { title: 'Rival', pay: 40 }, boss: { title: 'Ashen Director', pay: 120 },
  hexmaniac: { title: 'Hex Maniac', pay: 32 }, skier: { title: 'Skier', pay: 36 }, scientist: { title: 'Scientist', pay: 48 },
  swimmer: { title: 'Swimmer', pay: 20 }, firebreather: { title: 'Firebreather', pay: 36 },
};
