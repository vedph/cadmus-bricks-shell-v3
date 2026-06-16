import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

import { ErrorService } from '@myrmidon/ngx-tools';

/**
 * Injection token for the base URL of the IconClass API.
 * If not provided, defaults to 'https://iconclass.org'.
 */
export const ICONCLASS_API_BASE_TOKEN = new InjectionToken<string>(
  'ICONCLASS_API_BASE',
);

const DEFAULT_API_BASE = 'https://iconclass.org';

/**
 * The languages supported by the ICONCLASS textual data (labels and
 * keywords). Any other code is technically accepted by the API but will
 * just fall back to English.
 */
export const ICONCLASS_LANGUAGES = [
  'en',
  'de',
  'fr',
  'it',
  'pt',
  'jp',
] as const;

/**
 * A language code supported by the ICONCLASS textual data.
 */
export type IconclassLanguage = (typeof ICONCLASS_LANGUAGES)[number];

/**
 * A map keyed by language code (see {@link ICONCLASS_LANGUAGES}), used by
 * ICONCLASS for both the human-readable label/description (a string) and
 * the keywords (a string array) of a notation.
 */
export interface IconclassLocalizedMap<T> {
  en?: T;
  de?: T;
  fr?: T;
  it?: T;
  pt?: T;
  jp?: T;
  [language: string]: T | undefined;
}

/**
 * The result of the ICONCLASS search endpoint (`/api/search`).
 * The `result` array contains plain notation codes (e.g. "97EE1"), which
 * can be further resolved via {@link IconclassService.getNotation}.
 */
export interface IconclassSearchResult {
  /**
   * The notation codes matching the query, up to the requested size.
   */
  result: string[];
  /**
   * The total number of matches (which can be greater than the number of
   * items returned in `result`).
   */
  total: number;
}

/**
 * A lightweight notation object returned by the hydrated search endpoint
 * (`/api/search?q=...&n=...&p=...`). Unlike the plain search that returns
 * only notation codes, each item here carries the multilingual label,
 * avoiding the need for extra per-notation round-trips.
 *
 * Note: `notation` here corresponds to `n` in the full {@link IconclassNotation}.
 */
export interface IconclassHydratedNotation {
  /** The notation code (e.g. "25F711(SPIDER)"). */
  notation: string;
  /** The human-readable label per language. */
  txt: IconclassLocalizedMap<string>;
}

/**
 * The full data for a single ICONCLASS notation, as returned by the
 * `{notation}.json` endpoint.
 */
export interface IconclassNotation {
  /**
   * The notation code (e.g. "97EE1" or "11H(NORBERT)59").
   */
  n: string;
  /**
   * The base notation, i.e. the notation without any bracketed qualifier
   * (e.g. "25F713" for "25F713(+4712)"). Equal to `n` when there is no
   * qualifier.
   */
  b: string;
  /**
   * The key code for a bracketed "+" qualifier, if any (e.g. "25Fk4712"
   * for "25F713(+4712)").
   */
  k?: string;
  /**
   * The full ancestors path of this notation, from the top-level digit
   * down to and including this notation itself (e.g.
   * ["2", "25", "25F", "25F7", "25F71", "25F713"] for "25F713").
   */
  p: string[];
  /**
   * The direct children notations, if any.
   */
  c?: string[];
  /**
   * Related ("see also") notations, if any.
   */
  r?: string[];
  /**
   * Codes of the auxiliary "keys" (facets) that can be combined with this
   * notation (e.g. ["9k0"]).
   */
  l?: string[];
  /**
   * The human-readable label/description of this notation, per language.
   * Not all languages are always available (some entries may be empty
   * strings).
   */
  txt: IconclassLocalizedMap<string>;
  /**
   * The keywords associated with this notation, per language. Not all
   * languages are always available (some entries may be empty arrays).
   */
  kw: IconclassLocalizedMap<string[]>;
}

/**
 * A single image/artwork record as returned by the ICONCLASS
 * `/api/images/{notation}` endpoint. The shape of these records depends on
 * the contributing collection, so only a few common fields are typed;
 * any other field is accessible via the index signature. Each property
 * is an array of strings (even when it logically contains a single
 * value), as provided by the source API.
 */
export interface IconclassImageRecord {
  /**
   * The identifier of the image/record in its source collection.
   */
  ID?: string[];
  /**
   * The ICONCLASS notations associated with this image.
   */
  IC?: string[];
  /**
   * The title of the artwork/image, if any.
   */
  TITLE?: string[];
  /**
   * The type of the record (e.g. "image", "bookillustration").
   */
  TYPE?: string[];
  /**
   * The creator(s)/author(s) of the artwork, if any.
   */
  CREATOR?: string[];
  /**
   * The date(s) of the artwork, if any.
   */
  DATE?: string[];
  /**
   * The current location of the artwork, if any.
   */
  LOCATION?: string[];
  /**
   * A free-text description of the artwork, if any.
   */
  DESCRIPTION?: string[];
  /**
   * The filename(s) of the image(s) within the source collection. There
   * is no standard, publicly documented base URL to turn these into full
   * URLs; use `URL_WEBPAGE` to link to the source instead.
   */
  URL_IMAGE?: string[];
  /**
   * The URL(s) of the webpage(s) presenting the artwork in its source
   * collection.
   */
  URL_WEBPAGE?: string[];
  [key: string]: string[] | undefined;
}

/**
 * The result of the ICONCLASS `/api/images/{notation}` endpoint.
 */
export interface IconclassImagesResult {
  /**
   * The number of image records returned in `images`.
   */
  count: number;
  /**
   * The maximum number of image records returned by the API for a single
   * request.
   */
  size: number;
  /**
   * The image records associated with the requested notation.
   */
  images: IconclassImageRecord[];
}

/**
 * Options for {@link IconclassService.search} and
 * {@link IconclassService.searchHydrated}.
 */
export interface IconclassSearchOptions {
  /**
   * The maximum number of results to return.
   */
  size?: number;
  /**
   * The preferred language for the response (one of
   * {@link ICONCLASS_LANGUAGES}).
   */
  lang?: IconclassLanguage | string;
  /**
   * 1-based page number for paginated hydrated search
   * ({@link IconclassService.searchHydrated} only).
   */
  page?: number;
}

/**
 * Options for {@link IconclassService.getImages}.
 */
export interface IconclassImagesOptions {
  /**
   * The preferred language for the response (one of
   * {@link ICONCLASS_LANGUAGES}).
   */
  lang?: IconclassLanguage | string;
  /**
   * The maximum number of image records to return.
   */
  size?: number;
}

/**
 * Service wrapping the public ICONCLASS API (https://iconclass.org).
 *
 * ICONCLASS is a classification system for iconographic research and the
 * documentation of images, widely used to describe the subject matter of
 * artworks. A notation is an alphanumeric code (e.g. "97EE1") identifying
 * a specific subject; notations are organized in a hierarchy and may be
 * combined with bracketed qualifiers (e.g. "25F713(+4712)").
 *
 * The API is not formally documented, but the following endpoints have
 * been verified to work and return JSON:
 *
 * - `GET /api/search?q={query}&size={size}&lang={lang}`: full-text search
 *   across notations' labels and keywords. Returns a list of matching
 *   notation codes (some of which may represent "kindred" placeholder
 *   notations like "25F713(...)") plus the total number of matches. The
 *   `lang` parameter does not appear to restrict matching (searching for
 *   an Italian keyword returns the same results as its English
 *   equivalent), so it is mostly useful for symmetry with the other
 *   endpoints.
 *
 * - `GET /{notation}.json`: returns the full data for a single notation,
 *   including its multilingual label/description (`txt`), multilingual
 *   keywords (`kw`), and its position in the hierarchy (`p` for the
 *   ancestors path, `c` for children, `r` for related notations). Special
 *   characters in the notation (parentheses, "+", etc.) must be included
 *   literally in the path. Unknown notations return an empty JSON object
 *   `{}` with HTTP 200 (no 404), so callers should check for the presence
 *   of the `n` property.
 *
 * - `GET /api/images/{notation}?lang={lang}&format=json`: returns example
 *   images/artworks tagged with the given notation (or any of its
 *   qualified variants), as contributed by partner collections. Many
 *   notations - especially deeper or more specific ones - have no
 *   associated images (`count: 0`, `images: []`); this is normal and not
 *   an error.
 */
@Injectable({
  providedIn: 'root',
})
export class IconclassService {
  private readonly apiBase: string;

  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    @Optional() @Inject(ICONCLASS_API_BASE_TOKEN) apiBase?: string,
  ) {
    this.apiBase = apiBase || DEFAULT_API_BASE;
  }

  /**
   * Encode a notation code for use as a path segment, preserving the
   * characters ICONCLASS notations legitimately use (parentheses and "+")
   * unescaped, as the API expects them literally in the URL path.
   * @param notation The notation code (e.g. "25F713(+4712)").
   * @returns The encoded path segment.
   */
  private encodeNotation(notation: string): string {
    return encodeURIComponent(notation).replace(/%2B/g, '+');
  }

  /**
   * Search for notations matching the given free-text query. The query is
   * matched against notations' labels and keywords in all the supported
   * languages.
   * @param query The free-text query (e.g. "spider").
   * @param options Optional search parameters.
   * @returns Observable with the matching notation codes and the total
   * number of matches.
   */
  public search(
    query: string,
    options?: IconclassSearchOptions,
  ): Observable<IconclassSearchResult> {
    if (!query?.trim()) {
      return of({ result: [], total: 0 });
    }

    let params = new HttpParams().set('q', query.trim());
    if (options?.size) {
      params = params.set('size', options.size);
    }
    if (options?.lang) {
      params = params.set('lang', options.lang);
    }

    const url = `${this.apiBase}/api/search`;
    return this._http
      .get<IconclassSearchResult>(url, { params })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Get the full data (label, description, keywords, hierarchy) for the
   * given notation.
   * @param notation The notation code (e.g. "97EE1" or
   * "11H(NORBERT)59").
   * @returns Observable with the notation's data, or `undefined` if the
   * notation does not exist.
   */
  public getNotation(
    notation: string,
  ): Observable<IconclassNotation | undefined> {
    if (!notation?.trim()) {
      return of(undefined);
    }

    const url = `${this.apiBase}/${this.encodeNotation(notation.trim())}.json`;
    return this._http.get<IconclassNotation | Record<string, never>>(url).pipe(
      map((data) =>
        data && (data as IconclassNotation).n
          ? (data as IconclassNotation)
          : undefined,
      ),
      retry(3),
      catchError(this._error.handleError),
    );
  }

  /**
   * Get example images/artworks tagged with the given notation, as
   * contributed by partner collections. Many notations have no associated
   * images.
   * @param notation The notation code (e.g. "97EE1").
   * @param options Optional parameters.
   * @returns Observable with the matching image records.
   */
  public getImages(
    notation: string,
    options?: IconclassImagesOptions,
  ): Observable<IconclassImagesResult> {
    if (!notation?.trim()) {
      return of({ count: 0, size: 0, images: [] });
    }

    let params = new HttpParams().set('format', 'json');
    params = params.set('lang', options?.lang || 'en');
    if (options?.size) {
      params = params.set('size', options.size);
    }

    const url = `${this.apiBase}/api/images/${this.encodeNotation(
      notation.trim(),
    )}`;
    return this._http
      .get<IconclassImagesResult>(url, { params })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Search for notations matching the given query and return hydrated results
   * (notation code + multilingual label) in a single call, without the N+1
   * round-trips required by the plain {@link search} + {@link getNotation}
   * combination.
   *
   * The query may include a trailing `*` wildcard for prefix matching
   * (e.g. `"spi*"` matches keywords starting with "spi"). The API uses
   * `n` as the page-size parameter and `p` for the 1-based page number.
   *
   * @param query The search query, optionally ending with `*`.
   * @param options Optional search parameters.
   * @returns Observable with an array of hydrated notation objects.
   */
  public searchHydrated(
    query: string,
    options?: IconclassSearchOptions,
  ): Observable<IconclassHydratedNotation[]> {
    if (!query?.trim()) {
      return of([]);
    }

    let params = new HttpParams().set('q', query.trim());
    if (options?.size) {
      params = params.set('size', options.size);
    }
    if (options?.page) {
      params = params.set('p', options.page);
    }
    if (options?.lang) {
      params = params.set('lang', options.lang);
    }

    const url = `${this.apiBase}/api/search`;
    return this._http
      .get<IconclassHydratedNotation[]>(url, { params })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Resolve the full ancestors of a notation from its `p` (path) array.
   * The `p` array includes the notation itself as the last element, so
   * this method fetches all entries except the last one.
   * @param notation The already-fetched notation whose ancestors to resolve.
   * @returns Observable with the ancestor notations ordered from root down
   * to the immediate parent.
   */
  public getAncestors(
    notation: IconclassNotation,
  ): Observable<IconclassNotation[]> {
    const ancestorIds = notation.p.slice(0, -1);
    if (!ancestorIds.length) {
      return of([]);
    }
    return forkJoin(ancestorIds.map((id) => this.getNotation(id))).pipe(
      map((notations) => notations.filter((n) => !!n) as IconclassNotation[]),
    );
  }

  /**
   * Resolve the direct children of a notation from its `c` array.
   * @param notation The already-fetched notation whose children to resolve.
   * @returns Observable with the immediate child notations.
   */
  public getChildren(
    notation: IconclassNotation,
  ): Observable<IconclassNotation[]> {
    if (!notation.c?.length) {
      return of([]);
    }
    return forkJoin(notation.c.map((id) => this.getNotation(id))).pipe(
      map((notations) => notations.filter((n) => !!n) as IconclassNotation[]),
    );
  }

  /**
   * Get the best available human-readable label for a notation, falling
   * back to English and then to any other available language if the
   * requested language is missing.
   * @param notation The notation data, as returned by
   * {@link getNotation}.
   * @param lang The preferred language (default English).
   * @returns The label, or the notation code itself if no label is
   * available.
   */
  public getLabel(
    notation: IconclassNotation,
    lang: IconclassLanguage | string = 'en',
  ): string {
    const txt = notation.txt || {};
    if (txt[lang]) {
      return txt[lang]!;
    }
    if (txt['en']) {
      return txt['en']!;
    }
    const first = Object.values(txt).find((t) => !!t);
    return first || notation.n;
  }
}
