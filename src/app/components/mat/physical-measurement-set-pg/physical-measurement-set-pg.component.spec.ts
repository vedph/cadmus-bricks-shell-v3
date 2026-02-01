import { render } from '@testing-library/angular';

import { PhysicalMeasurementSetPgComponent } from './physical-measurement-set-pg.component';

describe('PhysicalMeasurementSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalMeasurementSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
