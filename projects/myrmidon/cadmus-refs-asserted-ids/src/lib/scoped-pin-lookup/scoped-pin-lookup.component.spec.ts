import { render } from '@testing-library/angular';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { ScopedPinLookupComponent } from './scoped-pin-lookup.component';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

describe('ScopedPinLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ScopedPinLookupComponent, {
      providers: [
        {
          provide: 'indexLookupDefinitions',
          useValue: INDEX_LOOKUP_DEFINITIONS,
        },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
