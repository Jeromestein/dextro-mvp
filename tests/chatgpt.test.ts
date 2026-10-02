import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { accountAction, chatGPTCredential, chatGPTStatus, finishSignIn, SESSION_COOKIE, startSignIn, verifyIdentity, watchChatGPTRequest, withStore } from "../src/lib/chatgpt-auth";
import { readChatGPTStream, chatGPTModels } from "../src/lib/chatgpt-provider";
import { isLocalChatGPT, requestOrigin, sameOrigin } from "../src/lib/workshop";
import { GET as generationStatus, POST as generate } from "../src/app/api/generate/route";
import { GET as connectionStatus, POST as connection } from "../src/app/api/chatgpt/route";
import { GET as callback } from "../src/app/api/chatgpt/callback/route";
import { sampleStory } from "../src/lib/sample";

const origin = "http://127.0.0.1:3100";
const req = (cookie = "", pathname = "/api/chatgpt", body?: unknown) => new Request(`${origin}${pathname}`, {
  headers: { host: "127.0.0.1:3100", origin, cookie: `${SESSION_COOKIE}=${cookie}`, "Content-Type": "application/json" },
  ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
});
const stream = (...events: unknown[]) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""));
const completed = { type: "response.completed", response: { status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(sampleStory()) }] }] } };

test("ChatGPT local authorization and generation", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "dextro-oauth-test-"));
  const keys = ["DEXTRO_CHATGPT_DIR", "AI_PROVIDER", "AI_ACCESS_CODE", "VERCEL", "NODE_ENV"];
  const previous = keys.map((key) => process.env[key]);
  const originalFetch = global.fetch;
  process.env.DEXTRO_CHATGPT_DIR = directory;
  process.env.AI_PROVIDER = "chatgpt";
  delete process.env.AI_ACCESS_CODE;
  Object.assign(process.env, { NODE_ENV: "test" });
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
    await t.test("code-free local actions still reject hosted, non-loopback, missing-origin and cross-origin requests", async () => {
      global.fetch = async () => { throw new Error("unexpected fetch"); };
      assert.equal(isLocalChatGPT(req()), true);
      assert.equal(isLocalChatGPT(new Request("http://localhost:3100/api/chatgpt", { headers: { host: "127.0.0.1:3100" } })), true);
      assert.equal(isLocalChatGPT(new Request("http://localhost:3100/api/chatgpt")), false);
      const local = new Request("http://localhost:3100/api/chatgpt", { headers: { host: "localhost:3100", origin: "http://localhost:3100" } });
      assert.equal(isLocalChatGPT(local), true);
      assert.equal(requestOrigin(local), "http://localhost:3100");
      assert.equal(sameOrigin(local), true);
      assert.equal(isLocalChatGPT(new Request(`${origin}/api/chatgpt`, { headers: { host: "evil.test" } })), false);
      process.env.VERCEL = "1"; assert.equal(isLocalChatGPT(req()), false); delete process.env.VERCEL;
      assert.equal((await generate(req("", "/api/generate", { premise: "A traveler enters a haunted village", tone: "Mysterious" }))).status, 401);
      assert.equal((await connection(new Request(`${origin}/api/chatgpt`, { method: "POST", headers: { host: "127.0.0.1:3100", origin: "https://evil.test", "X-Workshop-Code": "test-code" }, body: '{"action":"signin"}' }))).status, 403);
      const cases: Record<string, string>[] = [
        { host: "evil.test", origin },
        { host: "127.0.0.1:3100" },
        { host: "127.0.0.1:3100", origin: "null" },
        { host: "127.0.0.1:3100", origin: "http://127.0.0.1:9999" },
        { host: "127.0.0.1:3100", origin: "https://evil.test" },
        { host: "localhost:3100", origin },
        { host: "127.0.0.1:3100", origin: "http://localhost:3100" },
        { host: "localhost:9999", origin: "http://localhost:9999" },
        { host: "localhost.evil.test:3100", origin: "http://localhost.evil.test:3100" },
      ];
      for (const headers of cases) {
        for (const [pathname, handler] of [["/api/chatgpt", connection], ["/api/generate", generate]] as const) {
          assert.equal((await handler(new Request(`${origin}${pathname}`, { method: "POST", headers, body: '{}' }))).status, 403);
        }
      }
      for (const environment of ["VERCEL", "NODE_ENV"]) {
        process.env[environment] = environment === "VERCEL" ? "1" : "production";
        assert.equal((await connection(req("", "/api/chatgpt", { action: "signin" }))).status, 403);
        assert.equal((await generate(req("", "/api/generate", {}))).status, 403);
        assert.equal((await connectionStatus(req())).status, 403);
        delete process.env[environment];
      }
      Object.assign(process.env, { NODE_ENV: "test" });
    });
    await t.test("local sign-in starts without a configured or entered workshop code", async () => {
      global.fetch = async () => { throw new Error("unexpected fetch"); };
      assert.equal(process.env.AI_ACCESS_CODE, undefined);
      assert.equal((await (await connectionStatus(req())).json()).configured, true);
      assert.equal((await (await generationStatus(req())).json()).available, false);
      const result = await connection(req("", "/api/chatgpt", { action: "signin" }));
      assert.equal(result.status, 200);
      assert.equal(new URL((await result.json()).url).origin, "https://auth.openai.com");
      assert.match(result.headers.get("set-cookie") || "", /HttpOnly/i);
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
      assert.equal((await (await generationStatus(req(cookie))).json()).available, true);
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
    await t.test("plan requests default to Luna even when another model is listed first", async () => {
      let calls = 0;
      global.fetch = async (url, options) => {
        assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer rotated-access");
        if (String(url).endsWith("/models")) return Response.json({ models: [
          { slug: "account-model", display_name: "Account model", visibility: "list" },
          { slug: "gpt-5.6-luna", display_name: "GPT-5.6 Luna", visibility: "list" },
        ] });
        calls++;
        const body = JSON.parse(String(options?.body));
        assert.equal(body.model, "gpt-5.6-luna"); assert.equal(body.stream, true); assert.equal(body.store, false);
        assert.equal(body.max_output_tokens, undefined); assert.ok(Array.isArray(body.input));
        assert.equal(body.text.format.strict, true);
        return stream({ type: "response.output_text.delta", delta: "partial" }, completed);
      };
      const response = await generate(req(cookie, "/api/generate", { premise: "A traveler enters a haunted village", tone: "Mysterious", language: "zh" }));
      assert.equal(response.status, 200); assert.equal((await response.json()).story.passages.length, 9); assert.equal(calls, 1);
      const catalog = await connection(req(cookie, "/api/chatgpt", { action: "models" }));
      assert.equal(catalog.status, 200);
      assert.equal((await catalog.json()).models[0].id, "account-model");
      assert.equal((await chatGPTModels("rotated-access", AbortSignal.timeout(1000)))[0].id, "account-model");
    });
    await t.test("unavailable Luna does not silently switch models and explicit selection still works", async () => {
      let calls = 0;
      global.fetch = async (url, options) => {
        if (String(url).endsWith("/models")) return Response.json({ models: [
          { slug: "account-model", display_name: "Account model", visibility: "list" },
          { slug: "gpt-5.6-luna", display_name: "GPT-5.6 Luna", visibility: "hide" },
        ] });
        calls++;
        assert.equal(JSON.parse(String(options?.body)).model, "account-model");
        return stream(completed);
      };
      const brief = { premise: "A traveler enters a haunted village", tone: "Mysterious", language: "zh" };
      const unavailable = await generate(req(cookie, "/api/generate", brief));
      assert.equal(unavailable.status, 400);
      assert.match((await unavailable.json()).error, /GPT-5.6 Luna.*Settings/);
      assert.equal((await generate(req(cookie, "/api/generate", { ...brief, model: "unknown-model" }))).status, 400);
      assert.equal(calls, 0);
      assert.equal((await generate(req(cookie, "/api/generate", { ...brief, model: "account-model" }))).status, 200);
      assert.equal(calls, 1);
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
    await t.test("localhost callback relays from IPv4 and completes only in the initiating browser", async () => {
      clientId = "oaiapp_localhost";
      const localRequest = (token = "", pathname = "/api/chatgpt", body?: unknown) => new Request(`http://localhost:3100${pathname}`, {
        headers: { host: "localhost:3100", origin: "http://localhost:3100", cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" },
        ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      });
      global.fetch = async () => { throw new Error("unexpected provider call"); };
      const started = await connection(localRequest("", "/api/chatgpt", { action: "signin" }));
      assert.equal(started.status, 200);
      const browserCookie = started.headers.get("set-cookie")!.split(";")[0].split("=")[1];
      const authorize = new URL((await started.json()).url);
      nonce = authorize.searchParams.get("nonce")!;
      assert.equal(authorize.searchParams.get("redirect_uri"), `${origin}/api/chatgpt/callback`);
      const providerReturn = `/api/chatgpt/callback?state=${authorize.searchParams.get("state")}&code=local-code&client_id=${clientId}&returnTo=https://evil.test`;
      const relay = await callback(req("", providerReturn));
      assert.equal(relay.status, 303);
      assert.equal(relay.headers.get("set-cookie"), null);
      assert.equal(relay.headers.get("cache-control"), "no-store");
      assert.equal(relay.headers.get("referrer-policy"), "no-referrer");
      const destination = new URL(relay.headers.get("location")!);
      assert.equal(destination.origin, "http://localhost:3100");
      assert.equal(destination.pathname, "/api/chatgpt/callback");
      assert.equal(destination.searchParams.has("returnTo"), false);
      const pathname = `${destination.pathname}${destination.search}`;
      await assert.rejects(finishSignIn(localRequest("wrong-browser", pathname)), /verified/);
      assert.equal((await chatGPTStatus(localRequest(browserCookie))).available, false);
      global.fetch = async (url, options) => {
        if (!String(url).endsWith("jwks.json")) {
          const form = new URLSearchParams(String(options?.body));
          assert.equal(form.get("redirect_uri"), `${origin}/api/chatgpt/callback`);
          assert.equal(form.get("code"), "local-code");
        }
        return mockAuth(url, options);
      };
      const completed = await callback(localRequest(browserCookie, pathname));
      assert.match(await completed.text(), /Connection complete/);
      const newCookie = completed.headers.get("set-cookie")!;
      assert.match(newCookie, /HttpOnly/i);
      assert.doesNotMatch(newCookie, /Domain=/i);
      const token = newCookie.split(";")[0].split("=")[1];
      assert.equal((await (await generationStatus(localRequest(token, "/api/generate"))).json()).available, true);
      await assert.rejects(finishSignIn(localRequest(browserCookie, pathname)), /verified/);
      assert.equal((await callback(req("", providerReturn))).headers.get("location"), null);
      global.fetch = async () => { throw new Error("unexpected provider call"); };
      const next = await startSignIn(localRequest(token));
      const expiredState = new URL(next.url).searchParams.get("state")!;
      await withStore((store) => { store.pending[expiredState].expires = 0; });
      assert.equal((await callback(req("", `/api/chatgpt/callback?state=${expiredState}&code=expired`))).headers.get("location"), null);
    });
  } finally {
    global.fetch = originalFetch;
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
    await rm(directory, { recursive: true, force: true });
  }
});
