import { PUBLIC_API } from "$env/static/public";
import { json } from "@sveltejs/kit";

export async function GET({ request }) {
  const res = await fetch(PUBLIC_API);
  const data = await res.json();
  return json(data);
}
