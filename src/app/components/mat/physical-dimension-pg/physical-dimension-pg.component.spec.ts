import { render } from '@testing-library/angular';

import { PhysicalDimensionPg } from './physical-dimension-pg';

describe('PhysicalDimensionPg', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalDimensionPg);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
