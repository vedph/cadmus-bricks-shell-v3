import { render } from '@testing-library/angular';

import { GeonamesRefLookupPgComponent } from './geonames-ref-lookup-pg.component';

describe('GeonamesRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(GeonamesRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
