import { render } from '@testing-library/angular';

import { PinTargetLookupPgComponent } from './pin-target-lookup-pg.component';

describe('PinTargetLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PinTargetLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
