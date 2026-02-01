import { render } from '@testing-library/angular';

import { EmojiImeComponent } from './emoji-ime.component';

describe('EmojiImeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(EmojiImeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
