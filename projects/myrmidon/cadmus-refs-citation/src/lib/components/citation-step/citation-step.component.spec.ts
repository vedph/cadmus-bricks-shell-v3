import { render, screen } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CitationStepComponent } from './citation-step.component';
import { CitStep } from '../../models';

const STEP: CitStep = {
  stepId: 'book',
  color: '#4287f5',
  value: '1',
  n: 1,
};

describe('CitationStepComponent', () => {
  it('should not render when step is undefined', async () => {
    const { container } = await render(CitationStepComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(container.querySelector('.step-container')).toBeFalsy();
  });

  it('should render the step label and value', async () => {
    await render(CitationStepComponent, {
      inputs: { step: STEP },
      providers: [provideNoopAnimations()],
    });
    expect(screen.getByText('book')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('should apply the step color as background', async () => {
    const { container } = await render(CitationStepComponent, {
      inputs: { step: STEP },
      providers: [provideNoopAnimations()],
    });
    const el = container.querySelector('.step-container') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.backgroundColor).toBeTruthy();
  });

  it('should compute no error when errors is undefined', async () => {
    const { fixture } = await render(CitationStepComponent, {
      inputs: { step: STEP },
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.error()).toBeUndefined();
  });

  it('should compute the error matching the step ID', async () => {
    const { fixture, container } = await render(CitationStepComponent, {
      inputs: { step: STEP, errors: { book: 'invalid book value' } },
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.error()).toBe('invalid book value');
    const el = container.querySelector('.step-container') as HTMLElement;
    expect(el.style.borderColor).toBeTruthy();
  });

  it('should compute undefined error when errors do not match step ID', async () => {
    const { fixture } = await render(CitationStepComponent, {
      inputs: { step: STEP, errors: { verse: 'invalid verse value' } },
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.error()).toBeUndefined();
  });

  it('should emit stepClick with the step when clicked', async () => {
    const { fixture, container } = await render(CitationStepComponent, {
      inputs: { step: STEP },
      providers: [provideNoopAnimations()],
    });
    let emitted: CitStep | undefined;
    fixture.componentInstance.stepClick.subscribe((s: CitStep) => {
      emitted = s;
    });
    const el = container.querySelector('.step-container') as HTMLElement;
    el.click();
    fixture.detectChanges();
    expect(emitted).toEqual(STEP);
  });
});
