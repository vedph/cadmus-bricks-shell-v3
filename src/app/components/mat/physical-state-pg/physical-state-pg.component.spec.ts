import { render } from '@testing-library/angular';

import { PhysicalStatePgComponent } from './physical-state-pg.component';

describe('PhysicalStatePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalStatePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
