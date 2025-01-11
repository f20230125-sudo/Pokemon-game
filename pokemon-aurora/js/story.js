'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Story scripts.  Each is a generator run by the overworld: (S, npc) => ...
// ─────────────────────────────────────────────────────────────────────────────
const SPK = {
  mom: { name: 'Mom', color: 'f' }, linden: { name: 'Prof. Linden', color: 'm' }, sable: { name: 'Sable', color: 'v' },
  bramble: { name: 'Bramble', color: 'f' }, maris: { name: 'Maris', color: 'f' }, blaise: { name: 'Blaise', color: 'm' },
  slate: { name: 'Slate', color: 's' }, gris: { name: 'Gris', color: 's' }, vane: { name: 'Vane', color: 's' }, unknown: { name: '???', color: 's' },
  keeper: { name: 'Keeper Ansel', color: 'm' }, grunt: { name: 'Ashen Grunt', color: 'm' }, gruntf: { name: 'Ashen Grunt', color: 'f' }, nurse: { name: 'Nurse', color: 'f' },
  narr: {},
};
function* T(spk, ...lines) { for (const l of lines) yield new Say(l, SPK[spk] || {}); }
const say1 = (spk, l) => new Say(l, SPK[spk] || {});
const COUNTER = { bulbasaur: ['charmander', 'charmeleon', 'charizard'], charmander: ['squirtle', 'wartortle', 'blastoise'], squirtle: ['bulbasaur', 'ivysaur', 'venusaur'] };
const COLOR_WORD = { charmander: 'red', squirtle: 'blue', bulbasaur: 'green' };
function sableTeam(stage) {
  const c = COUNTER[G.starter || 'charmander'];
  if (stage === 1) return [[c[0], 5]];
  if (stage === 2) return [['pidgey', 12], ['eevee', 12], [c[0], 14]];
  if (stage === 3) return [['pidgeotto', 26], ['umbreon', 27], [c[1], 28]];
  return [['pidgeot', 45], ['umbreon', 46], ['gengar', 45], [c[2], 48]];
}
function sableTrainer(stage, o = {}) {
  return Object.assign({ cls: 'rival', name: 'Sable', title: 'Rival Sable', art: stage === 3 ? 'sableAsh' : 'sable', party: sableTeam(stage), prize: [0, 150, 600, 1500, 4000][stage], smart: stage > 1 }, o);
}

const STORY = {
  none: function* () {},
  // ── music selectors ──
  mossMusic: () => (G.flags.moss_restored ? 'dawnmere' : 'ashen'),
  lhMusic: () => (G.flags.light_restored ? 'harbor' : 'ashen'),
  cinderMusic: () => (G.flags.plant_down ? 'cinderfall' : 'ashen'),
  summitMusic: () => (G.flags.summit_done ? 'title' : 'spire'),

  // ═══════════════════════════ DAWNMERE ═══════════════════════════
  *momTalk(S, n) {
    if (!G.flags.starter) { yield* T('mom', 'Professor Linden’s lab is the big white building across the square.', 'Go on, sweetie! He’s been waiting all morning.'); return; }
    if (!G.flags.town_map) {
      yield* T('mom', 'Oh! Is that your very own Pokémon? It’s adorable!', 'So you’re really going on a journey... Here, take this.');
      yield* S.give('townmap');
      yield* T('mom', 'Your father always said a Trainer should know where they stand.', 'Now, let me take care of your team before you go.');
      G.flags.town_map = true;
    } else yield* T('mom', 'You look tired, sweetie. Let me make you something warm.');
    yield fadeOut(12); S.heal(); Sound.jingle('heal', Sound.current()); yield 70; yield fadeIn(12);
    yield* T('mom', 'There you go! Good as new.', 'Remember — you can always come home.');
  },
  *blockerTrig(S) {
    const kid = S.npc('blocker');
    if (kid) { S.faceTo(kid, S.player); Sound.sfx('exclaim'); yield S.emote(kid, '!'); }
    yield new Say('Hey! Wait up! You can’t go into the tall grass without a Pokémon!', { color: 'm' });
    yield new Say('Wild Pokémon jump out of the grass! Go see Professor Linden first!', { color: 'm' });
    yield* S.move(S.player, 'd');
  },
  *blocker(S) { yield new Say('Professor Linden’s lab is the big white building. Go on!', { color: 'm' }); },

  // ═══════════════════════════ THE LAB ═══════════════════════════
  *labIntro(S) {
    const L = S.npc('linden'), sb = S.npc('sable');
    yield 16;
    Sound.sfx('exclaim'); yield S.emote(L, '!');
    yield* T('linden', '{PLAYER}! Right on time. Sable’s been pacing a hole in my floor.');
    S.faceTo(sb, S.player);
    yield* T('sable', 'I have not. I was... measuring. For science.');
    yield* S.move(S.player, 'u2');
    S.face(S.player, 'up'); S.face(sb, 'left');
    yield* T('linden', 'I have a favor to ask of you — of both of you, really.',
      'You’ve heard about the Greyfall. Places losing their color... Pokémon losing their spark. It’s spreading, and I can’t study it from behind a desk.',
      'I need someone to travel Lumira, see it with their own eyes, and record every Pokémon they meet along the way.',
      'But the road is no place to walk alone. So... I’d like you to choose a partner.',
      'On the table are three Pokémon. Go on — take a look!');
    G.flags.lab_intro_done = true;
    yield* T('sable', 'Go ahead. I’ll pick after you. Grandpa says it’s polite.', '(...And I want to see which one you pick, so I can take the one that beats it.)');
  },
  *sableLab(S) {
    if (!G.flags.starter) yield* T('sable', 'Grandpa’s been planning this all week. He even ironed his lab coat.', '...Don’t tell him I told you.');
  },
  *starterBall(S, n) {
    const sp = n.def.data;
    if (!G.flags.lab_intro_done) { yield new Say('Three Poké Balls rest on the table.'); return; }
    if (G.flags.starter) { yield new Say('That’s one of Professor Linden’s Pokémon.'); return; }
    const info = {
      bulbasaur: ['Bulbasaur', 'the Grass-type Pokémon', 'The seed on its back drinks in the morning light.'],
      charmander: ['Charmander', 'the Fire-type Pokémon', 'The flame on its tail shows exactly how it feels.'],
      squirtle: ['Squirtle', 'the Water-type Pokémon', 'It hides in its shell when it’s shy... and when it’s plotting a prank.'],
    }[sp];
    Sound.cry(sp);
    const pre = c => drawMonPreview(c, sp, S.t);
    yield new Say(`Ah! ${info[0]}, ${info[1]}! ${info[2]}`, Object.assign({ pre }, SPK.linden));
    const r = yield* ask(`Will you choose ${info[0]}?`, ['Yes', 'No'], Object.assign({ pre }, SPK.linden));
    if (r !== 0) return;
    G.starter = sp; G.flags.starter = true; G.flags['starter_' + sp + '_taken'] = true;
    S.removeNpc(n.id);
    yield* S.givePoke(sp, 5);
    // Sable picks
    const c = COUNTER[sp][0];
    const sb = S.npc('sable');
    const ballN = S.npcs.find(e => e.def && e.def.data === c);
    yield* T('sable', 'Then I’ll take this one.');
    yield* S.move(sb, 'u');
    yield* S.move(sb, 'l'.repeat(Math.max(0, sb.x - ballN.x - 0)) || '');
    S.face(sb, 'down');
    if (sb.x === ballN.x && sb.y === ballN.y - 1) { /* already above */ }
    G.flags['starter_' + c + '_taken'] = true;
    S.removeNpc(ballN.id);
    Sound.cry(c);
    yield* T('sable', '...Grandpa, which one’s this again?');
    yield* T('linden', `That’s ${SPECIES[c].name}, my dear. The ${COLOR_WORD[c]} one.`);
    yield* T('sable', `Right. The ${COLOR_WORD[c]} one. Obviously.`);
    S.faceTo(sb, S.player); S.faceTo(S.player, sb);
    yield* T('sable', '{PLAYER}. Grandpa says a Trainer’s first battle is the one you remember forever.', 'So let’s make it memorable. For me.');
    const res = yield* S.battle(sableTrainer(1, { lose: 'Huh. Beginner’s luck.', win: 'Ha! Guess I’m a natural.' }), { canLose: true, env: 'gym' });
    if (res === 'win') yield* T('sable', '...Next time I won’t go easy on you.'); else yield* T('sable', 'Don’t feel bad. Somebody had to lose.');
    S.heal();
    yield* T('linden', 'Splendid! Splendid, both of you! Here, let me patch up your partners.');
    Sound.jingle('heal', Sound.current()); yield 60;
    yield* T('linden', 'Now, {PLAYER}, this is for you — the Pokédex!', 'It automatically records every Pokémon you encounter. Think of it as a diary of your journey.');
    G.flags.dex = true;
    Sound.jingle('item', Sound.current());
    yield new Say(`${G.name} received the Pokédex!`, { wait: 1 });
    yield* T('linden', 'And take these, too.');
    yield* S.give('pokeball', 5);
    yield* T('linden', 'Head north through Route 1 to Mossgrove Town. The Greyfall struck its Elder Tree hardest of all.',
      'There’s one more thing you should know. Far to the north stands the Prism Spire.',
      'Its great door opens only for a Trainer who carries three Prism Badges — red, green and blue. The three lights.',
      'Mixed together, they make every color there is.',
      'If the answer to the Greyfall lies anywhere, I believe it’s at the top of that Spire.');
    S.faceTo(sb, S.player);
    yield* T('sable', 'Three badges, huh.', 'Race you.');
    const px = S.player.x;
    yield* S.move(sb, sb.x === px ? 'r' : '');
    yield* S.move(sb, 'd' + Math.max(1, 9 - sb.y));
    S.removeNpc('sable');
    Sound.sfx('door');
    G.flags.sable_left_lab = true;
    yield S.emote(S.npc('linden'), '...');
    yield* T('linden', 'Oh, that girl.');
  },
  *lindenTalk(S) {
    if (!G.flags.starter) { yield* T('linden', 'Go on, {PLAYER}! Choose a partner from the table.'); return; }
    if (G.flags.postgame) {
      if (!G.flags.sable_rematch) {
        yield* T('linden', 'Aldric has been helping me restart the aurora charts. Our first project together in fifteen years.', 'Sable’s in the back. I believe she’s been waiting for you.');
        return;
      }
      yield* T('linden', 'The Veil has never been brighter. Thank you, {PLAYER}. For everything.');
      return;
    }
    if (!G.flags.linden_sable) {
      yield* T('linden', '{PLAYER}... may I tell you something about Sable?',
        'She was born unable to see color. Only light and dark — every shade of grey. The doctors call it achromatopsia.',
        'She never complains. Not once. But every time someone gasps at the Veil, or cries over a grey flower...',
        'I see her go very quiet.',
        'Keep an eye on her for me, would you? She’d never admit it, but she’s glad you’re her rival.');
      G.flags.linden_sable = true; return;
    }
    const seen = Dex.seenCount(), own = Dex.caughtCount();
    yield* T('linden', `Let’s see your Pokédex... ${seen} seen and ${own} caught!`, own < 10 ? 'A fine start! Every Pokémon you meet teaches us something.' : own < 25 ? 'Wonderful progress! The Pokémon of Lumira are warming to you.' : 'Remarkable! You may know Lumira’s Pokémon better than I do.');
  },

  // ═══════════════════════════ MOSSGROVE ═══════════════════════════
  *mossEastBlock(S) {
    const r = S.npc('ranger');
    if (r) S.faceTo(r, S.player);
    yield new Say('Hold on! Glimmerwood’s gotten dangerous since the grey-coats showed up.', { color: 'm' });
    yield new Say('Bramble asked me not to let anyone through without a Prism Badge. Sorry, kid!', { color: 'm' });
    yield* S.move(S.player, 'l');
  },
  *mossRepel(S) {
    if (!G.flags.moss_repel) { yield new Say('My garden’s been overrun with wild Pokémon since the tree went grey. Take these, would you?', { color: 'm' }); yield* S.give('repel', 3); G.flags.moss_repel = true; return; }
    yield new Say('Repels keep weaker wild Pokémon away. Handy for a quick trip!', { color: 'm' });
  },
  *brambleTree(S) {
    yield* T('bramble', 'Please, dear, those people won’t listen to an old woman.', 'That tree has watched over Mossgrove for three hundred years...');
  },
  *mossGrunts(S, n) {
    const g1 = S.npc('grunt1'), g2 = S.npc('grunt2');
    S.faceTo(g1, S.player); S.faceTo(g2, S.player);
    if (!G.flags.moss_g1) {
      yield* T('grunt', 'Huh? A kid? Scram. Team Ashen is working here.', '...You’re not leaving, are you. Fine. Let’s make this quick.');
      const r = yield* S.battle({ cls: 'grunt', name: '', title: 'Ashen Grunt', art: 'grunt', party: [['zubat', 8], ['koffing', 9]], lose: 'What?! A kid beat me?!' });
      if (r !== 'win') return;
      G.flags.moss_g1 = true;
    }
    if (!G.flags.moss_g2) {
      yield* T('gruntf', 'Ugh, you’re useless! Move over. I’ll handle this brat myself!');
      const r = yield* S.battle({ cls: 'gruntf', name: '', title: 'Ashen Grunt', art: 'gruntf', party: [['houndour', 9], ['zubat', 9]], lose: 'This... wasn’t in the briefing!' });
      if (r !== 'win') return;
      G.flags.moss_g2 = true;
    }
    yield* T('grunt', 'Tch! Whatever! We drained most of the hue from this dump anyway!');
    yield* T('gruntf', 'The Director is going to hear about you, kid.');
    Sound.sfx('run');
    yield* S.moveAll([[g1, 'd8', 8], [g2, 'd8', 8]]);
    S.removeNpc('grunt1'); S.removeNpc('grunt2');
    const b = S.npc('bramble');
    yield* S.move(b, 'r');
    S.faceTo(b, S.player);
    yield* T('bramble', 'Oh, thank you, dear. Thank you!', 'Now... let’s get that dreadful thing out of my tree’s roots.');
    yield* S.move(b, 'u');
    S.face(b, 'right');
    yield 20;
    Sound.sfx('machine');
    S.removeNpc('rod');
    yield new Say('Bramble pulled the grey pylon out of the roots!');
    Game.shake(2, 20);
    yield 30;
    yield* S.restore(0, 'moss_restored');
    S.rebuild();
    Sound.play('dawnmere');
    yield 20;
    S.faceTo(b, S.player);
    yield* T('bramble', 'Look at that... it remembers its colors. Just like when I was a girl.',
      'Those people call themselves Team Ashen. They’ve been driving those rods into places all over Lumira, draining something they call “hue.”',
      'I don’t understand it. But I know what it felt like, watching my tree go grey.',
      'Like forgetting a dear friend’s face.',
      'I’m Bramble, dear — the Gym Leader here. When you’re ready, come and see me at the Gym.',
      'I’d like to see what kind of Trainer stands up for an old tree.');
    G.flags.moss_bramble_gym = true;
    yield* S.move(b, 'd2r4', 12);
    S.removeNpc('bramble');
  },
  *brambleGym(S) {
    if (!G.badges.green) {
      yield* T('bramble', 'Welcome to my garden, dear.', 'Grass-types are patient. They grow slowly, bend in the storm, and never, ever stop reaching for the light.', 'Let’s see if you’ve got a little of that in you!');
      const r = yield* S.battle({ cls: 'leader', name: 'Bramble', title: 'Leader Bramble', art: 'bramble', party: [['oddish', 12], ['tangela', 14]], items: ['superpotion'], smart: 1, prize: 1400, lose: 'My, my. You’ve got deep roots, dear.' });
      if (r !== 'win') return;
      yield* T('bramble', 'Wonderful! You and your Pokémon grow together. I could see it.', 'This is proof that you beat me — the Verdant Prism.');
      yield* S.badge('green', 'Verdant Prism');
      yield* T('bramble', 'It holds the green light — the light of every growing thing. Hold it up to the sun sometime. You’ll see.', 'And take this, too.');
      yield* S.give('tm01');
      yield* T('bramble', 'That TM teaches Magical Leaf. It never misses — a lot like a grandmother’s eye.',
        'Sable came through here two days ago, you know. Beat me handily and barely said a word.',
        'She asked me what color my tree used to be. Isn’t that a strange question?');
      G.flags.sable_gw_ready = true;
      return;
    }
    yield* T('bramble', 'Glimmerwood lies east of town. Mind the tall grass — and the Pikachu. They nip when startled!');
  },

  // ═══════════════════════════ GLIMMERWOOD ═══════════════════════════
  *sableForestTrigger(S) {
    const p = S.player;
    Sound.play('rival');
    const sb = S.addNpc({ id: 'sable_gw', x: 33, y: p.y, look: 'sable', dir: 'left', g: 'f', script: 'none' });
    yield* S.move(sb, 'l2');
    S.face(p, 'right');
    yield* T('sable', '{PLAYER}! Took you long enough.',
      'Did you see Mossgrove? Everyone was hugging and crying when the tree “got its color back.”',
      'It looked exactly the same to me. Before and after.',
      '...Whatever. Let’s battle. At least that looks the same to everyone.');
    const r = yield* S.battle(sableTrainer(2, { lose: 'Tch. You’re getting good.' }));
    if (r !== 'win') return;
    yield* T('sable', 'Hey... can I ask you something weird?', 'When the colors come back — what does it actually feel like?');
    const c = yield* ask('What does it feel like?', ['Like waking up.', 'Like music.', 'It’s hard to explain.'], SPK.sable);
    yield* T('sable', ['Waking up, huh. ...I wake up every day. It never feels like that.', 'Music. Okay. I like music.', 'Yeah. That’s what everyone says.'][c]);
    yield* T('sable', 'Forget it. See you in Brinecrest.');
    yield* S.move(sb, 'r3');
    S.removeNpc('sable_gw');
    G.flags.sable_gw_done = true;
    S.playMapMusic();
  },

  // ═══════════════════════════ BRINECREST ═══════════════════════════
  *brineDocks(S) {
    G.flags.brine_scene_done = true;
    Sound.play('ashen');
    const sl = S.addNpc({ id: 'slate_d', x: 11, y: 13, look: 'slate', dir: 'right', g: 'm', script: 'none' });
    const sb = S.addNpc({ id: 'sable_d', x: 12, y: 13, look: 'sable', dir: 'left', g: 'f', script: 'none' });
    yield* S.panTo(11, 12, 40);
    yield* T('slate', '...In a grey world, no one would ever be left out again. Isn’t that what you want?');
    yield* T('sable', 'I don’t know what I want.');
    yield* T('slate', 'Then let me tell you what I see. Every day, you stand in a world that was painted for everyone but you.',
      'The Director can change that. Not by giving you color — by taking it from everyone else.', 'Fairness, Sable. At last.');
    yield* T('sable', '...');
    yield* S.panBack(30);
    yield* S.move(S.player, S.player.x < 9 ? 'r'.repeat(9 - S.player.x) : '');
    yield* S.move(S.player, S.player.y < 12 ? 'd'.repeat(12 - S.player.y) : '');
    Sound.sfx('exclaim'); S.faceTo(sl, S.player); yield S.emote(sl, '!');
    yield* T('slate', 'Ah. The child who embarrassed my grunts in Mossgrove.', 'I am Slate, an Admin of Team Ashen. The Director asks that we leave children be.', 'But then, the Director is not here.', '...Another time. Think about what I said, Sable.');
    yield* S.move(sl, 'd r5 u2', 14);
    S.removeNpc('slate_d');
    S.faceTo(sb, S.player);
    yield* T('sable', 'It’s nothing. Don’t look at me like that.', 'He’s... not wrong about everything, you know.');
    yield* S.move(sb, 'r2 u4', 10);
    S.removeNpc('sable_d');
    S.playMapMusic();
  },
  *lhGuard(S, n) {
    if (!G.flags.brine_scene_done) { yield* T('grunt', 'Lighthouse is closed. Move along, kid.'); return; }
    yield* T('grunt', 'Admin Slate said to let you through. Says he likes an audience.');
    yield* S.move(n, 'r');
    G.flags.lh_guard_moved = true;
    S.face(n, 'left');
  },
  *keeper(S) {
    if (!G.flags.light_restored) { yield* T('keeper', 'Please... they took Beacon’s light. My Ampharos, up in the lamp room.', 'She’s kept this lighthouse burning for a hundred years. Since my grandmother’s time.'); return; }
    yield* T('keeper', 'Beacon’s shining again. Thank you, young one.', 'My daughter Maris runs the Gym in town. She’d want to thank you herself.');
  },
  *beaconTalk(S) {
    if (!G.flags.light_restored) { Sound.cry('ampharos', { faint: true }); yield new Say('Beacon: ...amph...'); yield new Say('Its tail orb is dark and grey.'); return; }
    Sound.cry('ampharos'); yield new Say('Beacon: Amphaaa! ♪');
  },
  *slateLighthouse(S, n) {
    yield* T('slate', 'You came all this way for an old lighthouse.',
      'Do you know what hue is, child? It’s what a living thing gives off when it feels something.',
      'This Ampharos has felt a century of joy. Every ship that made it home. Every family waiting on the pier.',
      'Distilled, that joy is power. Enough to change the world. The Director has a use for it.', 'So — step aside.');
    const r = yield* S.battle({ cls: 'admin', name: 'Slate', title: 'Admin Slate', art: 'slate', party: [['koffing', 17], ['houndour', 18]], smart: 1, prize: 1600, lose: 'Hmph. Perhaps the Director was right to be curious about you.' }, { music: 'battle_boss' });
    if (r !== 'win') return;
    yield* T('slate', 'Keep it, then. One lighthouse changes nothing.', 'But ask yourself, child — why does it hurt so much, watching the color fade?',
      'Because you love it.', 'Take the love away, and nothing ever hurts again.');
    yield* S.move(n, 'l d3', 12);
    S.removeNpc('slate');
    Sound.sfx('stairs');
    yield* S.move(S.player, 'u');
    S.face(S.player, 'up');
    S.removeNpc('lhrod');
    Sound.sfx('machine');
    yield new Say(`${G.name} pulled out the humming grey pylon!`);
    Sound.sfx('evolveFlash');
    Game.fadeColor = '#fff'; Game.fadeA = 0.9;
    yield new Fade(0, 40, '#fff');
    Sound.cry('ampharos');
    G.flags.beacon_lit = true;
    yield S.emote(S.npc('beacon'), '♥');
    yield new Say('Beacon: Amphaaaa!');
    yield* S.warp('brinecrest', 26, 18, 'down');
    yield 20;
    yield* S.restore(0, 'light_restored');
    S.rebuild();
    Sound.play('harbor');
    const m = S.addNpc({ id: 'maris_w', x: 20, y: 18, look: 'maris', dir: 'right', g: 'f', script: 'none' });
    yield* S.move(m, 'r3 u', 10);
    S.faceTo(S.player, m); S.faceTo(m, S.player);
    yield* T('maris', 'Ahoy there! I saw that light from ten miles out and turned my ship around so fast I nearly capsized!',
      'Was that you? You brought Beacon back?',
      'I’m Maris — captain, storm-chaser, and Gym Leader of Brinecrest. And that stubborn old keeper is my dad.',
      'Come by the Gym. I owe you a proper battle — and a proper thank-you!');
    yield* S.move(m, 'd l6', 10);
    S.removeNpc('maris_w');
  },
  *marisGym(S) {
    if (!G.badges.blue) {
      yield* T('maris', 'Welcome aboard! The sea teaches you two things: respect the storm, and never stop sailing toward the light.', 'Now let’s see what you’ve got!');
      const r = yield* S.battle({ cls: 'leader', name: 'Maris', title: 'Leader Maris', art: 'maris', party: [['staryu', 19], ['gyarados', 21], ['starmie', 22]], items: ['superpotion'], smart: 1, prize: 2200, lose: 'Ha! Swept overboard! You sail a fine course.' });
      if (r !== 'win') return;
      yield* T('maris', 'You’ve earned this, {PLAYER} — the Tidal Prism!');
      yield* S.badge('blue', 'Tidal Prism');
      yield* T('maris', 'It holds the blue light — the light of the deep sea and the open sky.', 'Take this TM, too.');
      yield* S.give('tm02');
      yield* T('maris', 'And this... this was my grandmother’s.');
      yield* S.give('veilchime');
      yield* T('maris', 'The Veil Chime. When she rang it, even the Snorlax that sleeps on Route 3 every winter would wake up to listen.',
        'You’re heading north, aren’t you? Toward the Spire. ...That man in the grey coat was heading there too.',
        'Be careful. He had the eyes of someone who’s already lost everything.');
      return;
    }
    yield* T('maris', 'Fair winds, {PLAYER}! Route 3 is north of town.');
  },
  *magikarpSale(S) {
    if (G.flags.karp_bought) { yield new Say('No refunds! Heh heh.', { color: 'm' }); return; }
    const r = yield* ask('Hey, kid! How’d you like a Magikarp? A real bargain at just ₽500!', ['Yes', 'No'], { color: 'm' });
    if (r !== 0) { yield new Say('Your loss! Legends start with a Magikarp, you know.', { color: 'm' }); return; }
    if (G.money < 500) { yield new Say('You don’t have enough money! Come back when you’re richer.', { color: 'm' }); return; }
    G.money -= 500; G.flags.karp_bought = true;
    yield* S.givePoke('magikarp', 10);
    yield new Say('Pleasure doing business! No refunds!', { color: 'm' });
  },
  *brineGift(S) {
    if (!G.flags.brine_gift) { yield new Say('My grandson collects stones from the tide pools. He left this one behind when he moved to the city.', { color: 'f' }); yield* S.give('waterstone'); yield new Say('It makes certain Pokémon evolve. A Staryu, perhaps?', { color: 'f' }); G.flags.brine_gift = true; return; }
    yield new Say('On clear nights, the Veil reflects in the harbor. Two skies at once!', { color: 'f' });
  },

  // ═══════════════════════════ ROUTE 3 ═══════════════════════════
  *snorlax(S, n) {
    yield new Say('A huge Pokémon is sleeping soundly across the path.');
    Sound.sfx('snore');
    if (!Bag.count('veilchime')) { yield new Say('Zzz... It’s snoring peacefully. Nothing seems to wake it.'); return; }
    const r = yield* ask('Ring the Veil Chime?');
    if (r !== 0) return;
    Sound.sfx('chime');
    yield new Say(`${G.name} rang the Veil Chime...`);
    yield 30;
    yield new Say('A clear, shimmering tone rings out across the sea cliffs...');
    Sound.sfx('exclaim'); yield S.emote(n, '!'); Sound.cry('snorlax'); Game.shake(3, 20);
    yield new Say('Snorlax woke up! It looks grumpy about it!');
    const res = yield* S.wildBattle('snorlax', 24, { appearText: 'The wild Snorlax attacked!' });
    if (res === 'lose') return;
    G.flags.snorlax_done = true;
    S.removeNpc('snorlax');
    if (res !== 'caught') yield new Say('Snorlax lumbered off toward the sea, yawning.');
  },

  // ═══════════════════════════ CINDERFALL ═══════════════════════════
  *grisTrig(S) {
    const g = S.npc('gris');
    if (!g) return;
    Sound.sfx('exclaim'); yield S.emote(g, '!');
    const dx = S.player.x - g.x;
    yield* S.move(g, dx > 1 ? 'r'.repeat(dx - 1) : dx < -1 ? 'l'.repeat(-dx - 1) : '');
    S.faceTo(g, S.player); S.faceTo(S.player, g);
    yield* T('gris', 'Oh! The anomaly! Slate told me all about you.',
      'Did you know? The Dimmer converts hue into a stable, storable charge. Ninety-four percent efficiency! Isn’t that beautiful?',
      'Well. Beautiful isn’t really the right word anymore, is it? Not for much longer.');
    const r = yield* S.battle({ cls: 'admin', name: 'Gris', title: 'Admin Gris', art: 'gris', party: [['magnemite', 25], ['murkrow', 26], ['magneton', 27]], smart: 1, prize: 2400, lose: 'Error. Error. ...Oh, fine.' }, { music: 'battle_boss' });
    if (r !== 'win') return;
    yield* T('gris', 'Go on up. The Director wants to meet you personally.', 'And there’s someone at the core who’s been waiting for you.');
    G.flags.plant_gris = true;
    yield* S.move(g, 'd2', 12);
    S.removeNpc('gris');
  },
  *grisPlant(S) { yield* T('gris', 'Hmm? Oh, don’t mind me. I’m calibrating.'); },
  *sablePlant(S) {
    if (!G.flags.plant_gris) return;
    const sb = S.npc('sable_plant');
    Sound.play('emotion');
    S.faceTo(sb, S.player);
    yield* T('sable', '...Hey, {PLAYER}.', 'Don’t make that face. I know how it looks.',
      'Slate found me after Brinecrest. He said Team Ashen could make the world fair. That in a grey world, I’d finally see what everyone else sees.',
      'Do you know what that’s like? To have everyone tell you something is beautiful, your whole life, and just... have to take their word for it?');
    Sound.cry('umbreon');
    yield* T('sable', 'Eevee evolved last night. Under the moon.',
      'Umbreon. Black and gold. It’s the first Pokémon I’ve ever looked at and felt like I was seeing all of it.',
      'So yeah. Maybe grey isn’t so bad.',
      'You want to shut this place down? Then you’ll have to go through me.');
    const r = yield* S.battle(sableTrainer(3, { lose: '...You didn’t even hesitate.' }), { env: 'plant' });
    if (r !== 'win') return;
    yield* T('sable', 'You really believe in all this color stuff, huh.', 'I wish I could see what you see. Just once.');
    G.flags.plant_sable = true;
    Sound.stop();
    yield 40;
    yield new Say('A cold voice echoes through the plant.');
    yield* T('unknown', 'That’s enough, Sable.');
    const v = S.addNpc({ id: 'vane_p', x: 9, y: 13, look: 'vane', dir: 'up', g: 'm', script: 'none' });
    S.face(S.player, 'down'); S.face(sb, 'down');
    Sound.play('ashen');
    yield* S.move(v, 'u8', 20);
    yield* T('vane', 'So you’re the one who’s been turning my lights back on.',
      'I am Aldric Vane. Director of Team Ashen.',
      'Do you know what hue is, child? Joy. Love. Hope. And grief. The Veil in the sky is made of it — every feeling Lumira has ever had, flung up into the heavens.',
      'I spent twenty years studying it with a man named Linden. Then I lost someone.',
      'Her favorite thing in the world was the Veil. The night she died, it was the most beautiful it had ever been.',
      'I have hated color ever since.',
      'Team Ashen will take the hue out of the world. No more joy, yes. But no more grief, either.',
      'No more beautiful skies over the graves of the people we love.');
    Sound.sfx('exclaim'); yield S.emote(sb, '!');
    yield* T('sable', '...Linden. You said Linden.');
    Sound.stop();
    yield S.emote(v, '...', 50);
    Sound.play('emotion');
    yield* T('vane', 'You have your mother’s face, Sable. And her stubbornness.');
    yield* T('sable', 'Grandpa said... he said you were dead.');
    yield* T('vane', 'Your grandfather says a great many kind things that aren’t true.',
      'Come with me, Sable. You’ve always seen the world as it truly is. Help me make everyone else see it too.');
    yield* T('sable', '...');
    yield* S.move(sb, 'd', 24);
    S.face(sb, 'down');
    yield 30;
    S.faceTo(v, S.player);
    yield* T('vane', 'The Prism Spire opens only for the three lights. You’ll bring them to me, {PLAYER} — whether you mean to or not.', 'We’re leaving.');
    yield fadeOut(30);
    S.removeNpc('vane_p'); S.removeNpc('sable_plant');
    yield 40;
    yield fadeIn(30);
    Sound.stop();
    yield 30;
    const bl = S.addNpc({ id: 'blaise_p', x: 9, y: 13, look: 'blaise', dir: 'up', g: 'm', script: 'none' });
    Sound.sfx('door');
    yield* S.move(bl, 'u6', 10);
    S.faceTo(S.player, bl);
    yield* T('blaise', 'Kid! You all right? I heard the whole thing from the stairwell.', 'That man... that was Aldric Vane. Linden’s son.', 'Let’s shut this monster down. I’ve been waiting a month to do this.');
    yield* S.move(bl, 'u4', 10);
    Sound.sfx('machine'); Game.shake(3, 40);
    yield 30;
    Sound.sfx('evolveFlash');
    S.removeNpc('core');
    yield new Say('Blaise smashed the Dimmer’s core!');
    G.flags.plant_off = true;
    yield* S.warp('cinderfall', 21, 17, 'down');
    yield 16;
    yield* S.restore(0, 'plant_down');
    S.rebuild();
    Sound.play('cinderfall');
    const b2 = S.addNpc({ id: 'blaise_o', x: 20, y: 17, look: 'blaise', dir: 'right', g: 'm', script: 'none' });
    S.faceTo(S.player, b2);
    yield* T('blaise', 'Look at that. Orange lava. Red roofs. I’d almost forgotten.',
      'Name’s Blaise. I run the Gym, and I forge the Prism Badges by hand.',
      'Come see me when you’re ready. If you’re going up that Spire after them, you’ll need all three lights.');
    yield* S.move(b2, 'u5', 12);
    S.removeNpc('blaise_o');
    G.flags.linden_cinder = true;
    S.addNpc(Object.assign({}, MAPS.cinderfall.npcs.find(x => x.id === 'lindencf'), { look: 'prof' }));
  },
  *lindenCinder(S) {
    if (!G.flags.linden_cinder_talked) {
      yield* T('linden', '{PLAYER}... I came as fast as I could. Blaise called me.', 'So. You’ve met my son.',
        'I should have told her. I thought... if Sable never knew, she’d never have to carry it.',
        'Aldric was the brightest mind I ever worked with. Together, we discovered hue — the light that feeling gives off.',
        'When Sable’s mother, Mira, fell ill, Aldric sat at her side every night, watching the Veil through the hospital window.',
        'After she passed, the light went out of him. He left the baby with me and vanished.',
        'I told Sable he was gone. I suppose, in a way, I believed it.',
        'Please, {PLAYER}. I’m an old man, and I’ve made my mistakes. But you... you might still reach them.', 'Take these.');
      yield* S.give('rarecandy', 2);
      yield* T('linden', 'Bring my family home.');
      G.flags.linden_cinder_talked = true; return;
    }
    yield* T('linden', 'Frostveil Path lies north of the city. The Spire waits at its end.', 'Win your third light first, {PLAYER}. Blaise is waiting at the Gym.');
  },
  *cinderGift(S) {
    if (!G.flags.eevee_gift) {
      yield new Say('This Eevee wandered out of that dreadful plant last week. Grey as ash, and barely eating.', { color: 'm' });
      yield new Say('Since the colors came back, it won’t stop bouncing around. It needs a real Trainer.', { color: 'm' });
      yield* S.givePoke('eevee', 20);
      yield new Say('Look after it. They say an Eevee becomes whatever its partner needs most.', { color: 'm' });
      G.flags.eevee_gift = true; return;
    }
    yield new Say('Eevee evolves under the night sky when it grows stronger... or with the right stone. Or so I’ve heard!', { color: 'm' });
  },
  *blaiseGym(S) {
    if (!G.badges.red) {
      yield* T('blaise', 'You saved my city. Now let’s see if you can stand the heat.',
        'Fire is the hardest light to hold. Too little and it dies. Too much and it burns everything you love.', 'Show me you know the difference!');
      const r = yield* S.battle({ cls: 'leader', name: 'Blaise', title: 'Leader Blaise', art: 'blaise', party: [['growlithe', 28], ['ponyta', 28], ['arcanine', 31]], items: ['superpotion', 'superpotion'], smart: 1, prize: 3100, lose: 'Ha! Now THAT’s a fire worth forging.' });
      if (r !== 'win') return;
      yield* T('blaise', 'Here. I made this one knowing it might be yours — the Ember Prism.');
      yield* S.badge('red', 'Ember Prism');
      yield* T('blaise', 'It holds the red light — the light of every hearth, and every heart that refuses to go cold.');
      yield* S.give('tm03');
      yield* T('blaise', 'That’s all three. Green, blue, red. Put ’em together and you get white light — every color at once.',
        'Frostveil Path is north of the city. The Spire’s at the top. Go bring your friend home, kid.');
      return;
    }
    yield* T('blaise', 'What are you waiting for? The Spire’s north, through Frostveil!');
  },

  // ═══════════════════════════ FROSTVEIL & SPIRE ═══════════════════════════
  *spireDoor(S) {
    const all = G.badges.red && G.badges.green && G.badges.blue;
    yield new Say('A towering door of living crystal. Three sockets are set into it: red, green and blue.');
    if (!all) { yield new Say('The sockets are dark. It seems to be waiting for something.'); return; }
    yield new Say('The sockets begin to pulse in time with your Prism Badges...');
    for (const col of ['#f05048', '#48c060', '#4880f0']) { Sound.sfx('shimmer'); Game.fadeColor = col; Game.fadeA = 0.5; yield new Fade(0, 24, col); }
    Sound.sfx('colorBurst'); Game.shake(3, 40);
    Game.fadeColor = '#ffffff'; Game.fadeA = 1;
    G.flags.spire_open = true;
    S.rebuild();
    yield new Fade(0, 50, '#ffffff');
    yield new Say('Red, green and blue light merged into white... The Prism Spire’s great door slid open!');
  },
  *cabinHeal(S) {
    yield new Say('Oh, you poor thing! You must be half-frozen. Rest by the fire a while.', { color: 'f' });
    yield fadeOut(12); S.heal(); Sound.jingle('heal', Sound.current()); yield 70; yield fadeIn(12);
    G.lastHeal = { map: 'cabin', x: 5, y: 4 };
    yield new Say('There now. Your Pokémon look much better. Come back any time, dear.', { color: 'f' });
  },
  *slateSpire(S, n) {
    yield* T('slate', 'You came. Of course you did.',
      'Do you know why I follow him, child? I lost my brother to the sea when I was your age.',
      'Every sunset since, I think of him. Every beautiful sunset, for thirty years.',
      'Vane promised me an end to sunsets. I believed him.', '...Show me I was wrong.');
    const r = yield* S.battle({ cls: 'admin', name: 'Slate', title: 'Admin Slate', art: 'slate', party: [['weezing', 32], ['houndoom', 33], ['golbat', 32]], items: ['hyperpotion'], smart: 1, prize: 3300, lose: '...' }, { music: 'battle_boss', env: 'spire' });
    if (r !== 'win') return;
    yield* T('slate', 'The sunset in Brinecrest, the night the lighthouse came back. I watched it from the cliffs.',
      'It hurt. It hurt so much. And I didn’t want it to stop.', 'Go. Maybe you can reach him. I never could.');
    G.flags.slate2_done = true;
    yield* S.move(n, 'r2', 16);
    S.face(n, 'left');
  },
  *summitScene(S) {
    const v = S.npc('vane'), sb = S.npc('sable_s');
    if (!G.flags.vane_beaten) {
      Sound.stop();
      S.hoohCircle = true;
      yield 40;
      yield* S.panTo(7, 4, 50);
      yield* T('vane', 'Look up, Sable. The Rainbow Pokémon. Ho-Oh.',
        'Every legend in Lumira says its feathers painted the world. And now it circles above us, caught in a cage of grey.',
        'When the Null Prism drains its light, the Veil will go dark forever.');
      S.face(v, 'down');
      Sound.play('ashen');
      yield* S.panBack(30);
      yield* T('vane', 'And here you are, {PLAYER}. With the three lights, just as I said.',
        'The Spire’s door opened for you. The Null Prism needed that light to finish its work. Every step you took up this tower fed it.',
        'I don’t blame you. You couldn’t have known.');
      S.face(sb, 'left');
      Sound.play('emotion');
      yield* T('sable', 'Dad.', 'Umbreon stopped playing. It hasn’t played once since we came up here.',
        'It just sits there. Like the grey Pidgey in Dawnmere. Like everyone in Cinderfall.');
      S.face(v, 'right');
      yield* T('vane', 'It’s at peace, Sable.');
      yield* T('sable', 'No. It’s not.');
      S.faceTo(sb, S.player);
      yield* T('sable', 'I never saw your colors, {PLAYER}. Not once.',
        'But I saw your Pokémon laugh. I saw Bramble cry when her tree came back. I saw Grandpa’s face every night the Veil came out.',
        'I SAW that. That’s what you’re taking away, Dad. Not colors.',
        'Grandpa told me once — color isn’t something you see. It’s something you feel.',
        'I didn’t get it.', '...I think I get it now.');
      yield* S.move(sb, 'u2', 10);
      S.face(sb, 'left');
      Sound.sfx('machine'); Game.shake(4, 40);
      yield new Say('Sable tore the power core out of the Null Prism!');
      S.face(v, 'right');
      yield* T('vane', 'Sable! Stop!');
      yield 30;
      S.faceTo(v, S.player);
      yield* T('vane', '...So be it. If words won’t reach either of you, I’ll finish this with my own hands.');
      const r = yield* S.battle({ cls: 'boss', name: 'Vane', title: 'Director Vane', art: 'vane', party: [['sneasel', 35], ['weezing', 34], ['magneton', 34], ['houndoom', 36], ['tyranitar', 38]], items: ['hyperpotion', 'hyperpotion'], smart: 1, prize: 8000, lose: ['...', 'Why... why won’t the world just let us stop hurting?'] }, { music: 'battle_boss', env: 'summit' });
      if (r !== 'win') return;
      G.flags.vane_beaten = true;
      yield new Say('The Null Prism shudders violently...');
      Sound.sfx('quake'); Game.shake(6, 60);
      yield 50;
      Sound.sfx('colorBurst');
      Game.fadeColor = '#ffffff'; Game.fadeA = 1;
      G.flags.sky_restored = true; G.flags.machine_broken = true;
      S.hoohCircle = false;
      G.flags.hooh_landed = true;
      S.rebuild();
      S.addNpc(Object.assign({}, MAPS.summit.npcs.find(x => x.id === 'hooh')));
      Sound.play('title', { restart: true });
      yield new Fade(0, 80, '#ffffff');
      yield 20;
      Sound.cry('hooh');
      yield new Say('The grey cage shattered into a thousand points of light... and Ho-Oh descended from the sky!');
      yield new Say('Color is spilling across the heavens. The Veil is burning brighter than anyone in Lumira has ever seen.');
      S.face(v, 'up');
      yield* T('vane', '...Mira.', 'Look, Mira. The Veil.', 'You would have... you would have loved this sky.');
      S.faceTo(sb, v);
      yield* S.move(sb, 'd', 16);
      S.faceTo(sb, v);
      yield* T('sable', '...Dad.', 'Let’s go home. Grandpa’s waiting.');
      const um = S.npc('umbreon_s');
      if (um) { Sound.cry('umbreon'); yield S.emote(um, '♪'); G.flags.umbreon_happy = true; }
      yield* T('sable', 'Umbreon! You’re... you’re playing again.');
    }
    const h = S.npc('hooh');
    S.face(S.player, 'up');
    Sound.sfx('exclaim');
    if (h) yield S.emote(h, '!');
    yield new Say('Ho-Oh is looking at you...');
    yield new Say('Its eyes blaze with every color of the sky. It seems to be waiting for something.');
    yield* STORY.hoohBattle(S);
  },
  *hoohTalk(S) { Sound.cry('hooh'); yield new Say('Ho-Oh gazes at you, its feathers shimmering with every color.'); yield* STORY.hoohBattle(S); },
  *hoohBattle(S) {
    const r = yield* ask('Face Ho-Oh?');
    if (r !== 0) { yield new Say('Ho-Oh waits patiently.'); return; }
    const res = yield* S.wildBattle('hooh', 40, { music: 'battle_legend', noRun: true, env: 'summit', appearText: 'Ho-Oh, the Rainbow Pokémon, spread its wings!', smart: true });
    if (res === 'lose') return;
    S.removeNpc('hooh');
    G.flags.hooh_landed = false;
    if (res === 'caught') G.flags.hooh_caught = true;
    else { G.flags.hooh_fled = true; yield new Say('Ho-Oh soared into the Veil... Its light lingers in the sky. Surely it will return someday.'); }
    if (!G.flags.summit_done) {
      G.flags.summit_done = true;
      yield* STORY.ending(S);
    }
  },
  *ending(S) {
    Sound.fadeOut(2000);
    yield new Fade(1, 90, '#ffffff');
    S.removeNpc('vane'); S.removeNpc('sable_s'); S.removeNpc('umbreon_s');
    yield new SceneWait(new EndingScene());
    // the pier at night
    Game.fadeColor = '#000'; Game.fadeA = 1;
    G.flags.ending = true;
    S.load('dawnmere', 11, 16, 'down', { night: true });
    S.forceNight = true; S.auroraSky = true;
    S.rebuild();
    S.removeNpc('fisher');
    const sb = S.addNpc({ id: 'sable_end', x: 12, y: 16, look: 'sable', dir: 'down', g: 'f', script: 'none' });
    S.addNpc({ id: 'umb_end', x: 12, y: 17, poke: 'umbreon', dir: 'down', script: 'none' });
    Sound.play('ending', { restart: true });
    yield new Fade(0, 90, '#000');
    yield 60;
    S.face(sb, 'left'); S.face(S.player, 'right');
    yield* T('sable', 'Hey, {PLAYER}.',
      'Dad’s staying with Grandpa for now. They talk until three in the morning. About hue, mostly. About Mom, sometimes.',
      'Team Ashen’s gone. Slate turned himself in. Gris is helping Grandpa rebuild the aurora charts — in full color, this time.',
      'The Veil’s out tonight. Half the town came down to the pier to watch it.');
    S.face(sb, 'down');
    yield 40;
    yield* T('sable', '...Hey. What color is it tonight?');
    const c = yield* ask('What color is the Veil tonight?', ['Every color.', 'The color of your laugh.', 'Like the first light at dawn.'], SPK.sable);
    yield* T('sable', ['Every color. Huh. Greedy sky.', 'That’s the dumbest thing anyone’s ever said to me.', 'Dawn. Dawnmere. Very funny.'][c]);
    yield 30;
    S.face(sb, 'left');
    yield* T('sable', '...Yeah.', 'I think I can feel it.', 'Thanks, {PLAYER}. For not letting me stay grey.',
      'Next time we battle, I’m not holding back.', '...I never was. But you know.');
    Sound.cry('umbreon'); yield S.emote(S.npc('umb_end'), '♪');
    yield 60;
    yield new Fade(1, 90, '#000');
    yield new SceneWait(new CreditsScene());
    // post-game
    S.forceNight = false; S.auroraSky = false;
    G.flags.postgame = true;
    S.load('house', 2, 3, 'down');
    Game.fadeA = 1;
    yield fadeIn(40);
    yield* T('mom', 'Welcome home, sweetie. The whole town is talking about you!', 'Sable came by earlier. She said to tell you she’s at the lab... waiting for a rematch.');
    const r = yield* ask('Would you like to save your game?');
    if (r === 0) { Save.write(); Sound.sfx('save'); yield new Say(`${G.name} saved the game!`); }
  },
  *sableRematch(S, n) {
    if (!G.flags.postgame) { yield* T('sable', '...'); return; }
    S.faceTo(n, S.player);
    yield* T('sable', 'There you are. I’ve been training every night under the Veil.', 'Umbreon says it’s ready. So am I.');
    const r = yield* ask('Battle Sable?');
    if (r !== 0) { yield* T('sable', 'Chicken.'); return; }
    const res = yield* S.battle(sableTrainer(4, { lose: 'Unbelievable. You’re still better than me.' }));
    if (res === 'win') { G.flags.sable_rematch = true; yield* T('sable', '...Same time next week?'); }
  },

  // ═══════════════════════════ SERVICES ═══════════════════════════
  *nurse(S, n) {
    yield* T('nurse', 'Welcome to the Pokémon Center!', 'We restore your tired Pokémon to full health.');
    const r = yield* ask('Would you like me to heal your Pokémon?', ['Yes', 'No'], SPK.nurse);
    if (r !== 0) { yield* T('nurse', 'We hope to see you again!'); return; }
    yield* T('nurse', 'Okay, I’ll take your Pokémon for a few seconds.');
    n.dir = 'left';
    S.healing = { t: 0, n: G.party.length, x: 3, y: 2 };
    for (let i = 0; i < G.party.length; i++) { Sound.sfx('ballClick'); S.healing.shown = i + 1; yield 10; }
    Sound.jingle('heal', Sound.current());
    yield 100;
    S.healing = null;
    S.heal();
    n.dir = 'down';
    yield* T('nurse', 'Thank you for waiting.', 'We’ve restored your Pokémon to full health.');
    yield S.emote(n, '♥', 30);
    yield* T('nurse', 'We hope to see you again!');
  },
  *pc(S) { yield new SceneWait(new PCScene()); },
  *shop(S, n) {
    yield new Say('Welcome! How may I help you?', { color: 'm' });
    yield new SceneWait(new ShopScene(n.def.data));
    yield new Say('Please come again!', { color: 'm' });
  },
};

// map-entry hooks
STORY.onEnter = {
  house(S) {
    if (G.flags.mom_intro) return null;
    return (function* () {
      G.flags.mom_intro = true;
      const mom = S.npc('mom');
      yield 40;
      Sound.sfx('exclaim'); yield S.emote(mom, '!');
      yield* S.move(mom, 'l5', 14);
      S.face(S.player, 'right');
      yield* T('mom', 'Morning, sleepyhead! Did you forget what day it is?',
        'Professor Linden called — he wants to see you at his lab. He said it’s “a very important day.”',
        '...And {PLAYER}? The flowers by the pier turned grey overnight. Everyone’s whispering about it.',
        'The Greyfall’s never come this far south before. Be careful out there, okay?');
      yield* S.move(mom, 'r5', 14);
      S.face(mom, 'left');
    })();
  },
  lab(S) { if (G.flags.lab_intro_done) return null; return STORY.labIntro(S); },
  mossgrove(S) {
    if (G.flags.moss_arrive) return null;
    return (function* () {
      G.flags.moss_arrive = true;
      yield 20;
      yield* S.panTo(12, 7, 50);
      yield* T('grunt', 'Stand aside, lady. Director’s orders.');
      yield* T('bramble', 'Please! That tree is three hundred years old! It’s watched over this town since before your grandparents were born!');
      yield* T('gruntf', 'And now it’ll be three hundred years grey. Relax, Grandma. It doesn’t even hurt.');
      yield* T('grunt', 'Hue’s just going somewhere more useful. That’s all.');
      yield* S.panBack(40);
    })();
  },
  cinderfall(S) {
    if (G.flags.cinder_arrive) return null;
    return (function* () { G.flags.cinder_arrive = true; yield 20; yield new Say('The whole city is grey. Even the lava looks like cold ash.'); yield new Say('A strange factory hums on the east side of town...'); })();
  },
  frostveil(S) {
    if (G.flags.frost_arrive) return null;
    return (function* () { G.flags.frost_arrive = true; yield 20; yield new Say('Snow falls in silence. Far above the path, the Prism Spire glitters against a colorless sky.'); })();
  },
  summit(S) { S.hoohCircle = !G.flags.vane_beaten; return null; },
  lab_post(S) { return null; },
};

// preview frame for starter selection
function drawMonPreview(c, sp, t) {
  const col = TYPE_COLOR[SPECIES[sp].types[0]];
  UI.box(c, 72, 20, 112, 108);
  c.fillStyle = Col.mix(col, '#ffffff', 0.7); c.fillRect(76, 24, 104, 100);
  for (let dy = -6; dy <= 6; dy++) { const w = Math.round(40 * Math.sqrt(1 - dy * dy / 36)); c.fillStyle = Col.mix(col, '#ffffff', 0.45); c.fillRect(128 - w, 106 + dy, w * 2, 1); }
  const spr = PokeArt.get(sp, { frame: Math.floor(t / 22) % 2 });
  c.drawImage(spr, 96, 108 - spr.bb.y1);
  Font.drawC(c, SPECIES[sp].name, 128, 28, '#404048');
}
