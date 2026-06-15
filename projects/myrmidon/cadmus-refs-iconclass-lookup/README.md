# CadmusRefsIconclassLookup

This library provides `IconclassService`, an Angular service wrapping the public
[ICONCLASS](https://iconclass.org) API, to be used for looking up ICONCLASS
descriptors (notations) when describing the subject matter of an image.

## About ICONCLASS

[ICONCLASS](https://iconclass.org) is a hierarchical classification system for
iconographic research. Each subject ("descriptor") is identified by an
alphanumeric **notation** (e.g. `97EE1`), optionally followed by a bracketed
qualifier (e.g. `25F713(+4712)`, or a "kindred" placeholder like
`25F713(...)` meaning "spiders (with NAME)"). Notations are organized in a
tree: e.g. `9` → `97` → `97E` → `97EE` → `97EE1`.

## The API

The ICONCLASS API is **not formally documented** (its `openapi.json` is
empty), so the following has been determined by experimentation against
`https://iconclass.org`. All endpoints return JSON and require no
authentication.

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
- `lang` (optional): one of `en`, `de`, `fr`, `it`, `pt`, `jp`. In practice it
  does **not** seem to restrict which notations match (e.g. `q=ragno&lang=it`
  returns the same notations as `q=spider`), so it's mostly useful for
  symmetry with the other endpoints.

The `result` array contains **plain notation codes only** — no labels or
other metadata. Some of them may be "kindred" placeholder notations (ending
in `(...)`, meaning "... with NAME/PLACE/etc."). To get human-readable
information for each result, call the notation endpoint below.

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
- `k`: present only for notations with a `(+...)` qualifier; the
  corresponding "key" code (e.g. `25Fk4712` for `25F713(+4712)`).
- `p`: the full ancestors path, from the top-level digit down to and
  including this notation.
- `c`: direct children notations (if any).
- `r`: related/"see also" notations (if any).
- `l`: codes of auxiliary "keys" (facets) combinable with this notation.
- `txt`: the human-readable label/description, per language. Not all
  languages are always populated (some may be empty strings).
- `kw`: keywords, per language. Not all languages are always populated (some
  may be empty arrays).

**Important**: notations that don't exist return HTTP 200 with an empty JSON
object `{}` (not a 404). `IconclassService.getNotation` treats this case (no
`n` property) as "not found" and resolves to `undefined`.

This endpoint works for **every** notation code returned by `/api/search`,
including "kindred" placeholders like `25F713(...)` and qualified notations
like `25F713(+4712)`. Special characters (`(`, `)`, `+`) must appear literally
in the URL path; `IconclassService` takes care of this.

> The user-reported case of `11H(NORBERT)59` "returning nothing" was tested
> against `/api/images/{notation}`, not `/{notation}.json`: the notation
> endpoint resolves it fine, it's just that no example images are associated
> with it (see below).

### 3. Example images: `GET /api/images/{notation}?lang={lang}&format=json`

Returns example artworks/images tagged with the given notation (as
contributed by partner collections):

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

- `count` is the number of records actually returned; `size` is the maximum
  page size used by the API (around 49 in our tests).
- Each record's shape **depends on the contributing collection** — only a
  few common fields (`ID`, `IC`, `TITLE`, `TYPE`, `CREATOR`, `DATE`,
  `LOCATION`, `DESCRIPTION`, `URL_IMAGE`, `URL_WEBPAGE`) are typed in
  `IconclassImageRecord`; any other field is still accessible (the interface
  has an index signature). Every field is an array of strings, even for
  single values.
- `URL_IMAGE` is just a filename within the source collection — there is no
  documented, stable base URL to turn it into a full image URL. Use
  `URL_WEBPAGE` to link back to the artwork on its source website instead.
- Many notations — especially deep/specific ones — have `count: 0` and
  `images: []`. This is normal, not an error.

## `IconclassService`

```ts
class IconclassService {
  search(query: string, options?: IconclassSearchOptions):
    Observable<IconclassSearchResult>;

  getNotation(notation: string):
    Observable<IconclassNotation | undefined>;

  getImages(notation: string, options?: IconclassImagesOptions):
    Observable<IconclassImagesResult>;

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

The following endpoints/features were not implemented here but could be
useful for a richer descriptor-picking UI:

- **Browse the hierarchy**: `getNotation` already returns `c` (children) and
  `p` (ancestors path), so a tree-browsing UI (drill down from top-level
  digits to specific notations) can be built on top of the existing service
  without new endpoints — just call `getNotation` on each `c` entry.
- **`RefLookupService` adapter** (`IconclassRefLookupService`), following the
  pattern used by `@myrmidon/cadmus-refs-viaf-lookup`'s
  `ViafRefLookupService`, to plug `IconclassService.search` +
  `getNotation` into `RefLookupComponent`/`RefLookupSetComponent` from
  `@myrmidon/cadmus-refs-lookup`. `getName` would use `getLabel`, and the
  "ID" stored for an item would be the notation code itself.
- **Localized search**: although `lang` doesn't currently filter search
  results, the UI could still let users pick a display language and use
  `getLabel(data, lang)` to show localized labels/keywords for the same
  result set.
- **Caching**: `getNotation` results are static (notation data doesn't
  change), so a simple in-memory cache keyed by notation code would avoid
  repeated requests when the same notations are resolved multiple times
  (e.g. while browsing the hierarchy or rendering search results).
