import { render } from '@testing-library/angular';

import { ViafRefLookupPgComponent } from './viaf-ref-lookup-pg.component';

describe('ViafRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ViafRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
