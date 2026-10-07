import test from "node:test";
import assert from "node:assert/strict";
import { generateImage, imageStatus } from "../src/server/media/image";
import { assetSchema } from "../src/modules/media/assets/model";

const WEBP = Buffer.from("RIFF0000WEBPtest").toString("base64");
const body = () => ({ requestId: crypto.randomUUID(), title: "The lighthouse", artBrief: "Muted blue palette", scene: "A deserted lighthouse beside a calm sea at dusk.", style: "storybook" });
function request(data: unknown = body(), headers: Record<string, string> = {}) {
  return new Request("http://localhost:3100/api/media/image", { method: "POST", headers: { Origin: "http://localhost:3100", "Content-Type": "application/json", ...headers }, body: JSON.stringify(data) });
}
test("image API guards billing, bounds output, sanitizes failures and blocks duplicate requests", async (t) => {
  const old = { key: process.env.OPENAI_API_KEY, code: process.env.AI_ACCESS_CODE, model: process.env.OPENAI_IMAGE_MODEL, provider: process.env.AI_PROVIDER };
  const original = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-image-secret"; delete process.env.AI_ACCESS_CODE;
  process.env.OPENAI_IMAGE_MODEL = "gpt-image-2.5-flare"; process.env.AI_PROVIDER = "chatgpt";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.n, 1); assert.equal(payload.quality, "low");
    assert.equal(payload.output_format, "webp"); assert.equal(payload.size, "1536x1024");
    assert.equal(payload.model, "gpt-image-2.5-flare");
    assert.ok(!("response_format" in payload));
    return Response.json({ data: [{ b64_json: WEBP }] });
  };
  try {
    await t.test("missing or cross-site origin cannot call the provider", async () => {
      assert.equal((await generateImage(request(body(), { Origin: "https://other.example" }))).status, 403);
      assert.equal((await generateImage(request(body(), { Origin: "" }))).status, 403);
      assert.equal(calls, 0);
    });
    await t.test("configuration status is independent from text provider and exposes no secrets", async () => {
      const response = await imageStatus(); const raw = await response.text();
      assert.equal(JSON.parse(raw).available, true); assert.ok(!raw.includes("test-image-secret"));
      delete process.env.OPENAI_API_KEY;
      assert.equal((await generateImage(request())).status, 503);
      process.env.OPENAI_API_KEY = "test-image-secret";
    });
    await t.test("invalid input is rejected before billing", async () => {
      const before = calls;
      assert.equal((await generateImage(request({ ...body(), scene: "tiny" }))).status, 400);
      assert.equal((await generateImage(request({ ...body(), scene: "x".repeat(30000) }))).status, 413);
      assert.equal((await generateImage(request({ ...body(), model: "gpt-6-luna" }))).status, 400);
      assert.equal(calls, before);
    });
    await t.test("one image returns embedded bytes and portable provenance; repeats are rejected", async () => {
      const input = body(); const response = await generateImage(request(input));
      assert.equal(response.status, 200);
      const { asset } = await response.json(); assetSchema.parse(asset);
      assert.equal(asset.source, "generated"); assert.equal(asset.provenance.provider, "openai");
      assert.ok(asset.data.startsWith("data:image/webp;base64,"));
      assert.ok(!JSON.stringify(asset).includes("test-image-secret"));
      const before = calls;
      assert.equal((await generateImage(request(input))).status, 409); assert.equal(calls, before);
    });
    await t.test("selected image model reaches the provider and saved provenance without a code", async () => {
      const previous = globalThis.fetch;
      globalThis.fetch = async (_url, init) => {
        assert.equal(JSON.parse(String(init?.body)).model, "gpt-image-2.5-sunburst");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-image-secret");
        return Response.json({ data: [{ b64_json: WEBP }] });
      };
      try {
        const response = await generateImage(request({ ...body(), model: "gpt-image-2.5-sunburst" }));
        assert.equal(response.status, 200);
        assert.equal((await response.json()).asset.provenance.model, "gpt-image-2.5-sunburst");
      } finally { globalThis.fetch = previous; }
    });
    await t.test("upstream errors are not retried or exposed", async () => {
      let attempted = 0;
      globalThis.fetch = async () => { attempted++; return new Response("private upstream detail", { status: 429 }); };
      const response = await generateImage(request());
      assert.equal(response.status, 502); assert.equal(attempted, 1);
      assert.ok(!(await response.text()).includes("private upstream detail"));
    });
    await t.test("unexpected image format and oversized output are rejected", async () => {
      globalThis.fetch = async () => Response.json({ data: [{ b64_json: Buffer.from("not an image").toString("base64") }] });
      assert.equal((await generateImage(request())).status, 502);
      globalThis.fetch = async () => Response.json({ data: [{ b64_json: "A".repeat(3_100_000) }] });
      assert.equal((await generateImage(request())).status, 413);
    });
    await t.test("only two provider calls can run concurrently", async () => {
      const release: (() => void)[] = [];
      globalThis.fetch = () => new Promise((resolve) => release.push(() => resolve(Response.json({ data: [{ b64_json: WEBP }] }))));
      const pending = [generateImage(request()), generateImage(request())];
      while (release.length < 2) await new Promise((resolve) => setTimeout(resolve, 1));
      assert.equal((await generateImage(request())).status, 429);
      release.forEach((done) => done());
      assert.deepEqual((await Promise.all(pending)).map((r) => r.status), [200, 200]);
    });
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries({ OPENAI_API_KEY: old.key, AI_ACCESS_CODE: old.code, OPENAI_IMAGE_MODEL: old.model, AI_PROVIDER: old.provider })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
