import { Component, computed, input, output } from '@angular/core';

import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

import { Citation, CitationSpan } from '../../models';
import { CitSchemeService } from '../../services/cit-scheme.service';

/**
 * A component to display a citation or a citation span.
 */
@Component({
  selector: 'cadmus-refs-citation-view',
  imports: [MatTooltipModule, ColorToContrastPipe],
  templateUrl: './citation-view.component.html',
  styleUrl: './citation-view.component.css',
})
export class CitationViewComponent {
  /**
   * The citation to display, which can be its model or its textual
   * representation. When the citation is rather a range, it can be
   * either a CitationSpan or a text using " - " as separator.
   */
  public readonly citation = input<string | Citation | CitationSpan>();
  /**
   * The default scheme ID to use when no scheme is specified in the
   * citation's text.
   */
  public readonly defaultSchemeId = input.required<string>();

  /**
   * True to make this view clickable, and emit the "click" event
   * when clicked.
   */
  public readonly clickable = input<boolean>(false);

  /**
   * Emitted when the citation is clicked. Value is true if B was
   * clicked, else (A clicked) false.
   */
  public readonly click = output<boolean>();

  constructor(private _schemeService: CitSchemeService) {}

  public readonly a = computed<Citation | undefined>(() => {
    if (!this.citation()) {
      return undefined;
    }
    if (typeof this.citation() === 'string') {
      const s = this.citation() as string;
      const parts = s.split(' - ');
      return this._schemeService.parse(parts[0], this.defaultSchemeId());
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
    if (typeof this.citation() === 'string') {
      const s = this.citation() as string;
      const parts = s.split(' - ');
      if (parts.length > 1) {
        return this._schemeService.parse(parts[1], this.defaultSchemeId());
      }
      return undefined;
    }
    return (this.citation() as CitationSpan).b;
  });

  public onTermClick(b: boolean, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.clickable() && this.citation()) {
      this.click.emit(b);
    }
  }
}
