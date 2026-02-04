import { Inject, Injectable, InjectionToken } from '@angular/core';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  GeoNamesSearchRequest,
  GeoNamesService,
  GeoNamesToponym,
} from './geonames.service';

/**
 * The token to provide the GeoNames user name.
 */
export const GEONAMES_USERNAME_TOKEN = new InjectionToken('GEONAMES_USERNAME');

/**
 * Base options for a GeoNames search request.
 */
const BASE_OPTIONS: GeoNamesSearchRequest = {
  searchType: 0,
  text: '',
  userName: '',
  type: 'json',
};

/**
 * GeoNames reference lookup service.
 * You should provide the GEONAMES_USERNAME_TOKEN token with your
 * GeoNames user name.
 */
@Injectable({
  providedIn: 'root',
})
export class GeoNamesRefLookupService implements RefLookupService {
  public readonly id = 'geonames';

  constructor(
    @Inject(GEONAMES_USERNAME_TOKEN) private _userName: string,
    private _geonames: GeoNamesService
  ) {}

  /**
   * Lookup toponyms.
   * @param filter The filter.
   * @param options The search options.
   * @returns Observable of toponyms.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: GeoNamesSearchRequest
  ): Observable<GeoNamesToponym[]> {
    if (!filter.text) {
      return of([]);
    }
    if (!options) {
      options = BASE_OPTIONS;
    }

    // override userName if not set
    if (!options.userName) {
      options.userName = this._userName;
    }

    // override max rows and text
    if (options) {
      options.maxRows = filter.limit;
    } else {
      options = BASE_OPTIONS;
    }
    options.text = filter.text;

    console.info('GeoNames lookup: ', options);
    return this._geonames.search(options).pipe(
      map((r) => {
        return r.geonames;
      })
    );
  }

  /**
   * Get the name to display for the specified toponym.
   * @param item The toponym.
   * @returns The name to display for the specified toponym.
   */
  public getName(item: GeoNamesToponym): string {
    if (!item) {
      return '';
    }
    const sb: string[] = [];
    sb.push(item.name);

    // admin names
    if (item.adminName1) {
      sb.push(', ');
      sb.push(item.adminName1);
    }
    if (item.adminName2) {
      sb.push(', ');
      sb.push(item.adminName2);
    }
    if (item.adminName3) {
      sb.push(', ');
      sb.push(item.adminName3);
    }
    if (item.adminName4) {
      sb.push(', ');
      sb.push(item.adminName4);
    }
    if (item.adminName5) {
      sb.push(', ');
      sb.push(item.adminName5);
    }

    // country
    if (item.countryName) {
      sb.push(' (');
      sb.push(item.countryName);
      sb.push(')');
    }

    return sb.join('');
  }
}
