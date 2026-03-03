import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function RouteMap({ trackPoints, hoveredSec }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapLoadedRef = useRef(false);

  useEffect(() => {
    if (!trackPoints?.length || mapRef.current) return;
    if (!import.meta.env.VITE_MAPBOX_TOKEN) return;

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
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates } },
      });

      mapRef.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#f97316', 'line-width': 3, 'line-opacity': 0.9 },
      });

      // Hover position indicator
      mapRef.current.addSource('hover-point', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } },
      });
      mapRef.current.addLayer({
        id: 'hover-circle',
        type: 'circle',
        source: 'hover-point',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#f97316',
          'circle-stroke-width': 2.5,
          'circle-opacity': 0,
          'circle-stroke-opacity': 0,
        },
      });

      // Fit to bounds
      const bounds = coordinates.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );
      mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 16 });

      // Start (green) and finish (red) markers
      new mapboxgl.Marker({ color: '#22c55e' }).setLngLat(coordinates[0]).addTo(mapRef.current);
      new mapboxgl.Marker({ color: '#ef4444' }).setLngLat(coordinates[coordinates.length - 1]).addTo(mapRef.current);

      mapLoadedRef.current = true;
    });

    return () => {
      mapLoadedRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trackPoints]);

  // Move hover marker when chart is hovered
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;

    if (hoveredSec == null) {
      mapRef.current.setPaintProperty('hover-circle', 'circle-opacity', 0);
      mapRef.current.setPaintProperty('hover-circle', 'circle-stroke-opacity', 0);
      return;
    }

    const validPoints = trackPoints.filter(
      (tp) => tp.latitude != null && tp.longitude != null && tp.elapsedSec != null
    );
    if (!validPoints.length) return;

    const nearest = validPoints.reduce((best, tp) =>
      Math.abs(tp.elapsedSec - hoveredSec) < Math.abs(best.elapsedSec - hoveredSec) ? tp : best
    );

    mapRef.current.getSource('hover-point').setData({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [nearest.longitude, nearest.latitude] },
    });
    mapRef.current.setPaintProperty('hover-circle', 'circle-opacity', 1);
    mapRef.current.setPaintProperty('hover-circle', 'circle-stroke-opacity', 1);
  }, [hoveredSec, trackPoints]);

  if (!trackPoints?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">Route</h3>
      <div ref={containerRef} className="h-80 w-full" />
    </div>
  );
}
