import { PUBLIC_API } from "$env/static/public";
import { proxyPlcData } from "$lib/server/plc-proxy.js";

export async function GET({ fetch, request }) {
  return proxyPlcData(PUBLIC_API, { fetch, signal: request.signal });
}
