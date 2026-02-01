import { render } from '@testing-library/angular';

import { AssertionPgComponent } from './assertion-pg.component';

describe('AssertionPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertionPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
