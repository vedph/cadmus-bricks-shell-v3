# CadmusRefsAssertedIds

📦 `@myrmidon/cadmus-refs-asserted-ids`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

- [CadmusRefsAssertedIds](#cadmusrefsassertedids)
  - [External IDs](#external-ids)
  - [Internal IDs](#internal-ids)
  - [ID Components](#id-components)
  - [AssertedIdComponent](#assertedidcomponent)
    - [Configuring Asserted ID](#configuring-asserted-id)
  - [AssertedIdsComponent](#assertedidscomponent)
  - [PinTargetLookupComponent](#pintargetlookupcomponent)
    - [Configuring the Target ID Editor](#configuring-the-target-id-editor)
  - [Asserted Composite ID](#asserted-composite-id)
  - [Asserted Composite IDs](#asserted-composite-ids)
  - [History](#history)
    - [10.0.4](#1004)
    - [10.0.3](#1003)
    - [10.0.2](#1002)
    - [10.0.0](#1000)
    - [9.0.0](#900)
    - [8.0.1](#801)

The asserted ID and asserted composite IDs bricks provide a way to include _external_ or _internal_ references to resource identifiers, whatever their type and origin. These components are the foundation for pin-based links in links part and links fragment types, as they provide both external and internal links, optionally accompanied by an assertion.

## External IDs

External IDs are provided by users, either manually or with the aid of lookup services. Cadmus already provides a set of builtin lookup providers for popular web APIs like VIAF, DBPedia, Geonames, and WHG, and you can add as many as you want.

At a minimum, an external ID is just a string representing an identifier. Usually this is globally unique, or it is unique only within the scope defined by its context. For instance, a DBPedia ID is a URI, which makes it a globally unique identifier; while the numeric ID assigned to an entity in a RDBMS is unique only in the scope of its table in that database.

According to their type and purpose, such IDs can thus be totally opaque for human users, like a number; or provide a hint about their target, like e.g. the URI for Marco Polo in DBPedia: <http://dbpedia.org/resource/Marco_Polo>.

So, in its most complete model an external ID has:

- a value for the ID itself, whether it's globally unique or not.
- a human-friendly label conventionally attached to the ID.
- an optional scope.
- an optional tag, which can be used to group or classify IDs in some way.

## Internal IDs

Internal IDs are human-friendly identifiers connected to any data in the Cadmus database. They can refer to an item as a whole, or to a specific part or fragment of it, or to a specific feature inside a part or fragment.

In most cases, human users prefer friendly identifiers, unique only in the context of their editing environment (which is what is present to the user's mind when entering data). These identifiers in Cadmus are named **EID**s (=_entity IDs_), and may be found scattered among parts or fragments via pins, or linked to whole items via a metadata part.

>Of course, all Cadmus data objects (items, parts and fragments) have their own globally unique identifier, which is an opaque GUID like `401267e7-282c-40e6-8f47-67be54382b07`. EIDs instead provide human-friendly identifiers, e.g. just like the IDs you type in a TEI document. Additionally, they can be used to target a specific feature inside a part or fragment, via search pins provided by it.

**Item EID**s are just human-friendly aliases used to refer to a Cadmus item as a whole. Whenever we want to assign a human-friendly ID to the _item_ itself, rather than referring to it by its GUID, the conventional method relies on the generic _metadata part_, which allows users entering any number of arbitrarily defined name=value pairs. So, a user might enter a pair like e.g. `eid=vat_lat_123`, and use it as the human friendly identifier for a manuscript item corresponding to Vat.Lat.123.

Ultimately, even an item EID, just like any other EID is just based on a **search pin**. In Cadmus, any part or fragment in an item provides any number of _search pins_, which essentially are name=value pairs, used for a simple search during editing.

Each pin name is unique only in the context of the part or fragment defining it, so that pin design is not constrained; yet, a pin can easily be turned into a globally unique identifier by adding to it other data.

For instance, given that every part or fragment has its own globally unique ID, you can just prepend it to the pin name to get a globally unique internal ID pointing to a specific feature of a specific part or fragment. Thus, users just enter pins as arbitrary, easy to use strings, when entering data; but the general architecture also provides a way for making them globally unique.

>This is how the in-editor search is implemented, and a similar mechanism is also used when mapping entities from parts into a semantic graph (via mapping rules).

For instance, say a decorations part in a manuscript item collects a number of decorations; for each one, it might define an arbitrary EID (like e.g. `angel1`) used to identify it among the others, in the context of that part.

When filling the decorations part with data, users just ensure that this EID is unique in the context of the list they are editing; in other terms, no other decoration in that part will have `angel1` as its ID, while it might happen that `angel1` is used somewhere else in another part. Yet, should we be in need of a non-scoped, unique ID, we could easily build it by assembling together the EID with its part/item IDs, which by definition are globally unique (being GUIDs).

## ID Components

The asserted ID library provides a number of components which can be used to easily refer to the entities identified with external or internal IDs.

According to the scenario illustrated above, the basic requirements for ID components are:

- provide a general lookup mechanism for external and/or internal IDs.
- for internal IDs, be able to draw data _from parts or from items_, assuming the convention by which an item can be assigned an EID via its generic _metadata_ part; and provide a quick way to build a globally unique identifier from an EID. Optionally, a component can also allow users pick _the preferred combination_ of components which once assembled build a unique, yet human-friendly identifier.

>👉 The demo found in this workspace uses a [mock data service](../../../src/app/services/mock-item.service.ts) instead of the real one, which provides a minimal set of data and functions, just required for the components to function.

Various components from this library provide a different level of complexity, so you can pick the one which best fits your purposes; in general, the most powerful and versatile ID picker is represented by the [asserted composite ID](#asserted-composite-id), which can be used for both external and internal IDs, with full lookup support from lookup providers in either case.

## AssertedIdComponent

- 🔑 `AssertedIdComponent`
- 🚩 `cadmus-refs-asserted-id`
- ▶️ input:
  - id (`AssertedId? | null`)
  - external (`boolean?`)
  - hasSubmit (`boolean?`)
  - pinByTypeMode (`boolean?`)
  - canSwitchMode (`boolean?`)
  - canEditTarget (`boolean?`)
  - defaultPartTypeKey (`string?|null`)
  - lookupDefinitions (`IndexLookupDefinitions?`)
  - internalDefault (`boolean?`): true to start a new ID as internal rather than external
- 📚 thesauri:
  - `asserted-id-scopes` (idScopeEntries)
  - `asserted-id-tags` (idTagEntries).
  - `assertion-tags` (assTagEntries).
  - `doc-reference-types` (refTypeEntries).
  - `doc-reference-tags` (refTagEntries).
- 🔥 output:
  - idChange (`AssertedId`)
  - editorClose
  - extMoreRequest (`RefLookupSetEvent`): the user requested more about the current external lookup source.

The asserted ID component allows editing a simple model representing a generic ID with an optional assertion. The ID has:

- **value**: the ID itself.
- **scope**: the context the ID originates from (e.g. an ontology, a repository, a website, etc.).
- an optional **tag**, used to group or classify the ID.
- an optional **assertion**, used to define the uncertainty level of the assignment of this ID to the context it applies to.

The asserted ID component provides an internal lookup mechanism based on data pins and metadata conventions. When users want to add an ID referring to some internal entity, either found in a part or corresponding to an item, he just has to pick the type of desired lookup (when more than a single lookup search definition is present), and type some characters to get the first N pins starting with these characters; he can then pick one from the list. Once a pin value is picked, the lookup control shows all the relevant data which can be used as components for the ID to build:

- the item GUID.
- the item title.
- the part GUID.
- the part type ID.
- the item's metadata part entries.

The user can then use buttons to append each of these components to the ID being built, and/or variously edit it. When he's ok with the ID, he can then use it as the reference ID being edited.

### Configuring Asserted ID

The asserted ID component internally uses a scoped pin lookup component (`ScopedPinLookupComponent`) to provide a list of pin-based searches with a lookup control.  Whenever the user picks a pin value, he gets the details about its item and part, and item's metadata part, if any. He can then use these data to build a globally unique internal identifier by variously assembling these components.

You can use the scoped ID lookup control to add a pin-based lookup for any entity in your own UI:

(1) ensure to import the component (`ScopedPinLookupComponent`).

(2) add a lookup control to your UI, like this:

```html
<!-- lookup -->
<cadmus-scoped-pin-lookup *ngIf="!noLookup" (idPick)="onIdPick($event)"/>
```

In this sample, my UI has a `noLookup` property which can be used to hide the lookup if not required:

```ts
@Input()
public noLookup?: boolean;

public onIdPick(id: string): void {
  // TODO: set your control's value, e.g.:
  // this.myId.setValue(id);
  // this.myId.updateValueAndValidity();
  // this.myId.markAsDirty();
}
```

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

## AssertedIdsComponent

An editable list of asserted IDs.

- 🔑 `AssertedIdsComponent`
- 🚩 `cadmus-refs-asserted-ids`
- ▶️ input:
  - ids (`AssertedId[]`)
- 📚 thesauri:
  - `asserted-id-scopes` (idScopeEntries)
  - `asserted-id-tags` (idTagEntries)
  - `assertion-tags` (assTagEntries)
  - `doc-reference-types` (refTypeEntries)
  - `doc-reference-tags` (refTagEntries)
- 🔥 output:
  - idsChange (`AssertedId[]`)

## PinTargetLookupComponent

- ▶️ input:
  - target (`PinTarget? | null`)
  - pinByTypeMode (`boolean?`)
  - canSwitchMode (`boolean?`)
  - canEditTarget (`boolean?`)
  - defaultPartTypeKey (`string?|null`)
  - lookupDefinitions (`IndexLookupDefinitions?`)
  - extLookupConfigs (`RefLookupConfig[]`): the configurations of external lookup providers, if any.
  - internalDefault (`boolean?`): true to start a new ID as internal rather than external
- 🔥 output:
  - targetChange (`PinTarget`)
  - editorClose

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

## Asserted Composite ID

- 🔑 `AssertedCompositeIdComponent`
- 🚩 `cadmus-refs-asserted-composite-id`
- ▶️ input:
  - ids (`AssertedId[]`)
  - pinByTypeMode (`boolean?`)
  - canSwitchMode (`boolean?`)
  - canEditTarget (`boolean?`)
  - defaultPartTypeKey (`string?|null`)
  - lookupDefinitions (`IndexLookupDefinitions?`)
  - internalDefault (`boolean?`): true to start a new ID as internal rather than external
- 📚 thesauri:
  - `asserted-id-scopes` (idScopeEntries)
  - `asserted-id-tags` (idTagEntries)
  - `assertion-tags` (assTagEntries)
  - `doc-reference-types` (refTypeEntries)
  - `doc-reference-tags` (refTagEntries)
- ⚡ output:
  - `idsChange` (`AssertedId[]`)
  - `extMoreRequest` (`RefLookupSetEvent`): the user requested more about the current external lookup source.

This is the most complete ID reference, which can be used for both external and internal IDs, providing full lookup in either cases. Each asserted composite ID has:

- a `target`, representing the pin-based target of the ID. The target model has these properties:
  - a global ID, `gid`, built from the pin or manually defined;
  - a human-friendly `label` for the target, built from the pin or manually defined;
  - for internal links only:
    - `itemId` for the item the pin derives from;
    - when the pin derives from a part, an optional `partId`, `partTypeId`, `roleId`;
    - the `name` and `value` of the pin.
- an optional `scope`, representing the context the ID originates from (e.g. an ontology, a repository, a website, etc.).
- an optional `tag`, eventually used to group or classify the ID.
- an optional `assertion`, eventually used to define the uncertainty level of the assignment of this ID to the context it applies to.

When the ID is **external**, the only properties set for the target model are `gid` (=the ID) and `label`. You can easily distinguish between an external and internal ID by looking at a property like `name`, which is always present for internal IDs, and never present for external IDs.

There are different **options** to customize the lookup behavior:

- lookup pin without any filters, except for the always present part type ID and pin name (_by type_); or lookup pin with optional filters for the item and any of its parts (_by item_; this is the default).
- the part type ID and pin name filter (i.e. the _index lookup definitions_) can be set from many sources:
  1. directly from the consumer code by setting `lookupDefinitions`;
  2. from injection, when (1) is not used;
  3. from thesaurus `model-types`, when (2) is empty.
- set `pinByTypeMode` to true, to let the editor use by-type mode instead of by-item;
- set `canSwitchMode` to true, to allow users switch between by-type and by-item modes;
- set `canEditTarget` to true, to allow users edit the link target GID and label also for internal pins, where they are automatically provided by pin lookup.

These options can be variously combined to force users to use a specific behavior only; for instance, if you just want by-type lookup and automatic GID/label, set `pinByTypeMode` to true and `canSwitchMode` and `canEditTarget` to false.

Also, you can use any number of lookup components for external IDs. To globally configure all the asserted composite IDs components for this purpose, you can define (e.g. in your app's component constructor) an array of configuration objects keyed under `ASSERTED_COMPOSITE_ID_CONFIGS_KEY`. Thus, this component provides many different ways for creating a link:

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

Three components are used for this brick:

- `AssertedCompositeIdsComponent`, the top level editor for the list of IDs. This has buttons to add new internal/external IDs, and a list of existing IDs. Each existing ID has buttons for editing, moving, and deleting it. When editing, the `AssertedIdComponent` is used in an expansion panel.
- `AssertedCompositeIdComponent`, the editor for each single ID. This allows you to edit shared metadata (tag and scope), and specific properties for both external and internal ID.
- `PinTargetLookupComponent`, the editor for an internal ID, i.e. a link target based on pins lookup. This is the core of the editor's logic.

## Asserted Composite IDs

A collection of asserted composite IDs.

- 🔑 `AssertedCompositeIdsComponent`
- 🚩 `cadmus-refs-asserted-composite-ids`
- ▶️ input:
  - ids (`AssertedId[]`)
  - pinByTypeMode (`boolean?`)
  - canSwitchMode (`boolean?`)
  - canEditTarget (`boolean?`)
  - defaultPartTypeKey (`string?|null`)
  - lookupDefinitions (`IndexLookupDefinitions?`)
  - internalDefault (`boolean?`): true to start a new ID as internal rather than external
- 📚 thesauri:
  - `asserted-id-scopes` (idScopeEntries)
  - `asserted-id-tags` (idTagEntries)
  - `assertion-tags` (assTagEntries)
  - `doc-reference-types` (refTypeEntries)
  - `doc-reference-tags` (refTagEntries)
- ⚡ output:
  - idsChange (`AssertedCompositeId[]`)

## History

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
