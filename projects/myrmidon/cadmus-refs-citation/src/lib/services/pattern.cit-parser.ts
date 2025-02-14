import { CitationModel, CitScheme, CitSchemeStep } from '../models';
import { CitParser, CitSchemeService } from './cit-scheme.service';

/**
 * Pattern-based citation parser. This relies on the path pattern defined
 * in the scheme's textOptions to parse the citation text.
 */
export class PatternCitParser implements CitParser {
  private readonly _service: CitSchemeService;

  constructor(schemeService: CitSchemeService) {
    this._service = schemeService;
  }

  /**
   * Parse the specified text according to the specified citation scheme.
   * @param text The text to parse.
   * @param scheme The citation scheme.
   * @returns The parsed citation model.
   */
  public parse(text: string, scheme: CitScheme): CitationModel {
    const result: CitationModel = [];
    const pattern = new RegExp(scheme.textOptions?.pathPattern || '', 'g');
    const match = pattern.exec(text);
    if (!match) {
      return result;
    }

    for (let i = 0; i < scheme.path.length; i++) {
      // get the step and its value
      const stepName = scheme.path[i];
      const step: CitSchemeStep = scheme.steps[stepName];
      const value = match[i];
      if (!value) {
        break;
      }

      // calculate n: if the step is numeric, this is the numeric value
      // (parsed from its formatted representation if there is a formatter);
      // if it is a string coming from a set, this is the ordinal of the
      // value in the set; otherwise, it is undefined.
      let n: number | undefined;
      if (step.numeric) {
        // TODO handle suffix
        if (step.format) {
          const formatter = this._service.getFormatter(step.format);
          n = formatter?.parse(value).n || undefined;
        }
      } else {
        // this is a string from a set
        const set = step.value.set;
        if (set?.length) {
          const index = set.indexOf(value);
          n = index > -1 ? index + 1 : undefined;
        }
      }

      result.push({
        step: stepName,
        value: value,
        // TODO suffix
        n: n,
        format: step.format,
      });
    }

    return result;
  }

  public toString(citation: CitationModel, scheme: CitScheme): string {
    const sb: string[] = [];

    // replace each step placeholder in template with the corresponding
    // step value
    scheme.textOptions?.template.split(/\{(\w+)\}/).forEach((part, index) => {
      sb.push(part);
      if (index < citation.length) {
        sb.push(citation[index].value);
      }
    });

    return sb.join('');
  }
}
