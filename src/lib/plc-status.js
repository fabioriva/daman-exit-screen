export const STALE_AFTER_MS = 5000;

/** @param {unknown} value */
export function isPlcSnapshot(value) {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = /** @type {{ data?: unknown, online?: unknown, lastUpdated?: unknown }} */ (value);
  return Array.isArray(snapshot.data) && snapshot.data.length === 40 &&
    snapshot.data.every((item) => Number.isInteger(item)) &&
    typeof snapshot.online === "boolean" &&
    (snapshot.lastUpdated === null ||
      (typeof snapshot.lastUpdated === "number" && Number.isFinite(snapshot.lastUpdated) && snapshot.lastUpdated > 0));
}

/**
 * @param {{ online: boolean, lastUpdated: number | null }} snapshot
 * @param {boolean | null} apiAvailable
 * @param {number} now
 */
export function getPlcStatus(snapshot, apiAvailable, now) {
  if (apiAvailable === null) return "waiting";
  if (!apiAvailable) return "api-unavailable";
  if (!snapshot.online) return "plc-offline";
  if (snapshot.lastUpdated === null) return "waiting";
  if (now - snapshot.lastUpdated > STALE_AFTER_MS) return "stale";
  return "online";
}
