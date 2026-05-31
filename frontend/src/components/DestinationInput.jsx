import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './DestinationInput.module.css';

/**
 * DestinationInput
 *
 * Props:
 *   google        — google namespace (for Places Autocomplete)
 *   destinations  — current list of destinations
 *   mode          — 'open' | 'closed'
 *   loading       — bool
 *   onAdd(dest)   — { id, lat, lng, name }
 *   onRemove(id)
 *   onModeChange(mode)
 *   onOptimize()
 */
export default function DestinationInput({
  google, destinations, mode, loading,
  onAdd, onRemove, onModeChange, onOptimize,
}) {
  const inputRef      = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputVal, setInputVal] = useState('');
  const [hint, setHint]         = useState('');

  /* ── Initialise Places Autocomplete ──────────────────────────── */
  useEffect(() => {
    if (!google || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry?.location) {
        setHint('Por favor selecciona una sugerencia de la lista.');
        return;
      }
      setHint('');
      onAdd({
        id:   crypto.randomUUID(),
        lat:  place.geometry.location.lat(),
        lng:  place.geometry.location.lng(),
        name: place.name || place.formatted_address,
      });
      setInputVal('');
      // Clear input visually (Autocomplete holds its own value)
      if (inputRef.current) inputRef.current.value = '';
    });
  }, [google, onAdd]);

  /* ── Manual add by pressing Enter (fallback if no suggestion) ── */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      // If Autocomplete has filled the input, place_changed fires instead
      // This handles the edge case where user types coords
      const raw = inputRef.current?.value.trim();
      const coordMatch = raw?.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (coordMatch) {
        onAdd({
          id:   crypto.randomUUID(),
          lat:  parseFloat(coordMatch[1]),
          lng:  parseFloat(coordMatch[2]),
          name: raw,
        });
        setInputVal('');
        if (inputRef.current) inputRef.current.value = '';
        setHint('');
      }
    }
  }, [onAdd]);

  const canOptimize = destinations.length >= 2 && !loading;

  return (
    <div className={styles.panel}>
      {/* Title */}
      <div className={styles.panelHeader}>
        <span className={styles.hexIcon}>⬡</span>
        <h2 className={styles.panelTitle}>Destinos</h2>
        <span className={styles.counter}>{destinations.length}<span>/15</span></span>
      </div>

      {/* Search input */}
      <div className={styles.inputWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder={google ? 'Busca o haz clic en el mapa…' : 'Cargando mapa…'}
          disabled={!google || destinations.length >= 15}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}

      {/* Destination list */}
      <ul className={styles.destList}>
        {destinations.length === 0 && (
          <li className={styles.emptyMsg}>
            Agrega al menos 2 puntos para optimizar.
          </li>
        )}
        {destinations.map((dest, i) => (
          <li key={dest.id} className={styles.destItem}>
            <span className={styles.destIndex}>{i + 1}</span>
            <span className={styles.destName} title={dest.name}>{dest.name}</span>
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(dest.id)}
              aria-label="Eliminar destino"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* Mode toggle */}
      <div className={styles.modeSection}>
        <span className={styles.modeLabel}>Tipo de ruta</span>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'open' ? styles.modeActive : ''}`}
            onClick={() => onModeChange('open')}
          >
            <span>↗</span> Abierta
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'closed' ? styles.modeActive : ''}`}
            onClick={() => onModeChange('closed')}
          >
            <span>↺</span> Circular
          </button>
        </div>
        <p className={styles.modeHint}>
          {mode === 'open'
            ? 'El recorrido termina en el último punto.'
            : 'El recorrido regresa al punto de inicio.'}
        </p>
      </div>

      {/* Optimize button */}
      <button
        className={styles.optimizeBtn}
        disabled={!canOptimize}
        onClick={onOptimize}
      >
        {loading ? (
          <span className={styles.loadingRow}>
            <span className={styles.spinner} />
            Calculando…
          </span>
        ) : (
          <>
            <span className={styles.optimizeIcon}>◈</span>
            Optimizar Ruta
          </>
        )}
      </button>
    </div>
  );
}