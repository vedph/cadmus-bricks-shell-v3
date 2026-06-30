import { render } from '@testing-library/angular';

import { NamedValueEditorPgComponent } from './named-value-editor-pg.component';

describe('NamedValueEditorPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(NamedValueEditorPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
