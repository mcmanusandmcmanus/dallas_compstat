"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import type {
  Map as LeafletMap,
  FitBoundsOptions,
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import type { IncidentFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";
import clsx from "clsx";

interface CrimeMapProps {
  incidents: IncidentFeature[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
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

export const CrimeMap = ({
  incidents,
  isExpanded = false,
  onToggleExpand,
  className,
}: CrimeMapProps) => {
  const hasIncidents = incidents.length > 0;
  const hasCluster = incidents.length > 1;
  const mapRef = useRef<LeafletMap | null>(null);
  const bounds = useMemo(
    () => computeBounds(incidents),
    [incidents],
  );

  const center: LatLngExpression =
    incidents.length === 0
      ? DEFAULT_CENTER
      : [incidents[0].latitude, incidents[0].longitude];

  const boundsOptions: FitBoundsOptions | undefined = hasCluster
    ? { padding: [48, 48] }
    : undefined;

  const mapHeight = isExpanded
    ? "h-[520px] lg:h-[640px]"
    : "h-[360px] lg:h-[480px]";
  const attachMapRef = useCallback((map: LeafletMap | null) => {
    if (!map) {
      mapRef.current = null;
      return;
    }
    mapRef.current = map;
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, []);
  const markerNodes = useMemo(
    () =>
      incidents.map((incident) => (
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
            <p className="font-semibold">{incident.offense}</p>
            <p className="text-xs">
              {incident.division} / Beat {incident.beat}
            </p>
            <p className="mt-1 text-xs">
              {new Date(incident.occurred).toLocaleString()}
            </p>
            <p className="mt-1 text-xs">Status: {incident.status}</p>
          </Popup>
        </CircleMarker>
      )),
    [incidents],
  );

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [isExpanded, hasIncidents, incidents.length]);

  return (
    <div
      className={clsx(
        "flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white/80">
            Hot spot map
          </p>
          <p className="text-xs uppercase tracking-widest text-emerald-200">
            Current focus window
          </p>
          <p className="text-xs text-white/50">
            Geocoded incidents in the selected window
          </p>
        </div>
        {onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-emerald-300 hover:text-white"
          >
            {isExpanded ? "Collapse map" : "Expand map"}
          </button>
        ) : null}
      </header>
      <div
        className={`relative mt-4 ${mapHeight} w-full overflow-hidden rounded-xl border border-white/5`}
      >
        {!hasIncidents ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/65 text-center text-sm text-white/70">
            <p className="font-semibold text-white">
              No mapped incidents for this window
            </p>
            <p>Adjust filters or try another range to populate the map.</p>
          </div>
        ) : null}
        <MapContainer
          aria-label="Hot spot map for the selected CompStat window"
          center={center}
          bounds={bounds}
          boundsOptions={boundsOptions}
          zoom={11}
          minZoom={10}
          maxZoom={17}
          scrollWheelZoom={false}
          className={clsx(
            "h-full w-full text-black transition duration-300",
            !hasIncidents && "blur-sm opacity-30",
          )}
          ref={attachMapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markerNodes}
        </MapContainer>
      </div>
    </div>
  );
};
