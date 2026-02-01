import { render } from '@testing-library/angular';

import { RefLookupSetPgComponent } from './ref-lookup-set-pg.component';

describe('RefLookupSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
