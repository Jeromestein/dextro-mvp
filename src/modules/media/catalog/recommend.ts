import type { Story } from "@/modules/story/model";
import type { Mood } from "../generation/plan";
import { musicThemes, type CatalogTrack } from "./model";

type Theme = typeof musicThemes[number];
const keywords: Record<Theme, RegExp> = {
  cozy: /cozy|cosy|gentle|peaceful|village|café|cafe|温馨|治愈|日常/i,
  mystery: /mystery|mysterious|detective|secret|lighthouse|悬疑|神秘|侦探/i,
  fantasy: /fantasy|magic|dragon|wizard|enchanted|奇幻|魔法|精灵/i,
  scifi: /sci.?fi|space|robot|starship|cyber|科幻|太空|宇宙|飞船/i,
  adventure: /adventure|journey|explor|quest|冒险|探险|旅程/i,
  drama: /drama|romance|memory|memories|family|love|爱情|亲情|回忆/i,
};
export function storyMusicTheme(story: Story): Theme {
  // Genre is the strongest signal; one scene should not redefine the whole score.
  for (const theme of musicThemes) if (keywords[theme].test(story.genre)) return theme;
  const text = `${story.title} ${story.description} ${story.mediaPlan?.artBrief || ""}`;
  return musicThemes.find(theme => keywords[theme].test(text)) || "adventure";
}
export function passageMood(story: Story, passageId: string): Mood {
  return story.mediaPlan?.cues.find(cue => cue.passageId === passageId)?.mood || "calm";
}
function score(track: CatalogTrack, theme: Theme, mood: Mood, family?: string) {
  return (track.themes.includes(theme) ? 12 : 0) + (track.moods.includes(mood as Exclude<Mood, "silence">) ? 10 : 0)
    + (track.family === family ? 4 : 0) + (track.duration >= 50 ? 2 : 0) - (track.energy - 1);
}
function tie(track: CatalogTrack, story: Story) {
  // Stable diversity across stories, without changing on each render.
  let n = 2166136261;
  for (const c of `${story.id}:${track.id}`) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function recommendTracks(tracks: CatalogTrack[], story: Story, mood: Mood, limit = 3, family?: string) {
  if (mood === "silence") return [];
  const theme = storyMusicTheme(story);
  return tracks.filter(t => t.role === "music" && t.autoEligible).sort((a, b) =>
    score(b, theme, mood, family) - score(a, theme, mood, family) || tie(a, story) - tie(b, story)).slice(0, limit);
}
export function planMusic(tracks: CatalogTrack[], story: Story) {
  const choices = new Map<string, CatalogTrack>();
  const palette: CatalogTrack[] = [];
  for (const cue of story.mediaPlan?.cues || []) {
    const passage = story.passages.find(p => p.id === cue.passageId);
    if (!passage || passage.media.audioId || cue.mood === "silence") continue;
    const ranked = recommendTracks(tracks, story, cue.mood, tracks.length, palette[0]?.family);
    const matching = ranked.filter(t => t.moods.includes(cue.mood as Exclude<Mood, "silence">));
    const track = matching.find(t => palette.some(p => p.id === t.id))
      || (palette.length < 4 ? matching[0] : undefined);
    // Leave silence when no fitting mood is available within the four-track palette.
    if (!track) continue;
    if (!palette.some(p => p.id === track.id)) palette.push(track);
    choices.set(passage.id, track);
  }
  return choices;
}
