# Pokémon Aurora — The Greyfall

A fan-made, Gen 3/4-style Pokémon adventure that runs in the browser, set in the original **Lumira region**.
Everything is generated in code: the pixel art for 56 Pokémon, people, tiles and buildings, the chiptune soundtrack,
sound effects and Pokémon cries. There are no image or audio files, no dependencies and no build step.

## Play

```bash
git clone https://github.com/f20230125-sudo/Pokemon-game.git
```

Then open [`pokemon-aurora/index.html`](pokemon-aurora/index.html) in Chrome, Edge or Firefox.

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move (tap to turn in place) |
| Z / Space | A: talk, confirm |
| X / Esc | B: cancel. Hold it to run outdoors |
| Enter | Open the menu |

On phones and tablets an on-screen D-pad appears. Save from the menu; progress is stored in the browser.

## What's in it

- **A full region:** towns, routes, a cave and a harbor from Dawnmere Town to the Prism Spire, with 3 Gyms, a rival,
  Team Ashen and Ho-Oh.
- **Gen 4-style battles:** physical/special split, STAB, crits, stat stages, status conditions, abilities, trainer AI
  and catching with the real shake formula.
- **A living world:** real-clock day and night, weather, a dark cave with a lantern radius, and "Greyfall" zones that
  burst back into color.
- **An original soundtrack:** 20+ chiptune tracks written in MML and played through a WebAudio synthesizer.

The story, the full feature list, the code layout and notes on adding Pokémon, maps and cutscenes are in
[`pokemon-aurora/README.md`](pokemon-aurora/README.md).

---
Pokémon is © Nintendo, Creatures Inc. and GAME FREAK. This is a non-commercial fan project.
