import { ChangeDetectionStrategy, Component, effect, input, model, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  FormRoot,
  form,
  required,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

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
import { debounceTime } from 'rxjs';

/**
 * The editable controls backing an asserted historical date.
 */
interface AssertedDateControls {
  tag: string;
  hd: HistoricalDateModel | null;
  assertion: Assertion | null;
}

/**
 * Dumb editor component for a single asserted historical date.
 * Thesauri: asserted-historical-dates-tags, assertion-tags,
 * doc-reference-types, doc-reference-tags.
 */
@Component({
  selector: 'cadmus-refs-asserted-historical-date',
  imports: [
    FormField,
    FormRoot,
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
  // set synchronously at the point save() writes `date` (not inside the
  // effect below), paired with _hasLastDate since undefined is both "never
  // saved yet" and a legitimate real value - see signal-forms-migration.md
  private _lastDate: AssertedHistoricalDate | undefined | null = undefined;
  private _hasLastDate = false;

  /**
   * The date model to edit. The corresponding dateChange event
   * is fired whenever data changes in the form.
   */
  public readonly date = model<AssertedHistoricalDate>();

  // asserted-historical-dates-tags
  public tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assertionTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public docReferenceTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public docReferenceTagEntries = input<ThesaurusEntry[]>();

  private readonly _draft = signal<AssertedDateControls>({
    tag: '',
    hd: null,
    assertion: null,
  });
  public readonly form: FieldTree<AssertedDateControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      required(path.hd);
    });

    // when model changes, update form
    effect(() => {
      const date = this.date();
      if (this._hasLastDate && this._lastDate === date) {
        return;
      }
      this._lastDate = date;
      this._hasLastDate = true;
      this.updateForm(date);
    });

    // autosave on form changes
    toObservable(this._draft)
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe(() => {
        if (this.form().valid()) {
          this.save();
        }
      });
  }

  private updateForm(date: AssertedHistoricalDate | undefined | null): void {
    if (!date) {
      this._draft.set({ tag: '', hd: null, assertion: null });
    } else {
      this._draft.set({
        tag: date.tag || '',
        hd: date ? { a: date.a, b: date.b } : null,
        assertion: date.assertion || null,
      });
    }
    this.form().reset();
  }

  private getDate(): AssertedHistoricalDate {
    const v = this._draft();
    return {
      tag: v.tag || undefined,
      a: v.hd!.a || undefined,
      b: v.hd?.b || undefined,
      assertion: v.assertion || undefined,
    };
  }

  private datesEqual(
    a: AssertedHistoricalDate,
    b?: AssertedHistoricalDate,
  ): boolean {
    if (!b) {
      return false;
    }
    return (
      a.tag === b.tag &&
      JSON.stringify(a.assertion) === JSON.stringify(b.assertion) &&
      JSON.stringify(a.a) === JSON.stringify(b.a) &&
      JSON.stringify(a.b) === JSON.stringify(b.b)
    );
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.form.assertion().value.set(assertion || null);
    this.form.assertion().markAsDirty();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.form.hd().value.set(date || null);
    this.form.hd().markAsDirty();
  }

  private save(): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }
    const next = this.getDate();
    if (!this.datesEqual(next, this.date())) {
      this._lastDate = next;
      this._hasLastDate = true;
      this.date.set(next);
    }
  }

}
