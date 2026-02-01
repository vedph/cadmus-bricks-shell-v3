import { render } from '@testing-library/angular';

import { EmojiImePgComponent } from './emoji-ime-pg.component';

describe('EmojiImePgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(EmojiImePgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
