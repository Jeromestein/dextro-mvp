import { timingSafeEqual } from "node:crypto";

export const workshopConfigured = () => Boolean(process.env.AI_ACCESS_CODE && /^[\x21-\x7e]+$/.test(process.env.AI_ACCESS_CODE));
export function validWorkshopCode(request: Request) {
  if (!workshopConfigured()) return false;
  const expected = Buffer.from(process.env.AI_ACCESS_CODE!);
  const provided = Buffer.from(request.headers.get("X-Workshop-Code") || "");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export const usesChatGPT = () => process.env.AI_PROVIDER === "chatgpt";

// Next normalizes loopback URLs to localhost internally. Validate the actual Host
// independently and retain 127.0.0.1 in the OAuth callback and Origin checks.
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const expected = `127.0.0.1${url.port ? `:${url.port}` : ""}`;
  if (url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && host === expected)
    return `http://${expected}`;
  return url.origin;
}

// This integration is a single local runtime, never a hosted credential proxy.
export function isLocalChatGPT(request: Request) {
  const url = new URL(request.url);
  const expected = `127.0.0.1${url.port ? `:${url.port}` : ""}`;
  return usesChatGPT() && !process.env.VERCEL && process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) &&
    request.headers.get("host") === expected;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === requestOrigin(request);
}
