import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  resource,
  signal,
  untracked,
} from '@angular/core';

import {
  ControlComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  MapComponent,
  MarkerComponent,
  NavigationControlDirective,
  PopupComponent,
  ScaleControlDirective,
} from '@maplibre/ngx-maplibre-gl';
import type {
  FilterSpecification,
  Map as MaplibreMap,
  Marker,
} from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

import {
  PLEIADES_MAX_REGION_VERTICES,
  PleiadesBBox,
  PleiadesLngLat,
  PleiadesSearchResult,
  PleiadesSpatialMode,
} from '../../models';
import {
  bboxFromCorners,
  createBBoxPolygon,
  createCirclePolygon,
  createRegionPolygon,
  createRingPolygon,
  getPointsBounds,
  isInBBox,
  isInRegion,
  moveBBox,
  moveRegion,
  normalizeRegion,
  roundCoord,
  wrapLng,
} from '../../services/pleiades-geo';
import {
  formatPleiadesDistance,
  getUriLastSegment,
} from '../../services/pleiades-helpers';
import { loadPleiadesMapStyle } from '../../services/pleiades-map-style';

/**
 * The default map style used by the Pleiades map.
 */
export const PLEIADES_DEFAULT_MAP_STYLE =
  'https://tiles.openfreemap.org/styles/liberty';

const EMPTY_FC: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * The colors of the map overlays, resolved from the CSS custom properties
 * of the component, as the map style requires literal color values.
 */
interface PleiadesMapColors {
  range: string;
  rangeMin: string;
  bbox: string;
  region: string;
  geometry: string;
}

/**
 * The CSS custom properties defining the colors of the map overlays.
 * Their defaults are set in the component's CSS from Material system
 * tokens, and they can be overridden by consumers.
 */
const COLOR_VARS: Record<keyof PleiadesMapColors, string> = {
  range: '--cadmus-pleiades-range-color',
  rangeMin: '--cadmus-pleiades-range-min-color',
  bbox: '--cadmus-pleiades-bbox-color',
  region: '--cadmus-pleiades-region-color',
  geometry: '--cadmus-pleiades-geometry-color',
};

/**
 * A minimal map pointer event, as got from MapLibre mouse and touch
 * events.
 */
export interface PleiadesMapPointerEvent {
  lngLat: { lng: number; lat: number };
  originalEvent?: Event;
  preventDefault?: () => void;
}

/**
 * The current drag interaction on the map.
 */
type MapDrag =
  | { kind: 'draw'; anchor: PleiadesLngLat }
  | { kind: 'move'; start: PleiadesLngLat; origin: PleiadesBBox }
  | { kind: 'moveRegion'; start: PleiadesLngLat; origin: PleiadesLngLat[] };

/**
 * The maximum distance in pixels from the first vertex of a region being
 * drawn, for a click to close it.
 */
const CLOSE_TOLERANCE = 10;

const POLYGONS_FILTER: FilterSpecification = [
  'in',
  ['geometry-type'],
  ['literal', ['Polygon', 'MultiPolygon']],
];
const LINES_FILTER: FilterSpecification = [
  'in',
  ['geometry-type'],
  ['literal', ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']],
];
const POINTS_FILTER: FilterSpecification = [
  'in',
  ['geometry-type'],
  ['literal', ['Point', 'MultiPoint']],
];

/**
 * A MapLibre map showing Pleiades search results as named pins, and
 * letting users define the spatial filters of a search:
 * - in range mode, click to set the distance point, and drag its marker to
 *   move it; the area between the minimum and maximum distances is shown.
 * - in bbox mode, drag to draw a box; drag inside the box to move it;
 *   shift+drag to draw a new box. Boxes can cross the antimeridian.
 * - in polygon mode, click to add the vertices of a region, and click its
 *   first vertex or double click to close it; once closed, drag inside it
 *   to move it, drag its vertices to reshape it, and shift+click to start
 *   drawing a new one.
 * The map fills its container.
 */
@Component({
  selector: 'cadmus-pleiades-map',
  imports: [
    MapComponent,
    MarkerComponent,
    PopupComponent,
    ControlComponent,
    NavigationControlDirective,
    ScaleControlDirective,
    GeoJSONSourceComponent,
    LayerComponent,
  ],
  templateUrl: './pleiades-map.html',
  styleUrl: './pleiades-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesMapComponent {
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private _map?: MaplibreMap;
  private _drag?: MapDrag;
  private _probe?: HTMLElement;

  // #region Inputs/Outputs
  /**
   * The map style URL.
   */
  public readonly mapStyle = input<string>(PLEIADES_DEFAULT_MAP_STYLE);

  /**
   * The initial center of the map, as `[lng, lat]`.
   */
  public readonly initialCenter = input<PleiadesLngLat>([22, 39]);

  /**
   * The initial zoom level of the map.
   */
  public readonly initialZoom = input<number>(4);

  /**
   * The places to show as pins. Places without coordinates are skipped.
   */
  public readonly results = input<PleiadesSearchResult[]>([]);

  /**
   * True to fit the map to the results whenever they change.
   */
  public readonly autoFit = input<boolean>(true);

  /**
   * The ID of the selected place, if any.
   */
  public readonly selectedId = model<string | undefined>();

  /**
   * The spatial filter mode, which determines how users interact with
   * the map.
   */
  public readonly spatialMode = input<PleiadesSpatialMode>('none');

  /**
   * The distance point for the range mode, as `[lng, lat]`.
   */
  public readonly point = model<PleiadesLngLat | undefined>();

  /**
   * The minimum distance from the point in meters (0=not set).
   */
  public readonly distanceMin = input<number>(0);

  /**
   * The maximum distance from the point in meters (0=not set).
   */
  public readonly distanceMax = input<number>(0);

  /**
   * The bounding box for the bbox mode.
   */
  public readonly bbox = model<PleiadesBBox | undefined>();

  /**
   * The vertices of the region for the polygon mode, without closing
   * vertex. Longitudes are continuous, so they can exceed 180 when the
   * region crosses the antimeridian.
   */
  public readonly region = model<PleiadesLngLat[] | undefined>();

  /**
   * Geometries to highlight, e.g. the locations of a place.
   */
  public readonly geometries = input<Geometry[]>([]);

  /**
   * Emitted when the user clicks a place pin.
   */
  public readonly placeClick = output<PleiadesSearchResult>();
  // #endregion

  /**
   * The map style passed to the map: the style loaded from `mapStyle` and
   * patched to avoid null-comparison warnings, or the URL itself if it
   * could not be loaded.
   */
  public readonly resolvedMapStyle = resource({
    params: () => this.mapStyle(),
    loader: ({ params, abortSignal }) =>
      loadPleiadesMapStyle(params, abortSignal),
  });

  public readonly mapReady = signal(false);
  public readonly hovered = signal<PleiadesSearchResult | undefined>(
    undefined,
  );

  // the point and box while being dragged, before committing them
  private readonly _livePoint = signal<PleiadesLngLat | undefined>(undefined);
  private readonly _liveBBox = signal<PleiadesBBox | undefined>(undefined);
  private readonly _liveRegion = signal<PleiadesLngLat[] | undefined>(
    undefined,
  );
  // the vertices of the region being drawn, and the pointer position
  private readonly _drawing = signal<PleiadesLngLat[]>([]);
  private readonly _cursor = signal<PleiadesLngLat | undefined>(undefined);

  /**
   * The count of vertices of the region being drawn (0 when not drawing).
   */
  public readonly drawingCount = computed(() => this._drawing().length);

  // incremented when the theme changes, to resolve colors again
  private readonly _themeVersion = signal(0);

  public readonly locatedResults = computed(() =>
    this.results().filter((r) => r.lat !== null && r.lng !== null),
  );

  /**
   * The place whose metadata are shown in the popup: the hovered one,
   * or the selected one.
   */
  public readonly popupPlace = computed(() => {
    const hovered = this.hovered();
    if (hovered) {
      return hovered;
    }
    const id = this.selectedId();
    return id ? this.locatedResults().find((r) => r.id === id) : undefined;
  });

  public readonly displayedPoint = computed(() =>
    this.spatialMode() === 'range'
      ? (this._livePoint() ?? this.point())
      : undefined,
  );

  public readonly displayedBBox = computed(() =>
    this.spatialMode() === 'bbox'
      ? (this._liveBBox() ?? this.bbox())
      : undefined,
  );

  public readonly displayedRegion = computed(() =>
    this.spatialMode() === 'polygon'
      ? (this._liveRegion() ?? this.region())
      : undefined,
  );

  /**
   * The vertices of the displayed region, with their index, for the
   * vertex handles. They are hidden while drawing a new region.
   */
  public readonly regionHandles = computed(() =>
    this._drawing().length
      ? []
      : (this.displayedRegion() || []).map((lngLat, index) => ({
          index,
          lngLat,
        })),
  );

  public readonly regionGeoJSON = computed<FeatureCollection>(() => {
    const region = this.displayedRegion();
    return region && region.length >= 3 && !this._drawing().length
      ? this.toFeatureCollection([createRegionPolygon(region)])
      : EMPTY_FC;
  });

  /**
   * The region being drawn: its vertices, and the polygon (or line) they
   * define with the pointer position.
   */
  public readonly drawingGeoJSON = computed<FeatureCollection>(() => {
    const vertices = this._drawing();
    if (!vertices.length) {
      return EMPTY_FC;
    }
    const cursor = this._cursor();
    const all = cursor ? [...vertices, cursor] : vertices;
    const geometries: Geometry[] = vertices.map(
      (v) => ({ type: 'Point', coordinates: v }) as Geometry,
    );
    if (all.length >= 3) {
      geometries.unshift(createRegionPolygon(all));
    } else if (all.length === 2) {
      geometries.unshift({ type: 'LineString', coordinates: all });
    }
    return this.toFeatureCollection(geometries);
  });

  /**
   * The area matching the distance filters: the ring between the minimum
   * and maximum distances, or the circle within the maximum distance.
   */
  public readonly rangeInGeoJSON = computed<FeatureCollection>(() => {
    const point = this.displayedPoint();
    const max = this.distanceMax();
    if (!point || !max || max <= 0) {
      return EMPTY_FC;
    }
    return this.toFeatureCollection([
      createRingPolygon(point, this.distanceMin() || 0, max),
    ]);
  });

  /**
   * The area excluded by the minimum distance.
   */
  public readonly rangeOutGeoJSON = computed<FeatureCollection>(() => {
    const point = this.displayedPoint();
    const min = this.distanceMin();
    if (!point || !min || min <= 0) {
      return EMPTY_FC;
    }
    return this.toFeatureCollection([createCirclePolygon(point, min)]);
  });

  public readonly bboxGeoJSON = computed<FeatureCollection>(() => {
    const bbox = this.displayedBBox();
    return bbox
      ? this.toFeatureCollection([createBBoxPolygon(bbox)])
      : EMPTY_FC;
  });

  public readonly geometriesGeoJSON = computed<FeatureCollection>(() =>
    this.toFeatureCollection(this.geometries()),
  );

  public readonly cursor = computed(() => {
    switch (this.spatialMode()) {
      case 'range':
        return 'crosshair';
      case 'bbox':
        return this.bbox() ? '' : 'crosshair';
      case 'polygon':
        return this.region() && !this._drawing().length ? '' : 'crosshair';
      default:
        return '';
    }
  });

  public readonly colors = computed<PleiadesMapColors>(() => {
    this._themeVersion();
    return {
      range: this.resolveColor(COLOR_VARS.range),
      rangeMin: this.resolveColor(COLOR_VARS.rangeMin),
      bbox: this.resolveColor(COLOR_VARS.bbox),
      region: this.resolveColor(COLOR_VARS.region),
      geometry: this.resolveColor(COLOR_VARS.geometry),
    };
  });

  public readonly polygonsFilter = POLYGONS_FILTER;
  public readonly linesFilter = LINES_FILTER;
  public readonly pointsFilter = POINTS_FILTER;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // fit the map to the results when they change
    effect(() => {
      this.results();
      const ready = this.mapReady();
      untracked(() => {
        if (ready && this.autoFit()) {
          this.fitResults();
        }
      });
    });

    // reset any drag or drawing when the mode changes
    effect(() => {
      this.spatialMode();
      untracked(() => {
        this.cancelDrag();
        this.cancelDrawing();
      });
    });

    // resize the map when its container is resized
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this._map?.resize());
      observer.observe(this._host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    }

    // resolve colors again when the theme changes
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() =>
        this._themeVersion.update((v) => v + 1),
      );
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme'],
      });
      destroyRef.onDestroy(() => observer.disconnect());
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => this._themeVersion.update((v) => v + 1);
      query.addEventListener?.('change', listener);
      destroyRef.onDestroy(() =>
        query.removeEventListener?.('change', listener),
      );
    }

    destroyRef.onDestroy(() => {
      this._probe?.remove();
      this._map = undefined;
    });
  }

  private toFeatureCollection(geometries: Geometry[]): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: geometries.map(
        (geometry) =>
          ({ type: 'Feature', geometry, properties: {} }) as Feature,
      ),
    };
  }

  /**
   * Resolve a CSS custom property holding a color into a literal color,
   * by applying it to a hidden probe element. This also resolves values
   * like light-dark() according to the current color scheme.
   * @param name The custom property name.
   * @returns The color.
   */
  private resolveColor(name: string): string {
    const host = this._host.nativeElement;
    if (typeof getComputedStyle === 'undefined') {
      return 'currentcolor';
    }
    if (!this._probe) {
      this._probe = document.createElement('span');
      this._probe.style.display = 'none';
      host.appendChild(this._probe);
    }
    this._probe.style.color = `var(${name})`;
    const color = getComputedStyle(this._probe).color;
    if (color && !color.includes('var(')) {
      return color;
    }
    // no CSS support for custom properties (e.g. tests): use text color
    return getComputedStyle(host).color || 'gray';
  }

  // #region Results
  public getTypeLabel(result: PleiadesSearchResult): string {
    return result.types.map((t) => getUriLastSegment(t)).join(', ');
  }

  public formatDistance(meters: number | null): string {
    return formatPleiadesDistance(meters);
  }

  public onPinClick(result: PleiadesSearchResult, event?: Event): void {
    event?.stopPropagation();
    this.selectedId.set(result.id);
    this.placeClick.emit(result);
  }

  /**
   * Stop a pointer event on a pin, so that it does not reach the map
   * (which would e.g. set the distance point).
   */
  public stopEvent(event: Event): void {
    event.stopPropagation();
  }
  // #endregion

  // #region Map events
  public onMapLoad(map: MaplibreMap): void {
    this._map = map;
    map.on('mousedown', (e) => this.onPointerDown(e));
    map.on('touchstart', (e) => {
      if (e.points.length === 1) {
        this.onPointerDown(e);
      }
    });
    map.on('mousemove', (e) => this.onPointerMove(e));
    map.on('touchmove', (e) => this.onPointerMove(e));
    map.on('mouseup', () => this.onPointerUp());
    map.on('touchend', () => this.onPointerUp());
    map.on('dblclick', (e) => this.onMapDblClick(e));

    // defer so that markers created in the same cycle are initialized
    // before showing popups
    setTimeout(() => {
      map.resize();
      this.mapReady.set(true);
    }, 0);
  }

  /**
   * Handle a click on the map: in range mode, this sets the distance
   * point.
   * @param event The event.
   */
  public onMapClick(event: PleiadesMapPointerEvent): void {
    if (this.spatialMode() === 'polygon') {
      this.addVertex(event);
      return;
    }
    if (this.spatialMode() !== 'range') {
      return;
    }
    this.point.set([
      roundCoord(wrapLng(event.lngLat.lng)),
      roundCoord(event.lngLat.lat),
    ]);
  }

  /**
   * Handle a mouse down or touch start on the map: in bbox mode, this
   * starts drawing or moving the box.
   * @param event The event.
   */
  public onPointerDown(event: PleiadesMapPointerEvent): void {
    // markers (e.g. region vertices) handle their own drag
    const target = event.originalEvent?.target as Element | null | undefined;
    if (target?.closest?.('.maplibregl-marker')) {
      return;
    }
    const pt: PleiadesLngLat = [event.lngLat.lng, event.lngLat.lat];
    const shift = !!(event.originalEvent as MouseEvent | undefined)?.shiftKey;

    if (this.spatialMode() === 'polygon') {
      // drag inside a closed region to move it, else let the map pan
      const region = this.region();
      if (
        region &&
        !shift &&
        !this._drawing().length &&
        isInRegion(pt, region)
      ) {
        this._drag = { kind: 'moveRegion', start: pt, origin: region };
        event.preventDefault?.();
        this._map?.dragPan.disable();
      }
      return;
    }

    if (this.spatialMode() !== 'bbox') {
      return;
    }
    const box = this.bbox();

    if (box && !shift) {
      if (!isInBBox([wrapLng(pt[0]), pt[1]], box)) {
        // let the map pan
        return;
      }
      this._drag = { kind: 'move', start: pt, origin: box };
    } else {
      this._drag = { kind: 'draw', anchor: pt };
    }
    event.preventDefault?.();
    this._map?.dragPan.disable();
  }

  /**
   * Handle a mouse or touch move on the map, while drawing or moving
   * the box.
   * @param event The event.
   */
  public onPointerMove(event: PleiadesMapPointerEvent): void {
    const pt: PleiadesLngLat = [event.lngLat.lng, event.lngLat.lat];
    if (this._drawing().length) {
      this._cursor.set(pt);
    }
    if (!this._drag) {
      return;
    }
    if (this._drag.kind === 'moveRegion') {
      this._liveRegion.set(
        moveRegion(
          this._drag.origin,
          pt[0] - this._drag.start[0],
          pt[1] - this._drag.start[1],
        ),
      );
    } else if (this._drag.kind === 'draw') {
      this._liveBBox.set(bboxFromCorners(this._drag.anchor, pt));
    } else {
      this._liveBBox.set(
        moveBBox(
          this._drag.origin,
          pt[0] - this._drag.start[0],
          pt[1] - this._drag.start[1],
        ),
      );
    }
  }

  /**
   * Handle a mouse up or touch end on the map, committing the box being
   * drawn or moved.
   */
  public onPointerUp(): void {
    if (!this._drag) {
      return;
    }
    if (this._drag.kind === 'moveRegion') {
      const region = this._liveRegion();
      this.cancelDrag();
      if (region) {
        this.region.set(region);
      }
      return;
    }
    const box = this._liveBBox();
    this.cancelDrag();
    // a click without dragging draws no box
    if (box && box.sw[0] !== box.ne[0] && box.sw[1] !== box.ne[1]) {
      this.bbox.set(box);
    }
  }

  private cancelDrag(): void {
    this._drag = undefined;
    this._liveBBox.set(undefined);
    this._liveRegion.set(undefined);
    this._map?.dragPan.enable();
  }

  /**
   * True if the point is close to the first vertex of the region being
   * drawn, so that clicking it closes the region.
   */
  private isNearFirstVertex(point: PleiadesLngLat): boolean {
    const first = this._drawing()[0];
    if (!first || !this._map) {
      return false;
    }
    const a = this._map.project(first);
    const b = this._map.project(point);
    return Math.hypot(a.x - b.x, a.y - b.y) <= CLOSE_TOLERANCE;
  }

  /**
   * Add a vertex to the region being drawn, starting a new region when
   * there is none, or when shift is pressed. Clicking near the first
   * vertex closes the region.
   * @param event The click event.
   */
  private addVertex(event: PleiadesMapPointerEvent): void {
    const pt: PleiadesLngLat = [event.lngLat.lng, event.lngLat.lat];
    const shift = !!(event.originalEvent as MouseEvent | undefined)?.shiftKey;
    const drawing = this._drawing();

    if (!drawing.length) {
      // with a closed region, clicks do nothing unless shift is pressed
      if (this.region() && !shift) {
        return;
      }
      this._drawing.set([pt]);
      return;
    }
    if (drawing.length >= 3 && this.isNearFirstVertex(pt)) {
      this.finishDrawing();
      return;
    }
    if (drawing.length < PLEIADES_MAX_REGION_VERTICES) {
      this._drawing.set([...drawing, pt]);
    }
  }

  /**
   * Handle a double click on the map: in polygon mode, this closes the
   * region being drawn.
   * @param event The event.
   */
  public onMapDblClick(event: PleiadesMapPointerEvent): void {
    if (this.spatialMode() !== 'polygon' || !this._drawing().length) {
      return;
    }
    event.preventDefault?.();
    this.finishDrawing();
  }

  /**
   * Close the region being drawn, if it has at least 3 distinct vertices,
   * replacing the current region.
   * @returns True if closed.
   */
  public finishDrawing(): boolean {
    const vertices = normalizeRegion(this._drawing());
    if (vertices.length < 3) {
      return false;
    }
    this.cancelDrawing();
    this.region.set(vertices);
    return true;
  }

  /**
   * Discard the region being drawn, if any.
   */
  public cancelDrawing(): void {
    this._drawing.set([]);
    this._cursor.set(undefined);
  }

  public onVertexDrag(index: number, marker: Marker): void {
    const region = this.region();
    if (!region) {
      return;
    }
    const ll = marker.getLngLat();
    const vertices = [...region];
    vertices[index] = [ll.lng, ll.lat];
    this._liveRegion.set(vertices);
  }

  public onVertexDragEnd(index: number, marker: Marker): void {
    this.onVertexDrag(index, marker);
    const region = this._liveRegion();
    this._liveRegion.set(undefined);
    if (region) {
      const vertices = normalizeRegion(region);
      if (vertices.length >= 3) {
        this.region.set(vertices);
      }
    }
  }

  public onPointDrag(marker: Marker): void {
    const ll = marker.getLngLat();
    this._livePoint.set([ll.lng, ll.lat]);
  }

  public onPointDragEnd(marker: Marker): void {
    const ll = marker.getLngLat();
    this._livePoint.set(undefined);
    this.point.set([roundCoord(wrapLng(ll.lng)), roundCoord(ll.lat)]);
  }
  // #endregion

  // #region Public API
  /**
   * Fit the map to the located results, if any.
   */
  public fitResults(): void {
    const bounds = getPointsBounds(this.results());
    if (bounds) {
      this.fitBounds(bounds);
    }
  }

  /**
   * Fit the map to the specified bounds. When the bounds are a point,
   * the map flies to it.
   * @param bounds The bounds.
   * @param maxZoom The maximum zoom level (default 12).
   */
  public fitBounds(bounds: PleiadesBBox, maxZoom = 12): void {
    if (!this._map) {
      return;
    }
    if (bounds.sw[0] === bounds.ne[0] && bounds.sw[1] === bounds.ne[1]) {
      this._map.flyTo({ center: bounds.sw, zoom: Math.min(10, maxZoom) });
      return;
    }
    this._map.fitBounds([bounds.sw, bounds.ne], {
      padding: 48,
      maxZoom,
      duration: 800,
    });
  }

  /**
   * Fly to the specified place, selecting it.
   * @param place The place. Places without coordinates are ignored.
   * @param zoom The zoom level (default 12, or the current one if higher).
   */
  public flyTo(
    place: Pick<PleiadesSearchResult, 'id' | 'lat' | 'lng'>,
    zoom = 12,
  ): void {
    if (place.lat === null || place.lng === null) {
      return;
    }
    this.selectedId.set(place.id);
    this._map?.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(zoom, this._map.getZoom()),
    });
  }
  // #endregion
}
