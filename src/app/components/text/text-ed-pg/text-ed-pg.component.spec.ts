import { render } from '@testing-library/angular';

import { TextEdPgComponent } from './text-ed-pg.component';

describe('TextEdPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(TextEdPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
