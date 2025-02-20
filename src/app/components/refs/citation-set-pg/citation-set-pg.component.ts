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
  CitationSetComponent,
  CitationSpan,
  CitSchemeService,
} from '../../../../../projects/myrmidon/cadmus-refs-citation/src/public-api';

@Component({
  selector: 'app-citation-set-pg',
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
    CitationSetComponent,
  ],
  templateUrl: './citation-set-pg.component.html',
  styleUrl: './citation-set-pg.component.scss',
})
export class CitationSetPgComponent {
  public citations: (Citation | CitationSpan)[] = [];

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {
    this.citations.push(this._schemeService.parse('@dc:If. I 12', 'dc')!);
    this.citations.push(this._schemeService.parse('@dc:Purg. IV 32', 'dc')!);
    this.citations.push(this._schemeService.parse('@dc:Par. V 79', 'dc')!);
    this.citations.push(this._schemeService.parse('@od:α 22', 'dc')!);
    this.citations.push(this._schemeService.parse('@od:γ 178', 'dc')!);
  }
}
