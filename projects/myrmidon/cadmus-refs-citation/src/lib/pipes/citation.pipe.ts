import { Inject, Pipe, PipeTransform } from '@angular/core';

import { Citation, CitationSpan } from '../models';
import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitSchemeService,
} from '../services/cit-scheme.service';

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
  constructor(
    @Inject(CIT_SCHEME_SERVICE_TOKEN) private _schemeService: CitSchemeService
  ) {}

  public transform(
    citation: Citation | CitationSpan | null | undefined
  ): string {
    if (!citation) {
      return '';
    }

    if ('a' in citation) {
      const span = citation as CitationSpan;
      const a = this._schemeService.toString(span.a);
      const b = span.b ? this._schemeService.toString(span.b) : undefined;
      return b ? `${a} - ${b}` : a;
    }

    return this._schemeService.toString(citation as Citation);
  }
}
