import { render } from '@testing-library/angular';

import { PhysicalSizeComponent } from './physical-size.component';

describe('PhysicalSizeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalSizeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
