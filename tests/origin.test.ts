import test from "node:test";
import assert from "node:assert/strict";
import { requestOrigin, sameOrigin } from "../src/server/auth/origin";

test("origin checks accept the studio hostname and port, including normalized loopback URLs", () => {
  for (const host of ["localhost:3100", "127.0.0.1:3100"]) {
    const request = new Request("http://localhost:3100/api/generate", { headers: { host, origin: `http://${host}` } });
    assert.equal(requestOrigin(request), `http://${host}`);
    assert.equal(sameOrigin(request), true);
  }
  assert.equal(sameOrigin(new Request("https://studio.example/api/generate", { headers: { origin: "https://studio.example" } })), true);
  for (const origin of ["", "null", "http://localhost:5000", "http://localhost.evil.test:3100", "https://other.example"]) {
    assert.equal(sameOrigin(new Request("http://localhost:3100/api/generate", { headers: { host: "localhost:3100", origin, "x-forwarded-host": "other.example" } })), false);
  }
});
