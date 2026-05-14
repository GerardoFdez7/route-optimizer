import os
import functions_framework
from modules.distance_matrix import get_distance_matrix
from modules.genetic_algorithm import run_genetic_algorithm

def _build_cors_headers():
    """Genera las cabeceras CORS de respuesta permitiendo la comunicación desde React."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

def _parse_distances(raw_data):
    """Convierte el JSON crudo de la Distance Matrix API a una matriz bidimensional (NxN) en metros."""
    matrix = []
    for row in raw_data.get('rows', []):
        row_dists = []
        for element in row.get('elements', []):
            if element.get('status') == 'OK':
                row_dists.append(element['distance']['value'])
            else:
                row_dists.append(float('inf')) 
        matrix.append(row_dists)
    return matrix

@functions_framework.http
def optimize_route(request):
    """
    HTTP Cloud Function entry point.
    Recibe los destinos y el mode, invoca Distance Matrix, ejecuta el GA y devuelve JSON.
    """
    # Manejo de peticiones preflight CORS
    if request.method == 'OPTIONS':
        return ('', 204, _build_cors_headers())

    headers = _build_cors_headers()

    try:
        # TODO: Fase 5 -> Implementar validación estricta de Firebase Auth aquí

        req_data = request.get_json(silent=True)
        if not req_data:
            return ({"error_message": "Cuerpo de la petición inválido o ausente (debe ser JSON)."}, 400, headers)

        destinations = req_data.get("destinations", [])
        mode = req_data.get("mode", "closed")

        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
             return ({"error_message": "Falta configurar la API KEY de Google Maps en el entorno."}, 500, headers)
             
        # Obtenemos la matriz mediante http pura
        raw_dm = get_distance_matrix(api_key, destinations)
        # Parseamos esa info cruda a un array 2D de NxN para el algoritmo matemático
        dist_matrix = _parse_distances(raw_dm)

        # Corremos el algoritmo genético con la matriz procesada
        best_route_indices, best_distance = run_genetic_algorithm(dist_matrix, mode=mode)
        
        # Mapeamos los índices arrojados (ej: [0, 2, 1, 0]) con la información de lat/lng originales
        optimized_route = []
        for index_order, target_idx in enumerate(best_route_indices):
            dest_copy = destinations[target_idx].copy()
            dest_copy["order"] = index_order + 1
            optimized_route.append(dest_copy)

        return ({
            "status": "SUCCESS",
            "optimized_route": optimized_route,
            "total_distance_meters": round(best_distance)
        }, 200, headers)

    except ValueError as ve:
        # Errores provocados por nuestras propias validaciones de negocio (<100km, etc)
        return ({"error_message": str(ve)}, 400, headers)
    except Exception as e:
        # Cualquier fallo inesperado
        return ({"error_message": f"Error interno del servidor: {str(e)}"}, 500, headers)

