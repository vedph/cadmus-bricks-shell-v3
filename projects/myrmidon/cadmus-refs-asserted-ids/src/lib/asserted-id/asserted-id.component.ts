import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

// bricks
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

// cadmus
import { IndexLookupDefinitions, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

// local
import { PinRefLookupService } from '../services/pin-ref-lookup.service';
import { ScopedPinLookupComponent } from '../scoped-pin-lookup/scoped-pin-lookup.component';

/**
 * An asserted ID.
 */
export interface AssertedId {
  tag?: string;
  value: string;
  label?: string;
  scope: string;
  assertion?: Assertion;
}

/**
 * Asserted ID editor component.
 */
@Component({
  selector: 'cadmus-refs-asserted-id',
  templateUrl: './asserted-id.component.html',
  styleUrls: ['./asserted-id.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    // material
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    // bricks
    AssertionComponent,
    ScopedPinLookupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedIdComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updatingForm: boolean | undefined;

  public tag: FormControl<string | null>;
  public value: FormControl<string | null>;
  public label: FormControl<string | null>;
  public scope: FormControl<string | null>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

  public readonly lookupExpanded = signal<boolean>(false);

  // asserted-id-scopes
  public readonly idScopeEntries = input<ThesaurusEntry[]>();
  // asserted-id-tags
  public readonly idTagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  /**
   * The asserted ID being edited.
   */
  public readonly id = model<AssertedId>();

  /**
   * True to hide the pin-based EID lookup UI.
   */
  public readonly noEidLookup = input<boolean>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * True to show the submit button.
   */
  public readonly hasSubmit = input<boolean>();

  /**
   * Emitted when the editor is closed.
   */
  public readonly editorClose = output();

  constructor(
    formBuilder: FormBuilder,
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions
  ) {
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.value = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(500),
    ]);
    this.label = formBuilder.control(null, Validators.maxLength(500));
    this.scope = formBuilder.control(null, Validators.maxLength(500));
    this.assertion = formBuilder.control(null);
    this.form = formBuilder.group({
      tag: this.tag,
      value: this.value,
      label: this.label,
      scope: this.scope,
      assertion: this.assertion,
    });

    // when id changes, update form
    effect(() => {
      this.updateForm(this.id());
    });
  }

  public ngOnInit(): void {
    this._sub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe((_) => {
        if (!this._updatingForm) {
          this.emitIdChange();
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
  }

  public onIdPick(id: string): void {
    this.value.setValue(id);
    this.value.markAsDirty();
    this.value.updateValueAndValidity();
    this.lookupExpanded.set(false);
  }

  private updateForm(value: AssertedId | undefined): void {
    this._updatingForm = true;
    if (!value) {
      this.form.reset();
    } else {
      this.tag.setValue(value.tag || null);
      this.value.setValue(value.value);
      this.label.setValue(value.label || null);
      this.scope.setValue(value.scope);
      this.assertion.setValue(value.assertion || null);
      this.form.markAsPristine();
    }
    this._updatingForm = false;
  }

  private getId(): AssertedId {
    return {
      tag: this.tag.value?.trim(),
      value: this.value.value?.trim() || '',
      label: this.label.value?.trim() || undefined,
      scope: this.scope.value?.trim() || '',
      assertion: this.assertion.value || undefined,
    };
  }

  public emitIdChange(): void {
    if (!this.hasSubmit()) {
      this.id.set(this.getId());
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.valid) {
      this.id.set(this.getId());
    }
  }
}
