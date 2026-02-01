import { render } from '@testing-library/angular';

import { ExternalIdsComponent } from './external-ids.component';

describe('ExternalIdsComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ExternalIdsComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
