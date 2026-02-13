import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

import {
  AssertedHistoricalDate,
  AssertedHistoricalDateComponent,
} from '@myrmidon/cadmus-refs-historical-date';

@Component({
  selector: 'app-asserted-historical-date-pg',
  templateUrl: './asserted-historical-date-pg.component.html',
  styleUrls: ['./asserted-historical-date-pg.component.css'],
  imports: [CommonModule, MatCardModule, AssertedHistoricalDateComponent],
})
export class AssertedHistoricalDatePgComponent implements OnInit {
  public date?: AssertedHistoricalDate;

  public ngOnInit(): void {
    this.date = {
      a: { value: 123 },
      tag: 'sample',
    };
  }

  public onDateChange(date?: AssertedHistoricalDate): void {
    this.date = date;
  }
}
