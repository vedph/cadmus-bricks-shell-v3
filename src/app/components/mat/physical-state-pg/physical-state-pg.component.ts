import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  PhysicalStateComponent,
  PhysicalState,
} from '@myrmidon/cadmus-mat-physical-state';

@Component({
  selector: 'app-physical-state-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PhysicalStateComponent,
  ],
  templateUrl: './physical-state-pg.component.html',
  styleUrl: './physical-state-pg.component.scss',
})
export class PhysicalStatePgComponent {
  public stateEntries: ThesaurusEntry[] = [
    {
      id: 'q1',
      value: 'bad',
    },
    {
      id: 'q2',
      value: 'good',
    },
    {
      id: 'q3',
      value: 'excellent',
    },
  ];
  public featEntries: ThesaurusEntry[] = [
    {
      id: 'broken',
      value: 'broken',
    },
    {
      id: 'scratched',
      value: 'scratched',
    },
    {
      id: 'dirty',
      value: 'dirty',
    },
    {
      id: 'torn',
      value: 'torn',
    },
  ];
  public state: PhysicalState = {
    type: 'q2',
    features: ['broken', 'scratched'],
    date: '2021-12-01',
    reporter: 'John Doe',
    note: 'A note about this state.',
  };

  public onStateChange(state?: PhysicalState): void {
    this.state = state!;
  }
}
