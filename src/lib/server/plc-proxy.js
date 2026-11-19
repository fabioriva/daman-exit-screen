import { isPlcSnapshot } from "../plc-status.js";

export const UPSTREAM_TIMEOUT_MS = 3000;
const headers = { "Cache-Control": "no-store" };

/**
 * @param {string} url
 * @param {{ fetch?: typeof globalThis.fetch, signal?: AbortSignal }} [options]
 */
export async function proxyPlcData(url, { fetch: fetcher = globalThis.fetch, signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const requestSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetcher(url, { cache: "no-store", signal: requestSignal });
    if (!res.ok) {
      await res.body?.cancel();
      return Response.json({ error: "PLC_API_UNAVAILABLE" }, { status: 502, headers });
    }
    const data = await res.json();
    if (!isPlcSnapshot(data)) {
      return Response.json({ error: "PLC_API_INVALID_RESPONSE" }, { status: 502, headers });
    }
    return Response.json(data, { headers });
  } catch {
    const timedOut = controller.signal.aborted;
    return Response.json(
      { error: timedOut ? "PLC_API_TIMEOUT" : "PLC_API_UNAVAILABLE" },
      { status: timedOut ? 504 : 502, headers }
    );
  } finally {
    clearTimeout(timeout);
  }
}
