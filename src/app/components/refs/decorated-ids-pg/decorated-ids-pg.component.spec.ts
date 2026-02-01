import { render } from '@testing-library/angular';

import { DecoratedIdsPgComponent } from './decorated-ids-pg.component';

describe('DecoratedIdsPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DecoratedIdsPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
