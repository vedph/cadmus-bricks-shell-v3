import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

/**
 * Chronotope editor.
 */
@Component({
  selector: 'cadmus-refs-chronotope',
  templateUrl: './chronotope.component.html',
  styleUrls: ['./chronotope.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
  private _updatingForm = false;

  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<Chronotope>();

  // chronotope-tags
  public readonly ctTagEntries = input<ThesaurusEntry[]>();

  public tag: FormControl<string | null>;
  public place: FormControl<string | null>;
  public date: FormControl<HistoricalDateModel | null>;
  public hasDate: FormControl<boolean>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.place = formBuilder.control(null, Validators.maxLength(50));
    this.date = formBuilder.control(null);
    this.hasDate = formBuilder.control(false, { nonNullable: true });
    this.form = formBuilder.group({
      tag: this.tag,
      place: this.place,
      date: this.date,
      hasDate: this.hasDate,
    });

    // when chronotope changes, update form
    effect(() => {
      const chronotope = this.chronotope();
      this.updateForm(chronotope);
    });

    // autosave
    this.form.valueChanges
      .pipe(
        filter(() => {
          // only save if form is valid and, if hasDate is true, date is set
          const values = this.form.getRawValue();
          return (
            !this._updatingForm &&
            this.form.valid &&
            (!values.hasDate || !!values.date)
          );
        }),
        debounceTime(500),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.save();
      });
  }

  private updateForm(chronotope: Chronotope | undefined): void {
    this._updatingForm = true;

    if (!chronotope) {
      this.form.reset();
    } else {
      this.tag.setValue(chronotope.tag || null, { emitEvent: false });
      this.place.setValue(chronotope.place || null, { emitEvent: false });
      this.date.setValue(chronotope.date || null, { emitEvent: false });
      this.hasDate.setValue(chronotope.date ? true : false, {
        emitEvent: false,
      });
      this.form.markAsPristine();
    }

    this._updatingForm = false;
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.date.setValue(date || null);
    this.date.updateValueAndValidity();
    // this.save();
  }

  private getChronotope(): Chronotope {
    return {
      tag: this.tag.value?.trim(),
      place: this.place.value?.trim(),
      date: this.hasDate.value && this.date.value ? this.date.value : undefined,
    };
  }

  public save(pristine = true): void {
    if (this.form.invalid || (this.hasDate.value && !this.date.value)) {
      this.form.markAllAsTouched();
      return;
    }
    this.chronotope.set(this.getChronotope());
    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
