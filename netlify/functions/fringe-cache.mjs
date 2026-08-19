// Netlify Scheduled Function — refreshes the Edinburgh Festival API cache daily
// Requires Netlify Blobs (available in Functions v2)
// Schedule: runs once daily at 4am UTC (configured in netlify.toml)
//
// Also serves cached data on GET requests from the client.

import { getStore } from "@netlify/blobs";

const BLOB_STORE = "fringe-api-cache";
const BLOB_KEY = "all-events";
const CACHE_MAX_AGE_MS = 25 * 60 * 60 * 1000; // 25 hours — allows daily refresh with margin

// ─── Serve cached data ───
async function serveCached() {
  try {
    const store = getStore(BLOB_STORE);
    const meta = await store.getMetadata(BLOB_KEY).catch(() => null);

    if (!meta || !meta.metadata || !meta.metadata.timestamp) {
      return new Response(JSON.stringify({ cached: false, reason: "no-cache" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const age = Date.now() - Number(meta.metadata.timestamp);
    if (age > CACHE_MAX_AGE_MS) {
      return new Response(JSON.stringify({ cached: false, reason: "stale" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const data = await store.get(BLOB_KEY);
    if (!data) {
      return new Response(JSON.stringify({ cached: false, reason: "empty" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Cache-Timestamp": meta.metadata.timestamp,
        "X-Cache-Age": String(Math.round(age / 1000)) + "s"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ cached: false, reason: "error", message: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

// ─── Refresh cache by crawling all API pages ───
async function refreshCache(proxyBase) {
  const allEvents = [];
  let from = 0;
  const size = 100;
  const maxPages = 250; // safety cap ~25k events

  for (let page = 0; page < maxPages; page++) {
    const url = `${proxyBase}?endpoint=events&size=${size}&from=${from}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Proxy returned ${res.status} at from=${from}`);
    const batch = await res.json();
    if (!Array.isArray(batch)) throw new Error("Non-array response at from=" + from);
    allEvents.push(...batch);
    if (batch.length < size) break; // last page
    from += size;
  }

  const store = getStore(BLOB_STORE);
  const payload = JSON.stringify({
    cached: true,
    timestamp: Date.now(),
    count: allEvents.length,
    events: allEvents
  });

  await store.set(BLOB_KEY, payload, {
    metadata: { timestamp: String(Date.now()), count: String(allEvents.length) }
  });

  return allEvents.length;
}

// ─── Main handler ───
export default async function handler(req, context) {
  // Scheduled invocation (cron) — refresh the cache
  if (req.method === "POST" || context.schedule) {
    try {
      // Build the proxy base URL from the request or env
      const siteUrl = process.env.URL || "https://fringeplanner.co.uk";
      const proxyBase = siteUrl + "/.netlify/functions/fringe";
      const count = await refreshCache(proxyBase);
      return new Response(JSON.stringify({ refreshed: true, count }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("Cache refresh failed:", err);
      return new Response(JSON.stringify({ refreshed: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // GET — serve cached data
  return serveCached();
}

// Netlify scheduled function config
export const config = {
  schedule: "0 4 * * *"  // Daily at 4am UTC
};
