# CadmusTextEdMd

📦 `@myrmidon/cadmus-text-ed-md`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains Markdown-related plugins for the Cadmus [text editing service](../cadmus-text-ed/README.md).

These plugins can be used to provide shortcuts to frequent edit tasks like toggling bold or italic, or providing more complex logic in assisting edits.

## Plugins

### Toggle Bold

- 🔑 `md.bold` (`MdBoldCtePlugin`)

This plugin toggles bold text on or off using two asterisks for it. It expects a text, and if it finds a bold span inside it it removes the wrapper asterisks; else, it wraps the text in them.

### Toggle Italic

- 🔑 `md.italic` (`MdItalicCtePlugin`)

This plugin toggles italic text on or off using one asterisk for it. It expects a text, and if it finds a bold span inside it it removes the wrapper asterisks; else, it wraps the text in them.

### Insert Link

- 🔑 `md.link` (`MdLinkCtePlugin`)

This plugin assists in inserting or editing Markdown links via lookup. These links have a JSON string as their target, where `)` is rendered as `\)` to avoid issues with Markdown parsers.

The JSON target is built from an asserted composite ID UI, so it can represent an internal or an external link. For external links, you can configure the lookup providers via a storage service (`RamStorageService`) with key `ASSERTED_COMPOSITE_ID_CONFIGS_KEY` , e.g.:

```ts
// assuming we got RamStorageService via injection

storage.store(ASSERTED_COMPOSITE_ID_CONFIGS_KEY, [
  {
    name: 'colors',
    iconUrl: '/img/colors128.png',
    description: 'Colors',
    label: 'color',
    service: new WebColorLookup(),
    itemIdGetter: (item: any) => item?.value,
    itemLabelGetter: (item: any) => item?.name,
  },
  {
    name: 'VIAF',
    iconUrl: '/img/viaf128.png',
    description: 'Virtual International Authority File',
    label: 'ID',
    service: viaf,
    itemIdGetter: (item: any) => item?.viafid,
    itemLabelGetter: (item: any) => item?.term,
  },
  {
    name: 'geonames',
    iconUrl: '/img/geonames128.png',
    description: 'GeoNames',
    label: 'ID',
    service: geonames,
    itemIdGetter: (item: any) => item?.geonameId,
    itemLabelGetter: (item: any) => item?.name,
  },
] as RefLookupConfig[]);
```

## Example

For an example usage with a Monaco editor instance see the [text editor service demo page](../../../src/app/text/text-ed-pg/text-ed-pg.component.ts).
