# CadmusRefsAssertedIds

📦 `@myrmidon/cadmus-refs-asserted-ids`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

- [CadmusRefsAssertedIds](#cadmusrefsassertedids)
  - [External IDs](#external-ids)
  - [Internal IDs](#internal-ids)
  - [ID Components](#id-components)
    - [AssertedCompositeIdComponent](#assertedcompositeidcomponent)
    - [AssertedCompositeIdsComponent](#assertedcompositeidscomponent)
    - [PinTargetLookupComponent](#pintargetlookupcomponent)
  - [Configuring Asserted ID](#configuring-asserted-id)
    - [Configuring Lookup Providers](#configuring-lookup-providers)
    - [Configuring Taxonomy Store](#configuring-taxonomy-store)
    - [Defining Index Lookups](#defining-index-lookups)
    - [Configuring the Target ID Editor](#configuring-the-target-id-editor)
  - [Legacy Components](#legacy-components)
    - [AssertedIdComponent](#assertedidcomponent)
    - [AssertedIdsComponent](#assertedidscomponent)
  - [History](#history)
    - [10.0.14](#10014)
    - [10.0.13](#10013)
    - [10.0.10](#10010)
    - [10.0.9](#1009)
    - [10.0.8](#1008)
    - [10.0.5](#1005)
    - [10.0.4](#1004)
    - [10.0.3](#1003)
    - [10.0.2](#1002)
    - [10.0.0](#1000)
    - [9.0.0](#900)
    - [8.0.1](#801)

The asserted ID and asserted composite IDs bricks provide a way to include _external_ or _internal_ references to resource identifiers, whatever their type and origin. These components are the foundation for pin-based links in links part and links fragment types, as they provide both external and internal links, optionally accompanied by an assertion.

Additionally, since version 10.1.0 they can target also editable taxonomies from the [Cadmus Taxonomies Store](https://vedph.github.io/cadmus-doc/models/taxonomies.html).

## External IDs

External IDs are provided by users, either manually or with the aid of lookup services. Cadmus already provides a set of builtin lookup providers for popular web APIs like VIAF, DBPedia, Geonames, and WHG, and you can add as many as you want.

At a minimum, an external ID is just a string representing an identifier. Usually this is globally unique, or it is unique only within the scope defined by its context. For instance, a DBPedia ID is a URI, which makes it a globally unique identifier; while the numeric ID assigned to an entity in a RDBMS is unique only in the scope of its table in that database.

According to their type and purpose, such IDs can thus be totally opaque for human users, like a number; or provide a hint about their target, like e.g. the URI for Marco Polo in DBPedia: <http://dbpedia.org/resource/Marco_Polo>.

So, in its most complete model an external ID has:

- a value for the ID itself, whether it's globally unique or not.
- a human-friendly label conventionally attached to the ID.
- an optional scope.
- an optional tag, which can be used to group or classify IDs in some way.

An external ID can also come from a taxonomy. In this case:

- the GID is built as `@TX:TREEID/NODEKEY` where `@TX:` is a fixed prefix (meaning the GID refers to a taxonomy), `TREEID` is the tree's ID (an arbitrary ID), and `NODEKEY` the node's key. The node's key is a string unique only within its tree; that's why we build a global ID by prefixing its tree ID. Internally, in the taxonomies store each ID has a unique numeric ID, but this is just an implementation detail and nodes are always referred by their key.
- the label comes from the node's label.

## Internal IDs

Every Cadmus object (item, part or fragment) has its own own _globally unique identifier_, which is an opaque GUID like `401267e7-282c-40e6-8f47-67be54382b07`. These identify the objects; but the framework is completely agnostic with reference to their model: the item is just an empty box, while objects put in it (parts or fragments) can have any model. This is a requirement for those objects to be composable and reusable in the context of an open-ended, dynamic modeling.

The only way Cadmus has to link a part or an entry inside it is via "**pins**", i.e. name=value pairs which the part or fragment exposes in the index whenever it is saved. The part or fragment is the only component which knows what is inside its model; for the rest of the system, it is (and must be) a blackbox. Therefore, these pins are assigned by the object itself by reflecting on its own data, and act as target points for internal links.

Typically, according to the nature of each model, some pins can be designed to be used as anchor points and refer to the object as a whole, or to an entry in its model, when the model contains multiple entries. For instance, in a part with a list of manuscript [decorations](https://github.com/vedph/cadmus-codicology/blob/master/docs/cod-decorations.md), there are multiple entries, one per decoration; and one might want to target a specific decoration. To this end, each decoration has an `eid` property which represents a human-friendly, arbitrary string used to identify it, like `angel`. These identifiers are like the IDs you may type in a TEI document using the `@xml:id` attribute: they are short and human-friendly, and also allow to deeply link a subset of the object's data.

So, internal IDs are human-friendly identifiers connected to any data in the Cadmus database. They can refer to:

- a specific _internal entry_ inside a part or fragment containing multiple entries (typically via a property conventionally named `eid`);
- a specific _part or fragment_ (via any of its pins designed or chosen to represent the object as a whole);
- an _item_ as a whole (via its [metadata part](https://github.com/vedph/cadmus-general/blob/master/docs/metadata.md)'s `eid` metadatum): this is more tricky, because items are just containers of parts and fragments. So, they have no pins at all on their own, except for those connected to their fixed set of metadata (like title), which usually are not convenient as identifiers, unless you have a well-defined convention for assigning titles. So, conventionally the metadata part is used to provide a human-friendly ID for the item as a whole: whenever the item contains that part, and that part has a metadatum with name=`eid`, this is assumed to be the item's human-friendly ID. So, a user might enter a metadatum like e.g. `eid`=`vat_lat_123`, and use it as the human friendly identifier for a manuscript item corresponding to Vat.Lat.123.

Thus, ultimately all EIDs are based on a search pins. Each _pin name is unique only in the context of the part or fragment defining it_, so that pin design is not constrained; yet, a pin can easily be turned into a globally unique identifier by adding to it other data. For instance, given that every part or fragment has its own globally unique ID, you can just prepend it to the pin name to get a globally unique internal ID pointing to a specific feature of a specific part or fragment. Thus, we get the best of both worlds: when entering data, users are free to define pins as arbitrary, easy to use strings (e.g. "angel1", "angel2", "devil", etc.); but the general architecture also provides a way for making them globally unique, so they do not have to worry about that. All what they need to care about is that they are unique within the part or fragment they are editing.

---

## ID Components

The asserted ID library provides a number of components which can be used to easily refer to the entities identified with external or internal IDs.

According to the scenario illustrated above, the basic requirements for ID components are:

- provide a general lookup mechanism for external and/or internal IDs.
- for internal IDs, be able to draw data _from parts or from items_, assuming the convention by which an item can be assigned an EID via its generic _metadata_ part; and provide a quick way to build a globally unique identifier from an EID. Optionally, a component can also allow users pick _the preferred combination_ of components which once assembled build a unique, yet human-friendly identifier.

>👉 The demo found in this workspace uses a [mock data service](../../../src/app/services/mock-item.service.ts) instead of the real one, which provides a minimal set of data and functions, just required for the components to function.

Various components from this library provide a different level of complexity, so you can pick the one which best fits your purposes; in general, the most powerful and versatile ID picker is represented by the [asserted composite ID](#assertedcompositeidcomponent) and its multiple-targets counterpart [asserted composite IDs](#assertedcompositeidscomponent), which can be used for both external and internal IDs and editable taxonomies, with full lookup support. Other components in this library should be considered obsolete.

### AssertedCompositeIdComponent

- 🔑 `AssertedCompositeIdComponent`
- 🚩 `cadmus-refs-asserted-composite-id`
- ▶️ input:
  - `id` (`AssertedId`)
  - `pinByTypeMode` (`boolean?`)
  - `canSwitchMode` (`boolean?`)
  - `canEditTarget` (`boolean?`)
  - `defaultPartTypeKey` (`string?|null`)
  - `lookupDefinitions` (`IndexLookupDefinitions?`)
- 📚 thesauri:
  - `asserted-id-scopes` (for `idScopeEntries`)
  - `asserted-id-tags` (for `idTagEntries`)
  - `assertion-tags` (for `assTagEntries`)
  - `doc-reference-types` (for `refTypeEntries`)
  - `doc-reference-tags` (for `refTagEntries`)
- ⚡ output:
  - `idChange` (`AssertedId[]`)
  - `editorClose`
  - `extMoreRequest` (`RefLookupSetEvent`): the user requested more about the current external lookup source.

This is the most complete ID reference, which can be used for both external and internal IDs, providing full lookup in either cases. Each asserted composite ID has:

- a `target`, representing the pin-based target of the ID. The target model has these properties:
  - a global ID, `gid`, built from the pin or manually defined;
  - a human-friendly `label` for the target, built from the pin or manually defined;
  - for _internal_ links only:
    - `itemId` for the item the pin derives from;
    - when the pin derives from a part, an optional `partId`, `partTypeId`, `roleId`;
    - the `name` and `value` of the pin.
- an optional `scope`, representing the context the ID originates from (e.g. an ontology, a repository, a website, etc.).
- an optional `tag`, possibly used to group or classify the ID.
- an optional `assertion`, possibly used to define the uncertainty level of the assignment of this ID to the context it applies to.

To distinguish among link targets:

- when the ID is **external**, the only properties set for the target model are `gid` (=the ID) and `label`. So, they never have the `name` property, which instead is required for internal links.
- when the ID is a **taxonomy** node, it is just like an external link, but the `gid` always starts with prefix `@TX:`.
- when the ID is **internal**, it has the `name` property (which is the pin's name, a pin being required by definition for an internal link).
- You can easily distinguish between an external and internal ID by looking at a property like `name`, which is always present for internal IDs, and never present for external IDs.

### AssertedCompositeIdsComponent

A collection of asserted composite IDs.

- 🔑 `AssertedCompositeIdsComponent`
- 🚩 `cadmus-refs-asserted-composite-ids`
- ▶️ input:
  - `ids` (`AssertedId[]`)
  - `pinByTypeMode` (`boolean?`)
  - `canSwitchMode` (`boolean?`)
  - `canEditTarget` (`boolean?`)
  - `defaultPartTypeKey` (`string?|null`)
  - `lookupDefinitions` (`IndexLookupDefinitions?`)
- 📚 thesauri:
  - `asserted-id-scopes` (for `idScopeEntries`)
  - `asserted-id-tags` (for `idTagEntries`)
  - `assertion-tags` (for `assTagEntries`)
  - `doc-reference-types` (for `refTypeEntries`)
  - `doc-reference-tags` (for `refTagEntries`)
- ⚡ output:
  - `idsChange` (`AssertedCompositeId[]`)

### PinTargetLookupComponent

This component is not designed for direct use by higher-level consumer components. It is embedded by other components to edit their target.

- ▶️ input:
  - `target` (`PinTarget? | null`)
  - `pinByTypeMode` (`boolean?`)
  - `canSwitchMode` (`boolean?`)
  - `canEditTarget` (`boolean?`)
  - `defaultPartTypeKey` (`string?|null`)
  - `lookupDefinitions` (`IndexLookupDefinitions?`)
  - `extLookupConfigs` (`RefLookupConfig[]`): the configurations of external lookup providers, if any.
- 🔥 output:
  - `targetChange` (`PinTarget`)
  - `editorClose`

## Configuring Asserted ID

### Configuring Lookup Providers

Lookup providers must be configured once in the app's root component. Typically (see [app.ts](../../../src/app/app.ts) in this repository):

1. add a `configureLookup` function to your app's component code:

    ```ts
    private configureLookup(): void {
      const storage = inject(RamStorageService);
      storage.store(LOOKUP_CONFIGS_KEY, [
        // the colors provider is a mock provider using local data
        {
          name: 'colors',
          iconUrl: '/img/colors128.png',
          description: 'Colors',
          label: 'color',
          service: new WebColorLookup(),
          // compute the lookup item's ID
          itemIdGetter: (item: any) => item?.value,
          // compute the lookup item's human-friendly label
          itemLabelGetter: (item: any) => item?.name,
        },
        // the VIAF provider consumes the public VIAF API
        {
          name: 'VIAF',
          iconUrl: '/img/viaf128.png',
          description: 'Virtual International Authority File',
          label: 'ID',
          service: inject(ViafRefLookupService),
          itemIdGetter: (item: any) => item?.viafid,
          itemLabelGetter: (item: any) => item?.term,
        },
        // ... etc.
    }
    ```

2. call this function from your app's constructor.

>It is suggested to add an icon for each provider so you can easily identify it. You can grab icons for existing providers from this repository (see the `public` folder).

### Configuring Taxonomy Store

The taxonomy store can be configured as follows:

1. ensure to add TaxoStore packages: `pnpm i @myrmidon/taxo-store-api @myrmidon/taxo-store-picker`.
2. add a `configureTaxoLookup` function to your app's component code, adding an entry for each taxonomy tree you want to expose:

    ```ts
    private configureTaxoLookup(storage: RamStorageService): void {
      storage.store(LOOKUP_TAXOSTORE_CONFIGS_KEY, [
        {
          treeId: 'animals',
          treeName: 'animals',
          // user can edit nodes
          canEdit: false,
          // user can add new nodes
          canAdd: false,
          // user can delete nodes
          canDelete: false,
        },
        {
          treeId: 'food',
          treeName: 'food',
          canEdit: false,
          canAdd: false,
          canDelete: false,
        },
        // ... etc.
      ] as TaxoStoreLookupConfig[]);
    }
    ```

    >Note that here you can be very granular in your settings: for each taxonomy tree, you can define its UI label and whether its nodes can be edited, deleted and added by users.

3. call this function from your app's constructor.

### Defining Index Lookups

TODO

There are different **options** to customize the lookup behavior:

- lookup pins by part type or by item instance:
  - _by part type_: you directly lookup by pin name, in the context of a specific part type. The part type is selected from a dropdown list, which draws its data from the configured `IndexLookupDefinitions`.
  - _by item instance_: you lookup pins filtered by a specific item (via its assigned EID in its metadata part), and optionally by any of its parts. This is the default mode, as in most cases users have a top-bottom approach and think first of the item they want to target, and then, possibly, to a specific portion of its data (unless they are just happy to target the item as a whole).

>The part type ID and pin name filter (i.e. the _index lookup definitions_) can be set from many sources:

1. directly from the consumer code by setting `lookupDefinitions`;
2. from injection, when (1) is not used;
3. from thesaurus `model-types`, when (2) is empty.

- set `pinByTypeMode` to true to let the editor use by-type mode instead of by-item;
- set `canSwitchMode` to true to allow users switch between by-type and by-item modes;
- set `canEditTarget` to true to allow users edit the link target GID and label also for internal pins, where they are automatically provided by pin lookup.

These options can be variously combined to force users to use a specific behavior only; for instance, if you just want by-type lookup and automatic GID/label, set `pinByTypeMode` to true and `canSwitchMode` and `canEditTarget` to false.

Also, you can use any number of lookup components for external IDs. To globally configure all the asserted composite IDs components for this purpose, you can define (e.g. in your app's component constructor) an array of configuration objects keyed under `ASSERTED_COMPOSITE_ID_CONFIGS_KEY`. Thus, this component provides different ways for creating a link:

- external:
  - from 1 or more lookups
  - manual
  - both
- internal:
  - from pin lookup:
    - filter by item
    - filter by item's part
    - lookup pin
  - manual
  - both
- taxonomy: from 1 tree's node.

Three components are used for this brick:

- `AssertedCompositeIdsComponent`, the top level editor for the list of IDs. This has buttons to add new internal/external IDs, and a list of existing IDs. Each existing ID has buttons for editing, moving, and deleting it. When editing, the `AssertedIdComponent` is used in an expansion panel.
- `AssertedCompositeIdComponent`, the editor for each single ID. This allows you to edit shared metadata (tag and scope), and specific properties for both external and internal ID.
- `PinTargetLookupComponent`, the editor for an internal ID, i.e. a link target based on pins lookup. This is the core of the editor's logic.


TODO


(3) in your app's `index-lookup-definitions.ts` file, add the required lookup definitions. Each definition has a conventional key, and is an object with part type ID for the lookup scope, and pin name, e.g.:

```ts
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';
import {
  METADATA_PART_TYPEID,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

export const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  // item's metadata
  meta_eid: {
    typeId: METADATA_PART_TYPEID,
    name: 'eid',
  },
  // general parts
  event_eid: {
    typeId: HISTORICAL_EVENTS_PART_TYPEID,
    name: 'eid',
  },
  // ... etc.
};
```

>Note that while pin name and type will not be displayed to the end user, the key of each definition will. Unless you have a single definition, the lookup component will display a dropdown list with all the available keys, so that the user can select the lookup's scope. So, use short, yet meaningful keys here, like in the above sample (`meta_eid`, `event_eid`).


This component is used to edit an internal or external ID via lookup, and is the core of the [asserted composite ID](#asserted-composite-id) component:

- for **external** IDs, you can enter the ID and its human-friendly label manually, or get them from any number of lookup providers (e.g. VIAF, geonames, etc.).

- for **internal** IDs, your lookup is based on search pins.

- for **both** external and internal IDs, you can optionally specify a scope (usually defining the context of the ID, like VIAF or DBPedia, or your own Cadmus database) and a tag (an arbitrary string for grouping or tagging the ID in some way).

With thousands of parts/fragments providing dozens of pins, you quickly end up with a lot of them. So, to ease their lookup in this control, you can filter them. This component provides _two modes_ to get to a pin-based link target:

- **by item** (default mode): the user selects an item from a lookup list; then a part, from the list of the parts found in the selected item; and finally a pin, from a lookup list of pins filtered by that item's part. This essentially provides a way of selecting a pin from a restricted lookup set, by walking the data hierarchy from item to part/fragment and finally pin.
- **by type**: the user selects the part's type (this is automatically pre-selected when only a single type is set), and then selects a pin from a lookup list of pins filtered by that part's type. The list of part types may come from several sources:
  - explicitly set via the component `lookupDefinitions` property;
  - if this is not set, the lookup definitions will be got via injection when available;
  - if the injected definitions are empty, the lookup definitions will be built from the `model-types` thesaurus;
  - if this is not available either, the _by-type_ lookup will be disabled.

>Filtering by item essentially means filtering by an object instance: for instance a specific manuscript object. Filtering by type instead means filtering by pin class, as each part or fragment provides its own set of search pins, whose names are meaningful and unique only in their context.

In both cases, in the end the target ID model is the same; it's just the way the user selects the pin which changes. You can specify the mode for the component with `pinByTypeMode`, and control the possibility of switching between modes with `canSwitchMode`.

Once the user picks an internal pin, the target is automatically filled with data from the pin itself. Two values are calculated:

- `gid`, the global ID for the target is `P<part-id>/<pin-value>` when the pin is from a part; or `I<item-id>/<pin-value>` when it is from an item only.
- `label`, the human-friendly label for the target, is `<pin-value> | <item-title> (<part-type>[, <part-role>])`, where `<part-type>` is either the human-friendly name of the part type ID (as drawn from the `model-types` thesaurus), or the part type ID itself.

Optionally, users can customize both `gid` and `label` (when `canBuildGid` and `canBuildLabel` are true). As for `gid`, users have access to a full set of metadata about the target, so that they can build their own global ID. Once a pin value is picked, the lookup control shows all the relevant data which can be used as components for the ID to build:

- the item GUID.
- the item title.
- the part GUID.
- the part type ID.
- the item's metadata part entries.

The user can then use buttons to append each of these components to the ID being built, and/or variously edit it. When he's ok with the ID, he can then use it as the reference ID being edited.

>👉 The demo found in this workspace uses a [mock data service](../../../src/app/services/mock-item.service.ts) instead of the real one, which provides a minimal set of data and functions, just required for the components to function.

### Configuring the Target ID Editor

You can configure the target ID editor to use any number of lookup providers:

(1) ensure to import the `PinTargetLookupComponent` control in your component.

(2) add a lookup control to your UI, like this:

```html
<!-- lookup -->
<cadmus-pin-target-lookup [canSwitchMode]="true"
                          (targetChange)="onTargetChange($event)"/>
```

(3) specify the lookup definitions, either from binding, or via injection. In the latter case, in your app's `index-lookup-definitions.ts` file, add the required lookup definitions. Each definition has a conventional key, and is an object with part type ID for the lookup scope, and pin name, e.g.:

```ts
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';
import {
  METADATA_PART_TYPEID,
  HISTORICAL_EVENTS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

export const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  // item's metadata
  meta_eid: {
    typeId: METADATA_PART_TYPEID,
    name: 'eid',
  },
  // general parts
  event_eid: {
    typeId: HISTORICAL_EVENTS_PART_TYPEID,
    name: 'eid',
  },
  // ... etc.
};
```

>Note that while pin name and type will not be displayed to the end user, the key of each definition will. Unless you have a single definition, the lookup component will display a dropdown list with all the available keys, so that the user can select the lookup's scope. So, use short, yet meaningful keys here, like in the above sample (`meta_eid`, `event_eid`).

## Legacy Components

### AssertedIdComponent

>⚠️ Obsolete, use [AssertedCompositeIdComponent](#assertedcompositeidcomponent).

- 🔑 `AssertedIdComponent`
- 🚩 `cadmus-refs-asserted-id`
- ▶️ input:
  - `id` (`AssertedId? | null`)
  - `noEidLookup` (`boolean?`)
  - `hasSubmit` (`boolean?`)
- 📚 thesauri:
  - `asserted-id-scopes` (for `idScopeEntries`)
  - `asserted-id-tags` (for `idTagEntries`).
  - `assertion-tags` (for `assTagEntries`).
  - `doc-reference-types` (for `refTypeEntries`).
  - `doc-reference-tags` (for `refTagEntries`).
  - `asserted-id-features` (for `featureEntries`).
- 🔥 output:
  - `idChange` (`AssertedId`)
  - `editorClose`
  - `extMoreRequest` (`RefLookupSetEvent`): the user requested more about the current external lookup source.

The asserted ID component allows editing a simple model representing a generic ID with an optional assertion. The ID has:

- **value**: the ID itself.
- **scope**: the context the ID originates from (e.g. an ontology, a repository, a website, etc.).
- an optional **tag**, used to group or classify the ID.
- an optional set of **features**, from a hierarchical thesaurus. For instance, these could be the role(s) of a person linked to an object, like customer, seller, creator, etc.
- an optional **note**.
- an optional **assertion**, used to define the uncertainty level of the assignment of this ID to the context it applies to.

The asserted ID component provides an internal lookup mechanism based on data pins and metadata conventions. When users want to add an ID referring to some internal entity, either found in a part or corresponding to an item, he just has to pick the type of desired lookup (when more than a single lookup search definition is present), and type some characters to get the first N pins starting with these characters; he can then pick one from the list. Once a pin value is picked, the lookup control shows all the relevant data which can be used as components for the ID to build:

- the item GUID.
- the item title.
- the part GUID.
- the part type ID.
- the item's metadata part entries.

The user can then use buttons to append each of these components to the ID being built, and/or variously edit it. When he's ok with the ID, he can then use it as the reference ID being edited.

### AssertedIdsComponent

>⚠️ Obsolete, use [AssertedCompositeIdsComponent](#assertedcompositeidscomponent).

An editable list of asserted IDs.

- 🔑 `AssertedIdsComponent`
- 🚩 `cadmus-refs-asserted-ids`
- ▶️ input:
  - `ids` (`AssertedId[]`)
- 📚 thesauri:
  - `asserted-id-scopes` (for `idScopeEntries`)
  - `asserted-id-tags` (for `idTagEntries`)
  - `assertion-tags` (for `assTagEntries`)
  - `doc-reference-types` (for `refTypeEntries`)
  - `doc-reference-tags` (for `refTagEntries`)
  - `asserted-id-features` (for `featureEntries`).
- 🔥 output:
  - `idsChange` (`AssertedId[]`)

## History

- 2026-06-11: 🆕 added taxonomies mode to `AssertedCompositeId` and `AssertedCompositeIds`.

### 10.0.14

- 2026-02-01: minor fix to pin target lookup component template.

### 10.0.13

- 2026-01-17: added `features` (from thesaurus `asserted-id-features`) and `note` to asserted IDs.

### 10.0.10

- 2025-09-15: refactored `AssertedIdsComponent` and `AssertedCompositeIdsComponent` dropping form.

### 10.0.9

- 2025-09-11: refactored for `OnPush`.

### 10.0.8

- 2025-08-06: automatically update scope in asserted composite ID only when not updating form and lookup is external and scope is empty.

### 10.0.5

- 2025-06-27:
  - fixes to asserted composite IDs.
  - removed `internalDefault` from this component which did no longer make sense.

### 10.0.4

- 2025-06-21: fixes to asserted composite IDs.
- 2025-06-20:
  - updated Angular and packages.
  - minor refactoring in asserted composite ID reactivity (`@myrmidon/cadmus-refs-asserted-ids`).

### 10.0.3

- 2025-06-13: added pin name in pin info.

### 10.0.2

- 2025-06-03:
  - UI improvements.
  - checked imports and peer dependencies.
  - 👉 removed constant `ASSERTED_COMPOSITE_ID_CONFIGS_KEY` to avoid circular dependencies. Replace this with `LOOKUP_CONFIGS_KEY` from `@myrmidon/cadmus-refs-lookup`.

### 10.0.0

- 2025-05-29: ⚠️ upgraded to Angular 20.

### 9.0.0

- 2025-01-03: ⚠️ updated [Cadmus dependencies](https://github.com/vedph/cadmus-shell-v3) to version 11 (standalone components).

### 8.0.1

- 2025-01-01: fixed missing unsubscribe in `AssertedCompositeIdComponent`.
