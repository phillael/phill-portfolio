# The 3D resume's recorded sounds

Every file here is **CC0 1.0** (public domain: no attribution required, credited anyway). The packs' own license files say so: Juhani Junkala's `INFO.txt` ("released under CC0 creative commons license. You can do anything you want with these sounds") and Kenney's `License.txt` ("License (Creative Commons Zero, CC0)"); celestialghost8's "Victory" is CC0 on its OpenGameArt page. Phill picked them in the Sound lab on 2026-10-20.

| File | Plays for | From | Original file |
|---|---|---|---|
| `mushroom.mp3` | the mushroom appearing | Juhani Junkala, [The Essential Retro Video Game Sound Effects Collection [512 sounds]](https://opengameart.org/content/512-sound-effects-8-bit-style) | `sfx_sounds_powerup16.wav` |
| `finish.mp3` | the finish | celestialghost8, [Victory](https://opengameart.org/content/victory) | `Victory.wav` |
| `ufo-hit.mp3` | a UFO hit | Juhani Junkala (as above) | `sfx_sounds_impact11.wav` |
| `beam.mp3` | the UFO's beam | Juhani Junkala | `sfx_movement_portal5.wav` |
| `power-up.mp3` | the trip starting | Juhani Junkala | `sfx_sounds_powerup4.wav` |
| `power-down.mp3` | the trip wearing off | Juhani Junkala | `sfx_sound_shutdown2.wav` |
| `alert.mp3` | the lasagna's "!" | Kenney, [Digital Audio](https://kenney.nl/assets/digital-audio) | `twoTone1.ogg` |
| `stomp.mp3` | a stomp | Juhani Junkala | `sfx_damage_hit3.wav` |
| `kicked.mp3` | his kick taken | Juhani Junkala | `sfx_sounds_error12.wav` |
| `giant-step.mp3` | the giant's steps | Kenney, [Impact Sounds](https://kenney.nl/assets/impact-sounds) | `impactWood_heavy_000.ogg` |

Made from the packs' original files: the silence trimmed at both ends (a 10 ms fade at the end), cut to a few seconds at most with a 0.3 s fade (the finish at 3 s, the power-down at 1.8 s), mono, peak-normalized to −1 dB, VBR mp3 (`-q:a 2`). `SFX_CONFIG.rec` in `src/lib/jelly/config.ts` sets each one's gain so it's as loud as the synth it replaces.
