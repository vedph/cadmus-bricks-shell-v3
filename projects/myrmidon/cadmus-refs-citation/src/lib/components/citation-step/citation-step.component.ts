import { Component, input, output } from '@angular/core';

import { MatRippleModule } from '@angular/material/core';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { CitComponent } from '../../models';

@Component({
  selector: 'cadmus-citation-step',
  imports: [MatRippleModule, ColorToContrastPipe],
  templateUrl: './citation-step.component.html',
  styleUrl: './citation-step.component.css',
})
export class CitationStepComponent {
  public readonly step = input<CitComponent>();
  public readonly stepClick = output<CitComponent>();
  public readonly error = input<string>();

  public handleClick(): void {
    this.stepClick.emit(this.step()!);
  }
}
