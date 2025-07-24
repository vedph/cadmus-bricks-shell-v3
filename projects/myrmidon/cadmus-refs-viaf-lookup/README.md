# CadmusRefsViafLookup

📦 `@myrmidon/cadmus-refs-viaf-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

This is preliminary work. This should wrap VIAF for quick lookup.

⚠️ **Updated Configuration Required**: This service now uses the modern VIAF API endpoints with standard HTTP requests instead of JSONP. You need to configure your Angular application to use the Fetch API:

```ts
// in your app.config.ts
import { provideHttpClient, withFetch } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
  providers: [
    // other providers...
    provideHttpClient(withFetch()),
    // ...
  ],
};
```

## API Endpoints Used

- **AutoSuggest**: `https://viaf.org/viaf/AutoSuggest` - Returns JSON data for typeahead suggestions
- **Search**: `https://viaf.org/viaf/search` - Returns XML data for detailed queries (with JSON parsing)

## Breaking Changes from Previous Version

- ❌ **REMOVED**: JSONP support requirement (`withJsonpSupport()` no longer needed)
- ✅ **ADDED**: Fetch API requirement (`withFetch()` now required)
- ✅ **UPDATED**: Uses modern HTTP requests with proper Accept headers
- ✅ **IMPROVED**: Better error handling and response parsing

## Migration Guide

If you're upgrading from a previous version:

1. **Remove JSONP configuration**:

   ```ts
   // OLD - Remove this
   provideHttpClient(withJsonpSupport());
   ```

2. **Add Fetch API configuration**:

   ```ts
   // NEW - Add this
   provideHttpClient(withFetch());
   ```

3. **Update imports** (if using non-standalone approach):

   ```ts
   // OLD - Remove HttpClientJsonpModule
   imports: [HttpClientModule, HttpClientJsonpModule];

   // NEW - Only HttpClientModule needed
   imports: [HttpClientModule];
   ```

To override the API root URI, do like this in your app:

```ts
// app.config.ts
import { VIAF_API_BASE_TOKEN } from '@myrmidon/cadmus-refs-viaf-lookup';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...other providers...
    // optional: override the default VIAF API base URL
    {
      provide: VIAF_API_BASE_TOKEN,
      useValue: 'https://my-proxy.example.com/viaf'
    },
};
```

## History

- 2025-07-24: added `VIAF_API_BASE_TOKEN` to allow overriding the API root URI.
- 2025-07-15: ⚠️ totally rewritten VIAF service to use the new API endpoints.
  - **BREAKING**: Replaced JSONP with standard HTTP + Fetch API
  - **Updated**: Now uses `https://viaf.org/viaf/AutoSuggest` for suggestions
  - **Fixed**: Proper JSON response handling with Accept headers
  - **Note**: VIAF API documentation at <https://developer.api.oclc.org/viaf-api> appears outdated; implementation based on actual endpoint testing
