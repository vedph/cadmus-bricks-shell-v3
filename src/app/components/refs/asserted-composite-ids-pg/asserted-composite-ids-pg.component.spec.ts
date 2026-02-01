import { render } from '@testing-library/angular';

import { AssertedCompositeIdsPgComponent } from './asserted-composite-ids-pg.component';

describe('AssertedCompositeIdsPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdsPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
