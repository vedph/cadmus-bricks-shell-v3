import { render } from '@testing-library/angular';

import { AssertedIdsComponent } from './asserted-ids.component';

describe('AssertedIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
