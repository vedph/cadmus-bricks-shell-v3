import { CitMappedValues, SuffixedNumber } from '../models';
import { CitNumberFormatter } from './cit-scheme.service';

/**
 * A number formatter for mapped values. This formatter requires to be
 * configured with a set of mapped values, and can format and parse
 * numbers using these values.
 */
export class MapFormatter implements CitNumberFormatter {
  private _labels?: { [key: string]: number };
  private _values?: { [key: number]: string };

  /**
   * Check whether this formatter is configured.
   * @returns true if this formatter is configured.
   */
  public isConfigured(): boolean {
    return !!this._labels;
  }

  /**
   * Configure this formatter with the specified mapped values.
   * @param mappedValues The mapped values to use for formatting and parsing.
   */
  public configure(mappedValues: CitMappedValues) {
    this._labels = {};
    this._values = {};

    // for each key in the mapped values, store the label and value
    // in the corresponding dictionary
    for (let key in mappedValues) {
      let value = mappedValues[key];
      this._labels[key] = value;
      this._values[value] = key;
    }
  }

  /**
   * Format the specified value.
   * @param value The value to format.
   * @param options The optional text options.
   */
  public format(value: number): string {
    if (!this._values) {
      return value.toString();
    }
    return this._values[value] || value.toString();
  }

  /**
   * Parse the specified text representing a citation number.
   * @param text The text to parse.
   * @param options The optional text options.
   */
  public parse(
    text?: string | null,
    suffixPattern?: string
  ): SuffixedNumber | undefined {
    if (!text || !this._labels) {
      return undefined;
    }

    // if we have a suffix pattern, try to match it
    let suffix: string | undefined;
    if (suffixPattern) {
      let match = text.match(new RegExp(suffixPattern));
      if (match) {
        suffix = match[0];
        text = text.substring(0, text.length - suffix.length);
      }
    }

    // parse the number using the labels map
    let n = this._labels[text];
    return n === undefined ? undefined : { n: n || 0, suffix: suffix };
  }
}
