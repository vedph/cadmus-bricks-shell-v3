import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, retry } from 'rxjs';

import { DataPage, EnvService, ErrorService } from '@myrmidon/ngx-tools';

/**
 * MOL authority entry type.
 */
export enum MolAuthorityEntryType {
  Identified = 0,
  Unidentified = 1,
  Alias = 2,
}

/**
 * MOL SBN type.
 */
export type MolSbnType =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'L'
  | 'R'
  | 'X';

/**
 * MOL entity.
 */
export interface MolAuthorityEntry {
  type: MolAuthorityEntryType;
  cnmn: string;
  id: string;
  name: string;
  originalName: string;
  sortableName: string;
  sbnType: MolSbnType;
  targetId?: string;
  dateText?: string;
  dateValue: number;
  originalDate?: string;
  roles?: string[];
  isni?: string;
  vidSbn?: string;
}

/**
 * MOL authority entry filter.
 */
export interface MolAuthorityEntryFilter {
  pageNumber: number;
  pageSize: number;
  type?: MolAuthorityEntryType;
  name?: string;
  sbnType?: MolSbnType;
  dateMin?: number;
  dateMax?: number;
  roles?: string[];
}

/**
 * A service to access the MOL API. Note that MOL does not provide any API,
 * so this service must be provided by your API server. In a Cadmus API server,
 * just include the MOL controller package.
 */
@Injectable({
  providedIn: 'root',
})
export class MolService {
  private readonly _url;

  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    envService: EnvService
  ) {
    this._url = envService.get('molUrl') || '';
  }

  /**
   * Get the MOL entry with the specified code. If not found, a 404 error
   * is returned.
   * @param id The MOL id. This can be equal to the full CNMN code, or just
   * be the ID extracted from it without the CNMN\ prefix and its leading
   * zeros.
   * @returns The MOL entry.
   */
  public get(id: string): Observable<MolAuthorityEntry> {
    return this._http
      .get<MolAuthorityEntry>(this._url + 'mol/entries/' + id)
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }

  /**
   * Search MOL entries.
   * @param filter The filter.
   * @returns The requested page of MOL entries.
   */
  public search(
    filter: MolAuthorityEntryFilter
  ): Observable<DataPage<MolAuthorityEntry>> {
    const filteredRequest = Object.entries(filter)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    return this._http
      .get<DataPage<MolAuthorityEntry>>(this._url + 'mol/entries', {
        params: filteredRequest as any,
      })
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }
}
