import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { MatCardModule } from '@angular/material/card';

import {
  DocReference,
  DocReferencesComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-doc-references/src/public-api';

@Component({
  selector: 'app-doc-references-pg',
  templateUrl: './doc-references-pg.component.html',
  styleUrls: ['./doc-references-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    DocReferencesComponent,
  ],
})
export class DocReferencesPgComponent {
  public references: DocReference[];
  public typeEntries: ThesaurusEntry[];

  constructor() {
    this.references = [
      {
        tag: 'biblio',
        citation: 'Rossi 1963',
      },
    ];
    this.typeEntries = [
      {
        id: 'text',
        value: 'text',
      },
      {
        id: 'book',
        value: 'book',
      },
      {
        id: 'biblio',
        value: 'bibliography',
      },
      {
        id: 'ms',
        value: 'manuscript',
      },
      {
        id: 'doc',
        value: 'archive document',
      },
    ];
  }

  public onReferencesChange(model: DocReference[]): void {
    this.references = model;
  }
}
