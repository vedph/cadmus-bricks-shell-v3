import { render } from '@testing-library/angular';

import { PhysicalDimensionPgComponent } from './physical-dimension-pg.component';

describe('PhysicalDimensionPg', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalDimensionPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
