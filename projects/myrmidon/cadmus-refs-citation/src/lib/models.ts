/**
 * A numeric value mapped to some label. This is used in defining
 * citation formats.
 */
export type CitMappedValue = { [key: string]: number };

/**
 * The definition of a numeric range in a numeric citation value.
 */
export type CitRange = { min?: number; max?: number };

/**
 * The definition of a single condition clause in a citation scheme.
 * When not specified, the operator is assumed to be '=' (string equality).
 * Other operators are: '!=' (string inequality), '~' (string matches regex),
 * '==' (numeric equality), '<>' (numeric inequality), '<' (numeric less than),
 * '>' (numeric greater than), '<=' (numeric less or equal), '>=' (numeric
 * greater or equal).
 */
export interface CitSchemeConditionClause {
  id: string;
  op?: '=' | '!=' | `~` | '==' | '<>' | '<' | '>' | '<=' | '>=';
  value: string;
}

/**
 * The definition of the domain of a citation scheme step value.
 * This can be a closed set of string values, a numeric range, or a mask
 * as defined by a regular expression (or empty when the value is just
 * any string).
 * The numeric range can have a suffix, which is either an empty string
 * or a regular expression. When it is empty, the number can be followed
 * by any text as a suffix; when it is a regular expression, the suffix
 * after the number must match it.
 */
export type CitSchemeStepValue =
  | { set: string[] }
  | { range: CitRange, suffix?: string }
  | { mask: string };

/**
 * The definition of a single step in a citation scheme's path.
 */
export interface CitSchemeStep {
  /**
   * The clauses to be matched for the steps' ascendants, from
   * its parent step upwards.
   */
  ascendants?: CitSchemeConditionClause[];
  /**
   * The numeric format to use to display the value of this step.
   * This is meaningful only when the step is numeric (i.e. it has
   * a range property in its value definition).
   */
  format?: string;
  /**
   * The color to use for this step in the UI.
   */
  color?: string;
  /**
   * The definition of the step's value domain.
   */
  value: CitSchemeStepValue;
}

/**
 * The options for the textual rendition of a citation. These are
 * used by formatters and parsers.
 */
export interface CitTextOptions {
  /**
   * The regex pattern to extract the steps from a path.
   * Each step is a match group and their order matches
   * the order of the steps in the path.
   */
  pathPattern?: string;
  /**
   * The regex pattern to extract the suffix from a text.
   */
  suffixPattern?: string;
  /**
   * The separators for the various parts of the citation. Each part
   * is identified by a key, which is the name of the part (e.g. 'verse'),
   * and has a prefix and a suffix. The key '_suffix' is used for the
   * optional suffix of numeric values.
   */
  separators: { [key: string]: { prefix?: string; suffix?: string } };
}

/**
 * The definition of a single citation scheme.
 */
export interface CitScheme {
  /**
   * The human-friendly name of the scheme.
   */
  name: string;
  /**
   * The path of steps to follow in this scheme.
   */
  path: string[];
  /**
   * The optional name of the step from which it and all the following
   * steps can be optional. For instance, in a 2-steps path having
   * "book" and "verse", we can use a shorter path with book only by
   * setting this property to "verse".
   */
  optionalFrom?: string;
  /**
   * The optional color to use for the scheme in the UI.
   */
  color?: string;
  /**
   * The options for the textual rendition of the citation.
   */
  textOptions?: CitTextOptions;
  /**
   * The steps of the scheme, indexed by their name, as defined in
   * the scheme's path.
   */
  steps: { [key: string]: CitSchemeStep[] };
}

/**
 * A set of citation schemes definitions.
 */
export interface CitSchemeSet {
  /**
   * The numeric formats to use for the various steps in the schemes.
   */
  formats?: { [key: string]: CitMappedValue[] };
  /**
   * The citation schemes, indexed by their ID.
   */
  schemes: { [key: string]: CitScheme };
}

/**
 * A number with an optional suffix.
 */
export type SuffixedNumber = {
  n: number;
  suffix?: string;
};

/**
 * A citation model's component.
 */
export type CitComponent = {
  /**
   * The step in the citation scheme's path (e.g. "book").
   */
  step: string;
  /**
   * The value of the step (e.g. "1", "If.", etc.).
   */
  value: string;
  /**
   * The numeric value of the step. When the step has a numeric value,
   * it is this value without its any suffix. When the step has a string
   * value coming from a set, this is the ordinal of the value in the set.
   * Otherwise, it is undefined.
   */
  n?: number;
  /**
   * The optional suffix of the numeric value.
   */
  suffix?: string;
  /**
   * The optional formatter to use for this step when it is numeric.
   */
  formatter?: string;
};

/**
 * A citation model. This is the result of parsing a compact text
 * citation, or building it via the UI.
 */
export type CitationModel = CitComponent[];
