import { timingSafeEqual } from "node:crypto";

export const workshopConfigured = () => Boolean(process.env.AI_ACCESS_CODE && /^[\x21-\x7e]+$/.test(process.env.AI_ACCESS_CODE));
export function validWorkshopCode(request: Request) {
  if (!workshopConfigured()) return false;
  const expected = Buffer.from(process.env.AI_ACCESS_CODE!);
  const provided = Buffer.from(request.headers.get("X-Workshop-Code") || "");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export const usesChatGPT = () => process.env.AI_PROVIDER === "chatgpt";

// Next may normalize the internal URL to localhost. Match the actual Host to
// an exact loopback hostname and the request port; never trust forwarded hosts.
function loopbackOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const allowed = ["127.0.0.1", "localhost"].map((name) => `${name}${url.port ? `:${url.port}` : ""}`);
  return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && host && allowed.includes(host)
    ? `http://${host}` : null;
}
export function requestOrigin(request: Request) {
  return loopbackOrigin(request) || new URL(request.url).origin;
}

// Local ChatGPT actions do not need a workshop code. Every POST must also pass
// sameOrigin, and generation still requires the browser's authorized session.
// This integration is a single local runtime, never a hosted credential proxy.
export function isLocalChatGPT(request: Request) {
  return usesChatGPT() && !process.env.VERCEL && process.env.NODE_ENV !== "production" &&
    Boolean(loopbackOrigin(request));
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === requestOrigin(request);
}
