import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, retry } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';

export const WHG_URL = 'https://whgazetteer.org/';

export interface GeoJsonGeometry {
  type:
    | 'Point'
    | 'MultiPoint'
    | 'LineString'
    | 'MultiLineString'
    | 'Polygon'
    | 'MultiPolygon'
    | 'GeometryCollection';
  coordinates: any[];
  geometries?: GeoJsonGeometry[];
}

export interface GeoJsonLink {
  identifier: string;
  type: string;
}

export interface GeoJsonTimespan {
  start: { in: number };
  end: { in: number };
}

export interface GeoJsonProperties {
  title: string;
  index_id: string;
  index_role?: string;
  place_id: number;
  child_place_ids?: number[];
  dataset?: string;
  fclasses?: string[];
  placetypes?: string[];
  variants?: string[];
  links?: GeoJsonLink[];
  timespans?: GeoJsonTimespan[];
  minmax?: number[];
  ccodes?: string[];
  source_id?: string;
  types?: string[];
  when?: GeoJsonTimespan[];
}

export interface GeoJsonFeature {
  type: 'Feature';
  score: number;
  properties: GeoJsonProperties;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonFeatureCollection {
  note: string;
  type: 'FeatureCollection';
  pagesize: null;
  features: GeoJsonFeature[];
}

// GeoJson can be a Feature or a FeatureCollection
export type GeoJson = GeoJsonFeature | GeoJsonFeatureCollection;

/**
 * A WHG request.
 */
export interface WhgRequest {
  url?: string;
  userName: string;
}

/**
 * A WHG suggest search request, like in
 * https://whgazetteer.org/search/suggestions/?q=aby&mode=starts,
 * which returns an array of strings with matching names.
 */
export interface WhgSuggestRequest extends WhgRequest {
  /**
   * The query string.
   */
  q: string;
  /**
   * The matching mode.
   */
  mode: 'exactly' | 'starts' | 'in' | 'fuzzy';
}

/**
 * A WHG index search request.
 * See https://whgazetteer.org/usingapi.
 */
export interface WhgIndexRequest extends WhgRequest {
  /**
   * The index identifier; returns 1 or more linked records.
   */
  whgid?: number;
  /**
   * The index name; exact match unless you are providing whgid.
   */
  name?: string;
  /**
   * The dataset label; exact match.
   */
  dataset?: string;
  /**
   * The GeoNames feature code; exact match; 1 or more 2-letter
   * ISO codes, comma separated.
   */
  ccode?: string;
  /**
   * The GeoNames feature classes; exact match; 1-letter code(s),
   * comma separated.
   */
  fclasses?: string;
  /**
   * Limit search wihtin any timespan of linked records;
   * use '-' for BCE dates, to -9999.
   */
  year?: number;
  /**
   * Limit search within this region or user study area.
   */
  area?: number;
  /**
   * The page size; default is unlimited. Results are not ordered.
   */
  pagesize?: number;
}

/**
 * A service to search WHG.
 */
@Injectable({
  providedIn: 'root',
})
export class WhgService {
  constructor(private _http: HttpClient, private _error: ErrorService) {}

  /**
   * Suggest place names from a name's part.
   * @param request The suggest request.
   * @returns Observable of an array of strings with matching names.
   */
  public suggest(request: WhgSuggestRequest): Observable<string[]> {
    const filteredRequest = Object.entries(request)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    return this._http
      .get<string[]>(WHG_URL + 'search/suggestions/', {
        params: filteredRequest as any,
      })
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }

  /**
   * Search the WHG index.
   * @param request The search request.
   * @returns The search result.
   */
  public search(request: WhgIndexRequest): Observable<GeoJson> {
    const filteredRequest = Object.entries(request)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    return this._http
      .get<GeoJson>(WHG_URL + 'api/index/', {
        params: filteredRequest as any,
      })
      .pipe(
        retry(3),
        catchError((error) => this._error.handleError(error))
      );
  }
}
