import assert from "node:assert/strict";
import test from "node:test";
import { proxyPlcData, UPSTREAM_TIMEOUT_MS } from "../src/lib/server/plc-proxy.js";

const snapshot = { data: Array(40).fill(7), online: true, lastUpdated: 10000 };
const url = "http://plc-api.test/api/data";

test("forwards valid readings and disconnected PLC status without caching", async () => {
  for (const online of [true, false]) {
    const payload = { ...snapshot, online };
    const response = await proxyPlcData(url, {
      fetch: async (input, options) => {
        assert.equal(input, url);
        assert.equal(options.cache, "no-store");
        assert.ok(options.signal instanceof AbortSignal);
        return Response.json(payload);
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), payload);
  }
});

test("upstream HTTP errors, network errors and invalid data become uncached 502 responses", async () => {
  for (const fetch of [
    async () => new Response("Internal upstream details", { status: 500 }),
    async () => { throw new TypeError("Connection refused"); },
    async () => new Response("not JSON"),
    async () => Response.json({ data: [1] }),
  ]) {
    const response = await proxyPlcData(url, { fetch });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const payload = await response.json();
    assert.match(payload.error, /^PLC_API_/);
    assert.equal("data" in payload, false);
  }
});

test("a stalled upstream is aborted after 3 seconds and returns 504", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let upstreamSignal;
  const pending = proxyPlcData(url, {
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
      upstreamSignal = signal;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  });
  t.mock.timers.tick(UPSTREAM_TIMEOUT_MS - 1);
  assert.equal(upstreamSignal.aborted, false);
  t.mock.timers.tick(1);
  const response = await pending;
  assert.equal(upstreamSignal.aborted, true);
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: "PLC_API_TIMEOUT" });
});

test("timeout also covers a response whose JSON body stalls", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = proxyPlcData(url, {
    fetch: async (_url, { signal }) => ({
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
    }),
  });
  // Allow the response headers to arrive before triggering the timeout.
  await Promise.resolve();
  t.mock.timers.tick(UPSTREAM_TIMEOUT_MS);
  assert.equal((await pending).status, 504);
});

test("client cancellation aborts the upstream request", async () => {
  const controller = new AbortController();
  let upstreamSignal;
  const pending = proxyPlcData(url, {
    signal: controller.signal,
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
      upstreamSignal = signal;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  });
  controller.abort();
  await pending;
  assert.equal(upstreamSignal.aborted, true);
});
