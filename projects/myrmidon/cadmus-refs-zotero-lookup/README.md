# CadmusRefsZoteroLookup

This library provides an Angular service (`ZoteroService`) for interacting with the [Zotero Web API v3](https://www.zotero.org/support/dev/web_api/v3/basics). It allows you to search, retrieve, create, update, and delete items, collections, tags, and more from Zotero user and group libraries.

## Installation

Add this library to your Angular project and ensure `HttpClientModule` is imported in your app module.

## Configuration

Provide your Zotero API key and user ID in your app's providers:

```ts
import { ZOTERO_API_KEY_TOKEN, ZOTERO_USER_ID_TOKEN } from '@myrmidon/cadmus-refs-zotero-lookup';

@NgModule({
  providers: [
    { provide: ZOTERO_API_KEY_TOKEN, useValue: 'your-api-key' },
    { provide: ZOTERO_USER_ID_TOKEN, useValue: 'your-user-id' }
  ]
})
export class AppModule {}
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
this.zotero.search(ZoteroLibraryType.USER, 'userId', 'angular', {
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
this.zotero.searchEverything(ZoteroLibraryType.USER, 'userId', 'climate').subscribe(response => {
  console.log(response.data);
});
```

---

### 2. Get Items

Get all items in a library (with optional filters):

```ts
this.zotero.getItems(ZoteroLibraryType.USER, 'userId', { limit: 20 })
  .subscribe(response => console.log(response.data));
```

Get a single item by key:

```ts
this.zotero.getItem(ZoteroLibraryType.USER, 'userId', 'ITEM_KEY')
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

this.zotero.createItem(ZoteroLibraryType.USER, 'userId', newItem)
  .subscribe(item => console.log('Created:', item));
```

**Update an item:**

```ts
this.zotero.updateItem(ZoteroLibraryType.USER, 'userId', 'ITEM_KEY', { title: 'Updated Title' }, 123)
  .subscribe(item => console.log('Updated:', item));
```

**Delete an item:**

```ts
this.zotero.deleteItem(ZoteroLibraryType.USER, 'userId', 'ITEM_KEY', 123)
  .subscribe(() => console.log('Deleted'));
```

---

### 4. Collections

**Get all collections:**

```ts
this.zotero.getCollections(ZoteroLibraryType.USER, 'userId')
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
this.zotero.getTags(ZoteroLibraryType.USER, 'userId')
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
this.zotero.getItems(...).subscribe({
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
