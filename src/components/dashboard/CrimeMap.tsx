"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Layer,
} from "leaflet";
import type { CompstatWindowId, IncidentFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";
import clsx from "clsx";

interface CrimeMapProps {
  incidents: IncidentFeature[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  focusRange?: CompstatWindowId;
  onFocusRangeChange?: (range: CompstatWindowId) => void;
}

const DEFAULT_CENTER: LatLngExpression = [32.7767, -96.797];
const WINDOW_SHORT_LABELS: Record<CompstatWindowId, string> = {
  "7d": "7D",
  "28d": "28D",
  ytd: "YTD",
  "365d": "365D",
};
const WINDOW_ORDER: CompstatWindowId[] = ["7d", "28d", "ytd", "365d"];

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
  focusRange,
  onFocusRangeChange,
}: CrimeMapProps) => {
  const hasIncidents = incidents.length > 0;
  const hasCluster = incidents.length > 1;
  const mapRef = useRef<LeafletMap | null>(null);
  // Keep a reference to the heat layer so we can update/remove it
  const heatLayerRef = useRef<Layer | null>(null);
  const [heatEnabled, setHeatEnabled] = useState(true);
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
  const heatPoints = useMemo<[number, number, number][]>(() => {
    if (!incidents.length) {
      return [];
    }
    const now = Date.now();
    return incidents.map((incident) => {
      const timestamp = Date.parse(incident.occurred ?? "");
      const ageDays = Number.isFinite(timestamp)
        ? Math.max((now - timestamp) / 86_400_000, 0)
        : 0;
      const decay = Math.max(0.35, 1 - ageDays / 365);
      return [
        incident.latitude,
        incident.longitude,
        Number(decay.toFixed(2)) || 1,
      ];
    });
  }, [incidents]);
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

  // Add/update a heatmap layer using leaflet.heat (client-only plugin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (!heatEnabled || heatPoints.length === 0) {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      // Dynamically load the plugin so SSR and bundling stay clean
      await import("leaflet.heat");

      // Ensure a dedicated pane exists so the heat sits below vector markers
      if (!map.getPane("heat")) {
        const pane = map.createPane("heat");
        pane.style.zIndex = "350"; // below overlayPane (400) and markerPane (600)
      }

      const nextLayer = (L as any).heatLayer(heatPoints, {
        pane: "heat",
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.25,
        gradient: {
          0.2: "#4ade80",
          0.4: "#22c55e",
          0.6: "#16a34a",
          0.8: "#059669",
          1.0: "#065f46",
        },
      });

      if (!cancelled) {
        if (heatLayerRef.current) {
          try {
            heatLayerRef.current.remove();
          } catch {}
        }
        heatLayerRef.current = nextLayer.addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      if (heatLayerRef.current) {
        try {
          heatLayerRef.current.remove();
        } catch {}
        heatLayerRef.current = null;
      }
    };
  }, [heatPoints, heatEnabled]);

  const handleRangeSelect = (id: CompstatWindowId) => {
    if (!onFocusRangeChange || id === focusRange) {
      return;
    }
    onFocusRangeChange(id);
  };

  const heatToggleLabel = heatEnabled ? "Heatmap on" : "Heatmap off";

  return (
    <div
      className={clsx(
        "flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-lg shadow-slate-900/30",
        className,
      )}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          {onFocusRangeChange ? (
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
              {WINDOW_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleRangeSelect(option)}
                  aria-pressed={focusRange === option}
                  className={clsx(
                    "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] transition",
                    focusRange === option
                      ? "bg-emerald-300 text-slate-900"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  {WINDOW_SHORT_LABELS[option]}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setHeatEnabled((prev) => !prev)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
              heatEnabled
                ? "border-emerald-300/70 text-emerald-100 hover:bg-emerald-500/10"
                : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
            )}
            title="Toggle the KDE heatmap layer"
          >
            {heatToggleLabel}
          </button>
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-emerald-300 hover:text-white"
            >
              {isExpanded ? "Collapse map" : "Expand map"}
            </button>
          ) : null}
        </div>
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
