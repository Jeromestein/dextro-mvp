import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, rm, chmod } from "node:fs/promises";
import path from "node:path";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { ServiceError, readBounded } from "./server-errors";
import { requestOrigin } from "./workshop";
import { stopChatGPTRequests, trackChatGPTRequest } from "./chatgpt-requests";

const ISSUER = "https://auth.openai.com";
const RESOURCE = "https://api.openai.com/v1";
const SCOPE = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
export const SESSION_COOKIE = "dextro_chatgpt_session";
const sessionAge = 8 * 60 * 60 * 1000;
const random = () => randomBytes(32).toString("base64url");
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const directory = () => process.env.DEXTRO_CHATGPT_DIR || path.join(process.cwd(), ".dextro-chatgpt");
type Tokens = { access: string; refresh?: string; id?: string; expires: number; scopes: string[] };
type Profile = { clientId: string; subject?: string; email?: string; tokens?: Tokens; welcomed?: boolean };
type Session = { expires: number; profileId?: string };
type Pending = { state: string; nonce: string; verifier: string; redirect: string; expires: number; session: string; profileId?: string };
type Store = { host: string; profiles: Record<string, Profile>; sessions: Record<string, Session>; pending: Record<string, Pending> };

// A filesystem lock also serializes rotating refresh tokens across Next workers.
// Keep one local Next runtime per storage directory. Never auto-break a live lock.
export async function withStore<T>(fn: (store: Store) => Promise<T> | T): Promise<T> {
  const dir = directory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const lock = path.join(dir, "lock");
  const deadline = Date.now() + 25_000;
  while (true) {
    try { await mkdir(lock); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() > deadline) throw new ServiceError("The local account store is busy. Try again shortly.", 503);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  try {
    const file = path.join(dir, "accounts.json");
    let store: Store;
    try { store = JSON.parse(await readFile(file, "utf8")); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      store = { host: `urn:uuid:${randomUUID()}`, profiles: {}, sessions: {}, pending: {} };
    }
    for (const [key, item] of Object.entries(store.sessions)) if (item.expires <= Date.now()) delete store.sessions[key];
    for (const [key, item] of Object.entries(store.pending)) if (item.expires <= Date.now()) delete store.pending[key];
    // Save state consumption and unusable-token removal even when a flow fails.
    try { return await fn(store); }
    finally {
      const temp = path.join(dir, `accounts.${randomUUID()}.tmp`);
      try {
        await writeFile(temp, JSON.stringify(store), { mode: 0o600, flag: "wx" });
        await rename(temp, file);
      } finally { await rm(temp, { force: true }); }
    }
  } finally { await rm(lock, { recursive: true, force: true }); }
}

function sessionKey(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? digest(value) : "";
}
function session(store: Store, request: Request) {
  const value = store.sessions[sessionKey(request)];
  if (!value) throw new ServiceError("Continue with ChatGPT to connect this browser.", 401);
  return value;
}
function active(store: Store, request: Request) {
  const current = session(store, request);
  const profile = current.profileId ? store.profiles[current.profileId] : undefined;
  if (!profile?.tokens) throw new ServiceError("Sign in to ChatGPT again to continue.", 401);
  if (!profile.tokens.scopes.includes("chatgpt.tokens.use.direct")) throw new ServiceError("ChatGPT plan use is not enabled. Connect again to grant permission.", 403);
  return profile;
}

export async function chatGPTStatus(request: Request) {
  return withStore((store) => {
    const current = store.sessions[sessionKey(request)];
    if (!current) return { available: false, profiles: [], activeId: "", needsWelcome: false };
    const profile = current.profileId ? store.profiles[current.profileId] : undefined;
    return {
      available: Boolean(profile?.tokens?.scopes.includes("chatgpt.tokens.use.direct")),
      activeId: current.profileId || "",
      needsWelcome: Boolean(profile?.tokens?.scopes.includes("chatgpt.tokens.use.direct") && !profile.welcomed),
      profiles: Object.values(store.profiles).map((p, i) => ({ id: p.clientId, label: `${p.email || "ChatGPT account"} · ${i + 1}`, connected: Boolean(p.tokens), planEnabled: Boolean(p.tokens?.scopes.includes("chatgpt.tokens.use.direct")) })),
    };
  });
}

export async function startSignIn(request: Request, profileId?: string) {
  return withStore((store) => {
    let rawSession: string | undefined;
    let key = sessionKey(request);
    if (!store.sessions[key]) {
      rawSession = random(); key = digest(rawSession);
      store.sessions[key] = { expires: Date.now() + sessionAge };
    }
    const profile = profileId ? store.profiles[profileId] : undefined;
    if (profileId && !profile) throw new ServiceError("Choose a saved account or add a new one.", 400);
    const pending: Pending = {
      state: random(), nonce: random(), verifier: random(),
      redirect: `${requestOrigin(request)}/api/chatgpt/callback`,
      expires: Date.now() + 10 * 60_000, session: key, profileId,
    };
    // Only one outstanding attempt per browser; repeated clicks invalidate the old one.
    for (const [id, p] of Object.entries(store.pending)) if (p.session === key) delete store.pending[id];
    store.pending[pending.state] = pending;
    const params = new URLSearchParams({
      client_id: profile?.clientId || "dynamic_agent_client", ext_agent_host_id: store.host,
      response_type: "code", redirect_uri: pending.redirect, scope: SCOPE, resource: RESOURCE,
      state: pending.state, nonce: pending.nonce, code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(pending.verifier).digest("base64url"),
    });
    if (!profile) params.set("agent_name_hint", "Dextro");
    if (profile?.email) params.set("login_hint", profile.email);
    if (profile?.tokens && !profile.tokens.scopes.includes("chatgpt.tokens.use.direct")) params.set("prompt", "consent");
    // Omit id_token_hint so tokens never pass through the studio's browser code.
    return { url: `${ISSUER}/api/accounts/authorize?${params}`, cookie: rawSession };
  });
}

const tokenSchema = z.object({
  access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), id_token: z.string().min(1).optional(),
  token_type: z.string().refine((value) => value.toLowerCase() === "bearer"),
  expires_in: z.number().positive(), scope: z.string().optional(),
});
async function exchange(parameters: Record<string, string>) {
  const res = await fetch(`${ISSUER}/api/accounts/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...parameters, resource: RESOURCE }), signal: AbortSignal.timeout(12_000),
  });
  let data;
  try { data = JSON.parse(await readBounded(res.body, 100_000)); } catch { throw new ServiceError("ChatGPT returned an unreadable sign-in response. Try again."); }
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : data.error?.code;
    const terminal = ["invalid_grant", "invalid_refresh_token", "token_expired", "refresh_token_expired", "refresh_token_invalidated", "refresh_token_reused"].includes(code);
    throw new ServiceError(terminal ? "Your ChatGPT session has expired. Continue with the saved account to sign in again." : "ChatGPT sign-in is temporarily unavailable. Try again later.", terminal ? 401 : 503);
  }
  return tokenSchema.parse(data);
}
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
export async function verifyIdentity(idToken: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ISSUER, audience: clientId, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat", "nonce"], clockTolerance: 5,
  });
  if (payload.nonce !== nonce || !payload.sub) throw new ServiceError("ChatGPT identity could not be verified. Start sign-in again.", 401);
  return { subject: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}
export async function finishSignIn(request: Request) {
  return withStore(async (store) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") || "";
    const pending = store.pending[state];
    if (!pending || pending.session !== sessionKey(request)) throw new ServiceError("Sign-in expired or could not be verified. Start again.", 401);
    delete store.pending[state];
    if (`${requestOrigin(request)}${url.pathname}` !== pending.redirect || !store.sessions[pending.session]) throw new ServiceError("Sign-in could not be verified. Start again.", 401);
    if (url.searchParams.has("error")) throw new ServiceError("ChatGPT sign-in was cancelled or permission was declined. You can try again.", 400);
    const suppliedId = url.searchParams.get("client_id");
    const clientId = pending.profileId || suppliedId;
    if (!clientId || !/^oaiapp_[A-Za-z0-9_-]+$/.test(clientId) || (pending.profileId && suppliedId && suppliedId !== pending.profileId)) throw new ServiceError("ChatGPT registration was incomplete. Start sign-in again.", 401);
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096) throw new ServiceError("No authorization code was returned. Start sign-in again.", 401);
    // Retain the issued registration after an exchange failure, without assigning identity.
    const profile = store.profiles[clientId] || { clientId };
    store.profiles[clientId] = profile;
    const tokens = await exchange({ grant_type: "authorization_code", client_id: clientId, code, code_verifier: pending.verifier, redirect_uri: pending.redirect });
    if (!tokens.id_token) throw new ServiceError("ChatGPT did not return a verifiable identity. Sign in again.", 401);
    const identity = await verifyIdentity(tokens.id_token, clientId, pending.nonce);
    if (profile.subject && identity.subject !== profile.subject) throw new ServiceError("This sign-in belongs to a different account. Add it separately.", 401);
    Object.assign(profile, identity, { tokens: {
      access: tokens.access_token, refresh: tokens.refresh_token, id: tokens.id_token,
      expires: Date.now() + tokens.expires_in * 1000, scopes: (tokens.scope || "").split(" ").filter(Boolean),
    } });
    const rawSession = random();
    store.sessions[digest(rawSession)] = { expires: Date.now() + sessionAge, profileId: clientId };
    const priorAccount = store.sessions[pending.session]?.profileId;
    if (priorAccount) stopChatGPTRequests(priorAccount, pending.session);
    delete store.sessions[pending.session];
    return rawSession;
  });
}

export async function accountAction(request: Request, action: "select" | "acknowledge" | "signout", profileId?: string) {
  return withStore(async (store) => {
    const current = session(store, request);
    if (action === "select") {
      const profile = profileId ? store.profiles[profileId] : undefined;
      if (!profile?.subject || !profile.tokens) throw new ServiceError("Continue with this account to sign in again.", 401);
      if (current.profileId) stopChatGPTRequests(current.profileId, sessionKey(request));
      current.profileId = profileId;
      return { message: "ChatGPT account selected." };
    }
    const profile = current.profileId ? store.profiles[current.profileId] : undefined;
    if (!profile) throw new ServiceError("No ChatGPT account is selected.", 400);
    if (action === "acknowledge") {
      profile.welcomed = true;
      return { message: "ChatGPT plan usage confirmed." };
    }
    stopChatGPTRequests(profile.clientId);
    let revoked = !profile.tokens?.refresh;
    try {
      if (profile.tokens?.refresh) {
        const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5_000) });
        const metadata = JSON.parse(await readBounded(discovery.body, 30_000));
        const endpoint = new URL(metadata.revocation_endpoint);
        if (!discovery.ok || endpoint.origin !== ISSUER || endpoint.username || endpoint.password) throw new Error("Invalid discovery");
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch(endpoint, {
              method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ token: profile.tokens.refresh, token_type_hint: "refresh_token", client_id: profile.clientId }),
              signal: AbortSignal.timeout(5_000), redirect: "error",
            });
            revoked = response.status === 200;
            await response.body?.cancel();
            if (revoked || response.status < 500) break;
          } catch { /* Retry once while the refresh token is still available. */ }
          if (!attempt) await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    } catch { revoked = false; }
    delete profile.tokens;
    return { message: revoked ? "Signed out of ChatGPT in Dextro." : "Signed out locally. Remote revocation was not confirmed; disconnect Dextro in ChatGPT Settings.", revoked };
  });
}

export async function chatGPTCredential(request: Request) {
  return withStore(async (store) => {
    const profile = active(store, request);
    let tokens = profile.tokens!;
    if (tokens.expires < Date.now() + 60_000) {
      if (!tokens.refresh) { delete profile.tokens; throw new ServiceError("Continue with the saved ChatGPT account to sign in again.", 401); }
      try {
        const renewed = await exchange({ grant_type: "refresh_token", client_id: profile.clientId, refresh_token: tokens.refresh });
        tokens = {
          access: renewed.access_token, refresh: renewed.refresh_token || tokens.refresh, id: renewed.id_token || tokens.id,
          expires: Date.now() + renewed.expires_in * 1000,
          scopes: renewed.scope === undefined ? tokens.scopes : renewed.scope.split(" ").filter(Boolean),
        };
        profile.tokens = tokens;
      } catch (error) {
        if (error instanceof ServiceError && error.status === 401) delete profile.tokens;
        throw error;
      }
    }
    if (!tokens.scopes.includes("chatgpt.tokens.use.direct")) throw new ServiceError("ChatGPT plan use is not enabled. Connect again to grant permission.", 403);
    return { access: tokens.access, clientId: profile.clientId };
  });
}

export async function watchChatGPTRequest(request: Request, expectedAccount: string) {
  return withStore((store) => {
    const profile = active(store, request);
    if (profile.clientId !== expectedAccount) throw new ServiceError("The ChatGPT account changed. Start a new generation.", 409);
    return trackChatGPTRequest(profile.clientId, sessionKey(request));
  });
}
