import { render } from '@testing-library/angular';

import { FlagSetBadgeComponent } from './flag-set-badge.component';

describe('FlagSetBadgeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(FlagSetBadgeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
