import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  form,
  FormField,
  max,
  min,
  validate,
} from '@angular/forms/signals';
import { catchError, map, of, Subject, switchMap, tap } from 'rxjs';
import type { Geometry } from 'geojson';

import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  PLEIADES_SEARCH_SCOPES,
  PleiadesBBox,
  PleiadesDataPage,
  PleiadesLngLat,
  PleiadesLookupEntry,
  PleiadesPlace,
  PleiadesSearchRequest,
  PleiadesSearchResult,
  PleiadesSearchScope,
} from '../../models';
import { PleiadesApiService } from '../../services/pleiades-api.service';
import { crossesAntimeridian } from '../../services/pleiades-geo';
import { getPleiadesErrorMessage } from '../../services/pleiades-helpers';
import {
  PLEIADES_DEFAULT_MAP_STYLE,
  PleiadesMapComponent,
} from '../pleiades-map/pleiades-map';
import { PleiadesPlaceDetailsComponent } from '../pleiades-place-details/pleiades-place-details';
import { PleiadesResultListComponent } from '../pleiades-result-list/pleiades-result-list';
import {
  createPleiadesQueryControls,
  getQueryBBox,
  getQueryPoint,
  getQueryRegion,
  isInvertedRange,
  pleiadesQueryToRequest,
  pleiadesRequestToQuery,
  PleiadesQueryControls,
} from './pleiades-query-form';

/**
 * The index of the list tab.
 */
const LIST_TAB = 0;
/**
 * The index of the details tab.
 */
const DETAILS_TAB = 1;

/**
 * The maximum count of place types suggested while typing.
 */
const MAX_TYPE_SUGGESTIONS = 50;

/**
 * Pleiades query component. This provides a full search UI for the
 * Pleiades API, with text and metadata filters, spatial filters drawn on
 * a map, and results shown both in the map and in a list, with the details
 * of each place. The component fills the space of its container.
 */
@Component({
  selector: 'cadmus-pleiades-query',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatBadgeModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    PleiadesMapComponent,
    PleiadesPlaceDetailsComponent,
    PleiadesResultListComponent,
  ],
  templateUrl: './pleiades-query.html',
  styleUrl: './pleiades-query.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesQueryComponent {
  private readonly _api = inject(PleiadesApiService);
  private readonly _search$ = new Subject<PleiadesSearchRequest>();
  private readonly _details$ = new Subject<string>();
  // the last request executed by this component
  private _lastRequest?: PleiadesSearchRequest;
  // true to fit the map to the details of the next loaded place
  private _fitDetails = false;

  public readonly map = viewChild(PleiadesMapComponent);

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
   * True to hide the buttons to pick a place.
   */
  public readonly hidePick = input<boolean>(false);

  /**
   * The default page size (1-100).
   */
  public readonly pageSize = input<number>(50);

  /**
   * The default search scopes (empty for all).
   */
  public readonly defaultScopes = input<PleiadesSearchScope[]>([]);

  /**
   * True to start the search when the request is set by the consumer.
   */
  public readonly autoSearch = input<boolean>(false);

  /**
   * The search request. Set it to fill the filters (and search, when
   * autoSearch is true); it is updated at each search.
   */
  public readonly request = model<PleiadesSearchRequest | undefined>();

  /**
   * Emitted when the user picks a place.
   */
  public readonly placePick = output<PleiadesSearchResult>();
  // #endregion

  // #region Form
  private readonly _draft = signal<PleiadesQueryControls>(
    createPleiadesQueryControls(),
  );
  public readonly form: FieldTree<PleiadesQueryControls>;

  public readonly scopes = PLEIADES_SEARCH_SCOPES;
  public readonly pageSizes = [10, 20, 50, 100];
  // #endregion

  // #region State
  public readonly filtersExpanded = signal(true);
  public readonly loading = signal(false);
  public readonly error = signal<string | undefined>(undefined);
  public readonly page = signal<
    PleiadesDataPage<PleiadesSearchResult> | undefined
  >(undefined);
  public readonly results = computed(() => this.page()?.items ?? []);
  public readonly unlocatedCount = computed(
    () =>
      this.results().filter((r) => r.lat === null || r.lng === null).length,
  );
  public readonly selectedId = signal<string | undefined>(undefined);
  public readonly selectedTab = signal(LIST_TAB);

  public readonly details = signal<PleiadesPlace | undefined>(undefined);
  public readonly detailsLoading = signal(false);
  public readonly detailsError = signal<string | undefined>(undefined);

  public readonly placeTypes = signal<PleiadesLookupEntry[]>([]);
  public readonly placeTypesError = signal<string | undefined>(undefined);
  public readonly placeTypeFilter = signal('');
  // #endregion

  // #region Computed
  /**
   * The place types matching the text typed in the place types input,
   * excluding those already selected.
   */
  public readonly placeTypeSuggestions = computed(() => {
    const filter = this.placeTypeFilter().trim().toLowerCase();
    const selected = new Set(this.form.placeTypes().value());
    return this.placeTypes()
      .filter(
        (t) =>
          !selected.has(t.shortName!) &&
          (!filter || t.shortName!.toLowerCase().includes(filter)),
      )
      .slice(0, MAX_TYPE_SUGGESTIONS);
  });

  /**
   * The count of the active non-text filters, shown in the filters badge.
   */
  public readonly activeFilterCount = computed(() => {
    const d = this._draft();
    return [
      d.scopes.length > 0,
      d.placeTypes.length > 0,
      !!d.rankMin || !!d.rankMax,
      !!d.yearMin || !!d.yearMax,
      d.sort !== 'title',
    ].filter((b) => b).length;
  });

  public readonly mapPoint = computed(() => getQueryPoint(this._draft()));
  public readonly mapBBox = computed(() => getQueryBBox(this._draft()));
  public readonly mapRegion = computed(() => getQueryRegion(this._draft()));

  /**
   * True if the bounding box crosses the antimeridian.
   */
  public readonly bboxCrossing = computed(() => {
    const bbox = this.mapBBox();
    return !!bbox && crossesAntimeridian(bbox);
  });
  public readonly distanceMinMeters = computed(() =>
    Math.round((this._draft().distanceMin || 0) * 1000),
  );
  public readonly distanceMaxMeters = computed(() =>
    Math.round((this._draft().distanceMax || 0) * 1000),
  );

  public readonly canSortByDistance = computed(
    () => this._draft().spatialMode === 'range' && !!this.mapPoint(),
  );

  /**
   * The geometries of the place shown in the details, highlighted in
   * the map.
   */
  public readonly detailGeometries = computed<Geometry[]>(() => {
    const place = this.details();
    if (!place) {
      return [];
    }
    const geometries = place.locations
      .map((l) => l.geometry)
      .filter((g): g is Geometry => !!g);
    if (!geometries.length && place.lat !== null && place.lng !== null) {
      geometries.push({ type: 'Point', coordinates: [place.lng, place.lat] });
    }
    return geometries;
  });
  // #endregion

  constructor() {
    this.form = form(this._draft, (path) => {
      min(path.rankMin, 0);
      max(path.rankMin, 100);
      min(path.rankMax, 0);
      max(path.rankMax, 100);
      validate(path.rankMax, (ctx) =>
        isInvertedRange(ctx.valueOf(path.rankMin), ctx.value())
          ? { kind: 'range', message: 'max < min' }
          : null,
      );
      validate(path.yearMax, (ctx) =>
        isInvertedRange(ctx.valueOf(path.yearMin), ctx.value())
          ? { kind: 'range', message: 'max < min' }
          : null,
      );
      min(path.pointLat, -90);
      max(path.pointLat, 90);
      min(path.pointLng, -180);
      max(path.pointLng, 180);
      min(path.distanceMin, 0);
      min(path.distanceMax, 0);
      validate(path.distanceMax, (ctx) =>
        isInvertedRange(ctx.valueOf(path.distanceMin), ctx.value())
          ? { kind: 'range', message: 'max < min' }
          : null,
      );
      min(path.swLat, -90);
      max(path.swLat, 90);
      min(path.neLat, -90);
      max(path.neLat, 90);
      min(path.swLng, -180);
      max(path.swLng, 180);
      min(path.neLng, -180);
      max(path.neLng, 180);
      validate(path.neLat, (ctx) => {
        const s = ctx.valueOf(path.swLat);
        const n = ctx.value();
        return s !== null && n !== null && s > n
          ? { kind: 'range', message: 'N < S' }
          : null;
      });
      // no check for W east of E, as the box can cross the antimeridian
    });

    // searches: a new search cancels the pending one
    this._search$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(undefined);
        }),
        switchMap((request) =>
          this._api.search(request).pipe(
            map((page) => ({ page, error: undefined })),
            catchError((error) =>
              of({ page: undefined, error: getPleiadesErrorMessage(error) }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ page, error }) => {
        this.loading.set(false);
        this.error.set(error);
        if (page) {
          this.page.set(page);
          if (!page.items.some((r) => r.id === this.selectedId())) {
            this.selectedId.set(undefined);
          }
        }
      });

    // details: a new request cancels the pending one
    this._details$
      .pipe(
        tap(() => {
          this.detailsLoading.set(true);
          this.detailsError.set(undefined);
        }),
        switchMap((id) =>
          this._api.getPlace(id).pipe(
            map((place) => ({ place, error: undefined })),
            catchError((error) =>
              of({ place: undefined, error: getPleiadesErrorMessage(error) }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ place, error }) => {
        this.detailsLoading.set(false);
        this.detailsError.set(error);
        this.details.set(place);
        if (place && this._fitDetails) {
          this.locatePlace(place);
        }
        this._fitDetails = false;
      });

    // load the place types once
    this._api
      .getPlaceTypes()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (types) => this.placeTypes.set(types),
        error: (error) =>
          this.placeTypesError.set(getPleiadesErrorMessage(error)),
      });

    // apply the default page size and scopes
    effect(() => {
      const pageSize = this.pageSize();
      const scopes = this.defaultScopes();
      untracked(() =>
        this._draft.update((d) => ({
          ...d,
          pageSize: Math.min(100, Math.max(1, pageSize)),
          scopes: [...scopes],
        })),
      );
    });

    // fill the filters from a request set by the consumer
    effect(() => {
      const request = this.request();
      untracked(() => {
        if (!request || request === this._lastRequest) {
          return;
        }
        this._draft.set(pleiadesRequestToQuery(request, this.getDefaults()));
        if (this.autoSearch()) {
          this.execute(request);
        }
      });
    });

    // sorting by distance requires a distance point
    effect(() => {
      if (!this.canSortByDistance() && this.form.sort().value() === 'distance') {
        this.form.sort().value.set('title');
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this._search$.complete();
      this._details$.complete();
    });
  }

  private getDefaults(): PleiadesQueryControls {
    return createPleiadesQueryControls(
      Math.min(100, Math.max(1, this.pageSize())),
      this.defaultScopes(),
    );
  }

  // #region Search
  private execute(request: PleiadesSearchRequest): void {
    this._lastRequest = request;
    this.request.set(request);
    this._search$.next(request);
  }

  /**
   * Search using the current filters.
   * @param pageNumber The page number (default 1).
   */
  public search(pageNumber = 1): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.execute(pleiadesQueryToRequest(this._draft(), pageNumber));
  }

  /**
   * Handle the Enter key in the filters, searching unless it comes from
   * an input which handles Enter by itself.
   * @param event The event.
   */
  public onFiltersEnter(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.no-enter-search, mat-select, button')) {
      return;
    }
    event.preventDefault();
    this.search();
  }

  /**
   * Handle a paginator change, getting the requested page for the last
   * executed request.
   * @param event The event.
   */
  public onPage(event: PageEvent): void {
    this.form.pageSize().value.set(event.pageSize);
    const last = this._lastRequest;
    if (!last) {
      return;
    }
    // a new page size restarts from the first page
    const pageNumber =
      event.pageSize === last.pageSize ? event.pageIndex + 1 : 1;
    this.execute({ ...last, pageNumber, pageSize: event.pageSize });
  }

  /**
   * Reset all the filters and results.
   */
  public reset(): void {
    this._draft.set(this.getDefaults());
    this.form().reset();
    this.page.set(undefined);
    this.error.set(undefined);
    this.selectedId.set(undefined);
    this.details.set(undefined);
  }
  // #endregion

  // #region Place types
  public onPlaceTypeInput(event: Event): void {
    this.placeTypeFilter.set((event.target as HTMLInputElement).value);
  }

  public addPlaceType(type: string): void {
    const t = type.trim();
    if (!t || !this.placeTypes().some((e) => e.shortName === t)) {
      return;
    }
    this.form.placeTypes().value.update((types) =>
      types.includes(t) ? types : [...types, t],
    );
    this.form.placeTypes().markAsDirty();
  }

  public onPlaceTypeTokenEnd(event: MatChipInputEvent): void {
    this.addPlaceType(event.value);
    event.chipInput.clear();
    this.placeTypeFilter.set('');
  }

  public onPlaceTypeSelected(
    event: MatAutocompleteSelectedEvent,
    input: HTMLInputElement,
  ): void {
    this.addPlaceType(event.option.value);
    input.value = '';
    this.placeTypeFilter.set('');
  }

  public removePlaceType(type: string): void {
    this.form.placeTypes().value.update((types) =>
      types.filter((t) => t !== type),
    );
    this.form.placeTypes().markAsDirty();
  }
  // #endregion

  // #region Spatial
  public onMapPointChange(point: PleiadesLngLat | undefined): void {
    this.form.pointLng().value.set(point ? point[0] : null);
    this.form.pointLat().value.set(point ? point[1] : null);
  }

  public onMapBBoxChange(bbox: PleiadesBBox | undefined): void {
    this.form.swLng().value.set(bbox ? bbox.sw[0] : null);
    this.form.swLat().value.set(bbox ? bbox.sw[1] : null);
    this.form.neLng().value.set(bbox ? bbox.ne[0] : null);
    this.form.neLat().value.set(bbox ? bbox.ne[1] : null);
  }

  public clearPoint(): void {
    this.onMapPointChange(undefined);
  }

  public clearBBox(): void {
    this.onMapBBoxChange(undefined);
  }

  public onMapRegionChange(region: PleiadesLngLat[] | undefined): void {
    this.form.region().value.set(region ? [...region] : []);
  }

  /**
   * Clear the region, and any region being drawn.
   */
  public clearRegion(): void {
    this.map()?.cancelDrawing();
    this.onMapRegionChange(undefined);
  }

  /**
   * Close the region being drawn in the map.
   */
  public finishRegion(): void {
    this.map()?.finishDrawing();
  }

  public fitResults(): void {
    this.map()?.fitResults();
  }
  // #endregion

  // #region Results
  public flyTo(result: PleiadesSearchResult): void {
    this.selectedId.set(result.id);
    this.map()?.flyTo(result);
  }

  /**
   * Show the details of the place with the specified ID.
   * @param id The place ID.
   * @param fit True to fit the map to the place once loaded.
   */
  public showDetails(id: string, fit = false): void {
    this.selectedTab.set(DETAILS_TAB);
    if (this.details()?.id === id && !this.detailsError()) {
      if (fit) {
        this.locatePlace(this.details()!);
      }
      return;
    }
    this._fitDetails = fit;
    this._details$.next(id);
  }

  public onMapPlaceClick(result: PleiadesSearchResult): void {
    // when viewing details, show those of the clicked place
    if (this.selectedTab() === DETAILS_TAB) {
      this.showDetails(result.id);
    }
  }

  /**
   * Fit the map to the specified place.
   * @param place The place.
   */
  public locatePlace(place: PleiadesPlace): void {
    if (place.bbox) {
      this.map()?.fitBounds({
        sw: [place.bbox[0], place.bbox[1]],
        ne: [place.bbox[2], place.bbox[3]],
      });
    } else if (place.lat !== null && place.lng !== null) {
      this.map()?.flyTo(place);
    }
  }

  public pick(result: PleiadesSearchResult): void {
    this.placePick.emit(result);
  }
  // #endregion
}
