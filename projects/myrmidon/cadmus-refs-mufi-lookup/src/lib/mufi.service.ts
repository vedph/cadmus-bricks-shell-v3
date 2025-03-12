import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, retry } from 'rxjs';

import { DataPage, EnvService, ErrorService } from '@myrmidon/ngx-tools';

/**
 * MUFI character.
 */
export interface MufiChar {
  /**
   * The code.
   */
  code: number;

  /**
   * The uppercase code.
   */
  uppercaseCode: number;

  /**
   * The Unicode category.
   */
  unicodeCategory: string;

  /**
   * The URL.
   */
  url: string;

  /**
   * The Unicode name.
   */
  unicodeName: string;

  /**
   * The MUFI name.
   */
  mufiName: string;

  /**
   * The Unicode entity.
   */
  unicodeEntity?: string;

  /**
   * The MUFI entity.
   */
  mufiEntity?: string;

  /**
   * The tags.
   */
  tags?: string[];

  /**
   * The unicode version.
   */
  unicodeVersion?: string;

  /**
   * The MUFI version.
   */
  mufiVersion?: string;

  /**
   * The MUFI status.
   */
  mufiStatus?: string;

  /**
   * The comment.
   */
  comment?: string;

  /**
   * The SVG code.
   */
  svg?: string;
}

/**
 * MUFI character filter.
 */
export interface MufiCharFilter {
  /**
   * The page number.
   */
  pageNumber: number;

  /**
   * The page size.
   */
  pageSize: number;

  /**
   * The minimum code.
   */
  minCode?: number;

  /**
   * The maximum code.
   */
  maxCode?: number;

  /**
   * The uppercase code.
   */
  uppercaseCode?: number;

  /**
   * The Unicode categories. Any of these must match.
   */
  unicodeCategories?: string[];

  /**
   * Any portion of the Unicode name to match.
   */
  unicodeName?: string;

  /**
   * Any portion of the MUFI name to match.
   */
  mufiName?: string;

  /**
   * The unicode entity.
   */
  unicodeEntity?: string;

  /**
   * The MUFI entity.
   */
  mufiEntity?: string;

  /**
   * The tags. Any of these must match.
   */
  tags?: string[];

  /**
   * The unicode version.
   */
  unicodeVersion?: string;

  /**
   * The MUFI version.
   */
  mufiVersion?: string;

  /**
   * The MUFI status.
   */
  mufiStatus?: string;
}

/**
 * A service to access the MUFI API. Note that MUFI does not provide any API,
 * so this service must be provided by your API server. In a Cadmus API server,
 * just include the MUFI controller package.
 */
@Injectable({
  providedIn: 'root',
})
export class MufiService {
  private readonly _url;

  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    envService: EnvService
  ) {
    this._url = envService.get('mufiUrl') || '';
  }

  /**
   * Get the MUFI character with the specified code. If not found, a 404 error
   * is returned.
   * @param code The MUFI code.
   * @returns The MUFI character.
   */
  public get(code: number): Observable<MufiChar> {
    return this._http
      .get<MufiChar>(this._url + 'mufi/characters/' + code.toString())
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }

  /**
   * Search MUFI characters.
   * @param filter The filter.
   * @returns The requested page of MUFI characters.
   */
  public search(filter: MufiCharFilter): Observable<DataPage<MufiChar>> {
    const filteredRequest = Object.entries(filter)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    return this._http
      .get<DataPage<MufiChar>>(this._url + 'mufi/characters', {
        params: filteredRequest as any,
      })
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }
}
