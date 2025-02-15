import { Injectable } from '@angular/core';

import {
  CitationModel,
  CitScheme,
  CitSchemeSet,
  CitTextOptions,
  SuffixedNumber,
} from '../models';
import { RomanNumberFormatter } from './roman-number.formatter';
import { MapFormatter } from './map.formatter';

/**
 * A number formatter for citations.
 */
export interface CitNumberFormatter {
  /**
   * Format the specified value.
   * @param value The value to format.
   * @param options The optional text options.
   */
  format(value: number, options?: CitTextOptions): string;

  /**
   * Parse the specified text representing a citation number.
   * @param text The text to parse.
   * @param options The optional text options.
   */
  parse(
    text?: string | null,
    suffixPattern?: string
  ): SuffixedNumber | undefined;
}

/**
 * A citation parser.
 */
export interface CitParser {
  /**
   * Parse the specified citation text.
   * @param text The citation text to parse.
   * @param scheme The citation scheme.
   * @returns The citation model.
   */
  parse(text: string, scheme: CitScheme): CitationModel;
  /**
   * Render the specified citation model into text.
   * @param citation The citation model to render into text.
   * @param scheme The citation scheme.
   * @returns The rendered citation.
   */
  toString(citation: CitationModel, scheme: CitScheme): string;
}

/**
 * The default key for the Roman upper case formatter.
 */
export const CIT_FORMATTER_ROMAN_UPPER = '$ru';
/**
 * The default key for the Roman lower case formatter.
 */
export const CIT_FORMATTER_ROMAN_LOWER = '$rl';

/**
 * Citation scheme service.
 */
@Injectable({
  providedIn: 'root',
})
export class CitSchemeService {
  private readonly _formatters = new Map<string, CitNumberFormatter>();
  private readonly _parsers = new Map<string, CitParser>();
  private _set?: CitSchemeSet;

  constructor() {
    this.addFormatter(CIT_FORMATTER_ROMAN_UPPER, new RomanNumberFormatter());
    this.addFormatter(
      CIT_FORMATTER_ROMAN_LOWER,
      new RomanNumberFormatter(true)
    );
  }

  /**
   * Configure this service with the specified scheme set.
   * @param set The scheme set to configure this service with.
   */
  public configure(set: CitSchemeSet): void {
    this._set = set;
    // if formats are defined, add a MapFormatter for each,
    // configuring it according to its CitMappedValues
    if (set.formats) {
      for (const key in set.formats) {
        const formatter = new MapFormatter();
        formatter.configure(set.formats[key]);
        this.addFormatter(key, formatter);
      }
    }
  }

  /**
   * Get the step ID at the specified index in the scheme's path.
   * @param index The index of the step in the scheme's path.
   * @param schemeId The scheme ID.
   * @returns The step ID at the specified index in the scheme's path.
   */
  public getStepAt(index: number, schemeId: string): string {
    if (!this._set) {
      throw new Error('Scheme set not configured');
    }
    const scheme = this._set.schemes[schemeId];
    if (!scheme) {
      throw new Error(`Scheme ${schemeId} not found`);
    }
    return scheme.path[index];
  }

  /**
   * True if the service is configured for the specified scheme.
   * @param id The scheme ID.
   * @returns True if the scheme with the specified ID is defined.
   */
  public hasScheme(id: string): boolean {
    return !!this._set?.schemes[id];
  }

  /**
   * Get the scheme with the specified ID.
   * @param id The scheme ID.
   * @returns The scheme with the specified ID, or undefined.
   */
  public getScheme(id: string): CitScheme | undefined {
    return this._set?.schemes[id];
  }

  /**
   * Get the IDs of all the schemes configured in this service.
   * @returns The scheme IDs.
   */
  public getSchemeIds(): string[] {
    return this._set ? Object.keys(this._set.schemes) : [];
  }

  /**
   * Add a formatter to the service under the specified key.
   * Note that by default the service already provides two formatters for
   * Roman numbers, with keys `$ru` and `$rl`.
   * @param key The key of the formatter.
   * @param formatter The formatter.
   */
  public addFormatter(key: string, formatter: CitNumberFormatter): void {
    this._formatters.set(key, formatter);
  }

  /**
   * Get the formatter with the specified key.
   * @param key The key of the formatter.
   * @returns The formatter or undefined.
   */
  public getFormatter(key: string): CitNumberFormatter | undefined {
    return this._formatters.get(key);
  }

  /**
   * Format the specified value using the formatter with the specified key.
   * @param key The formatter's key.
   * @param value The value to format.
   * @param suffix The optional value suffix.
   * @returns The formatted value.
   */
  public format(key: string, value: number): string {
    const formatter = this._formatters.get(key);
    return formatter ? formatter.format(value) : `${value}`;
  }

  /**
   * Add a parser to the service under the specified key.
   * @param key The key of the parser.
   * @param parser The parser.
   */
  public addParser(key: string, parser: CitParser): void {
    this._parsers.set(key, parser);
  }

  /**
   * Get the parser with the specified key.
   * @param key The key of the parser.
   * @returns The parser or undefined.
   */
  public getParser(key: string): CitParser | undefined {
    return this._parsers.get(key);
  }

  /**
   * Parse the specified text representing a citation, using the parser with
   * the specified key, in the context of the specified scheme.
   * @param key The parser's key.
   * @param text The text to parse.
   * @param scheme The citation scheme.
   * @returns The citation as a string array.
   */
  public parse(key: string, text: string, scheme: CitScheme): CitationModel {
    const parser = this._parsers.get(key);
    return parser ? parser.parse(text, scheme) : [];
  }

  /**
   * Render a citation as a string, using the parser with the specified key.
   * @param key The parser's key.
   * @param citation The citation to format.
   * @param scheme The citation scheme.
   * @returns The rendered citation.
   */
  public toString(
    key: string,
    citation: CitationModel,
    scheme: CitScheme
  ): string {
    const parser = this._parsers.get(key);
    return parser ? parser.toString(citation, scheme) : citation.join('');
  }

  /**
   * Sort the received citations according to the specified scheme.
   * Sorting criteria are based on the scheme's path: the n value of each step
   * in the path is compared in the two citations, and if they differ, the
   * comparison result is returned; otherwise, the next step in the path is
   * considered, and so on.
   * When a path is missing, the comparison is based on the citation's length.
   *
   * @param citations The citations to sort.
   * @param scheme The scheme to use.
   */
  public sortCitations(citations: CitationModel[], scheme: CitScheme): void {
    citations.sort((a, b) => {
      for (let i = 0; i < scheme.path.length; i++) {
        const nA = a[i]?.n || 0;
        const nB = b[i]?.n || 0;
        if (nA !== nB) {
          return nA - nB;
        }
      }
      return a.length - b.length;
    });
  }
}
