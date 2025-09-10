import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

/**
 * A single physical dimension.
 */
export interface PhysicalDimension {
  tag?: string;
  value: number;
  unit: string;
}

/**
 * Editor for a single physical dimension.
 */
@Component({
  selector: 'cadmus-physical-dimension',
  templateUrl: './physical-dimension.component.html',
  styleUrls: ['./physical-dimension.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalDimensionComponent {
  /**
   * The label to display for this dimension.
   */
  public readonly label = input<string>();

  /**
   * The dimension to edit.
   */
  public readonly dimension = model<PhysicalDimension>();

  /**
   * True if the control is disabled.
   */
  public readonly disabled = input<boolean>();

  /**
   * True if the unit control is disabled so that users
   * cannot change the unit.
   */
  public readonly unitDisabled = input<boolean>(false);

  /**
   * True if the tag should be hidden.
   */
  public readonly hideTag = input<boolean>();

  // physical-size-units
  public readonly unitEntries = input<ThesaurusEntry[]>([
    { id: 'cm', value: 'cm' },
    { id: 'mm', value: 'mm' },
  ]);
  // physical-size-dim-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * Event emitted when the user clicks the cancel button.
   */
  public readonly cancelEdit = output();

  public value: FormControl<number>;
  public unit: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.value = formBuilder.control(0, { nonNullable: true });
    this.unit = formBuilder.control(null, Validators.required);
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.form = formBuilder.group({
      value: this.value,
      unit: this.unit,
      tag: this.tag,
    });

    // when dimension changes, update form
    effect(() => {
      const dimension = this.dimension();
      this.updateForm(dimension);
    });

    // when disabled changes, update form
    effect(() => {
      if (this.disabled()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });

    // when unitDisabled changes, enable/disable unit control
    effect(() => {
      if (this.unitDisabled()) {
        this.unit.disable();
      } else {
        this.unit.enable();
      }
    });
  }

  private updateForm(model?: PhysicalDimension): void {
    if (!model) {
      this.form.reset();
    } else {
      this.value.setValue(model.value, { emitEvent: false });
      this.unit.setValue(model.unit, { emitEvent: false });
      this.tag.setValue(model.tag || null, { emitEvent: false });
      this.form.markAsPristine();
    }
  }

  private getDimension(): PhysicalDimension {
    return {
      value: this.value.value || 0,
      unit: this.unit.value || '',
      tag: this.tag.value || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  public save(pristine = true): void {
    if (this.form.invalid) {
      // show validation errors
      this.form.markAllAsTouched();
      return;
    }

    const dimension = this.getDimension();
    this.dimension.set(dimension);

    if (pristine) {
      this.form.markAsPristine();
    }
  }
}
