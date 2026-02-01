import { render } from '@testing-library/angular';

import { AssertedIdPgComponent } from './asserted-id-pg.component';

describe('AssertedIdPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
