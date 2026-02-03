# CadmusRefsBiblissimaLookup

This library provides Angular services for the Biblissima+ Reconciliation API.

- [CadmusRefsBiblissimaLookup](#cadmusrefsbiblissimalookup)
  - [Services](#services)
    - [BiblissimaService](#biblissimaservice)
    - [BiblissimaRefLookupService](#biblissimareflookupservice)
  - [Usage](#usage)
  - [Biblissima API](#biblissima-api)
    - [Query](#query)
    - [Lookup](#lookup)
    - [Data Extension](#data-extension)

## Services

### BiblissimaService

The core HTTP service for the Biblissima+ Reconciliation API. This is a standalone service with no dependencies on the lookup component system.

**Methods:**

- `reconcile(query, options?)`: Perform a reconciliation query to find matching entities.
- `suggestEntities(prefix, options?)`: Suggest entities matching a prefix.
- `suggestProperties(prefix, options?)`: Suggest properties matching a prefix.
- `suggestTypes(prefix, options?)`: Suggest types matching a prefix.
- `extend(request, options?)`: Extend entities with additional property values.

**Models exported:**

- `BiblissimaCandidate`: A reconciliation result candidate.
- `BiblissimaQuery`: A reconciliation query.
- `BiblissimaSuggestItem`: A suggest endpoint result item.
- `BiblissimaExtendRequest`, `BiblissimaExtendResponse`: Data extension types.
- `BiblissimaType`, `BiblissimaFeature`, `BiblissimaPropertyConstraint`: Supporting types.

### BiblissimaRefLookupService

A wrapper service implementing `RefLookupService` from `@myrmidon/cadmus-refs-lookup` for use with the Cadmus lookup component system.

**Options:**

- `language`: `'en'` or `'fr'` (default: `'en'`)
- `type`: Type ID to restrict results (e.g., `'Q168'` for humans)
- `properties`: Array of property constraints `[{ pid: 'P57', v: '560' }]`

## Usage

1. Install the package:

```bash
npm i @myrmidon/cadmus-refs-biblissima-lookup
```

2. Configure in your application (e.g., in `app.component.ts`):

```typescript
import { inject } from '@angular/core';
import { RamStorageService } from '@myrmidon/ngx-tools';
import { LOOKUP_CONFIGS_KEY, RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';
import { BiblissimaRefLookupService, BiblissimaCandidate } from '@myrmidon/cadmus-refs-biblissima-lookup';

@Component({...})
export class AppComponent {
  constructor() {
    const storage = inject(RamStorageService);
    this.configureLookup(storage);
  }

  private configureLookup(storage: RamStorageService): void {
    storage.store(LOOKUP_CONFIGS_KEY, [
      {
        name: 'Biblissima',
        iconUrl: '/img/biblissima128.png',
        description: 'Biblissima+ Knowledge Base',
        label: 'entity',
        service: inject(BiblissimaRefLookupService),
        itemIdGetter: (item: BiblissimaCandidate) => item?.id,
        itemLabelGetter: (item: BiblissimaCandidate) => item?.name,
        // Optional: restrict to humans
        // options: { type: 'Q168' }
        // Optional: use French
        // options: { language: 'fr' }
      },
    ] as RefLookupConfig[]);
  }
}
```

3. For standalone use of `BiblissimaService`:

```typescript
import { BiblissimaService } from '@myrmidon/cadmus-refs-biblissima-lookup';

@Component({...})
export class MyComponent {
  private _biblissima = inject(BiblissimaService);

  search() {
    this._biblissima.reconcile({ query: 'Isidorus', limit: 10 }).subscribe(
      candidates => console.log(candidates)
    );
  }

  suggestProperties() {
    this._biblissima.suggestProperties('date').subscribe(
      items => console.log(items)
    );
  }
}
```

## Biblissima API

The Biblissima API is documented via this page about a tool consuming it (`OpenRefine`): [Informations techniques sur l'API - Documentation Biblissima+](https://doc.biblissima.fr/api/reconciliation-infos-techniques/).

- [full documentation](https://www.w3.org/community/reports/reconciliation/CG-FINAL-specs-0.1-20230321)

### Query

The service for using this API has these features:

- `language`: English (`en`, default) or French (`fr`)
- `query`: a required string.
- `type` (optional): a type identifier to restrict results to entities belonging to the corresponding class.
- `limit` (optional, defaulting to 20): limit results.
- `properties` (optional), an additional filter by entity properties; each property is represented by a pair `pid` (property ID) = `v` (value).

Examples:

- <https://data.biblissima.fr/reconcile/en/api?queries={"q0":{"query":"isidorus%20hispalensis"}}>

- `q0` here is the query identifier, in case of multiple queries. In this service, we current limit ourselves to a single query at a time.
- `queries` is a JSON object. Example:

```json
{
  "q0": {
    "query": "Isidorus Hispalensis",
    "type": "Q168",
    "limit": 5,
    "properties": [
      {
        "pid": "P57",
        "v": "560"
      }
    ]
  }
}
```

This specifies a type, a limit, and a property. The query without the property would be like:

- <https://data.biblissima.fr/reconcile/en/api?queries={"q0":{"query":"Isidorus%20Hispalensis","type":"Q168","limit":5}}>

This returns:

```json
{
  "q0": {
    "result": [
      {
        "description": null,
        "features": [
          {
            "id": "all_labels",
            "value": 100
          }
        ],
        "id": "Q7089",
        "match": false,
        "name": "Isidore de Séville (saint, 0560?-0636)",
        "score": 100,
        "type": [
          {
            "id": "Q168",
            "name": "human"
          },
          {
            "id": "Q304387",
            "name": "descriptor"
          }
        ]
      },
      {
        "description": null,
        "features": [
          {
            "id": "all_labels",
            "value": 93
          }
        ],
        "id": "Q14389",
        "match": false,
        "name": "Pseudo-Isidorus Hispalensis",
        "score": 93,
        "type": [
          {
            "id": "Q168",
            "name": "human"
          }
        ]
      }
    ]
  }
}
```

### Lookup

To lookup entities, properties and types you can use these endpoints:

- entities: <https://data.biblissima.fr/reconcile/en/suggest/entity>
- properties: <https://data.biblissima.fr/reconcile/en/suggest/property>
- types: <https://data.biblissima.fr/reconcile/en/suggest/type>

The parameter is `prefix` (required). Example:

- <https://data.biblissima.fr/reconcile/en/suggest/property?prefix=date>

### Data Extension

This service allows to get one or more properties from an entity (or entities). Example (P109 is the property named `identifiant Bibliothèque nationale de France`, while Q27392 is the ID of the `Paris` entity):

- <https://data.biblissima.fr/reconcile/en/api?extend={"ids":["Q27392"],"properties":[{"id":"P109"}]}>

Result:

```json
{
  "meta": [
    {
      "id": "P109",
      "name": "BnF ID"
    }
  ],
  "rows": {
    "Q27392": {
      "P109": [
        {
          "str": "152821567"
        },
        {
          "str": "11932931q"
        }
      ]
    }
  }
}
```

Parameters:

- `ids` (required): the ID(s) of the entities.
- `properties`: each property to be fetched has these parameters:
  - `id` (required): property ID.
  - `limit` (optional): max count of results.
