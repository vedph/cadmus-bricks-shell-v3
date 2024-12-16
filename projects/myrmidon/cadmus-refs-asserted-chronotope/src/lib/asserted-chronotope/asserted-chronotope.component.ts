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
import { debounceTime } from 'rxjs/operators';

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
} from '@myrmidon/cadmus-refs-historical-date';
import { Subscription } from 'rxjs';

export interface AssertedPlace {
  tag?: string;
  value: string;
  assertion?: Assertion;
}

export interface AssertedDate extends HistoricalDateModel {
  tag?: string;
  assertion?: Assertion;
}

export interface AssertedChronotope {
  place?: AssertedPlace;
  date?: AssertedDate;
}

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
  ],
})
export class AssertedChronotopeComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updatingForm: boolean | undefined;

  public readonly chronotope = model<AssertedChronotope>();

  // chronotope-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // assertion-tags
  public assTagEntries = input<ThesaurusEntry[]>();

  // doc-reference-types
  public refTypeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public refTagEntries = input<ThesaurusEntry[]>();

  public plTag: FormControl<string | null>;
  public plAssertion: FormControl<Assertion | null>;
  public place: FormControl<string | null>;
  public dtTag: FormControl<string | null>;
  public dtAssertion: FormControl<Assertion | null>;
  public date: FormControl<HistoricalDateModel | null>;
  public hasDate: FormControl<boolean>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.plTag = formBuilder.control(null, Validators.maxLength(50));
    this.plAssertion = formBuilder.control(null);
    this.place = formBuilder.control(null, Validators.maxLength(50));
    this.dtTag = formBuilder.control(null, Validators.maxLength(50));
    this.dtAssertion = formBuilder.control(null);
    this.hasDate = formBuilder.control(false, { nonNullable: true });
    this.date = formBuilder.control(null);
    this.form = formBuilder.group({
      plTag: this.plTag,
      plAssertion: this.plAssertion,
      place: this.place,
      hasDate: this.hasDate,
      dtTag: this.dtTag,
      dtAssertion: this.dtAssertion,
      date: this.date,
    });

    // when chronotope changes, update the form
    effect(() => {
      this.updateForm(this.chronotope());
    });
  }

  public ngOnInit(): void {
    this._sub = this.form.valueChanges
      .pipe(debounceTime(350))
      .subscribe((_) => {
        if (!this._updatingForm) {
          this.chronotope.set(this.getChronotope());
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onPlAssertionChange(assertion: Assertion | undefined): void {
    this.plAssertion.setValue(assertion || null);
    this.plAssertion.updateValueAndValidity();
    this.plAssertion.markAsDirty();
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

  private updateForm(value: AssertedChronotope | undefined): void {
    this._updatingForm = true;
    if (!value) {
      this.form.reset();
    } else {
      this.plTag.setValue(value.place?.tag || null);
      this.plAssertion.setValue(value.place?.assertion || null);
      this.place.setValue(value.place?.value || null);
      this.hasDate.setValue(value.date ? true : false);
      this.dtTag.setValue(value.date?.tag || null);
      this.dtAssertion.setValue(value.date?.assertion || null);
      this.date.setValue(value.date as HistoricalDateModel);
      this.form.markAsPristine();
    }
    this._updatingForm = false;
  }

  private getChronotope(): AssertedChronotope {
    return {
      place: this.place.value
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
