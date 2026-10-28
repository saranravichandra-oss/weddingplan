// A single stateless Vercel function. Database administration credentials stay
// inside Supabase; only its public URL and publishable key are configured here.
async function handler(request) {
  const endpoint = process.env.WEDDING_BACKEND_URL;
  const publishable = process.env.WEDDING_BACKEND_PUBLIC_KEY;
  if (!endpoint || !publishable)
    return Response.json(
      { error: "Die Cloud-Verbindung ist noch nicht eingerichtet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const url = new URL(request.url);
  const route =
    url.searchParams.get("__route") || url.pathname.replace(/^\/api\/?/, "");
  url.searchParams.delete("__route");
  const path =
    "/" +
    route +
    (url.searchParams.size ? "?" + url.searchParams.toString() : "");
  const headers = new Headers({
    apikey: publishable,
    "x-wedding-path": path,
    "x-wedding-public-origin": url.origin,
  });
  for (const key of [
    "cookie",
    "content-type",
    "origin",
    "x-csrf-token",
    "sec-fetch-site",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set(
    "x-wedding-client-ip",
    request.headers.get("x-vercel-forwarded-for") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown",
  );
  try {
    const result = await fetch(endpoint, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });
    // fetch has already decompressed the body; never forward transport headers.
    const returned = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const key of ["content-type", "content-disposition", "location"]) {
      const value = result.headers.get(key);
      if (value) returned.set(key, value);
    }
    for (const value of result.headers.getSetCookie()) {
      if (value.startsWith("wedding_session="))
        returned.append("Set-Cookie", value);
    }
    return new Response(request.method === "HEAD" ? null : result.body, {
      status: result.status,
      headers: returned,
    });
  } catch {
    console.error("Wedding backend request failed");
    return Response.json(
      {
        error:
          "Die Datenverbindung ist gerade nicht erreichbar. Bitte erneut versuchen.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = handler,
  POST = handler,
  PUT = handler,
  PATCH = handler,
  DELETE = handler,
  HEAD = handler,
  OPTIONS = handler;
