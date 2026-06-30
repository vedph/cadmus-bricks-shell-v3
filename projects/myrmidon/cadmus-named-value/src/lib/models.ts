/**
 * Named values map. This is used for NamedValue's from closed
 * sets. The key is a NamedValue name, and the value is an
 * array of NamedValue entries, each representing a possible
 * name and value for that name.
 * For instance, a "color" map entry can include items like
 * [{name="r", value="red"},{name="g", value="green"}].
 */
export interface NamedValueMap {
  [key: string]: NamedValue[];
}

/**
 * Generic name=value pair.
 */
export interface NamedValue {
  name: string;
  value: string;
}
