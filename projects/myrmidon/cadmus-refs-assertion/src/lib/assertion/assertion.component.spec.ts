import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AssertionComponent } from './assertion.component';

describe('AssertionComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertionComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
