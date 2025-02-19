import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  CIT_SCHEME_SERVICE_TOKEN,
  Citation,
  CitationSpan,
  CitSchemeService,
  CompactCitationComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-citation/src/public-api';

@Component({
  selector: 'app-compact-citation-pg',
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
    CompactCitationComponent,
  ],
  templateUrl: './compact-citation-pg.component.html',
  styleUrl: './compact-citation-pg.component.scss',
})
export class CompactCitationPgComponent {
  public citation?: Citation | CitationSpan;

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _service: CitSchemeService
  ) {}

  public onCitationChange(citation?: Citation | CitationSpan): void {
    this.citation = citation;
  }
}
