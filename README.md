# CadmusBricksShellV3

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

🚀 You can play with the demo at <https://cadmus-bricks-v3.fusi-soft.com> (except for some services I did not put in the demo server).

This is [Cadmus](https://myrmex.github.io/overview/cadmus/) bricks version 3, derived from [Cadmus bricks version 2](https://github.com/vedph/cadmus-bricks-shell-v2). In Cadmus, bricks are small UI widgets providing frequently used logic and UX, and used as the building blocks for part or fragment editors.

V2 retains its own repository for compatibility purposes, while new development will occur on V3 only. The API of the components has not changed, except for these ⚠️ breaking changes:

- all the image annotation components have been moved to a separate [new repository](https://github.com/vedph/ngx-annotorious), refactored for Annotorious V3. Bricks V2 still depend on Annotorious V2, which is now deprecated. In this repository, a new separate library provides the core wrapper for using Annotorious V3 in Angular. Cadmus bricks V3 libraries depend on it, and are found in the same repository.
- a new [flags set brick](projects/myrmidon/cadmus-ui-flag-set/README.md) replaces the legacy (V2) [Cadmus UI flags picker](https://github.com/vedph/cadmus-bricks-shell-v2/blob/master/projects/myrmidon/cadmus-ui-flags-picker/README.md), which was much harder to use, and also provides new features in addition to all those provided by the legacy V2 component. So, if your components relied on that legacy component, you should upgrade them to use the new one, which is a very simple procedure.

All the V3 bricks start from **major version number 8**, and align with modern Angular, so they are standalone components, and use signal-based input and output properties.

To use a brick:

1. install the package with NPM. If additional third-party dependencies or configuration is required, this is documented in the package README (see the list below).
2. import the component(s) you want to use.
3. use the brick via its selector in your component template, binding it to your code as required by its API.

## Docker

🐋 Quick Docker image build (the only purpose of this image is letting testers play with controls in the incubator):

1. `npm run build-lib`.
2. ensure to update the version in `env.js` (and `docker-compose.yml`), and `ng build --configuration production`.
3. `docker build . -t vedph2020/cadmus-bricks-v3:9.0.2 -t vedph2020/cadmus-bricks-v3:latest` (replace with the current version).

Use [publish.bat](publish.bat) to publish the libraries to NPM.

## Codicology

- [@myrmidon/cadmus-cod-location](projects/myrmidon/cadmus-cod-location/README.md)

## Imaging

All imaging libraries have been moved into a separate repository: [@myrmidon/ngx-annotorious](https://github.com/vedph/ngx-annotorious).

## Physical

- [@myrmidon/cadmus-mat-physical-grid](projects/myrmidon/cadmus-mat-physical-grid/README.md)
- [@myrmidon/cadmus-mat-physical-size](projects/myrmidon/cadmus-mat-physical-size/README.md)
- [@myrmidon/cadmus-mat-physical-state](projects/myrmidon/cadmus-mat-physical-state/README.md)

## References

- [@myrmidon/cadmus-refs-doc-references](projects/myrmidon/cadmus-refs-doc-references/README.md)

- [@myrmidon/cadmus-refs-assertion](projects/myrmidon/cadmus-refs-assertion/README.md)

- [@myrmidon/cadmus-refs-asserted-ids](projects/myrmidon/cadmus-refs-asserted-ids/README.md)
- [@myrmidon/cadmus-refs-decorated-ids](projects/myrmidon/cadmus-refs-decorated-ids/README.md)
- [@myrmidon/cadmus-refs-external-ids](projects/myrmidon/cadmus-refs-external-ids/README.md)

- [@myrmidon/cadmus-refs-decorated-counts](projects/myrmidon/cadmus-refs-decorated-counts/README.md)

- [@myrmidon/cadmus-refs-chronotope](projects/myrmidon/cadmus-refs-chronotope/README.md)
- [@myrmidon/cadmus-refs-asserted-chronotope](projects/myrmidon/cadmus-refs-asserted-chronotope/README.md)
- [@myrmidon/cadmus-refs-historical-date](projects/myrmidon/cadmus-refs-historical-date/README.md)

- [@myrmidon/cadmus-refs-proper-name](projects/myrmidon/cadmus-refs-proper-name/README.md)

- [@myrmidon/cadmus-refs-lookup](projects/myrmidon/cadmus-refs-lookup/README.md)
- [@myrmidon/cadmus-refs-dbpedia-lookup](projects/myrmidon/cadmus-refs-dbpedia-lookup/README.md)
- [@myrmidon/cadmus-refs-geonames-lookup](projects/myrmidon/cadmus-refs-geonames-lookup/README.md)
- [@myrmidon/cadmus-refs-mufi-lookup](projects/myrmidon/cadmus-refs-mufi-lookup/README.md)
- [@myrmidon/cadmus-refs-viaf-lookup](projects/myrmidon/cadmus-refs-viaf-lookup/README.md)
- [@myrmidon/cadmus-refs-whg-lookup](projects/myrmidon/cadmus-refs-whg-lookup/README.md)

## Text

- [@myrmidon/cadmus-text-block-view](projects/myrmidon/cadmus-text-block-view/README.md)
- [@myrmidon/cadmus-text-ed](projects/myrmidon/cadmus-text-ed/README.md)
- [@myrmidon/cadmus-text-ed-md](projects/myrmidon/cadmus-text-ed-md/README.md)
- [@myrmidon/cadmus-text-ed-txt](projects/myrmidon/cadmus-text-ed-txt/README.md)

## UI

- [@myrmidon/cadmus-ui-custom-action-bar](projects/myrmidon/cadmus-ui-custom-action-bar/README.md)
- [@myrmidon/cadmus-ui-flag-set](projects/myrmidon/cadmus-ui-flag-set/README.md)
- [@myrmidon/cadmus-ui-note-set](projects/myrmidon/cadmus-ui-note-set/README.md)

## V3 Creation

I created this workspace with these commands:

```bash
ng new cadmus-bricks-shell-v3
cd cadmus-bricks-shell-v3
ng add @angular/material
ng add @angular/localize

ng g library @myrmidon/cadmus-cod-location --prefix cadmus
ng g library @myrmidon/cadmus-mat-physical-grid --prefix cadmus
ng g library @myrmidon/cadmus-mat-physical-size --prefix cadmus
ng g library @myrmidon/cadmus-mat-physical-state --prefix cadmus
ng g library @myrmidon/cadmus-refs-asserted-chronotope --prefix cadmus
ng g library @myrmidon/cadmus-refs-asserted-ids --prefix cadmus
ng g library @myrmidon/cadmus-refs-assertion --prefix cadmus
ng g library @myrmidon/cadmus-refs-chronotope --prefix cadmus
ng g library @myrmidon/cadmus-refs-citation --prefix cadmus
ng g library @myrmidon/cadmus-refs-dbpedia-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-decorated-counts --prefix cadmus
ng g library @myrmidon/cadmus-refs-decorated-ids --prefix cadmus
ng g library @myrmidon/cadmus-refs-doc-references --prefix cadmus
ng g library @myrmidon/cadmus-refs-external-ids --prefix cadmus
ng g library @myrmidon/cadmus-refs-geonames-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-historical-date --prefix cadmus
ng g library @myrmidon/cadmus-refs-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-mufi-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-proper-name --prefix cadmus
ng g library @myrmidon/cadmus-refs-viaf-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-whg-lookup --prefix cadmus
ng g library @myrmidon/cadmus-text-block-view --prefix cadmus
ng g library @myrmidon/cadmus-text-ed --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-md --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-txt --prefix cadmus
ng g library @myrmidon/cadmus-ui-custom-action-bar --prefix cadmus
ng g library @myrmidon/cadmus-ui-flag-set --prefix cadmus
ng g library @myrmidon/cadmus-ui-note-set --prefix cadmus
```

## History

👉 For the libraries history, see the README of each library in this workspace.

- 2025-06-04:
  - refactored workspace from a native Angular 20 setup.
  - improvements in asserted IDs.
  - fixed some dependencies versions.

### 9.0.2

- 2025-06-03: fixes to asserted chronotope.
- 2025-06-01: fixes to cod location.

### 9.0.1

- 2025-05-31: fix to `CodLocationComponent` and more tests for its parser.

### 9.0.0

- 2025-05-29:
  - ⚠️ upgraded to Angular 20 and bumped all the major version numbers.
  - migrated remaining legacy control flow to new control flow in templates.
  - fix to citation scheme not updated on citation set in citation component.

### 8.0.6

- 2025-05-22: fixes to:
  - `@myrmidon/cadmus-cod-location` (final dash)
  - `@myrmidon/cadmus-refs-historical-date` (increased debounce time)

### 8.0.5

- 2025-05-15: refactored `@myrmidon/cadmus-ui-note-set` (9.0.0).

### 8.0.4

- 2025-05-14:
  - updated Angular and packages.
  - fix to `@myrmidon/cadmus-cod-location` (8.0.1).

### 8.0.3 - 2025-04-14

- 2025-04-13:
  - updated Angular and packages.
  - refactored citation components.

### 8.0.2 - 2025-03-31

- 2025-03-31: updated Angular.
- 2025-03-25:
  - added components to `@myrmidon/cadmus-refs-lookup`.
  - refactored settings for `@myrmidon/cadmus-refs-citation`.
  - updated Angular.
- 2025-03-12: updated Angular and packages.
- 2025-03-08: added MUFI lookup library [@myrmidon/cadmus-refs-mufi-lookup](projects/myrmidon/cadmus-refs-mufi-lookup/README.md).

### 8.0.1 - 2025-02-21

- 2025-02-21:
  - updated Angular and packages.
  - fixes to Commedia counts in demo.
  - more stylish citation set.

### 8.0.0 - 2025-02-20

- 2025-02-09: added [@myrmidon/cadmus-refs-citation](projects/myrmidon/cadmus-refs-citation/README.md)
- 2025-01-22: updated Angular and packages.
