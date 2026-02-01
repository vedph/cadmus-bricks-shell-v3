import { render } from '@testing-library/angular';

import { PhysicalGridPgComponent } from './physical-grid-pg.component';

describe('PhysicalGridPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalGridPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
