import { render } from '@testing-library/angular';

import { ScopedPinLookupComponent } from './scoped-pin-lookup.component';

describe('ScopedPinLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ScopedPinLookupComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
