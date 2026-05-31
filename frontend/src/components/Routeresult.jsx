import styles from './RouteResult.module.css';

/**
 * RouteResult — shows the optimised route order and total distance.
 *
 * Props:
 *   result    — { status, optimized_route: [{id, lat, lng, name, order}], total_distance_meters }
 *   fromCache — boolean
 */
export default function RouteResult({ result, fromCache }) {
  if (!result) return null;

  const ordered = [...result.optimized_route].sort((a, b) => a.order - b.order);
  const km      = (result.total_distance_meters / 1000).toFixed(2);
  const mi      = (result.total_distance_meters / 1609.34).toFixed(2);

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.icon}>◈</span>
        <h3 className={styles.title}>Ruta Optimizada</h3>
        {fromCache && <span className={styles.cachePill}>CACHÉ</span>}
      </div>

      {/* Distance stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{km}</span>
          <span className={styles.statUnit}>km</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{mi}</span>
          <span className={styles.statUnit}>mi</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{ordered.length}</span>
          <span className={styles.statUnit}>paradas</span>
        </div>
      </div>

      {/* Stop list */}
      <ol className={styles.stopList}>
        {ordered.map((stop, i) => {
          const isFirst = i === 0;
          const isLast  = i === ordered.length - 1;
          return (
            <li key={stop.id} className={styles.stopItem}>
              <div
                className={styles.stopDot}
                style={{
                  background: isFirst ? '#00ff9d' : isLast ? '#ff4f6b' : 'var(--accent)',
                }}
              />
              {i < ordered.length - 1 && <div className={styles.stopLine} />}
              <div className={styles.stopInfo}>
                <span className={styles.stopOrder}>
                  {isFirst ? '▶ Inicio' : isLast ? '⬛ Fin' : `#${i + 1}`}
                </span>
                <span className={styles.stopName} title={stop.name}>{stop.name}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}