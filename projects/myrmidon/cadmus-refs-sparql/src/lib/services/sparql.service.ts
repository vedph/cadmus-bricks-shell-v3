import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError, delay, map, of, retry, timer } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';

import {
  SparqlAskResponse,
  SparqlQueryOptions,
  SparqlSelectResponse,
} from '../models';

/**
 * Generic, reusable service for querying any SPARQL endpoint.
 * Returns typed W3C SPARQL 1.1 JSON results.
 */
@Injectable({
  providedIn: 'root',
})
export class SparqlService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService
  ) {}

  private _buildParams(
    query: string,
    options?: SparqlQueryOptions
  ): Record<string, string> {
    const params: Record<string, string> = {
      query,
      format: 'application/sparql-results+json',
    };
    if (options?.defaultGraphUri) {
      params['default-graph-uri'] = options.defaultGraphUri;
    }
    return params;
  }

  private _getRetryConfig(options?: SparqlQueryOptions): {
    count: number;
    delay: (error: any, retryCount: number) => Observable<number>;
  } {
    const maxRetries = options?.maxRetries ?? 2;
    const retryDelay = options?.retryDelay ?? 1000;
    return {
      count: maxRetries,
      delay: (_error: any, retryCount: number) => {
        // exponential backoff: retryDelay * 2^(retryCount-1)
        const ms = retryDelay * Math.pow(2, retryCount - 1);
        return timer(ms);
      },
    };
  }

  private _checkPartialResults(response: HttpResponse<any>): void {
    // Virtuoso may truncate results silently.
    // X-SPARQL-MaxRows indicates row-limit truncation.
    // X-SQL-State: S1TAT indicates a query timeout with partial results.
    const maxRows = response.headers.get('X-SPARQL-MaxRows');
    const sqlState = response.headers.get('X-SQL-State');
    if (maxRows) {
      console.warn(
        `SPARQL results truncated to ${maxRows} rows (server row limit)`
      );
    }
    if (sqlState === 'S1TAT') {
      console.warn(
        'SPARQL query timed out — results may be partial'
      );
    }
  }

  /**
   * Execute a SPARQL SELECT query against the given endpoint.
   *
   * @param endpoint The SPARQL endpoint URL.
   * @param query The SPARQL SELECT query string.
   * @param options Optional query options.
   * @returns Observable of the SELECT response.
   */
  public select(
    endpoint: string,
    query: string,
    options?: SparqlQueryOptions
  ): Observable<SparqlSelectResponse> {
    return this._http
      .get<SparqlSelectResponse>(endpoint, {
        params: this._buildParams(query, options),
        headers: new HttpHeaders({
          Accept: 'application/sparql-results+json',
        }),
        observe: 'response',
      })
      .pipe(
        retry(this._getRetryConfig(options)),
        map((response: HttpResponse<SparqlSelectResponse>) => {
          this._checkPartialResults(response);
          return response.body!;
        }),
        catchError(this._error.handleError)
      );
  }

  /**
   * Execute a SPARQL ASK query against the given endpoint.
   *
   * @param endpoint The SPARQL endpoint URL.
   * @param query The SPARQL ASK query string.
   * @param options Optional query options.
   * @returns Observable of the boolean result.
   */
  public ask(
    endpoint: string,
    query: string,
    options?: SparqlQueryOptions
  ): Observable<boolean> {
    return this._http
      .get<SparqlAskResponse>(endpoint, {
        params: this._buildParams(query, options),
        headers: new HttpHeaders({
          Accept: 'application/sparql-results+json',
        }),
        observe: 'response',
      })
      .pipe(
        retry(this._getRetryConfig(options)),
        map((response: HttpResponse<SparqlAskResponse>) => {
          return response.body!.boolean;
        }),
        catchError(this._error.handleError)
      );
  }
}
