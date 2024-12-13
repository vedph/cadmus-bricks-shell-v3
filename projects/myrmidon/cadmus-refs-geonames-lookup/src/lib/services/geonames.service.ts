import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, retry } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';

/**
 * A GeoNames request.
 */
export interface GeoNamesRequest {
  url?: string;
  userName: string;
}

/**
 * GeoNames search types.
 */
export enum GeoNamesSearchType {
  query = 0,
  name,
  nameEquals,
  nameStartsWith,
}

/**
 * A GeoNames bounding box.
 */
export interface GeoNamesBBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * A GeoNames search request.
 * See https://www.geonames.org/export/geonames-search.html.
 */
export interface GeoNamesSearchRequest extends GeoNamesRequest {
  /**
   * The type of search. This maps to parameter q, name, name_equals,
   * or name_startsWith.
   */
  searchType: GeoNamesSearchType;
  /**
   * The text to search for, which is the value of the parameter specified
   * by searchType.
   */
  text: string;
  /**
   * The maximum number of rows to return. Default is 100.
   */
  maxRows?: number;
  /**
   * The start row. Default is 0.
   */
  startRow?: number;
  /**
   * The countries to search in. If not specified, all countries are searched.
   * ISO 3166-1 alpha-2 codes. This maps to the parameter country, which can
   * be repeated.
   */
  countries?: string[];
  /**
   * The country bias. ISO 3166-1 alpha-2 code. Records from the country bias
   * are listed first in the search result. Default is no bias.
   */
  countryBias?: string;
  /**
   * The continent code.
   */
  continentCode?: 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA' | 'AN';
  /**
   * The administrative division code 1.
   */
  adminCode1?: string;
  /**
   * The administrative division code 2.
   */
  adminCode2?: string;
  /**
   * The administrative division code 3.
   */
  adminCode3?: string;
  /**
   * The administrative division code 4.
   */
  adminCode4?: string;
  /**
   * The administrative division code 5.
   */
  adminCode5?: string;
  /**
   * The feature class codes in a string. Each feature class is encoded
   * by a single character. Default is all feature classes. Allowed characters
   * are:
   * - A (administrative divisions: country, state, region...)
   * - H (hydrographic features: oceans, rivers, lakes...),
   * - L (landscapes: parks, areas...)
   * - P (populated places: city, village...)
   * - R (roads: road, railroad...)
   * - S (spots: building, farm...)
   * - T (terrains: mountain, hill, rock...)
   * - U (undersea)
   * - V (vegetation: forest, heath...)
   * This maps to the parameter featureClass, which can be repeated.
   */
  featureClasses?: string;
  /**
   * The feature codes. The default is all feature codes.
   * See https://www.geonames.org/export/codes.html.
   * This maps to the parameter featureCode, which can be repeated.
   */
  featureCodes?: string[];
  /**
   * The cities, used to categorize the populated places into three groups
   * according to size/relevance.
   */
  cities?: 'cities1000' | 'cities5000' | 'cities15000';
  /**
   * Language of returned 'name' element (the pseudo language code 'local'
   * will return it in local language). Default value is 'local', else
   * use ISO-639 2-letter language code.
   */
  lang?: string;
  /**
   * The language to limit the search to. This will only consider names
   * in the specified language, and is used in combination with the name
   * parameter.
   */
  searchLang?: string;
  /**
   * The requested format type for the result. Default is XML.
   */
  type?: 'xml' | 'json' | 'rdf';
  /**
   * Verbosity of the result.
   */
  style?: 'SHORT' | 'MEDIUM' | 'LONG' | 'FULL';
  /**
   * At least one of the search term needs to be part of the place name.
   * Example: A normal search for Berlin will return all places within
   * the state of Berlin. If we only want to find places with 'Berlin'
   * in the name we set the parameter isNameRequired to 'true'. The difference
   * to the name_equals parameter is that this will allow searches for
   * 'Berlin, Germany' as only one search term needs to be part of the name.
   */
  isNameRequired?: boolean;
  /**
   * Search toponyms tagged with the specified tag. GeoNames is using a
   * simple tagging system. Every user can tag places. In contrast to the
   * feature codes and feature classes which are one-dimensional (a place
   * name can only have one feature code) several tags can be used for each
   * place name. If you want to search for tags of a particular user,
   * append <c>@username</c> to the tag.
   */
  tag?: string;
  /**
   * The operator to use when combining multiple search terms.
   */
  operator?: 'AND' | 'OR';
  /**
   * The charset to use for the result. Default is UTF-8.
   */
  charset?: string;
  /**
   * The fuzziness of the search terms, ranging from 0 to 1. Only for
   * the name attribute.
   */
  fuzzy?: number;
  /**
   * The bounding box to search in.
   */
  bbox?: GeoNamesBBox;
  /**
   * In combination with the name_startsWith, if set to 'relevance' then
   * the result is sorted by relevance.
   */
  orderBy?: 'relevance' | 'population' | 'elevation';
  /**
   * Include Bbox info, regardless of style setting. Normally only
   * included with style=FULL.
   */
  inclBbox?: boolean;
}

/**
 * A GeoNames toponym.
 */
export interface GeoNamesToponym {
  geonameId: number;
  lat: number;
  lng: number;
  name: string;
  toponymName: string;
  alternateNames?: string[];
  numberOfChildren?: number;
  fcl?: string;
  fclName?: string;
  fcode?: string;
  fcodeName?: string;
  continentCode?: string;
  countryId?: string;
  countryCode?: string;
  countryName?: string;
  adminCode1?: string;
  adminName1?: string;
  adminCode2?: string;
  adminName2?: string;
  adminCode3?: string;
  adminName3?: string;
  adminCode4?: string;
  adminName4?: string;
  adminCode5?: string;
  adminName5?: string;
  timezone?: string;
  population?: number;
  elevation?: number;
}

/**
 * The result of a GeoNames search.
 */
export interface GeoNamesSearchResult {
  totalResultsCount: number;
  geonames: GeoNamesToponym[];
}

const GEONAMES_URL = 'https://secure.geonames.org/';

/**
 * A service to search GeoNames.
 */
@Injectable({
  providedIn: 'root',
})
export class GeoNamesService {
  constructor(private _http: HttpClient, private _error: ErrorService) {}

  /**
   * Search GeoNames for toponyms.
   * @param request The search request.
   * @returns The search result.
   */
  public search(
    request: GeoNamesSearchRequest
  ): Observable<GeoNamesSearchResult> {
    // adapt request to query parameters
    const r: any = Object.assign({}, request);
    delete r.searchType;
    delete r.text;
    delete r.url;
    if (request.bbox) {
      r.north = request.bbox.north;
      r.south = request.bbox.south;
      r.east = request.bbox.east;
      r.west = request.bbox.west;
    }

    switch (request.searchType) {
      case GeoNamesSearchType.query:
        r.q = request.text;
        break;
      case GeoNamesSearchType.name:
        r.name = request.text;
        break;
      case GeoNamesSearchType.nameEquals:
        r.name_equals = request.text;
        break;
      case GeoNamesSearchType.nameStartsWith:
        r.name_startsWith = request.text;
        break;
    }

    // remove undefined values
    const filteredParams = Object.fromEntries(
      Object.entries(r)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    );

    console.log(`${request.url || GEONAMES_URL}search: `, filteredParams);

    return this._http
      .get<GeoNamesSearchResult>((request.url || GEONAMES_URL) + 'search', {
        params: { ...filteredParams },
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
