import {
  Component,
  computed,
  Inject,
  InjectionToken,
  input,
  model,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { NgFor } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CitationModel, CitComponent, CitScheme } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';
import { CitationStepComponent } from '../citation-step/citation-step.component';

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
  selector: 'cadmus-refs-citation',
  imports: [
    ReactiveFormsModule,
    NgFor,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    CitationStepComponent,
  ],
  templateUrl: './citation.component.html',
  styleUrl: './citation.component.css',
})
export class CitationComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

  /**
   * True if the component allows free mode, where the user can type the
   * citation as a free text, using the scheme parser.
   */
  public readonly hasFreeMode = input<boolean>();

  /**
   * The citation to edit.
   */
  public readonly citation = model<CitationModel>();

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
  public freeMode: FormControl<boolean>;

  /**
   * The free text input.
   */
  public text: FormControl<string | null>;
  public textForm: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {
    this.scheme = formBuilder.control(this.schemes()[0], { nonNullable: true });
    this.freeMode = formBuilder.control(false, { nonNullable: true });
    this.text = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.textForm = formBuilder.group({
      text: this.text,
    });
  }

  public ngOnInit(): void {
    // reset citation on scheme change
    this._sub = this.scheme.valueChanges.subscribe((scheme) => {
      const cit: CitationModel = [];
      for (let i = 0; i < scheme.path.length; i++) {
        cit.push({
          step: scheme.path[i],
          color: scheme.steps[scheme.path[i]].color,
          value: '',
        });
      }
      this.citation.set(cit);
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onStepClick(step: CitComponent): void {
    console.log(step);
    // ...
  }
}
