import { render } from '@testing-library/angular';

import { CadmusUiObjectView } from './cadmus-ui-object-view';

describe('CadmusUiObjectView', () => {
  it('should render', async () => {
    const { fixture } = await render(CadmusUiObjectView);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
