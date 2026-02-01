import { render } from '@testing-library/angular';

import { RefLookupPgComponent } from './ref-lookup-pg.component';

describe('RefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
