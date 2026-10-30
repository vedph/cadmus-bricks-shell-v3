import { Component, input, model, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, of, Subject, throwError } from 'rxjs';

import {
  PleiadesDataPage,
  PleiadesLookupEntry,
  PleiadesPlace,
  PleiadesSearchRequest,
  PleiadesSearchResult,
} from '../../models';
import { PleiadesApiService } from '../../services/pleiades-api.service';
import { PleiadesMapComponent } from '../pleiades-map/pleiades-map';
import { PleiadesQueryComponent } from './pleiades-query';

// #region Fakes
/**
 * A stand-in for the map (which needs WebGL), registered with the map's
 * token so that the query component's viewChild finds it.
 */
@Component({
  selector: 'cadmus-pleiades-map',
  template: '',
  providers: [{ provide: PleiadesMapComponent, useExisting: FakeMapComponent }],
})
class FakeMapComponent {
  readonly mapStyle = input<unknown>();
  readonly initialCenter = input<unknown>();
  readonly initialZoom = input<unknown>();
  readonly results = input<unknown>();
  readonly selectedId = model<string | undefined>();
  readonly spatialMode = input<unknown>();
  readonly point = model<unknown>();
  readonly distanceMin = input<unknown>();
  readonly distanceMax = input<unknown>();
  readonly bbox = model<unknown>();
  readonly region = model<unknown>();
  readonly drawingCount = signal(0);
  readonly finishDrawing = vi.fn();
  readonly cancelDrawing = vi.fn();
  readonly geometries = input<unknown>();
  readonly placeClick = output<PleiadesSearchResult>();
  readonly flyTo = vi.fn();
  readonly fitBounds = vi.fn();
  readonly fitResults = vi.fn();
}

function result(id: string, lat: number | null = 37): PleiadesSearchResult {
  return {
    id,
    uriPrefix: 'https://pleiades.stoa.org/places/',
    name: 'Place ' + id,
    type: null,
    types: [],
    lat,
    lng: lat === null ? null : 23,
    distance: null,
  };
}

function page(
  items: PleiadesSearchResult[],
  pageNumber = 1,
  total = items.length,
): PleiadesDataPage<PleiadesSearchResult> {
  return { pageNumber, pageSize: 20, total, pageCount: 1, items };
}

function place(id: string, patch: Partial<PleiadesPlace> = {}): PleiadesPlace {
  return {
    id,
    uri: 'https://pleiades.stoa.org/places/' + id,
    title: 'Place ' + id,
    description: null,
    details: null,
    provenance: null,
    rights: null,
    reviewState: 'published',
    created: '2024-01-01T00:00:00',
    modified: '2024-01-01T00:00:00',
    lat: 37,
    lng: 23,
    bbox: [23, 37, 23.5, 37.5],
    types: [],
    subjects: [],
    names: [],
    locations: [
      {
        id: 1,
        uri: 'x',
        title: 'loc',
        certainty: null,
        accuracy: null,
        accuracyValue: 0,
        startYear: null,
        endYear: null,
        description: null,
        geometry: { type: 'Point', coordinates: [23, 37] },
      },
    ],
    connections: [],
    incomingConnections: [],
    linkedPlaces: [],
    ...patch,
  };
}

const TYPES: PleiadesLookupEntry[] = [
  { id: 1, fullName: 'x/fort', shortName: 'fort', group: null },
  { id: 2, fullName: 'x/settlement', shortName: 'settlement', group: null },
  { id: 3, fullName: 'x/temple', shortName: 'temple', group: null },
];

class MockApi {
  search = vi.fn(
    (_r: PleiadesSearchRequest): Observable<PleiadesDataPage<PleiadesSearchResult>> =>
      of(page([result('1'), result('2', null)])),
  );
  getPlace = vi.fn((id: string): Observable<PleiadesPlace> => of(place(id)));
  getPlaceTypes = vi.fn(() => of(TYPES));
}
// #endregion

describe('PleiadesQueryComponent', () => {
  let fixture: ComponentFixture<PleiadesQueryComponent>;
  let component: PleiadesQueryComponent;
  let api: MockApi;
  let el: HTMLElement;

  async function flush() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function fakeMap(): FakeMapComponent {
    return component.map() as unknown as FakeMapComponent;
  }

  beforeEach(async () => {
    api = new MockApi();
    await TestBed.configureTestingModule({
      imports: [PleiadesQueryComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PleiadesApiService, useValue: api },
      ],
    })
      .overrideComponent(PleiadesQueryComponent, {
        remove: { imports: [PleiadesMapComponent] },
        add: { imports: [FakeMapComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PleiadesQueryComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await flush();
  });

  it('loads place types', () => {
    expect(api.getPlaceTypes).toHaveBeenCalledTimes(1);
    expect(component.placeTypes()).toEqual(TYPES);
  });

  it('uses the map stand-in', () => {
    expect(fakeMap()).toBeInstanceOf(FakeMapComponent);
  });

  it('applies the default page size and scopes', async () => {
    fixture.componentRef.setInput('pageSize', 20);
    fixture.componentRef.setInput('defaultScopes', ['plttl', 'nmrmz']);
    await flush();
    expect(component.form.pageSize().value()).toBe(20);
    expect(component.form.scopes().value()).toEqual(['plttl', 'nmrmz']);
  });

  describe('search', () => {
    it('searches with the current filters', async () => {
      component.form.text().value.set('athenae');
      component.form.placeTypes().value.set(['settlement']);
      component.form.rankMin().value.set(90);
      component.search();
      await flush();

      const request = api.search.mock.calls[0][0];
      expect(request).toEqual({
        pageNumber: 1,
        pageSize: 50,
        text: 'athenae',
        placeTypes: ['/settlement'],
        rankMin: 90,
        sort: 'title',
      });
      expect(component.request()).toEqual(request);
      expect(component.results().length).toBe(2);
      expect(component.unlocatedCount()).toBe(1);
      expect(el.querySelector('.count')!.textContent).toContain('2');
      expect(el.querySelectorAll('mat-expansion-panel').length).toBe(2);
    });

    it('shows a progress bar while loading', async () => {
      const response = new Subject<PleiadesDataPage<PleiadesSearchResult>>();
      api.search.mockReturnValue(response);
      component.search();
      await flush();
      expect(component.loading()).toBe(true);
      expect(el.querySelector('mat-progress-bar')).toBeTruthy();

      response.next(page([result('1')]));
      response.complete();
      await flush();
      expect(component.loading()).toBe(false);
      expect(el.querySelector('mat-progress-bar')).toBeNull();
    });

    it('searches on Enter in the text field', async () => {
      const input = el.querySelector('.text-field input') as HTMLInputElement;
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await flush();
      expect(api.search).toHaveBeenCalledTimes(1);
    });

    it('does not search on Enter in the place types input', async () => {
      const input = el.querySelector('.no-enter-search') as HTMLInputElement;
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await flush();
      expect(api.search).not.toHaveBeenCalled();
    });

    it('shows API errors', async () => {
      api.search.mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { errors: { Scopes: ['Invalid scope(s): foo'] } },
        })),
      );
      component.search();
      await flush();
      expect(component.loading()).toBe(false);
      expect(el.querySelector('.error')!.textContent).toContain(
        'Invalid scope(s): foo (Scopes)',
      );
    });

    it('does not search with invalid filters', async () => {
      component.form.rankMin().value.set(50);
      component.form.rankMax().value.set(10);
      await flush();
      expect(component.form().invalid()).toBe(true);
      component.search();
      expect(api.search).not.toHaveBeenCalled();
      expect(component.form.rankMax().touched()).toBe(true);
    });

    it('validates ranges, years, distances and box', async () => {
      component.form.yearMin().value.set(100);
      component.form.yearMax().value.set(-100);
      component.form.distanceMin().value.set(10);
      component.form.distanceMax().value.set(5);
      component.form.swLat().value.set(40);
      component.form.neLat().value.set(30);
      component.form.swLng().value.set(20);
      component.form.neLng().value.set(10);
      component.form.pointLat().value.set(95);
      await flush();
      expect(component.form.yearMax().invalid()).toBe(true);
      expect(component.form.distanceMax().invalid()).toBe(true);
      expect(component.form.neLat().invalid()).toBe(true);
      // W east of E is a box crossing the antimeridian
      expect(component.form.neLng().invalid()).toBe(false);
      expect(component.bboxCrossing()).toBe(true);
      expect(component.form.pointLat().invalid()).toBe(true);
    });

    it('gets other pages of the last request', async () => {
      component.form.text().value.set('roma');
      component.search();
      await flush();
      component.form.text().value.set('changed');
      component.onPage({ pageIndex: 2, pageSize: 50, length: 500 });
      await flush();
      expect(api.search.mock.calls[1][0]).toMatchObject({
        text: 'roma',
        pageNumber: 3,
        pageSize: 50,
      });

      // a new page size restarts from page 1
      component.onPage({ pageIndex: 2, pageSize: 100, length: 500 });
      await flush();
      expect(api.search.mock.calls[2][0]).toMatchObject({
        pageNumber: 1,
        pageSize: 100,
      });
      expect(component.form.pageSize().value()).toBe(100);
    });

    it('fills the filters from the request input', async () => {
      fixture.componentRef.setInput('request', {
        text: 'via',
        placeTypes: ['/fort'],
        distanceLon: 12,
        distanceLat: 41,
        distanceMax: 5000,
        sort: 'distance',
      });
      await flush();
      expect(component.form.text().value()).toBe('via');
      expect(component.form.placeTypes().value()).toEqual(['fort']);
      expect(component.form.spatialMode().value()).toBe('range');
      expect(component.form.distanceMax().value()).toBe(5);
      expect(component.form.sort().value()).toBe('distance');
      expect(api.search).not.toHaveBeenCalled();
    });

    it('searches the request input with autoSearch', async () => {
      fixture.componentRef.setInput('autoSearch', true);
      const request: PleiadesSearchRequest = { text: 'roma', pageNumber: 2 };
      fixture.componentRef.setInput('request', request);
      await flush();
      expect(api.search).toHaveBeenCalledWith(request);
    });

    it('resets filters and results', async () => {
      component.form.text().value.set('roma');
      component.search();
      await flush();
      component.reset();
      await flush();
      expect(component.form.text().value()).toBe('');
      expect(component.page()).toBeUndefined();
      expect(el.querySelector('.placeholder')).toBeTruthy();
    });

    it('counts the active filters', async () => {
      expect(component.activeFilterCount()).toBe(0);
      component.form.scopes().value.set(['plttl']);
      component.form.yearMin().value.set(-300);
      await flush();
      expect(component.activeFilterCount()).toBe(2);
    });
  });

  describe('place types', () => {
    it('adds only known types, once', () => {
      component.addPlaceType('fort');
      component.addPlaceType('fort');
      component.addPlaceType('unknown');
      expect(component.form.placeTypes().value()).toEqual(['fort']);
    });

    it('removes types', () => {
      component.addPlaceType('fort');
      component.addPlaceType('temple');
      component.removePlaceType('fort');
      expect(component.form.placeTypes().value()).toEqual(['temple']);
    });

    it('suggests the unselected types matching the input', () => {
      component.addPlaceType('settlement');
      expect(component.placeTypeSuggestions().map((t) => t.shortName)).toEqual(
        ['fort', 'temple'],
      );
      component.placeTypeFilter.set('TEM');
      expect(component.placeTypeSuggestions().map((t) => t.shortName)).toEqual(
        ['temple'],
      );
    });

    it('renders the selected types as chips', async () => {
      component.addPlaceType('fort');
      await flush();
      expect(el.querySelector('mat-chip-row')!.textContent).toContain('fort');
    });

    it('reports place types errors', async () => {
      api.getPlaceTypes.mockReturnValue(throwError(() => ({ status: 0 })));
      const f = TestBed.createComponent(PleiadesQueryComponent);
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.placeTypesError()).toContain(
        'cannot be reached',
      );
    });
  });

  describe('spatial filters', () => {
    it('sets the point from the map and allows sorting by distance', async () => {
      component.form.spatialMode().value.set('range');
      await flush();
      expect(component.canSortByDistance()).toBe(false);

      component.onMapPointChange([23.72, 37.97]);
      component.form.distanceMax().value.set(20);
      component.form.sort().value.set('distance');
      await flush();
      expect(component.mapPoint()).toEqual([23.72, 37.97]);
      expect(component.distanceMaxMeters()).toBe(20000);
      expect(fakeMap().point()).toEqual([23.72, 37.97]);
      expect(fakeMap().distanceMax()).toBe(20000);

      component.search();
      expect(api.search.mock.calls[0][0]).toMatchObject({
        distanceLon: 23.72,
        distanceLat: 37.97,
        distanceMax: 20000,
        sort: 'distance',
      });
    });

    it('falls back to title sort without a distance point', async () => {
      component.form.spatialMode().value.set('range');
      component.onMapPointChange([1, 1]);
      component.form.sort().value.set('distance');
      await flush();
      component.form.spatialMode().value.set('bbox');
      await flush();
      expect(component.form.sort().value()).toBe('title');
    });

    it('clears the point', async () => {
      component.onMapPointChange([1, 2]);
      component.clearPoint();
      expect(component.form.pointLat().value()).toBeNull();
      expect(component.form.pointLng().value()).toBeNull();
    });

    it('sets the box from the map', async () => {
      component.form.spatialMode().value.set('bbox');
      component.onMapBBoxChange({ sw: [23, 37.5], ne: [24.2, 38.5] });
      component.form.containedInBox().value.set(true);
      await flush();
      expect(fakeMap().bbox()).toEqual({ sw: [23, 37.5], ne: [24.2, 38.5] });
      component.search();
      expect(api.search.mock.calls[0][0]).toMatchObject({
        swCornerLon: 23,
        swCornerLat: 37.5,
        neCornerLon: 24.2,
        neCornerLat: 38.5,
        containedInBox: true,
      });
      component.clearBBox();
      expect(component.mapBBox()).toBeUndefined();
    });

    it('sets the region from the map', async () => {
      component.form.spatialMode().value.set('polygon');
      await flush();
      fakeMap().region.set([
        [23, 37.5],
        [24.2, 37.5],
        [23.6, 38.5],
      ]);
      component.form.containedInRegion().value.set(true);
      await flush();
      expect(component.mapRegion()!.length).toBe(3);
      component.search();
      expect(api.search.mock.calls[0][0]).toMatchObject({
        region: [
          [23, 37.5],
          [24.2, 37.5],
          [23.6, 38.5],
        ],
        containedInRegion: true,
      });
    });

    it('clears and closes regions in the map', async () => {
      component.onMapRegionChange([
        [1, 1],
        [2, 2],
        [3, 1],
      ]);
      component.finishRegion();
      expect(fakeMap().finishDrawing).toHaveBeenCalled();
      component.clearRegion();
      expect(fakeMap().cancelDrawing).toHaveBeenCalled();
      expect(component.mapRegion()).toBeUndefined();
    });

    it('shows the region toolbar', async () => {
      component.form.spatialMode().value.set('polygon');
      await flush();
      expect(el.querySelector('.map-toolbar .hint')!.textContent).toContain(
        'click the map to add vertices',
      );
      fakeMap().drawingCount.set(2);
      await flush();
      const close = el.querySelector(
        '[aria-label="close region"]',
      ) as HTMLButtonElement;
      expect(close.disabled).toBe(true);
      expect(el.querySelector('.map-toolbar .hint')!.textContent).toContain(
        '2 vertices',
      );
    });

    it('receives the point and box drawn on the map', async () => {
      component.form.spatialMode().value.set('range');
      await flush();
      fakeMap().point.set([5, 6]);
      await flush();
      expect(component.form.pointLng().value()).toBe(5);
      expect(component.form.pointLat().value()).toBe(6);
    });
  });

  describe('results', () => {
    beforeEach(async () => {
      component.search();
      await flush();
    });

    it('flies to a place', () => {
      component.flyTo(result('1'));
      expect(component.selectedId()).toBe('1');
      expect(fakeMap().flyTo).toHaveBeenCalled();
    });

    it('zooms to the results', () => {
      component.fitResults();
      expect(fakeMap().fitResults).toHaveBeenCalled();
    });

    it('shows the details of a place', async () => {
      component.showDetails('1');
      await flush();
      expect(component.selectedTab()).toBe(1);
      expect(api.getPlace).toHaveBeenCalledWith('1');
      expect(component.details()!.id).toBe('1');
      expect(component.detailGeometries().length).toBe(1);
      expect(fakeMap().fitBounds).not.toHaveBeenCalled();

      // not loaded again
      component.showDetails('1');
      expect(api.getPlace).toHaveBeenCalledTimes(1);
    });

    it('uses the place point without location geometries', async () => {
      api.getPlace.mockReturnValue(of(place('5', { locations: [] })));
      component.showDetails('5');
      await flush();
      expect(component.detailGeometries()).toEqual([
        { type: 'Point', coordinates: [23, 37] },
      ]);
    });

    it('fits the map to connected places', async () => {
      component.showDetails('7', true);
      await flush();
      expect(fakeMap().fitBounds).toHaveBeenCalledWith({
        sw: [23, 37],
        ne: [23.5, 37.5],
      });
    });

    it('shows details errors', async () => {
      api.getPlace.mockReturnValue(throwError(() => ({ status: 404 })));
      component.showDetails('404');
      await flush();
      expect(component.detailsError()).toBe('Not found');
      expect(component.details()).toBeUndefined();
    });

    it('shows the details of the place clicked in the map when in the details tab', async () => {
      component.onMapPlaceClick(result('1'));
      expect(api.getPlace).not.toHaveBeenCalled();
      component.selectedTab.set(1);
      component.onMapPlaceClick(result('2'));
      await flush();
      expect(api.getPlace).toHaveBeenCalledWith('2');
    });

    it('emits picked places', async () => {
      const spy = vi.fn();
      component.placePick.subscribe(spy);
      (el.querySelector('[aria-label="pick"]') as HTMLElement).click();
      expect(spy).toHaveBeenCalledWith(result('1'));
    });

    it('hides pick buttons on request', async () => {
      fixture.componentRef.setInput('hidePick', true);
      await flush();
      expect(el.querySelector('[aria-label="pick"]')).toBeNull();
    });

    it('keeps the selection only if still in the results', async () => {
      component.selectedId.set('1');
      api.search.mockReturnValue(of(page([result('3')])));
      component.search();
      await flush();
      expect(component.selectedId()).toBeUndefined();
    });
  });
});
