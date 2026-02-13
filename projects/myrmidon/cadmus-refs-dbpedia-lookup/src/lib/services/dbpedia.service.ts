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
}

const SEARCH_URI = 'https://lookup.dbpedia.org/api/search';
const SPARQL_URI = 'https://dbpedia.org/sparql';

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
 * E.g. "http://dbpedia.org/ontology/City" → "City".
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

    return this._http.get<LookupApiResult>(url, { params }).pipe(
      retry(3),
      map((result) => (result.docs || []).map(mapLookupDoc)),
      catchError(this._error.handleError),
    );
  }

  /**
   * Get a single DBpedia resource by its URI using the SPARQL endpoint.
   * Queries for the resource's label, abstract, ontology types, and
   * categories.
   *
   * @param uri The full DBpedia resource URI
   * (e.g. "http://dbpedia.org/resource/Berlin").
   * @param options Optional settings (sparqlUri, language).
   * @returns Observable of the document, or undefined if not found.
   */
  public getResource(
    uri: string,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc | undefined> {
    if (!uri?.trim()) {
      return of(undefined);
    }
    const trimmedUri = uri.trim();
    if (!URI_PATTERN.test(trimmedUri)) {
      return of(undefined);
    }

    const language = options?.language || 'en';
    const sparqlUrl = options?.sparqlUri || SPARQL_URI;

    const query = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX dbo: <http://dbpedia.org/ontology/>',
      'PREFIX dct: <http://purl.org/dc/terms/>',
      '',
      'SELECT ?label ?abstract ?type ?category WHERE {',
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
      '}',
    ].join('\n');

    const sparqlOptions: SparqlQueryOptions = {
      defaultGraphUri: 'http://dbpedia.org',
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
        };
      }),
    );
  }

  /**
   * Search DBPedia using SPARQL with Virtuoso's full-text index
   * (bif:contains). This is more flexible than the Lookup API and
   * supports type filtering directly in the query.
   *
   * @param keyword The keyword to search for.
   * @param options Optional settings (sparqlUri, language, limit, types).
   * @returns Observable with the list of matching documents.
   */
  public search(
    keyword: string,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc[]> {
    if (!keyword?.trim()) {
      return of([]);
    }

    const o = { ...DBPEDIA_DEFAULT_OPTIONS, ...options };
    const language = o.language || 'en';
    const sparqlUrl = o.sparqlUri || SPARQL_URI;
    const limit = o.limit || 10;

    // Sanitize keyword for bif:contains: escape double quotes
    const sanitized = keyword.trim().replace(/"/g, '\\"');

    const typeFilter = o.types?.length
      ? o.types.map((t) => `  ?uri a <${t}> .`).join('\n')
      : '';

    const query = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'PREFIX dbo: <http://dbpedia.org/ontology/>',
      '',
      'SELECT DISTINCT ?uri ?label ?abstract WHERE {',
      '  ?uri rdfs:label ?label .',
      `  ?label bif:contains '"${sanitized}"' .`,
      `  FILTER(LANG(?label) = "${language}")`,
      typeFilter,
      '  OPTIONAL {',
      '    ?uri dbo:abstract ?abstract .',
      `    FILTER(LANG(?abstract) = "${language}")`,
      '  }',
      '}',
      `LIMIT ${limit}`,
    ].join('\n');

    const sparqlOptions: SparqlQueryOptions = {
      defaultGraphUri: 'http://dbpedia.org',
    };

    return this._sparql.select(sparqlUrl, query, sparqlOptions).pipe(
      map((response: SparqlSelectResponse) => {
        return (response.results?.bindings || []).map((b: SparqlBinding) => ({
          resource: b['uri']?.value || '',
          label: b['label']?.value || '',
          description: b['abstract']?.value || undefined,
          types: [],
          typeNames: [],
          categories: [],
        }));
      }),
    );
  }
}
