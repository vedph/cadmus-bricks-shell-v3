import { render } from '@testing-library/angular';

import { ProperNamePgComponent } from './proper-name-pg.component';

describe('ProperNamePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ProperNamePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
