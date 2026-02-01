import { render } from '@testing-library/angular';

import { CompactCitationPgComponent } from './compact-citation-pg.component';

describe('CompactCitationPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CompactCitationPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
