import {
  Component,
  computed,
  ElementRef,
  Inject,
  InjectionToken,
  input,
  model,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
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
import { NgFor } from '@angular/common';

/**
 * Injection token for the citation scheme service.
 */
export const CIT_SCHEME_SERVICE_TOKEN = new InjectionToken<CitSchemeService>(
  'CitSchemeService'
);

type StepEditMode = 'string' | 'masked' | 'number' | 'set';

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
  private readonly _subs: Subscription[] = [];

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

  @ViewChild('free', { static: false }) freeInput?: ElementRef;

  /**
   * The current scheme.
   */
  public scheme: FormControl<CitScheme>;
  /**
   * The free text input.
   */
  public freeMode: boolean = false;
  public text: FormControl<string | null>;
  public textForm: FormGroup;

  public editedStep?: CitComponent;
  public stepEditMode: StepEditMode = 'string';
  // set-editor form
  public setEditorItems: string[] = [];
  public setEditorItem: FormControl<string | null>;
  public setEditorForm: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {
    this.scheme = formBuilder.control(this.schemes()[0], { nonNullable: true });
    // free text form
    this.text = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(100),
    ]);
    this.textForm = formBuilder.group({
      text: this.text,
    });
    // set editor form
    this.setEditorItem = formBuilder.control(null, Validators.required);
    this.setEditorForm = formBuilder.group({
      item: this.setEditorItem,
    });
  }

  public ngOnInit(): void {
    // reset citation and free text on scheme change
    this._subs.push(
      this.scheme.valueChanges.subscribe((scheme) => {
        const cit: CitationModel = [];
        for (let i = 0; i < scheme.path.length; i++) {
          cit.push({
            step: scheme.path[i],
            color: scheme.steps[scheme.path[i]].color,
            value: '',
          });
        }
        this.citation.set(cit);
        this.text.reset();
      })
    );
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  public editStep(step: CitComponent | null): void {
    if (!step) {
      this.editedStep = undefined;
      return;
    }

    console.log(step);
    this.editedStep = step;

    // set edit mode according to step type
    const stepDef = this.scheme.value.steps[step.step];
    if (stepDef.value.set) {
      this.setEditorItems = stepDef.value.set;
      this.stepEditMode = 'set';
      this.setEditorItem.setValue(step.value);
    } else if (stepDef.numeric) {
      this.stepEditMode = 'number';
    } else if (stepDef.maskPattern) {
      this.stepEditMode = 'masked';
    } else {
      this.stepEditMode = 'string';
    }
  }

  public saveSetStep(): void {
    if (!this.editedStep || this.setEditorForm.invalid) {
      return;
    }

    // update step value in new citation
    const cit: CitationModel = [...(this.citation() || [])];
    const index = cit.findIndex((s) => s.step === this.editedStep!.step);
    if (index === -1) {
      return;
    }
    this.editedStep.value = this.setEditorItem.value!;
    this.editedStep.n = 1 + this.setEditorItems.indexOf(this.setEditorItem.value!);

    // update citation
    cit[index] = this.editedStep;
    this.citation.set(cit);
    this.editedStep = undefined;
  }

  public setFreeMode(on: boolean): void {
    // if was toggled off, parse text into citation
    if (!on) {
      if (this.text.value) {
        const cit = this._schemeService.parse(
          this.text.value,
          this.scheme.value.id
        );
        if (cit.length) {
          this.citation.set(cit);
          this.freeMode = false;
        } else {
          return;
        }
      }
    } else {
      // if was toggled on, render citation into string
      this.freeMode = true;
      if (this.citation()) {
        this.text.setValue(
          this._schemeService.toString(this.citation()!, this.scheme.value.id)
        );
        setTimeout(() => {
          this.freeInput?.nativeElement.focus();
        }, 100);
      }
    }
  }
}
