import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../src/app/api/generate/route";
import { sampleStory } from "../src/lib/sample";

test("AI endpoint reports configuration honestly, gates requests, validates drafts and handles upstream failures", async () => {
  const original = {
    key: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    code: process.env.AI_ACCESS_CODE,
    fetch: global.fetch,
  };
  const request = (
    code = "test-code",
    body = {
      premise: "A lighthouse keeper must find a missing letter.",
      tone: "Mysterious",
    },
  ) =>
    new Request("http://localhost:3100/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Workshop-Code": code },
      body: JSON.stringify(body),
    });
  let called = 0;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await (await GET()).json()).available, false);
    assert.equal((await POST(request())).status, 503);
    process.env.OPENAI_API_KEY = "fake-test-key";
    process.env.OPENAI_MODEL = "test-model";
    process.env.AI_ACCESS_CODE = "test-code";
    global.fetch = async () => {
      called++;
      throw new Error("Unexpected provider request");
    };
    assert.equal((await POST(request("wrong"))).status, 401);
    assert.equal(
      (
        await POST(
          request("test-code", { premise: "short", tone: "Mysterious" }),
        )
      ).status,
      400,
    );
    assert.equal(called, 0);
    const story = sampleStory();
    global.fetch = async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      return Response.json({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(story) }] },
        ],
      });
    };
    const success = await POST(request());
    assert.equal(success.status, 200);
    assert.equal((await success.json()).story.passages.length, 9);
    story.passages[0].choices[0].target = "not-a-passage";
    assert.equal((await POST(request())).status, 502);
    global.fetch = async () =>
      Response.json(
        { secret: "upstream details must not leak" },
        { status: 429 },
      );
    const failure = await POST(request());
    assert.equal(failure.status, 502);
    assert.ok(!(await failure.text()).includes("upstream details"));
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [
      ["OPENAI_API_KEY", original.key],
      ["OPENAI_MODEL", original.model],
      ["AI_ACCESS_CODE", original.code],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
