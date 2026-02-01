import { render } from '@testing-library/angular';

import { NoteSetComponent } from './note-set.component';

describe('NoteSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(NoteSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
