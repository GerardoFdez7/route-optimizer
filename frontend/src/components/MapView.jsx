import { useEffect, useRef, useCallback } from 'react';

/**
 * MapView — renders Google Maps with real street routes via Directions API.
 *
 * Props:
 *   google        — google namespace from @googlemaps/js-api-loader
 *   destinations  — [{ id, lat, lng, name }]
 *   routeResult   — { optimized_route: [{id, lat, lng, name, order}], total_distance_meters }
 *   onMapClick    — called with { id, lat, lng, name } when user clicks the map
 *   visible       — boolean (hide until Maps JS is loaded)
 */
export default function MapView({ google, destinations, routeResult, onMapClick, visible }) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const polylineRef     = useRef(null);
  const directionsRef   = useRef(null); // DirectionsRenderer instance
  const infoWindowRef   = useRef(null);

  /* ── Initialise map once google is available ─────────────────── */
  useEffect(() => {
    if (!google || !containerRef.current || mapRef.current) return;

    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 14.634915, lng: -90.506882 }, // Guatemala City default
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
      styles: DARK_STYLE,
    });

    infoWindowRef.current = new google.maps.InfoWindow();

    // Click on map → add destination
    mapRef.current.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Reverse geocode for a human name
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const name =
          status === 'OK' && results[0]
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onMapClick({ id: crypto.randomUUID(), lat, lng, name });
      });
    });
  }, [google, onMapClick]);

  /* ── Clear helpers ───────────────────────────────────────────── */
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  }, []);

  const clearDirections = useCallback(() => {
    if (directionsRef.current) {
      directionsRef.current.setMap(null);
      directionsRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }, []);

  /* ── Draw markers for raw destinations (no route yet) ────────── */
  const drawDestinationMarkers = useCallback(() => {
    if (!mapRef.current || !google) return;
    clearMarkers();
    clearDirections();

    destinations.forEach((dest, i) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(dest.lat), lng: Number(dest.lng) },
        map: mapRef.current,
        title: dest.name,
        label: {
          text: String(i + 1),
          color: '#0a0a0f',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: '#00e5ff',
          fillOpacity: 1,
          strokeColor: '#0a0a0f',
          strokeWeight: 2,
        },
        animation: google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        infoWindowRef.current.setContent(
          `<div style="color:#0a0a0f;font-family:'Space Mono',monospace;padding:4px 8px">
            <strong>#${i + 1}</strong> ${dest.name}
          </div>`
        );
        infoWindowRef.current.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (destinations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      destinations.forEach(d =>
        bounds.extend({ lat: Number(d.lat), lng: Number(d.lng) })
      );
      mapRef.current.fitBounds(bounds, { padding: 80 });
    }
  }, [google, destinations, clearMarkers, clearDirections]);

  /* ── Draw real-street route from optimized result ────────────── */
  const drawOptimizedRoute = useCallback(() => {
    if (!mapRef.current || !google || !routeResult) return;
    clearMarkers();
    clearDirections();

    const ordered = [...routeResult.optimized_route].sort((a, b) => a.order - b.order);
    if (ordered.length < 2) return;

    const origin      = { lat: Number(ordered[0].lat),                       lng: Number(ordered[0].lng) };
    const destination = { lat: Number(ordered[ordered.length - 1].lat),      lng: Number(ordered[ordered.length - 1].lng) };
    const waypoints   = ordered.slice(1, -1).map(d => ({
      location: { lat: Number(d.lat), lng: Number(d.lng) },
      stopover: true,
    }));

    const dsvc     = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,          // we draw custom markers
      polylineOptions: {
        strokeColor:   '#00e5ff',
        strokeOpacity: 0.85,
        strokeWeight:  5,
        zIndex: 10,
      },
    });
    renderer.setMap(mapRef.current);
    directionsRef.current = renderer;

    dsvc.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // backend already optimised the order
      },
      (result, status) => {
        if (status === 'OK') {
          renderer.setDirections(result);
        } else {
          console.warn('DirectionsService error:', status);
          // Fallback: draw straight polyline
          const path = ordered.map(d => ({ lat: Number(d.lat), lng: Number(d.lng) }));
          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor:   '#00e5ff',
            strokeOpacity: 0.7,
            strokeWeight:  4,
            map: mapRef.current,
          });
        }

        // Draw custom numbered markers on top
        ordered.forEach((dest, i) => {
          const isFirst = i === 0;
          const isLast  = i === ordered.length - 1;
          const color   = isFirst ? '#00ff9d' : isLast ? '#ff4f6b' : '#00e5ff';

          const marker = new google.maps.Marker({
            position: { lat: Number(dest.lat), lng: Number(dest.lng) },
            map: mapRef.current,
            title: dest.name,
            zIndex: 20,
            label: {
              text: String(i + 1),
              color: '#0a0a0f',
              fontWeight: 'bold',
              fontSize: '12px',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 18,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#0a0a0f',
              strokeWeight: 2,
            },
          });

          marker.addListener('click', () => {
            infoWindowRef.current.setContent(
              `<div style="color:#0a0a0f;font-family:'Space Mono',monospace;padding:4px 8px">
                <strong>${isFirst ? '🟢 Inicio' : isLast ? '🔴 Fin' : `Parada #${i + 1}`}</strong><br/>
                ${dest.name}
              </div>`
            );
            infoWindowRef.current.open(mapRef.current, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit bounds to route
        const bounds = new google.maps.LatLngBounds();
        ordered.forEach(d => bounds.extend({ lat: Number(d.lat), lng: Number(d.lng) }));
        mapRef.current.fitBounds(bounds, { padding: 80 });
      }
    );
  }, [google, routeResult, clearMarkers, clearDirections]);

  /* ── React to state changes ──────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !google) return;

    if (routeResult) {
      drawOptimizedRoute();
    } else {
      drawDestinationMarkers();
    }
  }, [google, destinations, routeResult, drawOptimizedRoute, drawDestinationMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: visible ? 'block' : 'none' }}
    />
  );
}

/* ── Dark map style ──────────────────────────────────────────────── */
const DARK_STYLE = [
  { elementType: 'geometry',         stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b949e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road',             elementType: 'geometry',         stylers: [{ color: '#1c2128' }] },
  { featureType: 'road',             elementType: 'geometry.stroke',  stylers: [{ color: '#161b22' }] },
  { featureType: 'road.highway',     elementType: 'geometry',         stylers: [{ color: '#21262d' }] },
  { featureType: 'road.highway',     elementType: 'geometry.stroke',  stylers: [{ color: '#30363d' }] },
  { featureType: 'road.highway',     elementType: 'labels.text.fill', stylers: [{ color: '#00e5ff' }] },
  { featureType: 'water',            elementType: 'geometry',         stylers: [{ color: '#0d2137' }] },
  { featureType: 'water',            elementType: 'labels.text.fill', stylers: [{ color: '#1d4ed8' }] },
  { featureType: 'poi',              elementType: 'geometry',         stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park',         elementType: 'geometry',         stylers: [{ color: '#0f2918' }] },
  { featureType: 'transit',          elementType: 'geometry',         stylers: [{ color: '#161b22' }] },
  { featureType: 'administrative',   elementType: 'geometry.stroke',  stylers: [{ color: '#30363d' }] },
];