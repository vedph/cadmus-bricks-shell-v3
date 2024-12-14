import { Component } from '@angular/core';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import {
  AssertedProperName,
  CadmusProperNamePipe,
  ProperNameComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-proper-name/src/public-api';

@Component({
  selector: 'app-proper-name-pg',
  templateUrl: './proper-name-pg.component.html',
  styleUrls: ['./proper-name-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    ProperNameComponent,
    CadmusProperNamePipe,
  ],
})
export class ProperNamePgComponent {
  public initialName?: AssertedProperName;
  public name: AssertedProperName | undefined;
  public langEntries: ThesaurusEntry[] | undefined;
  public namePieceTypeEntries: ThesaurusEntry[] | undefined;
  public namePieceValueEntries: ThesaurusEntry[];

  constructor() {
    this.langEntries = [
      { id: 'ita', value: 'Italian' },
      { id: 'eng', value: 'English' },
      { id: 'fra', value: 'French' },
      { id: 'spa', value: 'Spanish' },
      { id: 'ger', value: 'German' },
      { id: 'lat', value: 'Latin' },
      { id: 'grc', value: 'Greek' },
      { id: 'gre', value: 'Modern Greek' },
    ];
    // for pipe: these are all the children values as collected
    // from the types entries
    this.namePieceValueEntries = [
      // { id: 'continent.europe', value: 'Europe' },
      // { id: 'continent.n-america', value: 'North America' },
      // { id: 'continent.s-america', value: 'South America' },
      // { id: 'continent.africa', value: 'Africa' },
      // { id: 'continent.asia', value: 'Asia' },
      // { id: 'continent.australia', value: 'Australia' },
      // { id: 'continent.antarctica', value: 'Antarctica' },
      { id: 'a.cr', value: 'Cannareggio' },
      { id: 'a.cs', value: 'Castello' },
      { id: 'a.dd', value: 'Dorsoduro' },
      { id: 'a.sm', value: 'San Marco' },
      { id: 'a.sp', value: 'San Polo' },
      { id: 'a.sc', value: 'Santa Croce' },
    ];
    this.configureAsAnthroponym();
  }

  public configureAsAnthroponym(): void {
    this.namePieceTypeEntries = [
      { id: 'first', value: 'first' },
      { id: 'last', value: 'last' },
      { id: 'name', value: 'name' },
      { id: 'title', value: 'title' },
      { id: 'praenomen', value: 'praenomen' },
      { id: 'nomen', value: 'nomen' },
      { id: 'cognomen', value: 'cognomen' },
    ];

    this.initialName = {
      language: 'lat',
      tag: 'free',
      pieces: [
        { type: 'praenomen', value: 'Publius' },
        { type: 'nomen', value: 'Vergilius' },
        { type: 'cognomen', value: 'Maro' },
      ],
      assertion: {
        rank: 2,
        note: 'a note',
        references: [
          {
            type: 'biblio',
            citation: 'Rossi 1963',
          },
        ],
      },
    };
  }

  public configureAsToponym(): void {
    this.namePieceTypeEntries = [
      // { id: 'continent*', value: 'continent' },
      // { id: 'continent.europe', value: 'Europe' },
      // { id: 'continent.n-america', value: 'North America' },
      // { id: 'continent.s-america', value: 'South America' },
      // { id: 'continent.africa', value: 'Africa' },
      // { id: 'continent.asia', value: 'Asia' },
      // { id: 'continent.australia', value: 'Australia' },
      // { id: 'continent.antarctica', value: 'Antarctica' },
      // { id: 'country*', value: 'country' },
      // { id: 'region*', value: 'region' },
      // { id: '_order', value: 'continent country region' },
      { id: 'p*', value: 'provincia' },
      { id: 'c*', value: 'città' },
      { id: 'a*', value: 'area' },
      { id: '_order', value: 'p c a l s' },
    ];

    this.initialName = {
      language: 'ita',
      tag: 'sample',
      pieces: [
        // { type: 'continent', value: 'continent.europe' },
        // { type: 'country', value: 'Italy' },
        // { type: 'region', value: 'Tuscany' },
        { type: 'p', value: 'VE' },
        { type: 'c', value: 'Venezia' },
        { type: 'a', value: 'Cannareggio' },
        { type: 'l', value: 'Fondamenta Daniele Canal' },
        { type: 's', value: 'Chiesa Santa Maria dei Servi' },
      ],
    };
  }

  public onNameChange(model: AssertedProperName | undefined): void {
    this.name = model;
  }
}
