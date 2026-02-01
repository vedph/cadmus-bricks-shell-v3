import { render } from '@testing-library/angular';

import { TextBlockViewComponent } from './text-block-view.component';

describe('TextBlockViewComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(TextBlockViewComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
