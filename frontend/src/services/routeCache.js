/**
 * routeCache.js — In-memory cache for optimized route results.
 *
 * HOW IT WORKS
 * ────────────
 * Cache key = canonical representation of the destination set + mode.
 * Destinations are sorted by (lat, lng) so the key is order-independent:
 *   getCached([A, B], 'closed') === getCached([B, A], 'closed')  ✓
 *
 * SCOPE OF CACHING
 * ────────────────
 * A cache hit requires the *exact same set* of destinations + mode.
 * Querying {A, B} and later {A, B, C} are two different cache entries;
 * the Cloud Function is called for the second query.
 *
 * Deeper caching (reusing pairwise A↔B distances inside {A,B,C}) would
 * require the backend to accept a partial distance matrix — a backend change.
 *
 * EXAMPLE
 * ───────
 *   1st call: A + B (closed) → misses cache → calls Cloud Function → stores result
 *   2nd call: B + A (closed) → HIT  → returns stored result instantly ✓
 *   3rd call: A + B + C      → MISS → calls Cloud Function (new computation)
 *   4th call: A + B (closed) → HIT  → instant again ✓
 *
 * TTL: 30 minutes (distances don't change, but refresh keeps data fresh).
 */

const CACHE = new Map();
const TTL_MS = 30 * 60 * 1000; // 30 min

/** Canonical, order-independent key. */
function makeKey(destinations, mode) {
  const coords = destinations
    .map(d => `${Number(d.lat).toFixed(7)},${Number(d.lng).toFixed(7)}`)
    .sort()
    .join('|');
  return `${coords}::${mode}`;
}

/**
 * Returns a cached result, or null if absent / expired.
 * @param {Array}  destinations
 * @param {string} mode
 * @returns {{ status, optimized_route, total_distance_meters } | null}
 */
export function getCached(destinations, mode) {
  const key = makeKey(destinations, mode);
  const entry = CACHE.get(key);
  if (!entry) return null;

  if (Date.now() - entry.ts > TTL_MS) {
    CACHE.delete(key);
    return null;
  }

  console.info(
    `[RouteCache] ✓ Hit — ${destinations.length} destinations, mode=${mode}`
  );
  return entry.result;
}

/**
 * Stores a route result.
 * @param {Array}  destinations
 * @param {string} mode
 * @param {object} result
 */
export function setCache(destinations, mode, result) {
  const key = makeKey(destinations, mode);
  CACHE.set(key, { result, ts: Date.now() });
  console.info(
    `[RouteCache] Stored — ${destinations.length} destinations, mode=${mode}`
  );
}

/** Wipes the entire cache (e.g. on logout). */
export function clearCache() {
  CACHE.clear();
}