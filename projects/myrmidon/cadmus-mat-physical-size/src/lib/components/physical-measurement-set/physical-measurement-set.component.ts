import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  disabled,
  form,
  min,
} from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { FlatLookupPipe } from '@myrmidon/ngx-tools';

import { PhysicalDimension } from '../physical-dimension/physical-dimension.component';

/**
 * A physical measurement.
 */
export interface PhysicalMeasurement extends PhysicalDimension {
  name: string;
}

/**
 * The controls used to add a new measurement.
 */
interface AddMeasureControls {
  name: string;
  hasCustom: boolean;
  custom: string;
  batch: string;
}

/**
 * The controls used to edit an existing (or new) measurement.
 */
interface EditedMeasureControls {
  value: number;
  unit: string | null;
  tag: string;
}

/**
 * Editor for a set of physical measurements.
 */
@Component({
  selector: 'cadmus-mat-physical-measurement-set',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    FlatLookupPipe,
  ],
  templateUrl: './physical-measurement-set.component.html',
  styleUrl: './physical-measurement-set.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalMeasurementSetComponent {
  /**
   * The set of measurements.
   */
  public readonly measurements = model<PhysicalMeasurement[]>([]);

  /**
   * True to allow custom measurement names. This is meaningful
   * only when nameEntries is specified; otherwise, all the
   * measurement names are custom.
   */
  public readonly allowCustomName = input<boolean>();

  /**
   * The default unit to use when adding a new measurement.
   */
  public readonly defaultUnit = input<string>();

  /**
   * True to allow distinct measurements only. When this is true,
   * you cannot add multiple measurements with the same name.
   */
  public readonly distinct = input<boolean>();

  public readonly hideTag = input<boolean>();

  // physical-size-units
  public readonly unitEntries = input<ThesaurusEntry[]>([]);
  // physical-size-dim-tags
  public readonly dimTagEntries = input<ThesaurusEntry[]>();
  // physical-size-set-names
  public nameEntries = input<ThesaurusEntry[]>();

  @ViewChild('cstn', { static: false })
  public customCtl?: ElementRef;

  // add-measurement form
  public readonly form: FieldTree<AddMeasureControls>;
  // edited-measurement form
  private readonly _editedDraft = signal<EditedMeasureControls>({
    value: 0,
    unit: null,
    tag: '',
  });
  public readonly editedForm: FieldTree<EditedMeasureControls>;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<PhysicalMeasurement | undefined>(undefined);

  constructor() {
    this.form = form(
      signal<AddMeasureControls>({
        name: '',
        hasCustom: false,
        custom: '',
        batch: '',
      }),
      (path) => {
        disabled(path.name, { when: (ctx) => ctx.valueOf(path.hasCustom) });
      }
    );
    this.editedForm = form(this._editedDraft, (path) => {
      min(path.value, 0);
    });

    // when hasCustom becomes true, focus the custom input
    effect(() => {
      const hasCustom = this.form.hasCustom().value();
      if (hasCustom && this.customCtl) {
        setTimeout(() => this.customCtl!.nativeElement.focus(), 0);
      }
    });
  }

  public closeMeasurement(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  private updateEditedForm(): void {
    if (!this.edited()) {
      this._editedDraft.set({ value: 0, unit: null, tag: '' });
    } else {
      this._editedDraft.set({
        value: this.edited()!.value,
        unit: this.edited()!.unit,
        tag: this.edited()!.tag || '',
      });
    }
    this.editedForm().reset();
  }

  public editMeasurement(index: number): void {
    if (this.editedIndex() === index) {
      return;
    }
    this.editedIndex.set(index);
    this.edited.set(this.measurements()[index]);

    this.updateEditedForm();
  }

  public addMeasurement(event?: Event): void {
    this.closeMeasurement();

    if (this.form.hasCustom().value()) {
      this.addCustomMeasurement(event);
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.form.name().value()) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      name: this.form.name().value(),
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement);

    if (!this.nameEntries()?.length) {
      this.form.name().value.set('');
    }

    this.updateEditedForm();
  }

  public addCustomMeasurement(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.form.custom().value()) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      name: this.form.custom().value(),
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement);

    this.updateEditedForm();
    this.form.custom().value.set('');
  }

  public addBatchMeasurements(): void {
    // parse from batch.value with form "name=value unit (tag);..."
    const entries = this.form
      .batch()
      .value()
      ?.split(';')
      .filter((s) => s.trim().length > 0);
    if (!entries?.length) {
      return;
    }
    let prevUnit: string | undefined = undefined;
    const added: PhysicalMeasurement[] = [];
    for (let i = 0; i < entries.length; i++) {
      // match: 1=name, 2=value, 3=unit, 4=tag
      const m = entries[i].match(
        /^\s*([^=]+)\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*([^(]+)?(?:\s*\(([^)]+)\))?\s*$/
      );
      if (m) {
        const name = m[1]?.trim();
        const value = parseFloat(m[2]);
        const unit: string | undefined = m[3]?.trim() || prevUnit;
        const tag = m[4]?.trim();
        if (unit) {
          const measure: PhysicalMeasurement = {
            name: name,
            value: value,
            unit: unit,
            tag: tag,
          };
          added.push(measure);
          prevUnit = unit;
        }
      }
    }

    if (added.length) {
      let measurements = [...this.measurements()];

      // if distinct, remove existing measurements with the same name
      if (this.distinct()) {
        const names = new Set(added.map((m) => m.name));
        measurements = measurements.filter((m) => !names.has(m.name));
      }

      measurements.push(...added);
      this.measurements.set(measurements);
    }
  }

  public saveMeasurement(): void {
    this.edited.set({
      name: this.edited()!.name,
      value: this.editedForm.value().value(),
      unit: this.editedForm.unit().value(),
      tag: this.editedForm.tag().value() || undefined,
    } as PhysicalMeasurement);

    const measurements = [...this.measurements()];
    // get the index of the existing measurement with the same name
    const existingIndex = measurements.findIndex(
      (m) => m.name === this.edited()!.name
    );
    // append or replace
    if (this.editedIndex() === -1) {
      measurements.push(this.edited()!);
    } else {
      measurements[this.editedIndex()] = this.edited()!;
    }

    // if distinct, remove another existing measurement with the same name
    if (
      existingIndex > -1 &&
      existingIndex !== this.editedIndex() &&
      this.distinct()
    ) {
      measurements.splice(existingIndex, 1);
    }

    // close the editor
    this.closeMeasurement();

    this.measurements.set(measurements);
  }

  public onDimensionChange(dimension?: PhysicalDimension): void {
    this.edited.set({ ...this.edited(), ...dimension! } as PhysicalMeasurement);
  }

  public onFormSubmit(event: Event): void {
    event.preventDefault();
  }

  public moveMeasurementUp(index: number): void {
    if (index < 1) {
      return;
    }
    const measurements = [...this.measurements()];
    const item = measurements[index];
    measurements.splice(index, 1);
    measurements.splice(index - 1, 0, item);

    this.measurements.set(measurements);
  }

  public moveMeasurementDown(index: number): void {
    if (index + 1 >= this.measurements().length) {
      return;
    }
    const measurements = [...this.measurements()];
    const item = measurements[index];
    measurements.splice(index, 1);
    measurements.splice(index + 1, 0, item);

    this.measurements.set(measurements);
  }

  public deleteMeasurement(index: number) {
    const measurements = [...this.measurements()];
    measurements.splice(index, 1);

    this.measurements.set(measurements);
  }
}
