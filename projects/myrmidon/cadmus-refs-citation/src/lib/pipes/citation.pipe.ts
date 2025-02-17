import { Inject, Pipe, PipeTransform } from '@angular/core';

import { Citation } from '../models';
import {
  CIT_SCHEME_SERVICE_TOKEN,
  CitSchemeService,
} from '../services/cit-scheme.service';

/**
 * A pipe to format a citation as a string. Usage:
 *
 * ```html
 * {{ citation | citation: 'dc' }}
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
    citation: Citation | null | undefined,
    defaultSchemeId: string
  ): string {
    if (!citation) {
      return '';
    }
    return this._schemeService.toString(citation, defaultSchemeId);
  }
}
