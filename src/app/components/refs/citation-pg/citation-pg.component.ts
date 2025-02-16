import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  CitationComponent,
  CitationModel,
} from '../../../../../projects/myrmidon/cadmus-refs-citation/src/public-api';

@Component({
  selector: 'app-citation-pg',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    CitationComponent,
  ],
  templateUrl: './citation-pg.component.html',
  styleUrl: './citation-pg.component.scss',
})
export class CitationPgComponent {
  public citation?: CitationModel = [
    { step: 'cantica', value: '1' },
    { step: 'canto', value: '26' },
    { step: 'verso', value: '112' },
  ];

  public onCitationChange(citation?: CitationModel): void {
    this.citation = citation;
  }
}
