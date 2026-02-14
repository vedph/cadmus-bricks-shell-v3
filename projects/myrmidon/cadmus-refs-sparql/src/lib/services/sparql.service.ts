import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError, map, retry, timer } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';

import {
  SparqlAskResponse,
  SparqlQueryOptions,
  SparqlSelectResponse,
} from '../models';

/**
 * Generic, reusable service for querying any SPARQL endpoint.
 * Returns typed W3C SPARQL 1.1 JSON results.
 *
 * Supports an optional proxy URL for CORS bypass: when
 * `options.proxyUrl` is set, the full target URL is encoded and
 * sent as `GET proxyUrl?uri=<encoded-target-url>`.
 */
@Injectable({
  providedIn: 'root',
})
export class SparqlService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService
  ) {}

  private _buildTargetUrl(
    endpoint: string,
    query: string,
    options?: SparqlQueryOptions
  ): string {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('format', 'application/sparql-results+json');
    if (options?.defaultGraphUri) {
      params.set('default-graph-uri', options.defaultGraphUri);
    }
    return `${endpoint}?${params.toString()}`;
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

  private _doGet<T>(
    endpoint: string,
    query: string,
    options?: SparqlQueryOptions
  ): Observable<HttpResponse<T>> {
    if (options?.proxyUrl) {
      // Proxy mode: build full target URL, encode it, send via proxy
      const targetUrl = this._buildTargetUrl(endpoint, query, options);
      return this._http.get<T>(options.proxyUrl, {
        params: { uri: targetUrl },
        headers: new HttpHeaders({
          Accept: 'application/sparql-results+json',
        }),
        observe: 'response',
      });
    }

    // Direct mode: send params to the endpoint directly
    const params: Record<string, string> = {
      query,
      format: 'application/sparql-results+json',
    };
    if (options?.defaultGraphUri) {
      params['default-graph-uri'] = options.defaultGraphUri;
    }
    return this._http.get<T>(endpoint, {
      params,
      headers: new HttpHeaders({
        Accept: 'application/sparql-results+json',
      }),
      observe: 'response',
    });
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
    return this._doGet<SparqlSelectResponse>(endpoint, query, options).pipe(
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
    return this._doGet<SparqlAskResponse>(endpoint, query, options).pipe(
      retry(this._getRetryConfig(options)),
      map((response: HttpResponse<SparqlAskResponse>) => {
        return response.body!.boolean;
      }),
      catchError(this._error.handleError)
    );
  }
}
