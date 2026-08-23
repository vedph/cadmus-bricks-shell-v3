import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  form,
  max,
  maxLength,
  min,
} from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';

import { Datation, DatationModel } from './datation';

/**
 * The editable controls backing a single datation point.
 */
interface DatationControls {
  value: number;
  century: boolean;
  span: boolean;
  month: number;
  day: number;
  about: boolean;
  dubious: boolean;
  hint: string;
  slide: number;
}

/**
 * Editor for a single point in a historical date.
 */
@Component({
  selector: 'cadmus-refs-datation',
  templateUrl: './datation.component.html',
  styleUrls: ['./datation.component.css'],
  imports: [FormField, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatationComponent {
  // set synchronously at the point emitChange() writes `datation` (not
  // inside the effect below), paired with _hasLastDatation since undefined
  // is both "never saved yet" and a legitimate real value - see
  // signal-forms-migration.md for why this must live at the write site
  private _lastDatation: DatationModel | undefined = undefined;
  private _hasLastDatation = false;

  /**
   * The datation to edit.
   */
  public readonly datation = model<DatationModel>();

  /**
   * The optional label to display for this datation.
   */
  public readonly label = input<string>();

  private readonly _draft = signal<DatationControls>(
    this.makeDefaultControls(),
  );
  public readonly form: FieldTree<DatationControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      min(path.month, 0);
      max(path.month, 12);
      min(path.day, 0);
      max(path.day, 31);
      min(path.slide, 0);
      maxLength(path.hint, 500);
    });

    // when datation changes, update form
    effect(() => {
      const model = this.datation();
      if (this._hasLastDatation && this._lastDatation === model) {
        return;
      }
      this._lastDatation = model;
      this._hasLastDatation = true;
      this.updateForm(model);
    });

    // when form changes (user edits), emit
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        const next = this.getDatation();
        if (!this.datationsEqual(next, this.datation())) {
          this._lastDatation = next;
          this._hasLastDatation = true;
          this.datation.set(next);
        }
      });
  }

  private makeDefaultControls(): DatationControls {
    return {
      value: 0,
      century: false,
      span: false,
      month: 0,
      day: 0,
      about: false,
      dubious: false,
      hint: '',
      slide: 0,
    };
  }

  private datationsEqual(a: DatationModel, b?: DatationModel): boolean {
    if (!b) {
      return false;
    }
    return (
      a.value === b.value &&
      a.isCentury === b.isCentury &&
      a.isSpan === b.isSpan &&
      a.month === b.month &&
      a.day === b.day &&
      a.isApproximate === b.isApproximate &&
      a.isDubious === b.isDubious &&
      a.hint === b.hint &&
      a.slide === b.slide
    );
  }

  private updateForm(model: DatationModel | undefined): void {
    if (!model) {
      this._draft.set(this.makeDefaultControls());
    } else {
      this._draft.set({
        value: model.value,
        century: model.isCentury || false,
        span: model.isSpan || false,
        month: model.month || 0,
        day: model.day || 0,
        about: model.isApproximate || false,
        dubious: model.isDubious || false,
        hint: model.hint || '',
        slide: model.slide || 0,
      });
    }
    this.form().reset();
  }

  private getDatation(): DatationModel {
    const v = this._draft();
    return {
      value: v.value ? +v.value : 0,
      isCentury: v.century || false,
      isSpan: v.span || false,
      month: v.month ? +v.month : 0,
      day: v.day ? +v.day : 0,
      isApproximate: v.about || false,
      isDubious: v.dubious || false,
      hint: Datation.sanitizeHint(v.hint),
      slide: v.slide ? +v.slide : 0,
    };
  }
}
