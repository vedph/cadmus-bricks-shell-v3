import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { MatCardModule } from '@angular/material/card';

import {
  DecoratedCount,
  DecoratedCountsComponent,
} from '@myrmidon/cadmus-refs-decorated-counts';
import { MatCheckbox } from "@angular/material/checkbox";

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
    MatCheckbox
],
})
export class DecoratedCountsPgComponent {
  public counts: DecoratedCount[];
  public idEntries: ThesaurusEntry[];

  public readonly distinct: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly allowCustomId: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });

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
