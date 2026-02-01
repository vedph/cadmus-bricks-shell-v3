import { render } from '@testing-library/angular';

import { CitationStepComponent } from './citation-step.component';

describe('CitationStepComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(CitationStepComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
