import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FieldTree,
  FormField,
  FormRoot,
  form,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
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
    FormField,
    FormRoot,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodLocationComponent implements OnDestroy {
  private _sub?: Subscription;
  // set synchronously at every site that writes `location` (not inside the
  // model-sync effect below), paired with _hasLastLocation since null/undefined
  // is both "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md
  private _lastLocation: CodLocationRange[] | null | undefined = undefined;
  private _hasLastLocation = false;

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

  private readonly _draft = signal({ text: '' });
  public readonly form: FieldTree<{ text: string }>;

  constructor() {
    this.form = form(this._draft, (path) => {
      required(path.text, { when: () => !!this.required() });
      maxLength(path.text, 500);
      pattern(path.text, () =>
        this.single() ? COD_LOCATION_PATTERN : COD_LOCATION_RANGES_PATTERN
      );
      // matches the semantics of parsing the text into ranges, regardless
      // of whether it already fails the pattern validator above
      validate(path.text, (ctx) => {
        if (this.single()) {
          return null;
        }
        const text = ctx.value();
        if (!text.length || text.endsWith(' ') || text.endsWith('-')) {
          return null;
        }
        const ranges = CodLocationParser.parseLocationRanges(text, true);
        return ranges?.length ? null : { kind: 'invalidLocation' };
      });
    });

    // when location changes, update text
    effect(() => {
      const location = this.location();
      if (this._hasLastLocation && this._lastLocation === location) {
        return;
      }
      this._lastLocation = location;
      this._hasLastLocation = true;
      console.log('location', location);
      this.updateForm(location);
    });

    // when text changes, update location
    this._sub = toObservable(this._draft)
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.saveLocation();
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private updateForm(location: CodLocationRange[] | null): void {
    this.form.text().value.set(CodLocationParser.rangesToString(location) || '');
  }

  private saveLocation(): void {
    const text = this.form.text().value();
    if (this.single()) {
      const loc = this.form.text().valid()
        ? CodLocationParser.parseLocation(text)
        : null;
      if (loc) {
        const next = [{ start: loc, end: loc }];
        this._lastLocation = next;
        this._hasLastLocation = true;
        this.location.set(next);
      } else {
        if (!this.required() && !text.length) {
          this._lastLocation = null;
          this._hasLastLocation = true;
          this.location.set(null);
        }
      }
    } else {
      // if text ends with space(s)/-, do nothing because
      // the user is still typing and we must wait for the next
      // range in the list; otherwise, we would parse a single
      // range and remove trailing spaces from what is being typed
      if (text.endsWith(' ') || text.endsWith('-')) {
        return;
      }

      const ranges = this.form.text().valid()
        ? CodLocationParser.parseLocationRanges(text, true)
        : null;
      if (ranges?.length) {
        this._lastLocation = ranges;
        this._hasLastLocation = true;
        this.location.set(ranges);
      } else {
        if (!this.required() && !text.length) {
          this._lastLocation = null;
          this._hasLastLocation = true;
          this.location.set(null);
        } else {
          // the invalidLocation error is reported reactively by the
          // validate() rule above; here we just mark the field touched
          // so the template shows it
          this.form.text().markAsTouched();
        }
      }
    }
  }

}
