"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const DEFAULT_CENTER: [number, number] = [51.169392, 71.449074]; // Астана

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: number;
}

function ClickCapture({
  onChange,
}: {
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

export function MapPicker({ value, onChange, height = 360 }: MapPickerProps) {
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  // Уникальный mountId на каждый монтаж компонента — защищает от
  // "Map container is already initialized" при двойном mount (React Strict Mode/HMR).
  const [mountId, setMountId] = useState(() => Date.now());

  useEffect(() => {
    setMountId(Date.now());
  }, []);

  return (
    <div className="rounded-md overflow-hidden border" style={{ height }}>
      <MapContainer
        key={mountId}
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        <ClickCapture onChange={onChange} />
        {value && (
          <>
            <Marker position={[value.lat, value.lng]} icon={markerIcon} />
            <FlyTo position={[value.lat, value.lng]} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
