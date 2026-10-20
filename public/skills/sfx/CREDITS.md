# The Skill blaster's recorded drums

Every file here is **CC0 1.0** (public domain: no attribution required, credited anyway). Each license was checked on the sound's Freesound page on 2026-10-20. Phill picked them in the Sound lab (`docs/design/sound-lab/`) on 2026-10-20; the rest of the game's sound is synthesized (`src/lib/skills/synth.ts`).

| File | Plays for | Freesound sound | By |
|---|---|---|---|
| `ride-k.mp3` | the ride (wave 4 on) | [K Zildjian Istanbul 20" Ride, bow](https://freesound.org/s/93905/) (pack [KZildjianIstanbulRide](https://freesound.org/people/pjcohen/packs/8879/)) | pjcohen |
| `crash-meinl18-1.mp3` … `crash-meinl18-4.mp3` | the crash (1–2 soft, 3–4 hard) | Meinl Byzance 18" Medium Thin Crash [H_5](https://freesound.org/s/696223/), [H_6](https://freesound.org/s/696224/), [H_7](https://freesound.org/s/696225/), [H_8](https://freesound.org/s/696226/) (pack [Meinl Byzance 18in Medium Thin Crash](https://freesound.org/people/ankealtd/packs/38859/)) | ankealtd |
| `riser-perc.mp3` | the riser into the drop | [Percusive Noise Riser](https://freesound.org/s/261415/) | Stereo Surgeon |
| `boom-bassdrop.mp3` | the drop's boom | [Bass Drop](https://freesound.org/s/212768/) | qubodup |

Made from Freesound's high-quality previews (about 180 kbps mp3; the original WAVs need a Freesound login): cut (the ride to 3 s at most with a 0.6 s fade-out, the crashes and the boom to 3.5 s at most with a 0.6–1 s fade-out, the riser to end where it arrives), peak-normalized to −1 dB, and re-encoded as VBR mp3 (`-q:a 1`). The engine matches each set's loudness itself. To use the originals, download them from the same pages, run the same steps and recheck the levels in the Sound lab.
