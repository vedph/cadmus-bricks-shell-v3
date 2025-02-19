import { Component, computed, input, model } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Citation, CitationSpan } from '../../models';
import { CitationViewComponent } from '../citation-view/citation-view.component';
import { CitationComponent } from '../citation/citation.component';

/**
 * Compact citation component.
 * This component is used to display a citation or citation span in a compact
 * form, and edit it in a citation editor for a single citation, or in two
 * citation editors for a range of citations.
 */
@Component({
  selector: 'cadmus-refs-compact-citation',
  imports: [
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    CitationViewComponent,
    CitationComponent,
  ],
  templateUrl: './compact-citation.component.html',
  styleUrl: './compact-citation.component.css',
})
export class CompactCitationComponent {
  /**
   * The citation or citation span to edit.
   */
  public readonly citation = model<Citation | CitationSpan>();

  /**
   * The default scheme ID to use when no scheme is specified.
   */
  public readonly defaultSchemeId = computed<string>(() => {
    if (!this.citation()) {
      return '';
    }
    // if it's a span, use its a's scheme ID
    if ((this.citation() as CitationSpan).a) {
      return (this.citation() as CitationSpan).a.schemeId;
    }
    // if it's a citation, use its scheme ID
    return (this.citation() as Citation).schemeId;
  });

  public readonly a = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    if ((this.citation() as CitationSpan).a) {
      return (this.citation() as CitationSpan).a;
    }
    return this.citation() as Citation;
  });

  public readonly b = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    return (this.citation() as CitationSpan).b;
  });

  public editorExpanded?: boolean;

  public onAChange(citation?: Citation): void {
    if (!citation) {
      return;
    }
    if ((this.citation() as CitationSpan)?.a) {
      this.citation.set({
        ...this.citation(),
        a: citation!,
      });
    } else {
      this.citation.set(citation!);
    }
  }

  public onBChange(citation?: Citation): void {
    if (!citation) {
      return;
    }

    if ((this.citation() as CitationSpan)?.a) {
      this.citation.set({
        ...this.citation(),
        b: citation,
      } as CitationSpan);
    } else {
      this.citation.set(citation!);
    }
  }
}
