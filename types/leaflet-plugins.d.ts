import 'leaflet';

declare module 'leaflet-providers/leaflet-providers.js';
declare module 'leaflet-search';
declare module 'leaflet-draw';
declare module 'leaflet-measure/dist/leaflet-measure.js';
declare module 'leaflet-easybutton';

declare module 'leaflet' {
  interface MapOptions {
    gestureHandling?: boolean;
    gestureHandlingOptions?: {
      duration?: number;
      text?: {
        touch?: string;
        scroll?: string;
        scrollMac?: string;
      };
    };
    searchControl?: boolean | Record<string, unknown>;
    measureControl?: boolean | Record<string, unknown>;
  }

  interface Map {
    gestureHandling?: { enable(): void; disable(): void };
    measureControl?: Control.Measure;
  }

  namespace Control {
    class Search extends Control {
      constructor(options?: Record<string, unknown>);
      setLayer(layer: LayerGroup): this;
      on(type: 'search:locationfound', fn: (event: SearchLocationFoundEvent) => void): this;
      off(type: 'search:locationfound', fn?: (event: SearchLocationFoundEvent) => void): this;
    }

    class Draw extends Control {
      constructor(options?: Record<string, unknown>);
    }

    class Measure extends Control {
      constructor(options?: Record<string, unknown>);
    }
  }

  namespace control {
    function search(options?: Record<string, unknown>): Control.Search;
    function draw(options?: Record<string, unknown>): Control.Draw;
    function measure(options?: Record<string, unknown>): Control.Measure;
  }

  interface ProviderTileLayerOptions extends TileLayerOptions {
    /** Mapbox access token — required for MapBox provider only */
    accessToken?: string;
    /** Mapbox style id, e.g. mapbox/streets-v12 */
    id?: string;
  }

  namespace tileLayer {
    function provider(
      provider: string,
      options?: ProviderTileLayerOptions
    ): TileLayer;
  }

  interface SearchLocationFoundEvent {
    latlng: LatLng;
    title: string;
    layer?: Layer;
  }

  interface DrawEvents {
    CREATED: string;
    EDITED: string;
    DELETED: string;
  }

  const Draw: { Event: DrawEvents };
}
