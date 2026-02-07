import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError, map, of, retry } from 'rxjs';

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
   * The SPARQL endpoint URI. Default is the public DBpedia SPARQL
   * endpoint at https://dbpedia.org/sparql.
   */
  sparqlUri?: string;
  /**
   * The language code for results (default: 'en').
   * Used by SPARQL-based methods (getResource).
   */
  language?: string;
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
const PREFIX_URI = 'https://lookup.dbpedia.org/api/search';
const SPARQL_URI = 'https://dbpedia.org/sparql';

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
 * A single variable binding in a SPARQL results JSON response.
 */
export interface SparqlBinding {
  type: string;
  value: string;
  'xml:lang'?: string;
  datatype?: string;
}

/**
 * A row in a SPARQL results JSON response.
 */
export interface SparqlResult {
  [variable: string]: SparqlBinding;
}

/**
 * The JSON response from a SPARQL endpoint
 * (application/sparql-results+json).
 */
export interface SparqlResponse {
  head: { vars: string[] };
  results: {
    bindings: SparqlResult[];
  };
}

/**
 * DBPedia lookup service.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
  ) {}

  /**
   * Lookup the specified keyword in DBPedia.
   *
   * @param keyword The keyword to lookup.
   * @param options The options.
   * @returns Observable with result.
   */
  public lookup(
    keyword: string,
    options?: DbpediaOptions,
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

  /**
   * Get a single DBpedia resource by its URI using the SPARQL endpoint.
   * This queries the DBpedia SPARQL endpoint for the resource's label,
   * comment, and ontology types, and returns them as a DbpediaDoc.
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
    // basic URI validation to prevent SPARQL injection
    if (!/^https?:\/\/[^\s>]+$/.test(uri.trim())) {
      return of(undefined);
    }

    const language = options?.language || 'en';
    const sparqlUrl = options?.sparqlUri || SPARQL_URI;
    const escapedUri = uri.trim();

    const query = [
      'SELECT ?label ?comment ?type WHERE {',
      `  <${escapedUri}> rdfs:label ?label .`,
      `  FILTER(LANG(?label) = "${language}")`,
      '  OPTIONAL {',
      `    <${escapedUri}> rdfs:comment ?comment .`,
      `    FILTER(LANG(?comment) = "${language}")`,
      '  }',
      '  OPTIONAL {',
      `    <${escapedUri}> rdf:type ?type .`,
      '    FILTER(STRSTARTS(STR(?type), "http://dbpedia.org/ontology/"))',
      '  }',
      '}',
    ].join('\n');

    return this._http
      .get<SparqlResponse>(sparqlUrl, {
        params: {
          'default-graph-uri': 'http://dbpedia.org',
          query,
          format: 'application/sparql-results+json',
        },
      })
      .pipe(
        retry(3),
        map((response) => {
          const bindings = response.results?.bindings;
          if (!bindings?.length) {
            return undefined;
          }
          const first = bindings[0];
          const label = first['label']?.value;
          if (!label) {
            return undefined;
          }

          // collect distinct ontology types from all bindings
          const typeSet = new Set<string>();
          for (const b of bindings) {
            if (b['type']?.value) {
              typeSet.add(b['type'].value);
            }
          }
          const types = Array.from(typeSet);
          // extract short type names from URIs
          // e.g. "http://dbpedia.org/ontology/City" -> "City"
          const typeNames = types.map((t) => {
            const idx = t.lastIndexOf('/');
            return idx >= 0 ? t.substring(idx + 1) : t;
          });

          return {
            score: ['100'],
            refCount: ['0'],
            resource: [escapedUri],
            redirectLabel: [],
            typeName: typeNames,
            comment: first['comment']?.value ? [first['comment'].value] : [],
            label: [label],
            type: types,
            category: [],
          } as DbpediaDoc;
        }),
        catchError(this._error.handleError),
      );
  }
}
