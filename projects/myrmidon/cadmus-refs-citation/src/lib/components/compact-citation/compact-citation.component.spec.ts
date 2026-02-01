import { render } from '@testing-library/angular';

import { CompactCitationComponent } from './compact-citation.component';

describe('CompactCitationComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CompactCitationComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
