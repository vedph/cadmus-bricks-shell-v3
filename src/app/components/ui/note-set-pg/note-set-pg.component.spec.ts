import { render } from '@testing-library/angular';

import { NoteSetPgComponent } from './note-set-pg.component';

describe('NoteSetPgComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(NoteSetPgComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
