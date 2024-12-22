import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import {
  HistoricalDateComponent,
  HistoricalDateModel,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
import { debounceTime, distinctUntilChanged, merge, Subscription } from 'rxjs';

/**
 * A place with an optional assertion.
 */
export interface AssertedPlace {
  tag?: string;
  value: string;
  assertion?: Assertion;
}

/**
 * A date with an optional assertion.
 */
export interface AssertedDate extends HistoricalDateModel {
  tag?: string;
  assertion?: Assertion;
}

/**
 * Asserted chronotope: a place with an optional assertion, and/or a date with an
 * optional assertion.
 */
export interface AssertedChronotope {
  place?: AssertedPlace;
  date?: AssertedDate;
}

/**
 * Asserted chronotope editor.
 */
@Component({
  selector: 'cadmus-refs-asserted-chronotope',
  templateUrl: './asserted-chronotope.component.html',
  styleUrls: ['./asserted-chronotope.component.css'],
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
    AssertionComponent,
    HistoricalDateComponent,
    HistoricalDatePipe,
  ],
})
export class AssertedChronotopeComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _dropNextInput?: boolean;

  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<AssertedChronotope>();

  // chronotope-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // assertion-tags
  public assTagEntries = input<ThesaurusEntry[]>();

  // doc-reference-types
  public refTypeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public refTagEntries = input<ThesaurusEntry[]>();

  // place
  public placeExpanded = false;
  public hasPlace: FormControl<boolean>;
  public plTag: FormControl<string | null>;
  public plAssertion: FormControl<Assertion | null>;
  public place: FormControl<string | null>;
  public plForm: FormGroup;

  // date
  public dateExpanded = false;
  public hasDate: FormControl<boolean>;
  public dtTag: FormControl<string | null>;
  public dtAssertion: FormControl<Assertion | null>;
  public date: FormControl<HistoricalDateModel | null>;
  public dtForm: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // place
    this.hasPlace = formBuilder.control(false, { nonNullable: true });
    this.plTag = formBuilder.control(null, Validators.maxLength(50));
    this.plAssertion = formBuilder.control(null);
    this.place = formBuilder.control(null, [
      Validators.maxLength(50),
      Validators.required,
    ]);
    this.dtTag = formBuilder.control(null, Validators.maxLength(50));
    this.dtAssertion = formBuilder.control(null);
    // date
    this.hasDate = formBuilder.control(false, { nonNullable: true });
    this.date = formBuilder.control(null, Validators.required);
    this.plForm = formBuilder.group({
      plTag: this.plTag,
      plAssertion: this.plAssertion,
      place: this.place,
    });
    this.dtForm = formBuilder.group({
      dtTag: this.dtTag,
      dtAssertion: this.dtAssertion,
      date: this.date,
    });

    // when chronotope changes, update the form
    effect(() => {
      if (this._dropNextInput) {
        this._dropNextInput = false;
        return;
      }
      this.updateForm(this.chronotope());
    });
  }

  public ngOnInit(): void {
    // whenever has place or date changes, update the chronotope
    this._sub = merge(this.hasPlace.valueChanges, this.hasDate.valueChanges)
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe(() => {
        const chronotope = this.getChronotope();
        this._dropNextInput = true;
        this.chronotope.set(chronotope);
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(chronotope: AssertedChronotope | undefined): void {
    if (!chronotope) {
      this.plForm.reset();
      this.dtForm.reset();
    } else {
      this.plTag.setValue(chronotope.place?.tag || null);
      this.plAssertion.setValue(chronotope.place?.assertion || null);
      this.place.setValue(chronotope.place?.value || null);
      this.hasPlace.setValue(chronotope.place ? true : false);
      this.plForm.markAsPristine();

      this.dtTag.setValue(chronotope.date?.tag || null);
      this.dtAssertion.setValue(chronotope.date?.assertion || null);
      this.date.setValue(chronotope.date as HistoricalDateModel);
      this.hasDate.setValue(chronotope.date ? true : false);
      this.dtForm.markAsPristine();
    }
  }

  public editPlace(): void {
    const chronotope = this.chronotope();
    this.place.setValue(chronotope?.place?.value || null);
    this.plAssertion.setValue(chronotope?.place?.assertion || null);
    this.placeExpanded = true;
  }

  public onPlAssertionChange(assertion: Assertion | undefined): void {
    this.plAssertion.setValue(assertion || null);
    this.plAssertion.updateValueAndValidity();
    this.plAssertion.markAsDirty();
  }

  public savePlace(): void {
    // save if valid
    if (this.plForm.valid) {
      this.hasPlace.setValue(true);
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasPlace.setValue(false);
    }
    this.hasPlace.markAsDirty();
    this.hasPlace.updateValueAndValidity();
    // close the form
    this.placeExpanded = false;
  }

  public editDate(): void {
    const chronotope = this.chronotope();
    this.date.setValue(chronotope?.date || null);
    this.dtAssertion.setValue(chronotope?.date?.assertion || null);
    this.dateExpanded = true;
  }

  public onDtAssertionChange(assertion: Assertion | undefined): void {
    this.dtAssertion.setValue(assertion || null);
    this.dtAssertion.updateValueAndValidity();
    this.dtAssertion.markAsDirty();
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.date.setValue(date || null);
    this.date.updateValueAndValidity();
    this.date.markAsDirty();
  }

  public saveDate(): void {
    // save if valid
    if (this.dtForm.valid) {
      this.hasDate.setValue(true);
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasDate.setValue(false);
    }
    this.hasDate.markAsDirty();
    this.hasDate.updateValueAndValidity();
    // close the form
    this.dateExpanded = false;
  }

  private getChronotope(): AssertedChronotope {
    return {
      place:
        this.hasPlace.value && this.place.value
          ? {
              tag: this.plTag.value?.trim(),
              value: this.place.value?.trim(),
              assertion: this.plAssertion.value || undefined,
            }
          : undefined,
      date:
        this.hasDate.value && this.date.value
          ? {
              ...this.date.value,
              tag: this.dtTag.value?.trim(),
              assertion: this.dtAssertion.value || undefined,
            }
          : undefined,
    };
  }
}
