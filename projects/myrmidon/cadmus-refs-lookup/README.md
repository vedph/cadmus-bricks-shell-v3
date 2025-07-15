# CadmusRefsLookup

📦 `@myrmidon/cadmus-refs-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

- [CadmusRefsLookup](#cadmusrefslookup)
  - [RefLookupComponent](#reflookupcomponent)
    - [Usage](#usage)
  - [RefLookupSetComponent](#reflookupsetcomponent)
    - [Configuring Set](#configuring-set)
  - [LookupDocReferencesComponent](#lookupdocreferencescomponent)
  - [History](#history)
    - [10.0.1](#1001)
    - [10.0.0](#1000)
    - [9.0.1](#901)

## RefLookupComponent

Generic reference lookup component. This can be used to provide quick lookup into some data repository by just typing some letters of a resource's label. For instance, you might want to pick a VIAF record from its name, a geographical place by its toponym, etc.

- 🔑 `RefLookupComponent`
- 🚩 `cadmus-refs-lookup`
- ▶️ input:
  - label (`string?`)
  - limit (`number`, default=10): max number of items to retrieve for lookup.
  - baseFilter (`unknown`): the base filter object to supply when filtering data in this lookup. If you have more filtering criteria set by your client code, set this property to an object representing the filter criteria. This object will be used as the base object when invoking the lookup service.
  - service\* (`RefLookupService`)
  - item (`unknown?`): current lookup item.
  - required (`boolean?`)
  - hasMore (`boolean?`)
  - linkTemplate (`string?`): the optional template to be used when building the URI pointing to the external resource and linked by the _Link_ button. The ID placeholder is represented by a property path included in `{}`, e.g. `{id}` or `{some.id}`. If undefined, no link button will be displayed.
  - optDialog (`unknown`): when using quick options, this is a component used to customize the lookup `options`.
  - options (`unknown`): options for lookup.
- 🔥 output:
  - moreRequest (`unknown?`): request for a more complex lookup. This receives the current item, if any.

The lookup component is a general purpose lookup where:

- users can type some letters and get a list of matching items to pick from, thus using a quick search;
- the picked item can be 2-way bound with a parent component;
- optionally, users can have a button which opens web resource corresponding to the picked item directly in the browser;
- optionally, users can customize some quick-search options and have them passed to the search service;
- optionally, users can click a `more` button to get to some specialized UI allowing them to pick items with more advanced search criteria.

### Usage

To use the lookup, you must set the `service` property to the lookup service, implementing the `LookupService` interface, and optionally the current lookup `item`. Optionally set the `label` and `limit`, and `hasMore` to true if you want a _more_ button for more complex lookup.

(1) create a **service** acting as an adapter for the quick search by implementing interface `RefLookupService`. This interface has:

- a `getName` function used to retrieve a user-friendly name from the item model;
- a `lookup` function getting a filter implementing `RefLookupFilter`, and returning an observable with a list of matching items. The filter is the minimum required for the lookup, i.e. has a text and a limit (=maximum count of items to return).

For an example, serverless implementation see [WebColorLookup](../../../src/app/refs/ref-lookup-pg/ref-lookup-pg.component.ts) in the demo app.

This service is then injected into the component hosting the lookup control, and passed to it via its `service` property.

(2) if your service requires **additional options**, just extend `RefLookupFilters` if they are provided by your program. In this case, typically your code will set the lookup's component `baseFilter` property so that it represents the additional filter criteria you want to preset. If instead the additional options can be changed by users, create a component representing these options, like `RefLookupDummyOptComponent` in the demo project.

This options component is a normal Angular component, but in its constructor you must inject:

- `@Inject(MAT_DIALOG_DATA) public data: any`: this gets the data with the options to be changed. Options are stored under the `options` property of `data`.
- `private _dialogRef: MatDialogRef<RefLookupOptionsComponent>`: this gets the reference to the dialog hosting your options component, so that you can use it to close the dialog, returning updated data if required.

Once you have created this options component, the component hosting the lookup control should provide two public properties:

- a property for the options component: e.g. `public optDialog: Type<any> = RefLookupDummyOptComponent;`.
- a property for the options data, e.g. `public options: any;`.

These must then be bound to the lookup control, e.g.:

```html
<cadmus-refs-lookup [service]="service" [item]="item" [required]="true" [hasMore]="true" [optDialog]="optDialog" [options]="options" linkTemplate="http://www.colors.org/web-{name}.html" label="color" (itemChange)="onItemChange($event)" (moreRequest)="onMoreRequest()" />
```

Once this is in place, when the user clicks the options button he gets to a dialog with your options component. The options are then passed to the adapter service together with the filter whenever a search is requested.

(3) apart from the required properties `service` (and `optDialog` and `options` for user-defined options), when using your control you can also set:

- `baseFilter`: an object to be augmented with `text` and `limit` by the lookup component when fetching data from its service. This can contain additional filtering criteria, preset by your consumer code.
- `hasMore`: true to show the More button to open an advanced search.
- `item`: the currently picked item. The corresponding event is `itemChange`.
- `label`: the label to show in the lookup control.
- `linkTemplate`: a template used to build a full URI which can be visited for the picked item. This template should include between braces the name of the property representing the item's ID for the picked item. This name can also be a path, e.g. it can be `id` or `some.path.to.id`. You can add as many placeholders as you want with the same mechanism.
- `required`: true to make the item selection required. In this case, the lookup control will be wrapped in a red rectangle when no item is selected.

Useful events:

- `itemChange` fired when the user picks an item from the list resulting from a quick search.
- `moreRequest` fired when the user requests the advanced search by clicking the _More_ button. The component hosting the lookup control should handle this event and typically open some dialog with a search, lending back the item to be picked.

## RefLookupSetComponent

A set of lookup items. Each has its own configuration and uses a specific service.

- 🔑 `RefLookupSetComponent`
- 🚩 `cadmus-refs-lookup-set`
- ▶️ input:
  - configs\* (`RefLookupConfig[]`)
  - iconSize (`IconSize`, default=24x24)
- 🔥 output:
  - configChange (`RefLookupConfig`): emitted when the currently selected lookup configuration changes.
  - itemChange (`RefLookupSetEvent`)
  - moreRequest (`RefLookupSetEvent`)

A lookup set is a combination of several lookup components, each connected to a different source.

Each lookup is **configured** via an instance of `RefLookupConfig`, having these properties:

- `name`: a human-friendly name for the lookup. Users will pick from a list displaying this name for each configuration.
- `iconUrl`: an optional icon URL to be displayed next to the name in the list. Icon size is specified by the `iconSize` property of the lookup set.
- `description`: a lookup description.
- `label`: the label to be displayed in the lookup control.
- `limit`: the maximum number of items to retrieve at each lookup. Default is 10.
- `baseFilter`: the base filter object to supply when filtering data in this lookup. If you have more filtering criteria set by your client code, set this property to an object representing the filter criteria. This object will be used as the base object when invoking the lookup service.
- `service`: the lookup service to use.
- `item`: the current lookup item, or undefined to start the lookup blank.
- `itemIdGetter`: the optional function to get a string ID from an item. If undefined, the `item` object will be used.
- `itemLabelGetter`: the optional function to get a string label from an item.If undefined, the item object will be used.
- `required`: true if a value is required.
- `hasMore`: true to add a "More" button for more complex lookup. When the user clicks it, the corresponding `moreRequest` event will be emitted.
- `linkTemplate`: the optional template to be used when building the URI pointing to the external resource and linked by the Link button. The ID placeholder is represented by a property path included in `{}`, e.g. `{id}` or `{some.id}`. If undefined, no link button will be displayed.
- optDialog: when using quick options, this is a component used to customize the options bound to options.
- `options`: the options for the lookup service.

The **set component** has these properties:

- `configs`: an array of configuration objects as illustrated above.
- `iconSize`: the size of the icons to use in the lookups list. Default is 24x24.

The events are:

- `itemChange`: emitted when an item is picked.
- `moreRequest`: emitted when a more request is issued.

Both these events provide the picked item, wrapped into a set of metadata:

- `configs`: the array of configurations used.
- `config`: the current config.
- `item`: the picked item.
- `itemId`: the ID of the picked item.
- `itemLabel`: the label of the picked item.

### Configuring Set

Typically you configure the lookup set at the application level:

(1) install all the lookup services you want to use, e.g.:

```bash
npm i @myrmidon/cadmus-refs-dbpedia-lookup @myrmidon/cadmus-refs-geonames-lookup @myrmidon/cadmus-refs-viaf-lookup
```

(2) for each of these services, provide an image in your app's assets. Typically you can use a 128x128 PNG image (see the examples in [this repository](https://github.com/vedph/cadmus_pura_app/tree/master/src/assets/img)).

(3) provide configuration for all the desired services which require it. In the case of this example, VIAF requires JSONP, geonames an API-enabled username, and DBPedia a proxy as it does not support neither CORS nor JSONP. So, in the `providers` array add:

```ts
// GeoNames lookup (see environment.prod.ts for the username)
{
  provide: GEONAMES_USERNAME_TOKEN,
  useValue: 'YOUR-GEONAMES-USERNAME',
},
// proxy
{
  provide: PROXY_INTERCEPTOR_OPTIONS,
  useValue: {
    proxyUrl: (window as any).__env?.apiUrl + 'proxy',
    urls: [
      'http://lookup.dbpedia.org/api/search',
      'http://lookup.dbpedia.org/api/prefix',
    ],
  },
},
```

To support JSONP you must either use `provideHttpClient(withJsonpSupport())` in `app.config.ts` (for module-less apps), or import `HttpClientJsonpModule` (because of a long-standing bug in Angular, remember to place this import BEFORE the `HttpClientModule` import!).

(4) configure the services in your consumer component or in the app's root component:

```ts
// sample app.component.ts

import { ASSERTED_COMPOSITE_ID_CONFIGS_KEY } from "@myrmidon/cadmus-refs-asserted-ids";
import { ViafRefLookupService } from "@myrmidon/cadmus-refs-viaf-lookup";
import { DbpediaRefLookupService } from "@myrmidon/cadmus-refs-dbpedia-lookup";
import { GeoNamesRefLookupService } from "@myrmidon/cadmus-refs-geonames-lookup";
import { RefLookupConfig } from "@myrmidon/cadmus-refs-lookup";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterModule, MatButtonModule, MatDividerModule, MatMenuModule, MatDividerModule, MatToolbarModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  public readonly version: string;

  constructor(env: EnvService, storage: RamStorageService) {
    this.version = env.get("version") || "";
    // ...
    // configure external lookup for asserted composite IDs
    this.configureLookup(storage);
  }

  private configureLookup(storage: RamStorageService): void {
    storage.store(ASSERTED_COMPOSITE_ID_CONFIGS_KEY, [
      {
        name: "colors",
        iconUrl: "/img/colors128.png",
        description: "Colors",
        label: "color",
        service: new WebColorLookup(),
        itemIdGetter: (item: any) => item?.value,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: "VIAF",
        iconUrl: "/img/viaf128.png",
        description: "Virtual International Authority File",
        label: "ID",
        service: inject(ViafRefLookupService),
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: "geonames",
        iconUrl: "/img/geonames128.png",
        description: "GeoNames",
        label: "ID",
        service: inject(GeoNamesRefLookupService),
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: "whg",
        iconUrl: "/img/whg128.png",
        description: "World Historical Gazetteer",
        label: "ID",
        service: inject(WhgRefLookupService),
        itemIdGetter: (item: GeoJsonFeature) => item?.properties.place_id,
        itemLabelGetter: (item: GeoJsonFeature) => item?.properties.title,
      },
    ] as RefLookupConfig[]);
  }
}
```

## LookupDocReferencesComponent

A set of documental references (with the same model as those in `@myrmidon/cadmus-refs-doc-references`) with lookup capabilities. Each documental reference has a `citation` mandatory property representing the reference; lookup can provide this value using a set of lookup components and/or a citation.

- 🔑 `LookupDocReferencesComponent`
- 🚩 `cadmus-refs-lookup-doc-references`
- ▶️ input:
  - references (`DocReference[]`)
  - typeEntries (`ThesaurusEntry[]` or undefined, from 📚 `doc-reference-types`)
  - tagEntries (`ThesaurusEntry[]` or undefined, from 📚 `doc-reference-tags`)
  - noLookup (`boolean`) to disable the lookup set
  - noCitation (`boolean`) to disable the citation set
  - defaultPicker (`string`): either `citation` or `lookup` to set the default picker
- 🔥 output:
  - referencesChange (`DocReference[]`)

Usage:

1. citation schemes and lookup providers are configured via injection, using `CitSchemeService` and `RamStorageService`. So, in your root component configure them like in this snippet:

```ts
// lookup
import { LOOKUP_CONFIGS_KEY, RefLookupConfig } from "@myrmidon/cadmus-refs-lookup";
// import the desired providers, e.g.:
import { ViafRefLookupService } from "@myrmidon/cadmus-refs-viaf-lookup";
import { GeoNamesRefLookupService } from "@myrmidon/cadmus-refs-geonames-lookup";
import { GeoJsonFeature, WhgRefLookupService } from "@myrmidon/cadmus-refs-whg-lookup";

// citation
import {
  CIT_SCHEME_SERVICE_SETTINGS_KEY,
  CitMappedValues,
  CitSchemeSettings,
  MapFormatter,
} from '@myrmidon/cadmus-refs-citation';

// ...
export class App {
  constructor() {
    // configure external lookup for asserted composite IDs
    this.configureLookup(storage);

    // configure citation service
    this.configureCitationService(storage);
  }

  private configureLookup(storage: RamStorageService): void {
    storage.store(LOOKUP_CONFIGS_KEY, [
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
        service: inject(ViafRefLookupService),
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.term,
      },
      {
        name: 'geonames',
        iconUrl: '/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: inject(GeoNamesRefLookupService),
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.name,
      },
      {
        name: 'whg',
        iconUrl: '/img/whg128.png',
        description: 'World Historical Gazetteer',
        label: 'ID',
        service: inject(WhgRefLookupService),
        itemIdGetter: (item: GeoJsonFeature) => item?.properties.place_id,
        itemLabelGetter: (item: GeoJsonFeature) => item?.properties.title,
      },
    ] as RefLookupConfig[]);
  }

  private configureCitationService(storage: RamStorageService): void {
    // agl formatter for Odyssey
    const aglFormatter = new MapFormatter();
    const aglMap: CitMappedValues = {};
    for (let n = 0x3b1; n <= 0x3c9; n++) {
      // skip final sigma
      if (n === 0x3c2) {
        continue;
      }
      aglMap[String.fromCharCode(n)] = n - 0x3b0;
    }
    aglFormatter.configure(aglMap);

    storage.store(CIT_SCHEME_SERVICE_SETTINGS_KEY, {
      formats: {},
      schemes: {
        dc: DC_SCHEME,
        od: OD_SCHEME,
      },
      formatters: {
        agl: aglFormatter,
      },
    } as CitSchemeSettings);
  }
}
```

2. in your consumer component, import the component:

```ts
import { LookupDocReferencesComponent } from '@myrmidon/cadmus-refs-lookup';

// in imports, add:
// LookupDocReferencesComponent
```

3. in your consumer component template, use the component like this:

```html
    <cadmus-refs-lookup-doc-references
      [typeEntries]="typeEntries"
      [references]="references"
      (referencesChange)="onReferencesChange($event)"
    />
```

## History

### 10.0.1

- 2025-07-15: make lookup doc references deal with missing lookup or citation configurations.

### 10.0.0

- 2025-07-15: ⚠️ renamed selectors with `cadmus-ref-` to `cadmus-refs-` to get uniform naming conventions.

### 9.0.1

- 2025-06-04: ⚠️ added constant `LOOKUP_CONFIGS_KEY` to replace `ASSERTED_COMPOSITE_ID_CONFIGS_KEY` from `cadmus-refs-asserted-ids` which would cause a cyclic reference as `cadmus-refs-asserted-ids` depends on this `cadmus-refs-lookup` library, which in turn would depend on `cadmus-refs-asserted-ids` for that constant. Consequently, the const has been renamed with a more generic name.
- 2025-03-25: added `LookupDocReferencesComponent`. This implied adding these additional dependencies to this library:
  - `@myrmidon/cadmus-refs-doc-references` (for the references data model);
  - `@myrmidon/cadmus-refs-citation` (for citations).
- 2025-01-27: fix `baseFilter` accessor (and similar signalized properties) in [ref-lookup-component](./src/lib/ref-lookup/ref-lookup.component.ts).
