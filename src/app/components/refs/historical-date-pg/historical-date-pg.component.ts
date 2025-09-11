import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';

import {
  HistoricalDate,
  HistoricalDateComponent,
  HistoricalDateModel,
  HistoricalDatePipe,
} from '@myrmidon/cadmus-refs-historical-date';

@Component({
  selector: 'app-historical-date-pg',
  templateUrl: './historical-date-pg.component.html',
  styleUrls: ['./historical-date-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    HistoricalDateComponent,
    HistoricalDatePipe,
  ],
})
export class HistoricalDatePgComponent implements OnInit {
  public date?: HistoricalDateModel;

  public ngOnInit(): void {
    this.date = HistoricalDate.parse('c.12 may 23 BC? {a hint}')!;
  }

  public onDateChange(date?: HistoricalDateModel): void {
    this.date = date;
  }
}
