import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  PhysicalMeasurementSetComponent,
  PhysicalMeasurement,
} from '@myrmidon/cadmus-mat-physical-size';

@Component({
  selector: 'app-physical-measurement-set-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    PhysicalMeasurementSetComponent,
  ],
  templateUrl: './physical-measurement-set-pg.component.html',
  styleUrl: './physical-measurement-set-pg.component.scss',
})
export class PhysicalMeasurementSetPgComponent {
  public distinct: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  public measurements: PhysicalMeasurement[] = [
    {
      name: 'width',
      value: 10,
      unit: 'cm',
    },
  ];
  // public nameEntries: ThesaurusEntry[] = [];
  public nameEntries: ThesaurusEntry[] = [
    { id: 'a', value: 'alpha' },
    { id: 'b', value: 'beta' },
    { id: 'g', value: 'gamma' },
  ];
  public unitEntries: ThesaurusEntry[] = [
    { id: 'cm', value: 'cm' },
    { id: 'mm', value: 'mm' },
  ];

  public onMeasurementsChange(measurements?: PhysicalMeasurement[]): void {
    this.measurements = measurements!;
  }
}
