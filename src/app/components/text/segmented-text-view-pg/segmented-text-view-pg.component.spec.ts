import { render, screen } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SegmentedTextViewPgComponent } from './segmented-text-view-pg.component';

describe('SegmentedTextViewPgComponent', () => {
  it('should render the viewer with the sample text', async () => {
    const { fixture } = await render(SegmentedTextViewPgComponent, {
      providers: [provideNoopAnimations()],
    });
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(screen.getAllByRole('group').length).toBeGreaterThan(1);
    expect(screen.getByLabelText('coordinates')).toBeTruthy();
  });
});
