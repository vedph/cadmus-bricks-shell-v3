import { PhysicalSize } from './physical-size.component';

/**
 * Physical size parser.
 * This is used to parse a physical size from a string, which is expected to
 * be in the form:
 * (Tag) ValueUnit1 (Tag1) x ValueUnit2 (Tag2) x ValueUnit3 (Tag3) {Note}
 * where:
 * - Tag is an optional tag in parentheses referred to the size as a whole.
 * - ValueUnit1, ValueUnit2, ValueUnit3 are the three dimensions, each
 *   consisting of a value and a unit, optionally separated by a space. The
 *   unit can be omitted, in which case the previous or default unit is used
 *   (in this order of preference).
 * - ValueUnit3 is optional and represents depth.
 * - dimensions 1 and 2 represent width and height, and can be swapped according
 *   to a parameter (hBeforeW).
 * - Tag1, Tag2, Tag3 are optional tags for each dimension.
 * - Note is an optional note in curly braces, referred to the size as a whole.
 */
export class PhysicalSizeParser {
  // e.g.: (tag) 12.3cm (tag-1) x 4 (tag-2) x 12mm (tag-3) {note}
  // 1: tag
  // 2*: value1, 3: unit1, 4: tag1
  // 5*: value2, 6: unit2, 7: tag2
  // 8*: value3, 9: unit3, 10: tag3
  // 11: note
  private static readonly _r =
    /^\s*(?:\(([^)]+)\))?\s*([0-9]+(?:[\.,][0-9]+)?)(?:\s*([^(x×\s]+))?(?:\s*\(([^)]+)\))?\s*[x×]\s*\s*([0-9]+(?:[\.,][0-9]+)?)(?:\s*([^(x×\s]+))?(?:\s*\(([^)]+)\))?(?:\s*[x×]\s*\s*([0-9]+(?:[\.,][0-9]+)?)(?:\s*([^(x×\s]+))?(?:\s*\(([^)]+)\))?)?(?:\s*\{([^}]+)\})?/;

  /**
   * Parse the received text and return a PhysicalSize object.
   *
   * @param text The text to parse.
   * @param hBeforeW True if height comes before width, false otherwise.
   * @param defaultUnit The default unit to use if none is specified.
   * @returns Parsed size or null.
   */
  public static parse(
    text?: string | null,
    hBeforeW = false,
    defaultUnit = 'cm'
  ): PhysicalSize | null {
    if (!text) {
      return null;
    }
    const m = PhysicalSizeParser._r.exec(text);
    if (!m) {
      return null;
    }

    const size: PhysicalSize = {};

    // tag if any
    if (m[1]) {
      size.tag = m[1];
    }

    // WxH or HxW
    if (hBeforeW) {
      size.h = {
        value: parseFloat(m[2]),
        unit: m[3] || defaultUnit,
        tag: m[4],
      };
      size.w = {
        value: parseFloat(m[5]),
        unit: m[6] || size.h.unit || defaultUnit,
        tag: m[7],
      };
    } else {
      size.w = {
        value: parseFloat(m[2]),
        unit: m[3] || defaultUnit,
        tag: m[4],
      };
      size.h = {
        value: parseFloat(m[5]),
        unit: m[6] || size.w.unit || defaultUnit,
        tag: m[7],
      };
    }

    // D if any
    if (m[8]) {
      size.d = {
        value: parseFloat(m[8]),
        unit: m[9] || (hBeforeW ? size.w.unit : size.h.unit) || defaultUnit,
        tag: m[10],
      };
    }

    // note if any
    if (m[11]) {
      size.note = m[11];
    }

    return size;
  }

  /**
   * Convert the received size to a parsable string.
   *
   * @param size The size to convert.
   * @param hBeforeW True to put height before width.
   * @returns String representation of the size.
   */
  public static toString(
    size?: PhysicalSize | null,
    hBeforeW = false
  ): string | null {
    if (!size?.w || !size.h) {
      return null;
    }
    const sb: string[] = [];

    // tag
    if (size.tag) {
      sb.push(`(${size.tag}) `);
    }

    // WxH or HxW
    if (hBeforeW) {
      sb.push(
        `${size.h.value}${size.h.unit}${
          size.h.tag ? ` (${size.h.tag})` : ''
        } x ${size.w.value}${size.w.unit}${
          size.w.tag ? ` (${size.w.tag})` : ''
        }`
      );
    } else {
      sb.push(
        `${size.w.value}${size.w.unit}${
          size.w.tag ? ` (${size.w.tag})` : ''
        } x ${size.h.value}${size.h.unit}${
          size.h.tag ? ` (${size.h.tag})` : ''
        }`
      );

      // D if any
      if (size.d) {
        sb.push(
          ` x ${size.d.value}${size.d.unit}${
            size.d.tag ? ` (${size.d.tag})` : ''
          }`
        );
      }

      // note if any
      if (size.note) {
        sb.push(` {${size.note}}`);
      }
    }

    return sb.join('');
  }
}
