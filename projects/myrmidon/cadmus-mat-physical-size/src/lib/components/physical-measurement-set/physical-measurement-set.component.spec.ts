import { render } from '@testing-library/angular';

import { PhysicalMeasurementSetComponent } from './physical-measurement-set.component';

describe('PhysicalMeasurementSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalMeasurementSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
