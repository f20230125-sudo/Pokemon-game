# Pokémon Aurora — The Greyfall

A fan-made, Gen 3/4-style Pokémon adventure set in the original **Lumira region**.
Everything is generated in code: the pixel art for 56 Pokémon, people, tiles and buildings, the chiptune soundtrack,
sound effects and Pokémon cries. There are no image or audio files.

## Play

Open `index.html` in any modern browser (Chrome, Edge or Firefox). You don't need a server or a build step.

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move (tap to turn in place) |
| Z / Space | A: talk, confirm |
| X / Esc | B: cancel. Hold it to run outdoors |
| Enter | Open the menu |
| Shift | Run (alternative) |

On phones and tablets an on-screen D-pad appears. Save from the menu; progress is stored in the browser.

## The story

Every night the sky over Lumira fills with **the Veil**, an aurora said to be the trail of Ho-Oh, the Rainbow Pokémon.
Lately, places and Pokémon have begun losing their color. People call it **the Greyfall**.

You set out from Dawnmere Town with your rival **Sable**, Professor Linden's granddaughter, who was born seeing the
world only in shades of grey. Team Ashen is draining "hue" (the light that feelings give off) from the region.
To reach the **Prism Spire** you'll need three Prism Badges: red, green and blue, the three lights that together make
every color. What waits at the top is personal for Sable, and for the man leading Team Ashen.

## What's in it

- **Region:** Dawnmere Town, Route 1, Mossgrove Town, Glimmerwood, Brinecrest Harbor and its lighthouse, Route 3,
  Emberpeak Tunnel, Cinderfall City and the Dimmer Plant, Frostveil Path, and the Prism Spire.
- **3 Gyms** (Grass, Water, Fire), 3 rival battles plus a post-game rematch, 2 Team Ashen Admins, the Director, and Ho-Oh.
- **56 Pokémon** from Gens 1–2, each with front and back sprites, 2-frame animation and an original Pokédex entry.
- **Gen 4-style battles:** physical/special split, STAB, crits, stat stages, status conditions, confusion, flinching,
  drain and recoil moves, multi-hit and charge moves, abilities, trainer AI, catching with the real shake formula,
  Exp. Share, level-up move learning, and evolution by level, stone or time of day.
- **World:** seamless map edges, ledges, tall grass, trainers who spot you ("!"), real-clock day and night with lit
  windows, weather (petals, fireflies, snow, embers), a dark cave with a lantern radius, and "Greyfall" zones that
  burst back into color.
- **Look:** hand-tuned pixel palettes finished by a per-pixel pass: seamless grass and path texture, water that
  deepens away from the shore, cellular-noise rock for cliffs and caves, leafy hedges. Buildings are outlined sprites
  with shingled roofs, flower boxes, glowing windows at night and chimney smoke. Characters cast soft shadows and leave
  footprints in sand and snow, tall grass sways and rustles, and cloud shadows drift over the routes by day.
- **Battles:** painted backdrops for ten environments (day and night), textured platforms, pill-style menus coloured
  by move type, and diamond / Poké Ball transitions.
- **Menus:** party, summary, bag (with item icons and TMs), Pokédex, trainer card, painted town map, Poké Mart, PC
  storage, options.
- **Original soundtrack:** 20+ chiptune tracks and jingles written in MML and played through a WebAudio synthesizer.

## Project layout

```
index.html            page, canvas and touch controls
js/core.js            input, coroutines, scene stack, fixed-step loop
js/font.js            hand-drawn bitmap fonts
js/gfx.js             pixel-art painter (shaded shapes, outlines, colour math)
js/pokemon-sprites.js procedural art for every Pokémon
js/people-sprites.js  overworld walk cycles + battle trainer sprites
js/tiles.js           tiles, trees, buildings
js/audio.js           synth, MML sequencer, SFX, cries
js/music.js           the soundtrack
js/data.js            types, moves, species, items, natures
js/pokemon.js         Pokémon instances, stats, experience
js/battle*.js         battle engine, UI and move animations
js/maps.js            the region's maps, NPCs, trainers and encounters
js/overworld.js       exploration, collision, rendering, script API
js/story.js           every cutscene and story script
js/menus.js           all menu screens
js/scenes.js          title, intro, ending, credits
js/main.js            boot, save/load, debug hooks
```

### Extending it

- **New Pokémon:** add a `S(...)` entry in `data.js` and a `PA.<id> = p => { ... }` drawing in `pokemon-sprites.js`.
- **New map:** `defMap('id', { grid, buildings, npcs, warps, conn, encounters })` in `maps.js`.
- **New cutscene:** add a generator to `STORY` in `story.js`, then reference it from an NPC `script` or a map `trigger`.
- **Debugging:** open `index.html?test=1` and use `DEBUG.newGame()`, `DEBUG.strong()`, `DEBUG.go('mossgrove', 12, 9)`
  and `DEBUG.wild('pikachu', 10)` from the console.

---
Pokémon is © Nintendo, Creatures Inc. and GAME FREAK. This is a non-commercial fan project.
