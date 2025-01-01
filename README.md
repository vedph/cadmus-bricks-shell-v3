# Cadmus Bricks Shell V3

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.4.

This is [Cadmus](https://myrmex.github.io/overview/cadmus/) bricks version 3, derived from [Cadmus bricks version 2](https://github.com/vedph/cadmus-bricks-shell-v2). In Cadmus, bricks are small UI widgets providing frequently used logic and UX, and used as the building blocks for part or fragment editors.

V2 retains its own repository for compatibility purposes, while new development will occur on V3 only. The API of the components has not changed, except for these ⚠️ breaking changes:

- all the image annotation components have been moved to a separate [new repository](https://github.com/vedph/ngx-annotorious), refactored for Annotorious V3. Bricks V2 still depend on Annotorious V2, which is now deprecated. In this repository, a new separate library provides the core wrapper for using Annotorious V3 in Angular. Cadmus bricks V3 libraries depend on it, and are found in the same repository.
- a new [flags set brick](projects/myrmidon/cadmus-ui-flag-set/README.md) replaces the legacy (V2) [Cadmus UI flags picker](https://github.com/vedph/cadmus-bricks-shell-v2/blob/master/projects/myrmidon/cadmus-ui-flags-picker/README.md), which was much harder to use, and also provides new features in addition to all those provided by the legacy V2 component. So, if your components relied on that legacy component, you should upgrade them to use the new one, which is a very simple procedure.

All the V3 bricks start from **major version number 8**, and align with modern Angular, so they are standalone components, and use signal-based input and output properties.

To use a brick:

1. install the package with NPM. If additional third-party dependencies or configuration is required, this is documented in the package README (see the list below).
2. import the component(s) you want to use.
3. use the brick via its selector in your component template, binding it to your code as required by its API.

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
ng g library @myrmidon/cadmus-refs-dbpedia-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-decorated-counts --prefix cadmus
ng g library @myrmidon/cadmus-refs-decorated-ids --prefix cadmus
ng g library @myrmidon/cadmus-refs-doc-references --prefix cadmus
ng g library @myrmidon/cadmus-refs-external-ids --prefix cadmus
ng g library @myrmidon/cadmus-refs-historical-date --prefix cadmus
ng g library @myrmidon/cadmus-refs-lookup --prefix cadmus
ng g library @myrmidon/cadmus-refs-proper-name --prefix cadmus
ng g library @myrmidon/cadmus-refs-viaf-lookup --prefix cadmus
ng g library @myrmidon/cadmus-text-block-view --prefix cadmus
ng g library @myrmidon/cadmus-text-ed --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-md --prefix cadmus
ng g library @myrmidon/cadmus-text-ed-txt --prefix cadmus
ng g library @myrmidon/cadmus-ui-custom-action-bar --prefix cadmus
ng g library @myrmidon/cadmus-ui-flag-set --prefix cadmus
ng g library @myrmidon/cadmus-ui-note-set --prefix cadmus
```

I then replaced Karma with Jest.

## Testing

In Jest, you can run tests from a single library or the main app by specifying the test file or directory in the Jest command. Here's how you can do it:

- **To run tests from a single library**, use the following command:

```bash
npx jest projects/myrmidon/library-name
```

Replace `library-name` with the name of your library.

- **To run tests from the main app**, use the following command:

```bash
npx jest src
```

This will run all tests in the `src` directory, which typically contains your main app's code.

Remember to run these commands in your terminal from your project's root directory.

## History

For the history see the README of each library in this workspace.
