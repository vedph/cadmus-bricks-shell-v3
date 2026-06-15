import { render } from '@testing-library/angular';

import { IconclassRefLookupPgComponent } from './iconclass-ref-lookup-pg.component';

describe('IconclassRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(IconclassRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
