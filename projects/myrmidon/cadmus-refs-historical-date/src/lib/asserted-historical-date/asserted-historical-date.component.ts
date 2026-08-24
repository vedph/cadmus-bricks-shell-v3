import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import {
  FieldTree,
  FormField,
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
/** Map a bound asserted date to the editable draft shape. */
function toControls(
  date: AssertedHistoricalDate | undefined | null,
): AssertedDateControls {
  return !date
    ? { tag: '', hd: null, assertion: null }
    : {
        tag: date.tag || '',
        hd: { a: date.a, b: date.b },
        assertion: date.assertion || null,
      };
}

@Component({
  selector: 'cadmus-refs-asserted-historical-date',
  imports: [
    FormField,
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

  /**
   * The editable draft, derived from `date` but writable in place.
   * `previous` tells an external change apart from the echo of our own
   * save: when the incoming date is just what the current draft maps to,
   * the draft is already up to date and keeping it preserves in-progress
   * edits that the mapping normalizes away.
   */
  private readonly _draft = linkedSignal<
    AssertedHistoricalDate | undefined,
    AssertedDateControls
  >({
    source: () => this.date(),
    computation: (date, previous) =>
      previous &&
      date &&
      previous.value.hd &&
      this.datesEqual(this.toDate(previous.value), date)
        ? previous.value
        : toControls(date),
  });

  public readonly form: FieldTree<AssertedDateControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      required(path.hd);
    });

    // the draft mirrors the bound date again: no unsaved edits, so clear
    // the interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (JSON.stringify(draft) === JSON.stringify(toControls(this.date()))) {
          this.form().reset();
        }
      });
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

  /** Map the draft back to an asserted date. */
  private toDate(v: AssertedDateControls): AssertedHistoricalDate {
    return {
      tag: v.tag || undefined,
      a: v.hd!.a || undefined,
      b: v.hd?.b || undefined,
      assertion: v.assertion || undefined,
    };
  }

  private getDate(): AssertedHistoricalDate {
    return this.toDate(this._draft());
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
      this.date.set(next);
    }
  }

}
