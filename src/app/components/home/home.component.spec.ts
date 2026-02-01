import { render } from '@testing-library/angular';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
