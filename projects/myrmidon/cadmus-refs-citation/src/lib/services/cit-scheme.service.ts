import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RamStorageService } from '@myrmidon/ngx-tools';

import {
  Citation,
  CitStep,
  CitScheme,
  CitSchemeClause,
  CitSchemeSet,
  CitSchemeStepDomain,
  CitTextOptions,
  SuffixedNumber,
  CitationSpan,
  CitSchemeSettings,
} from '../models';
import { RomanNumberFormatter } from './roman-number.formatter';
import { MapFormatter } from './map.formatter';
import { PatternCitParser } from './pattern.cit-parser';

/**
 * The key for the citation service settings in the settings storage.
 * This contains a CitSchemeSettings object.
 */
export const CIT_SCHEME_SERVICE_SETTINGS_KEY = 'cadmus-refs-citation.settings';

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
   * @param defaultSchemeId The default citation scheme ID, supplied when
   * the citation ID is not part of the text (e.g. `If. XX 2`).
   * @returns The citation model.
   */
  parse(text: string, defaultSchemeId?: string): Citation | undefined;
  /**
   * Render the specified citation model into text.
   * @param citation The citation model to render into text.
   * @param schemeId The citation scheme ID.
   * @returns The rendered citation.
   */
  toString(citation: Citation): string;
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

  constructor(storage: RamStorageService) {
    const set = storage.retrieve<CitSchemeSet>(CIT_SCHEME_SERVICE_SETTINGS_KEY);
    if (set) {
      this.configure(set);
    }
    this.addFormatter(CIT_FORMATTER_ROMAN_UPPER, new RomanNumberFormatter());
    this.addFormatter(
      CIT_FORMATTER_ROMAN_LOWER,
      new RomanNumberFormatter(true)
    );
  }

  /**
   * Configure this service with the specified scheme set.
   * @param settings The settings to configure this service with.
   */
  public configure(settings: CitSchemeSettings): void {
    this._set$.next(settings);
    // if formats are defined, add a MapFormatter for each,
    // configuring it according to its CitMappedValues
    if (settings.formats) {
      for (const key in settings.formats) {
        const formatter = new MapFormatter();
        formatter.configure(settings.formats[key]);
        this.addFormatter(key, formatter);
      }
    }
    // add custom formatters
    if (settings.formatters) {
      for (const key in settings.formatters) {
        this.addFormatter(key, settings.formatters[key]);
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
   * Get the value domain for the specified step, depending on the
   * context defined by the citation model. This provides the valid
   * domain for a step's value, considering the context of the citation
   * the step belongs to. For instance, the valid domain for step
   * "verso" in Dante's Commedia, in a context defined by "cantica"="If."
   * and "canto"=1 is the range 1-136, because canto 1 of Inferno has 136
   * verses.
   * @param stepId The step ID (e.g. "canto").
   * @param citation The partial citation model, including all the
   * components before the step to get. For instance, in Dante's
   * Commedia 3-steps scheme (cantica, canto, verso), to get the
   * verso step, you should pass citation steps for cantica and canto.
   * These will be matched against the conditions of the verso step
   * in its ascendants property.
   * @param defaultSchemeId The default scheme ID to use when citation
   * is undefined.
   * @returns Step at context or undefined if not found.
   */
  public getStepDomain(
    stepId: string,
    citation?: Citation,
    defaultSchemeId?: string
  ): CitSchemeStepDomain | undefined {
    // get scheme
    const schemeId = citation?.schemeId || defaultSchemeId;
    if (!schemeId) {
      return undefined;
    }
    const scheme = this.getScheme(schemeId);
    if (!scheme) {
      return undefined;
    }

    // get step definition and just return its value if no conditions
    // or no citation to check, or when the step is not found
    const step = scheme.steps[stepId];
    if (!citation?.steps.length || !step?.conditions) {
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
   * Extract the scheme ID from the specified citation text, if any.
   * @param text The text of the citation, which may start with a scheme ID.
   * @returns The extracted scheme ID and the text without it, or undefined.
   */
  public extractSchemeId(
    text: string
  ): { id: string; text: string } | undefined {
    // if the text starts with a citation ID, extract it
    const match = /^@([^:]+):/.exec(text);
    return match
      ? { id: match[1], text: text.substring(match[0].length) }
      : undefined;
  }

  /**
   * Parse the specified text representing a citation, in the context of
   * the specified scheme.
   * @param text The text to parse.
   * @param defaultSchemeId The ID of the default citation scheme to use
   * when the citation text has no scheme ID prefix.
   * @param empty True to return an empty citation with steps ready to be
   * filled when the parse result is undefined.
   * @returns The citation or undefined.
   */
  public parse(
    text: string,
    defaultSchemeId: string,
    empty = false
  ): Citation | undefined {
    const idAndText = this.extractSchemeId(text);
    if (idAndText) {
      defaultSchemeId = idAndText.id;
      text = idAndText.text;
    }

    const scheme = this.getScheme(defaultSchemeId);
    if (!scheme) {
      return { schemeId: defaultSchemeId, steps: [] };
    }
    this.ensureDefaultParser();
    const parser = this._parsers.get(scheme.textOptions?.parserKey || '');
    const citation = parser
      ? parser.parse(text, scheme.id)
      : { schemeId: defaultSchemeId, steps: [] };

    // if the citation is empty and we want one with empty steps, fill it
    if (citation?.steps.length === 0 && empty) {
      for (let i = 0; i < scheme.path.length; i++) {
        const stepId = scheme.path[i];
        citation.steps.push({
          color: scheme.steps[stepId].color,
          format: scheme.steps[stepId].format,
          stepId: stepId,
          value: '',
        });
      }
    }

    return citation;
  }

  /**
   * Render a citation as a string, in the context of the specified scheme.
   * @param citation The citation to format.
   * @returns The rendered citation.
   */
  public toString(citation: Citation): string {
    const scheme = this.getScheme(citation.schemeId);
    if (!scheme) {
      return citation.steps.join('');
    }
    this.ensureDefaultParser();
    const parser = this._parsers.get(scheme.textOptions?.parserKey || '');
    return parser ? parser.toString(citation) : citation.steps.join('');
  }

  /**
   *
   * @param text Parse the specified text representing a citation span, in
   * the context of the specified scheme. A citation span is a pair of citations
   * separated by " - ".
   * @param defaultSchemeId The ID of the default citation scheme to use when
   * the citation text has no scheme ID prefix.
   * @returns The citation span or undefined.
   */
  public parseSpan(
    text: string,
    defaultSchemeId: string
  ): CitationSpan | undefined {
    if (!text) {
      return undefined;
    }
    const parts = text.split(' - ');
    if (parts.length !== 2) {
      return undefined;
    }
    const a = this.parse(parts[0], defaultSchemeId);
    if (!a) {
      return undefined;
    }
    return {
      a,
      b: this.parse(parts[1], defaultSchemeId),
    };
  }

  /**
   * Compare two citations.
   * @param a The first citation to compare.
   * @param b The second citation to compare.
   * @returns Comparison result.
   */
  public compareCitations(a?: Citation, b?: Citation): number {
    // corner cases
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    for (let i = 0; i < Math.max(a.steps.length, b.steps.length); i++) {
      // compare scheme IDs
      if (a.schemeId !== b.schemeId) {
        return a.schemeId.localeCompare(b.schemeId);
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
   * @param defaultSchemeId The default scheme ID to assign to citations
   * without an explicit scheme ID.
   */
  public sortCitations(citations: Citation[], defaultSchemeId: string): void {
    const scheme = this.getScheme(defaultSchemeId);
    if (!scheme) {
      return;
    }

    // group citations by scheme ID
    const groupedCitations = new Map<string, Citation[]>();
    citations.forEach((citation) => {
      const id = citation.schemeId || defaultSchemeId;
      if (!groupedCitations.has(id)) {
        groupedCitations.set(id, []);
      }
      groupedCitations.get(id)!.push(citation);
    });

    // sort each group
    groupedCitations.forEach((group, id) => {
      group.sort((a, b) => {
        return this.compareCitations(a, b);
      });
    });

    // concatenate sorted groups in the order of sorted scheme IDs
    const sortedSchemeIds = Array.from(groupedCitations.keys()).sort();
    citations.length = 0;
    sortedSchemeIds.forEach((id) => {
      citations.push(...groupedCitations.get(id)!);
    });
  }

  /**
   * Compact the received list of citations and/or citation spans so that
   * all the spans having an undefined B citation are converted to simple
   * citations.
   * @param citations The citations and/or spans to compact.
   */
  public compactCitations(
    citations: (Citation | CitationSpan)[]
  ): (Citation | CitationSpan)[] {
    return citations.map((c: Citation | CitationSpan) => {
      const span = c as CitationSpan;
      if (span.a && !span.b) {
        return span.a;
      }
      return c;
    });
  }

  /**
   * Create an empty citation for the specified scheme ID.
   * @param schemeId The scheme ID.
   * @param lastStepIndex The index of the last step to include in the
   * citation, or -1 to include all the steps.
   * @returns Citation.
   */
  public createEmptyCitation(schemeId: string, lastStepIndex = -1): Citation {
    const cit: Citation = {
      schemeId: schemeId,
      steps: [],
    };
    const scheme = this._set$.value?.schemes[schemeId];

    if (scheme) {
      for (let i = 0; i < scheme.path.length; i++) {
        if (lastStepIndex > -1 && i > lastStepIndex) {
          break;
        }
        const stepId = scheme.path[i];
        cit.steps.push({
          color: scheme.steps[stepId].color,
          format: scheme.steps[stepId].format,
          stepId: stepId,
          value: '',
        });
      }
    }

    return cit;
  }
}
