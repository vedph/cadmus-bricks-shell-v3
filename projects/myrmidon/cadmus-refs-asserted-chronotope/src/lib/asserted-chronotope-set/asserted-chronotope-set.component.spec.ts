import { render } from '@testing-library/angular';

import { AssertedChronotopeSetComponent } from './asserted-chronotope-set.component';

describe('AssertedChronotopeSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopeSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
