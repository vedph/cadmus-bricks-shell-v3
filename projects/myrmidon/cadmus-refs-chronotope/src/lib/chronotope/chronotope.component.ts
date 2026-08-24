import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import { FieldTree, FormField, form, maxLength } from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  HistoricalDateComponent,
  HistoricalDateModel,
} from '@myrmidon/cadmus-refs-historical-date';

/**
 * Chronotopic coordinates: a place with a date.
 */
export interface Chronotope {
  tag?: string;
  place?: string;
  date?: HistoricalDateModel;
}

interface ChronotopeControls {
  tag: string;
  place: string;
  date: HistoricalDateModel | null;
  hasDate: boolean;
}

function makeDefaultControls(): ChronotopeControls {
  return {
    tag: '',
    place: '',
    date: null,
    hasDate: false,
  };
}

/**
 * Chronotope editor.
 */
@Component({
  selector: 'cadmus-refs-chronotope',
  templateUrl: './chronotope.component.html',
  styleUrls: ['./chronotope.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    HistoricalDateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChronotopeComponent {
  // set synchronously at the point save() writes `chronotope` (not inside
  // the effect below), paired with _hasLastChronotope since undefined is
  // both "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md for why this must live at the write site.
  private _lastChronotope: Chronotope | undefined = undefined;
  private _hasLastChronotope = false;

  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<Chronotope>();

  // chronotope-tags
  public readonly ctTagEntries = input<ThesaurusEntry[]>();

  private readonly _draft = signal<ChronotopeControls>(makeDefaultControls());
  public readonly form: FieldTree<ChronotopeControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      maxLength(path.tag, 50);
      maxLength(path.place, 50);
    });

    // when chronotope changes, update form
    effect(() => {
      const chronotope = this.chronotope();
      if (this._hasLastChronotope && this._lastChronotope === chronotope) {
        return;
      }
      this._lastChronotope = chronotope;
      this._hasLastChronotope = true;
      this.updateForm(chronotope);
    });

    // autosave: only when form is valid and, if hasDate is true, date is set
    toObservable(this._draft)
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe(() => {
        const value = this._draft();
        if (this.form().invalid() || (value.hasDate && !value.date)) {
          return;
        }
        const next = this.getChronotope();
        if (!this.chronotopesEqual(next, this.chronotope())) {
          this._lastChronotope = next;
          this._hasLastChronotope = true;
          this.chronotope.set(next);
        }
      });
  }

  private chronotopesEqual(a: Chronotope, b?: Chronotope): boolean {
    if (!b) {
      return false;
    }
    return (
      a.tag === b.tag &&
      a.place === b.place &&
      JSON.stringify(a.date) === JSON.stringify(b.date)
    );
  }

  private updateForm(chronotope: Chronotope | undefined): void {
    if (!chronotope) {
      this._draft.set(makeDefaultControls());
    } else {
      this._draft.set({
        tag: chronotope.tag || '',
        place: chronotope.place || '',
        date: chronotope.date || null,
        hasDate: chronotope.date ? true : false,
      });
    }
    this.form().reset();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.form.date().value.set(date || null);
  }

  private getChronotope(): Chronotope {
    const v = this._draft();
    return {
      tag: v.tag.trim() || undefined,
      place: v.place.trim() || undefined,
      date: v.hasDate && v.date ? v.date : undefined,
    };
  }

  public save(pristine = true): void {
    const value = this._draft();
    if (this.form().invalid() || (value.hasDate && !value.date)) {
      this.form().markAsTouched();
      return;
    }
    const chronotope = this.getChronotope();
    this._lastChronotope = chronotope;
    this._hasLastChronotope = true;
    this.chronotope.set(chronotope);
    if (pristine) {
      this.form().reset();
    }
  }

  public onFormSubmit(event: Event): void {
    event.preventDefault();
  }
}
