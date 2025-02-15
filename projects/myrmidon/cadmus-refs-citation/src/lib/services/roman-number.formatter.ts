import { RomanNumber } from '@myrmidon/ngx-tools';

import { SuffixedNumber } from '../models';
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
  public parse(
    text?: string | null,
    suffixPattern?: string
  ): SuffixedNumber | undefined {
    if (!text) {
      return undefined;
    }

    const result: SuffixedNumber = {
      n: 0,
    };

    // match suffix regex and remove it from text
    if (suffixPattern) {
      const m = text.match(new RegExp(suffixPattern));
      if (m) {
        result.suffix = m[0];
        text = text.replace(new RegExp(suffixPattern), '');
      }
    }

    result.n = RomanNumber.fromRoman(text);

    return result;
  }
}
