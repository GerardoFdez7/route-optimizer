/**
 * cloudFunction.js — thin wrapper around the optimize_route Cloud Function with Local Fallback.
 *
 * The Cloud Function (and fallback) expects:
 *   POST  { destinations: [{lat, lng, id}], mode: 'open'|'closed' }
 *   Authorization: Bearer <firebase_id_token>
 *
 * It returns:
 *   { status: "SUCCESS", optimized_route: [{lat, lng, id, order}], total_distance_meters: number }
 */

const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL;
const LOCAL_FALLBACK_URL = 'http://localhost:8080';

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

  // Estructura el cuerpo de la petición requerida por backend
  const requestBody = JSON.stringify({
    destinations: destinations.map(({ lat, lng, id }) => ({ lat, lng, id })),
    mode,
  });

  // Función interna reutilizable para evitar duplicar lógica de validación de respuesta
  async function executeFetch(url) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: requestBody,
    });

    const data = await response.json();

    if (!response.ok || data.error_message) {
      throw new Error(
        data.error_message || `Error del servidor: ${response.status}`
      );
    }
    return data;
  }

  let data;

  try {
    // 1. Intentar con la Cloud Function principal
    data = await executeFetch(CLOUD_FUNCTION_URL);
  } catch (primaryError) {
    console.warn(
      `Fallo en Cloud Function principal: ${primaryError.message}. Intentando fallback en localhost...`
    );
    
    try {
      // 2. Fallback: Intentar con el servidor sustituto local
      data = await executeFetch(LOCAL_FALLBACK_URL);
    } catch (fallbackError) {
      // Si ambos fallan, lanza un error definitivo detallando el fallo del fallback
      throw new Error(
        `Error definitivo. Fallback local también falló: ${fallbackError.message}`
      );
    }
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