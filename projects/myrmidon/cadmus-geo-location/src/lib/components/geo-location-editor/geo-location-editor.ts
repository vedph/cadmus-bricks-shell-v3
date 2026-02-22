import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { debounceTime, filter, take } from 'rxjs';

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
 * A component for editing a GeoLocation, including its coordinates, geometry,
 * and other properties. It features an interactive map for visualizing and drawing
 * geometries.
 */
@Component({
  selector: 'cadmus-geo-location-editor',
  imports: [
    ReactiveFormsModule,
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
export class GeoLocationEditor {
  private readonly _wktService = inject(WktService);
  private _updatingForm = false;

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

  // #region Form controls
  public eid: FormControl<string | null>;
  public label: FormControl<string | null>;
  public latitude: FormControl<number | null>;
  public longitude: FormControl<number | null>;
  public altitude: FormControl<number | null>;
  public radius: FormControl<number | null>;
  public geometry: FormControl<string | null>;
  public note: FormControl<string | null>;
  public form: FormGroup;
  // #endregion

  // #region Map state signals
  public readonly mapReady = signal(false);
  public readonly mapCenter = signal<LngLatLike>([12.4922, 41.8902]);
  public readonly mapZoom = signal<[number]>([4]);

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

  constructor(
    private _dialogService: DialogService,
    formBuilder: FormBuilder,
  ) {
    this.eid = formBuilder.control(null, Validators.maxLength(100));
    this.label = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(200),
    ]);
    this.latitude = formBuilder.control(null, [
      Validators.required,
      Validators.min(-90),
      Validators.max(90),
    ]);
    this.longitude = formBuilder.control(null, [
      Validators.required,
      Validators.min(-180),
      Validators.max(180),
    ]);
    this.altitude = formBuilder.control(null);
    this.radius = formBuilder.control(null, Validators.min(0));
    this.geometry = formBuilder.control(null, Validators.maxLength(50000));
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.form = formBuilder.group({
      eid: this.eid,
      label: this.label,
      latitude: this.latitude,
      longitude: this.longitude,
      altitude: this.altitude,
      radius: this.radius,
      geometry: this.geometry,
      note: this.note,
    });

    effect(() => {
      this.updateForm(this.location());
    });

    // Convert debounced form valueChanges to a signal for more efficient
    // change detection with OnPush strategy. Using toSignal() ensures better
    // performance than subscription-based approach when nested in components.
    const _formValueChanges = toSignal(
      this.form.valueChanges.pipe(
        filter(() => !this._updatingForm),
        debounceTime(600),
      ),
      { initialValue: undefined },
    );

    effect(() => {
      // Trigger when form changes (signal notifies of debounced changes)
      _formValueChanges();
      this.syncLatLngSignals();
      this.updateGeometryOverlays();
      this.updateRadiusOverlay();
      this.updateLabelOverlay();
      this.syncMapCenter();
    });
  }

  // #region Form <-> Model
  private updateForm(loc: GeoLocation | undefined): void {
    this._updatingForm = true;
    if (!loc) {
      this.form.reset();
      this._latSignal.set(null);
      this._lngSignal.set(null);
      this.geometryGeoJSON.set({ ...EMPTY_FC });
      this.radiusGeoJSON.set({ ...EMPTY_FC });
    } else {
      this.eid.setValue(loc.eid || null, { emitEvent: false });
      this.label.setValue(loc.label, { emitEvent: false });
      this.latitude.setValue(loc.latitude, { emitEvent: false });
      this.longitude.setValue(loc.longitude, { emitEvent: false });
      this.altitude.setValue(loc.altitude ?? null, { emitEvent: false });
      this.radius.setValue(loc.radius ?? null, { emitEvent: false });
      this.geometry.setValue(loc.geometry || null, { emitEvent: false });
      this.note.setValue(loc.note || null, { emitEvent: false });
      this.form.markAsPristine();

      this._latSignal.set(loc.latitude);
      this._lngSignal.set(loc.longitude);
      this.mapCenter.set([loc.longitude, loc.latitude]);
      this.mapZoom.set([12]);

      this.updateGeometryOverlays();
      this.updateRadiusOverlay();
      this.updateLabelOverlay();
    }
    this._updatingForm = false;
  }

  private getLocation(): GeoLocation {
    return {
      eid: this.eid.value?.trim() || undefined,
      label: this.label.value?.trim() || '',
      latitude: this.latitude.value ?? 0,
      longitude: this.longitude.value ?? 0,
      altitude: this.altitude.value ?? undefined,
      radius: this.radius.value ?? undefined,
      geometry: this.geometry.value?.trim() || undefined,
      note: this.note.value?.trim() || undefined,
    };
  }
  // #endregion

  // #region Sync helpers
  private syncLatLngSignals(): void {
    this._latSignal.set(this.latitude.value);
    this._lngSignal.set(this.longitude.value);
  }

  private updateGeometryOverlays(): void {
    const geom = this._wktService.toGeoJSON(
      this.geometry.value,
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
    const r = this.radius.value;
    const lat = this.latitude.value;
    const lng = this.longitude.value;
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
    const lat = this.latitude.value;
    const lng = this.longitude.value;
    const lbl = this.label.value?.trim();
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
    const lat = this.latitude.value;
    const lng = this.longitude.value;
    if (
      lat != null &&
      lng != null &&
      !this.latitude.errors &&
      !this.longitude.errors
    ) {
      this.mapCenter.set([lng, lat]);
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
    this.latitude.setValue(parseFloat(lngLat[1].toFixed(6)));
    this.longitude.setValue(parseFloat(lngLat[0].toFixed(6)));
    this.latitude.markAsDirty();
    this.longitude.markAsDirty();
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
        this.geometry.setValue(text);
        this.geometry.markAsDirty();
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
          this.latitude.setValue(null);
          this.longitude.setValue(null);
          this.geometry.setValue(null);
          this.radius.setValue(null);
          this.latitude.markAsDirty();
          this.longitude.markAsDirty();
          this.geometry.markAsDirty();
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
      this.geometry.value,
      this.geometryFormat(),
    );
    if (!geom) {
      return;
    }
    const center = computeCentroid(geom);
    if (!center) {
      return;
    }
    // Suppress debounced syncMapCenter to avoid duplicate flyTo.
    this._updatingForm = true;
    this.latitude.setValue(parseFloat(center[1].toFixed(6)));
    this.longitude.setValue(parseFloat(center[0].toFixed(6)));
    this.latitude.markAsDirty();
    this.longitude.markAsDirty();
    this._updatingForm = false;

    this.syncLatLngSignals();
    this.mapCenter.set(center);
  }

  public recenterMap(): void {
    const lat = this.latitude.value;
    const lng = this.longitude.value;
    if (lat != null && lng != null) {
      this.mapCenter.set([lng, lat]);
      this.mapZoom.set([14]);
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

        // Suppress form.valueChanges so the debounced syncMapCenter()
        // doesn't fire a duplicate flyTo that interrupts the animation.
        this._updatingForm = true;

        // Clear previous geometry and radius so we start fresh
        this.geometry.setValue(null);
        this.radius.setValue(null);
        this.geometryGeoJSON.set({ ...EMPTY_FC });
        this.radiusGeoJSON.set({ ...EMPTY_FC });

        this.latitude.setValue(parseFloat(pos.coords.latitude.toFixed(6)));
        this.longitude.setValue(parseFloat(pos.coords.longitude.toFixed(6)));
        this.latitude.markAsDirty();
        this.longitude.markAsDirty();

        this._updatingForm = false;

        this.syncLatLngSignals();
        this.updateLabelOverlay();
        this.mapCenter.set([pos.coords.longitude, pos.coords.latitude]);
        this.mapZoom.set([14]);
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
    this.latitude.setValue(parseFloat(lngLat.lat.toFixed(6)));
    this.longitude.setValue(parseFloat(lngLat.lng.toFixed(6)));
    this.latitude.markAsDirty();
    this.longitude.markAsDirty();
    this.syncLatLngSignals();
    this.updateRadiusOverlay();
  }
  // #endregion

  // #region Save / Cancel
  public cancel(): void {
    this.cancelEdit.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.location.set(this.getLocation());
    this.form.markAsPristine();
  }
  // #endregion
}
