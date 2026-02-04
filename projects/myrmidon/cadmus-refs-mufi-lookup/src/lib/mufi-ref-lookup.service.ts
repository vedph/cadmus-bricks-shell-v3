import { Injectable } from '@angular/core';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { map, Observable } from 'rxjs';

import { MufiChar, MufiCharFilter, MufiService } from './mufi.service';

/**
 * A service to lookup MUFI characters.
 */
@Injectable({
  providedIn: 'root',
})
export class MufiRefLookupService implements RefLookupService {
  public readonly id = 'mufi';

  constructor(private _mufi: MufiService) {}

  /**
   * Lookup MUFI characters.
   * @param filter The lookup filter.
   * @param options The additional options. You can pass additional options
   * by passing an instance of MufiCharFilter.
   * @returns Matched items.
   */
  public lookup(filter: RefLookupFilter, options?: any): Observable<any[]> {
    return this._mufi
      .search({
        ...((options as MufiCharFilter) || {}),
        pageNumber: 1,
        pageSize: filter.limit,
        mufiName: filter.text,
      })
      .pipe(map((page) => page.items));
  }

  /**
   * Get the name of the specified lookup item.
   * @param item The item to get the name from.
   * @returns The item's name.
   */
  public getName(item: any | undefined): string {
    return (item as MufiChar)?.mufiName;
  }
}
