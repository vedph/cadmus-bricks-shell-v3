import { render } from '@testing-library/angular';

import { PhysicalSizePgComponent } from './physical-size-pg.component';

describe('PhysicalSizePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalSizePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
