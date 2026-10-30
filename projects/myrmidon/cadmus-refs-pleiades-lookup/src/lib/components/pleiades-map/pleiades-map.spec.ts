import { Component, Directive, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Map as MaplibreMap, Marker } from 'maplibre-gl';

import { PleiadesSearchResult } from '../../models';
import { PleiadesMapComponent } from './pleiades-map';

// keep tests off the network: the style fetch fails, so that the map falls
// back to the plain style URL
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('no network in tests'))),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// #region MapLibre stand-ins
// The real ngx-maplibre-gl components need WebGL, which jsdom lacks: these
// expose the same selectors, inputs and outputs used by the template.
@Component({ selector: 'mgl-map', template: '<ng-content />' })
class FakeMapComponent {
  readonly mapStyle = input<unknown>();
  readonly center = input<unknown>();
  readonly zoom = input<unknown>();
  readonly boxZoom = input<unknown>();
  readonly doubleClickZoom = input<unknown>();
  readonly cursorStyle = input<unknown>();
  readonly mapLoad = output<unknown>();
  readonly mapClick = output<unknown>();
}

@Component({ selector: 'mgl-marker', template: '<ng-content />' })
class FakeMarkerComponent {
  readonly lngLat = input<unknown>();
  readonly draggable = input<unknown>();
  readonly anchor = input<unknown>();
  readonly markerDrag = output<unknown>();
  readonly markerDragEnd = output<unknown>();
}

@Component({ selector: 'mgl-popup', template: '<ng-content />' })
class FakePopupComponent {
  readonly lngLat = input<unknown>();
  readonly closeButton = input<unknown>();
  readonly closeOnClick = input<unknown>();
  readonly offset = input<unknown>();
  readonly anchor = input<unknown>();
  readonly className = input<unknown>();
}

@Component({ selector: 'mgl-control', template: '<ng-content />' })
class FakeControlComponent {
  readonly position = input<unknown>();
}

@Directive({ selector: '[mglNavigation]' })
class FakeNavigationDirective {}

@Directive({ selector: '[mglScale]' })
class FakeScaleDirective {
  readonly unit = input<unknown>();
}

@Component({ selector: 'mgl-geojson-source', template: '' })
class FakeGeoJSONSourceComponent {
  readonly id = input<unknown>();
  readonly data = input<unknown>();
}

@Component({ selector: 'mgl-layer', template: '' })
class FakeLayerComponent {
  readonly id = input<unknown>();
  readonly type = input<unknown>();
  readonly source = input<unknown>();
  readonly filter = input<unknown>();
  readonly paint = input<unknown>();
  readonly layout = input<unknown>();
}
// #endregion

function createMapMock() {
  return {
    on: vi.fn(),
    resize: vi.fn(),
    dragPan: { enable: vi.fn(), disable: vi.fn() },
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    getZoom: vi.fn(() => 5),
    // 1 degree = 100 pixels
    project: vi.fn((ll: [number, number]) => ({
      x: ll[0] * 100,
      y: -ll[1] * 100,
    })),
  };
}

function result(
  id: string,
  lat: number | null,
  lng: number | null,
): PleiadesSearchResult {
  return {
    id,
    uriPrefix: 'https://pleiades.stoa.org/places/',
    name: 'Place ' + id,
    type: 'https://pleiades.stoa.org/vocabularies/place-types/settlement',
    types: [
      'https://pleiades.stoa.org/vocabularies/place-types/settlement',
      'https://pleiades.stoa.org/vocabularies/place-types/port',
    ],
    lat,
    lng,
    distance: null,
  };
}

function ev(lng: number, lat: number, shiftKey = false) {
  return {
    lngLat: { lng, lat },
    originalEvent: { shiftKey } as unknown as Event,
    preventDefault: vi.fn(),
  };
}

describe('PleiadesMapComponent', () => {
  let fixture: ComponentFixture<PleiadesMapComponent>;
  let component: PleiadesMapComponent;

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function loadMap() {
    const map = createMapMock();
    component.onMapLoad(map as unknown as MaplibreMap);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flush();
    return map;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PleiadesMapComponent],
    })
      .overrideComponent(PleiadesMapComponent, {
        set: {
          imports: [
            FakeMapComponent,
            FakeMarkerComponent,
            FakePopupComponent,
            FakeControlComponent,
            FakeNavigationDirective,
            FakeScaleDirective,
            FakeGeoJSONSourceComponent,
            FakeLayerComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PleiadesMapComponent);
    component = fixture.componentInstance;
    await flush();
  });

  it('renders the map with the style URL when it cannot be loaded', async () => {
    // the style resource settles asynchronously
    await flush();
    const map = fixture.nativeElement.querySelector('mgl-map');
    expect(map).toBeTruthy();
    expect(component.resolvedMapStyle.value()).toBe(
      'https://tiles.openfreemap.org/styles/liberty',
    );
  });

  it('registers pointer handlers and gets ready on load', async () => {
    const map = await loadMap();
    const events = map.on.mock.calls.map((c) => c[0]);
    expect(events).toEqual(
      expect.arrayContaining([
        'mousedown',
        'mousemove',
        'mouseup',
        'touchstart',
        'touchmove',
        'touchend',
      ]),
    );
    expect(map.resize).toHaveBeenCalled();
    expect(component.mapReady()).toBe(true);
  });

  it('resolves overlay colors', () => {
    const colors = component.colors();
    expect(colors.range).toBeTruthy();
    expect(colors.bbox).toBeTruthy();
  });

  describe('results', () => {
    it('renders pins only for located results', async () => {
      fixture.componentRef.setInput('results', [
        result('1', 37, 23),
        result('2', null, null),
        result('3', 41, 12),
      ]);
      await flush();
      expect(component.locatedResults().map((r) => r.id)).toEqual(['1', '3']);
      expect(fixture.nativeElement.querySelectorAll('.pin').length).toBe(2);
    });

    it('selects a place and emits on pin click', async () => {
      const r = result('1', 37, 23);
      fixture.componentRef.setInput('results', [r]);
      await flush();
      const spy = vi.fn();
      component.placeClick.subscribe(spy);
      (fixture.nativeElement.querySelector('.pin') as HTMLElement).click();
      await flush();
      expect(component.selectedId()).toBe('1');
      expect(spy).toHaveBeenCalledWith(r);
      expect(
        fixture.nativeElement.querySelector('.pin.selected'),
      ).toBeTruthy();
    });

    it('shows the hovered place in the popup, else the selected one', async () => {
      const r1 = result('1', 37, 23);
      const r2 = result('2', 38, 24);
      fixture.componentRef.setInput('results', [r1, r2]);
      component.selectedId.set('1');
      await loadMap();
      expect(component.popupPlace()).toBe(r1);
      expect(
        fixture.nativeElement.querySelector('.popup-types').textContent,
      ).toContain('settlement, port');
      component.hovered.set(r2);
      await flush();
      expect(component.popupPlace()).toBe(r2);
    });

    it('fits the map to multiple results', async () => {
      const map = await loadMap();
      fixture.componentRef.setInput('results', [
        result('1', 37, 23),
        result('2', 41, 12),
      ]);
      await flush();
      expect(map.fitBounds).toHaveBeenCalledWith(
        [
          [12, 37],
          [23, 41],
        ],
        expect.objectContaining({ maxZoom: 12 }),
      );
    });

    it('flies to a single result', async () => {
      const map = await loadMap();
      fixture.componentRef.setInput('results', [result('1', 37, 23)]);
      await flush();
      expect(map.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [23, 37] }),
      );
    });

    it('does not fit when autoFit is false', async () => {
      fixture.componentRef.setInput('autoFit', false);
      const map = await loadMap();
      fixture.componentRef.setInput('results', [
        result('1', 37, 23),
        result('2', 41, 12),
      ]);
      await flush();
      expect(map.fitBounds).not.toHaveBeenCalled();
    });

    it('flyTo selects the place and ignores unlocated places', async () => {
      const map = await loadMap();
      component.flyTo(result('9', null, null));
      expect(map.flyTo).not.toHaveBeenCalled();
      component.flyTo(result('9', 40, 20));
      expect(component.selectedId()).toBe('9');
      expect(map.flyTo).toHaveBeenCalledWith({ center: [20, 40], zoom: 12 });
    });
  });

  describe('range mode', () => {
    it('sets the point on click only in range mode', async () => {
      component.onMapClick(ev(10, 20));
      expect(component.point()).toBeUndefined();

      fixture.componentRef.setInput('spatialMode', 'range');
      await flush();
      component.onMapClick(ev(370.1234567, 20.1234567));
      expect(component.point()![0]).toBeCloseTo(10.123457, 6);
      expect(component.point()![1]).toBe(20.123457);
    });

    it('builds the range overlays', async () => {
      fixture.componentRef.setInput('spatialMode', 'range');
      fixture.componentRef.setInput('point', [23.72, 37.97]);
      await flush();
      expect(component.rangeInGeoJSON().features.length).toBe(0);
      expect(component.rangeOutGeoJSON().features.length).toBe(0);

      fixture.componentRef.setInput('distanceMax', 20000);
      await flush();
      const ring = component.rangeInGeoJSON().features[0].geometry as GeoJSON.Polygon;
      expect(ring.coordinates.length).toBe(1);

      fixture.componentRef.setInput('distanceMin', 5000);
      await flush();
      const ring2 = component.rangeInGeoJSON().features[0]
        .geometry as GeoJSON.Polygon;
      expect(ring2.coordinates.length).toBe(2);
      expect(component.rangeOutGeoJSON().features.length).toBe(1);
    });

    it('hides the range in other modes', async () => {
      fixture.componentRef.setInput('point', [23.72, 37.97]);
      fixture.componentRef.setInput('distanceMax', 20000);
      await flush();
      expect(component.displayedPoint()).toBeUndefined();
      expect(component.rangeInGeoJSON().features.length).toBe(0);
    });

    it('moves the point while dragging and commits on drag end', async () => {
      fixture.componentRef.setInput('spatialMode', 'range');
      fixture.componentRef.setInput('point', [1, 1]);
      await flush();
      const marker = {
        getLngLat: () => ({ lng: 2.5, lat: 3.5 }),
      } as unknown as Marker;
      component.onPointDrag(marker);
      expect(component.displayedPoint()).toEqual([2.5, 3.5]);
      expect(component.point()).toEqual([1, 1]);
      component.onPointDragEnd(marker);
      expect(component.point()).toEqual([2.5, 3.5]);
    });
  });

  describe('bbox mode', () => {
    let map: ReturnType<typeof createMapMock>;

    beforeEach(async () => {
      fixture.componentRef.setInput('spatialMode', 'bbox');
      map = await loadMap();
    });

    it('draws a box by dragging', () => {
      const down = ev(12, 13);
      component.onPointerDown(down);
      expect(down.preventDefault).toHaveBeenCalled();
      expect(map.dragPan.disable).toHaveBeenCalled();

      component.onPointerMove(ev(10, 10));
      expect(component.displayedBBox()).toEqual({ sw: [10, 10], ne: [12, 13] });
      expect(component.bbox()).toBeUndefined();

      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [10, 10], ne: [12, 13] });
      expect(map.dragPan.enable).toHaveBeenCalled();
      expect(component.bboxGeoJSON().features.length).toBe(1);
    });

    it('does not draw a box on a simple click', () => {
      component.onPointerDown(ev(12, 13));
      component.onPointerUp();
      expect(component.bbox()).toBeUndefined();
    });

    it('moves the box when dragging inside it', async () => {
      fixture.componentRef.setInput('bbox', { sw: [10, 10], ne: [12, 13] });
      await flush();
      component.onPointerDown(ev(11, 11));
      component.onPointerMove(ev(12, 12));
      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [11, 11], ne: [13, 14] });
    });

    it('lets the map pan when dragging outside the box', async () => {
      fixture.componentRef.setInput('bbox', { sw: [10, 10], ne: [12, 13] });
      await flush();
      const down = ev(20, 20);
      component.onPointerDown(down);
      expect(down.preventDefault).not.toHaveBeenCalled();
      expect(map.dragPan.disable).not.toHaveBeenCalled();
      component.onPointerMove(ev(21, 21));
      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [10, 10], ne: [12, 13] });
    });

    it('draws a new box with shift+drag', async () => {
      fixture.componentRef.setInput('bbox', { sw: [10, 10], ne: [12, 13] });
      await flush();
      component.onPointerDown(ev(11, 11, true));
      component.onPointerMove(ev(30, 30));
      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [11, 11], ne: [30, 30] });
    });

    it('cancels the drag when the mode changes', async () => {
      component.onPointerDown(ev(1, 1));
      component.onPointerMove(ev(2, 2));
      fixture.componentRef.setInput('spatialMode', 'none');
      await flush();
      component.onPointerUp();
      expect(component.bbox()).toBeUndefined();
      expect(component.displayedBBox()).toBeUndefined();
    });

    it('ignores pointer events in other modes', async () => {
      fixture.componentRef.setInput('spatialMode', 'range');
      await flush();
      component.onPointerDown(ev(1, 1));
      component.onPointerMove(ev(2, 2));
      component.onPointerUp();
      expect(component.bbox()).toBeUndefined();
    });
  });

  describe('bbox mode across the antimeridian', () => {
    it('draws and moves a box across the antimeridian', async () => {
      fixture.componentRef.setInput('spatialMode', 'bbox');
      await loadMap();
      // map longitudes are continuous east of 180
      component.onPointerDown(ev(170, 10));
      component.onPointerMove(ev(190, 20));
      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [170, 10], ne: [-170, 20] });
      const ring = (
        component.bboxGeoJSON().features[0].geometry as GeoJSON.Polygon
      ).coordinates[0];
      expect(ring[1]).toEqual([190, 10]);

      // drag inside it, on its western side
      component.onPointerDown(ev(-175, 15));
      component.onPointerMove(ev(-165, 15));
      component.onPointerUp();
      expect(component.bbox()).toEqual({ sw: [-180, 10], ne: [-160, 20] });
    });
  });

  describe('polygon mode', () => {
    let map: ReturnType<typeof createMapMock>;

    beforeEach(async () => {
      fixture.componentRef.setInput('spatialMode', 'polygon');
      map = await loadMap();
    });

    function draw(vertices: [number, number][]) {
      for (const [lng, lat] of vertices) {
        component.onMapClick(ev(lng, lat));
      }
    }

    it('draws a region by clicking and closes it on the first vertex', async () => {
      draw([
        [10, 10],
        [12, 10],
      ]);
      expect(component.drawingCount()).toBe(2);
      component.onPointerMove(ev(11, 12));
      await flush();
      // preview polygon with the pointer, plus 2 vertices
      expect(component.drawingGeoJSON().features.length).toBe(3);

      draw([
        [11, 12],
        [10.01, 10.01],
      ]);
      expect(component.drawingCount()).toBe(0);
      expect(component.region()).toEqual([
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      expect(component.regionGeoJSON().features.length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.vertex').length).toBe(3);
    });

    it('closes the region on double click, ignoring duplicate clicks', () => {
      draw([
        [10, 10],
        [12, 10],
        [11, 12],
        [11, 12],
      ]);
      const dbl = ev(11, 12);
      component.onMapDblClick(dbl);
      expect(dbl.preventDefault).toHaveBeenCalled();
      expect(component.region()!.length).toBe(3);
    });

    it('does not close a region with less than 3 vertices', () => {
      draw([
        [10, 10],
        [12, 10],
      ]);
      expect(component.finishDrawing()).toBe(false);
      expect(component.region()).toBeUndefined();
      expect(component.drawingCount()).toBe(2);
    });

    it('ignores clicks on a closed region unless shift is pressed', async () => {
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      component.onMapClick(ev(20, 20));
      expect(component.drawingCount()).toBe(0);
      component.onMapClick(ev(20, 20, true));
      expect(component.drawingCount()).toBe(1);
      expect(component.regionHandles().length).toBe(0);
      component.cancelDrawing();
      expect(component.drawingCount()).toBe(0);
    });

    it('moves the region when dragging inside it', async () => {
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      component.onPointerDown(ev(11, 10.5));
      expect(map.dragPan.disable).toHaveBeenCalled();
      component.onPointerMove(ev(12, 11.5));
      expect(component.displayedRegion()![0]).toEqual([11, 11]);
      expect(component.region()![0]).toEqual([10, 10]);
      component.onPointerUp();
      expect(component.region()).toEqual([
        [11, 11],
        [13, 11],
        [12, 13],
      ]);
    });

    it('lets the map pan when dragging outside the region', async () => {
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      component.onPointerDown(ev(30, 30));
      expect(map.dragPan.disable).not.toHaveBeenCalled();
    });

    it('lets markers handle pointer events on them', async () => {
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      // a vertex handle is inside the region, but drags only itself
      const marker = document.createElement('div');
      marker.className = 'maplibregl-marker';
      const handle = document.createElement('div');
      marker.appendChild(handle);
      component.onPointerDown({
        lngLat: { lng: 11, lat: 10.5 },
        originalEvent: { target: handle, shiftKey: false } as unknown as Event,
        preventDefault: vi.fn(),
      });
      expect(map.dragPan.disable).not.toHaveBeenCalled();
      component.onPointerMove(ev(12, 11.5));
      component.onPointerUp();
      expect(component.region()![0]).toEqual([10, 10]);
    });

    it('reshapes the region by dragging a vertex', async () => {
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      const marker = {
        getLngLat: () => ({ lng: 11, lat: 14 }),
      } as unknown as Marker;
      component.onVertexDrag(2, marker);
      expect(component.displayedRegion()![2]).toEqual([11, 14]);
      component.onVertexDragEnd(2, marker);
      expect(component.region()![2]).toEqual([11, 14]);
    });

    it('cancels drawing when the mode changes', async () => {
      draw([[10, 10]]);
      fixture.componentRef.setInput('spatialMode', 'bbox');
      await flush();
      expect(component.drawingCount()).toBe(0);
    });

    it('sets the cursor', async () => {
      expect(component.cursor()).toBe('crosshair');
      fixture.componentRef.setInput('region', [
        [10, 10],
        [12, 10],
        [11, 12],
      ]);
      await flush();
      expect(component.cursor()).toBe('');
    });
  });

  it('builds the geometries overlay', async () => {
    fixture.componentRef.setInput('geometries', [
      { type: 'Point', coordinates: [1, 2] },
      {
        type: 'LineString',
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    ]);
    await flush();
    expect(component.geometriesGeoJSON().features.length).toBe(2);
  });

  it('sets the cursor according to the mode', async () => {
    expect(component.cursor()).toBe('');
    fixture.componentRef.setInput('spatialMode', 'range');
    await flush();
    expect(component.cursor()).toBe('crosshair');
    fixture.componentRef.setInput('spatialMode', 'bbox');
    await flush();
    expect(component.cursor()).toBe('crosshair');
    fixture.componentRef.setInput('bbox', { sw: [1, 1], ne: [2, 2] });
    await flush();
    expect(component.cursor()).toBe('');
  });
});
