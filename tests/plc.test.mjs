import assert from "node:assert/strict";
import test from "node:test";
import Plc from "../api/Plc.js";

test("initial connection uses a callback and leaves the event loop available", async () => {
  const plc = new Plc({ ip: "192.0.2.1", rack: 0, slot: 1 });
  const obj = { online: false, lastUpdated: null };
  let complete;
  let pollingStarted = false;
  plc.client = {
    ConnectTo(ip, rack, slot, callback) {
      assert.deepEqual([ip, rack, slot], ["192.0.2.1", 0, 1]);
      assert.equal(typeof callback, "function");
      complete = callback;
    },
  };
  plc.forever = () => { pollingStarted = true; };
  const running = plc.run({}, obj);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(plc.online, false);
  assert.equal(obj.online, false);
  assert.equal(pollingStarted, false);
  complete(null);
  await running;
  assert.equal(plc.online, true);
  assert.equal(obj.online, true);
  assert.equal(obj.lastUpdated, null);
  assert.equal(pollingStarted, true);
});

test("failed initial connection still starts the retry loop", async () => {
  const plc = new Plc({});
  const obj = { online: false, lastUpdated: 1234, data: [7] };
  let pollingStarted = false;
  plc.client = {
    ConnectTo(...args) { args.at(-1)(123); },
    Disconnect() { return true; },
    ErrorText() { return "Simulated connection failure"; },
  };
  plc.forever = () => { pollingStarted = true; };
  await plc.run({}, obj);
  assert.equal(pollingStarted, true);
  assert.equal(plc.online, false);
  assert.deepEqual(obj, { online: false, lastUpdated: 1234, data: [7] });
});

test("retries use callbacks and wait for completion before scheduling another attempt", async (t) => {
  const plc = new Plc({ polling_time: 500 });
  const obj = { online: false };
  let complete;
  let attempts = 0;
  const scheduled = [];
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    assert.equal(delay, 500);
    scheduled.push(callback);
  });
  plc.client = {
    Connect(callback) {
      assert.equal(typeof callback, "function");
      attempts++;
      complete = callback;
    },
    Disconnect() { return true; },
    ErrorText() { return "Simulated retry failure"; },
  };
  plc.forever({}, obj);
  const firstAttempt = scheduled[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(attempts, 1);
  assert.equal(scheduled.length, 1);
  complete(123);
  await firstAttempt;
  assert.equal(obj.online, false);
  assert.equal(scheduled.length, 2);

  const secondAttempt = scheduled[1]();
  assert.equal(attempts, 2);
  assert.equal(scheduled.length, 2);
  complete(null);
  await secondAttempt;
  assert.equal(plc.online, true);
  assert.equal(obj.online, true);
  assert.equal(scheduled.length, 3);
});

test("slow reads finish before another poll is scheduled, including failure and recovery", async (t) => {
  const plc = new Plc({ polling_time: 500 });
  const obj = { data: Array(40).fill(0), online: true, lastUpdated: null };
  const def = { DATA_READ: { area: 0x84, dbNumber: 182, start: 0, amount: 80, wordLen: 2 } };
  plc.online = true;
  let completeRead;
  let completeConnect;
  let reads = 0;
  const scheduled = [];
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    assert.equal(delay, 500);
    scheduled.push(callback);
  });
  plc.client = {
    ReadArea(...args) {
      reads++;
      completeRead = args.at(-1);
    },
    Connect(callback) { completeConnect = callback; },
    Disconnect() { return true; },
    ErrorText() { return "Simulated slow read failure"; },
  };

  plc.forever(def, obj);
  const firstRead = scheduled[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1);
  assert.equal(scheduled.length, 1, "no new timer while the read is pending");
  completeRead(null, Buffer.alloc(80, 1));
  await firstRead;
  assert.equal(scheduled.length, 2);
  assert.ok(obj.lastUpdated);
  const lastData = obj.data;
  const lastUpdated = obj.lastUpdated;

  const failedRead = scheduled[1]();
  assert.equal(reads, 2);
  assert.equal(scheduled.length, 2);
  completeRead(123);
  await failedRead;
  assert.equal(scheduled.length, 3);
  assert.equal(obj.online, false);
  assert.equal(obj.data, lastData);
  assert.equal(obj.lastUpdated, lastUpdated);

  const reconnect = scheduled[2]();
  assert.equal(reads, 2, "retry connects instead of reading the disconnected client");
  assert.equal(scheduled.length, 3);
  completeConnect(null);
  await reconnect;
  assert.equal(scheduled.length, 4);
  const recoveredRead = scheduled[3]();
  assert.equal(reads, 3);
  assert.equal(scheduled.length, 4);
  completeRead(null, Buffer.alloc(80));
  await recoveredRead;
  assert.equal(scheduled.length, 5);
  assert.equal(obj.online, true);
  assert.deepEqual(obj.data, Array(40).fill(0));
});

test("preserves the last complete reading on failure and replaces it on recovery", async () => {
  const plc = new Plc({});
  const obj = { data: Array(40).fill(0), online: false, lastUpdated: null };
  const def = { DATA_READ: { area: 0x84, dbNumber: 182, start: 0, amount: 80, wordLen: 2 } };
  let error = null;
  let buffer = Buffer.alloc(80);
  for (let i = 0; i < 40; i++) buffer.writeInt16BE(i - 20, i * 2);
  plc.client = {
    ReadArea(...args) { args.at(-1)(error, buffer); },
    Disconnect() { return true; },
    ErrorText() { return "Simulated PLC failure"; },
  };

  await plc.data(def, obj);
  assert.deepEqual(obj.data, Array.from({ length: 40 }, (_, i) => i - 20));
  assert.equal(obj.online, true);
  assert.equal(typeof obj.lastUpdated, "number");
  const lastData = obj.data;
  const lastUpdated = obj.lastUpdated;

  error = 123;
  await plc.data(def, obj);
  assert.equal(obj.online, false);
  assert.equal(plc.online, false);
  assert.equal(obj.data, lastData);
  assert.equal(obj.lastUpdated, lastUpdated);

  // An incomplete response must not partially overwrite the previous snapshot.
  error = null;
  buffer = Buffer.alloc(2);
  await plc.data(def, obj);
  assert.equal(obj.data, lastData);
  assert.equal(obj.lastUpdated, lastUpdated);
  assert.equal(obj.online, false);

  buffer = Buffer.alloc(80);
  await plc.data(def, obj);
  assert.equal(obj.online, true);
  assert.deepEqual(obj.data, Array(40).fill(0));
  assert.ok(obj.lastUpdated >= lastUpdated);
});
