import { render } from '@testing-library/angular';

import { CitationViewComponent } from './citation-view.component';

describe('CitationViewComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CitationViewComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
