import { render } from '@testing-library/angular';

import { CodLocationComponent } from './cod-location.component';

describe('CodLocationComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CodLocationComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
