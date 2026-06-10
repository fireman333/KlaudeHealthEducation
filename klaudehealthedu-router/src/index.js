// klaudehealthedu-router — reverse-proxy Worker for the Klaude Health Education
// site under the shared subpath https://med-study-rpg.com/klaudehealthedu.
//
// Modeled on the existing `med-study-rpg-2nd-router` on the same zone. The
// pathname is forwarded UNCHANGED to the Pages origin, which is built with
// Astro `base: '/klaudehealthedu'` so asset paths align — no HTML rewriting.
//
// The Worker route (med-study-rpg.com/klaudehealthedu + /klaudehealthedu/*)
// takes precedence over the root domain's Pages custom-domain catch-all, so
// these requests hit KHE instead of the root RPG SPA.

const ORIGIN = "https://klaudehealthedu.pages.dev";
const PREFIX = "/klaudehealthedu";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only handle the exact prefix or paths beneath it. Anything else (e.g. a
    // hypothetical /klaudehealtheduFOO that the route glob might over-match)
    // falls through as 404 rather than leaking the root SPA.
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = await fetch(ORIGIN + url.pathname + url.search, request);
    const resp = new Response(upstream.body, upstream);
    resp.headers.delete("content-encoding");
    resp.headers.delete("content-length");
    resp.headers.set("x-served-by", "edge-router-khe");
    return resp;
  },
};
