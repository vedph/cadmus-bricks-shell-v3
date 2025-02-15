import {
  Component,
  computed,
  Inject,
  InjectionToken,
  input,
} from '@angular/core';
import { NgFor } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CitScheme } from '../../models';
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
  imports: [
    ReactiveFormsModule,
    NgFor,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './citation.component.html',
  styleUrl: './citation.component.css',
})
export class CitationComponent {
  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

  /**
   * The schemes to use in this component.
   */
  public readonly schemes = computed<Readonly<CitScheme[]>>(() => {
    return this._schemeService.getSchemes(this.schemeKeys());
  });

  /**
   * The current scheme.
   */
  public scheme: FormControl<CitScheme>;

  constructor(
    formBuilder: FormBuilder,
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {
    this.scheme = formBuilder.control(this.schemes()[0], { nonNullable: true });
  }
}
