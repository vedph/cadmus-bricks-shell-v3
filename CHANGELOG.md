# History

> 👉 Version numbers here refer to the Docker image for the demo app. For the libraries history, see the README of each library in this workspace.

- 2026-10-03: fixed `ng serve` failing at startup with `Failed to resolve import "@myrmidon/cadmus-ui-object-view" from ".angular/cache/.../vite/deps/@myrmidon_taxo-store-picker.js"`. The external `@myrmidon/taxo-store-picker` imports the local `cadmus-refs-lookup`, so Vite prebundled it with an inlined copy of `cadmus-refs-lookup`, which has imports of other local libraries (`cadmus-ui-object-view`, `cadmus-refs-citation`); it then looked for in `node_modules`, where local libraries are not installed (it surfaced now because the Angular update invalidated the old prebundle cache). Adding the local library to `package.json` is not the fix: that would also leave the picker with its own copy of the lookup components, besides the app's. Now `@myrmidon/taxo-store-picker` and its `@myrmidon/taxo-store-editor` (not hoisted to the root `node_modules`) are excluded from the dev-server prebundling in `angular.json`, so they are bundled with the app code like in production, sharing a single copy of each local library. `scripts/check-local-libs.js` now also checks that every local library, and every external `@myrmidon` package importing one, is in that exclusion list.
- 2026-10-02: fixed all the failing library tests (the whole suite now passes with no unhandled errors):
  - `cadmus-mat-physical-size` 10.0.3: fixed `PhysicalSizeComponent` emitting an empty size about 400ms after opening when no size was bound, which could turn a hosting editor dirty without any change.
  - `cadmus-cod-location` 10.0.4, `cadmus-geo-location` 1.0.4, `cadmus-mat-physical-grid` 10.0.3, `cadmus-mat-physical-size` 10.0.3, `cadmus-named-value` 0.0.4, `cadmus-ui-note-set` 12.0.3: test harness fixes. The tests wrote signals and then only waited (with timers or `whenStable()`), without running change detection, so the effects reacting to those signals never ran, including those behind `toObservable` feeding the debounced streams. The tests now call `fixture.detectChanges()` before waiting.
  - `cadmus-refs-proper-name`: its tests used `TestBed.tick()` for the same purpose, which in this zone-based test setup caused unhandled `NG0101` (recursive `ApplicationRef.tick`) errors; they now use `fixture.detectChanges()` too.
- 2026-10-02: `cadmus-refs-proper-name`: fixed `NG0956` in `ProperNameComponent` and `ProperNamePieceComponent`. The pieces table tracked pieces by identity, and the component rebuilds them as new objects whenever its name is set from outside, so every row was re-created. It now tracks by `$index`. The language, tag, type and value selects now track thesaurus entries by `id` instead of by identity.
- 2026-10-02: `cadmus-refs-proper-name`: `ProperNameComponent` no longer resets itself (closing the assertion panel and piece editor) after its own emissions; `ProperNamePieceComponent` no longer swallows a user type change after loading a piece, and no longer resets a still valid preset value on type change. Fixed the timing-dependent "updates typeValues" test. See the library README.
- 2026-10-02: updated to `@myrmidon/cadmus-core` and `@myrmidon/cadmus-api` 20 (and Angular 22.2.1, which they require):
  - build: `build-lib` now runs `scripts/build-libs.mjs`, which builds all the libraries in dependency order, computed from both their manifests and their actual imports. The old hand-written chain built `cadmus-refs-lookup` before `cadmus-ui-object-view`, which it imports, so a build from a clean `dist` failed. `node scripts/build-libs.mjs <lib>` rebuilds a library and everything downstream of it; `--dry` prints the order.
  - `scripts/check-local-libs.js` (`pnpm check-libs`, also run by the build script) fails if a local library is present in `node_modules` (copy or link), is missing from the `tsconfig.json` paths, or is missing from the `overrides`/`ignoreMissing` lists of `pnpm-workspace.yaml`.
  - removed `@myrmidon/cadmus-ui-object-view` from the root dependencies: being a local library, that made pnpm link it into `node_modules`, a second resolution path besides `tsconfig.json` (see NG0912).
  - updated the libraries peer dependencies on `cadmus-core`/`cadmus-api` to 20.
- 2026-10-01: `cadmus-refs-lookup`:
  - fixed `NG0956` in `RefLookupComponent`: its options list tracked items by identity, and each lookup response brings new objects, so every option was destroyed and re-created. It now tracks by `$index`.
  - fixed 5 failing `RefLookupComponent` tests. They were test harness issues, not component bugs: four set the lookup value without running change detection, which `toObservable` needs before it emits; one read the clear button's `aria-describedby`, which `MatTooltip` adds in an `afterNextRender` hook, before rendering had completed.
- 2026-09-25: updated Angular and packages.
- 2026-09-23:
  - fix to `cadmus-cod-location`, which sent a location it did not change: whenever the text box got filled, including from the initial or an external location, the text got parsed again after 300 ms. The result was a new array with the same content, so `locationChange` fired. That's why every editor using this component turned dirty right after opening. Fix: a new `setLocation()` only updates the location when the ranges actually differ. It still tells null apart from an empty list. Typing a real change still emits as before.
  - fix to `cadmus-refs-lookup`: the code that reacts to a new lookup service also runs when the component starts, and it cleared the item. Any item passed in was lost and `itemChange(undefined)` was sent. It also ran, and cleared the item, whenever `lookupProviderOptions` changed. Fix: the item is now cleared only when the service really changes. Scopes are still re-applied as before.

- 2026-09-13: fixes to `@mydmion/cadmus-refs-lookup` and its dependencies. `RefLookupSetComponent` adopted the caller-owned `RefLookupConfig` object — which holds a live injected service instance (`config.service`, e.g. `ViafRefLookupService`) directly into an `@angular/forms/signals` field. Real injected Angular services routinely contain circular references (HTTP interceptor chains, DI back-references, RxJS Subjects), whence potential overflows.

The fix: RefLookupSetComponent.config is now a plain signal<RefLookupConfig | null>, driven by an explicit (selectionChange) handler instead of [formField]/form() — it never had any real validators anyway (form(this._draft) was called with no schema), so nothing is lost. Added a permanent regression test using a deliberately self-referential fake service. Full workspace suite: 1786/1786 tests pass, zero regressions.

I also found and fixed the thing that made this so hard to pin down: cadmus-shell-v3/angular.json was missing the prebundle.exclude list that cadmus-bricks-shell-v3 already carries (documented in its own signal-forms-migration.md as a previously-solved problem in that repo). Without it, Vite's dev-server freezes @myrmidon/* packages in a cache keyed by version, independent of dist/ rebuilds — which is exactly why several of our test rounds showed stale behavior despite rebuilds. I've added the same exclusion to cadmus-shell-v3/angular.json.

- 2026-09-08: inspected [NG0912](ng0912-workspace-playbook.md). Warnings are only in `ng serve` for development (probably due to Vite resolution mechanism) and do not affect production packages.
- 2026-09-03: updated packages.
- 2026-08-25:
  - ⚠️ migrated all forms to signal-based forms, updating tests accordingly and fixing some bugs in the process.
  - adjusted the workspace for libraries references.
  - bumped all package release versions.

## 10.0.12

- 2026-08-22:
  - ⚠️ updated packages fixing an API issue with maplibre in `geo-location-editor` where the zoom type has changed and configuring the library as described in <https://github.com/maplibre/ngx-maplibre-gl>.
  - implemented tests for all libraries except `cadmus-refs-*-lookup`, fixing some bugs.
  - all libraries version release numbers bumped.
- 2026-07-27: ⚠️ upgraded `maplibre-gl` 5→6 and `@maplibre/ngx-maplibre-gl` 21→22. MapLibre v6 dropped its UMD/CommonJS build and ships ESM-only, which breaks the worker script lookup under Angular's esbuild bundler (`import.meta.url` resolves to the bundled chunk, not to `maplibre-gl.mjs`, so the default worker URL 404s and any map using a real source silently hangs instead of firing `load`/`idle`). To fix, repeat in any workspace using MapLibre:
  - in `angular.json`, remove `"maplibre-gl"` from `allowedCommonJsDependencies` (no longer needed, v6 has no CommonJS build) and add an `assets` entry copying the worker + its dependency chunk as static files:

    ```json
    {
      "glob": "maplibre-gl-{worker,shared}.mjs",
      "input": "node_modules/maplibre-gl/dist",
      "output": "assets/maplibre-gl"
    }
    ```

  - in `main.ts`, call `setWorkerUrl` from `maplibre-gl` before `bootstrapApplication`, pointing at the copied asset (respects `<base href>`):

    ```ts
    import { setWorkerUrl } from 'maplibre-gl';
    setWorkerUrl(new URL('assets/maplibre-gl/maplibre-gl-worker.mjs', document.baseURI).toString());
    ```

## 10.0.11

- 2026-07-06: Docker.
- 2026-06-30: 🆕 added named values library.

## 10.0.10

- 2026-06-16: 🆕 added Iconclass lookup.
- 2026-06-08: ⚠️ upgraded to Angular 22, bumping all libraries major versions number because of the breaking change in their peer dependencies.

## 10.0.9

- 2026-05-13:
  - changes to text in API-related demo pages.
  - add API to Docker compose script.

## 10.0.8

- 2026-05-12: updated Angular and packages.
- 2026-04-29: updated Angular and packages.
- 2026-03-27:
  - updated Angular and packages.
  - style improvements in historical date.
- 2026-03-18: adjusted components colors to use CSS variables. General guidance:

## 10.0.7

```css
/* tables (look for #e2e2e2) */
table {
  width: 100%;
  border-collapse: collapse;
}
tbody tr:nth-child(odd) {
  background-color: var(--mat-sys-surface-container);
}
th {
  text-align: left;
  font-weight: normal;
  color: var(--mat-sys-on-surface-variant);
}
tbody tr:hover {
  background-color: var(--mat-sys-surface-container-high);
}
td.fit-width {
  width: 1px;
  white-space: nowrap;
}
tbody tr.selected {
  background-color: var(--mat-sys-secondary-container);
  color: var(--mat-sys-on-secondary-container);
}

/* color silver */
var(--mat-sys-on-surface-variant);
/* color red */
var(--mat-sys-error);
/* color green */
var(--mat-sys-success)
```

- 2026-03-17:
  - updated Angular and packages.
  - refactored styles in shell app.
  - 🆕 added theme toggler to shell app. This allows checking the components rendition under both themes.
- 2026-03-02: improve `CitSchemeService.toString`.
- 2026-02-22:
  - updated Angular and packages.
  - fixes to geo location editor.

## 10.0.6

- 2026-02-16: minor renaming in asserted historical date selector.
- 2026-02-15: fixes to MapLibre usage in geographic location.
- 2026-02-13: ⚠️ refactored DBPedia services in `@myrmidon/cadmus-refs-dbpedia-lookup` and `@myrmidon/cadmus-refs-sparql`.

## 10.0.5

- 2026-02-13: minor refactoring in `@myrmidon/cadmus-refs-asserted-chronotope` and `@myrmidon/cadmus-refs-historical-date`:
  - ⚠️ renamed `AssertedDate` to `AssertedHistoricalDate` for uniformity and moved it from `@myrmidon/cadmus-refs-asserted-chronotope` to `@myrmidon/cadmus-refs-historical-date`.
  - added `AssertedHistoricalDate` component.
  - fixes to `HistoricalDateComponent` and `DatationComponent`.
  - updated Angular and packages.
- 2026-02-11:
  - 🆕 added new library with a geographic location editor (`@myrmidon/cadmus-geo-location`).
- 2026-02-09:
  - added `getById` reverse lookup to lookup services and components. Consumers of lookup components typically just store the item ID (often decorated, e.g. `viaf:` before a VIAF ID if we want to store a provider identifier); this makes it difficult to use the lookup components without additional logic which would be required to fetch the item from its ID and bind it to the lookup. Thus, reverse lookup logic has been added to all lookup services, so that now the lookup component can be bound to either a full item object or just to a string representing its ID -- in the latter case, the lookup component will internally fetch the item and use it as its value.
  - added `itemId` and `itemIdParser` properties to `RefLookupConfig`. The parser function is used to get the raw ID from decorated IDs when consumers decorate them.
  - implemented `getById` in all lookup services:
    - full implementation: MOL, MUFI, Zotero, ITEM, GeoNames (added `GeoNamesService.get()`), WHG, VIAF (added `ViafService.getRecord()`), DBPedia, Biblissima;
    - stubs: PIN (which is used for internal links only).
  - asserted chronotope: added opt-in feature for looking up places instead of typing their names according to some conventions. To this end, the component gets a new input property `placeLookupConfig` (with value of type `RefLookupConfig`) which when set switches from typing to lookup for places.
  - automatically set asserted composite ID scope to selected lookup service ID rather than name.

## 10.0.4

- 2026-02-06: updated Angular and packages.
- 2026-02-04: 🆕 added presets to lookup. This implied updating versions in `*lookup` libraries and in `@myrmidon/cadmus-refs-asserted-ids` and passing this property down to components hierarchies wherever they used lookup.
- 2026-02-03: 🆕 added Biblissima+ lookup.
- 2026-02-02: ⚠️ migrated demo app to zoneless by:
  - replacing `provideZoneChangeDetection` with `provideZonelessChangeDetection` in `app.config.ts`.
  - removing `zone.js` from `angular.json` polyfills.
  - uninstalling `zone.js`.
- 2026-02-01: ⚠️ migrated tests from Karma to Vitest. This affects tests only, which will be progressively rewritten and enriched. To debug a single test, tempoarily use `it.only` or `describe.only`. Note that this workspace has proper configuration for debugging tests and running them via `ng test`; the Vitest VSCode extension (`vitest.explorer`) runs `vitest` directly, which does _not_ work with Angular projects. Angular requires `ng test` to compile templates before running tests. Running vitest directly causes "Component is not resolved" errors.

## 10.0.3

- 2026-01-29: updated Angular and packages.
- 2026-01-17: added `features` (from thesaurus `asserted-id-features`) and `note` to asserted IDs.
- 2025-12-04: updated Angular.

## 10.0.2

- 2025-12-01: updated Angular and packages.
- 2025-11-26: 🆕 added MOL lookup library.
- 2025-11-22:
  - ⚠️ upgraded to Angular 21.
  - ⚠️ migrated to `pnpm`.
- 2025-11-19:
  - updated Angular.
  - changed default GID in `PinTargetLookupComponent` to include pin name before its value.

## 10.0.1

- 2025-10-08:
  - updated Angular and packages.
  - Docker image.
- 2025-10-07: 🆕 added `slide` to the points of a historical date (`@myrmidon/cadmus-refs-historical-date`).
- 2025-10-01:
  - fixes to object view and improvements to doc refs lookup.
  - updated Angular.
- 2025-09-26:
  - 🆕 added object view library.
  - 🆕 added object view for the item picked by lookup in `@myrmidon/cadmus-refs-lookup` doc-references component. This allows users to pick any specific property from a complex object retrieved via the lookup service.
- 2025-09-16: more robust input coords in physical grid.

## 10.0.0

- 2025-09:15:
  - minor fixes.
  - Docker image.
- 2025-09-12:
  - refactored `@myrmidon/cadmus-text-block-view` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-external-ids` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-proper-name` for `OnPush`.
- 2025-09-11:
  - removed NG0912 component collision from the app by importing from NPM packages only.
  - refactored `@myrmidon/cadmus-refs-asserted-chronotope` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-chronotope` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-citation` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-asserted-ids` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-decorated-counts` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-decorated-ids` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-historical-date` for `OnPush`.
- 2025-09-10:
  - refactored `@myrmidon/cadmus-cod-location` for `OnPush`.
  - refactored `@myrmidon/cadmus-mat-physical-grid` for `OnPush`.
  - refactored `@myrmidon/cadmus-mat-physical-size` for `OnPush`.
  - refactored `@myrmidon/cadmus-mat-physical-state` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-assertion` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-doc-references` for `OnPush`.
  - refactored `@myrmidon/cadmus-refs-lookup` for `OnPush`.
  - refactored `@myrmidon/cadmus-text-ed` for `OnPush`.
  - refactored `@myrmidon/cadmus-text-ed-md` for `OnPush`.
  - refactored `@myrmidon/cadmus-text-ed-txt` for `OnPush`.
  - refactored `@myrmidon/cadmus-ui-custom-action-bar` for `OnPush`.
  - refactored `@myrmidon/cadmus-ui-flag-set` for `OnPush`.
  - refactored `@myrmidon/cadmus-ui-note-set` for `OnPush`.

## 9.0.7

- 2025-09-03:
  - fixes to Zotero lookup.
  - updated Angular and packages.
- 2025-09-01: added experimental Zotero service in new library.
- 2025-08-06: fix to asserted composite ID auto-scope (`@myrmidon/cadmus-refs-asserted-ids`).
- 2025-07-30:
  - fix missing thesauri in doc references of asserted chronotope date (`@myrmidon/cadmus-refs-lookup`).
  - fixes to asserted chronotope editor (`@myrmidon/cadmus-refs-asserted-chronotope`).
- 2025-07-24: make base VIAF root API URI overridable.
- 2025-07-23: increased version number for VIAF lookup library.

## 9.0.6

- 2025-07-15:
  - ⚠️ rewritten VIAF service to use new API. Note that this requires your `app.config` file to provide the HTTP service no longer configured `withJsonpSupport()` but rather `withFetch()`!
  - replaced all doc references usages in bricks with lookup doc references (affecting `@myrmidon/cadmus-refs-assertion` and `@myrmidon/cadmus-refs-decorated-ids`).
  - ⚠️ renamed selectors with `cadmus-ref-...` to `cadmus-refs-...`.
- 2025-07-14: updated Angular and packages.
- 2025-07-08: fixed `unitDisabled` (renamed from `staticUnit`).
- 2025-07-07: added `staticUnit` property to physical dimension editor.
- 2025-04-07: refactored `PhysicalDimensionComponent` (not used) and added a test page.

## 9.0.5

- 2025-07-02: updated Angular.
- 2025-06-29: improved physical grid (`@myrmidon/cadmus-mat-physical-grid`).
- 2025-06-27: fixes to asserted composite IDs (`@myrmidon/cadmus-refs-asserted-ids`).

## 9.0.4

- 2025-06-21: fixes to asserted composite IDs (`@myrmidon/cadmus-refs-asserted-ids`).
- 2025-06-13: added pin name to asserted composite ID lookup info (`@myrmidon/cadmus-refs-asserted-ids`).
- 2025-06-12: fixed default unit not honored when parsing size (`@myrmidon/mat-physical-size`).

## 9.0.3

- 2025-06-04:
  - refactored workspace from a native Angular 20 setup.
  - improvements in asserted IDs.
  - fixed some dependencies versions.

## 9.0.2

- 2025-06-03: fixes to asserted chronotope.
- 2025-06-01: fixes to cod location.

## 9.0.1

- 2025-05-31: fix to `CodLocationComponent` and more tests for its parser.

## 9.0.0

- 2025-05-29:
  - ⚠️ upgraded to Angular 20 and bumped all the major version numbers.
  - migrated remaining legacy control flow to new control flow in templates.
  - fix to citation scheme not updated on citation set in citation component.

## 8.0.6

- 2025-05-22: fixes to:
  - `@myrmidon/cadmus-cod-location` (final dash)
  - `@myrmidon/cadmus-refs-historical-date` (increased debounce time)

## 8.0.5

- 2025-05-15: refactored `@myrmidon/cadmus-ui-note-set` (9.0.0).

## 8.0.4

- 2025-05-14:
  - updated Angular and packages.
  - fix to `@myrmidon/cadmus-cod-location` (8.0.1).

## 8.0.3 - 2025-04-14

- 2025-04-13:
  - updated Angular and packages.
  - refactored citation components.

## 8.0.2 - 2025-03-31

- 2025-03-31: updated Angular.
- 2025-03-25:
  - added components to `@myrmidon/cadmus-refs-lookup`.
  - refactored settings for `@myrmidon/cadmus-refs-citation`.
  - updated Angular.
- 2025-03-12: updated Angular and packages.
- 2025-03-08: added MUFI lookup library [@myrmidon/cadmus-refs-mufi-lookup](projects/myrmidon/cadmus-refs-mufi-lookup/README.md).

## 8.0.1 - 2025-02-21

- 2025-02-21:
  - updated Angular and packages.
  - fixes to Commedia counts in demo.
  - more stylish citation set.

## 8.0.0 - 2025-02-20

- 2025-02-09: added [@myrmidon/cadmus-refs-citation](projects/myrmidon/cadmus-refs-citation/README.md)
- 2025-01-22: updated Angular and packages.
