import { render } from '@testing-library/angular';

import { AssertedChronotopePgComponent } from './asserted-chronotope-pg.component';

describe('AssertedChronotopePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
