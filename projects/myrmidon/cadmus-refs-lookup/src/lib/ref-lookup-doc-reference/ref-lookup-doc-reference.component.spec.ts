import { render } from '@testing-library/angular';

import { LookupDocReferenceComponent } from './ref-lookup-doc-reference.component';

describe('LookupDocReferenceComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(LookupDocReferenceComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
