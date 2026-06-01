import math
import requests

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia en línea recta entre dos puntos de la tierra usanda la fórmula de Haversine.
    Retorna la distancia en kilómetros.
    """
    R = 6371.0  # Radio de la tierra en km
    
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    
    a = math.sin(d_lat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def validate_destinations(destinations):
    """
    Reglas de negocio: 
    - Mínimo 2, máximo 15 destinos.
    - Todos los puntos deben estar en un rango menor a 100 km entre sí.
    """
    num_destinations = len(destinations)
    
    if not (2 <= num_destinations <= 15):
        raise ValueError(f"La cantidad de destinos debe estar entre 2 y 15. Se recibieron {num_destinations}.")
    
    # Validar distancia máxima (100km) entre TODOS los puntos (combinaciones posibles)
    for i in range(num_destinations):
        for j in range(i + 1, num_destinations):
            dist = haversine_distance(
                destinations[i]['lat'], destinations[i]['lng'],
                destinations[j]['lat'], destinations[j]['lng']
            )
            
            if dist > 100.0:
                id1 = destinations[i].get('id', f"Punto_{i}")
                id2 = destinations[j].get('id', f"Punto_{j}")
                raise ValueError(
                    f"Distancia inválida: {id1} y {id2} están a {dist:.2f} km de distancia. "
                    "El límite máximo entre cualquier par de puntos es de 100 km."
                )

def get_distance_matrix(api_key, destinations):
    """
    Invoca a la API de Google Maps Distance Matrix.
    Pagina la petición en bloques para evitar el límite de 100 elementos por petición.
    Retorna la matriz de distancias con todas las 'rows' combinadas.
    """
    validate_destinations(destinations)
    
    num_destinations = len(destinations)
    # Todos los destinos siempre se envían formados
    destinations_str = "|".join([f"{d['lat']},{d['lng']}" for d in destinations])
    
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    
    # El límite de la API de Google Maps es de 100 elementos (orígenes * destinos) por petición.
    # Calculamos cuántos orígenes podemos enviar de forma segura por cada lote.
    max_origins_per_request = max(1, 100 // num_destinations)
    
    combined_rows = []
    
    for i in range(0, num_destinations, max_origins_per_request):
        chunk = destinations[i:i + max_origins_per_request]
        origins_str = "|".join([f"{d['lat']},{d['lng']}" for d in chunk])
        
        params = {
            "origins": origins_str,
            "destinations": destinations_str,
            "key": api_key
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("status") != "OK":
            raise Exception(f"Google Maps API Error: {data.get('error_message', data.get('status'))}")
            
        # Añadimos las filas resultantes de este lote
        combined_rows.extend(data.get("rows", []))
        
    return {
        "status": "OK",
        "rows": combined_rows
    }
