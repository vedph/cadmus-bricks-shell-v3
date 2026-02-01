import { render } from '@testing-library/angular';

import { AssertedCompositeIdPgComponent } from './asserted-composite-id-pg.component';

describe('AssertedCompositeIdPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
