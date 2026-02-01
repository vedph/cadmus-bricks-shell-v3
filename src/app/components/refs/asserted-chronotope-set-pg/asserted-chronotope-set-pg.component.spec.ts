import { render } from '@testing-library/angular';

import { AssertedChronotopeSetPgComponent } from './asserted-chronotope-set-pg.component';

describe('AssertedChronotopeSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopeSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
