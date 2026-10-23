import type * as Leaflet from 'leaflet';

export type LeafletModule = typeof Leaflet;

/**
 * Leaflet, loaded when a map is drawn. Its UMD bundle reads `window` as soon as
 * it is evaluated, so a top-level import broke the build-time prerenderer for
 * every page that has a map; call this from browser-only code.
 */
export function loadLeaflet(): Promise<LeafletModule> {
  return import('leaflet').then((module) => (module as { default?: LeafletModule }).default ?? module);
}
