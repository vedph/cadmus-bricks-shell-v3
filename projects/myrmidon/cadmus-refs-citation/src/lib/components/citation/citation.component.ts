import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgFor } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe, deepCopy } from '@myrmidon/ngx-tools';

import { Citation, CitStep, CitScheme } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';
import { CitationStepComponent } from '../citation-step/citation-step.component';
import { DynamicFocus } from '../../services/dynamic-focus';

export type CitationError = {
  citation?: Citation;
  step?: string;
  error: string;
};

type StepEditMode = 'string' | 'masked' | 'number' | 'set';

/**
 * A component for editing a literary citation using a citation scheme.
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
    ColorToContrastPipe,
  ],
  templateUrl: './citation.component.html',
  styleUrl: './citation.component.css',
})
export class CitationComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];
  private readonly _focusHelper: DynamicFocus;
  private _dropNextUpdate = false;
  private _updatingCit?: boolean;

  /**
   * The citation to edit.
   */
  public readonly citation = model<Citation>();

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
  public readonly allowFreeMode = input<boolean>();

  /**
   * True if the component allows a partial citation, i.e. a citation
   * missing the final step(s) starting from the first one defined as
   * optional in the scheme.
   */
  public readonly allowPartial = input<boolean>();

  /**
   * The schemes to use in this component.
   */
  public readonly schemes = computed<Readonly<CitScheme[]>>(() => {
    return this._schemeService.getSchemes(this.schemeKeys());
  });

  /**
   * Emitted when the user clicks the cancel button.
   */
  public readonly cancel = output<void>();

  @ViewChild('free', { static: false }) freeInput?: ElementRef;

  /**
   * The current scheme.
   */
  public scheme: FormControl<CitScheme>;
  public lastStep: FormControl<string | null>;
  public lastStepIndex: number;

  /**
   * The free text input.
   */
  public freeMode: boolean = false;
  public text: FormControl<string | null>;
  public textForm: FormGroup;

  public editedStep?: CitStep;
  public stepEditMode: StepEditMode = 'string';
  // set-editor form
  public setEditorItems: string[] = [];
  public setEditorItem: FormControl<string | null>;
  public setEditorForm: FormGroup;
  // number-editor form
  public minNrValue?: number;
  public maxNrValue?: number;
  public nrEditorValue: FormControl<number>;
  public nrEditorSuffix: FormControl<string | null>;
  public nrEditorForm: FormGroup;
  public hasSuffix?: boolean;
  // string-editor form
  public strEditorValue: FormControl<string | null>;
  public strEditorForm: FormGroup;

  public editedCitation?: Citation;
  public errors: { [key: string]: string } = {};

  constructor(
    formBuilder: FormBuilder,
    private _schemeService: CitSchemeService,
    private _zone: NgZone
  ) {
    // focus helper
    this._focusHelper = new DynamicFocus(this._zone);

    // form
    this.scheme = formBuilder.control(this.schemes()[0], { nonNullable: true });
    this.lastStep = formBuilder.control(null);
    this.lastStepIndex = this.scheme.value.path.length - 1;

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
    // number editor form
    this.nrEditorValue = formBuilder.control(0, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.nrEditorSuffix = formBuilder.control(null);
    this.nrEditorForm = formBuilder.group({
      value: this.nrEditorValue,
      suffix: this.nrEditorSuffix,
    });
    // string editor form
    this.strEditorValue = formBuilder.control(null, Validators.required);
    this.strEditorForm = formBuilder.group({
      value: this.strEditorValue,
    });

    // when citation changes, update edited citation
    effect(() => {
      const citation = this.citation();
      console.log('citation change', citation);
      if (this._dropNextUpdate) {
        console.log('drop next update');
        this._dropNextUpdate = false;
        return;
      }
      // close step editor
      this.editedStep = undefined;
      this.text.reset();
      // when undefined, return an empty citation so that user can fill it
      if (!citation?.steps?.length) {
        this.editedCitation = this.createEmptyCitation();
      } else {
        this.editedCitation = citation;
      }
      console.log('edited citation', this.editedCitation);
    });
  }

  private createEmptyCitation(schemeId?: string): Citation {
    return this._schemeService.createEmptyCitation(
      schemeId || this.scheme.value.id,
      -1
    );
  }

  public ngOnInit(): void {
    // if no citation, create an empty one
    if (!this.citation()?.steps?.length) {
      this.editedCitation = this.createEmptyCitation();
    }

    // on scheme change, reset citation and free text, and
    // reset allowPartial if the scheme does not allow it
    this._subs.push(
      this.scheme.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(100))
        .subscribe((scheme) => {
          if (this._updatingCit || !scheme) {
            this._updatingCit = false;
            return;
          }
          console.log('scheme change', scheme);
          this.editedStep = undefined;
          this.text.reset();
          this.editedCitation = this.createEmptyCitation(scheme.id);
          this.lastStep.setValue(
            this.scheme.value.path[scheme.path.length - 1]
          );
          this.lastStepIndex = scheme.path.length - 1;
        })
    );

    // when last step changes, update last step index
    this._subs.push(
      this.lastStep.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(100))
        .subscribe((s) => {
          this.lastStepIndex = this.scheme.value.path.indexOf(s || '');
          // truncate or extend citation steps according to last step index
          const cit = this.editedCitation;
          if (!cit) {
            return;
          }
          const newCit: Citation = {
            schemeId: cit.schemeId,
            steps: cit.steps.slice(0, this.lastStepIndex + 1),
          };
          for (let i = cit.steps.length; i <= this.lastStepIndex; i++) {
            newCit.steps.push({
              stepId: this.scheme.value.path[i],
              format: this.scheme.value.steps[this.scheme.value.path[i]].format,
              color: this.scheme.value.steps[this.scheme.value.path[i]].color,
              value: '',
            });
          }
          this.editedCitation = newCit;
          this.validateCitation(newCit);
        })
    );
  }

  public ngOnDestroy(): void {
    // clean up any pending focus operations
    this._focusHelper.cancelAllFocus();
    // clean up subscriptions
    this._subs.forEach((s) => s.unsubscribe());
  }

  public setFreeMode(on: boolean): void {
    // if was toggled off, parse text into citation
    if (!on) {
      if (this.text.value) {
        const cit = this._schemeService.parse(
          this.text.value,
          this.scheme.value.id
        );
        if (cit?.steps?.length) {
          this.editedCitation = cit;
          this.validateCitation(cit);
          this.freeMode = false;
        } else {
          return;
        }
      }
    } else {
      // if was toggled on, render citation into string
      this.editedStep = undefined;
      this.freeMode = true;
      if (this.editedCitation) {
        this.text.setValue(this._schemeService.toString(this.editedCitation!));
        setTimeout(() => {
          this.freeInput?.nativeElement.focus();
        }, 100);
      }
    }
  }

  public closeFreeMode(): void {
    this.freeMode = false;
  }

  //#region Step editing
  public editStep(step: CitStep | null): void {
    if (!step || !this.scheme.value) {
      this.editedStep = undefined;
      return;
    }

    console.log(step);
    this.editedStep = step;

    // set edit mode according to step type
    const stepDef = this.scheme.value.steps[step.stepId];
    const stepDomain = this._schemeService.getStepDomain(
      step.stepId,
      this.editedCitation,
      this.scheme.value.id
    )!;

    switch (stepDef.type) {
      case 'set':
        // closed set of strings
        this.setEditorItems = stepDomain.set!;
        this.stepEditMode = 'set';
        this.setEditorItem.setValue(step.value);
        // focus
        this._focusHelper.focusElement({
          target: 'set-field',
          maxAttempts: 5,
        });
        break;

      case 'numeric':
        // numeric with min/max and optional suffix
        this.stepEditMode = 'number';
        const validators = [Validators.required];
        if (stepDef.domain.range) {
          let n = stepDomain.range?.min;
          this.minNrValue = n !== undefined && n !== null ? n : undefined;
          if (this.minNrValue !== undefined) {
            validators.push(Validators.min(this.minNrValue));
          }
          n = stepDomain.range?.max;
          this.maxNrValue = n !== undefined && n !== null ? n : undefined;
          if (this.maxNrValue !== undefined) {
            validators.push(Validators.max(this.maxNrValue));
          }
        }
        this.nrEditorValue.setValue(step.n!);
        this.nrEditorValue.setValidators(validators);
        this.nrEditorValue.updateValueAndValidity();

        // if there is a suffix validation pattern, add it to the validators
        // of nrEditorSuffix; else, remove any existing pattern validators from it
        if (stepDef.suffixValidPattern) {
          this.nrEditorSuffix.setValidators([
            Validators.pattern(stepDef.suffixValidPattern),
          ]);
          this.nrEditorSuffix.updateValueAndValidity();
        } else {
          this.nrEditorSuffix.clearValidators();
        }
        this.hasSuffix = !!stepDef.suffixPattern;
        // focus
        this._focusHelper.focusElement({
          target: 'nr-field',
          maxAttempts: 5,
        });
        break;

      case 'masked':
        // masked string
        this.stepEditMode = 'masked';
        this.strEditorValue.setValidators([
          Validators.required,
          Validators.pattern(stepDef.maskPattern!),
        ]);
        this.strEditorValue.setValue(step.value);
        this.strEditorValue.updateValueAndValidity();
        // focus
        this._focusHelper.focusElement({
          target: 'str-field',
          maxAttempts: 5,
        });
        break;

      default:
        // free string
        this.stepEditMode = 'string';
        this.strEditorValue.setValidators([Validators.required]);
        this.strEditorValue.setValue(step.value);
        this.strEditorValue.updateValueAndValidity();
        // focus
        this._focusHelper.focusElement({
          target: 'str-field',
          maxAttempts: 5,
        });
        break;
    }
  }

  public saveSetStep(): void {
    if (!this.editedStep || this.setEditorForm.invalid) {
      return;
    }

    // update step value in new citation
    const cit: Citation = {
      ...(this.editedCitation || {
        schemeId: this.scheme.value.id,
        steps: [],
      }),
    };
    const index = this.scheme.value.path.indexOf(this.editedStep!.stepId);
    if (index === -1) {
      return;
    }
    this.editedStep.value = this.setEditorItem.value!;
    this.editedStep.n =
      1 + this.setEditorItems.indexOf(this.setEditorItem.value!);

    // update citation
    cit.steps[index] = this.editedStep;
    this.editedCitation = cit;
    this.editedStep = undefined;
    this.validateCitation(cit);

    // reset editor
    this.strEditorValue.reset();
  }

  public saveNumberStep(): void {
    if (!this.editedStep || this.nrEditorForm.invalid) {
      return;
    }

    // update step value in new citation
    const cit: Citation = {
      ...(this.editedCitation || {
        schemeId: this.scheme.value.id,
        steps: [],
      }),
    };
    const index = this.scheme.value.path.indexOf(this.editedStep!.stepId);
    if (index === -1) {
      return;
    }

    const format = cit.steps[index].format;
    if (format) {
      const formatter = this._schemeService.getFormatter(format);
      this.editedStep.value =
        formatter?.format(this.nrEditorValue.value) ||
        this.nrEditorValue.value.toString();
    } else {
      this.editedStep.value = this.nrEditorValue.value.toString();
    }
    this.editedStep.n = this.nrEditorValue.value;
    this.editedStep.suffix = this.nrEditorSuffix.value || undefined;

    // update citation
    cit.steps[index] = this.editedStep;
    this.editedCitation = cit;
    this.editedStep = undefined;
    this.validateCitation(cit);

    // reset editor
    this.nrEditorValue.reset();
  }

  public saveStringStep(): void {
    if (!this.editedStep || this.strEditorForm.invalid) {
      return;
    }

    // update step value in new citation
    const cit: Citation = {
      ...(this.editedCitation || {
        schemeId: this.scheme.value.id,
        steps: [],
      }),
    };
    const index = this.scheme.value.path.indexOf(this.editedStep!.stepId);
    if (index === -1) {
      return;
    }
    this.editedStep.value = this.strEditorValue.value || '';

    // update citation
    cit.steps[index] = this.editedStep;
    this.editedCitation = cit;
    this.editedStep = undefined;
    this.validateCitation(cit);
  }
  //#endregion

  //#region Validation
  public validateCitation(citation?: Citation): boolean {
    const errors: { [key: string]: string } = {};

    if (!citation?.steps.length) {
      errors[''] = 'No citation';
      this.errors = errors;
      return false;
    }

    for (let i = 0; i <= this.lastStepIndex; i++) {
      const step = citation.steps[i];
      if (!step) {
        break;
      }
      const domain = this._schemeService.getStepDomain(
        step.stepId,
        citation,
        this.scheme.value.id
      )!;

      // compare citation value with domain and return false if not valid
      if (domain.set?.length) {
        if (!domain.set.includes(step.value)) {
          errors[step.stepId] = `Invalid set value: ${step.value}`;
          this.errors = errors;
          return false;
        }
      } else if (domain.range) {
        const n = step.n || 0;
        if (
          domain.range.min !== undefined &&
          domain.range.min !== null &&
          n < domain.range.min
        ) {
          errors[step.stepId] = `Value below min: ${step.stepId}`;
          this.errors = errors;
          return false;
        }
        if (
          domain.range.max !== undefined &&
          domain.range.max !== null &&
          n > domain.range.max
        ) {
          errors[step.stepId] = `Value above max: ${step.stepId}`;
          this.errors = errors;
          return false;
        }
        if (
          domain.suffix &&
          !new RegExp(domain.suffix).test(step.suffix || '')
        ) {
          errors[step.stepId] = `Invalid suffix: ${step.stepId}`;
          this.errors = errors;
          return false;
        }
      } else if (domain.mask) {
        if (!new RegExp(domain.mask).test(step.value)) {
          errors[step.stepId] = `Invalid string: ${step.stepId}`;
          this.errors = errors;
          return false;
        }
      }
    }

    this.errors = errors;
    return true;
  }
  //#endregion

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    if (!this.validateCitation(this.editedCitation)) {
      return;
    }
    this._dropNextUpdate = true;
    this.citation.set(deepCopy(this.editedCitation!));
  }
}
