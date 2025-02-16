import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withJsonpSupport,
} from '@angular/common/http';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import {
  PROXY_INTERCEPTOR_OPTIONS,
  ProxyInterceptor,
} from '../../projects/myrmidon/cadmus-refs-lookup/src/public-api';
import { GEONAMES_USERNAME_TOKEN } from '../../projects/myrmidon/cadmus-refs-geonames-lookup/src/public-api';
import { WHG_USERNAME_TOKEN } from '../../projects/myrmidon/cadmus-refs-whg-lookup/src/public-api';

import { MockItemService } from './services/mock-item.service';
import { MockThesaurusService } from './services/mock-thesaurus.service';
import { routes } from './app.routes';
import {
  CIT_FORMATTER_ROMAN_UPPER,
  CIT_SCHEME_SERVICE_TOKEN,
  CitMappedValues,
  CitScheme,
  CitSchemeService,
  CitSchemeSet,
} from '../../projects/myrmidon/cadmus-refs-citation/src/public-api';
import { MapFormatter } from '../../projects/myrmidon/cadmus-refs-citation/src/lib/services/map.formatter';

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

//#region Schemes
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
    hint: 'book (α-ω) verse (1-N[a-z])',
  },
  color: '#4287f5',
  steps: {
    book: {
      numeric: true,
      color: '#4287f5',
      format: 'agl',
      value: {
        range: {
          min: 1,
          max: 24,
        },
      },
    },
    verse: {
      numeric: true,
      color: '#1ECBE1',
      suffixPattern: '([a-z])$',
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};

const DC_SCHEME: CitScheme = {
  id: 'dc',
  name: 'Commedia',
  path: ['cantica', 'canto', 'verso'],
  optionalFrom: 'canto',
  textOptions: {
    pathPattern: '^\\s*(If\\.|Purg\\.|Par\\.)\\s*([IVX]+)\\s+(\\d+)\\s*$',
    template: '{cantica} {canto} {verso}',
    hint: 'cantica (If., Purg., Par.) canto (1-33) verso (1-N)',
  },
  color: '#BB4142',
  steps: {
    cantica: {
      color: '#BB4142',
      value: {
        set: ['If.', 'Purg.', 'Par.'],
      },
    },
    canto: {
      color: '#7EC8B1',
      numeric: true,
      format: CIT_FORMATTER_ROMAN_UPPER,
      conditions: [
        {
          ascendants: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
          ],
          value: {
            range: {
              min: 1,
              max: 34,
            },
          },
        },
      ],
      value: {
        range: {
          min: 1,
          max: 33,
        },
      },
    },
    verso: {
      color: '#EFE6CC',
      numeric: true,
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};
//#endregion

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withJsonpSupport()),
    provideNativeDateAdapter(),
    importProvidersFrom(NgeMonacoModule.forRoot({})),
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
    // GeoNames lookup (see environment.prod.ts for the username)
    {
      provide: GEONAMES_USERNAME_TOKEN,
      useValue: 'myrmex',
    },
    {
      provide: WHG_USERNAME_TOKEN,
      useValue: 'myrmex',
    },
    // citation schemes
    {
      provide: CIT_SCHEME_SERVICE_TOKEN,
      useFactory: () => {
        const service = new CitSchemeService();
        service.configure({
          formats: {},
          schemes: {
            dc: DC_SCHEME,
            od: OD_SCHEME,
          },
        } as CitSchemeSet);
        // agl formatter for Odyssey
        const aglFormatter = new MapFormatter();
        const aglMap: CitMappedValues = {};
        for (let n = 0x3b1; n <= 0x3c9; n++) {
          // skip final sigma
          if (n === 0x3c2) {
            continue;
          }
          aglMap[String.fromCharCode(n)] = n - 0x3b0;
        }
        aglFormatter.configure(aglMap);
        service.addFormatter('agl', aglFormatter);

        return service;
      },
    },
  ],
};
