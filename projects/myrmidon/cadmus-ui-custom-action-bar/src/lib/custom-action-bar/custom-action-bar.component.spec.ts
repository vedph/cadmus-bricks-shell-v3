import { render } from '@testing-library/angular';

import { CustomActionBarComponent } from './custom-action-bar.component';

describe('CustomActionBarComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CustomActionBarComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
