import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  CitationModel,
  CitStep,
  CitScheme,
  CitSchemeClause,
  CitSchemeSet,
  CitSchemeStepDomain,
  CitTextOptions,
  SuffixedNumber,
} from '../models';
import { RomanNumberFormatter } from './roman-number.formatter';
import { MapFormatter } from './map.formatter';
import { PatternCitParser } from './pattern.cit-parser';

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
   * @param schemeId The citation scheme ID. This can be omitted
   * when the citation ID is part of the text (e.g. `@dc:If. XX 2`).
   * @returns The citation model.
   */
  parse(text: string, schemeId?: string): CitationModel;
  /**
   * Render the specified citation model into text.
   * @param citation The citation model to render into text.
   * @param schemeId The citation scheme ID.
   * @returns The rendered citation.
   */
  toString(citation: CitationModel, schemeId: string): string;
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
  private readonly _set$ = new BehaviorSubject<
    Readonly<CitSchemeSet> | undefined
  >(undefined);

  /**
   * The current scheme set.
   */
  public readonly schemeSet$ = this._set$.asObservable();

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
    this._set$.next(set);
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
   * Returns true if the scheme set is enabled.
   * @returns True if scheme prefix is enabled.
   */
  public hasSchemePrefix(): boolean {
    return this._set$.value?.noSchemePrefix !== true;
  }

  /**
   * Get the step ID at the specified index in the scheme's path.
   * @param index The index of the step in the scheme's path.
   * @param schemeId The scheme ID.
   * @returns The step ID at the specified index in the scheme's path.
   */
  public getStepAt(index: number, schemeId: string): string {
    if (!this._set$.value) {
      throw new Error('Scheme set not configured');
    }
    const scheme = this._set$.value.schemes[schemeId];
    if (!scheme) {
      throw new Error(`Scheme ${schemeId} not found`);
    }
    return scheme.path[index];
  }

  private compareSuffixedN(
    an: number,
    bn: number,
    as?: string,
    bs?: string
  ): number {
    if (an !== bn) {
      return an - bn;
    }
    if (!as && bs) {
      return -1;
    }
    if (as && !bs) {
      return 1;
    }
    if (!as && !bs) {
      return 0;
    }
    return as!.localeCompare(bs!);
  }

  private matchClause(component: CitStep, clause: CitSchemeClause): boolean {
    switch (clause.op) {
      case '=':
        return component.value === clause.value;
      case '!=':
        return component.value !== clause.value;
      case '~':
        const r = new RegExp(clause.value);
        return r.test(component.value);
      case '==':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) === 0
        );
      case '<>':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) !== 0
        );
      case '<':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) < 0
        );
      case '>':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) > 0
        );
      case '<=':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) <= 0
        );
      case '>=':
        return (
          this.compareSuffixedN(
            component.n || 0,
            +clause.value,
            component.suffix,
            clause.suffix
          ) >= 0
        );
    }
    return false;
  }

  /**
   * Get the value domain for the specified step in the specified scheme,
   * depending on the context defined by the citation model. This provides
   * the valid domain for a step's value, considering the context of the
   * citation the step belongs to. For instance, the valid domain for step
   * "verso" in Dante's Commedia, in a context defined by "cantica"="If."
   * and "canto"=1 is the range 1-136, because canto 1 of Inferno has 136
   * verses.
   * @param schemeId The scheme ID.
   * @param stepId The step ID (e.g. "canto").
   * @param citation The partial citation model, including all the
   * components before the step to get. For instance, in Dante's
   * Commedia 3-steps scheme (cantica, canto, verso), to get the
   * verso step, you should pass citation steps for cantica and canto.
   * These will be matched against the conditions of the verso step
   * in its ascendants property.
   * @returns Step at context or undefined if not found.
   */
  public getStepDomain(
    schemeId: string,
    stepId: string,
    citation?: CitationModel
  ): CitSchemeStepDomain | undefined {
    // get scheme
    const scheme = this.getScheme(schemeId);
    if (!scheme) {
      return undefined;
    }

    // get step definition and just return its value if no conditions
    // or no citation to check, or when the step is not found
    const step = scheme.steps[stepId];
    if (!citation?.steps.length || !step.conditions || !step) {
      return step?.domain;
    }

    // else check conditions stopping at the first matching one;
    // each condition represents a clause, and refers to the step
    // before the one to get, starting from it and going backwards
    // (citation instead goes from the first step to the last before
    // the targeted step).
    for (const condition of step.conditions) {
      // match each citation component from first to last against
      // the condition clauses, stopping at the first non-matching
      let citIndex = 0;
      for (let i = 0; i < condition.clauses.length; i++) {
        const clause = condition.clauses[i];
        if (!this.matchClause(citation.steps[citIndex], clause)) {
          break;
        }
        citIndex++;
      }
      // if we reached the end of the ascendants, we have a match
      if (citIndex === condition.clauses.length) {
        return condition.domain;
      }
    }

    return step.domain;
  }

  /**
   * True if the service is configured for the specified scheme.
   * @param id The scheme ID.
   * @returns True if the scheme with the specified ID is defined.
   */
  public hasScheme(id: string): boolean {
    return !!this._set$.value?.schemes[id];
  }

  /**
   * Get the scheme with the specified ID.
   * @param id The scheme ID.
   * @returns The scheme with the specified ID, or undefined.
   */
  public getScheme(id: string): Readonly<CitScheme> | undefined {
    return this._set$.value?.schemes[id];
  }

  /**
   * Get the IDs of all the schemes configured in this service.
   * @returns The scheme IDs.
   */
  public getSchemeIds(): string[] {
    return this._set$.value ? Object.keys(this._set$.value.schemes) : [];
  }

  /**
   * Get the schemes configured in this service.
   * @param ids Optional scheme IDs filter.
   * @returns The schemes.
   */
  public getSchemes(ids?: string[]): Readonly<CitScheme[]> {
    if (!this._set$.value) {
      return [];
    }
    return ids?.length
      ? ids.map((k) => this._set$.value!.schemes[k])
      : Object.values(this._set$.value.schemes);
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

  private ensureDefaultParser(): void {
    if (!this._parsers.has('')) {
      const parser = new PatternCitParser(this);
      this.addParser('', parser);
    }
  }

  /**
   * Parse the specified text representing a citation, in the context of
   * the specified scheme.
   * @param text The text to parse.
   * @param schemeId The ID of the citation scheme.
   * @returns The citation as a string array.
   */
  public parse(text: string, schemeId: string): CitationModel {
    const scheme = this.getScheme(schemeId);
    if (!scheme) {
      return { schemeId, steps: [] };
    }
    this.ensureDefaultParser();
    const parser = this._parsers.get(scheme.textOptions?.parserKey || '');
    return parser ? parser.parse(text, scheme.id) : { schemeId, steps: [] };
  }

  /**
   * Render a citation as a string, in the context of the specified scheme.
   * @param citation The citation to format.
   * @param schemeId The ID of the citation scheme.
   * @returns The rendered citation.
   */
  public toString(citation: CitationModel, schemeId: string): string {
    const scheme = this.getScheme(schemeId);
    if (!scheme) {
      return citation.steps.join('');
    }
    this.ensureDefaultParser();
    const parser = this._parsers.get(scheme.textOptions?.parserKey || '');
    return parser
      ? parser.toString(citation, scheme.id)
      : citation.steps.join('');
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
   * @param schemeId The ID of the scheme to use.
   */
  public sortCitations(citations: CitationModel[], schemeId: string): void {
    const scheme = this.getScheme(schemeId);
    if (!scheme) {
      return;
    }

    citations.sort((a, b) => {
      for (let i = 0; i < scheme.path.length; i++) {
        // compare schemes
        if (a.schemeId !== b.schemeId) {
          if (!a.schemeId) return -1;
          if (!b.schemeId) return 1;
          if (a || b) {
            return a.schemeId.localeCompare(b.schemeId);
          }
        }

        // compare n values
        const nA = a.steps[i]?.n || 0;
        const nB = b.steps[i]?.n || 0;
        if (nA !== nB) {
          return nA - nB;
        }

        // if n values are equal, compare suffixes
        const suffixA = a.steps[i]?.suffix || '';
        const suffixB = b.steps[i]?.suffix || '';
        if (suffixA !== suffixB) {
          // n without suffix comes before one with suffix
          if (!suffixA) return -1;
          if (!suffixB) return 1;
          return suffixA.localeCompare(suffixB);
        }
      }

      // if we get here, the two citations are equal up to the path length
      return a.steps.length - b.steps.length;
    });
  }
}
