import { render } from '@testing-library/angular';

import { RefLookupComponent } from './ref-lookup.component';

describe('RefLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
