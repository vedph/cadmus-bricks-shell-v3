import { render } from '@testing-library/angular';

import { DecoratedIdsComponent } from './decorated-ids.component';

describe('DecoratedIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DecoratedIdsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
