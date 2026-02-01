import { render } from '@testing-library/angular';

import { WhgRefLookupPgComponent } from './whg-ref-lookup-pg.component';

describe('WhgRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(WhgRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
