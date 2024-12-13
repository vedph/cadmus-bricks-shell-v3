import { Inject, Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

import {
  GeoJson,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  WHG_URL,
  WhgIndexRequest,
  WhgService,
  WhgSuggestRequest,
} from './whg.service';

/**
 * The token to provide the WHG user name.
 */
export const WHG_USERNAME_TOKEN = 'WHG_USERNAME';

/**
 * WHG reference lookup service.
 * You should provide the WHG_USERNAME_TOKEN token with your
 * WHG user name.
 */
@Injectable({
  providedIn: 'root',
})
export class WhgRefLookupService implements RefLookupService {
  constructor(
    @Inject(WHG_USERNAME_TOKEN) private _userName: string,
    private _whg: WhgService
  ) {}

  public lookup(
    filter: RefLookupFilter,
    options?: WhgSuggestRequest
  ): Observable<GeoJsonFeature[]> {
    if (!filter.text) {
      return of([]);
    }
    if (!options) {
      options = {
        url: WHG_URL,
        userName: this._userName,
      } as WhgSuggestRequest;
    }

    // override userName if not set
    if (!options.userName) {
      options.userName = this._userName;
    }

    options.q = filter.text;
    options.mode = 'in';

    console.info('WHG lookup: ', JSON.stringify(options));

    // suggest exact names from a partial name
    return this._whg.suggest(options).pipe(
      // for each name, search the index
      mergeMap((names: string[]) =>
        from(names).pipe(
          mergeMap((n) =>
            this._whg
              .search({
                url: WHG_URL,
                userName: this._userName,
                name: n,
              } as WhgIndexRequest)
              .pipe(
                map((result: GeoJson) => {
                  // if result is a features collection return features array
                  // else return an array with result as the only feature item
                  return result.type === 'FeatureCollection'
                    ? (result as GeoJsonFeatureCollection).features
                    : [result as GeoJsonFeature];
                })
              )
          ),
          reduce(
            (acc: GeoJsonFeature[], curr: GeoJsonFeature[]) => [
              ...acc,
              ...curr,
            ],
            []
          )
        )
      )
    );
  }

  /**
   * Get the name to display for the specified toponym.
   * @param item The toponym.
   * @returns The name to display for the specified toponym.
   */
  public getName(item?: GeoJsonFeature): string {
    if (!item) {
      return '';
    }
    return item.properties.title;
  }
}
