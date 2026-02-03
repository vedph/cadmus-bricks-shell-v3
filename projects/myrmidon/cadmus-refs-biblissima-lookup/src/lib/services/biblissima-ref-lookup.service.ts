import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

import {
  BiblissimaCandidate,
  BiblissimaLanguage,
  BiblissimaPropertyConstraint,
  BiblissimaService,
} from './biblissima.service';

/**
 * Options for the Biblissima reference lookup service.
 */
export interface BiblissimaRefLookupOptions {
  /**
   * The language for results ('en' or 'fr'). Default is 'en'.
   */
  language?: BiblissimaLanguage;
  /**
   * Optional type ID to restrict results to entities of a specific class.
   * Example: "Q168" for human.
   */
  type?: string;
  /**
   * Optional property constraints for filtering results.
   * Each constraint is a pair of property ID (pid) and value (v).
   * Example: [{ pid: "P57", v: "560" }]
   */
  properties?: BiblissimaPropertyConstraint[];
}

/**
 * Biblissima+ reference lookup service implementing the RefLookupService
 * interface for use with the Cadmus lookup component.
 *
 * This service uses the Biblissima+ Reconciliation API to search for
 * entities in the Biblissima knowledge base.
 *
 * @example
 * // Basic usage in configuration:
 * {
 *   name: 'Biblissima',
 *   iconUrl: '/img/biblissima128.png',
 *   description: 'Biblissima+',
 *   label: 'entity',
 *   service: inject(BiblissimaRefLookupService),
 *   itemIdGetter: (item: BiblissimaCandidate) => item?.id,
 *   itemLabelGetter: (item: BiblissimaCandidate) => item?.name,
 * }
 *
 * @example
 * // Usage with type filter (restrict to humans):
 * // Set options = { type: 'Q168' }
 *
 * @example
 * // Usage with French language:
 * // Set options = { language: 'fr' }
 */
@Injectable({
  providedIn: 'root',
})
export class BiblissimaRefLookupService implements RefLookupService {
  constructor(private _biblissima: BiblissimaService) {}

  /**
   * Look up entities in Biblissima+ matching the filter text.
   * @param filter The filter containing the search text and limit.
   * @param options Optional lookup options (language, type, properties).
   * @returns Observable of matching candidates.
   */
  public lookup(
    filter: RefLookupFilter,
    options?: BiblissimaRefLookupOptions,
  ): Observable<BiblissimaCandidate[]> {
    if (!filter.text) {
      return of([]);
    }

    return this._biblissima.reconcile(
      {
        query: filter.text,
        limit: filter.limit || 10,
        type: options?.type,
        properties: options?.properties,
      },
      { language: options?.language || 'en' },
    );
  }

  /**
   * Get the display name for a Biblissima candidate.
   * @param item The candidate item.
   * @returns The name to display for the candidate.
   */
  public getName(item?: BiblissimaCandidate): string {
    if (!item) {
      return '';
    }
    return item.name;
  }
}
