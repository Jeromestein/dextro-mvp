import { resolveTheme, themeDeclarations } from "@/modules/story/themes";
import { createAudioController } from "@/modules/media/audio/controller";
import { pruneAssets, requireStorySize } from "@/modules/media/assets/operations";
import { storySchema, validateStory, type Story } from "@/modules/story/model";
export function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const filename = (story: Story) =>
  (story.title.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "story").slice(
    0,
    80,
  );
export function buildBackup(raw: Story): string {
  const story = pruneAssets(storySchema.parse(raw));
  requireStorySize(story);
  return JSON.stringify(story);
}
export function buildGame(raw: Story): string {
  const story = pruneAssets(storySchema.parse(raw));
  requireStorySize(story);
  // Layout belongs to the authoring workspace, not the standalone player.
  delete story.editor;
  delete story.mediaPlan;
  // Provider prompts are authoring metadata, not part of a public playable file.
  story.assets = story.assets.map(asset => {
    if (asset.provenance?.provider !== "openai") return asset;
    const exported = { ...asset };
    delete exported.provenance;
    return exported;
  });
  if (validateStory(story).some((i) => i.level === "error"))
    throw new Error("Fix the story checks before exporting a playable game.");
  const theme = resolveTheme(story);
  const data = JSON.stringify(story)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html lang="en" data-story-theme="${theme.id}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A Dextro story</title><style>
:root{${themeDeclarations(theme)}}
*{box-sizing:border-box}body{margin:0;background:var(--story-backdrop);color:var(--story-text);font:16px/1.7 system-ui,sans-serif}header{max-width:760px;margin:30px auto;padding:0 24px;display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:13px;color:var(--story-muted)}header span{overflow-wrap:anywhere;min-width:0}main{max-width:700px;margin:35px auto 60px;padding:30px 48px 40px;background:var(--story-surface);border:1px solid var(--story-border);border-radius:10px;box-shadow:0 16px 48px #00000012}h1{font:normal clamp(30px,6vw,36px)/1.2 Georgia,serif;overflow-wrap:anywhere}#text{font:19px/1.85 Georgia,serif;color:var(--story-narrative);white-space:pre-wrap;overflow-wrap:anywhere}button{display:block;width:100%;text-align:left;padding:16px;margin:12px 0;border:1px solid var(--story-border);border-radius:6px;background:var(--story-choice);color:var(--story-text);font:inherit;cursor:pointer;overflow-wrap:anywhere}button:hover{border-color:var(--story-accent);background:var(--story-hover)}:is(button,input,summary):focus-visible{outline:2px solid var(--story-accent);outline-offset:4px}header button{width:auto;margin:0;padding:5px 12px;flex-shrink:0}h1:focus{outline:none}img{width:100%;max-height:360px;object-fit:cover;border-radius:6px}small{color:var(--story-accent);text-transform:uppercase;letter-spacing:.15em}#choices{margin-top:30px}.end{text-align:center;padding:25px;border-top:1px solid var(--story-border);color:var(--story-accent)}
#sound{margin:20px 0;padding:12px;border:1px solid var(--story-border);background:var(--story-choice);border-radius:8px;font-size:13px}#sound button{display:inline-block;width:auto;margin:0 15px 0 0;padding:7px 12px}#sound label{display:inline-flex;gap:8px;align-items:center;color:var(--story-muted)}#sound input{width:100px;accent-color:var(--story-accent)}#sound p{margin:6px 0 0;color:var(--story-muted)}details{margin-top:30px;font-size:12px;color:var(--story-muted);overflow-wrap:anywhere}
@media(max-width:600px){header{padding:0 20px;margin:20px auto}main{margin:20px 12px 40px;padding:24px 22px}#text{font-size:17px}button{font-size:14px}}
</style><header><span id="story-title"></span><button id="restart">Restart</button></header><main><section id="sound" aria-label="Story sound" hidden><button id="sound-toggle" aria-pressed="false">Enable sound</button><label>Volume <input id="volume" aria-label="Story volume" type="range" min="0" max="1" step="0.05" value="0.35"></label><p id="track-name"></p></section><small id="kind"></small><h1 id="title" tabindex="-1"></h1><img id="image" alt="Story illustration" hidden><p id="text"></p><div id="choices"></div><details id="credits" hidden><summary>Media credits</summary><div id="credit-list"></div></details></main><script type="application/json" id="story-data">${data}</script><script>
const story=JSON.parse(document.getElementById('story-data').textContent);document.title=story.title;document.getElementById('story-title').textContent=story.title;
const createAudioController=${createAudioController.toString()};
let soundEnabled=false;const soundButton=document.getElementById('sound-toggle');const audio=createAudioController(status=>{soundEnabled=status==='playing'||status==='silent';soundButton.textContent=soundEnabled?'Mute':status==='blocked'?'Retry sound':'Enable sound';soundButton.setAttribute('aria-pressed',String(soundEnabled));if(status==='blocked')document.getElementById('track-name').textContent='Sound could not play. Try again or continue reading.';});
document.getElementById('sound').hidden=!story.assets.some(a=>a.kind==='audio');soundButton.onclick=()=>soundEnabled?audio.mute():audio.enable();document.getElementById('volume').oninput=e=>audio.setVolume(Number(e.target.value));window.addEventListener('pagehide',()=>audio.dispose(),{once:true});
story.assets.filter(a=>a.credit).forEach(a=>{document.getElementById('credits').hidden=false;const row=document.createElement('p');row.textContent=a.name+' — '+a.credit;document.getElementById('credit-list').append(row);});
function show(id){const p=story.passages.find(n=>n.id===id);if(!p)return;document.getElementById('kind').textContent=p.ending?'An ending':id===story.startId?'The beginning':'Your story continues';document.getElementById('title').textContent=p.title;document.getElementById('text').textContent=p.text;const image=story.assets.find(a=>a.id===p.media.imageId&&a.kind==='image');const music=story.assets.find(a=>a.id===p.media.audioId&&a.kind==='audio');audio.setTrack(music?music.data:'');document.getElementById('track-name').textContent=music?music.name:'Silence for this passage';const img=document.getElementById('image');img.hidden=!image;if(image)img.src=image.data;else img.removeAttribute('src');const choices=document.getElementById('choices');choices.replaceChildren();if(p.ending){const end=document.createElement('p');end.className='end';end.textContent='The end. Another choice, another story.';choices.append(end);const b=document.createElement('button');b.textContent='Begin again ↗';b.onclick=()=>show(story.startId);choices.append(b);}else p.choices.forEach(c=>{const b=document.createElement('button');b.textContent=c.text+' →';b.onclick=()=>show(c.target);choices.append(b);});window.scrollTo(0,0);document.getElementById('title').focus({preventScroll:true});}
document.getElementById('restart').onclick=()=>show(story.startId);show(story.startId);
</script></html>`;
}
