import { render } from '@testing-library/angular';

import { AssertedCompositeIdsComponent } from './asserted-composite-ids.component';

describe('AssertedCompositeIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
