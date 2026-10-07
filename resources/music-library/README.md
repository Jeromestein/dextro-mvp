# CC0 Music Library

The runtime library lives in Supabase, not in `public/`. This directory preserves
the publishing manifest, source credits, licenses, immutable hashes and processing records.

- **24 background tracks** from Freesound; **3 Kenney jingles** reserved for future sound-effect support.
- Public bucket: `music-library`. Catalog table: `public.music_library_tracks`.
- Existing story assets stay in the private `user-media` bucket.
- Files are immutable: `music/<catalog-id>/<sha256>.mp3` or `effects/<catalog-id>/<sha256>.ogg`.
- No Freesound search, API key or source-site request is needed at runtime.

## Quality and licensing

Individual source pages identify CC0 1.0. Verification dates and source URLs are
recorded per entry in `catalog.json`. The Freesound audio uses public HQ MP3
derivatives linked from those pages. New tracks preserve the full source piece,
with -23 LUFS normalization, a -2 dBTP target, short edge fades and 128 kbps stereo MP3.
Automated full-file decode and measured loudness/peak checks passed for all 18 additions.

`review: technical-checks` is intentional: these checks do not establish subjective
musical quality, absence of distracting details, or seamless loops. Theme/mood/instrument
tags are editorial suggestions based on source descriptions. Audition before choosing.
The existing 8-second In the Deep loop remains available manually but is excluded
from automatic recommendations. Kenney effects are not listed as background music.

## Catalog

| Track | Mood | Theme | Seconds | Source |
| --- | --- | --- | ---: | --- |
| Piano Melody Loop | calm, hopeful | cozy, drama, mystery | 59 | [Jadis0x](https://freesound.org/people/Jadis0x/sounds/746056/) |
| (Ambient Loop) In the Deep | mysterious | mystery, scifi | 8 | [plasterbrain](https://freesound.org/people/plasterbrain/sounds/464920/) |
| Calm background Music | hopeful, calm | cozy, adventure | 107 | [Bertsz](https://freesound.org/people/Bertsz/sounds/671900/) |
| Ambient piano loop | somber, calm | drama, mystery | 38 | [Boatlanman-](https://freesound.org/people/Boatlanman-/sounds/788677/) |
| Ambient Loop | tense, mysterious | scifi, mystery | 35 | [YellowTree](https://freesound.org/people/YellowTree/sounds/438901/) |
| Zambian ( Lo-fi Loop ) C#maj 70 BPM | calm, hopeful | cozy | 27 | [holizna](https://freesound.org/people/holizna/sounds/852235/) |
| Steel jingle 00 | hopeful | adventure | 1 | [Kenney](https://kenney.nl/assets/music-jingles) |
| Steel jingle 05 | hopeful | adventure | 1 | [Kenney](https://kenney.nl/assets/music-jingles) |
| Steel jingle 07 | hopeful | adventure | 2 | [Kenney](https://kenney.nl/assets/music-jingles) |
| Quiet Morning | calm, hopeful | cozy, drama | 86 | [Jadis0x](https://freesound.org/people/Jadis0x/sounds/832628/) |
| Sleepy Upright | calm | cozy, drama | 116 | [blankie.rest](https://freesound.org/people/blankie.rest/sounds/859607/) |
| The Old Mansion | mysterious, calm | mystery, drama | 116 | [Hakren](https://freesound.org/people/Hakren/sounds/414557/) |
| Afternoon Light | calm, hopeful | cozy, drama | 128 | [Hakren](https://freesound.org/people/Hakren/sounds/418442/) |
| The Eternal Lighthouse | somber, hopeful | mystery, drama | 89 | [jcmbo369](https://freesound.org/people/jcmbo369/sounds/819108/) |
| Unanswered Questions | mysterious, somber | mystery, drama | 78 | [ZHRØ](https://freesound.org/people/ZHR%C3%98/sounds/608399/) |
| Behind the Door | tense, mysterious | mystery, drama | 125 | [StudioOneThirtyOne](https://freesound.org/people/StudioOneThirtyOne/sounds/572931/) |
| Pieces of a Puzzle | mysterious, hopeful | mystery, fantasy | 80 | [VABsounds](https://freesound.org/people/VABsounds/sounds/441650/) |
| An Unknown Path | hopeful, calm | adventure, cozy | 32 | [code_box](https://freesound.org/people/code_box/sounds/520191/) |
| Wind Across the Valley | calm, mysterious | fantasy, adventure | 68 | [szegvari](https://freesound.org/people/szegvari/sounds/595713/) |
| A New Arrival | hopeful, mysterious | fantasy, scifi | 68 | [szegvari](https://freesound.org/people/szegvari/sounds/595716/) |
| A Town Remembered | somber, calm | fantasy, drama | 56 | [SciCodeDev](https://freesound.org/people/SciCodeDev/sounds/442902/) |
| Under the Old Tree | somber, mysterious | fantasy, scifi | 101 | [xkeril](https://freesound.org/people/xkeril/sounds/757869/) |
| Star Walk | calm, hopeful | scifi, fantasy | 67 | [szegvari](https://freesound.org/people/szegvari/sounds/595385/) |
| Beyond the Stars | mysterious, calm | scifi, adventure | 107 | [Magmi.Soundtracks](https://freesound.org/people/Magmi.Soundtracks/sounds/476556/) |
| An Unfamiliar Signal | mysterious, tense | scifi, mystery | 72 | [Sayn698](https://freesound.org/people/Sayn698/sounds/726320/) |
| A Small Campfire | calm, hopeful | cozy, adventure | 39 | [ValentinSosnitskiy](https://freesound.org/people/ValentinSosnitskiy/sounds/527783/) |
| Blinking Forest | hopeful, calm | adventure, cozy | 70 | [NearTheAtmoshphere](https://freesound.org/people/NearTheAtmoshphere/sounds/676787/) |

## Publishing and recovery

1. Apply `supabase/migrations/202610070001_music_library.sql` once in the target project.
2. Set server-side `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. Run `node --env-file=.env.local --import tsx scripts/music-library/publish.ts`.

The publisher validates the complete manifest and file hashes before writing.
It uploads immutable objects, verifies each public readback, then upserts metadata.
If the ignored local audio cache is absent, the exact published version can be
recovered from the manifest’s public Supabase URL; its SHA-256 must still match.
This also supports publishing the same library into another configured project.
Keep a separate backup if the source bucket may be removed. `--files-only` skips
metadata writes and is useful only for staged migrations.

For additions, curate a CC0 source, process and inspect the audio, add the complete
record and local cache file to the manifest, then publish. For replacements, use a
new content hash/path. Never overwrite an existing object. Set `active=false` on
the table row to hide a track from future selections without breaking old stories.
New rows become available on the next library opening without an application deployment.

## Story and export behavior

The browser streams a public version for audition. Clicking **Use music** downloads
and verifies that version, then stores the selected bytes and credits with the story.
Cloud storage deduplicates story media by content hash. HTML and JSON exports remain
self-contained; catalog URLs are not required to play an exported game offline.

The migration does not rewrite existing stories or replace their chosen tracks.
The six original music files and three original jingles were migrated byte-for-byte.
Demo chimes in `public/media/demo/` remain development fixtures, not the catalog.
