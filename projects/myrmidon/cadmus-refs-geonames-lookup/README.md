# CadmusRefsGeonamesLookup

📦 `@myrmidon/cadmus-refs-geonames-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## Configuration

To use GeoNames you must provide your GeoNames **user name**, assumed that you have enabled API access for that account.

To configure your app:

(1) add your username to the `src/environments/environment.prod.ts` file, e.g.:

```ts
export const environment = {
  production: true,
  geoNamesUserName: 'yourUserNameHere'
};
```

(2) be sure to add `src/environments/environment.prod.ts` to `.gitignore` so you don't accidentally publish it.

(3) provide the username via token under your app's `providers` (`appConfig`):

```ts
// GeoNames lookup (see environment.prod.ts for the username)
{
  provide: GEONAMES_USERNAME_TOKEN,
  useValue: environment.geoNamesUserName,
}
```

⚠️ Be sure to use the Angular CLI’s `--configuration=production` flag when building for production, as this will ensure the correct environment file is used. If you want to debug with your username, just provide it in `src/environments/environment.ts`.
