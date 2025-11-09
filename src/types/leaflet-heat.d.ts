import type * as L from "leaflet";

declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      pane?: string;
      minOpacity?: number;
      maxZoom?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
      max?: number;
    },
  ): L.Layer & {
    setLatLngs(values: Array<[number, number, number?]>): void;
  };
}

declare module "leaflet.heat" {
  const plugin: {
    heatLayer?: typeof import("leaflet").heatLayer;
  };
  export default plugin;
}
