import {
  ChangeDetectionStrategy,
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
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import {
  CodLocationParser,
  CodLocationRange,
  COD_LOCATION_PATTERN,
  COD_LOCATION_RANGES_PATTERN,
} from '../cod-location-parser';

/**
 * Component for editing a CodLocationRange array.
 * The location can be a single sheet (e.g. "1r") or a range
 * (e.g. "1r-2v"), or multiple ranges separated by spaces
 * (e.g. "1r-2v 3r 4r-5v").
 */
@Component({
  selector: 'cadmus-cod-location',
  templateUrl: './cod-location.component.html',
  styleUrls: ['./cod-location.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodLocationComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _changeFrozen: boolean | undefined;
  private _updatingVals: boolean | undefined;

  /**
   * The label to display in the control (default="location").
   */
  public readonly label = input<string>('location');

  /**
   * True if this location is required.
   */
  public readonly required = input<boolean>();

  /**
   * True if this location refers to a single sheet.
   * If false, it refers to one or more ranges.
   */
  public readonly single = input<boolean>();

  /**
   * The location. Unless null, this is always represented by
   * an array of ranges, even when single is true (in this case,
   * the array  will contain a single range with start=end).
   */
  public readonly location = model<CodLocationRange[] | null>(null);

  public text: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.text = formBuilder.control(null);
    this.form = formBuilder.group({
      text: this.text,
    });

    // when required/single changes, update validators
    effect(() => {
      this.updateValidators(this.required(), this.single());
      this.text.updateValueAndValidity();
    });

    // when location changes, update text
    effect(() => {
      const location = this.location();
      console.log('location', location);
      this.updateForm(location);
    });
  }

  private updateValidators(required?: boolean, single?: boolean): void {
    if (this._updatingVals) {
      return;
    }
    this._updatingVals = true;
    this.text.clearValidators();
    // required
    if (required) {
      this.text.addValidators(Validators.required);
    }
    // single
    if (single) {
      this.text.addValidators(Validators.pattern(COD_LOCATION_PATTERN));
    } else {
      this.text.addValidators(Validators.pattern(COD_LOCATION_RANGES_PATTERN));
    }
    this._updatingVals = false;
    this.text.updateValueAndValidity();
  }

  public ngOnInit(): void {
    this.updateValidators();
    this.text.setValue(CodLocationParser.rangesToString(this.location()));

    // when text changes, update location
    this._sub = this.text.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((_) => {
        if (!this._changeFrozen) {
          this.saveLocation();
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(location: CodLocationRange[] | null): void {
    this._changeFrozen = true;
    if (location) {
      this.text.setValue(CodLocationParser.rangesToString(location));
    } else {
      this.text.reset();
    }
    this._changeFrozen = false;
  }

  private saveLocation(): void {
    if (this.single()) {
      const loc = this.text.valid
        ? CodLocationParser.parseLocation(this.text.value)
        : null;
      if (loc) {
        this.location.set([{ start: loc, end: loc }]);
      } else {
        if (!this.required() && !this.text.value?.length) {
          this.location.set(null);
        }
      }
    } else {
      // if text ends with space(s)/-, do nothing because
      // the user is still typing and we must wait for the next
      // range in the list; otherwise, we would parse a single
      // range and remove trailing spaces from what is being typed
      if (this.text.value?.endsWith(' ') || this.text.value?.endsWith('-')) {
        return;
      }

      const ranges = this.text.valid
        ? CodLocationParser.parseLocationRanges(this.text.value, true)
        : null;
      if (ranges?.length) {
        this.location.set(ranges);
      } else {
        if (!this.required() && !this.text.value?.length) {
          this.location.set(null);
        } else {
          // set error on text control
          this.text.markAsTouched();
          this.text.setErrors({
            invalidLocation: true,
          });
        }
      }
    }
  }
}
