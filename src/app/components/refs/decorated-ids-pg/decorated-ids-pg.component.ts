import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';

import {
  DecoratedId,
  DecoratedIdsComponent,
} from '@myrmidon/cadmus-refs-decorated-ids';

@Component({
  selector: 'app-decorated-ids-pg',
  templateUrl: './decorated-ids-pg.component.html',
  styleUrls: ['./decorated-ids-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    DecoratedIdsComponent,
  ],
})
export class DecoratedIdsPgComponent {
  public ids: DecoratedId[];

  constructor() {
    this.ids = [
      {
        id: 'alpha',
        rank: 1,
        tag: 'tag',
        sources: [
          {
            type: 'corpus',
            citation: 'CIL X 123',
          },
        ],
      },
    ];
  }

  public onIdsChange(ids: DecoratedId[]): void {
    this.ids = ids;
  }
}
