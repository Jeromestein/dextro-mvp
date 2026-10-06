# CC0 Audio Library

Sources and license records verified on 2026-10-06.

Six Freesound music files are available in the Media panel. Three Kenney jingles
are stored under `effects/` for future one-shot playback, not included in music
matching. No Freesound API is used at runtime.

Freesound files use the public HQ MP3 derivatives linked by their sound pages.
They are normalized to -23 LUFS and have short edge fades to avoid clicks.
These are starter candidates: automated decoding/level checks do not establish
subjective listening quality or perfectly seamless musical loops. Audition in
the Media panel before applying.

| Local file | Author / source | License |
| --- | --- | --- |
| `music/quiet-piano.mp3` | [Jadis0x](https://freesound.org/people/Jadis0x/sounds/746056/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `music/in-the-deep.mp3` | [plasterbrain](https://freesound.org/people/plasterbrain/sounds/464920/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `music/calm-background.mp3` | [Bertsz](https://freesound.org/people/Bertsz/sounds/671900/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `music/ambient-piano.mp3` | [Boatlanman-](https://freesound.org/people/Boatlanman-/sounds/788677/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `music/ambient-synth.mp3` | [YellowTree](https://freesound.org/people/YellowTree/sounds/438901/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `music/zambian.mp3` | [holizna](https://freesound.org/people/holizna/sounds/852235/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `effects/kenney-steel-00.ogg` | [Kenney](https://kenney.nl/assets/music-jingles) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `effects/kenney-steel-05.ogg` | [Kenney](https://kenney.nl/assets/music-jingles) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `effects/kenney-steel-07.ogg` | [Kenney](https://kenney.nl/assets/music-jingles) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

Machine-readable music provenance, processing notes and SHA-256 hashes live in
`src/modules/media/catalog/tracks.json`. Kenney archive license and source file
records are in `licenses/`. Each imported story asset retains its credit and
source/license metadata for backups and offline exports.
