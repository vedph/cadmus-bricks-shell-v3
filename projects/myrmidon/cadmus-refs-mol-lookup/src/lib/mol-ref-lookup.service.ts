import { Injectable } from '@angular/core';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { map, Observable, of } from 'rxjs';

import {
  MolAuthorityEntry,
  MolAuthorityEntryFilter,
  MolService,
} from './mol.service';

/**
 * A service to lookup MUFI characters.
 */
@Injectable({
  providedIn: 'root',
})
export class MolRefLookupService implements RefLookupService {
  public readonly id = 'mol';

  constructor(private _mol: MolService) {}

  /**
   * Lookup MUFI characters.
   * @param filter The lookup filter.
   * @param options The additional options. You can pass additional options
   * by passing an instance of MufiCharFilter.
   * @returns Matched items.
   */
  public lookup(filter: RefLookupFilter, options?: any): Observable<any[]> {
    return this._mol
      .search({
        ...((options as MolAuthorityEntryFilter) || {}),
        pageNumber: 1,
        pageSize: filter.limit,
        name: filter.text,
      })
      .pipe(map((page) => page.items));
  }

  /**
   * Get the name of the specified lookup item.
   * @param item The item to get the name from.
   * @returns The item's name, built from name, roles, and date.
   */
  public getById(id: string): Observable<MolAuthorityEntry | undefined> {
    if (!id) {
      return of(undefined);
    }
    return this._mol.get(id);
  }

  public getName(item: any | undefined): string {
    if (!item) {
      return '';
    }
    const entry = item as MolAuthorityEntry;
    const sb: string[] = [];
    // name
    sb.push(entry.name);

    // roles
    if (entry.roles?.length) {
      sb.push(` [${entry.roles.join(', ')}]`);
    }

    // (date)
    if (entry.dateText) {
      sb.push(` (${entry.dateText})`);
    }
    return sb.join('');
  }
}
