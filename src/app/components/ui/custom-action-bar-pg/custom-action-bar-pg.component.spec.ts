import { render } from '@testing-library/angular';

import { CustomActionBarPgComponent } from './custom-action-bar-pg.component';

describe('CustomActionBarPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CustomActionBarPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
