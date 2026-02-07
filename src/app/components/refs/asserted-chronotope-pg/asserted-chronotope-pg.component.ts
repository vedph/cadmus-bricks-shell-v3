import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';
import { BiblissimaRefLookupService } from '@myrmidon/cadmus-refs-biblissima-lookup';

import {
  AssertedChronotope,
  AssertedChronotopeComponent,
} from '@myrmidon/cadmus-refs-asserted-chronotope';
import { AssertedChronotopesPipe } from '@myrmidon/cadmus-refs-asserted-chronotope';

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
    MatCheckbox,
    AssertedChronotopeComponent,
    AssertedChronotopesPipe,
  ],
})
export class AssertedChronotopePgComponent implements OnInit {
  public chronotope?: AssertedChronotope;
  public readonly placeLookupConfig = signal<RefLookupConfig | undefined>(
    undefined,
  );
  public refTypeEntries: ThesaurusEntry[] = [
    { id: 'biblio', value: 'bibliography' },
    { id: 'cit', value: 'citation' },
  ];
  public readonly placeLookup: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  constructor(private _biblissimaService: BiblissimaRefLookupService) {}

  public togglePlaceLookup(on: boolean) {
    if (on) {
      this.placeLookupConfig.set({
        name: 'Biblissima+',
        iconUrl: '/img/biblissima128.png',
        description: 'Biblissima+ geographical locations',
        label: 'place',
        service: this._biblissimaService,
        itemIdGetter: (item: any) => item?.id,
        itemLabelGetter: (item: any) => item?.name,
        // Q26719 = "geographical location" in Biblissima
        options: { type: 'Q26719' },
      });
      // Q27247 = "Rome" in Biblissima (geographical location)
      this.chronotope = {
        ...this.chronotope,
        place: {
          value: 'Q27247',
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
      };
    } else {
      this.placeLookupConfig.set(undefined);
    }
  }

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
