import { render } from '@testing-library/angular';

import { NamedValueSetEditorPgComponent } from './named-value-set-editor-pg.component';

describe('NamedValueSetEditorPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(NamedValueSetEditorPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
