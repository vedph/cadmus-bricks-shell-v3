import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
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
  LookupProviderOptions,
  RefLookupComponent,
  RefLookupConfig,
} from '@myrmidon/cadmus-refs-lookup';
import {
  AssertedHistoricalDate,
  HistoricalDateComponent,
  HistoricalDateModel,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';
import { debounceTime, distinctUntilChanged, filter, Subscription } from 'rxjs';

/**
 * A place with an optional assertion.
 */
export interface AssertedPlace {
  tag?: string;
  value: string;
  assertion?: Assertion;
}

/**
 * Asserted chronotope: a place with an optional assertion, and/or a date with an
 * optional assertion.
 */
export interface AssertedChronotope {
  place?: AssertedPlace;
  date?: AssertedHistoricalDate;
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
    RefLookupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedChronotopeComponent implements OnInit, OnDestroy {
  private _subs: Subscription[] = [];
  private _updatingForm?: boolean;
  private _hasPlaceChangeFrozen?: boolean;
  private _hasDateChangeFrozen?: boolean;

  /**
   * The chronotope to edit.
   */
  public readonly chronotope = model<AssertedChronotope>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The configuration of the lookup service for places.
   * When set, the place will be fetched from a service rather
   * than manually entered.
   */
  public readonly placeLookupConfig = input<RefLookupConfig>();

  // chronotope-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();
  // assertion-tags
  public assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public refTagEntries = input<ThesaurusEntry[]>();

  // place
  public placeExpanded = signal(false);
  public placeItemId = signal<string | undefined>(undefined);
  public placeDisplayLabel = signal<string | undefined>(undefined);
  public hasPlace: FormControl<boolean>;
  public plTag: FormControl<string | null>;
  public plAssertion: FormControl<Assertion | null>;
  public place: FormControl<string | null>;
  public plForm: FormGroup;

  // date
  public dateExpanded = signal(false);
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
      this.updateForm(this.chronotope());
    });
  }

  public ngOnInit(): void {
    // automatically open place editor when checkbox is checked for new entries
    this._subs.push(
      this.hasPlace.valueChanges
        .pipe(
          filter(() => !this._updatingForm),
          distinctUntilChanged(),
          debounceTime(300),
        )
        .subscribe((checked) => {
          if (this._hasPlaceChangeFrozen) {
            this._hasPlaceChangeFrozen = false;
            return;
          }
          if (checked) {
            // use setTimeout to avoid potential timing issues with form updates
            setTimeout(() => this.editPlace(), 0);
          } else {
            // close the place editor if unchecked
            this.place.reset();
            this.plForm.reset();
            // update chronotope after place change
            const chronotope = this.getChronotope();
            this.chronotope.set(chronotope);
          }
        }),
    );

    // automatically open date editor when checkbox is checked for new entries
    this._subs.push(
      this.hasDate.valueChanges
        .pipe(
          filter(() => !this._updatingForm),
          distinctUntilChanged(),
          debounceTime(300),
        )
        .subscribe((checked) => {
          if (this._hasDateChangeFrozen) {
            this._hasDateChangeFrozen = false;
            return;
          }
          if (checked) {
            // use setTimeout to avoid potential timing issues with form updates
            setTimeout(() => this.editDate(), 0);
          } else {
            // close the date editor if unchecked
            this.date.reset();
            this.dtForm.reset();
            // update chronotope after date change
            const chronotope = this.getChronotope();
            this.chronotope.set(chronotope);
          }
        }),
    );
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  private updateForm(chronotope: AssertedChronotope | undefined): void {
    this._updatingForm = true;
    this.placeExpanded.set(false);
    this.dateExpanded.set(false);

    if (!chronotope) {
      this.hasPlace.reset();
      this.hasDate.reset();
      this.plForm.reset();
      this.dtForm.reset();
      this.placeItemId.set(undefined);
      this.placeDisplayLabel.set(undefined);
    } else {
      this.hasPlace.setValue(chronotope.place ? true : false, {
        emitEvent: false,
      });
      this.plTag.setValue(chronotope.place?.tag || null, { emitEvent: false });
      this.plAssertion.setValue(chronotope.place?.assertion || null, {
        emitEvent: false,
      });
      this.place.setValue(chronotope.place?.value || null, {
        emitEvent: false,
      });
      // if in lookup mode, resolve place ID for the lookup component
      const cfg = this.placeLookupConfig();
      if (cfg) {
        const raw = chronotope.place?.value;
        this.placeItemId.set(
          raw ? (cfg.itemIdParser ? cfg.itemIdParser(raw) : raw) : undefined,
        );
        // label will be set asynchronously when the lookup resolves
        this.placeDisplayLabel.set(undefined);
      }
      this.plForm.markAsPristine();

      this.hasDate.setValue(chronotope.date ? true : false, {
        emitEvent: false,
      });
      this.dtTag.setValue(chronotope.date?.tag || null, { emitEvent: false });
      this.dtAssertion.setValue(chronotope.date?.assertion || null, {
        emitEvent: false,
      });
      this.date.setValue(chronotope.date as HistoricalDateModel, {
        emitEvent: false,
      });
      this.dtForm.markAsPristine();
    }
    this._updatingForm = false;
  }

  public editPlace(): void {
    const chronotope = this.chronotope();
    this.place.setValue(chronotope?.place?.value || null, { emitEvent: false });
    this.plAssertion.setValue(chronotope?.place?.assertion || null, {
      emitEvent: false,
    });
    this.placeExpanded.set(true);
  }

  public onPlaceLookupChange(item: any): void {
    const cfg = this.placeLookupConfig();
    if (!item || !cfg?.itemIdGetter) {
      this.place.setValue(null);
      this.placeDisplayLabel.set(undefined);
    } else {
      const id = cfg.itemIdGetter(item);
      this.place.setValue(id);
      // build display label: "label (id)" or just the id
      const label = cfg.itemLabelGetter
        ? cfg.itemLabelGetter(item)
        : cfg.service?.getName(item);
      this.placeDisplayLabel.set(
        label && label !== id ? `${label} (${id})` : id,
      );
    }
    this.place.markAsDirty();
    this.place.updateValueAndValidity();
  }

  public onPlAssertionChange(assertion: Assertion | undefined): void {
    this.plAssertion.setValue(assertion || null, { emitEvent: false });
    this.plAssertion.updateValueAndValidity();
    this.plAssertion.markAsDirty();
  }

  public closePlace(): void {
    this._hasPlaceChangeFrozen = false;
    this.placeExpanded.set(false);
  }

  public savePlace(): void {
    this._hasPlaceChangeFrozen = true;
    // save if valid
    if (this.plForm.valid) {
      this.hasPlace.setValue(true, { emitEvent: false });
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasPlace.setValue(false, { emitEvent: false });
    }
    this.hasPlace.markAsDirty();
    this.hasPlace.updateValueAndValidity();
    // close the form
    this.placeExpanded.set(false);
  }

  public editDate(): void {
    const chronotope = this.chronotope();
    this.date.setValue(chronotope?.date || null);
    this.dtAssertion.setValue(chronotope?.date?.assertion || null);
    this.dateExpanded.set(true);
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

  public closeDate(): void {
    this._hasDateChangeFrozen = false;
    this.dateExpanded.set(false);
  }

  public saveDate(): void {
    this._hasDateChangeFrozen = true;
    // save if valid
    if (this.dtForm.valid) {
      this.hasDate.setValue(true, { emitEvent: false });
      this.chronotope.set(this.getChronotope());
    } else {
      this.hasDate.setValue(false, { emitEvent: false });
    }
    this.hasDate.markAsDirty();
    this.hasDate.updateValueAndValidity();
    // close the form
    this.dateExpanded.set(false);
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
