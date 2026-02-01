import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RamStorageService } from '@myrmidon/ngx-tools';
import {
  CitMappedValues,
  CitSchemeService,
  CitSchemeSet,
  MapFormatter,
} from '@myrmidon/cadmus-refs-citation';

import { DC_SCHEME, OD_SCHEME } from '../../../cit-schemes';
import { CitationPgComponent } from './citation-pg.component';

describe('CitationPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CitationPgComponent, {
      providers: [
        provideNoopAnimations(),
        {
          provide: CitSchemeService,
          useFactory: () => {
            const service = new CitSchemeService(new RamStorageService());
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
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
