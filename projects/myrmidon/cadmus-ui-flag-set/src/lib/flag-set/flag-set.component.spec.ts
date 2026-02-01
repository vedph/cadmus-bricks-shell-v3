import { render } from '@testing-library/angular';

import { FlagSetComponent } from './flag-set.component';

describe('FlagSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(FlagSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
