import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readConfig } from "../api/config.js";

test("defaults preserve the original PLC mapping", () => {
  assert.deepEqual(readConfig({}), {
    HTTP: 3001,
    PLC: { ip: "192.168.24.2", rack: 0, slot: 1, polling_time: 500 },
    DATA_READ: { area: 0x84, dbNumber: 182, start: 0, amount: 80, wordLen: 2 },
  });
});

test("environment overrides are parsed while keeping the 40-value layout", () => {
  assert.deepEqual(readConfig({
    API_PORT: "4001", PLC_IP: "192.0.2.10", PLC_RACK: "2", PLC_SLOT: "3",
    PLC_POLLING_MS: "1000", PLC_DB_NUMBER: "200", PLC_START: "80",
  }), {
    HTTP: 4001,
    PLC: { ip: "192.0.2.10", rack: 2, slot: 3, polling_time: 1000 },
    DATA_READ: { area: 0x84, dbNumber: 200, start: 80, amount: 80, wordLen: 2 },
  });
});

test("invalid connection and polling parameters fail before connecting", () => {
  for (const [key, values] of Object.entries({
    PLC_IP: ["", "localhost", "999.1.1.1", "::1"],
    API_PORT: ["0", "65536", "abc", ""],
    PLC_RACK: ["-1", "8"], PLC_SLOT: ["32", "1.5"],
    PLC_POLLING_MS: ["0", "2147483648", "500ms"],
    PLC_DB_NUMBER: ["-1", "65536"], PLC_START: ["-1", "2097073"],
  })) {
    for (const value of values) assert.throws(() => readConfig({ [key]: value }), new RegExp(key));
  }
});

test("API configuration works outside the repository cwd and environment wins over .env", () => {
  const defUrl = new URL("../api/def.js", import.meta.url).href;
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const result = spawnSync(process.execPath, ["--input-type=module", "-e",
    `const { HTTP, PLC } = await import(${JSON.stringify(defUrl)}); if (HTTP !== 4010 || PLC.ip !== '192.0.2.20') process.exit(1);`,
  ], {
    cwd,
    env: { ...process.env, API_PORT: "4010", PLC_IP: "192.0.2.20" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});
