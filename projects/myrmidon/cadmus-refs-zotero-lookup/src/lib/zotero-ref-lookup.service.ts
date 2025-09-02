import { Injectable } from '@angular/core';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { map, Observable, of } from 'rxjs';

import {
  ZoteroItem,
  ZoteroLibraryType,
  ZoteroSearchParams,
  ZoteroService,
} from './zotero.service';

export interface ZoteroLookupOptions extends ZoteroSearchParams {
  libraryType?: ZoteroLibraryType;
  libraryName: string;
}

/**
 * A service to lookup Zotero bibliography.
 */
@Injectable({
  providedIn: 'root',
})
export class ZoteroRefLookupService implements RefLookupService {
  constructor(private _zotero: ZoteroService) {}

  /**
   * Lookup Zotero bibliography.
   * @param filter The lookup filter.
   * @param options The additional options. You can pass additional options
   * by passing an instance of ZoteroRefLookupOptions. You should pass the
   * library type (which defaults to GROUP) and name.
   * @returns Matched items.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: ZoteroLookupOptions
  ): Observable<any[]> {
    if (!options?.libraryName) {
      return of([]);
    }

    return this._zotero
      .getItems(
        options?.libraryType || ZoteroLibraryType.GROUP,
        options?.libraryName || '',
        {
          ...((options as ZoteroSearchParams) || {}),
          limit: filter.limit,
          q: filter.text,
          qmode: 'everything',
        }
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Get the name of the specified lookup item.
   * @param item The item to get the name from.
   * @returns The item's name.
   */
  public getName(item: any | undefined): string {
    return (item as ZoteroItem)?.key;
  }
}
