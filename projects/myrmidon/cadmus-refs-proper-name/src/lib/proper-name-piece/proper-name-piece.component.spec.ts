import { render } from '@testing-library/angular';

import { ProperNamePieceComponent } from './proper-name-piece.component';

describe('ProperNamePieceComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ProperNamePieceComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
