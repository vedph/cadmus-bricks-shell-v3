import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';

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
 * Editor for a set of physical measurements.
 */
@Component({
  selector: 'cadmus-mat-physical-measurement-set',
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
    MatTooltipModule,
    FlatLookupPipe,
  ],
  templateUrl: './physical-measurement-set.component.html',
  styleUrl: './physical-measurement-set.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalMeasurementSetComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

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

  public name: FormControl<string | null>;
  public hasCustom: FormControl<boolean>;
  public custom: FormControl<string | null>;
  public batch: FormControl<string | null>;
  public form: FormGroup;

  public value: FormControl<number>;
  public unit: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public editedForm: FormGroup;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<PhysicalMeasurement | undefined>(undefined);

  constructor(formBuilder: FormBuilder) {
    this.name = formBuilder.control(null);
    this.hasCustom = formBuilder.control(false, { nonNullable: true });
    this.custom = formBuilder.control(null);
    this.batch = formBuilder.control(null);
    this.form = formBuilder.group({
      name: this.name,
      hasCustom: this.hasCustom,
      custom: this.custom,
      batch: this.batch,
    });

    this.value = formBuilder.control(0, { nonNullable: true });
    this.unit = formBuilder.control(null);
    this.tag = formBuilder.control(null);
    this.editedForm = formBuilder.group({
      value: this.value,
      unit: this.unit,
      tag: this.tag,
    });
  }

  public ngOnInit(): void {
    this._sub = this.hasCustom.valueChanges.subscribe((value) => {
      if (value) {
        this.name.disable();
      } else {
        this.name.enable();
      }
      if (value && this.customCtl) {
        setTimeout(() => this.customCtl!.nativeElement.focus(), 0);
      }
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public closeMeasurement(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  private updateEditedForm(): void {
    if (!this.edited()) {
      this.editedForm.reset();
    } else {
      this.value.setValue(this.edited()!.value);
      this.unit.setValue(this.edited()!.unit);
      this.tag.setValue(this.edited()!.tag || null);
      this.editedForm.markAsPristine();
    }
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

    if (this.hasCustom.value) {
      this.addCustomMeasurement(event);
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.name.value) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      name: this.name.value,
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement);

    if (!this.nameEntries?.length) {
      this.name.reset();
    }

    this.updateEditedForm();
  }

  public addCustomMeasurement(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.custom.value) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      name: this.custom.value,
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement);

    this.updateEditedForm();
    this.custom.reset();
  }

  public addBatchMeasurements(): void {
    // parse from batch.value with form "name=value unit (tag);..."
    const entries = this.batch.value
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
      name: this.edited!.name,
      value: this.value.value,
      unit: this.unit.value,
      tag: this.tag.value || undefined,
    } as PhysicalMeasurement);

    const measurements = [...this.measurements()];
    // get the index of the existing measurement with the same name
    const existingIndex = measurements.findIndex(
      (m) => m.name === this.edited!.name
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
