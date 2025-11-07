"use client";

import { useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import type {
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import type { IncidentFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface CrimeMapProps {
  incidents: IncidentFeature[];
}

const DEFAULT_CENTER: LatLngExpression = [32.7767, -96.797];

const computeBounds = (
  incidents: IncidentFeature[],
): LatLngBoundsExpression | undefined => {
  if (incidents.length < 2) {
    return undefined;
  }

  const latitudes = incidents.map((item) => item.latitude);
  const longitudes = incidents.map((item) => item.longitude);
  const southWest: [number, number] = [
    Math.min(...latitudes),
    Math.min(...longitudes),
  ];
  const northEast: [number, number] = [
    Math.max(...latitudes),
    Math.max(...longitudes),
  ];
  return [southWest, northEast];
};

export const CrimeMap = ({ incidents }: CrimeMapProps) => {
  const bounds = useMemo(
    () => computeBounds(incidents),
    [incidents],
  );

  const center: LatLngExpression =
    incidents.length === 0
      ? DEFAULT_CENTER
      : [incidents[0].latitude, incidents[0].longitude];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30">
      <header>
        <p className="text-sm font-semibold text-white/80">
          Hot spot map
        </p>
        <p className="text-xs text-white/50">
          Geocoded incidents in the selected window
        </p>
      </header>
      <div className="mt-4 h-[360px] w-full overflow-hidden rounded-xl border border-white/5">
        <MapContainer
          center={center}
          bounds={bounds}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full text-black"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {incidents.map((incident) => (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude, incident.longitude]}
              radius={6}
              pathOptions={{
                color: "#34d399",
                opacity: 0.9,
                weight: 1,
                fillOpacity: 0.6,
              }}
            >
              <Popup>
                <p className="font-semibold">
                  {incident.offense}
                </p>
                <p className="text-xs">
                  {incident.division} / Beat {incident.beat}
                </p>
                <p className="mt-1 text-xs">
                  {new Date(incident.occurred).toLocaleString()}
                </p>
                <p className="mt-1 text-xs">
                  Status: {incident.status}
                </p>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
