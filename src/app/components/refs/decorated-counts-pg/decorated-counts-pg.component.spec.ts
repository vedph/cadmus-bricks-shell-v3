import { render } from '@testing-library/angular';

import { DecoratedCountsPgComponent } from './decorated-counts-pg.component';

describe('DecoratedCountsPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DecoratedCountsPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
