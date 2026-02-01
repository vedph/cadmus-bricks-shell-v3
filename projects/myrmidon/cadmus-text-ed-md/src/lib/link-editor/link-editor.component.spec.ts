import { render } from '@testing-library/angular';

import { LinkEditorComponent } from './link-editor.component';

describe('LinkEditorComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(LinkEditorComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
