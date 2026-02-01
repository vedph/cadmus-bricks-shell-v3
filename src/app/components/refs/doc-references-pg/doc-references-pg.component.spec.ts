import { render } from '@testing-library/angular';

import { DocReferencesPgComponent } from './doc-references-pg.component';

describe('DocReferencesPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DocReferencesPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
