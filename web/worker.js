const DEFAULT_API_ORIGIN = "https://sudaynandan.onrender.com";

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    const origin = String(env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, "");
    if (!origin) {
      return json(
        { error: "Live model API is not configured. Set API_ORIGIN on the Worker." },
        503,
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    const dest = origin + url.pathname + url.search;
    const headers = new Headers(request.headers);
    headers.delete("host");
    const init = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }

    try {
      return await fetch(dest, init);
    } catch (err) {
      return json({ error: `API proxy failed: ${err}` }, 502);
    }
  },
};
