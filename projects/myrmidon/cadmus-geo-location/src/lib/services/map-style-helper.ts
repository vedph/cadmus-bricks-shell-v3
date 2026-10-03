import type { StyleSpecification } from 'maplibre-gl';

const COMPARISON_OPS = new Set(['<', '<=', '>', '>=']);

/**
 * Guard a filter expression so that numeric comparisons against a feature
 * property never see a missing (null) value. Third-party styles (e.g.
 * OpenFreeMap Liberty) use filters like `["<=", ["get", "ref_length"], 6]`;
 * on features lacking the property, maplibre-gl evaluates `null <= 6` and
 * logs "Expected value to be of type number, but found null instead" for
 * each of them. Rewriting the comparison as
 * `["all", ["has", p], <comparison>]` yields the same result (false) for
 * such features without triggering the warning.
 * @param expr The filter expression.
 * @returns The guarded expression.
 */
export function guardFilterExpression(expr: unknown): unknown {
  if (!Array.isArray(expr)) {
    return expr;
  }
  const guarded = expr.map((e) => guardFilterExpression(e));
  if (typeof guarded[0] === 'string' && COMPARISON_OPS.has(guarded[0])) {
    const props = guarded
      .slice(1)
      .filter(
        (a): a is ['get', string] =>
          Array.isArray(a) &&
          a.length === 2 &&
          a[0] === 'get' &&
          typeof a[1] === 'string',
      )
      .map((a) => ['has', a[1]]);
    if (props.length) {
      return ['all', ...props, guarded];
    }
  }
  return guarded;
}

/**
 * Patch a MapLibre style specification so that its layer filters do not
 * produce null-comparison warnings (see {@link guardFilterExpression}).
 * @param style The style specification.
 * @returns A patched copy of the style.
 */
export function patchMapStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) =>
      'filter' in layer && layer.filter
        ? ({
            ...layer,
            filter: guardFilterExpression(layer.filter),
          } as typeof layer)
        : layer,
    ),
  };
}

/**
 * Load a MapLibre style from the specified URL and patch it with
 * {@link patchMapStyle}. If loading fails, the URL itself is returned,
 * so that the map can still load the original style.
 * @param url The style URL.
 * @param signal An optional abort signal.
 * @returns The patched style, or the URL on failure.
 */
export async function loadMapStyle(
  url: string,
  signal?: AbortSignal,
): Promise<StyleSpecification | string> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return url;
    }
    return patchMapStyle((await response.json()) as StyleSpecification);
  } catch {
    return url;
  }
}
