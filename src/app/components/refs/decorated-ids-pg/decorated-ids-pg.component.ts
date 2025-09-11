import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
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
  public readonly ids = signal<DecoratedId[]>([]);

  constructor() {
    this.ids.set([
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
    ]);
  }

  public onIdsChange(ids: DecoratedId[]): void {
    this.ids.set(ids);
  }
}
