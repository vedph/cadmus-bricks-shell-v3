import { CommonModule, JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  PhysicalGridLocation,
  PhysicalGridLocationComponent,
} from '../../../../../projects/myrmidon/cadmus-mat-physical-grid/src/public-api';

@Component({
  selector: 'app-physical-grid-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    JsonPipe,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PhysicalGridLocationComponent,
  ],
  templateUrl: './physical-grid-pg.component.html',
  styleUrl: './physical-grid-pg.component.scss',
})
export class PhysicalGridPgComponent {
  public location: PhysicalGridLocation = {
    rows: 3,
    columns: 4,
    coords: [
      {
        row: 2,
        column: 2,
      },
      {
        row: 3,
        column: 3,
      },
    ],
  };
  public presets = ['normal: 4x3', 'large: 6x5', 'small: 3x3'];

  public mode: FormControl<'single' | 'multiple' | 'contiguous'>;
  public required: FormControl<boolean>;
  public collapsedGrid: FormControl<boolean>;

  constructor(formBuilder: FormBuilder) {
    this.mode = formBuilder.control('contiguous', { nonNullable: true });
    this.required = formBuilder.control(false, { nonNullable: true });
    this.collapsedGrid = formBuilder.control(false, { nonNullable: true });
  }

  public onLocationChange(location: PhysicalGridLocation): void {
    this.location = location;
  }

  public onCollapsedGridChange(collapsed: boolean): void {
    this.collapsedGrid.setValue(collapsed);
  }
}
