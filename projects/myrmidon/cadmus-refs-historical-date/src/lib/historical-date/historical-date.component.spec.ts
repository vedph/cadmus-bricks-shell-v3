import { render } from '@testing-library/angular';

import { HistoricalDateComponent } from './historical-date.component';

describe('HistoricalDateComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(HistoricalDateComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
