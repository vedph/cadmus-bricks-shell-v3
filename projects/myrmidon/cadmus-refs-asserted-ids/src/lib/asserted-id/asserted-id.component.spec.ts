import { render } from '@testing-library/angular';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { AssertedIdComponent } from './asserted-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

describe('AssertedIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: [
        {
          provide: PinRefLookupService,
          useValue: {
            lookup: vi.fn(),
            getName: vi.fn().mockReturnValue(''),
          },
        },
        {
          provide: 'indexLookupDefinitions',
          useValue: INDEX_LOOKUP_DEFINITIONS,
        },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
