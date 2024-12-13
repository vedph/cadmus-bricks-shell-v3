# CadmusRefsViafLookup

📦 `@myrmidon/cadmus-refs-viaf-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This is preliminary work. This should wrap VIAF for quick lookup. TODO: add VIAF options component, and use query to allow users pick a subject and/or an index.

⚠️ Note that VIAF requires JSONP, and thus also `HttpClientJsonpModule`. Also, be sure to import this module before the `HttpClientModule` (Angular bug). If using standalone, in `appConfig` be sure to add JSONP like this:

```ts
provideHttpClient(withJsonpSupport())
```
