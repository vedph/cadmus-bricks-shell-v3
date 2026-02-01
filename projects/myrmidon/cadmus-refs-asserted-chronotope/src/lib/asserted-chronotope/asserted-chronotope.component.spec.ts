import { render } from '@testing-library/angular';

import { AssertedChronotopeComponent } from './asserted-chronotope.component';

describe('AssertedChronotopeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
