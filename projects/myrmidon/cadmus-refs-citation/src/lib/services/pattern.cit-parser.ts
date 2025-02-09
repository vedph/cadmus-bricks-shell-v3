import { CitationModel, CitScheme } from '../models';
import { CitParser } from './cit-scheme.service';

/**
 * Pattern-based citation parser. This relies on the path pattern defined
 * in the scheme's parser options to parse the citation text.
 */
export class PatternCitParser implements CitParser {
  public parse(text: string, scheme: CitScheme): CitationModel {
    const result: CitationModel = [];
    const pattern = new RegExp(scheme.textOptions?.pathPattern || '', 'g');
    const match = pattern.exec(text);
    if (!match) {
      return result;
    }

    for (let i = 1; i < scheme.path.length; i++) {
      const step = scheme.steps[scheme.path[i]];
      const value = match[i];

      // calculate n: if the step is numeric, this is the numeric value
      // (parsed from its formatted representation if there is a formatter);
      // if it is a string coming from a set, this is the ordinal of the
      // value in the set; otherwise, it is undefined.
      let n: number | undefined;
      // TODO
    }

    return result;
  }

  public toString(citation: CitationModel, scheme: CitScheme): string {
    const sb: string[] = [];

    for (let i = 0; i < citation.length; i++) {
      // prepend prefix if any
      const seps = scheme.textOptions?.separators[citation[i].step];
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
