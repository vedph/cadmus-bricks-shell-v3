import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { debounceTime, Subscription, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

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
import {
  LngLatLike,
  Map as MaplibreMap,
  MapMouseEvent,
  Marker,
} from 'maplibre-gl';

import { GeoLocation, GeoLocationGeometryFormat } from '../../models';
import { WktService } from '../../services/wkt.service';
import {
  computeCentroid,
  createCirclePolygon,
  createRectanglePolygon,
  haversineDistance,
} from '../../services/geo-helper';
import { DialogService } from '@myrmidon/ngx-mat-tools';

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const DEFAULT_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Drawing tool types for the map editor.
 */
export enum GeoLocationDrawingTool {
  Point = 'point',
  Circle = 'circle',
  Rectangle = 'rectangle',
  Polygon = 'polygon',
}

/**
 * The editable controls backing a GeoLocation.
 */
interface GeoLocationControls {
  eid: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  radius: number | null;
  geometry: string;
  note: string;
}

/**
 * A component for editing a GeoLocation, including its coordinates, geometry,
 * and other properties. It features an interactive map for visualizing and drawing
 * geometries.
 */
@Component({
  selector: 'cadmus-geo-location-editor',
  imports: [
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MapComponent,
    MarkerComponent,
    PopupComponent,
    ControlComponent,
    NavigationControlDirective,
    ScaleControlDirective,
    GeoJSONSourceComponent,
    LayerComponent,
  ],
  templateUrl: './geo-location-editor.html',
  styleUrl: './geo-location-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoLocationEditor implements OnDestroy {
  private readonly _wktService = inject(WktService);
  private _sub?: Subscription;

  // #region Inputs/Outputs
  /**
   * The location being edited.
   */
  public readonly location = model<GeoLocation | undefined>();

  /**
   * The format to use for the geometry field. Defaults to WKT.
   */
  public readonly geometryFormat = input<GeoLocationGeometryFormat>(
    GeoLocationGeometryFormat.WKT,
  );

  /**
   * Emitted when the user cancels the edit.
   */
  public readonly cancelEdit = output();

  /**
   * True to hide the locate button.
   */
  public readonly noLocateButton = input<boolean>(false);

  /**
   * Map tile style URL.
   */
  public readonly mapStyle = input<string>(DEFAULT_MAP_STYLE);
  // #endregion

  // #region Form
  private readonly _draft = signal<GeoLocationControls>(
    this.makeDefaultControls(),
  );
  public readonly form: FieldTree<GeoLocationControls>;
  // set synchronously at the point save() writes `location` (not inside the
  // model-sync effect below), paired with _hasLastLocation since undefined
  // is both "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md
  private _lastLocation: GeoLocation | undefined = undefined;
  private _hasLastLocation = false;
  // #endregion

  // #region Map state signals
  public readonly mapReady = signal(false);
  public readonly mapCenter = signal<LngLatLike>([12.4922, 41.8902]);
  public readonly mapZoom = signal<number>(4);

  private readonly _latSignal = signal<number | null>(null);
  private readonly _lngSignal = signal<number | null>(null);

  public readonly markerLngLat = computed<[number, number] | null>(() => {
    const lat = this._latSignal();
    const lng = this._lngSignal();
    if (lat != null && lng != null) {
      return [lng, lat];
    }
    return null;
  });

  public readonly geometryGeoJSON = signal<GeoJSON.FeatureCollection>({
    ...EMPTY_FC,
  });
  public readonly radiusGeoJSON = signal<GeoJSON.FeatureCollection>({
    ...EMPTY_FC,
  });
  public readonly labelPointGeoJSON = signal<GeoJSON.FeatureCollection>({
    ...EMPTY_FC,
  });
  // #endregion

  // Geolocation API state
  public readonly locating = signal(false);
  public readonly locationAccuracy = signal<number | null>(null);

  public readonly accuracyInfo = computed(() => {
    const acc = this.locationAccuracy();
    if (acc == null) {
      return null;
    }
    if (acc < 20) {
      return {
        icon: 'gps_fixed',
        tip: `GPS fix (~${Math.round(acc)} m)`,
        color: '#4caf50',
      };
    }
    if (acc <= 100) {
      return {
        icon: 'signal_cellular_alt_1_bar',
        tip: `Wi-Fi (~${Math.round(acc)} m)`,
        color: '#8bc34a',
      };
    }
    if (acc <= 1000) {
      return {
        icon: 'signal_cellular_alt_2_bar',
        tip: `Cell tower (~${Math.round(acc)} m)`,
        color: '#ff9800',
      };
    }
    return {
      icon: 'signal_cellular_alt',
      tip: `IP-based (~${Math.round(acc)} m)`,
      color: '#f44336',
    };
  });

  // #region Drawing state
  public readonly drawingMode = signal(false);
  public readonly activeTool = signal<GeoLocationDrawingTool | null>(null);
  public readonly drawingPreviewGeoJSON = signal<GeoJSON.FeatureCollection>({
    ...EMPTY_FC,
  });

  private _polygonVertices: [number, number][] = [];
  private _drawingAnchor: [number, number] | null = null;
  private _drawnGeometry: GeoJSON.Geometry | null = null;
  // #endregion

  constructor(private _dialogService: DialogService) {
    this.form = form(this._draft, (path) => {
      maxLength(path.eid, 100);
      required(path.label);
      maxLength(path.label, 200);
      required(path.latitude);
      min(path.latitude, -90);
      max(path.latitude, 90);
      required(path.longitude);
      min(path.longitude, -180);
      max(path.longitude, 180);
      min(path.radius, 0);
      maxLength(path.geometry, 50000);
      maxLength(path.note, 1000);
    });

    effect(() => {
      const loc = this.location();
      if (this._hasLastLocation && this._lastLocation === loc) {
        return;
      }
      this._lastLocation = loc;
      this._hasLastLocation = true;
      this.updateForm(loc);
    });

    // Debounced draft -> map overlays sync. Unlike the location model sync
    // above, this never writes back to `_draft`/`location`, so there is no
    // feedback loop to guard against here (see signal-forms-migration.md).
    this._sub = toObservable(this._draft)
      .pipe(debounceTime(600))
      .subscribe(() => {
        this.syncLatLngSignals();
        this.updateGeometryOverlays();
        this.updateRadiusOverlay();
        this.updateLabelOverlay();
        this.syncMapCenter();
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  // #region Form <-> Model
  private makeDefaultControls(): GeoLocationControls {
    return {
      eid: '',
      label: '',
      latitude: null,
      longitude: null,
      altitude: null,
      radius: null,
      geometry: '',
      note: '',
    };
  }

  private updateForm(loc: GeoLocation | undefined): void {
    if (!loc) {
      this._draft.set(this.makeDefaultControls());
      this.form().reset();
      this._latSignal.set(null);
      this._lngSignal.set(null);
      this.geometryGeoJSON.set({ ...EMPTY_FC });
      this.radiusGeoJSON.set({ ...EMPTY_FC });
    } else {
      this._draft.set({
        eid: loc.eid || '',
        label: loc.label,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude ?? null,
        radius: loc.radius ?? null,
        geometry: loc.geometry || '',
        note: loc.note || '',
      });
      this.form().reset();

      this._latSignal.set(loc.latitude);
      this._lngSignal.set(loc.longitude);
      this.mapCenter.set([loc.longitude, loc.latitude]);
      this.mapZoom.set(12);

      this.updateGeometryOverlays();
      this.updateRadiusOverlay();
      this.updateLabelOverlay();
    }
  }

  private getLocation(): GeoLocation {
    const v = this._draft();
    return {
      eid: v.eid.trim() || undefined,
      label: v.label.trim() || '',
      latitude: v.latitude ?? 0,
      longitude: v.longitude ?? 0,
      altitude: v.altitude ?? undefined,
      radius: v.radius ?? undefined,
      geometry: v.geometry.trim() || undefined,
      note: v.note.trim() || undefined,
    };
  }
  // #endregion

  // #region Sync helpers
  private syncLatLngSignals(): void {
    this._latSignal.set(this.form.latitude().value());
    this._lngSignal.set(this.form.longitude().value());
  }

  private updateGeometryOverlays(): void {
    const geom = this._wktService.toGeoJSON(
      this.form.geometry().value(),
      this.geometryFormat(),
    );
    if (geom) {
      this.geometryGeoJSON.set({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: geom, properties: {} }],
      });
    } else {
      this.geometryGeoJSON.set({ ...EMPTY_FC });
    }
  }

  private updateRadiusOverlay(): void {
    const r = this.form.radius().value();
    const lat = this.form.latitude().value();
    const lng = this.form.longitude().value();
    if (r && r > 0 && lat != null && lng != null) {
      const circle = createCirclePolygon([lng, lat], r);
      this.radiusGeoJSON.set({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: circle, properties: {} }],
      });
    } else {
      this.radiusGeoJSON.set({ ...EMPTY_FC });
    }
  }

  private updateLabelOverlay(): void {
    const lat = this.form.latitude().value();
    const lng = this.form.longitude().value();
    const lbl = this.form.label().value().trim();
    if (lat != null && lng != null && lbl) {
      this.labelPointGeoJSON.set({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { label: lbl },
          },
        ],
      });
    } else {
      this.labelPointGeoJSON.set({ ...EMPTY_FC });
    }
  }

  private syncMapCenter(): void {
    const lat = this.form.latitude().value();
    const lng = this.form.longitude().value();
    if (
      lat != null &&
      lng != null &&
      !this.form.latitude().errors().length &&
      !this.form.longitude().errors().length
    ) {
      // avoid a duplicate map flyTo when this debounced sync recomputes the
      // same center that was already set synchronously elsewhere (e.g. by
      // updateForm() or setPointFromGeometry())
      const current = this.mapCenter();
      if (
        !Array.isArray(current) ||
        current[0] !== lng ||
        current[1] !== lat
      ) {
        this.mapCenter.set([lng, lat]);
      }
    }
  }
  // #endregion

  // #region Map events
  public onMapLoad(map: MaplibreMap): void {
    // Defer both resize and mapReady so that any marker created in the
    // same render cycle has time to initialize via afterNextRender before
    // the popup @if condition becomes true (prevents "mgl-popup need
    // either lngLat/marker/feature" race condition).
    setTimeout(() => {
      map.resize();
      this.mapReady.set(true);
    }, 0);
  }

  public onMapClick(event: MapMouseEvent): void {
    if (!this.drawingMode()) {
      return;
    }
    const lngLat: [number, number] = [event.lngLat.lng, event.lngLat.lat];

    switch (this.activeTool()) {
      case GeoLocationDrawingTool.Point:
        this.handlePointClick(lngLat);
        break;
      case GeoLocationDrawingTool.Circle:
        this.handleCircleClick(lngLat);
        break;
      case GeoLocationDrawingTool.Rectangle:
        this.handleRectangleClick(lngLat);
        break;
      case GeoLocationDrawingTool.Polygon:
        this.handlePolygonClick(lngLat);
        break;
    }
  }

  public onMapMouseMove(event: MapMouseEvent): void {
    if (!this.drawingMode()) {
      return;
    }
    const lngLat: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    const tool = this.activeTool();

    if (tool === GeoLocationDrawingTool.Circle && this._drawingAnchor) {
      this.previewCircle(lngLat);
    } else if (
      tool === GeoLocationDrawingTool.Rectangle &&
      this._drawingAnchor
    ) {
      this.previewRectangle(lngLat);
    } else if (
      tool === GeoLocationDrawingTool.Polygon &&
      this._polygonVertices.length > 0
    ) {
      this.previewPolygon(lngLat);
    }
  }

  public onMapDblClick(event: MapMouseEvent): void {
    if (!this.drawingMode()) {
      return;
    }
    if (this.activeTool() === GeoLocationDrawingTool.Polygon) {
      event.preventDefault();
      this.finishPolygon();
    }
  }
  // #endregion

  // #region Drawing tool handlers
  private handlePointClick(lngLat: [number, number]): void {
    this.form.latitude().value.set(parseFloat(lngLat[1].toFixed(6)));
    this.form.longitude().value.set(parseFloat(lngLat[0].toFixed(6)));
    this.form.latitude().markAsDirty();
    this.form.longitude().markAsDirty();
    this.syncLatLngSignals();
  }

  private handleCircleClick(lngLat: [number, number]): void {
    if (!this._drawingAnchor) {
      this._drawingAnchor = lngLat;
    } else {
      const radiusM = haversineDistance(this._drawingAnchor, lngLat);
      const polygon = createCirclePolygon(this._drawingAnchor, radiusM);
      this._drawnGeometry = polygon;
      this.setDrawingPreview(polygon);
      this._drawingAnchor = null;
    }
  }

  private previewCircle(cursor: [number, number]): void {
    if (!this._drawingAnchor) {
      return;
    }
    const r = haversineDistance(this._drawingAnchor, cursor);
    const polygon = createCirclePolygon(this._drawingAnchor, r);
    this.setDrawingPreview(polygon);
  }

  private handleRectangleClick(lngLat: [number, number]): void {
    if (!this._drawingAnchor) {
      this._drawingAnchor = lngLat;
    } else {
      const polygon = createRectanglePolygon(this._drawingAnchor, lngLat);
      this._drawnGeometry = polygon;
      this.setDrawingPreview(polygon);
      this._drawingAnchor = null;
    }
  }

  private previewRectangle(cursor: [number, number]): void {
    if (!this._drawingAnchor) {
      return;
    }
    const polygon = createRectanglePolygon(this._drawingAnchor, cursor);
    this.setDrawingPreview(polygon);
  }

  private handlePolygonClick(lngLat: [number, number]): void {
    this._polygonVertices.push(lngLat);
    if (this._polygonVertices.length >= 2) {
      const lineGeom: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: this._polygonVertices,
      };
      this.setDrawingPreview(lineGeom);
    }
  }

  private previewPolygon(cursor: [number, number]): void {
    const allPts = [...this._polygonVertices, cursor];
    if (allPts.length >= 3) {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[...allPts, allPts[0]]],
      };
      this.setDrawingPreview(polygon);
    } else {
      const line: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: allPts,
      };
      this.setDrawingPreview(line);
    }
  }

  private finishPolygon(): void {
    if (this._polygonVertices.length < 3) {
      return;
    }
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[...this._polygonVertices, this._polygonVertices[0]]],
    };
    this._drawnGeometry = polygon;
    this.setDrawingPreview(polygon);
    this._polygonVertices = [];
  }

  private setDrawingPreview(geom: GeoJSON.Geometry): void {
    this.drawingPreviewGeoJSON.set({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: geom, properties: {} }],
    });
  }
  // #endregion

  // #region Public drawing actions
  public toggleDrawingMode(): void {
    const newMode = !this.drawingMode();
    this.drawingMode.set(newMode);

    if (!newMode) {
      // Exiting drawing mode: commit drawn geometry to form
      if (this._drawnGeometry) {
        const text = this._wktService.fromGeoJSON(
          this._drawnGeometry,
          this.geometryFormat(),
        );
        this.form.geometry().value.set(text || '');
        this.form.geometry().markAsDirty();
        this._drawnGeometry = null;
        this.updateGeometryOverlays();
      }
      this.resetDrawingState();
      this.activeTool.set(null);
    }
  }

  public selectTool(tool: GeoLocationDrawingTool): void {
    this.activeTool.set(tool);
    this._polygonVertices = [];
    this._drawingAnchor = null;
  }

  private resetDrawingState(): void {
    this._drawnGeometry = null;
    this._polygonVertices = [];
    this._drawingAnchor = null;
    this.drawingPreviewGeoJSON.set({ ...EMPTY_FC });
  }

  public clearDrawing(): void {
    this._dialogService
      .confirm('Confirmation', 'Clear location?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          this.resetDrawingState();

          // Also clear existing point, geometry, and radius so users start fresh
          this.form.latitude().value.set(null);
          this.form.longitude().value.set(null);
          this.form.geometry().value.set('');
          this.form.radius().value.set(null);
          this.form.latitude().markAsDirty();
          this.form.longitude().markAsDirty();
          this.form.geometry().markAsDirty();
          this._latSignal.set(null);
          this._lngSignal.set(null);
          this.geometryGeoJSON.set({ ...EMPTY_FC });
          this.radiusGeoJSON.set({ ...EMPTY_FC });
        }
      });
  }
  // #endregion

  // #region Map actions
  public setPointFromGeometry(): void {
    const geom = this._wktService.toGeoJSON(
      this.form.geometry().value(),
      this.geometryFormat(),
    );
    if (!geom) {
      return;
    }
    const center = computeCentroid(geom);
    if (!center) {
      return;
    }
    this.form.latitude().value.set(parseFloat(center[1].toFixed(6)));
    this.form.longitude().value.set(parseFloat(center[0].toFixed(6)));
    this.form.latitude().markAsDirty();
    this.form.longitude().markAsDirty();

    this.syncLatLngSignals();
    this.mapCenter.set(center);
  }

  public recenterMap(): void {
    const lat = this.form.latitude().value();
    const lng = this.form.longitude().value();
    if (lat != null && lng != null) {
      this.mapCenter.set([lng, lat]);
      this.mapZoom.set(14);
    }
  }
  // #endregion

  // #region Browser geolocation
  public locateUser(): void {
    if (!navigator.geolocation) {
      return;
    }
    this.locating.set(true);
    this.locationAccuracy.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        this.locationAccuracy.set(pos.coords.accuracy);

        // Clear previous geometry and radius so we start fresh
        this.form.geometry().value.set('');
        this.form.radius().value.set(null);
        this.geometryGeoJSON.set({ ...EMPTY_FC });
        this.radiusGeoJSON.set({ ...EMPTY_FC });

        this.form
          .latitude()
          .value.set(parseFloat(pos.coords.latitude.toFixed(6)));
        this.form
          .longitude()
          .value.set(parseFloat(pos.coords.longitude.toFixed(6)));
        this.form.latitude().markAsDirty();
        this.form.longitude().markAsDirty();

        this.syncLatLngSignals();
        this.updateLabelOverlay();
        this.mapCenter.set([pos.coords.longitude, pos.coords.latitude]);
        this.mapZoom.set(14);
      },
      (err) => {
        this.locating.set(false);
        console.warn('Geolocation failed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }
  // #endregion

  // #region Marker drag
  public onMarkerDragEnd(marker: Marker): void {
    const lngLat = marker.getLngLat();
    this.form.latitude().value.set(parseFloat(lngLat.lat.toFixed(6)));
    this.form.longitude().value.set(parseFloat(lngLat.lng.toFixed(6)));
    this.form.latitude().markAsDirty();
    this.form.longitude().markAsDirty();
    this.syncLatLngSignals();
    this.updateRadiusOverlay();
  }
  // #endregion

  // #region Save / Cancel
  public cancel(): void {
    this.cancelEdit.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    const next = this.getLocation();
    this._lastLocation = next;
    this._hasLastLocation = true;
    this.location.set(next);
    this.form().reset();
  }

  // #endregion
}
