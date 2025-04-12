import { Component, computed, Inject, input, model } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { Citation, CitationSpan } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';
import { CitationViewComponent } from '../citation-view/citation-view.component';
import { CompactCitationComponent } from '../compact-citation/compact-citation.component';

/**
 * Component used to edit a set of citations or citations spans.
 */
@Component({
  selector: 'cadmus-refs-citation-set',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    CitationViewComponent,
    CompactCitationComponent,
    ColorToContrastPipe,
  ],
  templateUrl: './citation-set.component.html',
  styleUrl: './citation-set.component.css',
})
export class CitationSetComponent {
  /**
   * The scheme keys to use in this component. The full list of schemes is
   * drawn from the service, but users might want to restrict the list to
   * a subset of schemes.
   */
  public readonly schemeKeys = input<string[]>();

  /**
   * True if the component allows free mode, where the user can type the
   * citation as a free text, using the scheme parser.
   */
  public readonly allowFreeMode = input<boolean>();

  /**
   * True if the component allows a partial citation, i.e. a citation
   * missing the final step(s) starting from the first one defined as
   * optional in the scheme.
   */
  public readonly allowPartial = input<boolean>();

  /**
   * The citations or citations spans to edit.
   */
  public readonly citations = model<(Citation | CitationSpan)[]>();

  /**
   * The default scheme ID.
   */
  public readonly defaultSchemeId = input<string>('');

  public readonly editedCitations = computed<(Citation | CitationSpan)[]>(
    () => {
      return this._schemeService.compactCitations(this.citations() || []);
    }
  );

  public editedCitation?: Citation | CitationSpan;
  public editedCitationIndex?: number;

  constructor(private _schemeService: CitSchemeService) {}

  private sortCitations(citations: (Citation | CitationSpan)[]): void {
    // map citations to their corresponding Citation objects
    const mappedCits: Citation[] = citations.map((c, i) => {
      const span = c as CitationSpan;
      return span.b ? span.a! : (c as Citation);
    });

    // create an array of indexes
    const indexes = mappedCits.map((_, index) => index);

    // sort the mapped citations and indexes together
    indexes.sort((a, b) => {
      const citA = mappedCits[a];
      const citB = mappedCits[b];
      return this._schemeService.compareCitations(citA, citB);
    });

    // sort the original citations array based on the sorted indexes
    const sortedCitations = indexes.map((index) => citations[index]);

    this.citations.set(sortedCitations);
  }

  public sort(): void {
    this.sortCitations(this.editedCitations());
  }

  public newCitation(): void {
    const schemeId =
      this.defaultSchemeId() || this._schemeService.getSchemes()[0].id;
    this.editedCitation = this._schemeService.createEmptyCitation(schemeId);
    this.editedCitationIndex = -1;
  }

  public editCitation(index: number): void {
    this.editedCitation = this.editedCitations()[index];
    this.editedCitationIndex = index;
  }

  public closeCitation(): void {
    this.editedCitation = undefined;
    this.editedCitationIndex = undefined;
  }

  public saveCitation(citation: Citation | CitationSpan): void {
    const citations = [...this.editedCitations()];

    if (this.editedCitationIndex === -1) {
      citations.push(citation);
    } else {
      citations.splice(this.editedCitationIndex!, 1, citation);
    }
    this._schemeService.compactCitations(citations);
    this.citations.set(citations);
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

  public getSchemeColor(id: string): string {
    return this._schemeService.getScheme(id)?.color || 'transparent';
  }
}
