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
  libraryId: string;
  libraryType?: ZoteroLibraryType;
}

/**
 * A service to lookup Zotero bibliography.
 */
@Injectable({
  providedIn: 'root',
})
export class ZoteroRefLookupService implements RefLookupService {
  public readonly id = 'zotero';

  constructor(private _zotero: ZoteroService) {}

  /**
   * Lookup Zotero bibliography.
   * @param filter The lookup filter.
   * @param options The additional options. You can pass additional options
   * by passing an instance of ZoteroRefLookupOptions. You should pass the
   * library type (which defaults to GROUP) and ID, unless using the default
   * library set via token injection.
   * @returns Matched items.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: ZoteroLookupOptions
  ): Observable<any[]> {
    return this._zotero
      .getItems(
        options?.libraryId,
        options?.libraryType || ZoteroLibraryType.GROUP,
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
  public getById(id: string): Observable<ZoteroItem | undefined> {
    if (!id) {
      return of(undefined);
    }
    // ID is composite: libraryId/key
    const sep = id.indexOf('/');
    if (sep < 0) {
      return of(undefined);
    }
    const libraryId = id.substring(0, sep);
    const key = id.substring(sep + 1);
    if (!libraryId || !key) {
      return of(undefined);
    }
    return this._zotero.getItem(libraryId, key);
  }

  public getName(item: any | undefined): string {
    if (!item) {
      return '';
    }
    const zi = item as ZoteroItem;
    return `${zi.data?.title} (${zi.library?.id}/${zi.data?.key})`;
  }
}
