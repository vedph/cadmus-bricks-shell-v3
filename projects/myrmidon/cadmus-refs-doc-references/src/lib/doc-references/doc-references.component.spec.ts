import { render } from '@testing-library/angular';

import { DocReferencesComponent } from './doc-references.component';

describe('DocReferencesComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DocReferencesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
