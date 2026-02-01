import { render } from '@testing-library/angular';

import { HistoricalDatePgComponent } from './historical-date-pg.component';

describe('HistoricalDatePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(HistoricalDatePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
