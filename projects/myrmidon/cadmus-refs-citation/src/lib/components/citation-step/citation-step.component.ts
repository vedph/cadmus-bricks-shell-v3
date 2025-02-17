import { Component, computed, input, output } from '@angular/core';

import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { CitStep } from '../../models';

@Component({
  selector: 'cadmus-citation-step',
  imports: [MatRippleModule, MatTooltipModule, ColorToContrastPipe],
  templateUrl: './citation-step.component.html',
  styleUrl: './citation-step.component.css',
})
export class CitationStepComponent {
  public readonly step = input<CitStep>();
  public readonly stepClick = output<CitStep>();
  public readonly errors = input<{ [key: string]: string }>();
  public readonly error = computed<string | undefined>(() => {
    const errors = this.errors();
    const step = this.step();
    return !errors || !step ? undefined : errors[step.step];
  });

  public handleClick(): void {
    this.stepClick.emit(this.step()!);
  }
}
