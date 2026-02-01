import { render } from '@testing-library/angular';

import { RefLookupOptionsComponent } from './ref-lookup-options.component';

describe('RefLookupOptionsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupOptionsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
