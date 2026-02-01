import { render } from '@testing-library/angular';

import { FlagSetPgComponent } from './flag-set-pg.component';

describe('FlagSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(FlagSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
