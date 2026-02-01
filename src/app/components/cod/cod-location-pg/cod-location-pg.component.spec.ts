import { render } from '@testing-library/angular';

import { CodLocationPgComponent } from './cod-location-pg.component';

describe('CodLocationPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CodLocationPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
