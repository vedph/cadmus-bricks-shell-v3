# CadmusRefsIconclassLookup

📦 `@myrmidon/cadmus-refs-iconclass-lookup`

- [CadmusRefsIconclassLookup](#cadmusrefsiconclasslookup)
  - [Overview](#overview)
  - [Requirements](#requirements)
  - [Setup](#setup)
    - [Backend](#backend)
    - [Frontend](#frontend)
  - [Iconclass Builder Dialog](#iconclass-builder-dialog)
    - [Data](#data)
    - [Result](#result)
    - [Usage Outside Lookups](#usage-outside-lookups)
  - [Helpers](#helpers)
  - [About ICONCLASS](#about-iconclass)
  - [The API](#the-api)
  - [IconclassService](#iconclassservice)
  - [Possible future additions](#possible-future-additions)
  - [History](#history)

## Overview

This library provides the lookup for [ICONCLASS](https://iconclass.org) notations, used when describing the subject matter of an image. It offers two ways to pick a notation, both producing the same item (`IconclassNotation`):

- the **quick search** (`IconclassRefLookupService`): a "flat" lookup on the whole ICONCLASS set via the public ICONCLASS API. Users type some letters of a label or keyword and pick a notation among the matching ones. This is useful when you already know what you are looking for.
- the **Iconclass builder** (`IconclassBuilderDialogComponent`), opened by the _More_ button of the lookup: here users build the identifier step by step, starting from a root class and adding keywords (notations), keys and names, using the [Iconclass API](https://github.com/vedph/iconclass-api) via `@myrmidon/iconclass-builder`. This is useful when you are exploring ICONCLASS in search of your identifier. When the user accepts the built identifier, the dialog closes with its notation, got from the public ICONCLASS API like the items of the quick search, so that whatever the way used to reach the identifier, the result has the same form.

For instance, when picking `95A(ERICHTHONIUS)68` either from the quick search (typing `er`) or from the builder, the lookup item is:

```json
{
  "n": "95A(ERICHTHONIUS)68",
  "p": ["9", "95", "95A", "95A(...)", "95A(ERICHTHONIUS)", "95A(ERICHTHONIUS)6", "95A(ERICHTHONIUS)68"],
  "b": "95A(ERICHTHONIUS)68",
  "l": ["9k0"],
  "txt": {
    "en": "(story of) Erichthonius (Erechtheus) - death",
    "de": "die Geschichte von Erichthonius (Erechtheus) - Tod",
    "it": "(storia di) Erittonio (Eretteo) - morte"
  },
  "kw": {
    "en": ["death"],
    "de": ["Tod"],
    "it": ["morte"]
  }
}
```

The public ICONCLASS API provides the data for any identifier built according to the ICONCLASS rules, including those with names not in the official list (e.g. `11H(MY SAINT)59`) and with keys (e.g. `25F23(LION)(+12)`). When it is not available (e.g. it does not respond), the builder dialog builds the item from the builder's result (see [Result](#result)).

## Requirements

Peer dependencies:

- `@angular/common`, `@angular/core`, `@angular/material` (22.3+).
- `@myrmidon/ngx-tools`.
- `@myrmidon/cadmus-refs-lookup` (11.1.0+, for the _More_ dialog).
- `@myrmidon/iconclass-api`, `@myrmidon/iconclass-ui`, and `@myrmidon/iconclass-builder` (for the builder): `npm i @myrmidon/iconclass-api @myrmidon/iconclass-ui @myrmidon/iconclass-builder`.

## Setup

### Backend

- **quick search**: the public ICONCLASS API does not support CORS, so it requires a backend proxy API (like the `api/proxy` endpoint of the Cadmus APIs).
- **builder**: it requires the Iconclass API, which can be hosted by your backend API via the `Iconclass.Api.Controllers` NuGet package, with a PostgreSQL database. For instance, the Cadmus bricks API hosts it with this code in its `Program.cs`:

```cs
// after adding all the controllers
services.AddIconclassServices(options =>
{
    options.ConnectionString = configuration.GetConnectionString("Iconclass");
    // a local copy of https://github.com/iconclass/data, used to seed the
    // database when missing; when empty, the database must be already
    // populated (e.g. with the icocl tool)
    options.DataDirectory = configuration["Iconclass:DataDirectory"];
    // a failure in Iconclass initialization must not stop the whole API:
    // Iconclass endpoints just return 503
    options.StopOnInitializationFailure = false;
});
// controllers are activated as services: register those just added
services.AddControllers().AddControllersAsServices();
```

The Iconclass API endpoints are under `api/iconclass/` (`status`, `languages`, `roots`, `parse`, `lookup`). See the [Iconclass API documentation](https://github.com/vedph/iconclass-api) for all the options and for seeding the database.

### Frontend

(1) in your `app.config.ts`, add the proxy interceptor for the quick search (if not already present), and ensure that `HttpClient` is provided:

```ts
import { PROXY_INTERCEPTOR_OPTIONS, ProxyInterceptor } from "@myrmidon/cadmus-refs-lookup";

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor]), withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: ProxyInterceptor, multi: true },
    {
      provide: PROXY_INTERCEPTOR_OPTIONS,
      useValue: {
        proxyUrl: (window as any).__env?.proxyUrl || "http://localhost:5064/api/proxy",
        urls: ["https://iconclass.org"],
      },
    },
    //...
  ],
};
```

(2) in your `env.js` set the proxy URL and the API URL:

```js
(function (window) {
  window.__env = window.__env || {};
  // ...
  // the API hosting the Iconclass API (at apiUrl + "iconclass/")
  window.__env.apiUrl = "http://localhost:5064/api/";
  // proxy
  window.__env.proxyUrl = "http://localhost:5064/api/proxy";
})(this);
```

By default, the builder uses the Iconclass API at `apiUrl` + `iconclass/`. If the Iconclass API is hosted elsewhere, provide its URL (ending with `/`) via the `ICONCLASS_API_BASE_URL` token of `@myrmidon/iconclass-api`, e.g. `{ provide: ICONCLASS_API_BASE_URL, useValue: "https://iconclass.mysite.org/api/iconclass/" }`.

(3) in your app component, configure the lookup with its _More_ dialog (see [Using Lookup Providers in Real Apps](../cadmus-refs-lookup/README.md#using-lookup-providers-in-real-apps)):

```ts
import { LOOKUP_CONFIGS_KEY, RefLookupConfig } from "@myrmidon/cadmus-refs-lookup";
import { ICONCLASS_BUILDER_DIALOG_CONFIG, IconclassBuilderDialogComponent, IconclassNotation, IconclassRefLookupService } from "@myrmidon/cadmus-refs-iconclass-lookup";

// storage (of type RamStorageService) was injected
storage.store(LOOKUP_CONFIGS_KEY, [
  // ICONCLASS
  {
    name: "Iconclass",
    iconUrl: "/img/iconclass128.png",
    description: "Iconclass classification system",
    label: "ID",
    service: inject(IconclassRefLookupService),
    itemIdGetter: (item: IconclassNotation) => item?.n,
    itemLabelGetter: (item: IconclassNotation) => item?.txt?.en || item?.n,
    linkTemplate: "https://iconclass.org/{n}",
    // the More button opens the Iconclass builder
    moreDialog: IconclassBuilderDialogComponent,
    moreDialogConfig: ICONCLASS_BUILDER_DIALOG_CONFIG,
  },
] as RefLookupConfig[]);
```

When using the lookup component directly, bind the same properties:

```html
<cadmus-refs-lookup [service]="service" [item]="item()" [moreDialog]="moreDialog" [moreDialogConfig]="moreDialogConfig" linkTemplate="https://iconclass.org/{n}" label="ICONCLASS" (itemChange)="onItemChange($event)" />
```

with `moreDialog = IconclassBuilderDialogComponent` and `moreDialogConfig = ICONCLASS_BUILDER_DIALOG_CONFIG` in your component.

(4) add the `iconclass128.png` icon to your `public/img` folder.

## Iconclass Builder Dialog

A dialog wrapping the Iconclass builder (`IconclassBuilder` from `@myrmidon/iconclass-builder`) with its accept button, closed with the notation built by the user (`IconclassNotation`), or with `undefined` when cancelled.

- 🔑 **class**: `IconclassBuilderDialogComponent`
- 🚩 **selector**: `cadmus-iconclass-builder-dialog`
- 📥 **data** (`IconclassBuilderDialogData`, via `MAT_DIALOG_DATA`)
- 📤 **result**: `IconclassNotation` or `undefined`
- ⚙️ `ICONCLASS_BUILDER_DIALOG_CONFIG`: the default dialog configuration for `moreDialogConfig` (title "Iconclass builder", 95vw up to 1400px wide, 90vh high).

### Data

`IconclassBuilderDialogData` extends `RefLookupMoreDialogData`: when the dialog is opened by the lookup, `title`, `item` and `options` are set by the lookup, while the other properties can be set via the `data` of its `moreDialogConfig`:

| property         | type                         | default       | description                                                                                                            |
| ---------------- | ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title`          | `string`                     | `"Iconclass"` | the dialog title.                                                                                                      |
| `item`           | `IconclassNotation`          |               | the current item: the builder starts from its identifier (`n`).                                                       |
| `id`             | `string`                     |               | the identifier to start from, overriding the item's one. With neither, the builder starts from the first root class. |
| `language`       | `string`                     | `"en"`        | the initial builder language.                                                                                          |
| `sort`           | `"Hierarchy" \| "Relevance"` | `"Hierarchy"` | the initial lookup sort order.                                                                                         |
| `expandRefs`     | `boolean`                    | `false`       | true to extend lookups via the keyword thesaurus.                                                                      |
| `wikidata`       | `boolean`                    | `false`       | true to show the Wikidata labels of `wd:Q...` values.                                                                  |
| `pageSize`       | `number`                     | 20            | the initial page size of lookup results.                                                                               |
| `debounceMs`     | `number`                     | 300           | the debounce time for typing in lookups.                                                                               |
| `noResolve`      | `boolean`                    | `false`       | true to never get the notation from the public ICONCLASS API, always building it from the builder result.             |
| `resolveTimeout` | `number`                     | 15000         | the timeout in milliseconds for getting the notation from the public ICONCLASS API.                                   |

When the builder starts from an identifier it cannot build (e.g. a compound one), it shows the error, and the user can reset it.

### Result

When the user accepts the identifier, the dialog shows a progress bar and gets its notation from the public ICONCLASS API (via `IconclassRefLookupService.getById`, like the quick search does), so that the result is identical to the item picked by the quick search, with labels and keywords in all the ICONCLASS languages.

When this fails (an error, a timeout, or no data), the dialog builds the notation from the builder's result via `iconclassBuilderResultToNotation`, so that the user can always pick the identifier. This fallback notation has:

- `n`: the identifier;
- `b`: the base notation (without key);
- `p`: the path, from the parsed segments (they are the same steps of the ICONCLASS path);
- `k`: the key code, from the last key segment, if any;
- `txt`: the label in the builder language, plus the English one when the builder language is not English (got from the Iconclass API, as labels are usually got from English, e.g. by `itemLabelGetter`);
- `l` and `kw` empty, while `c` and `r` are not set.

### Usage Outside Lookups

You can also open the dialog directly, e.g.:

```ts
const dialog = inject(MatDialog);

const { title, data, ...size } = ICONCLASS_BUILDER_DIALOG_CONFIG;
dialog
  .open<IconclassBuilderDialogComponent, IconclassBuilderDialogData, IconclassNotation>(IconclassBuilderDialogComponent, {
    ...size,
    data: { title, id: "95A", language: "it" },
  })
  .afterClosed()
  .subscribe((notation) => {
    if (notation) {
      // use the notation
    }
  });
```

⚠️ This library exports `IconclassService` for the public ICONCLASS API, while `@myrmidon/iconclass-api` exports another `IconclassService` for the Iconclass API: if you need both in the same file, alias one of them (e.g. `import { IconclassService as IconclassApiService } from "@myrmidon/iconclass-api"`).

## Helpers

- `iconclassBuilderResultToNotation(result, englishText?)`: build an `IconclassNotation` from an `IconclassBuilderResult` (see [Result](#result)).
- `toIconclassOrgLanguage(language)`: get the language code used by the public ICONCLASS data (e.g. `jp`) from the code used by the Iconclass API (e.g. `ja`).

## About ICONCLASS

[ICONCLASS](https://iconclass.org) is a hierarchical classification system for iconographic research. Each subject ("descriptor") is identified by an alphanumeric **notation** (e.g. `97EE1`), optionally followed by a bracketed qualifier (e.g. `25F713(+4712)`, or a "kindred" placeholder like `25F713(...)` meaning "spiders (with NAME)"). Notations are organized in a tree: e.g. `9` → `97` → `97E` → `97EE` → `97EE1`.

Iconclass is not a flat dictionary of tags; it is an alphanumeric hierarchical classification system. Iconclass structures knowledge using alphanumeric strings called **notations**. Each extra character represents a deeper level of specificity.

- `7` → Bible
- `71` → Old Testament
- `71H` → Story of David
- `71H7` → David and Bathsheba
- `71H71` → David, from the roof observering Bathsheba bathing

## The API

The ICONCLASS API is **not formally documented** (its `openapi.json` is empty), so the following has been determined by experimentation against `https://iconclass.org`. All endpoints return JSON and require no authentication.

### 1. Search: `GET /api/search?q={query}&size={size}&lang={lang}`

Full-text search across notations' multilingual labels and keywords. Returns:

```json
{
  "result": ["25F713(...)", "25F713", "97EE1", "11H(NORBERT)59", ...],
  "total": 40
}
```

- `q` (required): the free-text query (e.g. `spider`).
- `size` (optional): maximum number of notation codes to return. `total`
  always reports the overall number of matches, even if greater than `size`.
- `lang` (optional): one of `en`, `de`, `fr`, `it`, `pt`, `jp`. In practice it does **not** seem to restrict which notations match (e.g. `q=ragno&lang=it`  returns the same notations as `q=spider`), so it's mostly useful for symmetry with the other endpoints.

The `result` array contains **plain notation codes only** — no labels or other metadata. Some of them may be "kindred" placeholder notations (ending in `(...)`, meaning "... with NAME/PLACE/etc."). To get human-readable information for each result, call the notation endpoint below.

### 2. Notation data: `GET /{notation}.json`

Returns the full data for a single notation, e.g. for `97EE1.json`:

```json
{
  "n": "97EE1",
  "p": ["9", "97", "97EE", "97EE1"],
  "b": "97EE1",
  "l": ["9k0"],
  "txt": {
    "en": "Arachne changed into a spider: ...",
    "de": "...", "fr": "...", "it": "...", "pt": "...", "jp": "..."
  },
  "kw": {
    "en": ["Arachne", "Minerva", "cobweb", "spider", ...],
    "de": [...], "fr": [...], "it": [...], "pt": [...], "jp": []
  }
}
```

Fields:

- `n`: the notation code itself.
- `b`: the "base" notation, without any bracketed qualifier (equal to `n`
  when there is none).
- `k`: present only for notations with a `(+...)` qualifier; the corresponding "key" code (e.g. `25Fk4712` for `25F713(+4712)`).
- `p`: the full ancestors path, from the top-level digit down to and including this notation.
- `c`: direct children notations (if any).
- `r`: related/"see also" notations (if any).
- `l`: codes of auxiliary "keys" (facets) combinable with this notation.
- `txt`: the human-readable label/description, per language. Not all languages are always populated (some may be empty strings).
- `kw`: keywords, per language. Not all languages are always populated (some may be empty arrays).

**Important**: notations that don't exist return HTTP 200 with an empty JSON object `{}` (not a 404). `IconclassService.getNotation` treats this case (no
`n` property) as "not found" and resolves to `undefined`.

This endpoint works for **every** notation code returned by `/api/search`, including "kindred" placeholders like `25F713(...)` and qualified notations like `25F713(+4712)`. Special characters (`(`, `)`, `+`) must appear literally in the URL path; `IconclassService` takes care of this.

### 3. Example images: `GET /api/images/{notation}?lang={lang}&format=json`

Returns example artworks/images tagged with the given notation (as contributed by partner collections):

```json
{
  "count": 7,
  "size": 49,
  "images": [
    {
      "ID": ["IIHIM_RIJKSMUSEUM_866733298"],
      "IC": ["23A1", "46C20", "47H31", "47H46", "92B5", "92C2", "97EE1"],
      "TITLE": ["Minerva bezoekt vrouwen die spinnen en weven"],
      "TYPE": ["image"],
      "CREATOR": ["..."],
      "DATE": ["1717 - 1717"],
      "LOCATION": ["Amsterdam"],
      "DESCRIPTION": ["..."],
      "URL_IMAGE": ["IIHIM_RIJKS_-40185377.jpg"],
      "URL_WEBPAGE": ["http://www.rijksmuseum.nl/collectie/RP-P-OB-51.217"]
    },
    ...
  ]
}
```

Notes:

- `count` is the number of records actually returned; `size` is the maximum page size used by the API (around 49 in our tests).
- Each record's shape **depends on the contributing collection** — only a few common fields (`ID`, `IC`, `TITLE`, `TYPE`, `CREATOR`, `DATE`, `LOCATION`, `DESCRIPTION`, `URL_IMAGE`, `URL_WEBPAGE`) are typed in `IconclassImageRecord`; any other field is still accessible (the interface has an index signature). Every field is an array of strings, even for single values.
- `URL_IMAGE` is just a filename within the source collection — there is no documented, stable base URL to turn it into a full image URL. Use `URL_WEBPAGE` to link back to the artwork on its source website instead.
- Many notations — especially deep/specific ones — have `count: 0` and `images: []`. This is normal, not an error.

## IconclassService

```ts
class IconclassService {
  search(query: string, options?: IconclassSearchOptions): Observable<IconclassSearchResult>;

  getNotation(notation: string): Observable<IconclassNotation | undefined>;

  getImages(notation: string, options?: IconclassImagesOptions): Observable<IconclassImagesResult>;

  getLabel(notation: IconclassNotation, lang?: IconclassLanguage | string): string;
}
```

- `search`: looks up notation codes matching a free-text query
  (`IconclassSearchOptions`: `size`, `lang`).
- `getNotation`: resolves a notation code into its full data (label,
  description, keywords, hierarchy), or `undefined` if it doesn't exist.
- `getImages`: fetches example images/artworks for a notation
  (`IconclassImagesOptions`: `lang`, `size`).
- `getLabel`: convenience to pick the best available label for a notation,
  with fallback to English and then to any other available language.

The API base URL defaults to `https://iconclass.org` and can be overridden by
providing the `ICONCLASS_API_BASE_TOKEN` injection token.

### Typical usage: descriptor lookup

```ts
constructor(private _iconclass: IconclassService) {}

// 1. user types "spider" -> get matching notation codes
this._iconclass.search('spider', { size: 20 }).subscribe((result) => {
  // result.result: ["25F713(...)", "25F713", "97EE1", ...]
  // result.total: 40

  // 2. resolve each notation to get its label for display
  result.result.forEach((notation) => {
    this._iconclass.getNotation(notation).subscribe((data) => {
      if (data) {
        console.log(notation, '=>', this._iconclass.getLabel(data));
      }
    });
  });
});
```

## Possible future additions

The following endpoints/features were not implemented here but could be useful for a richer descriptor-picking UI:

- **Browse the hierarchy**: `getNotation` already returns `c` (children) and `p` (ancestors path), so a tree-browsing UI (drill down from top-level digits to specific notations) can be built on top of the existing service without new endpoints — just call `getNotation` on each `c` entry.
- **Localized search**: although `lang` doesn't currently filter search results, the UI could still let users pick a display language and use `getLabel(data, lang)` to show localized labels/keywords for the same result set.
- **Caching**: `getNotation` results are static (notation data doesn't change), so a simple in-memory cache keyed by notation code would avoid repeated requests when the same notations are resolved multiple times (e.g. while browsing the hierarchy or rendering search results).

## History

### 0.1.0

- 2026-11-26: added the Iconclass builder as the _More_ dialog of the lookup (`IconclassBuilderDialogComponent`, with `ICONCLASS_BUILDER_DIALOG_CONFIG`), to build identifiers step by step via the Iconclass API, getting the same items of the quick search. This requires `@myrmidon/cadmus-refs-lookup` 11.1.0 and new peer dependencies: `@angular/material`, `@myrmidon/cadmus-refs-lookup`, `@myrmidon/iconclass-api`, `@myrmidon/iconclass-builder` (and `@myrmidon/iconclass-ui`, its peer dependency).
  - new helpers `iconclassBuilderResultToNotation` and `toIconclassOrgLanguage`.
  - added tests for the lookup service.

