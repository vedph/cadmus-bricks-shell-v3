import { render } from '@testing-library/angular';

import { TextBlockViewPgComponent } from './text-block-view-pg.component';

describe('TextBlockViewPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(TextBlockViewPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
