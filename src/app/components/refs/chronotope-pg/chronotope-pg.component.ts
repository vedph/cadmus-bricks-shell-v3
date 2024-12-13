import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  Chronotope,
  ChronotopeComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-chronotope/src/public-api';

@Component({
  selector: 'app-chronotope-pg',
  templateUrl: './chronotope-pg.component.html',
  styleUrls: ['./chronotope-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ChronotopeComponent,
  ],
})
export class ChronotopePgComponent implements OnInit {
  public chronotope?: Chronotope;

  public ngOnInit(): void {
    this.chronotope = {
      place: 'Rome',
      date: {
        a: {
          value: 123,
          isApproximate: true,
        },
      },
    };
  }

  public onChronotopeChange(chronotope?: Chronotope): void {
    this.chronotope = chronotope;
  }
}
