import { Citation, CitSchemeStep } from '../models';
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
   * @param defaultSchemeId The default citation scheme ID, supplied when
   * the citation ID is not part of the text (e.g. `If. XX 2`).
   * @returns The citation or undefined.
   */
  public parse(text: string, defaultSchemeId: string): Citation | undefined {
    // extract scheme ID from text if any
    const prefix = this._service.extractSchemeId(text);
    if (prefix) {
      defaultSchemeId = prefix.id;
      text = prefix.text;
    }

    // if no scheme ID is provided, we can't proceed
    if (!defaultSchemeId) {
      console.warn('No scheme ID in citation text: ' + text);
      return undefined;
    }

    // create a new citation
    const citation: Citation = { schemeId: defaultSchemeId, steps: [] };

    const scheme = this._service.getScheme(defaultSchemeId);
    if (!scheme?.textOptions?.pathPattern) {
      console.warn(
        'No path pattern in citation scheme text options for ' + defaultSchemeId
      );
      return citation;
    }

    // match the pattern from the scheme's text options against the text
    const pattern = new RegExp(scheme.textOptions.pathPattern, 'g');
    const match = pattern.exec(text);
    if (!match) {
      return citation;
    }

    // for each step in the scheme's path, parse the corresponding match
    for (let i = 0; i < scheme.path.length; i++) {
      // get the step definition from scheme, and its value from the match
      const stepId = scheme.path[i];
      const step: CitSchemeStep = scheme.steps[stepId];
      let value = match[i + 1];
      if (!value) {
        break;
      }

      // calculate n
      let n: number | undefined;
      let suffix: string | undefined;

      switch (step.type) {
        case 'set':
          // n is the ordinal of the value in the set
          const set = step.domain.set;
          if (set?.length) {
            const index = set.indexOf(value);
            n = index > -1 ? index + 1 : undefined;
          }
          break;

        case 'numeric':
          // n is the numeric value (without suffix)
          // extract suffix if any
          if (step.suffixPattern) {
            const suffixMatch = new RegExp(step.suffixPattern).exec(value);
            if (suffixMatch) {
              suffix = suffixMatch[0];
              value = value.substring(0, value.length - suffix.length);
            }
          }
          // parse value using formatter if required
          if (step.format) {
            const formatter = this._service.getFormatter(step.format);
            n = formatter?.parse(value)?.n || undefined;
          } else {
            n = parseInt(value, 10);
          }
          break;
      }

      citation.steps.push({
        stepId: stepId,
        color: step.color,
        value: value,
        suffix: suffix,
        n: n,
        format: step.format,
      });
    }

    return citation;
  }

  /**
   * Render the specified citation model into text.
   * @param citation The citation model to render into text.
   * @param scheme The citation scheme.
   * @returns The rendered citation.
   */
  public toString(citation: Citation): string {
    if (!citation.steps.length) {
      return '';
    }
    const scheme = this._service.getScheme(citation.schemeId);
    const sb: string[] = [];
    if (!scheme?.textOptions?.template) {
      console.warn(
        'No text options template in citation scheme for ' + citation.schemeId
      );
      return '';
    }

    // add scheme ID prefix if required
    if (this._service.hasSchemePrefix()) {
      sb.push('@' + citation.schemeId + ':');
    }

    const template = scheme.textOptions.template;

    // replace each step placeholder in template with the corresponding
    // step value
    // for each matching {step} in template, replace it with the value
    // of the step, if any
    const matches = template.match(/{(\w+)}/g);
    if (!matches) {
      console.warn(
        'No text options template in citation scheme for ' + citation.schemeId
      );
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
      const step = citation.steps.find((s) => s.stepId === stepName);
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
        sb.push(template.substring(start, nextStart));
      }
    }

    return sb.join('');
  }
}
