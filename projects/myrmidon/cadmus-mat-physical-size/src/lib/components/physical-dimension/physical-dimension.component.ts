import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  disabled,
  form,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';

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
 * The editable controls backing a physical dimension.
 */
interface PhysicalDimensionControls {
  value: number;
  unit: string | null;
  tag: string;
}

/**
 * Editor for a single physical dimension.
 */
@Component({
  selector: 'cadmus-physical-dimension',
  templateUrl: './physical-dimension.component.html',
  styleUrls: ['./physical-dimension.component.css'],
  imports: [
    FormField,
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

  private readonly _draft = signal<PhysicalDimensionControls>({
    value: 0,
    unit: null,
    tag: '',
  });
  public readonly form: FieldTree<PhysicalDimensionControls>;

  constructor() {
    this.form = form(this._draft, (path) => {
      min(path.value, 0);
      required(path.unit);
      maxLength(path.tag, 50);
      disabled(path.value, { when: () => !!this.disabled() });
      disabled(path.unit, {
        when: () => !!this.disabled() || this.unitDisabled(),
      });
      disabled(path.tag, { when: () => !!this.disabled() });
    });

    // when dimension changes, update form
    effect(() => {
      const dimension = this.dimension();
      this.updateForm(dimension);
    });
  }

  private updateForm(dimension?: PhysicalDimension): void {
    if (!dimension) {
      this._draft.set({ value: 0, unit: null, tag: '' });
    } else {
      this._draft.set({
        value: dimension.value,
        unit: dimension.unit,
        tag: dimension.tag || '',
      });
    }
    this.form().reset();
  }

  private getDimension(): PhysicalDimension {
    const value = this.form().value();
    return {
      value: value.value || 0,
      unit: value.unit || '',
      tag: value.tag || undefined,
    };
  }

  public cancel(): void {
    this.cancelEdit.emit();
  }

  public save(pristine = true): void {
    if (this.form().invalid()) {
      // show validation errors
      this.form().markAsTouched();
      return;
    }

    const dimension = this.getDimension();
    this.dimension.set(dimension);

    if (pristine) {
      this.form().reset();
    }
  }
}
