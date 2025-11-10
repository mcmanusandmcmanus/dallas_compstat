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
import DeckGL from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Map as MapLibre, type ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { CompstatWindowId, IncidentFeature } from "@/lib/types";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import clsx from "clsx";

interface CrimeMapProps {
  incidents: IncidentFeature[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  focusRange?: CompstatWindowId;
  onFocusRangeChange?: (range: CompstatWindowId) => void | Promise<void>;
}

const DEFAULT_CENTER: LatLngExpression = [32.7767, -96.797];
const DALLAS_BOUNDS: [[number, number], [number, number]] = [
  [32.54, -97.2],
  [33.12, -96.3],
];
const WINDOW_SHORT_LABELS: Record<CompstatWindowId, string> = {
  "7d": "7D",
  "28d": "28D",
  ytd: "YTD",
  "365d": "365D",
};
const WINDOW_ORDER: CompstatWindowId[] = ["7d", "28d", "ytd", "365d"];
const GPU_HEATMAP_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_GPU_HEATMAP === "true";
const GPU_HEATMAP_STYLE_URL =
  process.env.NEXT_PUBLIC_GPU_HEATMAP_STYLE ??
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_ATTRIBUTION =
  "© OpenStreetMap contributors · © CARTO · Incident data: Dallas PD";

const computeIncidentWeight = (incident: IncidentFeature) => {
  const now = Date.now();
  const timestamp = Date.parse(incident.occurred ?? "");
  const ageDays = Number.isFinite(timestamp)
    ? Math.max((now - timestamp) / 86_400_000, 0)
    : 0;
  return Number(Math.max(0.35, 1 - ageDays / 365).toFixed(2)) || 1;
};

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

type BoundsTuple = [[number, number], [number, number]];

const toTuple = (value: LatLngBoundsExpression): BoundsTuple => {
  if (Array.isArray(value)) {
    return value as BoundsTuple;
  }
  if (typeof (value as { getSouthWest?: () => { lat: number; lng: number } })
    .getSouthWest === "function") {
    const bounds = value as {
      getSouthWest: () => { lat: number; lng: number };
      getNorthEast: () => { lat: number; lng: number };
    };
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return [
      [sw.lat, sw.lng],
      [ne.lat, ne.lng],
    ];
  }
  return DALLAS_BOUNDS;
};

const ensureDallasBounds = (
  candidate?: LatLngBoundsExpression,
): LatLngBoundsExpression => {
  if (!candidate) {
    return DALLAS_BOUNDS;
  }
  const [
    [south, west],
    [north, east],
  ] = toTuple(candidate);
  const [
    [dSouth, dWest],
    [dNorth, dEast],
  ] = DALLAS_BOUNDS;
  return [
    [Math.min(south, dSouth), Math.min(west, dWest)],
    [Math.max(north, dNorth), Math.max(east, dEast)],
  ];
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
  const [mapEngine, setMapEngine] = useState<"leaflet" | "deckgl">("leaflet");
  const usingGpuHeat = GPU_HEATMAP_ENABLED && mapEngine === "deckgl";
  // Keep a reference to the heat layer so we can update/remove it
  const heatLayerRef = useRef<Layer | null>(null);
  const [heatEnabled, setHeatEnabled] = useState(true);
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const bounds = useMemo(
    () => ensureDallasBounds(computeBounds(incidents)),
    [incidents],
  );

  const centerPoint = useMemo<[number, number]>(
    () =>
      incidents.length === 0
        ? (DEFAULT_CENTER as [number, number])
        : [incidents[0].latitude, incidents[0].longitude],
    [incidents],
  );
  const center: LatLngExpression = centerPoint;

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
    return incidents.map((incident) => [
      incident.latitude,
      incident.longitude,
      computeIncidentWeight(incident),
    ]);
  }, [incidents]);
  type DeckPoint = {
    position: [number, number];
    weight: number;
    incident: IncidentFeature;
  };
  const deckPoints = useMemo<DeckPoint[]>(
    () =>
      incidents.map((incident) => ({
        incident,
        position: [incident.longitude, incident.latitude],
        weight: computeIncidentWeight(incident),
      })),
    [incidents],
  );
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
    if (usingGpuHeat) {
      if (heatLayerRef.current) {
        try {
          heatLayerRef.current.remove();
        } catch {}
        heatLayerRef.current = null;
      }
      return;
    }
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
      const leafletModule = await import("leaflet");
      const Leaflet =
        (leafletModule as { default?: typeof import("leaflet") }).default ??
        leafletModule;
      if (typeof window !== "undefined" && !(window as { L?: unknown }).L) {
        (window as { L?: unknown }).L = Leaflet;
      }
      // Dynamically load the plugin so SSR and bundling stay clean
      // @ts-expect-error - Third-party plugin ships without TypeScript types
      await import("leaflet.heat");
      const heatFactory: ((
        latlngs: [number, number, number][],
        options?: Record<string, unknown>,
      ) => Layer) | null =
        typeof (Leaflet as { heatLayer?: unknown }).heatLayer === "function"
          ? ((Leaflet as { heatLayer: typeof Leaflet.heatLayer }).heatLayer as (
              latlngs: [number, number, number][],
              options?: Record<string, unknown>,
            ) => Layer)
          : null;

      if (!heatFactory) {
        console.warn(
          "leaflet.heat failed to attach to the Leaflet instance; heatmap disabled",
        );
        return;
      }

      // Ensure a dedicated pane exists so the heat sits below vector markers
      if (!map.getPane("heat")) {
        const pane = map.createPane("heat");
        pane.style.zIndex = "350"; // below overlayPane (400) and markerPane (600)
      }

      const nextLayer = heatFactory(heatPoints, {
        pane: "heat",
        radius: 30,
        blur: 25,
        maxZoom: 17,
        minOpacity: 0.35,
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
      } else {
        nextLayer.remove();
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
  }, [heatPoints, heatEnabled, usingGpuHeat]);

  const deckDefaultView = useMemo<ViewState>(() => {
    const [latitude, longitude] = center as [number, number];
    return {
      latitude,
      longitude,
      zoom: hasCluster ? 11 : 10.5,
      minZoom: 9,
      maxZoom: 17,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }, [center, hasCluster]);
  const [deckViewState, setDeckViewState] = useState<ViewState>(deckDefaultView);
  useEffect(() => {
    setDeckViewState((prev) => ({
      ...prev,
      latitude: deckDefaultView.latitude,
      longitude: deckDefaultView.longitude,
      zoom: deckDefaultView.zoom,
    }));
  }, [
    deckDefaultView.latitude,
    deckDefaultView.longitude,
    deckDefaultView.zoom,
  ]);
  const deckLayers = useMemo(() => {
    if (!deckPoints.length) {
      return [];
    }
    const radius = isExpanded ? 70 : 50;
    const layers = [];
    if (heatEnabled) {
      layers.push(
        new HeatmapLayer<DeckPoint>({
          id: "deckgl-crime-heat",
          data: deckPoints,
          getPosition: (d) => d.position,
          getWeight: (d) => d.weight,
          radiusPixels: radius,
          intensity: 1,
          threshold: 0.05,
          aggregation: "SUM",
          colorRange: [
            [52, 211, 153, 60],
            [16, 185, 129, 90],
            [5, 150, 105, 140],
            [4, 120, 87, 200],
            [6, 95, 70, 255],
          ],
        }),
      );
    }
    if (pointsEnabled) {
      layers.push(
        new ScatterplotLayer<DeckPoint>({
          id: "deckgl-crime-points",
          data: deckPoints,
          getPosition: (d) => d.position,
          getRadius: isExpanded ? 70 : 55,
          radiusUnits: "meters",
          stroked: true,
          lineWidthMinPixels: 1,
          getLineColor: [52, 211, 153, 220],
          getFillColor: heatEnabled
            ? [52, 211, 153, 90]
            : [52, 211, 153, 160],
          pickable: true,
          autoHighlight: true,
        }),
      );
    }
    return layers;
  }, [deckPoints, heatEnabled, isExpanded, pointsEnabled]);

  const gpuTooltip = useCallback(
    ({ object }: { object?: DeckPoint | null }) => {
      if (!object) {
        return null;
      }
      const { incident } = object;
      const occurred = incident.occurred
        ? new Date(incident.occurred).toLocaleString()
        : "Unknown time";
      return {
        text: `${incident.offense}\n${incident.division} / Beat ${incident.beat}\n${occurred}`,
      };
    },
    [],
  );

  const handleRangeSelect = (id: CompstatWindowId) => {
    if (!onFocusRangeChange || id === focusRange) {
      return;
    }
    onFocusRangeChange(id);
  };

  const heatToggleLabel = heatEnabled ? "Heatmap on" : "Heatmap off";
  const gpuToggleLabel =
    mapEngine === "deckgl" ? "Use classic heatmap" : "Use GPU heatmap";
  const pointsToggleLabel = pointsEnabled ? "Points on" : "Points off";

  const renderLeafletMap = () => (
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
        {pointsEnabled ? markerNodes : null}
    </MapContainer>
  );

  const renderDeckMap = () => (
    <div className="relative h-full w-full">
      <DeckGL
        controller={{ doubleClickZoom: false, dragRotate: false }}
        layers={deckLayers}
        viewState={deckViewState}
        onViewStateChange={({ viewState }) =>
          setDeckViewState(viewState as ViewState)
        }
        getTooltip={gpuTooltip}
        style={{
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
        }}
      >
        <MapLibre
          mapLib={maplibregl}
          reuseMaps
          mapStyle={GPU_HEATMAP_STYLE_URL}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        />
      </DeckGL>
    </div>
  );

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
            aria-pressed={heatEnabled}
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
          <button
            type="button"
            onClick={() => setPointsEnabled((prev) => !prev)}
            aria-pressed={pointsEnabled}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
              pointsEnabled
                ? "border-emerald-300/70 text-emerald-100 hover:bg-emerald-500/10"
                : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
            )}
            title="Toggle the incident point markers"
          >
            {pointsToggleLabel}
          </button>
          {GPU_HEATMAP_ENABLED ? (
            <button
              type="button"
              onClick={() =>
                setMapEngine((prev) =>
                  prev === "leaflet" ? "deckgl" : "leaflet",
                )
              }
              aria-pressed={mapEngine === "deckgl"}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                mapEngine === "deckgl"
                  ? "border-emerald-300/70 text-emerald-100 hover:bg-emerald-500/10"
                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
              )}
              title="Toggle the deck.gl GPU-driven heatmap overlay"
            >
              {gpuToggleLabel}
            </button>
          ) : null}
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
        {usingGpuHeat ? renderDeckMap() : renderLeafletMap()}
        {heatEnabled && hasIncidents ? (
          <div
            className="pointer-events-none absolute bottom-3 left-3 hidden flex-col rounded-2xl bg-black/40 px-3 py-2 text-[0.65rem] text-white/80 shadow-lg shadow-black/40 md:flex"
            aria-hidden="true"
          >
            <span className="font-semibold tracking-[0.3em] text-white/70">
              HEAT INTENSITY
            </span>
            <div className="mt-2 h-1 w-36 rounded-full bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-700" />
            <div className="mt-1 flex justify-between text-[0.55rem] uppercase tracking-[0.3em] text-white/60">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>
        ) : null}
        {!pointsEnabled ? (
          <div
            className="pointer-events-none absolute top-3 right-3 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-white/70 shadow-lg shadow-black/40"
            aria-hidden="true"
          >
            Incident points hidden
          </div>
        ) : null}
        {usingGpuHeat ? (
          <div
            className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[0.58rem] uppercase tracking-[0.25em] text-white/60 shadow-lg shadow-black/40"
            aria-hidden="true"
          >
            {MAP_ATTRIBUTION}
          </div>
        ) : null}
      </div>
    </div>
  );
};
