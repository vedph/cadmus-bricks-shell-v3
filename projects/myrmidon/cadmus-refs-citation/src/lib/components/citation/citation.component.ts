import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Injector,
  model,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  form,
  maxLength,
  max,
  min,
  pattern,
  required,
} from '@angular/forms/signals';

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
 * The scheme + last-step controls.
 */
interface SchemeControls {
  scheme: CitScheme;
  lastStep: string | null;
}

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
    FormField,
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
  private readonly _injector = inject(Injector);
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

  public readonly lastStepIndex = signal<number>(0);

  /**
   * The free text input.
   */
  public readonly freeMode = signal<boolean>(false);

  public readonly editedStep = signal<CitStep | undefined>(undefined);
  public readonly stepEditMode = signal<StepEditMode>('string');
  // set-editor state
  public readonly setEditorItems = signal<string[]>([]);
  // number-editor state
  public readonly minNrValue = signal<number | undefined>(undefined);
  public readonly maxNrValue = signal<number | undefined>(undefined);
  public readonly hasSuffix = signal<boolean | undefined>(undefined);
  private readonly _suffixPattern = signal<RegExp | undefined>(undefined);
  // masked-string editor state
  private readonly _maskPattern = signal<RegExp | undefined>(undefined);

  public readonly editedCitation = signal<Citation | undefined>(undefined);
  public readonly errors = signal<{ [key: string]: string }>({});

  // #region Forms
  private readonly _schemeDraft: WritableSignal<SchemeControls>;
  public readonly schemeForm: FieldTree<SchemeControls>;

  private readonly _textDraft = signal({ text: '' });
  public readonly textForm: FieldTree<{ text: string }>;

  private readonly _setDraft = signal<{ item: string | null }>({
    item: null,
  });
  public readonly setEditorForm: FieldTree<{ item: string | null }>;

  private readonly _nrDraft = signal({ value: 0, suffix: '' });
  public readonly nrEditorForm: FieldTree<{ value: number; suffix: string }>;

  private readonly _strDraft = signal({ value: '' });
  public readonly strEditorForm: FieldTree<{ value: string }>;
  // #endregion

  constructor(
    private _schemeService: CitSchemeService,
    private _zone: NgZone,
  ) {
    // focus helper
    this._focusHelper = new DynamicFocus(this._zone);

    // check if service is available and has schemes
    const availableSchemes = this._schemeService ? this.schemes() : [];
    const defaultScheme =
      availableSchemes.length > 0 ? availableSchemes[0] : null;

    this._schemeDraft = signal<SchemeControls>({
      scheme: defaultScheme as CitScheme,
      lastStep: null,
    });
    this.schemeForm = form(this._schemeDraft);
    this.lastStepIndex.set(defaultScheme ? defaultScheme.path.length - 1 : 0);

    this.textForm = form(this._textDraft, (path) => {
      required(path.text);
      maxLength(path.text, 100);
    });
    this.setEditorForm = form(this._setDraft, (path) => {
      required(path.item);
    });
    this.nrEditorForm = form(this._nrDraft, (path) => {
      required(path.value);
      min(path.value, () => this.minNrValue());
      max(path.value, () => this.maxNrValue());
      pattern(path.suffix, () => this._suffixPattern());
    });
    this.strEditorForm = form(this._strDraft, (path) => {
      required(path.value);
      pattern(path.value, () => this._maskPattern());
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
        this.textForm.text().value.set('');

        if (citation?.steps?.length) {
          // create a deep copy to work with internally
          const citationCopy = deepCopy(citation);
          this.editedCitation.set(citationCopy);

          // update scheme to match the citation's scheme (only if different)
          const targetScheme = this._schemeService.getScheme(citation.schemeId);
          if (
            targetScheme &&
            targetScheme.id !== this.schemeForm.scheme().value()?.id
          ) {
            this._updatingSchemeFromCitation = true;
            this._schemeDraft.set({
              scheme: targetScheme,
              lastStep: targetScheme.path[targetScheme.path.length - 1] || null,
            });
            this.lastStepIndex.set(targetScheme.path.length - 1);
          }
        } else {
          // create empty citation with current scheme
          this.editedCitation.set(
            this.createEmptyCitation(this.schemeForm.scheme().value()?.id),
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
      schemeId || this.schemeForm.scheme().value()?.id || '',
      -1,
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
      toObservable(this.schemeForm.scheme().value, { injector: this._injector })
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
          this.textForm.text().value.set('');

          // create new empty citation with the new scheme
          this.editedCitation.set(this.createEmptyCitation(scheme.id));

          // update last step
          this.schemeForm
            .lastStep()
            .value.set(scheme.path[scheme.path.length - 1] || null);
          this.lastStepIndex.set(scheme.path.length - 1);
        }),
    );

    // when last step changes, update last step index
    this._subs.push(
      toObservable(this.schemeForm.lastStep().value, { injector: this._injector })
        .pipe(distinctUntilChanged(), debounceTime(100))
        .subscribe((s) => {
          const scheme = this.schemeForm.scheme().value();
          if (!this._schemeService || !scheme) {
            return;
          }

          this.lastStepIndex.set(scheme.path.indexOf(s || ''));
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
              stepId: scheme.path[i],
              format: scheme.steps[scheme.path[i]].format,
              color: scheme.steps[scheme.path[i]].color,
              value: '',
            });
          }
          this.editedCitation.set(newCit);
          this.validateCitation(newCit);
        }),
    );
  }

  public ngOnDestroy(): void {
    // clean up any pending focus operations
    this._focusHelper.cancelAllFocus();
    // clean up subscriptions
    this._subs.forEach((s) => s.unsubscribe());
  }

  public setFreeMode(on: boolean): void {
    const scheme = this.schemeForm.scheme().value();
    if (!this._schemeService || !scheme) {
      return;
    }

    // if was toggled off, parse text into citation
    if (!on) {
      const text = this.textForm.text().value();
      if (text) {
        const cit = this._schemeService.parse(text, scheme.id);
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
        this.textForm
          .text()
          .value.set(this._schemeService.toString(this.editedCitation()!));
        setTimeout(() => {
          this.freeInput?.nativeElement.focus();
        }, 100);
      }
    }
  }

  public closeFreeMode(): void {
    this.freeMode.set(false);
  }

  public onFreeFormSubmit(event: Event): void {
    event.preventDefault();
    this.setFreeMode(false);
  }

  public onSetFormSubmit(event: Event): void {
    event.preventDefault();
    this.saveSetStep();
  }

  public onNumberFormSubmit(event: Event): void {
    event.preventDefault();
    this.saveNumberStep();
  }

  public onStringFormSubmit(event: Event): void {
    event.preventDefault();
    this.saveStringStep();
  }

  //#region Step editing
  public editStep(step: CitStep | null): void {
    const scheme = this.schemeForm.scheme().value();
    if (!step || !scheme || !this._schemeService) {
      this.editedStep.set(undefined);
      return;
    }

    console.log('edit step', step);
    this.editedStep.set(step);

    // set edit mode according to step type
    const stepDef = scheme.steps[step.stepId];
    const stepDomain = this._schemeService.getStepDomain(
      step.stepId,
      this.editedCitation(),
      scheme.id,
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
        this.setEditorForm.item().value.set(step.value);
        // focus
        this._focusHelper.focusElement({
          target: 'set-field',
          maxAttempts: 5,
        });
        break;

      case 'numeric':
        // numeric with min/max and optional suffix
        this.stepEditMode.set('number');
        if (stepDef.domain.range) {
          let n = stepDomain.range?.min;
          this.minNrValue.set(n !== undefined && n !== null ? n : undefined);
          n = stepDomain.range?.max;
          this.maxNrValue.set(n !== undefined && n !== null ? n : undefined);
        } else {
          this.minNrValue.set(undefined);
          this.maxNrValue.set(undefined);
        }
        this.nrEditorForm.value().value.set(step.n!);

        // if there is a suffix validation pattern, apply it to the suffix
        // field; else, remove any existing pattern constraint from it
        this._suffixPattern.set(
          stepDef.suffixValidPattern
            ? new RegExp(stepDef.suffixValidPattern)
            : undefined,
        );
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
        this._maskPattern.set(new RegExp(stepDef.maskPattern!));
        this.strEditorForm.value().value.set(step.value);
        // focus
        this._focusHelper.focusElement({
          target: 'str-field',
          maxAttempts: 5,
        });
        break;

      default:
        // free string
        this.stepEditMode.set('string');
        this._maskPattern.set(undefined);
        this.strEditorForm.value().value.set(step.value);
        // focus
        this._focusHelper.focusElement({
          target: 'str-field',
          maxAttempts: 5,
        });
        break;
    }
  }

  public saveSetStep(): void {
    const scheme = this.schemeForm.scheme().value();
    if (!this.editedStep() || this.setEditorForm().invalid() || !scheme) {
      return;
    }

    // create new citation object (don't mutate existing)
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: scheme.id,
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])], // clone steps array
    };

    // get the index of the step to update
    const index = scheme.path.indexOf(this.editedStep()!.stepId);
    if (index === -1) {
      return;
    }

    const itemValue = this.setEditorForm.item().value()!;

    // create new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value: itemValue,
      n: 1 + this.setEditorItems().indexOf(itemValue),
    };

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.setEditorForm.item().value.set(null);
  }

  public saveNumberStep(): void {
    if (
      !this.editedStep() ||
      this.nrEditorForm().invalid() ||
      !this._schemeService
    ) {
      return;
    }
    const scheme = this.schemeForm.scheme().value();

    // update step value in a new citation object
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: scheme?.id || '',
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])],
    };

    // get the index of the step to update
    const index = scheme?.path.indexOf(this.editedStep()!.stepId) ?? -1;
    if (index === -1) {
      return;
    }

    const nrValue = this.nrEditorForm.value().value();
    const suffixValue = this.nrEditorForm.suffix().value();

    // format value if needed
    const format = cit.steps[index]?.format;
    let value: string;
    if (format) {
      const formatter = this._schemeService.getFormatter(format);
      value = formatter?.format(nrValue) || nrValue.toString();
    } else {
      value = nrValue.toString();
    }

    // create a new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value,
      n: nrValue,
      suffix: suffixValue || undefined,
    };

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.nrEditorForm.value().value.set(0);
    this.nrEditorForm.suffix().value.set('');
  }

  public saveStringStep(): void {
    const scheme = this.schemeForm.scheme().value();
    if (!this.editedStep() || this.strEditorForm().invalid() || !scheme) {
      return;
    }

    // create new citation object
    const cit: Citation = {
      ...(this.editedCitation() || {
        schemeId: scheme.id,
        steps: [],
      }),
      steps: [...(this.editedCitation()?.steps || [])],
    };

    // get the index of the step to update
    const index = scheme.path.indexOf(this.editedStep()!.stepId);
    if (index === -1) {
      return;
    }

    // create a new step object
    const newStep: CitStep = {
      ...this.editedStep()!,
      value: this.strEditorForm.value().value() || '',
    };

    // update cloned citation's step
    cit.steps[index] = newStep;

    // commit changes
    this.editedCitation.set(cit);
    this.editedStep.set(undefined);
    this.validateCitation(cit);

    // reset editor
    this.strEditorForm.value().value.set('');
  }
  //#endregion

  //#region Validation
  public validateCitation(citation?: Citation): boolean {
    const scheme = this.schemeForm.scheme().value();
    if (!this._schemeService || !scheme) {
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
        scheme.id,
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
