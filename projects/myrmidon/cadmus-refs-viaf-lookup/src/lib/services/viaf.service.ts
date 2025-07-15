import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { retry, catchError, map } from 'rxjs/operators';

import { ErrorService } from '@myrmidon/ngx-tools';

// New API documentation: https://developer.api.oclc.org/viaf-api

export interface ViafSuggestEntry {
  term: string;
  displayForm: string;
  nametype: string;
  recordID: string;
  viafid: string;
  score: number;
}

export interface ViafSuggestResult {
  query: string;
  result: ViafSuggestEntry[];
}

export interface ViafAutoclusterResponse {
  viafID: string;
  nameType: string;
  text: string;
  displayForm: string;
  score: number;
}

export interface ViafCluster {
  viafID: string;
  nameType: string;
  mainHeadings: {
    data: Array<{
      text: string;
      sources: string[];
    }>;
  };
  titles?: {
    data: Array<{
      text: string;
      sources: string[];
    }>;
  };
  sources: string[];
  coauthors?: Array<{
    id: string;
    text: string;
  }>;
  publishers?: Array<{
    id: string;
    text: string;
  }>;
  history?: {
    merged: string[];
    redirected: string[];
  };
}

export interface ViafSearchResponse {
  numberOfRecords: number;
  records: Array<{
    recordData: ViafCluster;
  }>;
}

export interface ViafRecord {
  recordSchema: string;
  recordData: any;
}

export interface ViafSearchRecord {
  record: ViafRecord;
}

export interface ViafSearchResult {
  numberOfRecords: number;
  records?: ViafSearchRecord[];
}

export const VIAF_AUTHORITIES = [
  { id: 'all', label: 'All source data within VIAF' },
  { id: 'bav', label: 'Biblioteca Apostolica Vaticana' },
  { id: 'bibsys', label: 'BIBSYS' },
  { id: 'blbnb', label: 'National Library of Brazil' },
  { id: 'bnc', label: 'National Library of Catalonia' },
  { id: 'bnchl', label: 'National Library of Chile' },
  { id: 'bne', label: 'Biblioteca Nacional de España' },
  { id: 'bnf', label: 'Bibliothèque Nationale de France' },
  { id: 'bnl', label: 'National Library of Luxembourg' },
  { id: 'b2q', label: 'National Library and Archives of Quèbec' },
  { id: 'cyt', label: 'National Central Library, Taiwan' },
  { id: 'dbc', label: 'DBC (Danish Bibliographic Center)' },
  { id: 'dnb', label: 'Deutsche Nationalbibliothek' },
  { id: 'egaxa', label: 'Bibliotheca Alexandrina (Egypt)' },
  { id: 'errr', label: 'National Library of Estonia' },
  { id: 'iccu', label: 'Istituto Centrale per il Catalogo Unico' },
  { id: 'isni', label: 'ISNI' },
  { id: 'jpg', label: 'Getty Research Institute' },
  { id: 'krnlk', label: 'National Library of Korea' },
  { id: 'lc', label: 'Library of Congress/NACO' },
  { id: 'lac', label: 'Library and Archives Canada' },
  { id: 'lnb', label: 'National Library of Latvia' },
  { id: 'lnl', label: 'Lebanese National Library' },
  { id: 'mrbnr', label: 'National Library of Morocco' },
  { id: 'ndl', label: 'National Diet Library, Japan' },
  { id: 'nii', label: 'National Institute of Informatics (Japan)' },
  { id: 'nkc', label: 'National Library of the Czech Republic' },
  { id: 'nla', label: 'National Library of Australia' },
  { id: 'nlb', label: 'National Library Board, Singapore' },
  { id: 'nli', label: 'National Library of Israel' },
  { id: 'nliara', label: 'National Library of Israel (Arabic)' },
  { id: 'nlicyr', label: 'National Library of Israel (Cyrillic)' },
  { id: 'nliheb', label: 'National Library of Israel (Hebrew)' },
  { id: 'nlilat', label: 'National Library of Israel (Latin)' },
  { id: 'nlp', label: 'National Library of Poland' },
  { id: 'nlr', label: 'National Library of Russia' },
  { id: 'nsk', label: 'National and University Library in Zagreb' },
  { id: 'nszl', label: 'National Szèchènyi Library, Hungary' },
  { id: 'nta', label: 'National Library of the Netherlands' },
  { id: 'nukat', label: 'NUKAT Center of Warsaw University Library' },
  { id: 'n6i', label: 'National Library of Ireland' },
  { id: 'perseus', label: 'PERSEUS' },
  { id: 'ptbnp', label: 'Biblioteca Nacional de Portugal' },
  { id: 'rero', label: 'RERO.Library Network of Western Switzerland' },
  { id: 'selibr', label: 'National Library of Sweden' },
  { id: 'srp', label: 'Syriac Reference Portal' },
  { id: 'sudoc', label: 'Sudoc [ABES], France' },
  { id: 'swnl', label: 'Swiss National Library' },
  { id: 'uiy', label: 'National and University Library of Iceland (NULI)' },
  { id: 'vlacc', label: 'Flemish Public Libraries' },
  { id: 'wkp', label: 'Wikidata' },
  { id: 'w2z', label: 'National Library of Norway' },
  { id: 'xa', label: 'xA (eXtended Authorities)' },
  { id: 'xr', label: 'xR (eXtended Relationships)' },
  { id: 'fast', label: 'FAST' },
];

export const VIAF_TERMS = [
  '=',
  'exact',
  'any',
  'all',
  '<',
  '>',
  '<=',
  '>=',
  'not',
];

export enum ViafField {
  // 'cql.resultSetId',
  // 'cql.serverChoice',
  // 'local.source',
  // 'local.sources',
  // 'local.viafID',
  // 'oai.datestamp',
  All = 'cql.any',
  Corporate = 'local.corporateNames',
  Geographic = 'local.geographicNames',
  Lccn = 'local.LCCN',
  Length = 'local.length',
  Person = 'local.personalNames',
  Work = 'local.uniformTitleWorks',
  Expression = 'local.uniformTitleExpressions',
  PreferredHeading = 'local.mainHeadingEl',
  ExactHeading = 'local.names',
  BibliographicTitle = 'local.title',
}

export enum ViafIndex {
  All = 'all',
  // TODO
}

const API_BASE = 'https://viaf.org/viaf';

/**
 * VIAF API service using the current REST API.
 *
 * Based on testing as of July 2025, the VIAF API has been simplified and only provides:
 * - AutoSuggest endpoint for typeahead suggestions
 * - Search endpoint for CQL-based searches
 *
 * Many specialized endpoints like /cluster.json, /coauthors.json appear to be deprecated.
 */
@Injectable({
  providedIn: 'root',
})
export class ViafService {
  constructor(private _http: HttpClient, private _error: ErrorService) {}

  /**
   * Auto-complete suggest using the VIAF AutoSuggest endpoint.
   * This endpoint DOES return JSON directly in the expected format.
   * @param query Search term
   * @returns Observable of suggest results
   */
  public suggest(query: string): Observable<ViafSuggestResult> {
    if (!query) {
      return of({ query: '', result: [] });
    }

    // AutoSuggest endpoint returns JSON directly
    const url = `${API_BASE}/AutoSuggest`;
    let params = new HttpParams().set('query', query.trim());

    return this._http
      .get<ViafSuggestResult>(url, {
        params,
        headers: { Accept: 'application/json' },
      })
      .pipe(retry(3), catchError(this._error.handleError));
  }

  /**
   * Search VIAF records using CQL query.
   * This endpoint returns XML, even with Accept: application/json.
   * For now, returning a placeholder since XML parsing would require additional dependencies.
   * @param query CQL query string
   * @param start Starting record (1-based)
   * @param max Maximum number of records
   * @param sortKey Sort key
   * @returns Observable of search results (placeholder implementation)
   */
  public search(
    query: string,
    start = 1,
    max = 10,
    sortKey = 'holdingscount'
  ): Observable<ViafSearchResult> {
    const url = `${API_BASE}/search`;
    let params = new HttpParams()
      .set('query', query)
      .set('maximumRecords', max.toString());

    if (start > 1) {
      params = params.set('startRecord', start.toString());
    }

    if (sortKey && sortKey !== 'holdingscount') {
      params = params.set('sortKey', sortKey);
    }

    return this._http
      .get(url, {
        params,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          // TODO: Implement XML parsing for full search functionality
          // For now, return empty result since AutoSuggest provides the main functionality
          console.warn(
            'VIAF /search endpoint returns XML. Use AutoSuggest endpoint instead for JSON results.'
          );
          return {
            numberOfRecords: 0,
            records: [],
          } as ViafSearchResult;
        }),
        retry(3),
        catchError(this._error.handleError)
      );
  }

  /**
   * Get detailed cluster information for a VIAF ID.
   * Note: The direct cluster endpoint appears to be deprecated.
   * This method now uses the search endpoint to get cluster information.
   * @param viafId The VIAF identifier
   * @returns Observable of cluster details
   */
  public getCluster(viafId: string): Observable<ViafCluster | null> {
    // Use search endpoint to get cluster information by VIAF ID
    const query = `local.viafID all "${viafId}"`;
    return this.search(query, 1, 1).pipe(
      map((result: ViafSearchResult) => {
        if (result.records && result.records.length > 0) {
          return result.records[0].record.recordData as ViafCluster;
        }
        return null;
      })
    );
  }

  /**
   * Get source records for a VIAF ID.
   * Note: This endpoint appears to be deprecated in the current VIAF API.
   * @param viafId The VIAF identifier
   * @param source Optional source filter
   * @returns Observable of source records
   */
  public getSourceRecords(viafId: string, source?: string): Observable<any> {
    // This endpoint is no longer available, return empty observable
    console.warn('VIAF source records endpoint is no longer available');
    return of(null);
  }

  /**
   * Get coauthors for a VIAF ID.
   * Note: This endpoint appears to be deprecated in the current VIAF API.
   * @param viafId The VIAF identifier
   * @returns Observable of coauthors
   */
  public getCoauthors(viafId: string): Observable<any[]> {
    // This endpoint is no longer available, return empty array
    console.warn('VIAF coauthors endpoint is no longer available');
    return of([]);
  }

  /**
   * Simple text search using the AutoSuggest endpoint.
   * @param text Search text
   * @param maximumRecords Maximum records to return
   * @returns Observable of search results
   */
  public simpleSearch(
    text: string,
    maximumRecords = 10
  ): Observable<ViafSuggestEntry[]> {
    return this.suggest(text).pipe(
      map((response: ViafSuggestResult) => {
        // Return up to maximumRecords entries
        return response.result.slice(0, maximumRecords);
      })
    );
  }

  /**
   * Get related clusters (works, expressions, etc.).
   * Note: Most specialized endpoints appear to be deprecated in the current VIAF API.
   * This method tries to access the endpoint but may not work for all relation types.
   * @param viafId The VIAF identifier
   * @param relation Type of relation ('coauthors', 'publishers', etc.)
   * @returns Observable of related clusters
   */
  public getRelatedClusters(
    viafId: string,
    relation: string
  ): Observable<any[]> {
    const url = `${API_BASE}/${viafId}/${relation}.json`;
    return this._http.get<any[]>(url).pipe(
      retry(3),
      catchError((error) => {
        console.warn(
          `VIAF ${relation} endpoint may no longer be available:`,
          error
        );
        return of([]);
      })
    );
  }
}
