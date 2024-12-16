import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import {
  AssertedChronotope,
  AssertedChronotopeComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-asserted-chronotope/src/lib/asserted-chronotope/asserted-chronotope.component';
import { AssertedChronotopesPipe } from '../../../../../projects/myrmidon/cadmus-refs-asserted-chronotope/src/public-api';

@Component({
  selector: 'app-asserted-chronotope-pg',
  templateUrl: './asserted-chronotope-pg.component.html',
  styleUrls: ['./asserted-chronotope-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    AssertedChronotopeComponent,
    AssertedChronotopesPipe,
  ],
})
export class AssertedChronotopePgComponent implements OnInit {
  public chronotope?: AssertedChronotope;

  public ngOnInit(): void {
    this.chronotope = {
      place: {
        value: 'Rome',
        assertion: {
          rank: 2,
          references: [
            {
              type: 'biblio',
              citation: 'Rossi 1963',
            },
          ],
        },
      },
      date: {
        a: {
          value: 123,
        },
        assertion: {
          rank: 1,
          references: [
            {
              type: 'CIL',
              citation: '1.23',
            },
          ],
        },
      },
    };
  }

  public onChronotopeChange(chronotope: AssertedChronotope): void {
    this.chronotope = chronotope;
  }

  public reset(): void {
    this.chronotope = {};
  }
}
