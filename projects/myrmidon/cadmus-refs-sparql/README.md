# CadmusRefsSparql

`@myrmidon/cadmus-refs-sparql`

Generic, reusable Angular library for querying any SPARQL endpoint. Provides hand-written TypeScript types for the [W3C SPARQL 1.1 Query Results JSON Format](https://www.w3.org/TR/sparql11-results-json/) and a service to execute SPARQL queries.

This library is endpoint-agnostic: it works with DBPedia, Wikidata, or any other SPARQL-compliant endpoint.

## Types

All types model the W3C SPARQL 1.1 JSON Results Format directly, with no external dependencies.

### SparqlTerm (discriminated union)

A single value in a SPARQL result binding. Discriminated on `type`:

- `SparqlUriTerm` — `{ type: 'uri'; value: string }`
- `SparqlLiteralTerm` — `{ type: 'literal'; value: string; 'xml:lang'?: string; datatype?: string }`
- `SparqlBnodeTerm` — `{ type: 'bnode'; value: string }`

### SparqlBinding

A single row in a SELECT result: a record mapping variable names to `SparqlTerm` values.

```ts
interface SparqlBinding {
  [variable: string]: SparqlTerm;
}
```

### SparqlSelectResponse

The full response from a SPARQL SELECT query:

```ts
interface SparqlSelectResponse {
  head: { vars: string[]; link?: string[] };
  results: { bindings: SparqlBinding[] };
}
```

### SparqlAskResponse

The response from a SPARQL ASK query:

```ts
interface SparqlAskResponse {
  head: Record<string, never>;
  boolean: boolean;
}
```

### SparqlQueryOptions

Configuration for a SPARQL request:

- `defaultGraphUri?` — default graph URI to pass to the endpoint.
- `maxRetries?` — maximum retry attempts on transient failure (default: 2).
- `retryDelay?` — initial retry delay in ms, doubled on each retry (default: 1000).

## SparqlService

Injectable Angular service (`providedIn: 'root'`) for querying SPARQL endpoints.

### select()

```ts
select(endpoint: string, query: string, options?: SparqlQueryOptions): Observable<SparqlSelectResponse>
```

Executes a SPARQL SELECT query. Returns the typed JSON response.

### ask()

```ts
ask(endpoint: string, query: string, options?: SparqlQueryOptions): Observable<boolean>
```

Executes a SPARQL ASK query. Returns the boolean result.

### Features

- Sets `Accept: application/sparql-results+json` header and `format` parameter.
- Exponential backoff retry (configurable via `maxRetries` and `retryDelay`).
- Detects Virtuoso partial results via `X-SPARQL-MaxRows` and `X-SQL-State` response headers, logging warnings to the console.
- Error handling via `ErrorService` from `@myrmidon/ngx-tools`.
