import { render } from '@testing-library/angular';

import { PhysicalGridLocationComponent } from './physical-grid-location.component';

describe('PhysicalGridLocationComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalGridLocationComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
