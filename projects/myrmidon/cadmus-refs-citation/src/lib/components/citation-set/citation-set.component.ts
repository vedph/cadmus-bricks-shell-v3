import { Component, computed, Inject, input, model } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Citation, CitationSpan } from '../../models';
import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitSchemeService,
} from '../../services/cit-scheme.service';
import { CitationViewComponent } from '../citation-view/citation-view.component';

/**
 * Component used to edit a set of citations or citations spans.
 */
@Component({
  selector: 'cadmus-refs-citation-set',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    CitationViewComponent,
  ],
  templateUrl: './citation-set.component.html',
  styleUrl: './citation-set.component.css',
})
export class CitationSetComponent {
  public readonly citations = model<(Citation | CitationSpan)[]>();

  public readonly defaultSchemeId = input<string>('');

  public readonly editedCitations = computed<(Citation | CitationSpan)[]>(
    () => {
      return this._schemeService.compactCitations(this.citations() || []);
    }
  );

  public editedCitation?: Citation | CitationSpan;
  public editedCitationIndex?: number;

  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {}

  private sortCitations(citations: (Citation | CitationSpan)[]): void {
    // map citations to their corresponding Citation objects
    const mappedCits: Citation[] = citations.map((c, i) => {
      const span = c as CitationSpan;
      return span.b ? span.a! : (c as Citation);
    });

    // sort the mapped citations
    this._schemeService.sortCitations(mappedCits, this.defaultSchemeId());

    // create a map of original indexes to sorted indexes
    const indexMap = new Map<Citation, number>();
    mappedCits.forEach((cit, index) => {
      indexMap.set(cit, index);
    });

    // sort the original citations array based on the sorted mappedCits
    citations.sort((a, b) => {
      const aCit = (a as CitationSpan).b
        ? (a as CitationSpan).a!
        : (a as Citation);
      const bCit = (b as CitationSpan).b
        ? (b as CitationSpan).a!
        : (b as Citation);
      return (indexMap.get(aCit) ?? 0) - (indexMap.get(bCit) ?? 0);
    });
  }

  public sort(): void {
    this.sortCitations(this.editedCitations());
  }

  public editCitation(index: number): void {
    this.editedCitation = this.editedCitations()[index];
    this.editedCitationIndex = index;
  }

  public moveCitationUp(index: number): void {
    if (index < 1) {
      return;
    }
    const citations = [...this.editedCitations()];
    const item = citations[index];
    citations.splice(index, 1);
    citations.splice(index - 1, 0, item);

    this.citations.set(citations);
  }

  public moveCitationDown(index: number): void {
    if (index + 1 >= this.editedCitations().length) {
      return;
    }
    const citations = [...this.editedCitations()];
    const item = citations[index];
    citations.splice(index, 1);
    citations.splice(index + 1, 0, item);

    this.citations.set(citations);
  }

  public deleteCitation(index: number) {
    const citations = [...this.editedCitations()];
    citations.splice(index, 1);

    this.citations.set(citations);
  }
}
