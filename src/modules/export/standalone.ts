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
  if (validateStory(story).some((i) => i.level === "error"))
    throw new Error("Fix the story checks before exporting a playable game.");
  const data = JSON.stringify(story)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A Dextro story</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f2eb;color:#292922;font:16px/1.7 system-ui,sans-serif}header{max-width:760px;margin:30px auto;padding:0 24px;display:flex;justify-content:space-between;gap:20px;font-size:13px;color:#62655e}main{max-width:700px;margin:50px auto;padding:0 24px 80px}h1{font:normal clamp(30px,6vw,48px)/1.2 Georgia,serif;overflow-wrap:anywhere}#text{font:20px/1.85 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere}button{display:block;width:100%;text-align:left;padding:17px 20px;margin:12px 0;border:1px solid #d9d9cf;border-radius:9px;background:#fffefa;color:#292922;font:inherit;cursor:pointer;overflow-wrap:anywhere}button:hover{border-color:#d56039;background:#fff6ef}button:focus-visible{outline:3px solid #c85831;outline-offset:3px}header button{width:auto;margin:0;padding:5px 12px}img{width:100%;max-height:360px;object-fit:cover;border-radius:12px}small{color:#ab5939;text-transform:uppercase;letter-spacing:.15em}#choices{margin-top:30px}.end{text-align:center;padding:25px;border-top:1px solid #ddd5c8;color:#a05335}
#sound{margin:20px 0;padding:12px;border:1px solid #d9d9cf;border-radius:9px;font-size:13px}#sound button{display:inline-block;width:auto;margin:0 15px 0 0;padding:7px 12px}#sound label{display:inline-flex;gap:8px;align-items:center}#sound input{width:100px}#sound p{margin:6px 0 0;color:#62655e}details{margin-top:30px;font-size:12px;overflow-wrap:anywhere}
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
