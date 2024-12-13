import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError, retry } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';

/**
 * Options for DBPedia keyword lookup.
 */
export interface DbpediaOptions {
  /**
   * The URI for search.
   */
  searchUri?: string;
  /**
   * The URI for prefix search.
   */
  prefixUri?: string;
  /**
   * The maximum number of documents in result.
   */
  limit?: number;
  /**
   * True for a prefix lookup (=match beginning of string rather
   * than whole string).
   */
  prefix?: boolean;
  /**
   * The types filters. These are one or more DBpedia classes from
   * the DBpedia ontology that the results should have. Using this
   * parameter will only retrieve resources of the passed type(s).
   * For instance, you might want to use
   * http://dbpedia.org/ontology/Person for persons,
   * http://dbpedia.org/ontology/Place for places, etc.
   */
  types?: string[];
}

const SEARCH_URI = 'https://lookup.dbpedia.org/api/search';
const PREFIX_URI = 'https://lookup.dbpedia.org/api/prefix';

/**
 * Default options for DBPedia keyword lookup.
 */
export const DBPEDIA_DEFAULT_OPTIONS: DbpediaOptions = {
  searchUri: SEARCH_URI,
  prefixUri: PREFIX_URI,
  limit: 10,
  prefix: true,
};

/**
 * A DBPedia document inside DbpediaResult.
 */
export interface DbpediaDoc {
  score: string[];
  refCount: string[];
  resource: string[];
  redirectLabel: string[];
  typeName: string[];
  comment?: string[];
  label: string[];
  type: string[];
  category: string[];
}

/**
 * Result of DBPedia keyword lookup.
 */
export interface DbpediaResult {
  docs: DbpediaDoc[];
}

/**
 * DBPedia lookup service.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaService {
  constructor(private _http: HttpClient, private _error: ErrorService) {}

  /**
   * Lookup the specified keyword in DBPedia.
   *
   * @param keyword The keyword to lookup.
   * @param options The options.
   * @returns Observable with result.
   */
  public lookup(
    keyword: string,
    options?: DbpediaOptions
  ): Observable<DbpediaResult> {
    const o = Object.assign(DBPEDIA_DEFAULT_OPTIONS, options);

    // query=keyword
    let params = new HttpParams().set('query', keyword);

    // format=json rather than xml
    params = params.set('format', 'json');

    // maxResults=limit
    if (o.limit) {
      params = params.set('maxResults', o.limit.toString());
    }

    // type=...
    if (o.types?.length) {
      o.types.forEach((t) => {
        params = params.append('type', t);
      });
    }

    const url = o.prefix
      ? o.prefixUri || PREFIX_URI
      : o.searchUri || SEARCH_URI;
    return this._http
      .get<DbpediaResult>(url, { params })
      .pipe(retry(3), catchError(this._error.handleError));
  }
}
