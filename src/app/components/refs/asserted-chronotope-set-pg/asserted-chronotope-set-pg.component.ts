import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import { RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';
import { BiblissimaRefLookupService } from '@myrmidon/cadmus-refs-biblissima-lookup';

import {
  AssertedChronotope,
  AssertedChronotopeSetComponent,
  AssertedChronotopesPipe,
} from '@myrmidon/cadmus-refs-asserted-chronotope';

@Component({
  selector: 'app-asserted-chronotope-set-pg',
  templateUrl: './asserted-chronotope-set-pg.component.html',
  styleUrls: ['./asserted-chronotope-set-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    AssertedChronotopeSetComponent,
    AssertedChronotopesPipe,
  ],
})
export class AssertedChronotopeSetPgComponent {
  public chronotopes: AssertedChronotope[];
  public placeLookupConfig: RefLookupConfig;

  constructor(biblissimaService: BiblissimaRefLookupService) {
    this.placeLookupConfig = {
      name: 'Biblissima+',
      iconUrl: '/img/biblissima128.png',
      description: 'Biblissima+ geographical locations',
      label: 'place',
      service: biblissimaService,
      itemIdGetter: (item: any) => item?.id,
      itemLabelGetter: (item: any) => item?.name,
      // Q26719 = "geographical location" in Biblissima
      options: { type: 'Q26719' },
    };
    this.chronotopes = [
      {
        place: {
          // Q27247 = "Rome" in Biblissima
          value: 'Q27247',
        },
      },
    ];
  }

  public onChronotopesChange(chronotopes: AssertedChronotope[]): void {
    this.chronotopes = chronotopes;
  }
}
