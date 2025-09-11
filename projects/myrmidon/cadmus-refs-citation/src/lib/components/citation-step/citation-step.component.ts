import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { CitStep } from '../../models';

/**
 * A component to display a citation step. This just displays the step
 * with its optional errors, and raises an event when clicked. No editing
 * happens in this component.
 */
@Component({
  selector: 'cadmus-citation-step',
  imports: [MatRippleModule, MatTooltipModule, ColorToContrastPipe],
  templateUrl: './citation-step.component.html',
  styleUrl: './citation-step.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitationStepComponent {
  /**
   * The citation step to display.
   */
  public readonly step = input<CitStep>();

  /**
   * Emitted when the user clicks the step.
   */
  public readonly stepClick = output<CitStep>();

  /**
   * The errors for the current step if any. The keys are the step IDs.
   */
  public readonly errors = input<{ [key: string]: string }>();

  public readonly error = computed<string | undefined>(() => {
    const errors = this.errors();
    const step = this.step();
    return !errors || !step ? undefined : errors[step.stepId];
  });

  public handleClick(): void {
    const step = this.step();
    console.log('step click', step);
    this.stepClick.emit(step!);
  }
}
