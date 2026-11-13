import { SegmentedTextSettings, TextSegment } from '../models';

const PLACEHOLDER_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * Resolve a dot-separated path in the specified object.
 * @param obj The object.
 * @param path The path, e.g. `uni.category` or `tags.0`.
 * @returns The value, or undefined if not found.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const step of path.split('.')) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object' && typeof current !== 'function') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[step];
  }
  return current;
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

/**
 * Fill a tip template with data from a segment. Each placeholder in `{{...}}`
 * is a dot-separated path into the segment's payload, or one of `$id`,
 * `$index`, `$value`, `$label` for the segment's own properties. Unresolved
 * placeholders are replaced with an empty string, and the result is trimmed.
 * @param template The template, e.g. `cat.='{{uni.category}}'`.
 * @param segment The segment.
 * @returns The filled template.
 */
export function fillTipTemplate(
  template: string,
  segment: TextSegment<unknown>,
): string {
  return template
    .replace(PLACEHOLDER_REGEX, (_, path: string) => {
      switch (path) {
        case '$id':
          return String(segment.id);
        case '$index':
          return String(segment.index);
        case '$value':
          return segment.value;
        case '$label':
          return segment.label ?? segment.value;
        default:
          return valueToString(resolvePath(segment.payload, path));
      }
    })
    .trim();
}

/**
 * Truncate the specified text to the specified max length, appending an
 * ellipsis when truncated.
 */
export function truncateText(text: string, maxLength?: number): string {
  if (!maxLength || maxLength < 1 || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '…';
}

/**
 * Get the textual tip for a segment according to the specified settings:
 * `tipFn` wins over `tipTemplate`, which wins over the segment's own `tip`.
 * The result is truncated according to `tipMaxLength`.
 * @returns The tip, or an empty string if none.
 */
export function resolveSegmentTip(
  segment: TextSegment<unknown>,
  settings: Pick<
    SegmentedTextSettings,
    'tipFn' | 'tipTemplate' | 'tipMaxLength'
  >,
): string {
  let tip: string | null | undefined;
  if (settings.tipFn) {
    tip = settings.tipFn(segment);
  } else if (settings.tipTemplate) {
    tip = fillTipTemplate(settings.tipTemplate, segment);
  } else {
    tip = segment.tip;
  }
  return tip ? truncateText(tip, settings.tipMaxLength) : '';
}
