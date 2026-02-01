import { render } from '@testing-library/angular';

import { DbpediaRefLookupPgComponent } from './dbpedia-ref-lookup-pg.component';

describe('DbpediaRefLookupPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(DbpediaRefLookupPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
