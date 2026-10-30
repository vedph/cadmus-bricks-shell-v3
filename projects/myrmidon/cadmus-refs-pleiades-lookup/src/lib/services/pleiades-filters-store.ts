import { inject, Injectable, InjectionToken } from '@angular/core';

import { PleiadesSearchFilters } from '../models';

/**
 * The key of the local storage entry with the saved Pleiades filters.
 */
export const PLEIADES_FILTERS_STORAGE_KEY = new InjectionToken<string>(
  'PLEIADES_FILTERS_STORAGE_KEY',
  {
    providedIn: 'root',
    factory: () => 'cadmus-refs-pleiades-lookup.filters',
  },
);

/**
 * The store of the Pleiades search filters saved by the user in the
 * local storage. The lookup service uses them when it gets no options,
 * so that they apply whenever the lookup is reused.
 */
@Injectable({
  providedIn: 'root',
})
export class PleiadesFiltersStore {
  private readonly _key = inject(PLEIADES_FILTERS_STORAGE_KEY);

  /**
   * Load the saved filters.
   * @returns The filters, or undefined if none were saved, or if they
   * cannot be read.
   */
  public load(): PleiadesSearchFilters | undefined {
    try {
      const json = localStorage.getItem(this._key);
      if (!json) {
        return undefined;
      }
      const filters = JSON.parse(json);
      return filters && typeof filters === 'object' && !Array.isArray(filters)
        ? (filters as PleiadesSearchFilters)
        : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Save the specified filters, replacing those saved before.
   * @param filters The filters.
   * @returns True if saved.
   */
  public save(filters: PleiadesSearchFilters): boolean {
    try {
      localStorage.setItem(this._key, JSON.stringify(filters));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove the saved filters.
   */
  public clear(): void {
    try {
      localStorage.removeItem(this._key);
    } catch {
      // nothing to do when storage is not available
    }
  }
}
