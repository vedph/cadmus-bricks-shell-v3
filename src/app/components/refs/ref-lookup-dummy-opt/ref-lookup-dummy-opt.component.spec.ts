import { render } from '@testing-library/angular';

import { RefLookupDummyOptComponent } from './ref-lookup-dummy-opt.component';

describe('RefLookupDummyOptComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupDummyOptComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
