import { Injectable } from '@angular/core';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
  IconclassNotation,
  IconclassSearchOptions,
  IconclassService,
} from './iconclass.service';

/**
 * ICONCLASS reference lookup service, used to lookup ICONCLASS notations
 * by their label/keywords and get back their full data (including the
 * notation code and its human-readable label).
 */
@Injectable({
  providedIn: 'root',
})
export class IconclassRefLookupService implements RefLookupService {
  public readonly id = 'iconclass';

  constructor(private _iconclass: IconclassService) {}

  /**
   * Lookup notations matching the given text. The matching notation codes
   * are then resolved into their full data via {@link IconclassService.getNotation}.
   * @param filter The filter.
   * @param options The optional search options.
   * @returns Observable with the matching notations' data.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: IconclassSearchOptions,
  ): Observable<IconclassNotation[]> {
    if (!filter.text) {
      return of([]);
    }
    return this._iconclass
      .search(filter.text, {
        ...options,
        size: options?.size || filter.limit,
      })
      .pipe(
        switchMap((result) => {
          if (!result.result.length) {
            return of([]);
          }
          return forkJoin(
            result.result.map((notation) =>
              this._iconclass.getNotation(notation),
            ),
          );
        }),
        map((notations) => notations.filter((n) => !!n) as IconclassNotation[]),
      );
  }

  public getById(id: string): Observable<IconclassNotation | undefined> {
    if (!id) {
      return of(undefined);
    }
    return this._iconclass.getNotation(id);
  }

  public getName(item: IconclassNotation | undefined): string {
    if (!item) {
      return '';
    }
    return `${this._iconclass.getLabel(item)} (${item.n})`;
  }
}
