// Shared across route bundles and development reloads in this local Node process.
const key = Symbol.for("dextro.chatgpt.requests");
type Lease = { profileId: string; sessionId: string; controller: AbortController };
const runtime = globalThis as typeof globalThis & { [key]?: Set<Lease> };
const leases = runtime[key] ??= new Set<Lease>();
export function trackChatGPTRequest(profileId: string, sessionId: string) {
  const lease = { profileId, sessionId, controller: new AbortController() };
  leases.add(lease);
  return { signal: lease.controller.signal, release: () => leases.delete(lease) };
}
export function stopChatGPTRequests(profileId: string, sessionId?: string) {
  for (const lease of leases) {
    if (lease.profileId === profileId && (!sessionId || lease.sessionId === sessionId)) {
      lease.controller.abort(new Error("ChatGPT connection changed."));
      leases.delete(lease);
    }
  }
}
