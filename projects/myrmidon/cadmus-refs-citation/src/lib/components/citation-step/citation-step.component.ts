import { Component, input, output } from '@angular/core';
import { CitComponent, CitSchemeStep } from '../../models';

import { MatRippleModule } from '@angular/material/core';
import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

@Component({
  selector: 'cadmus-citation-step',
  imports: [MatRippleModule, ColorToContrastPipe],
  templateUrl: './citation-step.component.html',
  styleUrl: './citation-step.component.css',
})
export class CitationStepComponent {
  public readonly color = input<string>('#777');
  public readonly label = input<string>();
  public readonly step = input<CitComponent>();
  public readonly stepClick = output<CitComponent>();

  public handleClick(): void {
    this.stepClick.emit(this.step()!);
  }
}
