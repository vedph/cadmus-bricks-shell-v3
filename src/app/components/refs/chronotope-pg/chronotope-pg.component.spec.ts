import { render } from '@testing-library/angular';

import { ChronotopePgComponent } from './chronotope-pg.component';

describe('ChronotopePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ChronotopePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
