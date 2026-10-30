import { Component, input, model, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PleiadesSearchResult } from '../../models';
import { PleiadesApiService } from '../../services/pleiades-api.service';
import {
  PLEIADES_FILTERS_STORAGE_KEY,
  PleiadesFiltersStore,
} from '../../services/pleiades-filters-store';
import { PleiadesRefLookupOptions } from '../../services/pleiades-ref-lookup.service';
import { PleiadesMapComponent } from '../pleiades-map/pleiades-map';
import { PleiadesQueryComponent } from '../pleiades-query/pleiades-query';
import {
  PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG,
  PleiadesLookupOptionsComponent,
  PleiadesLookupOptionsData,
} from './pleiades-lookup-options';

/**
 * A stand-in for the map (which needs WebGL).
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
  readonly geometries = input<unknown>();
  readonly placeClick = output<PleiadesSearchResult>();
}

const STORAGE_KEY = 'test.pleiades.options.filters';

describe('PleiadesLookupOptionsComponent', () => {
  let fixture: ComponentFixture<PleiadesLookupOptionsComponent>;
  let component: PleiadesLookupOptionsComponent;
  let dialogRef: { close: ReturnType<typeof vi.fn> };
  let el: HTMLElement;

  async function setup(
    data?: PleiadesLookupOptionsData,
    saved?: PleiadesRefLookupOptions,
  ): Promise<void> {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PleiadesLookupOptionsComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: PleiadesApiService,
          useValue: {
            search: vi.fn(() =>
              of({ pageNumber: 1, pageSize: 20, total: 0, pageCount: 0, items: [] }),
            ),
            getPlace: vi.fn(),
            getPlaceTypes: vi.fn(() => of([])),
          },
        },
        { provide: PLEIADES_FILTERS_STORAGE_KEY, useValue: STORAGE_KEY },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    })
      .overrideComponent(PleiadesQueryComponent, {
        remove: { imports: [PleiadesMapComponent] },
        add: { imports: [FakeMapComponent] },
      })
      .compileComponents();

    if (saved) {
      TestBed.inject(PleiadesFiltersStore).save(saved);
    }
    fixture = TestBed.createComponent(PleiadesLookupOptionsComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function query(): PleiadesQueryComponent {
    return component.query()!;
  }

  function button(text: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll<HTMLButtonElement>('.actions button')).find(
      (b) => b.textContent!.includes(text),
    )!;
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('has a dialog config filling most of the viewport', () => {
    expect(PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG.height).toBeTruthy();
    expect(PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG.title).toBeTruthy();
  });

  it('hosts the query without text and pick, with the save button', async () => {
    await setup();
    expect(query().hideText()).toBe(true);
    expect(query().hidePick()).toBe(true);
    expect(query().canSaveFilters()).toBe(true);
    expect(el.querySelector('.text-field')).toBeNull();
    expect(el.querySelector('.save-filters')).toBeTruthy();
  });

  it('defaults to the toponym scopes of the lookup', async () => {
    await setup();
    expect(query().form.scopes().value()).toEqual(['plttl', 'nmrmz', 'nmatt']);
  });

  it('fills the filters from the options', async () => {
    await setup({
      options: { scopes: [], placeTypes: ['/fort'], yearMin: -300, noTypeAhead: true },
    });
    expect(query().form.scopes().value()).toEqual([]);
    expect(query().form.placeTypes().value()).toEqual(['fort']);
    expect(query().form.yearMin().value()).toBe(-300);
  });

  it('fills the filters from the saved ones without options', async () => {
    await setup(undefined, {
      scopes: ['plttl'],
      swCornerLon: 170,
      swCornerLat: 10,
      neCornerLon: -170,
      neCornerLat: 20,
    });
    expect(query().form.scopes().value()).toEqual(['plttl']);
    expect(query().form.spatialMode().value()).toBe('bbox');
    expect(query().form.swLng().value()).toBe(170);
    expect(query().filtersSaved()).toBe(true);
  });

  it('prefers the options to the saved filters', async () => {
    await setup({ options: { rankMin: 50 } }, { rankMin: 90 });
    expect(query().form.rankMin().value()).toBe(50);
  });

  it('applies the filters keeping the non-filter options', async () => {
    await setup({ options: { rankMin: 50, noTypeAhead: true, matchAny: true } });
    query().form.rankMin().value.set(null);
    query().form.spatialMode().value.set('polygon');
    query().form.region().value.set([
      [20, 35],
      [25, 35],
      [22, 40],
    ]);
    fixture.detectChanges();

    button('apply').click();

    expect(dialogRef.close).toHaveBeenCalledWith({
      scopes: ['plttl', 'nmrmz', 'nmatt'],
      region: [
        [20, 35],
        [25, 35],
        [22, 40],
      ],
      sort: 'title',
      noTypeAhead: true,
      matchAny: true,
    });
  });

  it('does not apply invalid filters', async () => {
    await setup();
    query().form.yearMin().value.set(100);
    query().form.yearMax().value.set(-100);
    fixture.detectChanges();
    expect(button('apply').disabled).toBe(true);
    component.apply();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('closes with the original options on cancel', async () => {
    const options = { rankMin: 50 };
    await setup({ options });
    query().form.rankMin().value.set(80);
    button('cancel').click();
    expect(dialogRef.close).toHaveBeenCalledWith(options);
  });

  it('closes with undefined on cancel without options', async () => {
    await setup();
    button('cancel').click();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
