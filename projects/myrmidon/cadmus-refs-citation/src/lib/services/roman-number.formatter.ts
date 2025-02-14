import { RomanNumber } from '@myrmidon/ngx-tools';

import { CitTextOptions, SuffixedNumber } from '../models';
import { CitNumberFormatter } from './cit-scheme.service';

/**
 * A citation number formatter for Roman numbers plus an optional
 * suffix.
 */
export class RomanNumberFormatter implements CitNumberFormatter {
  public lowercase?: boolean;

  constructor(lowercase?: boolean) {
    this.lowercase = lowercase;
  }

  /**
   * Format the specified value as a Roman number.
   * @param value The value to format.
   * @returns The formatted value.
   */
  public format(value: number): string {
    const r = RomanNumber.toRoman(value);
    return this.lowercase ? r.toLowerCase() : r;
  }

  /**
   * Parse the specified text as a Roman number plus an optional suffix.
   * @param text The text to parse.
   * @param options The options.
   * @returns The parsed value.
   */
  public parse(text?: string | null, options?: CitTextOptions): SuffixedNumber {
    const result: SuffixedNumber = {
      n: 0,
    };
    if (!text) {
      return result;
    }

    if (options?.suffixPattern) {
      // match suffix regex and remove it from text
      const m = text.match(new RegExp(options.suffixPattern));
      if (m) {
        result.suffix = m[0];
        text = text.replace(new RegExp(options.suffixPattern), '');
      }
    }

    const m = text.toUpperCase().match(/^(\d+)/);
    if (m) {
      result.n = RomanNumber.fromRoman(m[1]);
    }

    return result;
  }
}
