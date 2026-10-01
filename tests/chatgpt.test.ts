import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { accountAction, chatGPTCredential, chatGPTStatus, finishSignIn, SESSION_COOKIE, startSignIn, verifyIdentity, watchChatGPTRequest, withStore } from "../src/lib/chatgpt-auth";
import { readChatGPTStream, chatGPTModels } from "../src/lib/chatgpt-provider";
import { isLocalChatGPT } from "../src/lib/workshop";
import { POST as generate } from "../src/app/api/generate/route";
import { POST as connection } from "../src/app/api/chatgpt/route";
import { sampleStory } from "../src/lib/sample";

const origin = "http://127.0.0.1:3100";
const req = (cookie = "", pathname = "/api/chatgpt", body?: unknown) => new Request(`${origin}${pathname}`, {
  headers: { host: "127.0.0.1:3100", origin, cookie: `${SESSION_COOKIE}=${cookie}`, "X-Workshop-Code": "test-code", "Content-Type": "application/json" },
  ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
});
const stream = (...events: unknown[]) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""));
const completed = { type: "response.completed", response: { status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(sampleStory()) }] }] } };

test("ChatGPT local authorization and generation", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "dextro-oauth-test-"));
  const keys = ["DEXTRO_CHATGPT_DIR", "AI_PROVIDER", "AI_ACCESS_CODE", "VERCEL"];
  const previous = keys.map((key) => process.env[key]);
  const originalFetch = global.fetch;
  process.env.DEXTRO_CHATGPT_DIR = directory;
  process.env.AI_PROVIDER = "chatgpt";
  process.env.AI_ACCESS_CODE = "test-code";
  delete process.env.VERCEL;
  let cookie = "";
  let nonce = "";
  let clientId = "oaiapp_test";
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...await exportJWK(publicKey), kid: "test-key", alg: "RS256", use: "sig" };
  const mockIdentity = async (overrides: Record<string, unknown> = {}) => new SignJWT({ nonce, email: "test@example.test", ...overrides }).setProtectedHeader({ alg: "RS256", kid: "test-key" }).setIssuer("https://auth.openai.com").setAudience(clientId).setSubject("test-subject").setIssuedAt().setExpirationTime("1h").sign(privateKey);
  const mockAuth = async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).endsWith("jwks.json")) return Response.json({ keys: [jwk] });
    assert.equal(String(url), "https://auth.openai.com/api/accounts/oauth/token");
    const params = new URLSearchParams(String(options?.body));
    assert.equal(params.get("client_id"), clientId);
    assert.equal(params.get("resource"), "https://api.openai.com/v1");
    assert.equal(params.get("client_secret"), null);
    return Response.json({ access_token: "private-access", refresh_token: "private-refresh", id_token: await mockIdentity(), token_type: "Bearer", expires_in: 3600, scope: "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct" });
  };
  const begin = async (id?: string) => {
    const started = await startSignIn(req(cookie), id);
    cookie = started.cookie || cookie;
    const url = new URL(started.url); nonce = url.searchParams.get("nonce")!;
    return { url, callback: `/api/chatgpt/callback?state=${url.searchParams.get("state")}&code=test-code&client_id=${clientId}` };
  };
  try {
    await t.test("loopback, hosted, workshop and origin guards reject without provider calls", async () => {
      global.fetch = async () => { throw new Error("unexpected fetch"); };
      assert.equal(isLocalChatGPT(req()), true);
      assert.equal(isLocalChatGPT(new Request("http://localhost:3100/api/chatgpt", { headers: { host: "127.0.0.1:3100" } })), true);
      assert.equal(isLocalChatGPT(new Request("http://localhost:3100/api/chatgpt")), false);
      assert.equal(isLocalChatGPT(new Request(`${origin}/api/chatgpt`, { headers: { host: "evil.test" } })), false);
      process.env.VERCEL = "1"; assert.equal(isLocalChatGPT(req()), false); delete process.env.VERCEL;
      assert.equal((await generate(req("", "/api/generate", { premise: "A traveler enters a haunted village", tone: "Mysterious" }))).status, 401);
      assert.equal((await connection(new Request(`${origin}/api/chatgpt`, { method: "POST", headers: { host: "127.0.0.1:3100", origin: "https://evil.test", "X-Workshop-Code": "test-code" }, body: '{"action":"signin"}' }))).status, 403);
    });
    await t.test("state, browser binding, PKCE and fresh nonce precede any exchange", async () => {
      const first = await begin();
      assert.equal(first.url.searchParams.get("client_id"), "dynamic_agent_client");
      assert.equal(first.url.searchParams.get("agent_name_hint"), "Dextro");
      assert.equal(first.url.searchParams.get("code_challenge_method"), "S256");
      assert.equal(first.url.searchParams.get("redirect_uri"), `${origin}/api/chatgpt/callback`);
      const host = first.url.searchParams.get("ext_agent_host_id");
      await assert.rejects(finishSignIn(req("wrong-browser", first.callback)), /verified/);
      await assert.rejects(finishSignIn(req(cookie, "/api/chatgpt/callback?state=wrong")), /verified/);
      const second = await begin();
      assert.equal(second.url.searchParams.get("ext_agent_host_id"), host);
      assert.notEqual(first.url.searchParams.get("nonce"), second.url.searchParams.get("nonce"));
      await assert.rejects(finishSignIn(req(cookie, first.callback)), /verified/);
      global.fetch = mockAuth;
      const nextCookie = await finishSignIn(req(cookie, second.callback));
      await assert.rejects(finishSignIn(req(cookie, second.callback)), /verified/);
      cookie = nextCookie;
      const status = await chatGPTStatus(req(cookie));
      assert.equal(status.available, true);
      assert.equal(status.needsWelcome, true);
      assert.equal(JSON.stringify(status).includes("private-"), false);
      assert.equal((await stat(path.join(directory, "accounts.json"))).mode & 0o777, 0o600);
      await accountAction(req(cookie), "acknowledge");
      assert.equal((await chatGPTStatus(req(cookie))).needsWelcome, false);
    });
    await t.test("JWT verification rejects invalid issuer, audience, expiration and signature", async () => {
      const sign = (issuer: string, audience: string, expiration: number) => new SignJWT({ nonce }).setProtectedHeader({ alg: "RS256", kid: "test-key" }).setIssuer(issuer).setAudience(audience).setSubject("test-subject").setIssuedAt().setExpirationTime(expiration).sign(privateKey);
      global.fetch = mockAuth;
      const future = Math.floor(Date.now() / 1000) + 3600;
      await assert.rejects(verifyIdentity(await sign("https://evil.test", clientId, future), clientId, nonce));
      await assert.rejects(verifyIdentity(await sign("https://auth.openai.com", "wrong-client", future), clientId, nonce));
      await assert.rejects(verifyIdentity(await sign("https://auth.openai.com", clientId, 1), clientId, nonce));
      const valid = await mockIdentity();
      const parts = valid.split("."); parts[2] = (parts[2][0] === "a" ? "b" : "a") + parts[2].slice(1);
      await assert.rejects(verifyIdentity(parts.join("."), clientId, nonce));
    });
    await t.test("returning account reuses registration and rejects mismatched client and ID nonce", async () => {
      const first = await begin(clientId);
      assert.equal(first.url.searchParams.get("client_id"), clientId);
      assert.equal(first.url.searchParams.has("agent_name_hint"), false);
      await assert.rejects(finishSignIn(req(cookie, first.callback.replace(clientId, "oaiapp_other"))), /incomplete/);
      const second = await begin(clientId);
      global.fetch = async (url, options) => {
        const response = await mockAuth(url, options);
        if (String(url).endsWith("jwks.json")) return response;
        return Response.json({ ...await response.json(), id_token: await mockIdentity({ nonce: "bad" }) });
      };
      await assert.rejects(finishSignIn(req(cookie, second.callback)), /verified/);
      assert.equal((await chatGPTStatus(req(cookie))).available, true);
    });
    await t.test("refresh rotation is serialized across concurrent requests", async () => {
      await withStore((s) => { s.profiles[clientId].tokens!.expires = 0; });
      let calls = 0;
      global.fetch = async (_url, options) => {
        calls++;
        const params = new URLSearchParams(String(options?.body));
        assert.equal(params.get("grant_type"), "refresh_token");
        assert.equal(params.get("refresh_token"), "private-refresh");
        return Response.json({ access_token: "rotated-access", refresh_token: "rotated-refresh", token_type: "Bearer", expires_in: 3600 });
      };
      const values = await Promise.all([chatGPTCredential(req(cookie)), chatGPTCredential(req(cookie))]);
      assert.equal(calls, 1); assert.equal(values[0].access, "rotated-access"); assert.deepEqual(values[0], values[1]);
    });
    await t.test("plan requests use account catalog, SSE and array input without API-key fallback", async () => {
      let calls = 0;
      global.fetch = async (url, options) => {
        assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer rotated-access");
        if (String(url).endsWith("/models")) return Response.json({ models: [{ slug: "account-model", display_name: "Account model", visibility: "list" }] });
        calls++;
        const body = JSON.parse(String(options?.body));
        assert.equal(body.model, "account-model"); assert.equal(body.stream, true); assert.equal(body.store, false);
        assert.equal(body.max_output_tokens, undefined); assert.ok(Array.isArray(body.input));
        assert.equal(body.text.format.strict, true);
        return stream({ type: "response.output_text.delta", delta: "partial" }, completed);
      };
      const response = await generate(req(cookie, "/api/generate", { premise: "A traveler enters a haunted village", tone: "Mysterious", language: "zh" }));
      assert.equal(response.status, 200); assert.equal((await response.json()).story.passages.length, 9); assert.equal(calls, 1);
      assert.equal((await chatGPTModels("rotated-access", AbortSignal.timeout(1000)))[0].id, "account-model");
    });
    await t.test("model catalogs allow large metadata but return only visible model labels", async () => {
      global.fetch = async () => Response.json({ models: [
        { slug: "visible", display_name: "Visible model", visibility: "list", instructions: "x".repeat(360_000) },
        { slug: "hidden", display_name: "Hidden model", visibility: "hide" },
      ] });
      assert.deepEqual(await chatGPTModels("test", AbortSignal.timeout(1000)), [{ id: "visible", name: "Visible model" }]);
    });
    await t.test("completed streams retain incremental text without duplicating done events", async () => {
      const response = await readChatGPTStream(stream(
        { type: "response.output_text.delta", output_index: 0, content_index: 0, delta: "hello " },
        { type: "response.output_text.delta", output_index: 0, content_index: 0, delta: "world" },
        { type: "response.output_text.done", output_index: 0, content_index: 0, text: "hello world" },
        { type: "response.completed", response: { status: "completed", output: [] } },
      ).body);
      assert.equal(response.output[0].content?.[0].text, "hello world");
      const refused = await readChatGPTStream(stream(
        { type: "response.refusal.done" },
        { type: "response.completed", response: { status: "completed", output: [] } },
      ).body);
      assert.equal(refused.output[0].content?.[0].type, "refusal");
    });
    await t.test("stream truncation, failed and incomplete terminal events never produce a draft", async () => {
      await assert.rejects(readChatGPTStream(stream({ type: "response.output_text.delta", delta: "partial" }).body), /before completion/);
      await assert.rejects(readChatGPTStream(stream(completed, { type: "response.failed", response: { error: { code: "subscription_sharing_usage_limit_exceeded" } } }).body), /usage limit/);
      await assert.rejects(readChatGPTStream(stream({ type: "response.incomplete" }).body), /incomplete/);
    });
    await t.test("declined consent never exchanges and does not replace the active account", async () => {
      const started = await begin();
      global.fetch = async () => { throw new Error("unexpected exchange"); };
      await assert.rejects(finishSignIn(req(cookie, `${started.callback}&error=access_denied`)), /declined/);
      assert.equal((await chatGPTStatus(req(cookie))).available, true);
    });
    await t.test("signout attempts revocation and removes tokens while retaining registration", async () => {
      global.fetch = async (url, options) => {
        if (String(url).includes("openid-configuration")) return Response.json({ revocation_endpoint: "https://auth.openai.com/api/accounts/oauth/revoke" });
        const params = new URLSearchParams(String(options?.body));
        assert.equal(params.get("token"), "rotated-refresh");
        return new Response(null, { status: 200 });
      };
      const inFlight = await watchChatGPTRequest(req(cookie), clientId);
      assert.equal((await accountAction(req(cookie), "signout")).revoked, true);
      assert.equal(inFlight.signal.aborted, true); inFlight.release();
      const status = await chatGPTStatus(req(cookie));
      assert.equal(status.available, false); assert.equal(status.profiles.length, 1);
      await assert.rejects(chatGPTCredential(req(cookie)), /Sign in/);
      const again = await begin(clientId);
      assert.equal(again.url.searchParams.get("client_id"), clientId);
    });
    await t.test("temporary refresh errors retain tokens and terminal errors clear them", async () => {
      await withStore((store) => { store.profiles[clientId].tokens = { access: "expired", refresh: "old-refresh", expires: 0, scopes: ["chatgpt.tokens.use.direct"] }; });
      global.fetch = async () => Response.json({ error: "temporarily_unavailable" }, { status: 503 });
      await assert.rejects(chatGPTCredential(req(cookie)), /temporarily/);
      assert.equal(await withStore((store) => Boolean(store.profiles[clientId].tokens)), true);
      global.fetch = async () => Response.json({ error: "invalid_grant" }, { status: 400 });
      await assert.rejects(chatGPTCredential(req(cookie)), /expired/);
      assert.equal(await withStore((store) => Boolean(store.profiles[clientId].tokens)), false);
      assert.equal((await chatGPTStatus(req(cookie))).profiles[0].id, clientId);
    });
    await t.test("identity-only grant cannot invoke models or inference", async () => {
      clientId = "oaiapp_identity";
      const started = await begin();
      global.fetch = async (url, options) => {
        const response = await mockAuth(url, options);
        return String(url).endsWith("jwks.json") ? response : Response.json({ ...await response.json(), scope: "openid email profile" });
      };
      cookie = await finishSignIn(req(cookie, started.callback));
      assert.equal((await chatGPTStatus(req(cookie))).available, false);
      await assert.rejects(chatGPTCredential(req(cookie)), /not enabled/);
    });
  } finally {
    global.fetch = originalFetch;
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
    await rm(directory, { recursive: true, force: true });
  }
});
