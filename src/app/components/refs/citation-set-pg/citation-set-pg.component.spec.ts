import { render } from '@testing-library/angular';

import { CitationSetPgComponent } from './citation-set-pg.component';

describe('CitationSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CitationSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
