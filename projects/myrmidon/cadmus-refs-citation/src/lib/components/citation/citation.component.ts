import { Component, computed, Inject, InjectionToken, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CitSchemeService } from '../../services/cit-scheme.service';

/**
 * Injection token for the citation scheme service.
 */
export const CIT_SCHEME_SERVICE_TOKEN = new InjectionToken<CitSchemeService>(
  'CitSchemeService'
);

/**
 * A component for editing a literary citation using a citation scheme.
 * The citation scheme service is injected using CIT_SCHEME_SERVICE_TOKEN.
 */
@Component({
  selector: 'cadmus-citation',
  imports: [MatButtonModule, MatIconModule, MatSelectModule, MatTooltipModule],
  templateUrl: './citation.component.html',
  styleUrl: './citation.component.css',
})
export class CitationComponent {
  /**
   * The scheme IDs to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeIds = input<string[]>();

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private citSchemeService: CitSchemeService
  ) {}
}
