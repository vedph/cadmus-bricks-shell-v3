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
  maxLength,
} from '@angular/forms/signals';
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

/** Map a bound chronotope to the editable draft shape. */
function toControls(chronotope: Chronotope | undefined): ChronotopeControls {
  return !chronotope
    ? makeDefaultControls()
    : {
        tag: chronotope.tag || '',
        place: chronotope.place || '',
        date: chronotope.date || null,
        hasDate: chronotope.date ? true : false,
      };
}

/** Map the draft back to a chronotope. */
function toChronotope(v: ChronotopeControls): Chronotope {
  return {
    tag: v.tag.trim() || undefined,
    place: v.place.trim() || undefined,
    date: v.hasDate && v.date ? v.date : undefined,
  };
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
  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<Chronotope>();

  // chronotope-tags
  public readonly ctTagEntries = input<ThesaurusEntry[]>();

  /**
   * The editable draft, derived from `chronotope` but writable in place.
   * `previous` tells an external change apart from the echo of our own save:
   * when the incoming chronotope is just what the current draft maps to,
   * the draft is already up to date and keeping it preserves in-progress
   * edits that saving normalizes away (whitespace still being typed).
   */
  private readonly _draft = linkedSignal<
    Chronotope | undefined,
    ChronotopeControls
  >({
    source: () => this.chronotope(),
    computation: (chronotope, previous) =>
      previous &&
      chronotope &&
      this.chronotopesEqual(toChronotope(previous.value), chronotope)
        ? previous.value
        : toControls(chronotope),
  });

  public readonly form: FieldTree<ChronotopeControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      maxLength(path.tag, 50);
      maxLength(path.place, 50);
    });

    // the draft mirrors the bound chronotope again: no unsaved edits, so
    // clear the interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (
          JSON.stringify(draft) === JSON.stringify(toControls(this.chronotope()))
        ) {
          this.form().reset();
        }
      });
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

  public onDateChange(date?: HistoricalDateModel): void {
    this.form.date().value.set(date || null);
  }

  private getChronotope(): Chronotope {
    return toChronotope(this._draft());
  }

  public save(pristine = true): void {
    const value = this._draft();
    if (this.form().invalid() || (value.hasDate && !value.date)) {
      this.form().markAsTouched();
      return;
    }
    this.chronotope.set(this.getChronotope());
    if (pristine) {
      this.form().reset();
    }
  }

}
