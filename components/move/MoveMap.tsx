'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/lib/geo';

type Props = {
  points: GeoPoint[];
  current: GeoPoint | null;
  className?: string;
  height?: number;
};

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.lat, points[0]!.lng], 16);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }, [map, points]);
  return null;
}

function Recenter({ current }: { current: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!current) return;
    map.panTo([current.lat, current.lng], { animate: true });
  }, [map, current]);
  return null;
}

export function MoveMap({ points, current, className = '', height = 280 }: Props) {
  const center = useMemo((): [number, number] => {
    if (current) return [current.lat, current.lng];
    if (points.length > 0) {
      const last = points[points.length - 1]!;
      return [last.lat, last.lng];
    }
    return [39.8283, -98.5795];
  }, [current, points]);

  const path = useMemo(
    () => points.map((p) => [p.lat, p.lng] as [number, number]),
    [points]
  );

  return (
    <div
      className={`overflow-hidden rounded-card border border-border ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'var(--bg3)' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: '#c4a35a', weight: 4 }} />
        )}
        {current && (
          <CircleMarker
            center={[current.lat, current.lng]}
            radius={7}
            pathOptions={{
              color: '#c4a35a',
              fillColor: '#c4a35a',
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}
        {!current && points.length > 0 && (
          <CircleMarker
            center={[points[points.length - 1]!.lat, points[points.length - 1]!.lng]}
            radius={6}
            pathOptions={{
              color: '#c4a35a',
              fillColor: '#c4a35a',
              fillOpacity: 0.9,
              weight: 2,
            }}
          />
        )}
        <FitBounds points={points.length > 0 ? points : current ? [current] : []} />
        {points.length <= 1 && <Recenter current={current} />}
      </MapContainer>
    </div>
  );
}
