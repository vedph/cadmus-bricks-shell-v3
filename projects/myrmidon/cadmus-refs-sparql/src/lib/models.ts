/**
 * W3C SPARQL 1.1 Query Results JSON Format type definitions.
 * @see https://www.w3.org/TR/sparql11-results-json/
 */

/**
 * The type of a SPARQL term in a JSON result binding.
 */
export type SparqlTermType = 'uri' | 'literal' | 'bnode';

/**
 * A URI term in a SPARQL JSON result.
 */
export interface SparqlUriTerm {
  type: 'uri';
  value: string;
}

/**
 * A literal term in a SPARQL JSON result.
 * May include a language tag or a datatype URI.
 */
export interface SparqlLiteralTerm {
  type: 'literal';
  value: string;
  'xml:lang'?: string;
  datatype?: string;
}

/**
 * A blank node term in a SPARQL JSON result.
 */
export interface SparqlBnodeTerm {
  type: 'bnode';
  value: string;
}

/**
 * A single term in a SPARQL JSON result binding (discriminated union).
 */
export type SparqlTerm = SparqlUriTerm | SparqlLiteralTerm | SparqlBnodeTerm;

/**
 * A single row in a SPARQL SELECT result: variable name to term.
 */
export interface SparqlBinding {
  [variable: string]: SparqlTerm;
}

/**
 * The response from a SPARQL SELECT query
 * (W3C SPARQL 1.1 Query Results JSON Format).
 */
export interface SparqlSelectResponse {
  head: {
    vars: string[];
    link?: string[];
  };
  results: {
    bindings: SparqlBinding[];
  };
}

/**
 * The response from a SPARQL ASK query.
 */
export interface SparqlAskResponse {
  head: Record<string, never>;
  boolean: boolean;
}

/**
 * Union of possible SPARQL JSON responses.
 */
export type SparqlResponse = SparqlSelectResponse | SparqlAskResponse;

/**
 * Options for a SPARQL query request.
 */
export interface SparqlQueryOptions {
  /**
   * The default graph URI.
   */
  defaultGraphUri?: string;
  /**
   * Maximum retry attempts on transient failure (default: 2).
   */
  maxRetries?: number;
  /**
   * Initial retry delay in ms, doubled on each retry (default: 1000).
   */
  retryDelay?: number;
  /**
   * Proxy URL for CORS bypass. When set, the full target URL (endpoint
   * + query params) is URL-encoded and sent as:
   * GET proxyUrl?uri=<encoded-target-url>
   *
   * The proxy server should read the `uri` query parameter and forward
   * the GET request to that URL, returning the response.
   */
  proxyUrl?: string;
}
