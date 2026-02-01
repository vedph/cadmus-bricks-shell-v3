import { render } from '@testing-library/angular';

import { PhysicalDimensionComponent } from './physical-dimension.component';

describe('PhysicalDimensionComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalDimensionComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
