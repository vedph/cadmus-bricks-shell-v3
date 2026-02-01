import { render } from '@testing-library/angular';

import { CitationSetComponent } from './citation-set.component';

describe('CitationSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CitationSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
