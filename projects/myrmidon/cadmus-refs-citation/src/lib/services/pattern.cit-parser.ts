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
   * Parse the specified citation text.
   * @param text The citation text to parse.
   * @param scheme The citation scheme.
   * @returns The citation model.
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
          n = formatter?.parse(value)?.n || undefined;
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

  /**
   * Render the specified citation model into text.
   * @param citation The citation model to render into text.
   * @param scheme The citation scheme.
   * @returns The rendered citation.
   */
  public toString(citation: CitationModel, scheme: CitScheme): string {
    const sb: string[] = [];
    if (!scheme.textOptions?.template) {
      console.warn('No text options template in citation scheme');
      return '';
    }
    const template = scheme.textOptions.template;

    // replace each step placeholder in template with the corresponding
    // step value
    // for each matching {step} in template, replace it with the value
    // of the step, if any
    const matches = template.match(/{(\w+)}/g);
    if (!matches) {
      console.warn('No text options template in citation scheme');
      return scheme.textOptions?.template || '';
    }
    for (let i = 0; i < matches?.length; i++) {
      // extract step name from {}
      const match = matches[i];
      let stepName = match.substring(1, match.length - 1);

      // extract optional suffix :n or :s from step name
      const colon = stepName.indexOf(':');
      let suffix: string | undefined;
      if (colon > -1) {
        suffix = stepName.substring(colon + 1);
        stepName = stepName.substring(0, colon);
      }

      // find the step in the citation model
      const step = citation.find((s) => s.step === stepName);
      if (step) {
        // render n if any and the suffix is falsy or not 's',
        // as we want to render n+s by default, else just n for
        // suffix ':n', and just s for suffix ':s'
        if (step.n !== undefined && step.n !== null) {
          // omit n if suffix is ':s'
          if (!suffix || suffix !== 's') {
            // use formatter if specified
            if (step.format) {
              const formatter = this._service.getFormatter(step.format);
              sb.push(formatter?.format(step.n) || step.n.toString());
            } else {
              sb.push(step.value);
            }
          }
          // render suffix if any
          if (step.suffix && (!suffix || suffix !== 'n')) {
            sb.push(step.suffix);
          }
        } else {
          sb.push(step.value);
        }
      } else {
        console.warn(`Citation scheme step not found: ${stepName}`);
      }

      // get index of match in matchIndex
      const matchIndex = template.indexOf(match);

      // add all what is after the match before the next one
      const nextMatch = matches[i + 1];
      const start = matchIndex + match.length;
      const nextStart = nextMatch
        ? template.indexOf(nextMatch, start)
        : template.length;
      if (nextStart > start) {
        sb.push(template.substring(nextStart, nextStart));
      }
    }

    return sb.join('');
  }
}
