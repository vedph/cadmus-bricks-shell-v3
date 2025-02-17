import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitationComponent,
  CitationError,
  CitationModel,
  CitSchemeService,
} from '../../../../../projects/myrmidon/cadmus-refs-citation/src/public-api';
import { PatternCitParser } from '../../../../../projects/myrmidon/cadmus-refs-citation/src/lib/services/pattern.cit-parser';

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
  public citation?: CitationModel;
  public error?: CitationError;

  constructor(@Inject(CIT_SCHEME_SERVICE_TOKEN) service: CitSchemeService) {
    const parser = new PatternCitParser(service);
    this.citation = parser.parse('If. XXVI 112', 'dc');
  }

  public onCitationChange(citation?: CitationModel): void {
    this.citation = citation;
  }

  public onCitationValidate(error: CitationError | null): void {
    this.error = error || undefined;
  }
}
