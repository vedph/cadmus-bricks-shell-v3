import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import type {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

import {
  PLEIADES_TOPONYM_SCOPES,
  PleiadesPlace,
  PleiadesSearchRequest,
  PleiadesSearchResult,
} from '../models';
import { PleiadesApiService } from './pleiades-api.service';
import { buildTypeAheadText } from './pleiades-helpers';

/**
 * Options for the Pleiades reference lookup. These are the search
 * request filters (except text and paging), plus a flag to disable the
 * type-ahead text processing.
 */
export interface PleiadesRefLookupOptions
  extends Omit<PleiadesSearchRequest, 'text' | 'pageNumber' | 'pageSize'> {
  /**
   * True to use the text as it is typed, rather than appending the
   * "starts with" operator to its last word.
   */
  noTypeAhead?: boolean;
}

/**
 * Convert a place's details into a search result, so that items got by ID
 * have the same shape of the lookup items.
 * @param place The place.
 * @returns The result.
 */
export function pleiadesPlaceToResult(
  place: PleiadesPlace,
): PleiadesSearchResult {
  const uriPrefix = place.uri.endsWith('/' + place.id)
    ? place.uri.substring(0, place.uri.length - place.id.length)
    : 'https://pleiades.stoa.org/places/';
  return {
    id: place.id,
    uriPrefix,
    name: place.title,
    type: place.types.length ? place.types[0] : null,
    types: place.types,
    lat: place.lat,
    lng: place.lng,
    distance: null,
  };
}

/**
 * Pleiades reference lookup service. This uses the quick search of the
 * Pleiades API as a type-ahead lookup for places: by default it searches
 * toponyms (place titles and names), matching the last word typed as a
 * prefix. Pass PleiadesRefLookupOptions to change the search filters.
 * Items are PleiadesSearchResult objects.
 */
@Injectable({
  providedIn: 'root',
})
export class PleiadesRefLookupService implements RefLookupService {
  private readonly _api = inject(PleiadesApiService);

  public readonly id = 'pleiades';

  /**
   * Lookup places.
   * @param filter The lookup filter with text and limit.
   * @param options The optional search options.
   * @returns The matching places.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: PleiadesRefLookupOptions,
  ): Observable<PleiadesSearchResult[]> {
    const { noTypeAhead, ...rest } = options || {};
    const text = noTypeAhead
      ? filter.text?.trim() || ''
      : buildTypeAheadText(filter.text);
    if (!text) {
      return of([]);
    }
    const request: PleiadesSearchRequest = {
      scopes: [...PLEIADES_TOPONYM_SCOPES],
      ...rest,
      text,
      pageNumber: 1,
      pageSize: Math.min(100, Math.max(1, filter.limit || 10)),
    };
    return this._api.search(request).pipe(
      map((page) => page.items),
      catchError((error) => {
        console.error('Pleiades lookup error', error);
        return of([]);
      }),
    );
  }

  /**
   * Get the place with the specified Pleiades ID.
   * @param id The ID.
   * @returns The place as a search result, or undefined if not found.
   */
  public getById(id: string): Observable<PleiadesSearchResult | undefined> {
    if (!id?.trim()) {
      return of(undefined);
    }
    return this._api.getPlace(id.trim()).pipe(
      map((place) => pleiadesPlaceToResult(place)),
      catchError(() => of(undefined)),
    );
  }

  /**
   * Get the display name of the specified place.
   * @param item The place.
   * @returns The name.
   */
  public getName(item: PleiadesSearchResult | undefined): string {
    return item?.name || '';
  }
}
