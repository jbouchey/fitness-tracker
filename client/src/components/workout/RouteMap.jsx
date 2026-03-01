import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function RouteMap({ trackPoints }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!trackPoints?.length || mapRef.current) return;

    const validPoints = trackPoints.filter((tp) => tp.latitude != null && tp.longitude != null);
    if (!validPoints.length) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [validPoints[0].longitude, validPoints[0].latitude],
      zoom: 12,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      const coordinates = validPoints.map((tp) => [tp.longitude, tp.latitude]);

      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
        },
      });

      mapRef.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      });

      // Fit map to route bounds
      const bounds = coordinates.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );
      mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16 });

      // Start marker (green)
      new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat(coordinates[0])
        .addTo(mapRef.current);

      // Finish marker (red)
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(coordinates[coordinates.length - 1])
        .addTo(mapRef.current);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trackPoints]);

  if (!trackPoints?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">Route</h3>
      <div ref={containerRef} className="h-80 w-full" />
    </div>
  );
}
