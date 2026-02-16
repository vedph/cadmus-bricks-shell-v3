import { ChangeDetectionStrategy, Component, effect, input, model } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

import { AssertedHistoricalDate } from './asserted-historical-date';

import { HistoricalDateComponent } from '../historical-date/historical-date.component';
import { HistoricalDateModel } from '../historical-date/historical-date';
import { debounceTime, filter } from 'rxjs';

/**
 * Dumb editor component for a single asserted historical date.
 * Thesauri: asserted-historical-dates-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags.
 */
@Component({
  selector: 'cadmus-refs-asserted-historical-date',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // bricks
    HistoricalDateComponent,
    AssertionComponent,
  ],
  templateUrl: './asserted-historical-date.component.html',
  styleUrl: './asserted-historical-date.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedHistoricalDateComponent {
  private _updatingForm = false;

  /**
   * The date model to edit. The corresponding dateChange event
   * is fired whenever data changes in the form.
   */
  public readonly date = model<AssertedHistoricalDate>();

  public tag: FormControl<string | null>;
  public hd: FormControl<HistoricalDateModel | null>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

  // asserted-historical-dates-tags
  public tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assertionTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public docReferenceTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public docReferenceTagEntries = input<ThesaurusEntry[]>();

  constructor(formBuilder: FormBuilder) {
    // form
    this.tag = formBuilder.control(null);
    this.hd = formBuilder.control(null, Validators.required);
    this.assertion = formBuilder.control(null);

    this.form = formBuilder.group({
      tag: this.tag,
      hd: this.hd,
      assertion: this.assertion,
    });

    // when model changes, update form
    effect(() => {
      const date = this.date();
      this.updateForm(date);
    });

    // autosave on form changes
    this.form.valueChanges
      .pipe(
        // react only on user changes, when form is valid
        filter(() => !this._updatingForm && this.form.valid),
        debounceTime(500),
        takeUntilDestroyed(),
      )
      .subscribe((values) => {
        this.save();
      });
  }

  private updateForm(date: AssertedHistoricalDate | undefined | null): void {
    this._updatingForm = true;

    if (!date) {
      this.form.reset(undefined, { emitEvent: false });
    } else {
      this.tag.setValue(date.tag || null, { emitEvent: false });
      this.hd.setValue(date ? { a: date.a, b: date.b } : null, {
        emitEvent: false,
      });
      this.assertion.setValue(date.assertion || null, { emitEvent: false });

      this.form.markAsPristine();
    }

    this._updatingForm = false;
  }

  private getDate(): AssertedHistoricalDate {
    return {
      tag: this.tag.value || undefined,
      a: this.hd.value!.a || undefined,
      b: this.hd.value?.b || undefined,
      assertion: this.assertion.value || undefined,
    };
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
    this.assertion.updateValueAndValidity();
    this.assertion.markAsDirty();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.hd.setValue(date || null);
    this.hd.updateValueAndValidity();
    this.hd.markAsDirty();
  }

  private save(): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }
    const date = this.getDate();
    this.date.set(date);
  }
}
