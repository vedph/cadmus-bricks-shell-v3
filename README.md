# Cadmus Bricks Shell V3

- [Cadmus Bricks Shell V3](#cadmus-bricks-shell-v3)
  - [Docker](#docker)
  - [Monaco Editor Configuration for Angular 21](#monaco-editor-configuration-for-angular-21)
    - [The Issue](#the-issue)
    - [Required Configuration Steps](#required-configuration-steps)
      - [1. Install Compatible Monaco Editor Version](#1-install-compatible-monaco-editor-version)
      - [2. Add Monaco Types to TypeScript Configuration](#2-add-monaco-types-to-typescript-configuration)
      - [3. Configure NGE Monaco Module](#3-configure-nge-monaco-module)
      - [4. Using Monaco in Components](#4-using-monaco-in-components)
  - [Codicology](#codicology)
  - [Geography](#geography)
  - [Imaging](#imaging)
  - [Physical](#physical)
  - [References](#references)
  - [Text](#text)
  - [UI](#ui)
  - [V3 Creation](#v3-creation)

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

🐋 Quick **Docker image** build (the only purpose of this image is letting testers play with controls in the incubator):

1. `pnpm run build-lib`.
2. ensure to update the version in `env.js` (and `docker-compose.yml`), and `ng build --configuration production`.
3. `docker build . -t vedph2020/cadmus-bricks-v3:10.0.4 -t vedph2020/cadmus-bricks-v3:latest` (replace with the current version).

Use [publish.bat](publish.bat) to publish the libraries to NPM.

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

Why these steps are necessary:

- **Version compatibility**: `@cisstech/nge@18.3.0` was built and tested with `monaco-editor@^0.43.0`. Newer versions (0.50+) introduce breaking changes in how fonts are loaded.
- **Type definitions**: The `monaco` namespace is provided by monaco-editor's type definitions. Adding it to the TypeScript configuration makes these types globally available without explicit imports.
- **Angular 21 esbuild**: The new Angular builder has different handling of CSS imports and font files compared to webpack, making newer Monaco versions incompatible without additional configuration.

If you still encounter issues:

1. **Clear build cache**: Delete `node_modules`, `package-lock.json` (or `pnpm-lock.yaml`), and `.angular` folder, then reinstall.
2. **Verify versions**: Run `npm list monaco-editor` or `pnpm list monaco-editor` to ensure the correct version is installed.
3. **Check for conflicting configs**: Ensure no other TypeScript config files are overriding the types configuration.

Additional Resources:

- [Monaco Editor - Loading TTF in Angular 17+ - Stack Overflow](https://stackoverflow.com/questions/78293918/loading-ttf-of-monaco-editor-in-angular-17)
- [Angular CLI TTF loader issue - GitHub](https://github.com/angular/angular-cli/issues/25235)
- [@cisstech/nge Documentation](https://github.com/cisstech/nge)

## Codicology

- [@myrmidon/cadmus-cod-location](projects/myrmidon/cadmus-cod-location/README.md)

## Geography

- [@myrmidon/cadmus-geo-location](projects/myrmidon/cadmus-geo-location/README.md)

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
- [@myrmidon/cadmus-refs-biblissima-lookup](projects/myrmidon/cadmus-refs-biblissima-lookup/README.md)
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
ng g library @myrmidon/cadmus-geo-location --prefix cadmus
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

⌛ [History](CHANGELOG.md)
