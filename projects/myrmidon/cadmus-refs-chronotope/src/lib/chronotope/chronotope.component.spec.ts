import { render } from '@testing-library/angular';

import { ChronotopeComponent } from './chronotope.component';

describe('ChronotopeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ChronotopeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
