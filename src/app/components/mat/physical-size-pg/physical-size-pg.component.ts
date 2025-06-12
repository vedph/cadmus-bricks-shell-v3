import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  PhysicalSize,
  PhysicalSizeComponent,
  PhysicalSizePipe,
} from '../../../../../projects/myrmidon/cadmus-mat-physical-size/src/public-api';

@Component({
  selector: 'app-physical-size-pg',
  templateUrl: './physical-size-pg.component.html',
  styleUrls: ['./physical-size-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    PhysicalSizeComponent,
    PhysicalSizePipe,
  ],
})
export class PhysicalSizePgComponent {
  public size?: PhysicalSize;
  public defaultUnit = 'cm';
  public unitEntries: ThesaurusEntry[];
  public hBeforeW: FormControl<boolean>;

  constructor(formBuilder: FormBuilder) {
    this.hBeforeW = formBuilder.control(false, { nonNullable: true });
    this.size = {
      w: {
        value: 21,
        unit: 'cm',
      },
      h: {
        value: 29.7,
        unit: 'cm',
        tag: 'incomplete',
      },
    };
    this.unitEntries = [
      {
        id: 'mm',
        value: 'mm',
      },
      {
        id: 'cm',
        value: 'cm',
      },
      {
        id: 'mt',
        value: 'mt',
      },
    ];
  }

  public onSizeChange(size?: PhysicalSize): void {
    this.size = size!;
  }

  public reset(): void {
    this.defaultUnit = this.defaultUnit === 'cm' ? 'mm' : 'cm';
    this.size = undefined;
  }
}
