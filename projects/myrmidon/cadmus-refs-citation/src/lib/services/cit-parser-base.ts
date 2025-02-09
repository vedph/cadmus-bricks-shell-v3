import { CitScheme } from '../models';
import { CitationModel } from './cit-scheme.service';

export abstract class CitParserBase {
  public toString(citation: CitationModel, scheme: CitScheme): string {
    const sb: string[] = [];

    for (let i = 0; i < citation.length; i++) {
      // prepend prefix if any
      const seps = scheme.parser?.separators[citation[i].step];
      if (seps?.prefix) {
        sb.push(seps.prefix);
      }
      // append step
      sb.push(citation[i].value);
      // append suffix if any
      if (seps?.suffix) {
        sb.push(seps.suffix);
      }
    }

    return sb.join('');
  }
}
