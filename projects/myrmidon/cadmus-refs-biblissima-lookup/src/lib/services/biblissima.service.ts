import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';
import { Observable, of } from 'rxjs';
import { retry, catchError, map } from 'rxjs/operators';

import { ErrorService } from '@myrmidon/ngx-tools';

/**
 * The base URL for the Biblissima API.
 */
export const BIBLISSIMA_API_BASE = 'https://data.biblissima.fr/reconcile';

/**
 * Injection token for the Biblissima API base URL.
 * If not provided, defaults to BIBLISSIMA_API_BASE.
 */
export const BIBLISSIMA_API_BASE_TOKEN = new InjectionToken<string>(
  'BIBLISSIMA_API_BASE',
);

//#region Models
/**
 * Supported languages for the Biblissima API.
 */
export type BiblissimaLanguage = 'en' | 'fr';

/**
 * A type reference with id and name.
 */
export interface BiblissimaType {
  id: string;
  name: string;
}

/**
 * A feature associated with a reconciliation result.
 */
export interface BiblissimaFeature {
  id: string;
  value: number;
}

/**
 * A property constraint for reconciliation queries.
 */
export interface BiblissimaPropertyConstraint {
  /**
   * The property ID.
   */
  pid: string;
  /**
   * The property value.
   */
  v: string;
}

/**
 * A reconciliation query.
 */
export interface BiblissimaQuery {
  /**
   * The search query string.
   */
  query: string;
  /**
   * Optional type ID to restrict results to a specific class.
   */
  type?: string;
  /**
   * Maximum number of results to return (default 20).
   */
  limit?: number;
  /**
   * Property constraints for filtering results.
   */
  properties?: BiblissimaPropertyConstraint[];
}

/**
 * A reconciliation candidate result.
 */
export interface BiblissimaCandidate {
  /**
   * The entity identifier (e.g., "Q7089").
   */
  id: string;
  /**
   * The entity name/label.
   */
  name: string;
  /**
   * Optional description of the entity.
   */
  description?: string | null;
  /**
   * The match confidence score (higher is better).
   */
  score: number;
  /**
   * Whether the service recommends this as a definite match.
   */
  match: boolean;
  /**
   * The types this entity belongs to.
   */
  type?: BiblissimaType[];
  /**
   * Additional features/scores for this result.
   */
  features?: BiblissimaFeature[];
}

/**
 * The result for a single query.
 */
export interface BiblissimaQueryResult {
  result: BiblissimaCandidate[];
}

/**
 * The response from a reconciliation query (batch of queries).
 */
export interface BiblissimaReconcileResponse {
  [queryId: string]: BiblissimaQueryResult;
}

/**
 * A suggest item returned by entity/property/type suggest endpoints.
 */
export interface BiblissimaSuggestItem {
  /**
   * The item identifier.
   */
  id: string;
  /**
   * The item name/label.
   */
  name: string;
  /**
   * Optional description.
   */
  description?: string;
  /**
   * For entity suggests, the notable types this entity belongs to.
   */
  notable?: BiblissimaType[];
}

/**
 * The response from a suggest endpoint.
 */
export interface BiblissimaSuggestResponse {
  result: BiblissimaSuggestItem[];
}

/**
 * A property in a data extension request.
 */
export interface BiblissimaExtendProperty {
  /**
   * The property ID.
   */
  id: string;
  /**
   * Optional maximum number of values to return.
   */
  limit?: number;
}

/**
 * A data extension request.
 */
export interface BiblissimaExtendRequest {
  /**
   * The entity IDs to extend.
   */
  ids: string[];
  /**
   * The properties to fetch.
   */
  properties: BiblissimaExtendProperty[];
}

/**
 * A property value in a data extension response.
 * Only one of the value fields will be set.
 */
export interface BiblissimaExtendValue {
  /**
   * String value.
   */
  str?: string;
  /**
   * Integer value.
   */
  int?: number;
  /**
   * Floating point value.
   */
  float?: number;
  /**
   * Date value (ISO format).
   */
  date?: string;
  /**
   * Boolean value.
   */
  bool?: boolean;
  /**
   * Entity reference ID.
   */
  id?: string;
  /**
   * Entity reference name.
   */
  name?: string;
}

/**
 * Property metadata in a data extension response.
 */
export interface BiblissimaExtendPropertyMeta {
  id: string;
  name: string;
}

/**
 * A row in a data extension response, mapping property IDs to values.
 */
export interface BiblissimaExtendRow {
  [propertyId: string]: BiblissimaExtendValue[];
}

/**
 * The response from a data extension request.
 */
export interface BiblissimaExtendResponse {
  /**
   * Metadata about the properties.
   */
  meta: BiblissimaExtendPropertyMeta[];
  /**
   * The extended data, keyed by entity ID.
   */
  rows: {
    [entityId: string]: BiblissimaExtendRow;
  };
}

/**
 * Options for the Biblissima service.
 */
export interface BiblissimaOptions {
  /**
   * The language for results (default: 'en').
   */
  language?: BiblissimaLanguage;
}

/**
 * A language-tagged value from the Wikibase API.
 */
export interface WbLanguageValue {
  language: string;
  value: string;
}

/**
 * A Wikibase entity as returned by the wbgetentities API.
 */
export interface WbEntity {
  type: string;
  id: string;
  labels?: { [language: string]: WbLanguageValue };
  descriptions?: { [language: string]: WbLanguageValue };
  aliases?: { [language: string]: WbLanguageValue[] };
}

/**
 * Response from the Wikibase wbgetentities API.
 */
export interface WbGetEntitiesResponse {
  entities: { [id: string]: WbEntity };
  success: number;
}
//#endregion

/**
 * Service for interacting with the Biblissima+ Reconciliation API.
 * This service provides methods for:
 * - Reconciliation queries (searching for entities)
 * - Entity/property/type suggestions (autocomplete)
 * - Data extension (fetching property values for entities)
 *
 * API documentation: https://doc.biblissima.fr/api/reconciliation-infos-techniques/
 * W3C Reconciliation API: https://www.w3.org/community/reports/reconciliation/CG-FINAL-specs-0.1-20230321
 */
@Injectable({
  providedIn: 'root',
})
export class BiblissimaService {
  private readonly _apiBase: string;

  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    @Optional() @Inject(BIBLISSIMA_API_BASE_TOKEN) apiBase?: string,
  ) {
    this._apiBase = apiBase || BIBLISSIMA_API_BASE;
  }

  /**
   * Build the API URL for a given endpoint and language.
   * @param endpoint The API endpoint path.
   * @param language The language ('en' or 'fr').
   * @returns The full API URL.
   */
  private buildUrl(
    endpoint: string,
    language: BiblissimaLanguage = 'en',
  ): string {
    return `${this._apiBase}/${language}${endpoint}`;
  }

  /**
   * Perform a reconciliation query to find matching entities.
   * @param query The search query.
   * @param options Optional settings (language).
   * @returns Observable of reconciliation candidates.
   */
  public reconcile(
    query: BiblissimaQuery,
    options?: BiblissimaOptions,
  ): Observable<BiblissimaCandidate[]> {
    if (!query.query?.trim()) {
      return of([]);
    }

    const language = options?.language || 'en';
    const url = this.buildUrl('/api', language);

    // Build the queries object with a single query 'q0'
    const queries: { [key: string]: BiblissimaQuery } = {
      q0: {
        query: query.query.trim(),
        ...(query.type && { type: query.type }),
        ...(query.limit && { limit: query.limit }),
        ...(query.properties?.length && { properties: query.properties }),
      },
    };

    return this._http
      .get<BiblissimaReconcileResponse>(url, {
        params: { queries: JSON.stringify(queries) },
      })
      .pipe(
        retry(3),
        map((response) => response['q0']?.result || []),
        catchError((error) => this._error.handleError(error)),
      );
  }

  /**
   * Suggest entities matching a prefix.
   * @param prefix The search prefix.
   * @param options Optional settings (language).
   * @returns Observable of suggested entities.
   */
  public suggestEntities(
    prefix: string,
    options?: BiblissimaOptions,
  ): Observable<BiblissimaSuggestItem[]> {
    if (!prefix?.trim()) {
      return of([]);
    }

    const language = options?.language || 'en';
    const url = this.buildUrl('/suggest/entity', language);

    return this._http
      .get<BiblissimaSuggestResponse>(url, {
        params: { prefix: prefix.trim() },
      })
      .pipe(
        retry(3),
        map((response) => response.result || []),
        catchError((error) => this._error.handleError(error)),
      );
  }

  /**
   * Suggest properties matching a prefix.
   * @param prefix The search prefix.
   * @param options Optional settings (language).
   * @returns Observable of suggested properties.
   */
  public suggestProperties(
    prefix: string,
    options?: BiblissimaOptions,
  ): Observable<BiblissimaSuggestItem[]> {
    if (!prefix?.trim()) {
      return of([]);
    }

    const language = options?.language || 'en';
    const url = this.buildUrl('/suggest/property', language);

    return this._http
      .get<BiblissimaSuggestResponse>(url, {
        params: { prefix: prefix.trim() },
      })
      .pipe(
        retry(3),
        map((response) => response.result || []),
        catchError((error) => this._error.handleError(error)),
      );
  }

  /**
   * Suggest types matching a prefix.
   * @param prefix The search prefix.
   * @param options Optional settings (language).
   * @returns Observable of suggested types.
   */
  public suggestTypes(
    prefix: string,
    options?: BiblissimaOptions,
  ): Observable<BiblissimaSuggestItem[]> {
    if (!prefix?.trim()) {
      return of([]);
    }

    const language = options?.language || 'en';
    const url = this.buildUrl('/suggest/type', language);

    return this._http
      .get<BiblissimaSuggestResponse>(url, {
        params: { prefix: prefix.trim() },
      })
      .pipe(
        retry(3),
        map((response) => response.result || []),
        catchError((error) => this._error.handleError(error)),
      );
  }

  /**
   * Extend entities with additional property values.
   * @param request The extension request with entity IDs and properties.
   * @param options Optional settings (language).
   * @returns Observable of extended data.
   */
  public extend(
    request: BiblissimaExtendRequest,
    options?: BiblissimaOptions,
  ): Observable<BiblissimaExtendResponse> {
    if (!request.ids?.length || !request.properties?.length) {
      return of({ meta: [], rows: {} });
    }

    const language = options?.language || 'en';
    const url = this.buildUrl('/api', language);

    const extendParam = {
      ids: request.ids,
      properties: request.properties.map((p) => ({
        id: p.id,
        ...(p.limit && { limit: p.limit }),
      })),
    };

    return this._http
      .get<BiblissimaExtendResponse>(url, {
        params: { extend: JSON.stringify(extendParam) },
      })
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error)),
      );
  }

  /**
   * Get a single entity by its Wikibase ID using the wbgetentities API.
   * The Wikibase API URL is derived from the reconciliation API base
   * by replacing the /reconcile path segment with /w/api.php.
   * @param id The entity ID (e.g., "Q199").
   * @param options Optional settings (language).
   * @returns Observable of the entity, or undefined if not found.
   */
  public getEntity(
    id: string,
    options?: BiblissimaOptions,
  ): Observable<WbEntity | undefined> {
    if (!id?.trim()) {
      return of(undefined);
    }

    const language = options?.language || 'en';
    const wbUrl =
      this._apiBase.replace(/\/reconcile\/?$/, '') + '/w/api.php';

    return this._http
      .get<WbGetEntitiesResponse>(wbUrl, {
        params: {
          action: 'wbgetentities',
          ids: id.trim(),
          format: 'json',
          languages: language,
          origin: '*',
        },
      })
      .pipe(
        retry(3),
        map((response) => {
          const entity = response.entities?.[id.trim()];
          if (!entity || (entity as any).missing !== undefined) {
            return undefined;
          }
          return entity;
        }),
        catchError((error) => this._error.handleError(error)),
      );
  }
}
