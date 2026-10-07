"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { loadCloudAsset, requestJSON } from '@/storage/cloud-repository';
import type { MediaAsset, MediaKind } from '@/modules/media/assets/model';
import type { AssetInfo } from './model';
import SoundControls from '@/modules/media/audio/sound-controls';

export default function SavedMedia({kind,onApply}:{kind:MediaKind;onApply:(asset:MediaAsset)=>boolean}) {
  const [assets,setAssets]=useState<AssetInfo[]>([]),[next,setNext]=useState<number|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(true),[selected,setSelected]=useState<MediaAsset|null>(null);
  useEffect(()=>{
    let active=true;
    requestJSON(`/api/assets?kind=${kind}`).then(page=>{if(active){setAssets(page.assets);setNext(page.nextOffset);}}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[kind]);
  const more=async()=>{setBusy(true);try{const page=await requestJSON(`/api/assets?kind=${kind}&offset=${next}`);setAssets(previous=>[...previous,...page.assets]);setNext(page.nextOffset);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const preview=async(info:AssetInfo)=>{setBusy(true);setError('');try{setSelected(await loadCloudAsset(info));}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <div className="saved-media"><h4>Saved {kind==='image'?'images':'music'}</h4><p className="media-file-hint">Private files from your games. Generated images stay here even when you dismiss a preview.</p>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {assets.map(asset=><button className="saved-media-row" key={asset.id} disabled={busy} onClick={()=>void preview(asset)}><strong>{asset.name}</strong><small>{asset.source} · {(asset.byte_size/1_000_000).toFixed(1)} MB</small></button>)}
    {!assets.length&&!busy&&<p className="quiet">No saved files yet.</p>}{busy&&<p role="status">Loading saved media…</p>}
    {next!==null&&<button className="button" disabled={busy} onClick={()=>void more()}>Load more</button>}
    {selected&&<div className="media-candidate">{selected.kind==='image'?<Image unoptimized src={selected.data} alt={selected.name} width={640} height={426}/>:<SoundControls data={selected.data} title={selected.name} audition/>}<p>{selected.credit}</p><button className="button primary" onClick={()=>{try{if(onApply(selected))setSelected(null);else setError('Could not apply this file. Download a backup and check storage.');}catch(e){setError((e as Error).message);}}}>Use {kind==='image'?'image':'music'}</button></div>}
  </div>;
}
