/**
 * cloudFunction.js — thin wrapper around the optimize_route Cloud Function.
 *
 * The Cloud Function expects:
 *   POST  { destinations: [{lat, lng, id}], mode: 'open'|'closed' }
 *   Authorization: Bearer <firebase_id_token>
 *
 * It returns:
 *   { status: "SUCCESS", optimized_route: [{lat, lng, id, order}], total_distance_meters: number }
 */

const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL;

/**
 * @param {string} idToken   — Firebase ID token from user.getIdToken()
 * @param {Array}  destinations — [{ id, lat, lng, name }]
 * @param {string} mode      — 'open' | 'closed'
 * @returns {Promise<{status, optimized_route, total_distance_meters}>}
 */
export async function optimizeRoute(idToken, destinations, mode) {
  if (!CLOUD_FUNCTION_URL) {
    throw new Error(
      'VITE_CLOUD_FUNCTION_URL no está configurada en .env.local'
    );
  }

  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      destinations: destinations.map(({ lat, lng, id }) => ({ lat, lng, id })),
      mode,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error_message) {
    throw new Error(
      data.error_message || `Error del servidor: ${response.status}`
    );
  }

  // Enrich each stop in the optimized route with the original place name
  const nameById = Object.fromEntries(destinations.map(d => [d.id, d.name]));

  return {
    ...data,
    optimized_route: data.optimized_route.map(dest => ({
      ...dest,
      name:
        nameById[dest.id] ??
        `${Number(dest.lat).toFixed(5)}, ${Number(dest.lng).toFixed(5)}`,
    })),
  };
}