import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
  withXhr,
} from '@angular/common/http';

// material
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';

// vendors
import {
  DefaultMonacoLoader,
  NGX_MONACO_LOADER_PROVIDER,
} from '@jean-merelis/ngx-monaco-editor';

// cadmus
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

// bricks
import { authJwtInterceptor } from '@myrmidon/auth-jwt-login';
import {
  PROXY_INTERCEPTOR_OPTIONS,
  ProxyInterceptor,
} from '@myrmidon/cadmus-refs-lookup';
import { GEONAMES_USERNAME_TOKEN } from '@myrmidon/cadmus-refs-geonames-lookup';
import { WHG_USERNAME_TOKEN } from '@myrmidon/cadmus-refs-whg-lookup';

// local
import { MockItemService } from './services/mock-item.service';
import { MockThesaurusService } from './services/mock-thesaurus.service';
import { routes } from './app.routes';
import {
  ZOTERO_API_KEY_TOKEN,
  ZOTERO_LIBRARY_ID_TOKEN,
  ZOTERO_USER_ID_TOKEN,
} from '@myrmidon/cadmus-refs-zotero-lookup';
import { EnvService } from '@myrmidon/ngx-tools';

// for lookup in asserted IDs - note that this would require a backend
const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
  alias_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withXhr(), withInterceptors([authJwtInterceptor]), withInterceptorsFromDi()),
    provideNativeDateAdapter(),
    {
      provide: NGX_MONACO_LOADER_PROVIDER,
      useFactory: () => new DefaultMonacoLoader(),
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop: true,
        maxHeight: '800px',
      },
    },
    // proxy interceptor
    { provide: HTTP_INTERCEPTORS, useClass: ProxyInterceptor, multi: true },
    {
      provide: PROXY_INTERCEPTOR_OPTIONS,
      useValue: {
        proxyUrl:
          (window as any).__env?.proxyUrl || 'http://localhost:5132/api/proxy',
        urls: [
          'http://lookup.dbpedia.org/api/search',
          'http://lookup.dbpedia.org/api/prefix',
          'https://iconclass.org',
        ],
      },
    },
    // mocks for lookup
    {
      provide: 'indexLookupDefinitions',
      useValue: INDEX_LOOKUP_DEFINITIONS,
    },
    {
      provide: ItemService,
      useClass: MockItemService,
    },
    {
      provide: ThesaurusService,
      useClass: MockThesaurusService,
    },
    // GeoNames lookup (see environment.prod.ts for the username)
    {
      provide: GEONAMES_USERNAME_TOKEN,
      useValue: 'myrmex',
    },
    {
      provide: WHG_USERNAME_TOKEN,
      useValue: 'myrmex',
    },
    // Zotero lookup (see env.js for the keys)
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
  ],
};
