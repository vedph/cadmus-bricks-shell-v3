/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: 'tsconfig.spec.json',
      inlineStylesExtension: 'scss',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-test.ts'],
    include: ['src/**/*.spec.ts', 'projects/**/*.spec.ts'],
    exclude: ['node_modules/**'],
    deps: {
      inline: [/@angular/, /@myrmidon/],
    },
    isolate: false,
  },
  resolve: {
    alias: {
      // Add path aliases for your libraries
      '@myrmidon/cadmus-cod-location': resolve(
        __dirname,
        'projects/myrmidon/cadmus-cod-location/src/public-api.ts',
      ),
      '@myrmidon/cadmus-mat-physical-grid': resolve(
        __dirname,
        'projects/myrmidon/cadmus-mat-physical-grid/src/public-api.ts',
      ),
      '@myrmidon/cadmus-mat-physical-size': resolve(
        __dirname,
        'projects/myrmidon/cadmus-mat-physical-size/src/public-api.ts',
      ),
      '@myrmidon/cadmus-mat-physical-state': resolve(
        __dirname,
        'projects/myrmidon/cadmus-mat-physical-state/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-asserted-chronotope': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-asserted-chronotope/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-citation': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-citation/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-dbpedia-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-dbpedia-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-asserted-ids': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-asserted-ids/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-assertion': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-assertion/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-decorated-counts': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-decorated-counts/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-decorated-ids': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-decorated-ids/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-doc-references': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-doc-references/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-external-ids': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-external-ids/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-geonames-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-historical-date': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-historical-date/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-mol-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-mol-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-mufi-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-mufi-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-proper-name': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-proper-name/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-viaf-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-viaf-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-whg-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-whg-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-refs-zotero-lookup': resolve(
        __dirname,
        'projects/myrmidon/cadmus-refs-zotero-lookup/src/public-api.ts',
      ),
      '@myrmidon/cadmus-text-block-view': resolve(
        __dirname,
        'projects/myrmidon/cadmus-text-block-view/src/public-api.ts',
      ),
      '@myrmidon/cadmus-text-ed': resolve(
        __dirname,
        'projects/myrmidon/cadmus-text-ed/src/public-api.ts',
      ),
      '@myrmidon/cadmus-text-ed-md': resolve(
        __dirname,
        'projects/myrmidon/cadmus-text-ed-md/src/public-api.ts',
      ),
      '@myrmidon/cadmus-text-ed-txt': resolve(
        __dirname,
        'projects/myrmidon/cadmus-text-ed-txt/src/public-api.ts',
      ),
      '@myrmidon/cadmus-ui-custom-action-bar': resolve(
        __dirname,
        'projects/myrmidon/cadmus-ui-custom-action-bar/src/public-api.ts',
      ),
      '@myrmidon/cadmus-ui-flag-set': resolve(
        __dirname,
        'projects/myrmidon/cadmus-ui-flag-set/src/public-api.ts',
      ),
      '@myrmidon/cadmus-ui-note-set': resolve(
        __dirname,
        'projects/myrmidon/cadmus-ui-note-set/src/public-api.ts',
      ),
      '@myrmidon/cadmus-ui-object-view': resolve(
        __dirname,
        'projects/myrmidon/cadmus-ui-object-view/src/public-api.ts',
      ),
    },
  },
});
