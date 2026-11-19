import { isIP } from "node:net";

/** @param {NodeJS.ProcessEnv} env */
export function readConfig(env) {
  /** @param {string} key @param {number} fallback @param {number} min @param {number} max */
  const integer = (key, fallback, min, max) => {
    const raw = env[key] ?? String(fallback);
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${key} must be an integer between ${min} and ${max}`);
    }
    return value;
  };
  const ip = env.PLC_IP ?? "192.168.24.2";
  if (isIP(ip) !== 4) throw new Error("PLC_IP must be a valid IPv4 address");

  return {
    HTTP: integer("API_PORT", 3001, 1, 65535),
    PLC: {
      ip,
      rack: integer("PLC_RACK", 0, 0, 7),
      slot: integer("PLC_SLOT", 1, 0, 31),
      polling_time: integer("PLC_POLLING_MS", 500, 1, 2147483647),
    },
    DATA_READ: {
      area: 0x84,
      dbNumber: integer("PLC_DB_NUMBER", 182, 0, 65535),
      start: integer("PLC_START", 0, 0, 2097072),
      amount: 80,
      wordLen: 0x02,
    },
  };
}
