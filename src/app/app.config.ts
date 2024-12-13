import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withJsonpSupport,
} from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { EnvServiceProvider } from '@myrmidon/ngx-tools';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import {
  PROXY_INTERCEPTOR_OPTIONS,
  ProxyInterceptor,
} from '../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import {
  IMAGE_GALLERY_OPTIONS_KEY,
  IMAGE_GALLERY_SERVICE_KEY,
} from '../../projects/myrmidon/cadmus-img-gallery/src/public-api';
import {
  SimpleIiifGalleryOptions,
  SimpleIiifGalleryService,
} from '../../projects/myrmidon/cadmus-img-gallery-iiif/src/public-api';
import { GEONAMES_USERNAME_TOKEN } from '../../projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api';
import { WHG_USERNAME_TOKEN } from '../../projects/myrmidon/cadmus-refs-whg-lookup/src/public-api';

import { MockItemService } from './services/mock-item.service';
import { MockThesaurusService } from './services/mock-thesaurus.service';
import { routes } from './app.routes';

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
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withJsonpSupport()),
    provideNativeDateAdapter(),
    importProvidersFrom(NgeMonacoModule.forRoot({})),
    EnvServiceProvider,
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
        proxyUrl: 'http://localhost:5161/api/proxy',
        urls: [
          'http://lookup.dbpedia.org/api/search',
          'http://lookup.dbpedia.org/api/prefix',
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
    // if you want to use the mock gallery, uncomment these two providers
    // and comment the IIIF ones below.
    // mock image gallery
    // {
    //   provide: IMAGE_GALLERY_SERVICE_KEY,
    //   useClass: MockGalleryService,
    // },
    // {
    //   provide: IMAGE_GALLERY_OPTIONS_KEY,
    //   useValue: {
    //     baseUri: '',
    //     count: 50,
    //     width: 300,
    //     height: 400,
    //   },
    // },
    // IIIF image gallery
    {
      provide: IMAGE_GALLERY_SERVICE_KEY,
      useClass: SimpleIiifGalleryService,
    },
    {
      provide: IMAGE_GALLERY_OPTIONS_KEY,
      useValue: {
        baseUri: '',
        manifestUri:
          'https://dms-data.stanford.edu/data/manifests/Parker/xj710dc7305/manifest.json',
        arrayPath: 'sequences[0]/canvases',
        resourcePath: 'images[0]/resource',
        labelPath: 'label',
        width: 300,
        height: 400,
        targetWidth: 800,
        targetHeight: -1,
        pageSize: 6,
        // skip: 6
      } as SimpleIiifGalleryOptions,
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
  ],
};
