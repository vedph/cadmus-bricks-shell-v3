import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';

import {
  PhysicalDimension,
  PhysicalDimensionComponent,
} from '../physical-dimension/physical-dimension.component';

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
  selector: 'cadmus-physical-measurement-set',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // material
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // myrmidon
    FlatLookupPipe,
    // local
    PhysicalDimensionComponent,
  ],
  templateUrl: './physical-measurement-set.component.html',
  styleUrl: './physical-measurement-set.component.css',
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

  // physical-size-units
  public readonly unitEntries = input<ThesaurusEntry[]>([]);
  // physical-size-dim-tags
  public readonly dimTagEntries = input<ThesaurusEntry[]>();
  // physical-size-set-names
  public nameEntries = input<ThesaurusEntry[]>();

  /**
   * Emitted when measurements change.
   */
  public readonly measurementsChange = output<PhysicalMeasurement[]>();

  @ViewChild('cstn', { static: false })
  public customCtl?: ElementRef;

  public name: FormControl<string | null>;
  public hasCustom: FormControl<boolean>;
  public custom: FormControl<string | null>;
  public batch: FormControl<string | null>;
  public form: FormGroup;

  public editedIndex: number = -1;
  public edited?: PhysicalMeasurement;

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
    this.editedIndex = -1;
    this.edited = undefined;
  }

  public editMeasurement(index: number): void {
    this.editedIndex = index;
    this.edited = this.measurements()[index];
  }

  public addMeasurement(event?: Event): void {
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

    this.editedIndex = -1;
    this.edited = {
      name: this.name.value,
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement;

    if (!this.nameEntries?.length) {
      this.name.reset();
    }
  }

  public addCustomMeasurement(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.custom.value) {
      return;
    }

    this.editedIndex = -1;
    this.edited = {
      name: this.custom.value,
      value: 0,
      unit: this.defaultUnit() || this.unitEntries()?.[0]?.id || 'cm',
    } as PhysicalMeasurement;

    this.custom.reset();
  }

  public addBatchMeasurements(): void {
    // parse from batch.value with form "name=value unit;name=value unit;..."
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
      const measurements = [...this.measurements()];
      measurements.push(...added);
      this.measurements.set(measurements);
      this.measurementsChange.emit(this.measurements());
    }
  }

  public saveMeasurement(): void {
    if (!this.edited) {
      return;
    }

    const measurements = [...this.measurements()];

    if (this.editedIndex === -1) {
      measurements.push(this.edited);
    } else {
      measurements[this.editedIndex] = this.edited;
    }
    this.closeMeasurement();

    this.measurements.set(measurements);
    this.measurementsChange.emit(this.measurements());
  }

  public onDimensionChange(dimension?: PhysicalDimension): void {
    this.edited = { ...this.edited, ...dimension! } as PhysicalMeasurement;
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
    this.measurementsChange.emit(this.measurements());
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
    this.measurementsChange.emit(this.measurements());
  }

  public deleteMeasurement(index: number) {
    const measurements = [...this.measurements()];
    measurements.splice(index, 1);

    this.measurements.set(measurements);
    this.measurementsChange.emit(this.measurements());
  }
}
