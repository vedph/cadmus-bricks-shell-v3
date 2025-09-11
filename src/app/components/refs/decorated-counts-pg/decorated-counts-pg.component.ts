import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { MatCardModule } from '@angular/material/card';

import {
  DecoratedCount,
  DecoratedCountsComponent,
} from '@myrmidon/cadmus-refs-decorated-counts';

@Component({
  selector: 'app-decorated-counts-pg',
  templateUrl: './decorated-counts-pg.component.html',
  styleUrls: ['./decorated-counts-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    DecoratedCountsComponent,
  ],
})
export class DecoratedCountsPgComponent {
  public counts: DecoratedCount[];
  public idEntries: ThesaurusEntry[];

  constructor() {
    this.idEntries = [
      {
        id: 'sheets',
        value: 'sheets',
      },
      {
        id: 'g-sheets',
        value: 'guard sheets',
      },
    ];
    this.counts = [
      {
        id: 'sheets',
        value: 20,
      },
      {
        id: 'g-sheets',
        value: 4,
      },
    ];
  }

  public onCountsChange(counts?: DecoratedCount[]): void {
    this.counts = counts!;
  }
}
