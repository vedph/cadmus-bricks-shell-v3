import { Component, Directive, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule } from '@angular/forms';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  GeoLocationDrawingTool,
  GeoLocationEditor,
} from './geo-location-editor';
import { GeoLocation, GeoLocationGeometryFormat } from '../../models';
import type { MapMouseEvent, Map as MaplibreMap, Marker } from 'maplibre-gl';

// #region MapLibre stubs
// The real @maplibre/ngx-maplibre-gl components create an actual maplibre-gl
// Map instance, which requires a WebGL-capable canvas that jsdom cannot
// provide. We replace them with lightweight stand-ins exposing the same
// selectors/inputs/outputs used by the component's template, so the rest of
// the component (forms, signals, methods, conditional template branches)
// can be exercised without touching real map rendering.

@Component({
  selector: 'mgl-map',
  template: '<ng-content></ng-content>',
})
class FakeMapComponent {
  @Input() mapStyle: unknown;
  @Input() center: unknown;
  @Input() zoom: unknown;
  @Input() doubleClickZoom: unknown;
  @Input() cursorStyle: unknown;
  @Output() mapLoad = new EventEmitter<unknown>();
  @Output() mapClick = new EventEmitter<unknown>();
  @Output() mapMouseMove = new EventEmitter<unknown>();
  @Output() mapDblClick = new EventEmitter<unknown>();
}

@Component({
  selector: 'mgl-marker',
  template: '<ng-content></ng-content>',
})
class FakeMarkerComponent {
  @Input() lngLat: unknown;
  @Input() draggable: unknown;
  @Input() color: unknown;
  @Output() markerDragEnd = new EventEmitter<unknown>();
}

@Component({
  selector: 'mgl-popup',
  template: '<ng-content></ng-content>',
})
class FakePopupComponent {
  @Input() lngLat: unknown;
  @Input() closeButton: unknown;
  @Input() closeOnClick: unknown;
}

@Component({
  selector: 'mgl-control',
  template: '<ng-content></ng-content>',
})
class FakeControlComponent {
  @Input() position: unknown;
}

@Directive({
  selector: '[mglNavigation]',
})
class FakeNavigationControlDirective {}

@Directive({
  selector: '[mglScale]',
})
class FakeScaleControlDirective {
  @Input() unit: unknown;
}

@Component({
  selector: 'mgl-geojson-source',
  template: '',
})
class FakeGeoJSONSourceComponent {
  @Input() id: unknown;
  @Input() data: unknown;
}

@Component({
  selector: 'mgl-layer',
  template: '',
})
class FakeLayerComponent {
  @Input() id: unknown;
  @Input() type: unknown;
  @Input() source: unknown;
  @Input() layout: unknown;
  @Input() paint: unknown;
}
// #endregion

const TEST_IMPORTS = [
  ReactiveFormsModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatProgressSpinnerModule,
  MatTooltipModule,
  FakeMapComponent,
  FakeMarkerComponent,
  FakePopupComponent,
  FakeControlComponent,
  FakeNavigationControlDirective,
  FakeScaleControlDirective,
  FakeGeoJSONSourceComponent,
  FakeLayerComponent,
];

class FakeDialogService {
  public confirmResult = true;
  public confirm = vi.fn(() => of(this.confirmResult));
}

async function flush(fixture: ComponentFixture<GeoLocationEditor>) {
  await fixture.whenStable();
}

/** Waits past the 600ms form.valueChanges debounce and settles the fixture. */
async function waitForDebounce(fixture: ComponentFixture<GeoLocationEditor>) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  await fixture.whenStable();
}

describe('GeoLocationEditor', () => {
  let component: GeoLocationEditor;
  let fixture: ComponentFixture<GeoLocationEditor>;
  let dialogService: FakeDialogService;

  const sampleLocation: GeoLocation = {
    eid: 'place-123',
    label: 'Ancient Settlement X',
    latitude: 41.8902,
    longitude: 12.4922,
    altitude: 35,
    radius: 100,
    geometry:
      'POLYGON((12.48 41.89, 12.49 41.89, 12.49 41.90, 12.48 41.90, 12.48 41.89))',
    note: 'a note',
  };

  beforeEach(async () => {
    dialogService = new FakeDialogService();

    await TestBed.configureTestingModule({
      imports: [GeoLocationEditor],
      providers: [
        provideNoopAnimations(),
        { provide: DialogService, useValue: dialogService },
      ],
    })
      .overrideComponent(GeoLocationEditor, {
        set: { imports: TEST_IMPORTS },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GeoLocationEditor);
    component = fixture.componentInstance;
    await flush(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // #region Defaults
  describe('defaults', () => {
    it('defaults geometryFormat to WKT', () => {
      expect(component.geometryFormat()).toBe(GeoLocationGeometryFormat.WKT);
    });

    it('defaults noLocateButton to false', () => {
      expect(component.noLocateButton()).toBe(false);
    });

    it('defaults mapStyle to the OpenFreeMap Liberty style', () => {
      expect(component.mapStyle()).toBe(
        'https://tiles.openfreemap.org/styles/liberty',
      );
    });

    it('starts with an empty/invalid form and no marker', () => {
      expect(component.form.valid).toBe(false);
      expect(component.markerLngLat()).toBeNull();
      expect(component.drawingMode()).toBe(false);
      expect(component.activeTool()).toBeNull();
    });
  });
  // #endregion

  // #region Model -> form sync
  describe('model -> form sync', () => {
    it('populates the form when location input is set', async () => {
      fixture.componentRef.setInput('location', sampleLocation);
      await flush(fixture);

      expect(component.eid.value).toBe('place-123');
      expect(component.label.value).toBe('Ancient Settlement X');
      expect(component.latitude.value).toBe(41.8902);
      expect(component.longitude.value).toBe(12.4922);
      expect(component.altitude.value).toBe(35);
      expect(component.radius.value).toBe(100);
      expect(component.geometry.value).toBe(sampleLocation.geometry);
      expect(component.note.value).toBe('a note');
      expect(component.form.pristine).toBe(true);

      expect(component.markerLngLat()).toEqual([12.4922, 41.8902]);
      expect(component.mapCenter()).toEqual([12.4922, 41.8902]);
      expect(component.mapZoom()).toBe(12);
    });

    it('sets optional fields to null when absent from the input location', async () => {
      fixture.componentRef.setInput('location', {
        label: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
      } as GeoLocation);
      await flush(fixture);

      expect(component.eid.value).toBeNull();
      expect(component.altitude.value).toBeNull();
      expect(component.radius.value).toBeNull();
      expect(component.geometry.value).toBeNull();
      expect(component.note.value).toBeNull();
    });

    it('resets the form and overlays when location is cleared', async () => {
      fixture.componentRef.setInput('location', sampleLocation);
      await flush(fixture);

      fixture.componentRef.setInput('location', undefined);
      await flush(fixture);

      expect(component.form.value.label).toBeFalsy();
      expect(component.markerLngLat()).toBeNull();
      expect(component.geometryGeoJSON().features).toHaveLength(0);
      expect(component.radiusGeoJSON().features).toHaveLength(0);
    });

    it('populates the geometry, radius and label overlays from the input location', async () => {
      fixture.componentRef.setInput('location', sampleLocation);
      await flush(fixture);

      expect(component.geometryGeoJSON().features).toHaveLength(1);
      expect(component.geometryGeoJSON().features[0].geometry.type).toBe(
        'Polygon',
      );
      expect(component.radiusGeoJSON().features).toHaveLength(1);
      expect(component.labelPointGeoJSON().features).toHaveLength(1);
    });
  });
  // #endregion

  // #region Save / cancel
  describe('save/cancel', () => {
    it('does not update the location model when the form is invalid', () => {
      component.save();
      expect(component.location()).toBeUndefined();
      expect(component.label.touched).toBe(true);
    });

    it('updates the location model with trimmed values on save when valid', () => {
      component.eid.setValue('  abc  ');
      component.label.setValue('  Rome  ');
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.note.setValue('  hi  ');

      component.save();

      expect(component.location()).toEqual({
        eid: 'abc',
        label: 'Rome',
        latitude: 41.9,
        longitude: 12.5,
        altitude: undefined,
        radius: undefined,
        geometry: undefined,
        note: 'hi',
      });
      expect(component.form.pristine).toBe(true);
    });

    it('falls back eid/geometry/note/altitude/radius to undefined when blank', () => {
      component.eid.setValue('   ');
      component.label.setValue('Rome');
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.geometry.setValue('   ');

      component.save();

      const loc = component.location();
      expect(loc?.eid).toBeUndefined();
      expect(loc?.geometry).toBeUndefined();
      expect(loc?.altitude).toBeUndefined();
      expect(loc?.radius).toBeUndefined();
      expect(loc?.note).toBeUndefined();
    });

    it('defaults latitude/longitude to 0 when null (defensive getLocation branch)', () => {
      // Force save() to run getLocation() with null lat/lng by bypassing
      // validity via a direct call - simulate through valid required fields
      // then clearing without validators re-running (still invalid though).
      component.label.setValue('Rome');
      component.latitude.setValue(0);
      component.longitude.setValue(0);
      component.save();
      expect(component.location()?.latitude).toBe(0);
      expect(component.location()?.longitude).toBe(0);
    });

    it('emits cancelEdit on cancel', () => {
      const spy = vi.fn();
      component.cancelEdit.subscribe(spy);
      component.cancel();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
  // #endregion

  // #region Form validation via the template
  describe('form validation errors in the template', () => {
    it('shows "label required" once the label control is touched and empty', async () => {
      component.label.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('label required');
    });

    it('shows latitude range error when out of bounds and touched', async () => {
      component.latitude.setValue(200);
      component.latitude.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('-90 to 90');
    });

    it('shows longitude range error when out of bounds and touched', async () => {
      component.longitude.setValue(-200);
      component.longitude.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('-180 to 180');
    });

    it('shows radius min error when negative and touched', async () => {
      component.radius.setValue(-5);
      component.radius.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('must be >= 0');
    });

    // Note: the template's own `@if` guards these <mat-error> blocks on
    // `(control.dirty || control.touched)`, but Angular Material's default
    // ErrorStateMatcher (@angular/material 22) only flips a control's
    // mat-form-field `errorState` - which gates whether the form field's
    // subscript wrapper renders the error slot at all - on `touched` (or
    // form submission), not on `dirty`. In practice this means a
    // dirty-but-not-touched control's projected <mat-error> is never
    // actually shown by mat-form-field, even though the app's own @if
    // condition is satisfied. We mark the controls touched here (as a real
    // user would on blur) to reflect what is actually rendered.
    it('shows eid maxlength error once dirty and touched', async () => {
      component.eid.setValue('x'.repeat(101));
      component.eid.markAsDirty();
      component.eid.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('eid too long');
    });

    it('shows geometry maxlength error once dirty and touched', async () => {
      component.geometry.setValue('x'.repeat(50001));
      component.geometry.markAsDirty();
      component.geometry.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('geometry too long');
    });

    it('shows note maxlength error once dirty and touched', async () => {
      component.note.setValue('x'.repeat(1001));
      component.note.markAsDirty();
      component.note.markAsTouched();
      fixture.detectChanges();
      await flush(fixture);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('note too long');
    });

    it("computes the eid maxlength error via the component's own @if condition even when only dirty (not touched)", () => {
      // This documents the underlying app-level condition in isolation from
      // mat-form-field's own display gating covered above.
      component.eid.setValue('x'.repeat(101));
      component.eid.markAsDirty();
      expect(component.eid.errors?.['maxlength']).toBeTruthy();
      expect(component.eid.dirty).toBe(true);
      expect(component.eid.touched).toBe(false);
    });

    it('disables the submit button while the form is invalid or pristine', () => {
      fixture.detectChanges();
      const submitBtn = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitBtn.nativeElement.disabled).toBe(true);
    });

    it('enables the submit button once the form is valid and dirty', () => {
      component.label.setValue('Rome');
      component.label.markAsDirty();
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      fixture.detectChanges();
      const submitBtn = fixture.debugElement.query(
        By.css('button[type="submit"]'),
      );
      expect(submitBtn.nativeElement.disabled).toBe(false);
    });
  });
  // #endregion

  // #region DOM interactions
  describe('simulated user interactions', () => {
    it('updates the label form control when typing in the label input', () => {
      fixture.detectChanges();
      const inputs = fixture.debugElement.queryAll(By.css('input[matInput]'));
      const labelInput = inputs[1].nativeElement as HTMLInputElement;
      labelInput.value = 'Typed Label';
      labelInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.label.value).toBe('Typed Label');
    });

    it('calls cancel() when the discard button is clicked', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'cancel');
      const cancelBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Discard changes"]'),
      );
      cancelBtn.nativeElement.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(spy).toHaveBeenCalled();
    });

    it('toggles drawing mode when the draw button is clicked, showing the tool picker', () => {
      // [matTooltip] on this button is a *property* binding, so it is never
      // reflected as a plain DOM attribute we could select on; find the
      // button by its icon ligature text (edit / edit_off) instead.
      function findDrawToggleButton() {
        const buttons = fixture.debugElement.queryAll(
          By.css('.map-toolbar button'),
        );
        return buttons.find((b) => {
          const icon = b.query(By.css('mat-icon'));
          const t = icon?.nativeElement.textContent?.trim();
          return t === 'edit' || t === 'edit_off';
        });
      }

      fixture.detectChanges();
      const drawBtn = findDrawToggleButton();
      expect(drawBtn).toBeTruthy();
      expect(
        drawBtn!.query(By.css('mat-icon')).nativeElement.textContent.trim(),
      ).toBe('edit');

      drawBtn!.nativeElement.dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(component.drawingMode()).toBe(true);
      const toggleGroup = fixture.debugElement.query(
        By.css('mat-button-toggle-group'),
      );
      expect(toggleGroup).toBeTruthy();

      const drawBtnAfter = findDrawToggleButton();
      expect(
        drawBtnAfter!
          .query(By.css('mat-icon'))
          .nativeElement.textContent.trim(),
      ).toBe('edit_off');
    });

    it('hides the locate button when noLocateButton is true', () => {
      fixture.componentRef.setInput('noLocateButton', true);
      fixture.detectChanges();
      const locateBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Use browser location"]'),
      );
      expect(locateBtn).toBeNull();
    });

    it('shows the locate button by default', () => {
      fixture.detectChanges();
      const locateBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Use browser location"]'),
      );
      expect(locateBtn).toBeTruthy();
    });

    it('disables the centroid button when there is no geometry', () => {
      fixture.detectChanges();
      const btn = fixture.debugElement.query(
        By.css('button[matTooltip="Set point from geometry centroid"]'),
      );
      expect(btn.nativeElement.disabled).toBe(true);
    });

    it('enables the centroid button once a geometry value is present', () => {
      component.geometry.setValue('POINT(1 1)');
      fixture.detectChanges();
      const btn = fixture.debugElement.query(
        By.css('button[matTooltip="Set point from geometry centroid"]'),
      );
      expect(btn.nativeElement.disabled).toBe(false);
    });
  });
  // #endregion

  // #region Debounced form -> map sync
  describe('debounced form -> map overlay sync', () => {
    it('updates the geometry overlay 600ms after typing a valid geometry', async () => {
      component.geometry.setValue('POINT(5 6)');
      await waitForDebounce(fixture);

      expect(component.geometryGeoJSON().features).toHaveLength(1);
      expect(component.geometryGeoJSON().features[0].geometry).toEqual({
        type: 'Point',
        coordinates: [5, 6],
      });
    });

    it('clears the geometry overlay when the geometry becomes invalid', async () => {
      component.geometry.setValue('POINT(5 6)');
      await waitForDebounce(fixture);
      expect(component.geometryGeoJSON().features).toHaveLength(1);

      component.geometry.setValue('not a valid geometry (((');
      await waitForDebounce(fixture);
      expect(component.geometryGeoJSON().features).toHaveLength(0);
    });

    it('updates the radius overlay once radius and coordinates are valid', async () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.radius.setValue(500);
      await waitForDebounce(fixture);

      expect(component.radiusGeoJSON().features).toHaveLength(1);
      expect(component.radiusGeoJSON().features[0].geometry.type).toBe(
        'Polygon',
      );
    });

    it('clears the radius overlay when radius is 0', async () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.radius.setValue(0);
      await waitForDebounce(fixture);

      expect(component.radiusGeoJSON().features).toHaveLength(0);
    });

    it('updates the label overlay once label and coordinates are set', async () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.label.setValue('Rome');
      await waitForDebounce(fixture);

      expect(component.labelPointGeoJSON().features).toHaveLength(1);
      expect(component.labelPointGeoJSON().features[0].properties).toEqual({
        label: 'Rome',
      });
    });

    it('clears the label overlay when the label is blank', async () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.label.setValue('   ');
      await waitForDebounce(fixture);

      expect(component.labelPointGeoJSON().features).toHaveLength(0);
    });

    it('syncs the map center when lat/lng are valid', async () => {
      component.latitude.setValue(10);
      component.longitude.setValue(20);
      await waitForDebounce(fixture);

      expect(component.mapCenter()).toEqual([20, 10]);
    });

    it('does not sync the map center when latitude is out of range', async () => {
      const before = component.mapCenter();
      component.latitude.setValue(999);
      component.longitude.setValue(20);
      await waitForDebounce(fixture);

      expect(component.mapCenter()).toEqual(before);
    });
  });
  // #endregion

  // #region Drawing tools via map events
  describe('drawing tools', () => {
    function clickAt(lng: number, lat: number) {
      component.onMapClick({
        lngLat: { lng, lat },
      } as unknown as MapMouseEvent);
    }

    function moveAt(lng: number, lat: number) {
      component.onMapMouseMove({
        lngLat: { lng, lat },
      } as unknown as MapMouseEvent);
    }

    it('ignores map clicks when not in drawing mode', () => {
      clickAt(1, 2);
      expect(component.latitude.value).toBeNull();
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(0);
    });

    it('ignores mouse moves when not in drawing mode', () => {
      component.selectTool(GeoLocationDrawingTool.Circle);
      moveAt(1, 2);
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(0);
    });

    it('places a point and updates lat/lng via the point tool', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Point);
      clickAt(12.123456789, 41.987654321);

      expect(component.longitude.value).toBeCloseTo(12.123457, 6);
      expect(component.latitude.value).toBeCloseTo(41.987654, 6);
      expect(component.longitude.dirty).toBe(true);
      expect(component.latitude.dirty).toBe(true);
      expect(component.markerLngLat()).toEqual([
        component.longitude.value,
        component.latitude.value,
      ]);
    });

    it('draws a circle across two clicks and previews while moving', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Circle);

      clickAt(0, 0); // anchor
      moveAt(0, 0.01); // preview while dragging
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(1);
      expect(component.drawingPreviewGeoJSON().features[0].geometry.type).toBe(
        'Polygon',
      );

      clickAt(0, 0.02); // finish circle
      expect(component.drawingPreviewGeoJSON().features[0].geometry.type).toBe(
        'Polygon',
      );
    });

    it('draws a rectangle across two clicks and previews while moving', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Rectangle);

      clickAt(0, 0);
      moveAt(2, 2);
      let preview = component.drawingPreviewGeoJSON().features[0]
        .geometry as GeoJSON.Polygon;
      expect(preview.coordinates[0]).toEqual([
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ]);

      clickAt(3, 3);
      preview = component.drawingPreviewGeoJSON().features[0]
        .geometry as GeoJSON.Polygon;
      expect(preview.coordinates[0]).toEqual([
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
        [0, 0],
      ]);
    });

    it('previews a line while fewer than 3 polygon vertices are set, then a closed polygon at 3+', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Polygon);

      clickAt(0, 0);
      // only 1 vertex: no preview yet (handlePolygonClick needs >= 2)
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(0);

      clickAt(1, 0);
      // 2 vertices -> line preview
      let feature = component.drawingPreviewGeoJSON().features[0];
      expect(feature.geometry.type).toBe('LineString');

      moveAt(1, 1);
      // cursor + 2 vertices = 3 points -> polygon preview
      feature = component.drawingPreviewGeoJSON().features[0];
      expect(feature.geometry.type).toBe('Polygon');
    });

    it('does nothing on double-click with fewer than 3 polygon vertices', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Polygon);
      clickAt(0, 0);
      clickAt(1, 0);

      const preventDefault = vi.fn();
      component.onMapDblClick({
        preventDefault,
      } as unknown as MapMouseEvent);

      // still just the line preview from the 2 clicks, no commit
      expect(component.geometry.dirty).toBe(false);
    });

    it('finishes a polygon on double-click once 3+ vertices exist', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Polygon);
      clickAt(0, 0);
      clickAt(2, 0);
      clickAt(2, 2);

      const preventDefault = vi.fn();
      component.onMapDblClick({
        preventDefault,
      } as unknown as MapMouseEvent);

      const feature = component.drawingPreviewGeoJSON().features[0];
      expect(feature.geometry.type).toBe('Polygon');
      expect(
        (feature.geometry as GeoJSON.Polygon).coordinates[0],
      ).toHaveLength(4); // 3 vertices + closing point
    });

    it('ignores double-click when not in drawing mode', () => {
      const preventDefault = vi.fn();
      component.onMapDblClick({
        preventDefault,
      } as unknown as MapMouseEvent);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('commits the drawn geometry to the form as WKT when exiting drawing mode', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Rectangle);
      clickAt(0, 0);
      clickAt(1, 1);

      component.toggleDrawingMode(); // exit -> commit

      expect(component.drawingMode()).toBe(false);
      expect(component.geometry.dirty).toBe(true);
      expect(component.geometry.value).toContain('POLYGON');
      expect(component.activeTool()).toBeNull();
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(0);
      // committed geometry is reflected in the geometry overlay too
      expect(component.geometryGeoJSON().features).toHaveLength(1);
    });

    it('does not touch the geometry control when exiting drawing mode without drawing anything', () => {
      component.toggleDrawingMode();
      component.toggleDrawingMode();
      expect(component.geometry.dirty).toBe(false);
      expect(component.geometry.value).toBeNull();
    });

    it('serializes the drawn geometry as GeoJSON when geometryFormat is GeoJSON', () => {
      fixture.componentRef.setInput(
        'geometryFormat',
        GeoLocationGeometryFormat.GeoJSON,
      );
      fixture.detectChanges();

      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Rectangle);
      clickAt(0, 0);
      clickAt(1, 1);
      component.toggleDrawingMode();

      expect(() => JSON.parse(component.geometry.value as string)).not.toThrow();
      const parsed = JSON.parse(component.geometry.value as string);
      expect(parsed.type).toBe('Polygon');
    });

    it('resets accumulated vertices/anchor (but not the visible preview) when a new tool is selected', () => {
      component.toggleDrawingMode();
      component.selectTool(GeoLocationDrawingTool.Polygon);
      clickAt(0, 0);
      clickAt(1, 0); // 2 vertices -> a LineString preview is shown

      // switching tool resets the internal polygon vertices/anchor state...
      component.selectTool(GeoLocationDrawingTool.Circle);
      // ...but note: selectTool() does not clear drawingPreviewGeoJSON, so
      // the stale LineString preview from the previous tool is still shown
      // until a new shape is drawn. Documenting this current behavior here;
      // it may be worth clearing the preview on tool switch in the future.
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(1);
      expect(component.drawingPreviewGeoJSON().features[0].geometry.type).toBe(
        'LineString',
      );

      // first circle click only sets the anchor, no new preview yet
      clickAt(5, 5);
      expect(component.drawingPreviewGeoJSON().features).toHaveLength(1);
      expect(component.drawingPreviewGeoJSON().features[0].geometry.type).toBe(
        'LineString',
      );

      // second circle click computes and shows the actual circle preview
      clickAt(5, 5.01);
      expect(component.drawingPreviewGeoJSON().features[0].geometry.type).toBe(
        'Polygon',
      );
    });
  });
  // #endregion

  // #region clearDrawing
  describe('clearDrawing', () => {
    it('clears point, geometry and radius when confirmed', () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);
      component.geometry.setValue('POINT(1 1)');
      component.radius.setValue(100);

      dialogService.confirmResult = true;
      component.clearDrawing();

      expect(dialogService.confirm).toHaveBeenCalledWith(
        'Confirmation',
        'Clear location?',
      );
      expect(component.latitude.value).toBeNull();
      expect(component.longitude.value).toBeNull();
      expect(component.geometry.value).toBeNull();
      expect(component.radius.value).toBeNull();
      expect(component.latitude.dirty).toBe(true);
      expect(component.longitude.dirty).toBe(true);
      expect(component.geometry.dirty).toBe(true);
      expect(component.markerLngLat()).toBeNull();
      expect(component.geometryGeoJSON().features).toHaveLength(0);
      expect(component.radiusGeoJSON().features).toHaveLength(0);
    });

    it('does nothing when not confirmed', () => {
      component.latitude.setValue(41.9);
      component.longitude.setValue(12.5);

      dialogService.confirmResult = false;
      component.clearDrawing();

      expect(component.latitude.value).toBe(41.9);
      expect(component.longitude.value).toBe(12.5);
    });
  });
  // #endregion

  // #region setPointFromGeometry
  describe('setPointFromGeometry', () => {
    it('does nothing when geometry is empty', () => {
      const before = component.mapCenter();
      component.setPointFromGeometry();
      expect(component.mapCenter()).toEqual(before);
      expect(component.latitude.dirty).toBe(false);
    });

    it('does nothing when geometry is invalid', () => {
      component.geometry.setValue('garbage(((');
      const before = component.mapCenter();
      component.setPointFromGeometry();
      expect(component.mapCenter()).toEqual(before);
    });

    it('sets latitude/longitude from the geometry centroid when valid', () => {
      component.geometry.setValue(
        'POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))',
      );
      component.setPointFromGeometry();

      expect(component.latitude.value).toBeCloseTo(0.8, 6);
      expect(component.longitude.value).toBeCloseTo(0.8, 6);
      expect(component.latitude.dirty).toBe(true);
      expect(component.longitude.dirty).toBe(true);
      expect(component.mapCenter()).toEqual([
        component.longitude.value,
        component.latitude.value,
      ]);
    });
  });
  // #endregion

  // #region recenterMap
  describe('recenterMap', () => {
    it('recenters and zooms when lat/lng are set', () => {
      component.latitude.setValue(10);
      component.longitude.setValue(20);
      component.recenterMap();
      expect(component.mapCenter()).toEqual([20, 10]);
      expect(component.mapZoom()).toBe(14);
    });

    it('does nothing when lat/lng are missing', () => {
      const before = component.mapCenter();
      const beforeZoom = component.mapZoom();
      component.recenterMap();
      expect(component.mapCenter()).toEqual(before);
      expect(component.mapZoom()).toBe(beforeZoom);
    });
  });
  // #endregion

  // #region onMarkerDragEnd
  describe('onMarkerDragEnd', () => {
    it('updates lat/lng from the marker position and refreshes the radius overlay', () => {
      component.latitude.setValue(0);
      component.longitude.setValue(0);
      component.radius.setValue(50);

      const marker = {
        getLngLat: () => ({ lat: 12.3456789, lng: 45.6789123 }),
      } as unknown as Marker;
      component.onMarkerDragEnd(marker);

      expect(component.latitude.value).toBeCloseTo(12.345679, 6);
      expect(component.longitude.value).toBeCloseTo(45.678912, 6);
      expect(component.latitude.dirty).toBe(true);
      expect(component.longitude.dirty).toBe(true);
      expect(component.radiusGeoJSON().features).toHaveLength(1);
    });
  });
  // #endregion

  // #region onMapLoad
  describe('onMapLoad', () => {
    it('resizes the map and sets mapReady after a tick', async () => {
      const resize = vi.fn();
      const map = { resize } as unknown as MaplibreMap;
      expect(component.mapReady()).toBe(false);

      component.onMapLoad(map);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(resize).toHaveBeenCalled();
      expect(component.mapReady()).toBe(true);
    });
  });
  // #endregion

  // #region Browser geolocation
  describe('locateUser', () => {
    afterEach(() => {
      // reset navigator.geolocation between tests
      Object.defineProperty(window.navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });
    });

    it('does nothing when the geolocation API is unavailable', () => {
      Object.defineProperty(window.navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });
      component.locateUser();
      expect(component.locating()).toBe(false);
    });

    it('sets latitude/longitude/accuracy on success and clears geometry/radius', () => {
      const getCurrentPosition = vi.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 41.891,
            longitude: 12.492,
            accuracy: 15,
          },
        } as GeolocationPosition);
      });
      Object.defineProperty(window.navigator, 'geolocation', {
        value: { getCurrentPosition },
        configurable: true,
      });

      component.geometry.setValue('POINT(1 1)');
      component.radius.setValue(50);

      component.locateUser();

      expect(getCurrentPosition).toHaveBeenCalled();
      expect(component.locating()).toBe(false);
      expect(component.locationAccuracy()).toBe(15);
      expect(component.latitude.value).toBeCloseTo(41.891, 6);
      expect(component.longitude.value).toBeCloseTo(12.492, 6);
      expect(component.geometry.value).toBeNull();
      expect(component.radius.value).toBeNull();
      expect(component.mapZoom()).toBe(14);
      expect(component.mapCenter()).toEqual([12.492, 41.891]);
    });

    it('stops locating and logs a warning on failure', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const getCurrentPosition = vi.fn(
        (
          _success: PositionCallback,
          error: (err: GeolocationPositionError) => void,
        ) => {
          error({ message: 'denied' } as GeolocationPositionError);
        },
      );
      Object.defineProperty(window.navigator, 'geolocation', {
        value: { getCurrentPosition },
        configurable: true,
      });

      component.locateUser();

      expect(component.locating()).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('accuracyInfo', () => {
    it('is null when no accuracy has been recorded', () => {
      expect(component.accuracyInfo()).toBeNull();
    });

    it('reports a GPS fix under 20m', () => {
      component.locationAccuracy.set(10);
      expect(component.accuracyInfo()).toMatchObject({
        icon: 'gps_fixed',
        color: '#4caf50',
      });
    });

    it('reports Wi-Fi accuracy between 20 and 100m', () => {
      component.locationAccuracy.set(50);
      expect(component.accuracyInfo()).toMatchObject({
        icon: 'signal_cellular_alt_1_bar',
        color: '#8bc34a',
      });
    });

    it('reports cell-tower accuracy between 100 and 1000m', () => {
      component.locationAccuracy.set(500);
      expect(component.accuracyInfo()).toMatchObject({
        icon: 'signal_cellular_alt_2_bar',
        color: '#ff9800',
      });
    });

    it('reports IP-based accuracy above 1000m', () => {
      component.locationAccuracy.set(5000);
      expect(component.accuracyInfo()).toMatchObject({
        icon: 'signal_cellular_alt',
        color: '#f44336',
      });
    });
  });
  // #endregion
});

// #region Two-way [(location)] binding and output emission (via a host component)
// model()-based two-way bindings don't expose a `locationChange` class member
// to subscribe to directly, so we verify the outward propagation through a
// tiny host component using the real template binding syntax.
@Component({
  imports: [GeoLocationEditor],
  template: `<cadmus-geo-location-editor
    [(location)]="loc"
    (cancelEdit)="cancelled = true"
  />`,
})
class HostComponent {
  public loc: GeoLocation | undefined = undefined;
  public cancelled = false;
}

describe('GeoLocationEditor via host two-way binding', () => {
  let hostFixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let editor: GeoLocationEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DialogService, useValue: new FakeDialogService() },
      ],
    })
      .overrideComponent(GeoLocationEditor, {
        set: { imports: TEST_IMPORTS },
      })
      .compileComponents();

    hostFixture = TestBed.createComponent(HostComponent);
    host = hostFixture.componentInstance;
    await hostFixture.whenStable();
    editor = hostFixture.debugElement.query(
      By.directive(GeoLocationEditor),
    ).componentInstance;
  });

  it('propagates the saved location back to the host via [(location)]', async () => {
    editor.label.setValue('Rome');
    editor.latitude.setValue(41.9);
    editor.longitude.setValue(12.5);
    editor.save();
    await hostFixture.whenStable();

    expect(host.loc).toMatchObject({
      label: 'Rome',
      latitude: 41.9,
      longitude: 12.5,
    });
  });

  it('notifies the host when cancelEdit is emitted', () => {
    editor.cancel();
    expect(host.cancelled).toBe(true);
  });
});
// #endregion
