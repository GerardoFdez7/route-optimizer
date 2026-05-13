import functions_framework

@functions_framework.http
def optimize_route(request):
    """
    HTTP Cloud Function entry point.
    Recibirá los destinos y el JWT del frontend.
    """
    # TODO: Implementar validación de Firebase Auth
    # TODO: Implementar parseo de coordenadas
    # TODO: Invocar Google Maps Distance Matrix API
    # TODO: Ejecutar Algoritmo Genético
    
    return {
        "status": "SUCCESS", 
        "message": "Endpoint de optimización de rutas iniciado correctamente."
    }, 200
