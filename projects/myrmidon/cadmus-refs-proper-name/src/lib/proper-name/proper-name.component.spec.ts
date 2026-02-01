import { render } from '@testing-library/angular';

import { ProperNameComponent } from './proper-name.component';

describe('ProperNameComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ProperNameComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
