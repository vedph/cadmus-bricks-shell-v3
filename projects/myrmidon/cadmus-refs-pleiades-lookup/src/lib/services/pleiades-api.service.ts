import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';

import { EnvService } from '@myrmidon/ngx-tools';

import {
  PLEIADES_PLACE_TYPE_PREFIX,
  PleiadesDataPage,
  PleiadesLookupEntry,
  PleiadesLookupFilter,
  PleiadesNearbyOptions,
  PleiadesPlace,
  PleiadesSearchRequest,
  PleiadesSearchResult,
} from '../models';
import { buildSearchParams, normalizePlaceType } from './pleiades-helpers';

/**
 * The default base URL of the Pleiades API, used when neither the
 * PLEIADES_API_URL token is provided nor the `pleiadesUrl` environment
 * setting is defined.
 */
export const PLEIADES_DEFAULT_API_URL = 'http://localhost:5000/api/';

/**
 * The token to provide the base URL of the Pleiades API, including its
 * `api/` segment (e.g. `https://some.server/api/`). By default, it is
 * got from the `pleiadesUrl` environment setting (EnvService), falling
 * back to PLEIADES_DEFAULT_API_URL.
 */
export const PLEIADES_API_URL = new InjectionToken<string>(
  'PLEIADES_API_URL',
  {
    providedIn: 'root',
    factory: () =>
      inject(EnvService).get('pleiadesUrl') || PLEIADES_DEFAULT_API_URL,
  },
);

/**
 * Client for the Pleiades API, providing lookup data, search, and place
 * details. Errors are not handled here, so that callers get the original
 * HttpErrorResponse (use getPleiadesErrorMessage to get a message from it).
 */
@Injectable({
  providedIn: 'root',
})
export class PleiadesApiService {
  private readonly _http = inject(HttpClient);
  private readonly _url: string;
  private _placeTypes$?: Observable<PleiadesLookupEntry[]>;

  constructor() {
    const url = inject(PLEIADES_API_URL);
    this._url = url.endsWith('/') ? url : url + '/';
  }

  /**
   * The base URL of the API.
   */
  public get url(): string {
    return this._url;
  }

  private static toParams(
    filter: object,
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }
    return params;
  }

  /**
   * Get a page of lookup entries.
   * @param filter The filter. Set its page size to 0 to get all the
   * matching entries.
   * @returns The page.
   */
  public getLookup(
    filter: PleiadesLookupFilter,
  ): Observable<PleiadesDataPage<PleiadesLookupEntry>> {
    return this._http.get<PleiadesDataPage<PleiadesLookupEntry>>(
      this._url + 'lookup',
      { params: PleiadesApiService.toParams(filter) },
    );
  }

  /**
   * Get all the place types (entries with a short name only), sorted by
   * their short name. The result is cached after the first successful
   * request.
   * @returns The place types.
   */
  public getPlaceTypes(): Observable<PleiadesLookupEntry[]> {
    if (!this._placeTypes$) {
      this._placeTypes$ = this.getLookup({
        prefix: PLEIADES_PLACE_TYPE_PREFIX,
        pageSize: 0,
      }).pipe(
        map((page) =>
          page.items
            .filter((e) => e.shortName)
            .sort((a, b) => a.shortName!.localeCompare(b.shortName!)),
        ),
        catchError((error) => {
          // do not cache failures
          this._placeTypes$ = undefined;
          return throwError(() => error);
        }),
        shareReplay(1),
      );
    }
    return this._placeTypes$;
  }

  /**
   * Search places.
   * @param request The search request.
   * @returns The requested page of results.
   */
  public search(
    request: PleiadesSearchRequest,
  ): Observable<PleiadesDataPage<PleiadesSearchResult>> {
    return this._http.get<PleiadesDataPage<PleiadesSearchResult>>(
      this._url + 'qsearch',
      { params: buildSearchParams(request) },
    );
  }

  /**
   * Get the details of the specified place.
   * @param id The Pleiades place ID.
   * @returns The place. A 404 error is returned if not found.
   */
  public getPlace(id: string): Observable<PleiadesPlace> {
    return this._http.get<PleiadesPlace>(
      this._url + 'places/' + encodeURIComponent(id),
    );
  }

  /**
   * Get the places nearest to the specified place, nearest first.
   * @param id The Pleiades ID of the reference place.
   * @param options The options.
   * @returns The places. A 404 error is returned if the reference place
   * does not exist or is not located.
   */
  public getNearby(
    id: string,
    options?: PleiadesNearbyOptions,
  ): Observable<PleiadesSearchResult[]> {
    const types = (options?.placeTypes || [])
      .map((t) => normalizePlaceType(t))
      .filter((t) => t);
    return this._http.get<PleiadesSearchResult[]>(
      this._url + 'places/' + encodeURIComponent(id) + '/nearby',
      {
        params: PleiadesApiService.toParams({
          distance: options?.distance || undefined,
          limit: options?.limit || undefined,
          placeType: types.length ? types.join(',') : undefined,
        }),
      },
    );
  }
}
