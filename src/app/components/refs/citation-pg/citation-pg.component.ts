import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { deepCopy } from '@myrmidon/ngx-tools';

import {
  CitationComponent,
  CitationError,
  Citation,
  CitSchemeService,
  CitationPipe,
  CitationViewComponent,
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
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    CitationComponent,
    CitationViewComponent,
    CitationPipe,
  ],
  templateUrl: './citation-pg.component.html',
  styleUrl: './citation-pg.component.scss',
})
export class CitationPgComponent {
  private _nextVerse = 1;

  public citation?: Citation;
  public citText?: string;
  public error?: CitationError;
  public citations: Citation[] = [];

  public readonly allowFreeMode: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public readonly allowPartial: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });

  constructor(private _service: CitSchemeService) {
    this.citation = this._service.parse('If. XXVI 112', 'dc')!;
    this.citText = this._service.toString(this.citation);
  }

  public onCitationChange(citation?: Citation): void {
    this.citation = citation;
    this.citText = citation ? this._service.toString(citation) : '';
  }

  public resetCitation(): void {
    this.citation = undefined;
    this.citText = undefined;
    this._nextVerse = 1;
  }

  public setCitation(): void {
    this.citation = this._service.parse(`If. XXVI ${this._nextVerse++}`, 'dc')!;
    if (this._nextVerse >= 100) {
      this._nextVerse = 1;
    }
  }

  public addCitation(): void {
    if (!this.citation) {
      return;
    }
    const citations = [...this.citations];
    citations.push(deepCopy(this.citation));
    this._service.sortCitations(citations, 'dc');
    this.citations = citations;
  }

  public removeCitation(index: number): void {
    const citations = this.citations.filter((_, i) => i !== index);
    this.citations = citations;
  }
}
