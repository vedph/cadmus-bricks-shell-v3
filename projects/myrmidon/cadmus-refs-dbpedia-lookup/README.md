# CadmusRefsDbpediaLookup

`@myrmidon/cadmus-refs-dbpedia-lookup`

Angular library providing DBPedia lookup services for Cadmus. DBPedia is a project that extracts structured information from Wikipedia and makes it available on the Web.

This library contains two services:

- a generic DBPedia service (`DbpediaService`) to lookup or search DBPedia.
- a Cadmus lookup service (`DbpediaRefLookupService`) consuming the generic DBPedia service to provide quick lookup of any DBPedia entity via its name.

⚠️ This library depends on `@myrmidon/cadmus-refs-sparql` for generic SPARQL types and the SPARQL endpoint client. Also note that the DBPedia public service is limited, usually slow, and except for the quick lookup function (which is the one used by `DbpediaRefLookupService`) it **requires a proxy** to bypass CORS limitations. In this example, for local testing there is a proxy configured at localhost port 5275 (see `env.js` for `proxyUrl`), which is a simple pass-through proxy implemented with ASP.NET like this:

```cs
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace SummerLod.Api.Controllers;

[ApiController]
[Route("proxy")]
public sealed class ProxyController(HttpClient httpClient) : ControllerBase
{
    private readonly HttpClient _httpClient = httpClient;

    /// <summary>
    /// Gets the response from the specified URI.
    /// </summary>
    /// <param name="uri">The URI, e.g.
    /// <c>https://lookup.dbpedia.org/api/search?query=plato&format=json&maxResults=10</c>
    /// .</param>
    /// <returns>Response.</returns>
    [HttpGet]
    [ResponseCache(Duration = 60 * 10, VaryByQueryKeys = ["uri"], NoStore = false)]
    public async Task<IActionResult> Get([FromQuery] string uri)
    {
        try
        {
            HttpResponseMessage response = await _httpClient.GetAsync(uri);

            if (response.IsSuccessStatusCode)
            {
                string content = await response.Content
                    .ReadAsStringAsync();
                return Content(content, "application/json");
            }

            return StatusCode((int)response.StatusCode);
        }
        catch (Exception ex)
        {
            Debug.WriteLine(ex.ToString());
            return StatusCode(500, ex.Message);
        }
    }
}
```

Some essential types from DBPedia ontology you can use for lookup:

- person: <http://dbpedia.org/ontology/Person>
- place: <http://dbpedia.org/ontology/Place>
- organisation: <http://dbpedia.org/ontology/Organisation>

DBpedia returns results in the standard W3C SPARQL 1.1 JSON format. This is not DBpedia‑specific — it’s the same structure you get from any SPARQL endpoint. SPARQL query result skeleton:

```json
{
  "head": {
    "link": [],
    "vars": ["var1", "var2"]
  },
  "results": {
    "distinct": false,
    "ordered": true,
    "bindings": [
      {
        "var1": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Example"
        },
        "var2": {
          "type": "literal",
          "datatype": "http://www.w3.org/2001/XMLSchema#string",
          "value": "Example value"
        }
      },
      // More results...
    ]
  }
}
```

>Note that all the values may include `<B></B>` for bold, and presumably also `<I>` and `<U>`.

## SPARQL

## DbpediaDoc

A single DBPedia entity with scalar-typed fields:

| Field           | Type       | Description                                        |
| --------------- | ---------- | -------------------------------------------------- |
| `resource`      | `string`   | DBPedia resource URI                               |
| `label`         | `string`   | Display label                                      |
| `description`   | `string?`  | Abstract or description                            |
| `types`         | `string[]` | Full ontology type URIs                            |
| `typeNames`     | `string[]` | Short type names (e.g. "Person")                   |
| `categories`    | `string[]` | `dct:subject` category URIs                        |
| `score`         | `number?`  | Relevance score (Lookup API only)                  |
| `refCount`      | `number?`  | Reference count (Lookup API only)                  |
| `redirectLabel` | `string?`  | Redirect label (Lookup API only)                   |
| `latitude`      | `number?`  | WGS84 latitude (SPARQL with `includeCoordinates`)  |
| `longitude`     | `number?`  | WGS84 longitude (SPARQL with `includeCoordinates`) |

Note: values from the Lookup API may include HTML tags (`<B>`, `<I>`, `<U>`) for formatting.

## DbpediaOptions

| Field                | Type        | Default                                 | Description                                                |
| -------------------- | ----------- | --------------------------------------- | ---------------------------------------------------------- |
| `searchUri`          | `string?`   | `https://lookup.dbpedia.org/api/search` | Lookup API search endpoint                                 |
| `prefixUri`          | `string?`   | same as searchUri                       | Lookup API prefix search endpoint                          |
| `sparqlUri`          | `string?`   | `https://dbpedia.org/sparql`            | SPARQL endpoint                                            |
| `language`           | `string?`   | `'en'`                                  | Language code for results                                  |
| `limit`              | `number?`   | `10`                                    | Max results                                                |
| `prefixMatch`        | `boolean?`  | `true`                                  | Prefix match for Lookup API                                |
| `types`              | `string[]?` | —                                       | Ontology type filter URIs                                  |
| `directUri`          | `boolean?`  | `false`                                 | Construct resource URI directly from keyword (SPARQL only) |
| `includeCoordinates` | `boolean?`  | `false`                                 | Include `geo:lat`/`geo:long` in SPARQL results             |

Common ontology types:

- `http://dbpedia.org/ontology/Person` — persons
- `http://dbpedia.org/ontology/Place` — places
- `http://dbpedia.org/ontology/Organisation` — organisations

## DbpediaService

Injectable service (`providedIn: 'root'`) with multiple search methods:

### lookup()

```ts
lookup(keyword: string, options?: DbpediaOptions): Observable<DbpediaDoc[]>
```

Searches using the **DBPedia Lookup API**. Fast, returns scored results. The `prefixMatch` and `types` options are passed as query parameters.

### search()

```ts
search(keyword: string, options?: DbpediaOptions): Observable<DbpediaDoc[]>
```

Searches using **SPARQL** with optimized query patterns. Two modes are available:

- **Direct URI** (`directUri: true`): Constructs `http://dbpedia.org/resource/Keyword` from the keyword and queries it directly. This is the fastest approach but only works for exact Wikipedia article names.
- **URI filter** (default): Uses `FILTER(CONTAINS(STR(?uri), "keyword"))` to match resource URIs. Type constraints are placed first in the query for optimal Virtuoso performance.

### getResource()

```ts
getResource(uri: string, options?: DbpediaOptions): Observable<DbpediaDoc | undefined>
```

Fetches a single resource by URI using SPARQL. Returns `label`, `abstract`, ontology `types`, `dct:subject` categories, and optionally `latitude`/`longitude`.

### rawQuery()

```ts
rawQuery(query: string, options?: DbpediaOptions): Observable<SparqlSelectResponse>
```

Executes an arbitrary SPARQL SELECT query against the configured endpoint. Returns the raw W3C SPARQL JSON response. Useful for testing and debugging custom queries.

### buildSearchQuery() / buildGetResourceQuery()

```ts
buildSearchQuery(keyword: string, options?: DbpediaOptions): string | undefined
buildGetResourceQuery(uri: string, options?: DbpediaOptions): string | undefined
```

Return the SPARQL query string that `search()` / `getResource()` would execute, without running it. Useful for debugging or displaying the query in a UI.

## DbpediaRefLookupService

Adapter implementing `RefLookupService` from `@myrmidon/cadmus-refs-lookup`. Service ID: `'dbpedia'`. Wraps `DbpediaService.lookup()` for use with the `RefLookupComponent`.

## SPARQL Notes

The SPARQL methods use the public DBPedia SPARQL endpoint (`https://dbpedia.org/sparql`) which has these limits:

- **Rate**: 100 req/s per IP, 50 parallel connections
- **Timeout**: 120 seconds max query execution
- **Row limit**: 10,000 rows maximum
- **Partial results**: the endpoint may silently truncate results (check console for warnings)

The `search()` method uses `FILTER(CONTAINS(STR(?uri), ...))` on resource URIs, which is much faster than `bif:contains` on labels because DBPedia resource URIs mirror Wikipedia article titles. When type constraints are provided, they are placed first in the WHERE clause for optimal Virtuoso execution order.

For best performance, use `directUri: true` when you know the exact Wikipedia article name.
