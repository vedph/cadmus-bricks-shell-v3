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
  ascendants?: CitSchemeConditionClause[];
  format?: string;
  color?: string;
  step: CitSchemeStepValue;
}

/**
 * The definition of a single citation scheme.
 */
export interface CitScheme {
  name: string;
  path: string[];
  optionalFrom?: string;
  color?: string;
  steps: { [key: string]: CitSchemeStep[] };
}

/**
 * A set of citation schemes definitions.
 */
export interface CitSchemeSet {
  formats?: { [key: string]: CitMappedValue[] };
  schemes: { [key: string]: CitScheme };
}
