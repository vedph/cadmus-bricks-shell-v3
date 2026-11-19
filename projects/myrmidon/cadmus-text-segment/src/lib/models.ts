import { InjectionToken, InputSignal, Type } from '@angular/core';

/**
 * The selection mode of a text segment:
 * - `allowed`: a selection can start or end at this segment (default).
 * - `wrapped`: a selection cannot start or end at this segment, but it can
 * include it when it starts before and ends after it (e.g. a space between
 * two words).
 * - `attached`: like `wrapped`, but the segment is glued to the segment
 * preceding it: whenever that segment is at the end of a selection, all the
 * attached segments following it are included too; and a selection starting
 * at an attached segment starts from its base instead (e.g. a Unicode
 * combining diacritic following its base letter).
 * - `blocked`: no selection can start, end, or cross this segment: when
 * dragging or extending a selection, the selection stops before it.
 */
export type TextSegmentSelectionMode =
  | 'allowed'
  | 'wrapped'
  | 'attached'
  | 'blocked';

/**
 * An arbitrarily defined segment of a text. Segments are pure data: they
 * never carry any view state (selection, search results, etc.), which is
 * kept by the viewer, so that a segment object is never mutated once
 * created and can be safely shared and compared by identity.
 */
export interface TextSegment<T = unknown> {
  /**
   * Arbitrary numeric ID, unique in the whole segmented text.
   */
  id: number;
  /**
   * The ordinal position of the segment, as defined by the segmentation
   * logic (e.g. the index of a character in the source text). This is
   * informative only: the viewer orders segments by their position in
   * blocks, and there can be holes in this numeric sequence (e.g. when
   * skipping CR+LF).
   */
  index: number;
  /**
   * The text value of the segment. This is what is searched by the finder.
   */
  value: string;
  /**
   * The text to display for the segment, falling back to `value` if not set.
   */
  label?: string;
  /**
   * An optional precomputed tip for the segment, used when the settings do
   * not define a tip template or function.
   */
  tip?: string;
  /**
   * An optional data object attached to the segment. All the segments in a
   * text have the same payload type.
   */
  payload?: T;
  /**
   * The selection mode for this segment. Default is `allowed`.
   */
  selectionMode?: TextSegmentSelectionMode;
  /**
   * The fill color of the segment's text box, overriding the default color
   * from settings. When the segment is selected or is a search result, this
   * is temporarily replaced by the corresponding color from settings.
   */
  color?: string;
  /**
   * The color of the segment's text box text, overriding the default text
   * color from settings.
   */
  textColor?: string;
  /**
   * The color of the segment's text box border, overriding the default
   * border color from settings. Segmentation logic can use it to visually
   * represent additional metadata.
   */
  borderColor?: string;
  /**
   * Optional CSS class(es) to add to the segment view's host element.
   */
  cssClass?: string;
}

/**
 * A block (e.g. a paragraph or a line) of text segments.
 */
export interface TextSegmentBlock<T = unknown> {
  /**
   * The index of the block in the text (0-N).
   */
  index: number;
  /**
   * The segments in the block, in their display order.
   */
  segments: TextSegment<T>[];
}

/**
 * The position of a segment tip.
 */
export type TextSegmentTipPosition = 'below' | 'popup';

/**
 * How the segments of a block wrap to the next line when they do not fit
 * the available width:
 * - `segment`: the line can wrap after any segment (default).
 * - `word`: the line wraps only after a whitespace segment (i.e. a segment
 * whose value is entirely whitespace), so that the segments between two
 * whitespaces (e.g. the characters of a word) stay together, like in
 * normal text. A run of segments wider than the whole line still wraps
 * after any segment.
 */
export type TextSegmentWrapMode = 'segment' | 'word';

/**
 * The contract of a component used to render the tip of a segment via
 * the `tipComponent` setting. The component gets the segment bound to its
 * `segment` input.
 */
export interface TextSegmentTipComponent<T = unknown> {
  segment: InputSignal<TextSegment<T> | undefined>;
}

/**
 * Display settings for a segmented text view. Colors can be any CSS color
 * value, including CSS variables like the Angular Material M3 tokens
 * (`var(--mat-sys-...)`), which are used by default so that the view
 * follows the application theme (and its dark mode).
 */
export interface SegmentedTextSettings {
  // ── layout ──────────────────────────────────────────────────────────────
  /** The horizontal gap (px) between two segments in the same block. */
  segmentOffset: number;
  /** The vertical gap (px) between two wrapped lines in the same block. */
  lineOffset: number;
  /** The vertical gap (px) between two blocks. */
  blockOffset: number;
  /** True to show the block number (=index+1) before each block. */
  showBlockNumbers?: boolean;
  /**
   * How segments wrap to the next line (default `segment`): see
   * `TextSegmentWrapMode`.
   */
  wrapMode?: TextSegmentWrapMode;

  // ── optional boxes ──────────────────────────────────────────────────────
  /** True to show the ID box in each segment view. */
  showIdBox?: boolean;
  /** True to show the index box in each segment view. */
  showIndexBox?: boolean;
  /** True to show the tip (below each segment or as a popup). */
  showTipBox?: boolean;

  // ── colors ──────────────────────────────────────────────────────────────
  /** Default fill color of the text box. */
  color: string;
  /** Default text color of the text box. */
  textColor: string;
  /** Default border color of the text box. */
  borderColor: string;
  /** Fill color of a selected segment. */
  selectionColor: string;
  /** Text color of a selected segment. */
  selectionTextColor: string;
  /** Fill color of a segment matching the current search. */
  resultColor: string;
  /** Text color of a segment matching the current search. */
  resultTextColor: string;
  /** Color of the outline drawn around the segment with the caret. */
  caretColor: string;

  // ── text box ────────────────────────────────────────────────────────────
  /** Font family of the text box text. */
  fontFace: string;
  /** Font size of the text box text (any CSS font-size, e.g. `16px`). */
  fontSize: string;
  /** Text box height (px). Its width fits the text. */
  textRectHeight: number;
  /**
   * Text box minimum width (px). When > 0 it forces a segment to be
   * visible even with a text like a space.
   */
  textRectMinWidth?: number;
  /** Horizontal padding (px) between the text and its box border. */
  textRectPadding?: number;
  /** Corner radius (px) of the boxes. */
  textRectRadius?: number;
  /** Border stroke width (px) of the text box. */
  textRectStrokeWidth?: number;
  /** Border stroke dash array of the text box (e.g. `4 2`). */
  textRectStrokeDasharray?: string;

  // ── ID and index boxes ──────────────────────────────────────────────────
  /** Font family of the ID and index boxes. */
  infoFontFace: string;
  /** Font size of the ID and index boxes. */
  infoFontSize: string;
  /** Height (px) of the ID and index boxes. */
  infoRectHeight: number;

  // ── tip ─────────────────────────────────────────────────────────────────
  /** Font family of the tip. */
  tipFontFace: string;
  /** Font size of the tip. */
  tipFontSize: string;
  /** Height (px) of the tip box when below (its width is the segment's). */
  tipRectHeight: number;
  /**
   * Template string for the tip, with placeholders in `{{...}}`. Each
   * placeholder is a dot-separated path into the segment's payload (e.g.
   * `{{uni.category}}`), or one of `$id`, `$index`, `$value`, `$label`
   * for the segment's own properties. Unresolved placeholders are removed.
   */
  tipTemplate?: string;
  /**
   * Function returning the tip for a segment. When set, it overrides
   * `tipTemplate`.
   */
  tipFn?: (segment: TextSegment<any>) => string | null | undefined;
  /**
   * A component to render the tip instead of text, for a fully custom
   * visualization. It must declare a `segment` input (see
   * `TextSegmentTipComponent`). When set, it overrides both `tipFn` and
   * `tipTemplate`.
   */
  tipComponent?: Type<unknown>;
  /**
   * Max length in characters of a textual tip: text beyond it is replaced
   * by a trailing ellipsis.
   */
  tipMaxLength?: number;
  /** Whether to display the tip below the segment or as a popup on hover. */
  tipPosition: TextSegmentTipPosition;
}

/**
 * The default settings for a segmented text view, used for any setting
 * which is not explicitly provided.
 */
export const DEFAULT_SEGMENTED_TEXT_SETTINGS: Readonly<SegmentedTextSettings> =
  Object.freeze({
    segmentOffset: 2,
    lineOffset: 6,
    blockOffset: 12,
    showBlockNumbers: true,
    wrapMode: 'segment',
    showIdBox: false,
    showIndexBox: false,
    showTipBox: false,
    color: 'var(--mat-sys-surface-container-low)',
    textColor: 'var(--mat-sys-on-surface)',
    borderColor: 'var(--mat-sys-outline-variant)',
    selectionColor: 'var(--mat-sys-primary)',
    selectionTextColor: 'var(--mat-sys-on-primary)',
    resultColor: 'var(--mat-sys-tertiary-container)',
    resultTextColor: 'var(--mat-sys-on-tertiary-container)',
    caretColor: 'var(--mat-sys-primary)',
    fontFace: "Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: '18px',
    textRectHeight: 28,
    textRectMinWidth: 10,
    textRectPadding: 3,
    textRectRadius: 4,
    textRectStrokeWidth: 1,
    infoFontFace: "'Roboto Mono', Consolas, monospace",
    infoFontSize: '10px',
    infoRectHeight: 14,
    tipFontFace: "Roboto, 'Helvetica Neue', Arial, sans-serif",
    tipFontSize: '10px',
    tipRectHeight: 14,
    tipMaxLength: 30,
    tipPosition: 'popup',
  });

/**
 * Merge the specified partial settings with the default ones.
 */
export function resolveSegmentedTextSettings(
  settings?: Partial<SegmentedTextSettings> | null,
): SegmentedTextSettings {
  if (!settings) {
    return DEFAULT_SEGMENTED_TEXT_SETTINGS;
  }
  const resolved = { ...DEFAULT_SEGMENTED_TEXT_SETTINGS } as Record<
    string,
    unknown
  >;
  // undefined values do not override defaults
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      resolved[key] = value;
    }
  }
  return resolved as unknown as SegmentedTextSettings;
}

/**
 * A segmented text with its optional display settings. This is just a
 * convenience container for transferring both data and settings.
 */
export interface SegmentedText<T = unknown> {
  blocks: TextSegmentBlock<T>[];
  settings?: Partial<SegmentedTextSettings>;
}

/**
 * Interface implemented by text segmenters. A segmenter contains the whole
 * segmentation logic, which is completely external to the viewer: it builds
 * blocks of segments from a text, and maps selections to and from
 * coordinates expressed in its own syntax.
 */
export interface TextSegmenter<T = unknown> {
  /**
   * Get blocks of segments from the specified text.
   */
  getBlocks(text?: string): TextSegmentBlock<T>[];

  /**
   * Get the coordinates of the specified segments.
   * @param blocks The blocks of the whole text, providing the context
   * required to calculate coordinates.
   * @param segments The segments (usually the selected ones), in their
   * text order.
   * @returns The coordinates, or an empty string if there are no
   * coordinates for the specified segments.
   */
  getSegmentCoords(
    blocks: readonly TextSegmentBlock<T>[],
    segments: readonly TextSegment<T>[],
  ): string;

  /**
   * Get the segments included by the specified coordinates.
   * @param blocks The blocks of the whole text.
   * @param coords The coordinates.
   * @returns The segments in their text order, or null if the coordinates
   * are not valid.
   */
  getCoordsSegments(
    blocks: readonly TextSegmentBlock<T>[],
    coords: string,
  ): TextSegment<T>[] | null;
}

/**
 * Injection token for an optional text segmenter used by the segmented text
 * view for coordinates. The view's `segmenter` input, when set, takes
 * precedence over it.
 */
export const TEXT_SEGMENTER = new InjectionToken<TextSegmenter<any>>(
  'TEXT_SEGMENTER',
);

/**
 * The selection of a segmented text view, as emitted by it.
 */
export interface TextSegmentSelection<T = unknown> {
  /** The IDs of the selected segments, in their text order. */
  ids: number[];
  /** The selected segments, in their text order. */
  segments: TextSegment<T>[];
  /**
   * The coordinates of the selection, when a segmenter is available and
   * the selection is not empty.
   */
  coords?: string;
}

/**
 * A click on a segment, as emitted by a segmented text view. This is
 * emitted for any segment, whatever its selection mode: so it is the only
 * way for a consumer to know that the user clicked a segment which cannot
 * be selected (e.g. a `blocked` segment representing an existing
 * annotation, which the consumer may want to pick for editing).
 */
export interface TextSegmentClick<T = unknown> {
  /** The clicked segment. */
  segment: TextSegment<T>;
  /** The pointer event which completed the click. */
  event: PointerEvent;
}

/**
 * Options for finding text in segments.
 */
export interface TextSegmentFindOptions {
  /** The text to find. Empty means no search. */
  query: string;
  /**
   * True to find text across segment boundaries (concatenating the values
   * of all the segments in each block); false to find text inside each
   * single segment value.
   */
  crossSegments: boolean;
  /** True for a case-sensitive search. */
  caseSensitive: boolean;
}
