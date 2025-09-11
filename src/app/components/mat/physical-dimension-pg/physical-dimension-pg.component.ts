import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  PhysicalDimension,
  PhysicalDimensionComponent,
} from '@myrmidon/cadmus-mat-physical-size';

@Component({
  selector: 'app-physical-dimension-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    PhysicalDimensionComponent,
  ],
  templateUrl: './physical-dimension-pg.component.html',
  styleUrls: ['./physical-dimension-pg.component.scss'],
})
export class PhysicalDimensionPgComponent {
  public dimension: PhysicalDimension = {
    tag: 'width',
    value: 10,
    unit: 'mm',
  };
  public unitEntries: ThesaurusEntry[] = [
    {
      id: 'mm',
      value: 'mm',
    },
    {
      id: 'cm',
      value: 'cm',
    },
  ];
  public unitDisabled = new FormControl<boolean>(false, { nonNullable: true });

  public onDimensionChange(dimension: PhysicalDimension): void {
    this.dimension = dimension;
  }
}
