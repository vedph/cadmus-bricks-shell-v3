# Cadmus Bricks Shell V3

- [Cadmus Bricks Shell V3](#cadmus-bricks-shell-v3)
  - [Monaco Editor Configuration for Angular 21](#monaco-editor-configuration-for-angular-21)
    - [The Issue](#the-issue)
    - [Required Configuration Steps](#required-configuration-steps)
      - [1. Install Compatible Monaco Editor Version](#1-install-compatible-monaco-editor-version)
      - [2. Add Monaco Types to TypeScript Configuration](#2-add-monaco-types-to-typescript-configuration)
      - [3. Configure NGE Monaco Module](#3-configure-nge-monaco-module)
      - [4. Using Monaco in Components](#4-using-monaco-in-components)
    - [Why These Steps Are Necessary](#why-these-steps-are-necessary)
    - [Troubleshooting](#troubleshooting)
    - [Additional Resources](#additional-resources)
  - [Docker](#docker)
  - [Codicology](#codicology)
  - [Imaging](#imaging)
  - [Physical](#physical)
  - [References](#references)
  - [Text](#text)
  - [UI](#ui)
  - [V3 Creation](#v3-creation)
  - [OnPush Progress](#onpush-progress)
  - [History](#history)
    - [10.0.3](#1003)
    - [10.0.2](#1002)
    - [10.0.1](#1001)
    - [10.0.0](#1000)
    - [9.0.7](#907)
    - [9.0.6](#906)
    - [9.0.5](#905)
    - [9.0.4](#904)
    - [9.0.3](#903)
    - [9.0.2](#902)
    - [9.0.1](#901)
    - [9.0.0](#900)
    - [8.0.6](#806)
    - [8.0.5](#805)
    - [8.0.4](#804)
    - [8.0.3 - 2025-04-14](#803---2025-04-14)
    - [8.0.2 - 2025-03-31](#802---2025-03-31)
    - [8.0.1 - 2025-02-21](#801---2025-02-21)
    - [8.0.0 - 2025-02-20](#800---2025-02-20)

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

## Monaco Editor Configuration for Angular 21

⚠️ **Important**: If you're upgrading an existing Angular workspace to Angular 21 and using Monaco Editor via `@cisstech/nge`, you must follow these configuration steps to avoid build errors.

### The Issue

Angular 21 uses a new esbuild-based builder which has stricter requirements for handling Monaco Editor dependencies. You may encounter these errors:

- **TypeScript error**: `Cannot find namespace 'monaco'`
- **Build error**: `No loader is configured for ".ttf" files: ...monaco-editor/.../codicon.ttf`

### Required Configuration Steps

#### 1. Install Compatible Monaco Editor Version

`@cisstech/nge@18.3.0` requires `monaco-editor@^0.43.0`. **Do not** use `monaco-editor@0.55.x` or newer, as these versions have breaking changes that cause TTF font loading issues with Angular 21's esbuild.

In your `package.json`:

```json
{
  "dependencies": {
    "@cisstech/nge": "^18.3.0",
    "monaco-editor": "^0.43.0"
  }
}
```

#### 2. Add Monaco Types to TypeScript Configuration

Add `monaco-editor` to the types array in your `tsconfig.app.json` to make the `monaco` namespace globally available:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": [
      "@angular/localize",
      "monaco-editor"
    ]
  }
}
```

#### 3. Configure NGE Monaco Module

In your `app.config.ts` (or equivalent application configuration file):

```typescript
import { NgeMonacoModule } from '@cisstech/nge/monaco';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    importProvidersFrom(NgeMonacoModule.forRoot({})),
  ],
};
```

By default, `@cisstech/nge` loads Monaco Editor from CDN (`https://cdn.jsdelivr.net/npm/monaco-editor@0.20.0`), so you don't need to configure asset paths unless you want to serve Monaco from your own server.

#### 4. Using Monaco in Components

You can now use the `monaco` namespace in your components without importing it:

```typescript
import { Component } from '@angular/core';
import { NgeMonacoModule } from '@cisstech/nge/monaco';

@Component({
  selector: 'app-my-editor',
  imports: [NgeMonacoModule],
  template: `<nge-monaco-editor (onInit)="onEditorInit($event)"></nge-monaco-editor>`
})
export class MyEditorComponent {
  private editor?: monaco.editor.IStandaloneCodeEditor;

  onEditorInit(editor: monaco.editor.IEditor) {
    this.editor = editor as monaco.editor.IStandaloneCodeEditor;
    // Configure editor...
  }
}
```

### Why These Steps Are Necessary

- **Version compatibility**: `@cisstech/nge@18.3.0` was built and tested with `monaco-editor@^0.43.0`. Newer versions (0.50+) introduce breaking changes in how fonts are loaded.
- **Type definitions**: The `monaco` namespace is provided by monaco-editor's type definitions. Adding it to the TypeScript configuration makes these types globally available without explicit imports.
- **Angular 21 esbuild**: The new Angular builder has different handling of CSS imports and font files compared to webpack, making newer Monaco versions incompatible without additional configuration.

### Troubleshooting

If you still encounter issues:

1. **Clear build cache**: Delete `node_modules`, `package-lock.json` (or `pnpm-lock.yaml`), and `.angular` folder, then reinstall.
2. **Verify versions**: Run `npm list monaco-editor` or `pnpm list monaco-editor` to ensure the correct version is installed.
3. **Check for conflicting configs**: Ensure no other TypeScript config files are overriding the types configuration.

### Additional Resources

- [Monaco Editor - Loading TTF in Angular 17+ - Stack Overflow](https://stackoverflow.com/questions/78293918/loading-ttf-of-monaco-editor-in-angular-17)
- [Angular CLI TTF loader issue - GitHub](https://github.com/angular/angular-cli/issues/25235)
- [@cisstech/nge Documentation](https://github.com/cisstech/nge)

## Docker

🐋 Quick **Docker image** build (the only purpose of this image is letting testers play with controls in the incubator):

1. `npm run build-lib`.
2. ensure to update the version in `env.js` (and `docker-compose.yml`), and `ng build --configuration production`.
3. `docker build . -t vedph2020/cadmus-bricks-v3:10.0.3 -t vedph2020/cadmus-bricks-v3:latest` (replace with the current version).

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
- [@myrmidon/cadmus-refs-citation](projects/myrmidon/cadmus-refs-citation/README.md)
- [@myrmidon/cadmus-refs-historical-date](projects/myrmidon/cadmus-refs-historical-date/README.md)

- [@myrmidon/cadmus-refs-proper-name](projects/myrmidon/cadmus-refs-proper-name/README.md)

- [@myrmidon/cadmus-refs-lookup](projects/myrmidon/cadmus-refs-lookup/README.md)
- [@myrmidon/cadmus-refs-dbpedia-lookup](projects/myrmidon/cadmus-refs-dbpedia-lookup/README.md)
- [@myrmidon/cadmus-refs-geonames-lookup](projects/myrmidon/cadmus-refs-geonames-lookup/README.md)
- [@myrmidon/cadmus-refs-mol-lookup](projects/myrmidon/cadmus-refs-mol-lookup/README.md)
- [@myrmidon/cadmus-refs-mufi-lookup](projects/myrmidon/cadmus-refs-mufi-lookup/README.md)
- [@myrmidon/cadmus-refs-viaf-lookup](projects/myrmidon/cadmus-refs-viaf-lookup/README.md)
- [@myrmidon/cadmus-refs-whg-lookup](projects/myrmidon/cadmus-refs-whg-lookup/README.md)
- [@myrmidon/cadmus-refs-zotero-lookup](projects/myrmidon/cadmus-refs-zotero-lookup/README.md)

## Text

- [@myrmidon/cadmus-text-block-view](projects/myrmidon/cadmus-text-block-view/README.md)
- [@myrmidon/cadmus-text-ed](projects/myrmidon/cadmus-text-ed/README.md)
- [@myrmidon/cadmus-text-ed-md](projects/myrmidon/cadmus-text-ed-md/README.md)
- [@myrmidon/cadmus-text-ed-txt](projects/myrmidon/cadmus-text-ed-txt/README.md)

## UI

- [@myrmidon/cadmus-ui-custom-action-bar](projects/myrmidon/cadmus-ui-custom-action-bar/README.md)
- [@myrmidon/cadmus-ui-flag-set](projects/myrmidon/cadmus-ui-flag-set/README.md)
- [@myrmidon/cadmus-ui-note-set](projects/myrmidon/cadmus-ui-note-set/README.md)
- [@myrmidon/cadmus-ui-object-view](projects/myrmidon/cadmus-ui-object-view/README.md)

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
ng g library @myrmidon/cadmus-refs-mol-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-mufi-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-proper-name --prefix cadmus
ng g library @myrmidon/cadmus-refs-viaf-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-whg-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-zotero-lookup --prefix cadmus
ng g library @myrmidon/cadmus-text-block-view --prefix cadmus
ng g library @myrmidon/cadmus-text-ed --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-md --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-txt --prefix cadmus
ng g library @myrmidon/cadmus-ui-custom-action-bar --prefix cadmus
ng g library @myrmidon/cadmus-ui-flag-set --prefix cadmus
ng g library @myrmidon/cadmus-ui-note-set --prefix cadmus
ng g library @myrmidon/cadmus-ui-object-view --prefix cadmus
```

## OnPush Progress

Starting from image versions above 9.0.7, bricks are getting a long-term refactoring to make components' state fully reactive (mostly via signals) and set their change detection strategy to `OnPush`. This will be required for future migration to zone-less.

These changes will not affect compatibility in any way, so it is safe to progressively enhance libraries. The following list contains the libraries which have been refactored:

- `@myrmidon/cadmus-cod-location` (9.0.2)
- `@myrmidon/cadmus-mat-physical-grid` (9.0.2)
- `@myrmidon/cadmus-mat-physical-size` (9.0.9)
- `@myrmidon/cadmus-mat-physical-state` (9.0.1)
- `@myrmidon/cadmus-refs-asserted-chronotope` (10.0.5)
- `@myrmidon/cadmus-refs-asserted-ids` (10.0.9)
- `@myrmidon/cadmus-refs-assertion` (10.0.4)
- `@myrmidon/cadmus-refs-chronotope` (9.0.1)
- `@myrmidon/cadmus-refs-citation` (1.0.2)
- `@myrmidon/cadmus-refs-decorated-counts` (9.0.1)
- `@myrmidon/cadmus-refs-decorated-ids` (9.0.3)
- `@myrmidon/cadmus-refs-doc-references` (10.0.2)
- `@myrmidon/cadmus-refs-external-ids` (10.0.2)
- `@myrmidon/cadmus-refs-historical-date` (9.1.0)
- `@myrmidon/cadmus-refs-lookup` (10.0.5)
- `@myrmidon/cadmus-refs-proper-name` (10.0.2)
- `@myrmidon/cadmus-text-block-view` (9.0.1)
- `@myrmidon/cadmus-text-ed` (9.0.1)
- `@myrmidon/cadmus-text-ed-md` (10.0.3)
- `@myrmidon/cadmus-text-ed-txt` (9.0.1)
- `@myrmidon/cadmus-ui-custom-action-bar` (9.0.1)
- `@myrmidon/cadmus-ui-flag-set` (9.0.2)
- `@myrmidon/cadmus-ui-note-set` (10.0.1)
- `@myrmidon/cadmus-ui-object-view` (0.0.2)

💡 Prompt for check:

```txt
Check that this Angular component has been properly refactored to use Signals and Observables for a fully reactive state. To do this, review this Angular component and refactor it to use Signals, ensuring the following:

* Use reactive forms, signals, or observables for all reactive state.
* Use computed signals for derived state.
* As many signals were refactored from simple variables, ensure that in the template and in the rest of the component's code all references to these variables are updated to use signal accessors (e.g., `mySignal()`). This is important because TypeScript will not flag these as errors, but they will lead to runtime issues as they miss the brackets which invoke the function.
* Legacy decorators `@Input`/`@Output` must not be present, but they should have been replaced with `input()`/`output()` functions.
* Detect `ngClass`/`ngStyle` usage.
* Detect any mutable state (e.g., direct object mutation). Change detection is based on reference checks, so mutable patterns will lead to bugs and we must be sure to catch and fix them all. Be careful to detect changes inside objects or arrays.
* In templates, there must be only the modern Angular `@if`/`@for` and the like, instead of `*ngIf`/`*ngFor`, etc.
```

## History

>👉 For the libraries history, see the README of each library in this workspace.

### 10.0.3

- 2026-01-29: updated Angular and packages.
- 2026-01-17: added `features` (from thesaurus `asserted-id-features`) and `note` to asserted IDs.
- 2025-12-04: updated Angular.

### 10.0.2

- 2025-12-01: updated Angular and packages.
- 2025-11-26: 🆕 added MOL lookup library.
- 2025-11-22:
  - ⚠️ upgraded to Angular 21.
  - ⚠️ migrated to `pnpm`.
- 2025-11-19:
  - updated Angular.
  - changed default GID in `PinTargetLookupComponent` to include pin name before its value.

### 10.0.1

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

### 10.0.0

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

### 9.0.7

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

### 9.0.6

- 2025-07-15:
  - ⚠️ rewritten VIAF service to use new API. Note that this requires your `app.config` file to provide the HTTP service no longer configured `withJsonpSupport()` but rather `withFetch()`!
  - replaced all doc references usages in bricks with lookup doc references (affecting `@myrmidon/cadmus-refs-assertion` and `@myrmidon/cadmus-refs-decorated-ids`).
  - ⚠️ renamed selectors with `cadmus-ref-...` to `cadmus-refs-...`.
- 2025-07-14: updated Angular and packages.
- 2025-07-08: fixed `unitDisabled` (renamed from `staticUnit`).
- 2025-07-07: added `staticUnit` property to physical dimension editor.
- 2025-04-07: refactored `PhysicalDimensionComponent` (not used) and added a test page.

### 9.0.5

- 2025-07-02: updated Angular.
- 2025-06-29: improved physical grid (`@myrmidon/cadmus-mat-physical-grid`).
- 2025-06-27: fixes to asserted composite IDs (`@myrmidon/cadmus-refs-asserted-ids`).

### 9.0.4

- 2025-06-21: fixes to asserted composite IDs (`@myrmidon/cadmus-refs-asserted-ids`).
- 2025-06-13: added pin name to asserted composite ID lookup info (`@myrmidon/cadmus-refs-asserted-ids`).
- 2025-06-12: fixed default unit not honored when parsing size (`@myrmidon/mat-physical-size`).

### 9.0.3

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
