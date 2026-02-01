import { render } from '@testing-library/angular';

import { LookupDocReferencesComponent } from './ref-lookup-doc-references.component';

describe('LookupDocReferencesComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(LookupDocReferencesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
