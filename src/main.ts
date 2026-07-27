import { bootstrapApplication } from '@angular/platform-browser';
import { setWorkerUrl } from 'maplibre-gl';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// maplibre-gl v6 ships as ESM only: bundlers cannot resolve the worker script
// via import.meta.url, so it must be copied as a static asset (see angular.json)
// and pointed to explicitly before any map is created.
setWorkerUrl(
  new URL(
    'assets/maplibre-gl/maplibre-gl-worker.mjs',
    document.baseURI,
  ).toString(),
);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
