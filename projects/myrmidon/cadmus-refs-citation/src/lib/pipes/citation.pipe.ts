import { Inject, Pipe, PipeTransform } from '@angular/core';

import { Citation, CitationSpan } from '../models';
import { CitSchemeService } from '../services/cit-scheme.service';

/**
 * A pipe to format a citation or citation span as a string. Usage:
 *
 * ```html
 * {{ cit | citation }}
 * ```
 */
@Pipe({
  name: 'citation',
})
export class CitationPipe implements PipeTransform {
  constructor(private _schemeService: CitSchemeService) {}

  public transform(
    citation: Citation | CitationSpan | null | undefined
  ): string {
    if (!citation) {
      return '';
    }
    return this._schemeService.toString(citation);
  }
}
