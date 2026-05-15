import firebase_admin
from firebase_admin import auth

def verify_firebase_token(auth_header):
    """
    Verifica un token JWT de Firebase usando el SDK de Admin.
    Retorna los datos del usuario decodificados si es válido, de lo contrario lanza ValueError.
    """
    if not auth_header or not auth_header.startswith('Bearer '):
        raise ValueError("Acceso denegado: Token de autorización no proporcionado o formato inválido.")
    
    id_token = auth_header.split('Bearer ')[1]

    # Inicializar la app de FirebaseAdmin de forma perezosa
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
        
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Acceso denegado: Token inválido o expirado. {str(e)}")
