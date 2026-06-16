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
 * by their label/keywords and get back their ID and a concise label.
 *
 * A trailing `*` is automatically appended to the query to request
 * prefix/wildcard matching from the API (e.g. typing "spi" searches for
 * "spi*"). Whether the API honours the wildcard depends on the endpoint;
 * if not supported, users must type whole words.
 */
@Injectable({
  providedIn: 'root',
})
export class IconclassRefLookupService implements RefLookupService {
  public readonly id = 'iconclass';

  constructor(private _iconclass: IconclassService) {}

  /**
   * Lookup notations matching the given text. A trailing `*` is
   * automatically appended to the query for prefix matching. Each
   * matching notation code is then resolved to its full data via
   * {@link IconclassService.getNotation}.
   * @param filter The filter.
   * @param options Optional search options.
   * @returns Observable with the matching notations' full data.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: IconclassSearchOptions,
  ): Observable<IconclassNotation[]> {
    if (!filter.text) {
      return of([]);
    }
    const q = filter.text.endsWith('*') ? filter.text : `${filter.text}*`;
    return this._iconclass
      .search(q, {
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
        map(
          (notations) => notations.filter((n) => !!n) as IconclassNotation[],
        ),
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
    const full = this._iconclass.getLabel(item);
    // ICONCLASS labels use ':' (concept: narrative) and ';' (subject; attributes)
    // to separate the short concept name from its fuller definition.
    const colon = full.indexOf(':');
    const semi = full.indexOf(';');
    const sep =
      colon < 0 && semi < 0
        ? -1
        : colon < 0
          ? semi
          : semi < 0
            ? colon
            : Math.min(colon, semi);
    const label = sep > 0 ? full.substring(0, sep).trim() : full;
    return `${label} (${item.n})`;
  }
}
