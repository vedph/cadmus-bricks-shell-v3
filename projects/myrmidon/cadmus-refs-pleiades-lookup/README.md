# CadmusRefsPleiadesLookup

- [CadmusRefsPleiadesLookup](#cadmusrefspleiadeslookup)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [Services](#services)
    - [PleiadesApiService](#pleiadesapiservice)
    - [PleiadesRefLookupService](#pleiadesreflookupservice)
    - [Lookup Options](#lookup-options)
    - [PleiadesFiltersStore](#pleiadesfiltersstore)
  - [Components](#components)
    - [PleiadesQueryComponent](#pleiadesquerycomponent)
    - [PleiadesQueryDialogComponent](#pleiadesquerydialogcomponent)
    - [PleiadesLookupOptionsComponent](#pleiadeslookupoptionscomponent)
    - [PleiadesMapComponent](#pleiadesmapcomponent)
    - [PleiadesResultListComponent](#pleiadesresultlistcomponent)
    - [PleiadesPlaceDetailsComponent](#pleiadesplacedetailscomponent)
  - [Theming](#theming)
  - [Utilities](#utilities)
  - [History](#history)
    - [0.0.1](#001)

Lookup and search components for the [Pleiades](https://pleiades.stoa.org) gazetteer of ancient places, built on the [Pleiades wrapper API](https://github.com/vedph/pleiades-api), which imports the Pleiades JSON graph into a PostGIS database and provides text, metadata, and spatial search.

This library provides:

- 🔍 `PleiadesApiService`: a client for the Pleiades API (lookup data, search, place details, nearby places).
- 🏷️ `PleiadesRefLookupService`: a `RefLookupService` to look up places in `RefLookupComponent` (from `@myrmidon/cadmus-refs-lookup`), with `PleiadesLookupOptionsComponent` letting users set all the search filters (including spatial ones drawn on a map) in the lookup options, and save them as defaults.
- 🗺️ `PleiadesQueryComponent`: a full search UI with text, metadata, and spatial filters drawn on a map, showing results in the map, in a list, and in a details view. Also wrapped in `PleiadesQueryDialogComponent`.
- 🧩 the building blocks of the query component, usable on their own: `PleiadesMapComponent`, `PleiadesResultListComponent`, `PleiadesPlaceDetailsComponent`.

## Requirements

- `@myrmidon/cadmus-refs-lookup` with `optDialogConfig` (unreleased after 11.0.9) for `PleiadesLookupOptionsComponent`, which needs a large dialog.
- a running Pleiades API (version 3.0.1 or later for regions and bounding boxes crossing the antimeridian). Its data endpoints are anonymous. Ensure your app's origin is listed in its `AllowedOrigins` setting (CORS).
- Angular Material with an M3 theme (the components use `--mat-sys-*` tokens).
- for the map components, [MapLibre GL](https://maplibre.org/) and its Angular wrapper [ngx-maplibre-gl](https://github.com/maplibre/ngx-maplibre-gl).

## Setup

▶️ (1) install the package and its peer dependencies:

```bash
npm i @myrmidon/cadmus-refs-pleiades-lookup @myrmidon/cadmus-refs-lookup @myrmidon/ngx-tools @maplibre/ngx-maplibre-gl maplibre-gl
```

▶️ (2) set the base URL of the Pleiades API, including its `api/` segment. By default it is read from the `pleiadesUrl` setting of your `env.js` (via `EnvService` from `@myrmidon/ngx-tools`), falling back to `http://localhost:5000/api/`:

```js
// env.js
window.__env.pleiadesUrl = "http://localhost:5000/api/";
```

Alternatively, provide the `PLEIADES_API_URL` token:

```ts
import { PLEIADES_API_URL } from "@myrmidon/cadmus-refs-pleiades-lookup";

// in app.config.ts providers:
{ provide: PLEIADES_API_URL, useValue: "https://my.server/pleiades/api/" },
```

▶️ (3) only for the map components (`PleiadesQueryComponent`, `PleiadesQueryDialogComponent`, `PleiadesMapComponent`), configure MapLibre:

- add its CSS to the `styles` array of your `angular.json` (rather than via a SCSS `@import`):

  ```json
  "styles": ["node_modules/maplibre-gl/dist/maplibre-gl.css", "src/styles.scss"]
  ```

- MapLibre 6 loads its worker as a module: copy its worker files to the root of your app (in `angular.json`, `assets`):

  ```json
  { "glob": "maplibre-gl-worker.mjs", "input": "node_modules/maplibre-gl/dist", "output": "/" },
  { "glob": "maplibre-gl-shared.mjs", "input": "node_modules/maplibre-gl/dist", "output": "/" }
  ```

  and provide it in `app.config.ts` (note the secondary entry point):

  ```ts
  import { provideMaplibreWorker } from "@maplibre/ngx-maplibre-gl/config";
  // providers:
  provideMaplibreWorker("maplibre-gl-worker.mjs"),
  ```

- when serving the app with NGINX, ensure that `.mjs` files are served as JavaScript (its default `mime.types` lacks them), else the worker is blocked:

  ```nginx
  include /etc/nginx/mime.types;
  types { application/javascript mjs; }
  ```

## Services

### PleiadesApiService

A client for the Pleiades API. Errors are not handled here, so that you get the original `HttpErrorResponse`: use `getPleiadesErrorMessage(error)` to get a user-facing message from it (validation errors are listed with their parameter names).

- `getLookup(filter: PleiadesLookupFilter)`: get a page of lookup entries (vocabulary URIs like place types, review states, etc.). Set `pageSize` to 0 to get all the matching entries.
- `getPlaceTypes()`: get all the place types having a short name, sorted by it. The result is cached after the first successful request.
- `search(request: PleiadesSearchRequest)`: search places, getting a `PleiadesDataPage<PleiadesSearchResult>`.
- `getPlace(id: string)`: get the details of a place (`PleiadesPlace`), with its names, locations (including their GeoJSON geometries), and connections.
- `getNearby(id: string, options?: PleiadesNearbyOptions)`: get the places nearest to the specified place, nearest first.

A `PleiadesSearchRequest` has these properties, all optional and combined in AND. Numeric filters equal to 0 are not set, coordinates are WGS84 decimal degrees, distances are in meters, and years are negative for BC:

- `text`: the text to search. Each word is matched exactly, unless prefixed by an operator: `^=` starts with, `$=` ends with, `*=` contains, `?=` wildcards (`?` and `*`), `%=` fuzzy (e.g. `%=athene` or `%=athene:0.5`), `~=` regular expression, `<>` not equal. Common stopwords and numbers are not indexed, and are ignored in exact matches.
- `matchAny`: true to match any of the words rather than all.
- `scopes`: the fields to search the text in (default all): `plttl` place title, `pldsc` place description, `pldtl` place details, `lcttl` location title, `nmrmz` romanized name, `nmatt` attested name, `nmdsc` name description. `PLEIADES_SEARCH_SCOPES` lists them with labels, and `PLEIADES_TOPONYM_SCOPES` has those best suited to toponyms (`plttl`, `nmrmz`, `nmatt`).
- `placeTypes`: the place types to match (any of them), as full URIs, `/`-prefixed short names (e.g. `/settlement`), or bare short names.
- `rankMin`, `rankMax`: the rank of the text matches (1-100, 100=most reliable; e.g. 90 excludes doubtful matches).
- `yearMin`, `yearMax`: the years overlapping the time span of names and locations. These apply only to scopes with years (locations and names).
- `distanceLon`, `distanceLat`, `distanceMin`, `distanceMax`: a distance point, and the minimum and/or maximum distance from it. When the point is set, results include their `distance`.
- `swCornerLon`, `swCornerLat`, `neCornerLon`, `neCornerLat`, `containedInBox`: a bounding box which must intersect (or contain, with `containedInBox`) the box of each place. A box crossing the antimeridian has its SW longitude greater than its NE longitude (as in GeoJSON): e.g. `swCornerLon: 170, neCornerLon: -170` is the 20 degrees wide box around it.
- `region`, `containedInRegion`: a polygon (3-200 vertices as `[lng, lat]`, without closing vertex) which must intersect (or contain, with `containedInRegion`) the box of each place. Longitudes are continuous, so they can exceed 180 (up to 540) for a polygon crossing the antimeridian: e.g. `[[170, 10], [190, 10], [180, 20]]`.
- `sort`: `title` (default) or `distance` (requires the distance point).
- `pageNumber` (1-N), `pageSize` (1-100, default 20).

About 18% of the places (e.g. ethnic groups, or places known only from texts) are not located: their `lat` and `lng` are null, and they never match spatial filters.

### PleiadesRefLookupService

A `RefLookupService` (with ID `pleiades`) for `RefLookupComponent`, which uses the quick search as a type-ahead lookup for places. Its items are `PleiadesSearchResult` objects:

- `lookup(filter, options?)`: by default, searches toponyms (`PLEIADES_TOPONYM_SCOPES`), adding the "starts with" operator to the last word typed (e.g. `via app` becomes `via ^=app`), unless it already has an operator. Pass `PleiadesRefLookupOptions` as options to set any search filter except text and paging (`PleiadesSearchFilters`, e.g. `{ placeTypes: ['settlement'], rankMin: 90 }`; `scopes` replaces the default toponym scopes, and an empty array means all scopes), `matchAny: true` to match any word, and `noTypeAhead: true` to use the text as typed. When options are undefined, the filters saved by the user in `PleiadesFiltersStore` are used, if any. Errors yield no items.
- `getById(id)`: gets a place by its Pleiades ID, as a search result (via `pleiadesPlaceToResult`).
- `getName(item)`: returns the place name.

```ts
import { Component, inject, signal } from "@angular/core";
import { LookupProviderOptions, RefLookupComponent } from "@myrmidon/cadmus-refs-lookup";
import { PleiadesRefLookupService, PleiadesSearchResult } from "@myrmidon/cadmus-refs-pleiades-lookup";

@Component({
  selector: "app-place-lookup",
  imports: [RefLookupComponent],
  template: `
    <cadmus-refs-lookup
      [service]="service"
      [item]="item()"
      [lookupProviderOptions]="options"
      linkTemplate="https://pleiades.stoa.org/places/{id}"
      label="place"
      (itemChange)="item.set($event)"
    />
  `,
})
export class PlaceLookupComponent {
  public readonly service = inject(PleiadesRefLookupService);
  public readonly item = signal<PleiadesSearchResult | undefined>(undefined);

  // optional scopes for the lookup
  public readonly options: LookupProviderOptions = {
    pleiades: {
      default: null,
      settlements: { label: "settlements", options: { placeTypes: ["settlement"] } },
    },
  };
}
```

To use Pleiades among the providers of a `RefLookupSetComponent` (you can copy the icon from `public/img/pleiades128.png` in the demo app of this workspace) (e.g. for asserted composite IDs), add a configuration like:

```ts
{
  name: 'Pleiades',
  iconUrl: '/img/pleiades128.png',
  description: 'Pleiades gazetteer of ancient places',
  label: 'ID',
  service: inject(PleiadesRefLookupService),
  itemIdGetter: (item: PleiadesSearchResult) => item?.id,
  itemLabelGetter: (item: PleiadesSearchResult) => item?.name,
  // optional: let users set all the filters in the lookup options
  optDialog: PleiadesLookupOptionsComponent,
  optDialogConfig: PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG,
}
```

To let users switch from the lookup to the full search, set `[hasMore]="true"` on the lookup and open `PleiadesQueryDialogComponent` on its `moreRequest` (see below).

### Lookup Options

The lookup uses the same quick search as `PleiadesQueryComponent`, so all of its filters can apply to the lookup too, except the text, which comes from what the user types in the lookup. To let users set them in the options dialog of `RefLookupComponent`, set its `optDialog` to `PleiadesLookupOptionsComponent`, and its `optDialogConfig` to `PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG` (or any configuration with a large size, as the dialog hosts a map):

```html
<cadmus-refs-lookup
  [service]="service"
  [item]="item()"
  [optDialog]="optDialog"
  [optDialogConfig]="optDialogConfig"
  [(options)]="options"
  label="place"
  (itemChange)="item.set($event)"
/>
```

```ts
public readonly optDialog = PleiadesLookupOptionsComponent;
public readonly optDialogConfig = PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG;
public readonly options = signal<PleiadesRefLookupOptions | undefined>(undefined);
```

The options button of the lookup then opens a dialog with the query component without its text filter. There users can:

- set any filter, including the spatial ones drawn on the map, and search to preview the places matching them.
- apply the filters to the lookup, closing the dialog with them as the lookup options; or cancel, closing it with the original options.
- save the filters (bookmark button), so that they are used whenever the lookup has no options, e.g. the next time the lookup is used. The button's icon shows whether the current filters are the saved ones.

So the lookup uses, in order of priority:

1. the options set by the dialog or by scopes (`lookupProviderOptions`);
2. else, the saved filters;
3. else, the default toponym scopes only.

Note that `RefLookupComponent` resets its options when its dialog is closed without a result (e.g. by pressing Escape), so the saved filters apply again.

### PleiadesFiltersStore

The store of the filters saved by the user in the browser's local storage. The filters are a `PleiadesSearchFilters`, i.e. a search request without text and paging.

- 🛠️ **methods**:
  - `load()`: returns undefined when nothing is saved or the entry is unreadable.
  - `save(filters)`: returns false if storage is not available.
  - `clear()`.
- **storage key**: `cadmus-refs-pleiades-lookup.filters`. To use a different one (e.g. for different apps on the same origin), provide the `PLEIADES_FILTERS_STORAGE_KEY` token.

## Components

### PleiadesQueryComponent

A full search UI for Pleiades:

- **filters**: text (press Enter to search; a help icon describes the text operators), match any, scopes, place types (chips with autocomplete from the place types vocabulary), sort, rank and years ranges. Non-text filters can be collapsed with the tune button, whose badge shows the count of the active ones.
- **spatial filters**, in a toolbar above the map, with 4 modes:
  - none.
  - **range**: click the map to set the distance point, and drag its marker to move it; set the minimum and maximum distances in km. The map shows the matching area (the circle within the maximum distance, or the ring between the minimum and maximum distances), and the excluded area within the minimum distance with a dashed outline. When the point is set, results can be sorted by distance.
  - **bounding box**: drag on the map to draw the box; once drawn, drag inside it to move it, and outside it to pan the map. Shift+drag draws a new box. Check "inside" to match only places fully contained in the box. Boxes can cross the antimeridian: the toolbar then shows "crosses 180°", and the W longitude is greater than the E one.
  - **region**: click the map to add the vertices of a polygon (up to 200), and click its first vertex, double-click, or click the ✓ button to close it. Once closed, drag inside it to move it, drag its vertices to reshape it, and shift+click to start drawing a new one. Check "inside" to match only places fully contained in the region. Regions can cross the antimeridian.
  - coordinates can also be typed in the toolbar fields, and the map reflects them.
- **results**: a progress bar is shown while searching, and errors (e.g. validation errors from the API) in a dismissable banner. Results are shown:
  - in the **map** as named pins, with a popup showing essential metadata on hover (or for the selected place). The map zooms to fit them. Click a pin to select the place (or, in the details tab, to show its details).
  - in a **places tab**, listing them in collapsible panels with buttons to fly to the place in the map, see its details, open its Pleiades page, and pick it. A paginator lets you browse all the pages of the results.
  - in a **details tab**, showing all the details of the selected place: metadata, names, locations (also drawn on the map), connections (click a connected place to see its details and move the map to it), and HTML details.

The component fills its container, laying out map and tabs side by side when the container is at least 1000px wide, else stacking them (via a container query). Give its container a height (e.g. a flex item, or `calc(100dvh - ...)`): without it, the component falls back to its `min-height` (560px), which you can override.

- 🔑 **class**: `PleiadesQueryComponent`
- 🚩 **selector**: `cadmus-pleiades-query`
- ▶️ **inputs**:
  - `request` (`PleiadesSearchRequest?`): the search request (two-way bindable `model`). Set it to fill the filters (and search, when `autoSearch` is true); it is updated at each search.
  - `autoSearch` (`boolean`): true to search when `request` is set by the consumer. Default is false.
  - `hidePick` (`boolean`): true to hide the buttons to pick a place. Default is false.
  - `hideText` (`boolean`): true to hide the text filter (and its match any option), e.g. when the text comes from elsewhere, as in the lookup options. You can still search, using the other filters only. Default is false.
  - `canSaveFilters` (`boolean`): true to show the button that saves the current filters (except text) in `PleiadesFiltersStore`, so that the lookup uses them by default. Its icon shows whether the current filters equal the saved ones. Default is false.
  - `pageSize` (`number`): the default page size (1-100). Default is 50.
  - `defaultScopes` (`PleiadesSearchScope[]`): the default scopes. Default is none (=all).
  - `mapStyle` (`string`): the MapLibre style URL. Default is `PLEIADES_DEFAULT_MAP_STYLE` (OpenFreeMap Liberty).
  - `initialCenter` (`[lng, lat]`): the initial center of the map. Default is `[22, 39]`.
  - `initialZoom` (`number`): the initial zoom of the map. Default is 4.
- 🔥 **outputs**:
  - `placePick` (`PleiadesSearchResult`): emitted when the user picks a place, from the list or from the details.
  - `filtersSave` (`PleiadesSearchFilters`): emitted when the user saves the filters.
- 🛠️ **methods**:
  - `search(pageNumber?)`.
  - `reset()`.
  - `getFilters()`: the current filters, without text and paging. `scopes` is always included; an empty array means all scopes.
  - `saveFilters()`.
- 📡 **signals**:
  - `filters`: the current filters.
  - `filtersSaved`: true if the current filters equal the saved ones.

```ts
import { Component } from "@angular/core";
import { PleiadesQueryComponent, PleiadesSearchResult } from "@myrmidon/cadmus-refs-pleiades-lookup";

@Component({
  selector: "app-pleiades-page",
  imports: [PleiadesQueryComponent],
  template: `
    <div class="page">
      <cadmus-pleiades-query
        [request]="{ text: '^=epidaur', scopes: ['plttl', 'nmrmz'] }"
        [autoSearch]="true"
        (placePick)="onPick($event)"
      />
    </div>
  `,
  styles: `
    .page {
      height: calc(100dvh - 64px);
      display: flex;
      flex-direction: column;
    }
    cadmus-pleiades-query {
      flex: 1 1 auto;
    }
  `,
})
export class PleiadesPageComponent {
  public onPick(place: PleiadesSearchResult): void {
    console.log(place.id, place.name);
  }
}
```

The form state is exposed through `form` (a signal form), and the logic converting it to and from search requests is available as pure functions in `pleiades-query-form`: `createPleiadesQueryControls`, `pleiadesQueryToRequest`, `pleiadesQueryToFilters`, and `pleiadesRequestToQuery`.

### PleiadesQueryDialogComponent

A dialog wrapping `PleiadesQueryComponent`, closed with the picked place (`PleiadesSearchResult`), or with `undefined` when cancelled. Its data (`PleiadesQueryDialogData`) can set `title`, `request`, `autoSearch`, `mapStyle`, `initialCenter`, `initialZoom`, `pageSize`, and `defaultScopes`. Open it with a large size:

```ts
const dialog = inject(MatDialog);

dialog
  .open<PleiadesQueryDialogComponent, PleiadesQueryDialogData, PleiadesSearchResult>(PleiadesQueryDialogComponent, {
    width: "95vw",
    maxWidth: "1600px",
    height: "90vh",
    maxHeight: "90vh",
    data: {
      request: { text: "Epidauros", scopes: ["plttl", "nmrmz", "nmatt"] },
      autoSearch: true,
    },
  })
  .afterClosed()
  .subscribe((place) => {
    if (place) {
      // use the place
    }
  });
```

### PleiadesLookupOptionsComponent

The options component for the Pleiades lookup (see [Lookup Options](#lookup-options)), to be set as the `optDialog` of `RefLookupComponent`. It hosts `PleiadesQueryComponent` with the toponym scopes as its default scopes, without the text filter and the pick buttons, but with the save filters button. It adds apply and cancel buttons.

- 🔑 **class**: `PleiadesLookupOptionsComponent`
- 🚩 **selector**: `cadmus-pleiades-lookup-options`
- 📥 **data** (`PleiadesLookupOptionsData`, from the lookup options dialog): `options` (`PleiadesRefLookupOptions?`), the current lookup options. When they are undefined, the filters start from the saved ones.
- 📤 **result**:
  - on apply: the new options, i.e. the filters, plus `noTypeAhead` and `matchAny` from the original options.
  - on cancel: the original options.
- `PLEIADES_LOOKUP_OPTIONS_DIALOG_CONFIG`: the dialog configuration for `optDialogConfig` (title "Pleiades lookup filters", 95vw up to 1400px wide, 90vh high).

### PleiadesMapComponent

A MapLibre map showing Pleiades places as named pins, and letting users define the spatial filters of a search. It fills its container (min-height 240px), and resizes with it.

- 🔑 **class**: `PleiadesMapComponent`
- 🚩 **selector**: `cadmus-pleiades-map`
- ▶️ **inputs**:
  - `results` (`PleiadesSearchResult[]`): the places to show. Places without coordinates are skipped.
  - `autoFit` (`boolean`): true to fit the map to the results whenever they change. Default is true.
  - `selectedId` (`string?`): the ID of the selected place (two-way bindable `model`).
  - `spatialMode` (`'none' | 'range' | 'bbox' | 'polygon'`): the spatial filter mode.
  - `point` (`[lng, lat]?`): the distance point for range mode (two-way bindable `model`).
  - `distanceMin`, `distanceMax` (`number`): the distances from the point in meters (0=not set).
  - `bbox` (`PleiadesBBox?`): the bounding box for bbox mode (two-way bindable `model`). Its SW longitude is greater than its NE longitude when it crosses the antimeridian.
  - `region` (`[lng, lat][]?`): the vertices of the region for polygon mode, without closing vertex (two-way bindable `model`). Longitudes are continuous, and can exceed 180 when the region crosses the antimeridian.
  - `geometries` (`Geometry[]`): GeoJSON geometries to highlight (e.g. the locations of a place).
  - `mapStyle`, `initialCenter`, `initialZoom`: as for the query component.
- 🔥 **outputs**:
  - `placeClick` (`PleiadesSearchResult`): emitted when the user clicks a pin.
  - `selectedIdChange`, `pointChange`, `bboxChange`, `regionChange`: the model changes.
- 🛠️ **methods**: `fitResults()`, `fitBounds(bbox, maxZoom?)`, `flyTo(place, zoom?)`, `finishDrawing()` (closes the region being drawn, if it has at least 3 vertices), `cancelDrawing()`.
- 📡 **signals**: `drawingCount` (the count of vertices of the region being drawn, 0 when not drawing).

### PleiadesResultListComponent

A list of search results in collapsible panels, each with buttons to fly to the place, show its details, open its Pleiades page, and pick it. The selected result is expanded and scrolled into view.

- 🔑 **class**: `PleiadesResultListComponent`
- 🚩 **selector**: `cadmus-pleiades-result-list`
- ▶️ **inputs**: `results` (`PleiadesSearchResult[]`), `selectedId` (two-way bindable `model`), `hidePick`, `hideFlyTo` (`boolean`).
- 🔥 **outputs**: `flyToRequest`, `detailsRequest`, `placePick` (all with a `PleiadesSearchResult`).

### PleiadesPlaceDetailsComponent

The details of a place (`PleiadesPlace`): header with review state and links, description, types, coordinates, bounding box, subjects, provenance, dates; names (with their attested forms, languages, time spans, and certainty); locations; outgoing and incoming connections and linked places; HTML details (sanitized); rights.

- 🔑 **class**: `PleiadesPlaceDetailsComponent`
- 🚩 **selector**: `cadmus-pleiades-place-details`
- ▶️ **inputs**: `place` (`PleiadesPlace?`), `hidePick`, `hideLocate` (`boolean`).
- 🔥 **outputs**:
  - `placeRequest` (`string`): the ID of a connected place the user wants to see.
  - `locateRequest` (`PleiadesPlace`): the user wants to see the place in a map.
  - `placePick` (`PleiadesSearchResult`): the user picked the place.

## Theming

All the colors come from Material M3 system tokens (`--mat-sys-*`), so the components follow your theme, including dark mode. The map overlays use these CSS custom properties, which you can override on `cadmus-pleiades-map` (or any ancestor):

| property                               | default                    | usage                             |
| -------------------------------------- | -------------------------- | --------------------------------- |
| `--cadmus-pleiades-pin-color`          | `var(--mat-sys-primary)`   | result pins                       |
| `--cadmus-pleiades-pin-selected-color` | `var(--mat-sys-tertiary)`  | the selected pin                  |
| `--cadmus-pleiades-range-color`        | `var(--mat-sys-primary)`   | distance point and matching area  |
| `--cadmus-pleiades-range-min-color`    | `var(--mat-sys-error)`     | area excluded by the min distance |
| `--cadmus-pleiades-bbox-color`         | `var(--mat-sys-tertiary)`  | bounding box                      |
| `--cadmus-pleiades-region-color`       | `var(--mat-sys-tertiary)`  | region and its vertices           |
| `--cadmus-pleiades-geometry-color`     | `var(--mat-sys-secondary)` | highlighted geometries            |

As MapLibre layers require literal colors, the map resolves these properties into colors at runtime, and resolves them again when the theme changes (a change in the class or style of the `html` element, or in the preferred color scheme).

## Utilities

- `pleiades-helpers`: `buildSearchParams`, `buildTypeAheadText`, `formatPleiadesRegion`, `parsePleiadesRegion`, `normalizePlaceType`, `getUriLastSegment`, `getPleiadesPlaceUri`, `formatPleiadesYear`, `formatPleiadesYearSpan`, `formatPleiadesDistance`, `getPleiadesErrorMessage`.
- `pleiades-geo`: `haversineDistance`, `createCirclePolygon`, `createRingPolygon`, `createBBoxPolygon`, `bboxFromCorners`, `moveBBox`, `isInBBox`, `isValidBBox`, `getBBoxWidth`, `crossesAntimeridian`, `createRegionPolygon`, `normalizeRegion`, `moveRegion`, `isInRegion`, `getPointsBounds`, `wrapLng`, `roundCoord`. Boxes and regions handle the antimeridian.
- `pleiades-map-style`: `loadPleiadesMapStyle` loads a MapLibre style and patches its filters to avoid null-comparison warnings from third-party styles.

## History

### 0.0.1

- 2026-10-30:
  - initial release.
  - lookup options: in the options dialog of `RefLookupComponent`, `PleiadesLookupOptionsComponent` lets users set all the filters except text for the lookup. Users can save them in the local storage (`PleiadesFiltersStore`), and the lookup service then uses them by default.
    - `PleiadesQueryComponent`: new `hideText` and `canSaveFilters` inputs, `filtersSave` output, `filters` and `filtersSaved` signals, and `getFilters()` and `saveFilters()` methods.
    - `PleiadesRefLookupOptions`: new `matchAny` option.
