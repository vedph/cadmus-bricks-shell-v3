import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError, map, of, retry } from 'rxjs';

import { ErrorService } from '@myrmidon/ngx-tools';
import {
  SparqlBinding,
  SparqlQueryOptions,
  SparqlSelectResponse,
  SparqlService,
} from '@myrmidon/cadmus-refs-sparql';

// #region Models

/**
 * Options for DBPedia lookups and SPARQL queries.
 */
export interface DbpediaOptions {
  /**
   * The URI for the DBPedia Lookup API search endpoint.
   */
  searchUri?: string;
  /**
   * The URI for the DBPedia Lookup API prefix search endpoint.
   */
  prefixUri?: string;
  /**
   * The SPARQL endpoint URI. Default is the public DBpedia SPARQL
   * endpoint at https://dbpedia.org/sparql.
   */
  sparqlUri?: string;
  /**
   * The language code for results (default: 'en').
   */
  language?: string;
  /**
   * The maximum number of results to return.
   */
  limit?: number;
  /**
   * True for a prefix match (match beginning of string rather
   * than whole string) when using the Lookup API.
   */
  prefixMatch?: boolean;
  /**
   * Type filters: one or more DBpedia ontology class URIs to restrict
   * results. For instance, http://dbpedia.org/ontology/Person for persons,
   * http://dbpedia.org/ontology/Place for places, etc.
   */
  types?: string[];
  /**
   * When true, the SPARQL search constructs a direct resource URI from
   * the keyword (e.g. "Bracciano" becomes
   * http://dbpedia.org/resource/Bracciano) and queries it directly.
   * This avoids full-text search entirely and is the fastest approach,
   * but only works when the keyword matches the exact resource name.
   */
  directUri?: boolean;
  /**
   * When true, include geo:lat and geo:long in SPARQL queries.
   * Results will populate the latitude and longitude fields.
   */
  includeCoordinates?: boolean;
  /**
   * Proxy URL for CORS bypass. When set, all HTTP requests (both
   * Lookup API and SPARQL) are routed through this proxy. The full
   * target URL is URL-encoded and sent as:
   * GET proxyUrl?uri=<encoded-target-url>
   */
  proxyUrl?: string;
}

const SEARCH_URI = 'https://lookup.dbpedia.org/api/search';
const SPARQL_URI = 'https://dbpedia.org/sparql';
const RESOURCE_URI_PREFIX = 'http://dbpedia.org/resource/';

/**
 * Default options for DBPedia lookups.
 */
export const DBPEDIA_DEFAULT_OPTIONS: DbpediaOptions = {
  searchUri: SEARCH_URI,
  prefixUri: SEARCH_URI,
  sparqlUri: SPARQL_URI,
  language: 'en',
  limit: 10,
  prefixMatch: true,
};

/**
 * A DBPedia document representing a single entity.
 */
export interface DbpediaDoc {
  /**
   * The DBPedia resource URI (e.g. http://dbpedia.org/resource/Rome).
   */
  resource: string;
  /**
   * The display label.
   */
  label: string;
  /**
   * An optional abstract or description.
   */
  description?: string;
  /**
   * Full ontology type URIs (e.g. http://dbpedia.org/ontology/Person).
   */
  types: string[];
  /**
   * Short type names extracted from URIs (e.g. "Person", "City").
   */
  typeNames: string[];
  /**
   * DBPedia categories (dct:subject URIs).
   */
  categories: string[];
  /**
   * Relevance score from the Lookup API.
   */
  score?: number;
  /**
   * Reference count from the Lookup API.
   */
  refCount?: number;
  /**
   * Redirect label from the Lookup API.
   */
  redirectLabel?: string;
  /**
   * WGS84 latitude (when includeCoordinates is true).
   */
  latitude?: number;
  /**
   * WGS84 longitude (when includeCoordinates is true).
   */
  longitude?: number;
}

/**
 * Raw document returned by the DBPedia Lookup API (all fields are arrays).
 */
interface LookupApiDoc {
  score?: string[];
  refCount?: string[];
  resource?: string[];
  redirectLabel?: string[];
  typeName?: string[];
  comment?: string[];
  label?: string[];
  type?: string[];
  category?: string[];
}

/**
 * Raw result returned by the DBPedia Lookup API.
 */
interface LookupApiResult {
  docs: LookupApiDoc[];
}

// #endregion

// URI validation regex: basic check to prevent SPARQL injection.
const URI_PATTERN = /^https?:\/\/[^\s>"'{}|\\^`]+$/;

/**
 * Extracts the short local name from a URI.
 * E.g. "http://dbpedia.org/ontology/City" -> "City".
 */
function extractLocalName(uri: string): string {
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx >= 0) {
    return uri.substring(hashIdx + 1);
  }
  const slashIdx = uri.lastIndexOf('/');
  return slashIdx >= 0 ? uri.substring(slashIdx + 1) : uri;
}

/**
 * Converts a raw Lookup API document to a DbpediaDoc.
 */
function mapLookupDoc(raw: LookupApiDoc): DbpediaDoc {
  const types = raw.type || [];
  return {
    resource: raw.resource?.[0] || '',
    label: raw.label?.[0] || '',
    description: raw.comment?.[0] || undefined,
    types,
    typeNames: raw.typeName?.length
      ? raw.typeName
      : types.map(extractLocalName),
    categories: raw.category || [],
    score: raw.score?.[0] ? parseFloat(raw.score[0]) : undefined,
    refCount: raw.refCount?.[0] ? parseInt(raw.refCount[0], 10) : undefined,
    redirectLabel: raw.redirectLabel?.[0] || undefined,
  };
}

/**
 * Converts a keyword to a DBPedia resource URI.
 * Spaces become underscores, first letter is capitalized.
 */
function keywordToResourceUri(keyword: string): string {
  const name = keyword
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^(.)/, (m) => m.toUpperCase());
  return RESOURCE_URI_PREFIX + encodeURIComponent(name);
}

/**
 * Parse a float from a SPARQL binding value, or return undefined.
 */
function parseOptionalFloat(
  binding: SparqlBinding,
  key: string,
): number | undefined {
  const v = binding[key]?.value;
  if (!v) {
    return undefined;
  }
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

/**
 * DBPedia service providing keyword lookup (via the Lookup API)
 * and SPARQL-based resource retrieval and search.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _sparql: SparqlService,
  ) {}

  /**
   * Lookup the specified keyword using the DBPedia Lookup API.
   * This is a quick, keyword-oriented search that returns scored results.
   *
   * @param keyword The keyword to lookup.
   * @param options Optional settings.
   * @returns Observable with the list of matching documents.
   */
  public lookup(
    keyword: string,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc[]> {
    const o = { ...DBPEDIA_DEFAULT_OPTIONS, ...options };

    let params = new HttpParams().set('query', keyword).set('format', 'json');

    if (o.limit) {
      params = params.set('maxResults', o.limit.toString());
    }

    if (o.types?.length) {
      for (const t of o.types) {
        params = params.append('type', t);
      }
    }

    const url = o.prefixMatch
      ? o.prefixUri || SEARCH_URI
      : o.searchUri || SEARCH_URI;

    // When proxy is configured, build the full target URL and
    // route through the proxy as: GET proxyUrl?uri=<full-url>
    let httpGet: Observable<LookupApiResult>;
    if (o.proxyUrl) {
      const targetUrl = `${url}?${params.toString()}`;
      httpGet = this._http.get<LookupApiResult>(o.proxyUrl, {
        params: new HttpParams().set('uri', targetUrl),
      });
    } else {
      httpGet = this._http.get<LookupApiResult>(url, { params });
    }

    return httpGet.pipe(
      retry(3),
      map((result) => (result.docs || []).map(mapLookupDoc)),
      catchError(this._error.handleError),
    );
  }

  /**
   * Build the SPARQL query string for getResource().
   * Useful for debugging or displaying the query.
   *
   * @param uri The full DBpedia resource URI.
   * @param options Optional settings (language, includeCoordinates).
   * @returns The SPARQL query string, or undefined if the URI is invalid.
   */
  public buildGetResourceQuery(
    uri: string,
    options?: DbpediaOptions,
  ): string | undefined {
    if (!uri?.trim()) {
      return undefined;
    }
    const trimmedUri = uri.trim();
    if (!URI_PATTERN.test(trimmedUri)) {
      return undefined;
    }
    const language = options?.language || 'en';
    const includeCoords = options?.includeCoordinates || false;

    const selectVars = includeCoords
      ? '?label ?abstract ?type ?category ?lat ?long'
      : '?label ?abstract ?type ?category';

    const coordsBlock = includeCoords
      ? [
          '  OPTIONAL {',
          `    <${trimmedUri}> geo:lat ?lat .`,
          `    <${trimmedUri}> geo:long ?long .`,
          '  }',
        ].join('\n')
      : '';

    const prefixes = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX dbo: <http://dbpedia.org/ontology/>',
      'PREFIX dct: <http://purl.org/dc/terms/>',
    ];
    if (includeCoords) {
      prefixes.push(
        'PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>',
      );
    }

    const lines = [
      ...prefixes,
      '',
      `SELECT ${selectVars} WHERE {`,
      `  <${trimmedUri}> rdfs:label ?label .`,
      `  FILTER(LANG(?label) = "${language}")`,
      '  OPTIONAL {',
      `    <${trimmedUri}> dbo:abstract ?abstract .`,
      `    FILTER(LANG(?abstract) = "${language}")`,
      '  }',
      '  OPTIONAL {',
      `    <${trimmedUri}> a ?type .`,
      '    FILTER(STRSTARTS(STR(?type), "http://dbpedia.org/ontology/"))',
      '  }',
      '  OPTIONAL {',
      `    <${trimmedUri}> dct:subject ?category .`,
      '  }',
    ];
    if (coordsBlock) {
      lines.push(coordsBlock);
    }
    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Get a single DBpedia resource by its URI using the SPARQL endpoint.
   * Queries for the resource's label, abstract, ontology types, and
   * categories; optionally also latitude and longitude.
   *
   * @param uri The full DBpedia resource URI
   * (e.g. "http://dbpedia.org/resource/Berlin").
   * @param options Optional settings (sparqlUri, language,
   * includeCoordinates).
   * @returns Observable of the document, or undefined if not found.
   */
  public getResource(
    uri: string,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc | undefined> {
    const query = this.buildGetResourceQuery(uri, options);
    if (!query) {
      return of(undefined);
    }

    const sparqlUrl = options?.sparqlUri || SPARQL_URI;
    const trimmedUri = uri.trim();
    const sparqlOptions: SparqlQueryOptions = {
      defaultGraphUri: 'http://dbpedia.org',
      proxyUrl: options?.proxyUrl,
    };

    return this._sparql.select(sparqlUrl, query, sparqlOptions).pipe(
      map((response: SparqlSelectResponse) => {
        const bindings = response.results?.bindings;
        if (!bindings?.length) {
          return undefined;
        }

        const first = bindings[0];
        const label = first['label']?.value;
        if (!label) {
          return undefined;
        }

        // collect distinct ontology types and categories
        const typeSet = new Set<string>();
        const categorySet = new Set<string>();
        for (const b of bindings) {
          if (b['type']?.value) {
            typeSet.add(b['type'].value);
          }
          if (b['category']?.value) {
            categorySet.add(b['category'].value);
          }
        }

        const types = Array.from(typeSet);
        return {
          resource: trimmedUri,
          label,
          description: first['abstract']?.value || undefined,
          types,
          typeNames: types.map(extractLocalName),
          categories: Array.from(categorySet),
          latitude: parseOptionalFloat(first, 'lat'),
          longitude: parseOptionalFloat(first, 'long'),
        };
      }),
    );
  }

  /**
   * Build the SPARQL query string for search().
   * Useful for debugging or displaying the query.
   *
   * When directUri is true, constructs a direct resource URI from the
   * keyword and queries it directly (fastest, no full-text search).
   *
   * Otherwise, uses FILTER(CONTAINS(...)) on the URI string, which is
   * much faster than bif:contains on labels because DBPedia resource
   * URIs mirror Wikipedia article titles. Type constraints and language
   * filters are placed BEFORE the text match for optimal Virtuoso
   * performance.
   *
   * @param keyword The keyword to search for.
   * @param options Optional settings (language, limit, types, directUri,
   * includeCoordinates).
   * @returns The SPARQL query string, or undefined if keyword is empty.
   */
  public buildSearchQuery(
    keyword: string,
    options?: DbpediaOptions,
  ): string | undefined {
    if (!keyword?.trim()) {
      return undefined;
    }
    const o = { ...DBPEDIA_DEFAULT_OPTIONS, ...options };
    const language = o.language || 'en';
    const limit = o.limit || 10;
    const includeCoords = o.includeCoordinates || false;

    const prefixes = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX dbo: <http://dbpedia.org/ontology/>',
    ];
    if (includeCoords) {
      prefixes.push(
        'PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>',
      );
    }

    // Direct URI mode: construct URI and query it directly
    if (o.directUri) {
      const resourceUri = keywordToResourceUri(keyword);
      const selectVars = includeCoords
        ? '?label ?abstract ?lat ?long'
        : '?label ?abstract';

      const lines = [
        ...prefixes,
        '',
        `SELECT ${selectVars} WHERE {`,
        `  <${resourceUri}> rdfs:label ?label .`,
        `  FILTER(LANG(?label) = "${language}")`,
        '  OPTIONAL {',
        `    <${resourceUri}> dbo:abstract ?abstract .`,
        `    FILTER(LANG(?abstract) = "${language}")`,
        '  }',
      ];
      if (includeCoords) {
        lines.push(
          '  OPTIONAL {',
          `    <${resourceUri}> geo:lat ?lat .`,
          `    <${resourceUri}> geo:long ?long .`,
          '  }',
        );
      }
      lines.push('}');
      return lines.join('\n');
    }

    // URI-based search: FILTER on the resource URI string.
    // DBPedia resource URIs mirror Wikipedia article titles, so
    // filtering on the URI is fast and avoids full-text index scans.
    const sanitized = keyword
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[\\'"]/g, '\\$&');

    const selectVars = includeCoords
      ? '?uri ?label ?abstract ?lat ?long'
      : '?uri ?label ?abstract';

    // Type constraints go first for optimal Virtuoso execution
    const typeLines =
      o.types?.length
        ? o.types.map((t) => `  ?uri a <${t}> .`)
        : [];

    const lines = [
      ...prefixes,
      '',
      `SELECT DISTINCT ${selectVars} WHERE {`,
      ...typeLines,
      `  ?uri rdfs:label ?label .`,
      `  FILTER(LANG(?label) = "${language}")`,
      `  FILTER(CONTAINS(STR(?uri), "${sanitized}"))`,
      '  OPTIONAL {',
      '    ?uri dbo:abstract ?abstract .',
      `    FILTER(LANG(?abstract) = "${language}")`,
      '  }',
    ];
    if (includeCoords) {
      lines.push(
        '  OPTIONAL {',
        '    ?uri geo:lat ?lat .',
        '    ?uri geo:long ?long .',
        '  }',
      );
    }
    lines.push('}', `LIMIT ${limit}`);
    return lines.join('\n');
  }

  /**
   * Search DBPedia using SPARQL.
   *
   * When directUri is true, constructs a resource URI from the keyword
   * and queries it directly (fastest, exact match only).
   *
   * Otherwise, filters on the resource URI string using
   * FILTER(CONTAINS(STR(?uri), ...)), which is much faster than
   * searching on labels.
   *
   * @param keyword The keyword to search for.
   * @param options Optional settings (sparqlUri, language, limit, types,
   * directUri, includeCoordinates).
   * @returns Observable with the list of matching documents.
   */
  public search(
    keyword: string,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc[]> {
    const query = this.buildSearchQuery(keyword, options);
    if (!query) {
      return of([]);
    }

    const o = { ...DBPEDIA_DEFAULT_OPTIONS, ...options };
    const sparqlUrl = o.sparqlUri || SPARQL_URI;

    const sparqlOptions: SparqlQueryOptions = {
      defaultGraphUri: 'http://dbpedia.org',
      proxyUrl: o.proxyUrl,
    };

    return this._sparql.select(sparqlUrl, query, sparqlOptions).pipe(
      map((response: SparqlSelectResponse) => {
        return (response.results?.bindings || []).map(
          (b: SparqlBinding) => {
            // direct URI mode returns no ?uri variable
            const resource =
              b['uri']?.value ||
              (o.directUri ? keywordToResourceUri(keyword) : '');
            return {
              resource,
              label: b['label']?.value || '',
              description: b['abstract']?.value || undefined,
              types: [],
              typeNames: [],
              categories: [],
              latitude: parseOptionalFloat(b, 'lat'),
              longitude: parseOptionalFloat(b, 'long'),
            };
          },
        );
      }),
    );
  }

  /**
   * Execute an arbitrary SPARQL SELECT query against the configured
   * (or default) DBPedia SPARQL endpoint. Useful for testing and
   * debugging custom queries.
   *
   * @param query The raw SPARQL query string.
   * @param options Optional settings (sparqlUri).
   * @returns Observable with the raw SPARQL SELECT response.
   */
  public rawQuery(
    query: string,
    options?: DbpediaOptions,
  ): Observable<SparqlSelectResponse> {
    const sparqlUrl = options?.sparqlUri || SPARQL_URI;
    const sparqlOptions: SparqlQueryOptions = {
      defaultGraphUri: 'http://dbpedia.org',
      proxyUrl: options?.proxyUrl,
    };
    return this._sparql.select(sparqlUrl, query, sparqlOptions);
  }
}
