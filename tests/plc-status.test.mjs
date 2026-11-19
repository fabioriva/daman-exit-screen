import assert from "node:assert/strict";
import test from "node:test";
import { getPlcStatus, isPlcSnapshot, STALE_AFTER_MS } from "../src/lib/plc-status.js";

test("distinguishes startup, PLC loss, API loss, stale data and recovery", () => {
  const now = 10000;
  const snapshot = { online: true, lastUpdated: now };
  assert.equal(getPlcStatus(snapshot, null, now), "waiting");
  assert.equal(getPlcStatus(snapshot, false, now), "api-unavailable");
  assert.equal(getPlcStatus({ ...snapshot, online: false }, true, now), "plc-offline");
  assert.equal(getPlcStatus({ online: true, lastUpdated: null }, true, now), "waiting");
  assert.equal(getPlcStatus(snapshot, true, now + STALE_AFTER_MS + 1), "stale");
  // Repeated HTTP success must not make an old PLC reading fresh.
  assert.equal(getPlcStatus(snapshot, true, now + STALE_AFTER_MS * 2), "stale");
  assert.equal(getPlcStatus({ ...snapshot, lastUpdated: now + STALE_AFTER_MS * 2 }, true, now + STALE_AFTER_MS * 2), "online");
});

test("rejects missing metadata and malformed readings", () => {
  const snapshot = { data: Array(40).fill(0), online: true, lastUpdated: 10000 };
  assert.equal(isPlcSnapshot(snapshot), true);
  assert.equal(isPlcSnapshot({ ...snapshot, online: false, lastUpdated: null }), true);
  for (const invalid of [null, {}, { data: snapshot.data },
    { ...snapshot, data: [1] }, { ...snapshot, data: Array(40).fill("1") },
    { ...snapshot, lastUpdated: NaN }, { ...snapshot, online: "true" }]) {
    assert.equal(isPlcSnapshot(invalid), false);
  }
});
