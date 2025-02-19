import { Component, computed, Inject, input } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { Citation } from '../../models';
import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitSchemeService,
} from '../../services/cit-scheme.service';

@Component({
  selector: 'cadmus-citation-view',
  imports: [MatTooltipModule, ColorToContrastPipe],
  templateUrl: './citation-view.component.html',
  styleUrl: './citation-view.component.css',
})
export class CitationViewComponent {
  /**
   * The citation to display, which can be its model or its textual
   * representation.
   */
  public readonly citation = input<string | Citation>();
  /**
   * The default scheme ID to use when no scheme is specified in the
   * citation's text.
   */
  public readonly defaultSchemeId = input.required<string>();

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {}

  public readonly cit = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    return typeof this.citation() === 'string'
      ? this._schemeService.parse(
          this.citation() as string,
          this.defaultSchemeId()
        )
      : (this.citation() as Citation);
  });
}
