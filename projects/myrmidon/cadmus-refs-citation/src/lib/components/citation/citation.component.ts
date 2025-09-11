import {
  ChangeDetectionStrategy,
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
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ColorToContrastPipe,
  deepCopy,
  DynamicFocus,
} from '@myrmidon/ngx-tools';

import { Citation, CitStep, CitScheme } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';
import { CitationStepComponent } from '../citation-step/citation-step.component';

export type CitationError = {
  citation?: Citation;
  step?: string;
  error: string;
};

type StepEditMode = 'string' | 'masked' | 'number' | 'set';

/**
 * A component for editing a literary citation using any of the available citation
 * schemes. This component shows all the steps of the citation (via CitationStepComponent),
 * and allows editing each step according to its type (string, masked string, numeric,
 * closed set). It also allows switching to a free text mode, where the user can
 * type the citation as a string, which is then parsed according to the scheme.
 * Users can change scheme, and optionally restrict it to a specified last step.
 * The component validates the citation according to the scheme and shows validation
 * errors.
 */
@Component({
  selector: 'cadmus-refs-citation',
  imports: [
    ReactiveFormsModule,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitationComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];
  private readonly _focusHelper: DynamicFocus;
  // this flag prevents effect from reacting to internal changes
  private _updatingFromParent = false;
  // this flag prevents scheme subscription from reacting
  // to programmatic scheme updates
  private _updatingSchemeFromCitation = false;
  // track last parent citation
  private _lastParentCitation: Citation | undefined = undefined;

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

  public readonly lastStepIndex = signal<number>(0);

  /**
   * The free text input.
   */
  public readonly freeMode = signal<boolean>(false);
  public text: FormControl<string | null>;
  public textForm: FormGroup;

  public readonly editedStep = signal<CitStep | undefined>(undefined);
  public readonly stepEditMode = signal<StepEditMode>('string');
  // set-editor form
  public readonly setEditorItems = signal<string[]>([]);
  public setEditorItem: FormControl<string | null>;
  public setEditorForm: FormGroup;
  // number-editor form
  public readonly minNrValue = signal<number | undefined>(undefined);
  public readonly maxNrValue = signal<number | undefined>(undefined);
  public nrEditorValue: FormControl<number>;
  public nrEditorSuffix: FormControl<string | null>;
  public nrEditorForm: FormGroup;
  public readonly hasSuffix = signal<boolean | undefined>(undefined);
  // string-editor form
  public strEditorValue: FormControl<string | null>;
  public strEditorForm: FormGroup;

  public readonly editedCitation = signal<Citation | undefined>(undefined);
  public readonly errors = signal<{ [key: string]: string }>({});

  constructor(
    formBuilder: FormBuilder,
    private _schemeService: CitSchemeService,
    private _zone: NgZone
  ) {
    // focus helper
    this._focusHelper = new DynamicFocus(this._zone);

    // check if service is available and has schemes
    const availableSchemes = this._schemeService ? this.schemes() : [];
    const defaultScheme =
      availableSchemes.length > 0 ? availableSchemes[0] : null;

    // form
    this.scheme = formBuilder.control(defaultScheme!, { nonNullable: true });
    this.lastStep = formBuilder.control(null);
    this.lastStepIndex.set(defaultScheme ? defaultScheme.path.length - 1 : 0);

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
      // only process if the citation actually changed from the last one we processed
      if (this._lastParentCitation === citation) {
        return;
      }

      console.log('citation input change from parent', citation);
      this._lastParentCitation = citation;

      if (!this._schemeService || !this.schemes().length) {
        console.warn('no service or schemes');
        return;
      }

      // prevent infinite loops
      if (this._updatingFromParent) {
        return;
      }

      this._updatingFromParent = true;

      try {
        // close any open editors
        this.editedStep.set(undefined);
        this.text.reset();

        if (citation?.steps?.length) {
          // create a deep copy to work with internally
          const citationCopy = deepCopy(citation);
          this.editedCitation.set(citationCopy);

          // update scheme to match the citation's scheme (only if different)
          const targetScheme = this._schemeService.getScheme(citation.schemeId);
          if (targetScheme && targetScheme.id !== this.scheme.value?.id) {
            this._updatingSchemeFromCitation = true;
            this.scheme.setValue(targetScheme, { emitEvent: false });
            this.lastStepIndex.set(targetScheme.path.length - 1);
            this.lastStep.setValue(
              targetScheme.path[targetScheme.path.length - 1] || null,
              { emitEvent: false }
            );
          }
        } else {
          // create empty citation with current scheme
          this.editedCitation.set(
            this.createEmptyCitation(this.scheme.value?.id)
          );
        }

        console.log('edited citation', this.editedCitation());
      } finally {
        this._updatingFromParent = false;
        this._updatingSchemeFromCitation = false;
      }
    });
  }

  private createEmptyCitation(schemeId?: string): Citation {
    if (!this._schemeService) {
      return { schemeId: '', steps: [] };
    }
    return this._schemeService.createEmptyCitation(
      schemeId || this.scheme.value?.id || '',
      -1
    );
  }

  public ngOnInit(): void {
    // exit early if no service or schemes available
    if (!this._schemeService || !this.schemes().length) {
      return;
    }

    // if no citation, create an empty one
    if (!this.citation()?.steps?.length) {
      this.editedCitation.set(this.createEmptyCitation());
    }

    // on scheme change, reset citation and free text
    this._subs.push(
      this.scheme.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(100))
        .subscribe((scheme) => {
          // skip if this change was triggered by a citation change
          if (
            this._updatingSchemeFromCitation ||
            !scheme ||
            !this._schemeService
          ) {
            this._updatingSchemeFromCitation = false;
            return;
          }

          console.log('user changed scheme to', scheme);

          // close any open editors
          this.editedStep.set(undefined);
          this.text.reset();

          // create new empty citation with the new scheme
          this.editedCitation.set(this.createEmptyCitation(scheme.id));

          // update last step
          this.lastStep.setValue(scheme.path[scheme.path.length - 1] || null);
          this.lastStepIndex.set(scheme.path.length - 1);
        })
    );

    // when last step changes, update last step index
    this._subs.push(
      this.lastStep.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(100))
        .subscribe((s) => {
          if (!this._schemeService || !this.scheme.value) {
            return;
          }

          this.lastStepIndex.set(this.scheme.value.path.indexOf(s || ''));
          // truncate or extend citation steps according to last step index
          const cit = this.editedCitation();
          if (!cit) {
            return;
          }
          const newCit: Citation = {
            schemeId: cit.schemeId,
            steps: cit.steps.slice(0, this.lastStepIndex() + 1),
          };
          for (let i = cit.steps.length; i <= this.lastStepIndex(); i++) {
            newCit.steps.push({
              stepId: this.scheme.value.path[i],
              format: this.scheme.value.steps[this.scheme.value.path[i]].format,
              color: this.scheme.value.steps[this.scheme.value.path[i]].color,
              value: '',
            });
          }
          this.editedCitation.set(newCit);
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
    if (!this._schemeService || !this.scheme.value) {
      return;
    }

    // if was toggled off, parse text into citation
    if (!on) {
      if (this.text.value) {
        const cit = this._schemeService.parse(
          this.text.value,
          this.scheme.value.id
        );
        if (cit?.steps?.length) {
          this.editedCitation.set(cit);
          this.validateCitation(cit);
          this.freeMode.set(false);
        } else {
          return;
        }
      }
    } else {
      // if was toggled on, render citation into string
      this.editedStep.set(undefined);
      this.freeMode.set(true);
      if (this.editedCitation()) {
        this.text.setValue(
          this._schemeService.toString(this.editedCitation()!)
        );
        setTimeout(() => {
          this.freeInput?.nativeElement.focus();
        }, 100);
      }
    }
  }

  public closeFreeMode(): void {
    this.freeMode.set(false);
  }

  //#region Step editing
  public editStep(step: CitStep | null): void {
    if (!step || !this.scheme.value || !this._schemeService) {
      this.editedStep.set(undefined);
      return;
    }

    console.log('edit step', step);
    this.editedStep.set(step);

    // set edit mode according to step type
    const stepDef = this.scheme.value.steps[step.stepId];
    const stepDomain = this._schemeService.getStepDomain(
      step.stepId,
      this.editedCitation(),
      this.scheme.value.id
    );

    if (!stepDomain) {
      this.editedStep.set(undefined);
      return;
    }

    switch (stepDef?.type) {
      case 'set':
        // closed set of strings
        this.setEditorItems.set(stepDomain.set!);
        this.stepEditMode.set('set');
        this.setEditorItem.setValue(step.value);
        // focus
        this._focusHelper.focusElement({
          target: 'set-field',
          maxAttempts: 5,
        });
        break;

      case 'numeric':
        // numeric with min/max and optional suffix
        this.stepEditMode.set('number');
        const validators = [Validators.required];
        if (stepDef.domain.range) {
          let n = stepDomain.range?.min;
          this.minNrValue.set(n !== undefined && n !== null ? n : undefined);
          if (this.minNrValue() !== undefined) {
            validators.push(Validators.min(this.minNrValue()!));
          }
          n = stepDomain.range?.max;
          this.maxNrValue.set(n !== undefined && n !== null ? n : undefined);
          if (this.maxNrValue() !== undefined) {
            validators.push(Validators.max(this.maxNrValue()!));
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
        this.hasSuffix.set(!!stepDef.suffixPattern);
        // focus
        this._focusHelper.focusElement({
          target: 'nr-field',
          maxAttempts: 5,
        });
        break;

      case 'masked':
        // masked string
        this.stepEditMode.set('masked');
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
        this.stepEditMode.set('string');
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
    if (!this.editedStep() || this.setEditorForm.invalid) {
      return;
    }

    // create new citation object (don't mutate existing)
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: this.scheme.value.id,
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])], // clone steps array
    };

    // get the index of the step to update
    const index = this.scheme.value.path.indexOf(this.editedStep()!.stepId);
    if (index === -1) {
      return;
    }

    // create new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value: this.setEditorItem.value!,
      n: 1 + this.setEditorItems().indexOf(this.setEditorItem.value!),
    };
    // this.editedStep.set(newStep);

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.setEditorItem.reset();
  }

  public saveNumberStep(): void {
    if (
      !this.editedStep() ||
      this.nrEditorForm.invalid ||
      !this._schemeService
    ) {
      return;
    }

    // update step value in a new citation object
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: this.scheme.value?.id || '',
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])],
    };

    // get the index of the step to update
    const index =
      this.scheme.value?.path.indexOf(this.editedStep()!.stepId) ?? -1;
    if (index === -1) {
      return;
    }

    // format value if needed
    const format = cit.steps[index]?.format;
    let value: string;
    if (format) {
      const formatter = this._schemeService.getFormatter(format);
      value =
        formatter?.format(this.nrEditorValue.value) ||
        this.nrEditorValue.value.toString();
    } else {
      value = this.nrEditorValue.value.toString();
    }

    // create a new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value,
      n: this.nrEditorValue.value,
      suffix: this.nrEditorSuffix.value || undefined,
    };
    // this.editedStep.set(newStep);

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.nrEditorValue.reset();
    this.nrEditorSuffix.reset();
  }

  public saveStringStep(): void {
    if (
      !this.editedStep() ||
      this.strEditorForm.invalid ||
      !this.scheme.value
    ) {
      return;
    }

    // create new citation object
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: this.scheme.value.id,
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])],
    };

    // get the index of the step to update
    const index = this.scheme.value.path.indexOf(this.editedStep()!.stepId);
    if (index === -1) {
      return;
    }

    // create a new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value: this.strEditorValue.value || '',
    };
    // this.editedStep.set(newStep);

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.strEditorValue.reset();
  }
  //#endregion

  //#region Validation
  public validateCitation(citation?: Citation): boolean {
    if (!this._schemeService || !this.scheme.value) {
      return false;
    }

    const errors: { [key: string]: string } = {};

    if (!citation?.steps.length) {
      errors[''] = 'No citation';
      this.errors.set(errors);
      return false;
    }

    for (let i = 0; i <= this.lastStepIndex(); i++) {
      const step = citation.steps[i];
      if (!step) {
        break;
      }
      const domain = this._schemeService.getStepDomain(
        step.stepId,
        citation,
        this.scheme.value.id
      );

      if (!domain) {
        continue;
      }

      // compare citation value with domain and return false if not valid
      if (domain.set?.length) {
        if (!domain.set.includes(step.value)) {
          errors[step.stepId] = `Invalid set value: ${step.value}`;
          this.errors.set(errors);
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
          this.errors.set(errors);
          return false;
        }
        if (
          domain.range.max !== undefined &&
          domain.range.max !== null &&
          n > domain.range.max
        ) {
          errors[step.stepId] = `Value above max: ${step.stepId}`;
          this.errors.set(errors);
          return false;
        }
        if (
          domain.suffix &&
          !new RegExp(domain.suffix).test(step.suffix || '')
        ) {
          errors[step.stepId] = `Invalid suffix: ${step.stepId}`;
          this.errors.set(errors);
          return false;
        }
      } else if (domain.mask) {
        if (!new RegExp(domain.mask).test(step.value)) {
          errors[step.stepId] = `Invalid string: ${step.stepId}`;
          this.errors.set(errors);
          return false;
        }
      }
    }

    this.errors.set(errors);
    return true;
  }
  //#endregion

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    if (!this._schemeService || !this.validateCitation(this.editedCitation())) {
      return;
    }
    this.citation.set(deepCopy(this.editedCitation!()));
  }
}
