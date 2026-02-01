import { render } from '@testing-library/angular';

import { ExternalIdsPgComponent } from './external-ids-pg.component';

describe('ExternalIdsPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ExternalIdsPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
