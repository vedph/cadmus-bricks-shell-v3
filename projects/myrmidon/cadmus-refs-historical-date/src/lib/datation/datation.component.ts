import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
} from '@angular/core';
import {
  FormControl,
  FormBuilder,
  Validators,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';

import { Datation, DatationModel } from './datation';

/**
 * Editor for a single point in a historical date.
 */
@Component({
  selector: 'cadmus-refs-datation',
  templateUrl: './datation.component.html',
  styleUrls: ['./datation.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatationComponent {
  private _updatingForm = false;

  /**
   * The datation to edit.
   */
  public readonly datation = model<DatationModel>();

  /**
   * The optional label to display for this datation.
   */
  public readonly label = input<string>();

  public value: FormControl<number>;
  public century: FormControl<boolean>;
  public span: FormControl<boolean>;
  public month: FormControl<number>;
  public day: FormControl<number>;
  public about: FormControl<boolean>;
  public dubious: FormControl<boolean>;
  public hint: FormControl<string | null>;
  public slide: FormControl<number>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    // form
    this.value = formBuilder.control(0, { nonNullable: true });
    this.century = formBuilder.control(false, { nonNullable: true });
    this.span = formBuilder.control(false, { nonNullable: true });
    this.month = formBuilder.control(0, {
      validators: [Validators.min(0), Validators.max(12)],
      nonNullable: true,
    });
    this.day = formBuilder.control(0, {
      validators: [Validators.min(0), Validators.max(31)],
      nonNullable: true,
    });
    this.about = formBuilder.control(false, { nonNullable: true });
    this.dubious = formBuilder.control(false, { nonNullable: true });
    this.hint = formBuilder.control(null, Validators.maxLength(500));
    this.slide = formBuilder.control(0, { nonNullable: true });
    this.form = formBuilder.group({
      value: this.value,
      century: this.century,
      span: this.span,
      month: this.month,
      day: this.day,
      about: this.about,
      dubious: this.dubious,
      hint: this.hint,
      slide: this.slide,
    });

    // when datation changes, update form
    effect(() => {
      this.updateForm(this.datation());
    });

    // when form changes (user edits), emit
    this.form.valueChanges
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (!this._updatingForm) {
          this.emitChange();
        }
      });
  }

  private updateForm(model: DatationModel | undefined): void {
    this._updatingForm = true;
    if (!model) {
      this.form.reset(undefined, { emitEvent: false });
    } else {
      this.value.setValue(model.value, { emitEvent: false });
      this.century.setValue(model.isCentury || false, { emitEvent: false });
      this.span.setValue(model.isSpan || false, { emitEvent: false });
      this.month.setValue(model.month || 0, { emitEvent: false });
      this.day.setValue(model.day || 0, { emitEvent: false });
      this.about.setValue(model.isApproximate || false, { emitEvent: false });
      this.dubious.setValue(model.isDubious || false, { emitEvent: false });
      this.hint.setValue(model.hint || null, { emitEvent: false });
      this.slide.setValue(model.slide || 0, { emitEvent: false });
      this.form.markAsPristine();
    }
    this._updatingForm = false;
  }

  private getDatation(): DatationModel {
    return {
      value: this.value.value ? +this.value.value : 0,
      isCentury: this.century.value || false,
      isSpan: this.span.value || false,
      month: this.month.value ? +this.month.value : 0,
      day: this.day.value ? +this.day.value : 0,
      isApproximate: this.about.value || false,
      isDubious: this.dubious.value || false,
      hint: Datation.sanitizeHint(this.hint.value),
      slide: this.slide.value ? +this.slide.value : 0,
    };
  }

  private emitChange(): void {
    this.datation.set(this.getDatation());
  }
}
