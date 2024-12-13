import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  ExternalId,
  ExternalIdsComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-external-ids/src/public-api';

@Component({
  selector: 'app-external-ids-pg',
  templateUrl: './external-ids-pg.component.html',
  styleUrls: ['./external-ids-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    ExternalIdsComponent,
  ],
})
export class ExternalIdsPgComponent {
  public hasRank: FormControl;

  public ids?: ExternalId[];
  public scopeEntries: ThesaurusEntry[];
  public tagEntries: ThesaurusEntry[];

  constructor(formBuilder: FormBuilder) {
    this.hasRank = formBuilder.control(false);

    this.scopeEntries = [
      {
        id: 'red',
        value: 'red',
      },
      {
        id: 'green',
        value: 'green',
      },
      {
        id: 'blue',
        value: 'blue',
      },
    ];

    this.tagEntries = [
      {
        id: 'alpha',
        value: 'alpha',
      },
      {
        id: 'beta',
        value: 'beta',
      },
    ];

    this.ids = [
      {
        value: 'http://some-resources/alpha',
      },
    ];
  }

  public onIdsChange(ids: ExternalId[]): void {
    this.ids = ids;
  }
}
