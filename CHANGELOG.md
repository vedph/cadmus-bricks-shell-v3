# History

> 👉 Version numbers here refer to the Docker image for the demo app. For the libraries history, see the README of each library in this workspace.

- 2026-02-13: minor refactoring in `@myrmidon/cadmus-refs-asserted-chronotope` and `@myrmidon/cadmus-refs-historical-date`:
  - ⚠️ renamed `AssertedDate` to `AssertedHistoricalDate` for uniformity and moved it from `@myrmidon/cadmus-refs-asserted-chronotope` to `@myrmidon/cadmus-refs-historical-date`.
  - added `AssertedHistoricalDate` component.
  - fixes to `HistoricalDateComponent` and `DatationComponent`.
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
