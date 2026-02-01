import { render } from '@testing-library/angular';

import { PhysicalStateComponent } from './physical-state.component';

describe('PhysicalStateComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PhysicalStateComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
