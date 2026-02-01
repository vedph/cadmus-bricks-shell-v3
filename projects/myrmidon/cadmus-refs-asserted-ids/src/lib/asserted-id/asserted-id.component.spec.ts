import { render } from '@testing-library/angular';

import { AssertedIdComponent } from './asserted-id.component';

describe('AssertedIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
