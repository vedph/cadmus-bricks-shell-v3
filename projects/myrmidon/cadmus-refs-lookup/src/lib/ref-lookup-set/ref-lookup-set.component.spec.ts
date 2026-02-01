import { render } from '@testing-library/angular';

import { RefLookupSetComponent } from './ref-lookup-set.component';

describe('RefLookupSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
