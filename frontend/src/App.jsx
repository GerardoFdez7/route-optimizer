import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Loader } from '@googlemaps/js-api-loader';
import { auth } from './services/firebase';
import { optimizeRoute } from './services/cloudFunction';
import { getCached, setCache, clearCache } from './services/routeCache';
import Login from './components/login';
import MapView from './components/MapView';
import DestinationInput from './components/DestinationInput';
import RouteResult from './components/RouteResult';
import './App.css';

export default function App() {
  // undefined = still resolving Firebase auth state
  const [user, setUser]             = useState(undefined);
  const [google, setGoogle]         = useState(null);
  const [mapsReady, setMapsReady]   = useState(false);

  const [destinations, setDestinations] = useState([]);
  const [mode, setMode]                 = useState('closed');
  const [routeResult, setRouteResult]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [fromCache, setFromCache]       = useState(false);

  /* ── Firebase auth listener ──────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser ?? null);
      if (!currentUser) {
        clearCache();
        setDestinations([]);
        setRouteResult(null);
        setFromCache(false);
      }
    });
    return unsub;
  }, []);

  /* ── Load Google Maps once the user is logged in ─────── */
  useEffect(() => {
    if (!user) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('VITE_GOOGLE_MAPS_API_KEY no está configurada en .env.local');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    loader.load()
      .then(g  => { setGoogle(g); setMapsReady(true); })
      .catch(() => setError('No se pudo cargar Google Maps. Verifica tu API Key.'));
  }, [user]);

  /* ── Destination CRUD ────────────────────────────────── */
  const addDestination = useCallback(dest => {
    setDestinations(prev => {
      if (prev.length >= 15) return prev;
      return [...prev, dest];
    });
    setRouteResult(null);
    setFromCache(false);
    setError(null);
  }, []);

  const removeDestination = useCallback(id => {
    setDestinations(prev => prev.filter(d => d.id !== id));
    setRouteResult(null);
    setFromCache(false);
  }, []);

  /* ── Optimize ────────────────────────────────────────── */
  const handleOptimize = async () => {
    if (destinations.length < 2) {
      setError('Agrega al menos 2 destinos.');
      return;
    }
    setError(null);

    // Try cache first
    const cached = getCached(destinations, mode);
    if (cached) {
      setRouteResult(cached);
      setFromCache(true);
      return;
    }

    setLoading(true);
    setFromCache(false);
    try {
      const token  = await user.getIdToken();
      const result = await optimizeRoute(token, destinations, mode);
      setRouteResult(result);
      setCache(destinations, mode, result);
    } catch (err) {
      setError(err.message || 'Error al calcular la ruta.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Renders ─────────────────────────────────────────── */

  // 1. Resolving auth
  if (user === undefined) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    );
  }

  // 2. Not authenticated
  if (!user) return <Login />;

  // 3. Authenticated — main UI
  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-hex">⬡</span>
          <span className="header-title">Route<em>Opt</em></span>
        </div>

        <div className="header-right">
          {fromCache && (
            <div className="cache-badge">
              <span className="cache-dot" />
              Resultado en caché
            </div>
          )}
          <span className="user-email">{user.email}</span>
          <button className="btn-signout" onClick={() => signOut(auth)}>
            Salir
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="app-main">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <DestinationInput
            google={google}
            destinations={destinations}
            mode={mode}
            loading={loading}
            onAdd={addDestination}
            onRemove={removeDestination}
            onModeChange={m => { setMode(m); setRouteResult(null); setFromCache(false); }}
            onOptimize={handleOptimize}
          />

          {error && (
            <div className="error-banner">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {routeResult && <RouteResult result={routeResult} fromCache={fromCache} />}
        </aside>

        {/* ── Map ── */}
        <div className="map-area">
          {!mapsReady && (
            <div className="map-loading">
              <div className="spinner" />
              <span>Cargando mapa…</span>
            </div>
          )}
          <MapView
            google={google}
            destinations={destinations}
            routeResult={routeResult}
            onMapClick={addDestination}
            visible={mapsReady}
          />
        </div>
      </main>
    </div>
  );
}