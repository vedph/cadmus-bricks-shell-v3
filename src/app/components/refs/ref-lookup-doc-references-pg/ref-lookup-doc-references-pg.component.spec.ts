import { render } from '@testing-library/angular';

import { RefLookupDocReferencesPgComponent } from './ref-lookup-doc-references-pg.component';

describe('RefLookupDocReferencesPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(RefLookupDocReferencesPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
