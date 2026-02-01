import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { PinTargetLookupComponent } from './pin-target-lookup.component';
import { ItemRefLookupService } from '../services/item-ref-lookup.service';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

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

describe('PinTargetLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: 'indexLookupDefinitions',
          useValue: INDEX_LOOKUP_DEFINITIONS,
        },
        ItemRefLookupService,
        PinRefLookupService,
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
