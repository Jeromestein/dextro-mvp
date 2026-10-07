/** One browser intent survives a lost submit response. No retry creates a new paid request. */
type Intent = { requestId: string; jobId?: string };
export type GenerationResult = { story?: unknown; asset?: unknown; repaired?: boolean; mediaWarning?: string; revision?: number; status?: string; error?: string; jobId?: string };
function wait(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1800);
    signal.addEventListener('abort', abort, {once:true});
    if (signal.aborted) abort();
  });
}
export async function requestGeneration(endpoint: string, input: object, signal: AbortSignal, scope = 'local'): Promise<GenerationResult> {
  const key = `dextro-generation:${scope}:${endpoint}:${JSON.stringify(input)}`;
  let intent: Intent = { requestId: crypto.randomUUID() };
  const browserStorage = scope !== 'local' && typeof window !== 'undefined';
  if (browserStorage) {
    try { const saved = localStorage.getItem(key); if (saved) intent = JSON.parse(saved); } catch { throw new Error('Could not read the previous generation intent. Check generation history before starting again.'); }
    // Cloud generation requires durable intent storage before any billable call.
    try { localStorage.setItem(key, JSON.stringify(intent)); }
    catch { if (scope !== 'local') throw new Error('Browser recovery storage is unavailable. Generation has not started.'); }
  }
  const keep = () => { if (browserStorage) localStorage.setItem(key, JSON.stringify(intent)); };
  const clear = () => { if (browserStorage) localStorage.removeItem(key); };
  if (!intent.jobId) {
    const response = await fetch(endpoint, { method:'POST', signal:AbortSignal.any([signal, AbortSignal.timeout(170_000)]), headers:{'Content-Type':'application/json'}, body:JSON.stringify({...input,requestId:intent.requestId}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Generation could not be submitted. Retry resumes the same request.');
    if (response.status !== 202) { clear(); return data; }
    intent.jobId = data.jobId;
    keep();
  }
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    const response = await fetch(`/api/generation-jobs/${intent.jobId}`, {cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(30_000)])});
    const result: GenerationResult = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not check generation. Retry resumes the same request.');
    if (result.status === 'succeeded') { clear(); return {...result,jobId:intent.jobId}; }
    if (result.status === 'failed' || result.status === 'cancelled') { clear(); throw new Error(result.error || 'This generation did not finish. See generation history.'); }
    if (result.status === 'outcome_unknown') throw new Error(result.error || 'The provider outcome is uncertain. This request will not be billed again automatically. Check generation history.');
    await wait(signal);
  }
  throw new Error('Generation is still being tracked. Check My Games; retry resumes this same request.');
}
