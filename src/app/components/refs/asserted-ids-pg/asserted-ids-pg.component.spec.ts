import { render } from '@testing-library/angular';

import { AssertedIdsPgComponent } from './asserted-ids-pg.component';

describe('AssertedIdsPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdsPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
