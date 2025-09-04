# CadmusRefsZoteroLookup

This library provides an Angular service (`ZoteroService`) for interacting with the [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/basics). It allows you to search, retrieve, create, update, and delete items, collections, tags, and more from Zotero user and group libraries.

## Installation

Add this library to your Angular project and ensure `HttpClientModule` is imported in your app module.

## Configuration

Provide your Zotero API key, user ID, and (optionally) a default library ID in your app's providers:

```ts
import {
  ZOTERO_API_KEY_TOKEN,
  ZOTERO_USER_ID_TOKEN,
  ZOTERO_LIBRARY_ID_TOKEN
} from '@myrmidon/cadmus-refs-zotero-lookup';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    // Zotero
    {
      provide: ZOTERO_API_KEY_TOKEN,
      useFactory: (env: EnvService) => env.get('zoteroApiKey'),
      deps: [EnvService],
    },
    {
      provide: ZOTERO_USER_ID_TOKEN,
      useFactory: (env: EnvService) => env.get('zoteroUserId'),
      deps: [EnvService],
    },
    {
      provide: ZOTERO_LIBRARY_ID_TOKEN,
      useFactory: (env: EnvService) => env.get('zoteroLibraryId'),
      deps: [EnvService],
    },
  ]
};
```

- `ZOTERO_API_KEY_TOKEN`: Your Zotero API key (required).
- `ZOTERO_USER_ID_TOKEN`: Your Zotero user ID (required for user libraries).
- `ZOTERO_LIBRARY_ID_TOKEN`: The default library ID (optional, for convenience when working with a specific library).

>If you do not provide a library ID when calling service methods, the default will be used if set.

In turn, add these settings to your `env.js` like:

```js
// env.js

// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  window.__env = window.__env || {};
  // ...
  // Zotero
  window.__env.zoteroApiKey = "TODO:YOUR_ZOTERO_KEY";
  window.__env.zoteroUserId = "TODO:YOUR_ZOTERO_USER_ID";
  window.__env.zoteroLibraryId = "TODO:YOUR_ZOTERO_LIBRARY_ID";
})(this);
```

💡 To avoid storing these sensitive data in your `env.js`, you can create a new `env.local.js`, exclude it from GitHub files (this is essential!), and then conditionally load it from `index.html` only when it's present:

```html
<!-- index.html ... -->
    <script src="env.js"></script>
    <script>
      // check if a local environment file exists and load it
      function loadLocalEnv() {
        var script = document.createElement("script");
        script.onload = function () {
          console.log("Loaded local environment overrides.");
        };
        script.onerror = function () {
          console.warn(
            "Local environment file not found, using default values."
          );
        };
        script.src = "env.local.js";
        document.head.appendChild(script);
      }
      loadLocalEnv();
    </script>
<!-- ... -->
```

## Usage

Inject `ZoteroService` into your component or service:

```ts
constructor(private zotero: ZoteroService) {}
```

---

## API Overview

### 1. Search Items

Search for items in a library by query string.

```ts
this.zotero.search('userId', 'angular', ZoteroLibraryType.USER, {
  itemType: ZoteroItemType.JOURNAL_ARTICLE,
  limit: 10,
  sort: ZoteroSortField.DATE,
  direction: ZoteroDirection.DESC
}).subscribe(response => {
  console.log(response.data); // array of items
  console.log(response.totalResults); // total count
});
```

#### Search Everything

Search all fields (not just title/creator/year):

```ts
this.zotero.searchEverything('userId', 'climate', ZoteroLibraryType.USER)
  .subscribe(response => {
    console.log(response.data);
  });
```

---

### 2. Get Items

Get all items in a library (with optional filters):

```ts
this.zotero.getItems('userId', ZoteroLibraryType.USER, { limit: 20 }).subscribe({
  next: items => { /* ... */ },
  error: err => {
    // This will catch missing config, network, and API errors
    console.error('Zotero lookup failed:', err.message);
  }
});
```

Get a single item by key:

```ts
this.zotero.getItem('userId', 'ITEM_KEY', ZoteroLibraryType.USER)
  .subscribe(item => console.log(item));
```

---

### 3. Create, Update, and Delete Items

**Create an item:**

```ts
const newItem = {
  itemType: ZoteroItemType.BOOK,
  title: 'My New Book',
  creators: [{ creatorType: 'author', firstName: 'John', lastName: 'Doe' }]
};

this.zotero.createItem('userId', newItem, ZoteroLibraryType.USER)
  .subscribe(item => console.log('Created:', item));
```

**Update an item:**

```ts
this.zotero.updateItem('userId', 'ITEM_KEY', { title: 'Updated Title' }, 123, ZoteroLibraryType.USER)
  .subscribe(item => console.log('Updated:', item));
```

**Delete an item:**

```ts
this.zotero.deleteItem('userId', 'ITEM_KEY', 123, ZoteroLibraryType.USER)
  .subscribe(() => console.log('Deleted'));
```

---

### 4. Collections

**Get all collections:**

```ts
this.zotero.getCollections('userId', ZoteroLibraryType.USER)
  .subscribe(response => console.log(response.data));
```

**Get a single collection:**

```ts
this.zotero.getCollection(ZoteroLibraryType.USER, 'userId', 'COLLECTION_KEY')
  .subscribe(collection => console.log(collection));
```

---

### 5. Tags

Get all tags in a library:

```ts
this.zotero.getTags('userId', ZoteroLibraryType.USER)
  .subscribe(tags => console.log(tags));
```

---

### 6. Groups

Get all groups for the current user:

```ts
this.zotero.getGroups()
  .subscribe(groups => console.log(groups));
```

Get a single group by ID:

```ts
this.zotero.getGroup('GROUP_ID')
  .subscribe(group => console.log(group));
```

---

### 7. Item Templates and Metadata

**Get a template for a new item:**

```ts
this.zotero.getItemTemplate(ZoteroItemType.BOOK)
  .subscribe(template => console.log(template));
```

**Get all item types:**

```ts
this.zotero.getItemTypes()
  .subscribe(types => console.log(types));
```

**Get all fields for an item type:**

```ts
this.zotero.getItemFields(ZoteroItemType.BOOK)
  .subscribe(fields => console.log(fields));
```

**Get creator types for an item type:**

```ts
this.zotero.getCreatorTypes(ZoteroItemType.BOOK)
  .subscribe(types => console.log(types));
```

---

### 8. Key Permissions

Check the permissions of the current API key:

```ts
this.zotero.getKeyPermissions()
  .subscribe(info => console.log(info));
```

---

### 9. User Info

Get info about the current user:

```ts
this.zotero.getMyUserInfo()
  .subscribe(info => console.log(info));
```

---

## Error Handling

All methods return RxJS `Observable`s and handle errors with descriptive messages. Use `.subscribe()` with error handling as needed:

```ts
this.zotero.getItems('userId', ZoteroLibraryType.USER).subscribe({
  next: response => { /* ... */ },
  error: err => console.error('Zotero error:', err.message)
});
```

---

## Types and Enums

The service provides TypeScript interfaces and enums for all major Zotero entities and options, such as:

- `ZoteroLibraryType` (`USER`, `GROUP`)
- `ZoteroItemType` (e.g., `BOOK`, `JOURNAL_ARTICLE`)
- `ZoteroSortField`, `ZoteroDirection`, `ZoteroFormat`
- `ZoteroItem`, `ZoteroCollection`, `ZoteroTag`, etc.

---

## References

- [Zotero Web API v3 Documentation](https://www.zotero.org/support/dev/web_api/v3/basics)
- [Zotero API Item Types](https://www.zotero.org/support/dev/web_api/v3/basics#item_types)

---

## History

- 2025-09-04:
  - better error handling.
  - optional default library ID.
