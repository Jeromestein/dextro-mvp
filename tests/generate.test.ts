import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "@/app/api/generate/route";
import { sampleStory } from "../src/modules/story/sample";
import { buildGame } from "../src/modules/export/standalone";

const brief = {
  premise: "A lighthouse keeper must find a missing letter.",
  tone: "Mysterious",
  language: "zh",
};
const request = (
  body: unknown = brief,
  code = "test-code",
  extra: RequestInit = {},
) =>
  new Request("http://localhost:3100/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Workshop-Code": code },
    body: JSON.stringify(body),
    ...extra,
  });
const completed = (draft: unknown) =>
  Response.json({
    status: "completed",
    output: [
      { type: "reasoning" },
      { content: [{ type: "output_text", text: JSON.stringify(draft) }] },
    ],
  });

test("AI generation pipeline", async (t) => {
  const keys = ["OPENAI_API_KEY", "OPENAI_MODEL", "AI_ACCESS_CODE"] as const;
  const original = keys.map((k) => process.env[k]);
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = "fake-test-key";
  process.env.OPENAI_MODEL = "test-model";
  process.env.AI_ACCESS_CODE = "test-code";
  try {
    await t.test(
      "configuration, authorization and input checks never call the provider",
      async () => {
        global.fetch = async () => {
          throw new Error("Unexpected provider call");
        };
        delete process.env.OPENAI_API_KEY;
        assert.deepEqual(await (await GET(new Request("http://localhost:3100/api/generate"))).json(), { available: false });
        assert.equal((await POST(request())).status, 503);
        process.env.OPENAI_API_KEY = "fake-test-key";
        assert.equal((await POST(request(brief, "wrong"))).status, 401);
        assert.equal((await POST(request(brief, ""))).status, 401);
        assert.equal((await POST(request(brief, "", { headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100", "Content-Type": "application/json" } }))).status, 401);
        assert.equal(
          (await POST(request({ ...brief, premise: "short" }))).status,
          400,
        );
        assert.equal(
          (await POST(request({ ...brief, language: "unsupported" }))).status,
          400,
        );
        assert.equal(
          (await POST(request(brief, "test-code", { body: "{" }))).status,
          400,
        );
        assert.equal(
          (
            await POST(
              request(brief, "test-code", { body: "x".repeat(10_001) }),
            )
          ).status,
          413,
        );
        assert.equal(
          (
            await POST(
              request(brief, "test-code", {
                headers: {
                  "X-Workshop-Code": "test-code",
                  origin: "https://other.test",
                },
              }),
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "a valid draft is generated once, language honored in request and exportable",
      async () => {
        let calls = 0;
        global.fetch = async (url, options) => {
          calls++;
          assert.equal(url, "https://api.openai.com/v1/responses");
          const body = JSON.parse(String(options?.body));
          assert.equal(body.store, false);
          assert.equal(body.text.format.strict, true);
          assert.equal(body.text.format.schema.additionalProperties, false);
          assert.equal(
            JSON.parse(body.input).brief.language,
            "Simplified Chinese",
          );
          return completed(sampleStory());
        };
        const res = await POST(request());
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.repaired, false);
        assert.notEqual(data.story.id, sampleStory().id);
        assert.ok(buildGame(data.story).includes("story-data"));
        assert.equal(calls, 1);
      },
    );
    await t.test(
      "broken connections are repaired once with the original brief and shared deadline",
      async () => {
        let calls = 0;
        let firstSignal: AbortSignal | null | undefined;
        const broken = sampleStory();
        broken.passages[0].choices[0].target = "missing";
        global.fetch = async (_url, options) => {
          calls++;
          if (calls === 1) {
            firstSignal = options?.signal;
            return completed(broken);
          }
          assert.equal(options?.signal, firstSignal);
          const input = JSON.parse(JSON.parse(String(options?.body)).input);
          assert.equal(input.brief.premise, brief.premise);
          assert.ok(
            input.validationErrors.some((e: string) =>
              e.includes("connect every choice"),
            ),
          );
          return completed(sampleStory());
        };
        const res = await POST(request());
        assert.equal(res.status, 200);
        assert.equal((await res.json()).repaired, true);
        assert.equal(calls, 2);
      },
    );
    await t.test(
      "persistent structural errors stop after two calls without returning a story",
      async () => {
        let calls = 0;
        const broken = sampleStory();
        broken.passages[0].choices = [];
        global.fetch = async () => {
          calls++;
          return completed(broken);
        };
        const res = await POST(request());
        assert.equal(res.status, 502);
        const data = await res.json();
        assert.equal(data.story, undefined);
        assert.match(data.error, /one repair/);
        assert.equal(calls, 2);
      },
    );
    await t.test("malformed generated JSON gets one repair", async () => {
      let calls = 0;
      global.fetch = async () =>
        ++calls === 1
          ? Response.json({
              status: "completed",
              output: [{ content: [{ type: "output_text", text: "{" }] }],
            })
          : completed(sampleStory());
      assert.equal((await POST(request())).status, 200);
      assert.equal(calls, 2);
    });
    await t.test(
      "refusal and incomplete responses are not retried",
      async () => {
        for (const [response, expected] of [
          [
            {
              status: "completed",
              output: [
                {
                  content: [
                    { type: "refusal", refusal: "private provider text" },
                  ],
                },
              ],
            },
            422,
          ],
          [{ status: "incomplete", output: [] }, 502],
        ] as const) {
          let calls = 0;
          global.fetch = async () => {
            calls++;
            return Response.json(response);
          };
          const res = await POST(request());
          assert.equal(res.status, expected);
          assert.ok(!(await res.text()).includes("private provider text"));
          assert.equal(calls, 1);
        }
      },
    );
    await t.test(
      "upstream errors and unreadable envelopes are sanitized, without repair",
      async () => {
        for (const response of [
          Response.json(
            { secret: "sensitive upstream message" },
            { status: 429 },
          ),
          new Response("sensitive upstream message"),
          Response.json({
            status: "completed",
            output: "sensitive upstream message",
          }),
        ]) {
          let calls = 0;
          global.fetch = async () => {
            calls++;
            return response;
          };
          const res = await POST(request());
          assert.equal(res.status, 502);
          assert.ok(!(await res.text()).includes("sensitive upstream message"));
          assert.equal(calls, 1);
        }
      },
    );
    await t.test(
      "a cancelled request does not repair or save a completed provider draft",
      async () => {
        const controller = new AbortController();
        let calls = 0;
        global.fetch = async () => {
          calls++;
          controller.abort();
          return completed(sampleStory());
        };
        const res = await POST(
          request(brief, "test-code", { signal: controller.signal }),
        );
        assert.equal(res.status, 499);
        assert.equal((await res.json()).story, undefined);
        assert.equal(calls, 1);
      },
    );
    await t.test("a deadline abort produces a timeout response", async () => {
      const timeout = AbortSignal.timeout;
      const controller = new AbortController();
      AbortSignal.timeout = () => controller.signal;
      try {
        global.fetch = async () => {
          controller.abort(new DOMException("Timeout", "TimeoutError"));
          return completed(sampleStory());
        };
        assert.equal((await POST(request())).status, 504);
      } finally {
        AbortSignal.timeout = timeout;
      }
    });
  } finally {
    global.fetch = originalFetch;
    keys.forEach((key, i) => {
      if (original[i] === undefined) delete process.env[key];
      else process.env[key] = original[i];
    });
  }
});
