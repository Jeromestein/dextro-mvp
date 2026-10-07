"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { requestJSON } from '@/storage/cloud-repository';
import { useLibrary } from '@/modules/workspace/library-provider';
import type { JobInfo } from './model';
const labels:Record<string,string>={queued:'Queued',running:'Generating',persisting:'Saving result',succeeded:'Saved',failed:'Needs attention',cancelled:'Stopped before generation',outcome_unknown:'Provider outcome uncertain'};
export default function GenerationHistory(){
  const [jobs,setJobs]=useState<JobInfo[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const {refreshLibrary}=useLibrary();
  const refresh=useCallback(async()=>{setBusy(true);try{const page=await requestJSON('/api/generation-jobs');setJobs(page.jobs);setError('');await refreshLibrary();}catch(e){setError((e as Error).message);}finally{setBusy(false);}},[refreshLibrary]);
  useEffect(()=>{const timer=setTimeout(()=>void refresh(),0);return()=>clearTimeout(timer);},[refresh]);
  useEffect(()=>{if(!jobs.some(job=>['queued','running','persisting'].includes(job.status)))return;const timer=setInterval(()=>void refresh(),6000);return()=>clearInterval(timer);},[jobs,refresh]);
  return <section className="generation-history"><div className="section-heading"><div><span className="eyebrow muted">RECENT ACTIVITY</span><h2>Generation history</h2></div><button className="button subtle" disabled={busy} onClick={()=>void refresh()}>{busy?'Checking…':'Refresh'}</button></div><p>Submitted generations keep their results here. Saved images are reusable from any passage’s Media panel.</p>{error&&<p className="form-error" role="alert">{error}</p>}
    {!jobs.length&&!busy&&<p className="quiet">No generations yet.</p>}
    {jobs.map(job=><article className="generation-record" key={job.id}><div><strong>{job.kind==='image'?'Scene image':'Story draft'}</strong><small>{new Date(job.created_at).toLocaleString()}</small></div><span>{labels[job.status]||job.status}</span>{job.result?.storyId&&<Link href={`/builder/${encodeURIComponent(job.result.storyId)}`}>Open draft</Link>}{job.error&&<p role="status">{job.error}</p>}</article>)}
  </section>;
}
