import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitationComponent,
  CitationError,
  CitationModel,
  CitSchemeService,
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
    MatTooltipModule,
    CitationComponent,
  ],
  templateUrl: './citation-pg.component.html',
  styleUrl: './citation-pg.component.scss',
})
export class CitationPgComponent {
  public citation?: CitationModel;
  public citText?: string;
  public error?: CitationError;
  public citations: CitationModel[] = [];

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _service: CitSchemeService
  ) {
    this.citation = this._service.parse('If. XXVI 112', 'dc');
    this.citText = this._service.toString(this.citation, 'dc');
  }

  public onCitationChange(citation?: CitationModel): void {
    this.citation = citation;
    this.citText = citation ? this._service.toString(citation, 'dc') : '';
  }

  public onCitationValidate(error: CitationError | null): void {
    this.error = error || undefined;
  }

  public addCitation(): void {
    if (this.citation) {
      this.citations.push(this.citation);
    }
  }

  public removeCitation(index: number): void {
    const citations = this.citations.filter((_, i) => i !== index);
    this._service.sortCitations(citations, 'dc');
    this.citations = citations;
  }
}
