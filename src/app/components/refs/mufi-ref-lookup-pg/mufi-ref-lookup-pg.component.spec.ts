import { render } from '@testing-library/angular';

import { MufiRefLookupPgComponent } from './mufi-ref-lookup-pg.component';

describe('MufiRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(MufiRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
