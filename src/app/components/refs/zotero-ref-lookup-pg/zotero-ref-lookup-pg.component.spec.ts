import { render } from '@testing-library/angular';

import { ZoteroRefLookupPgComponent } from './zotero-ref-lookup-pg.component';

describe('ZoteroRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ZoteroRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
