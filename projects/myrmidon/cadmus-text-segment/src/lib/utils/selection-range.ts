import { TextSegment, TextSegmentSelectionMode } from '../models';

/**
 * A range of positions (inclusive) in the flat list of all the segments of
 * a text.
 */
export interface SegmentRange {
  start: number;
  end: number;
}

type ModeSource = readonly Pick<TextSegment<unknown>, 'selectionMode'>[];

function modeAt(segments: ModeSource, pos: number): TextSegmentSelectionMode {
  return segments[pos]?.selectionMode ?? 'allowed';
}

/**
 * True if the segment at the specified position is attached to an allowed
 * base segment, i.e. it can be the last segment of a selection.
 */
function isAttachedToAllowed(segments: ModeSource, pos: number): boolean {
  let p = pos;
  while (p >= 0 && modeAt(segments, p) === 'attached') {
    p--;
  }
  return p >= 0 && modeAt(segments, p) === 'allowed';
}

/**
 * Clamp a focus position so that walking from the anchor to it never
 * crosses a `blocked` segment.
 * @returns The farthest position reachable from the anchor towards the
 * focus, or the anchor itself.
 */
export function clampFocus(
  segments: ModeSource,
  anchor: number,
  focus: number,
): number {
  focus = Math.max(0, Math.min(segments.length - 1, focus));
  const dir = focus >= anchor ? 1 : -1;
  let reached = anchor;
  for (let p = anchor + dir; dir > 0 ? p <= focus : p >= focus; p += dir) {
    if (modeAt(segments, p) === 'blocked') {
      break;
    }
    reached = p;
  }
  return reached;
}

/**
 * Resolve the range of segments selected by dragging (or extending) from an
 * anchor position to a focus position, according to the selection mode of
 * each segment:
 * - the range never crosses a `blocked` segment: it stops before it, and
 * if the anchor itself is blocked there is no selection;
 * - a range starting at an `attached` segment starts at its base instead,
 * and a range ending at a segment followed by attached segments includes
 * them;
 * - the range is trimmed so that it starts at an `allowed` segment and ends
 * at an `allowed` segment (or at an attached segment of an allowed one).
 *
 * @param segments The flat list of all the segments.
 * @param anchor The anchor position (where the selection started).
 * @param focus The focus position (where the selection ends).
 * @returns The range, or null if nothing can be selected.
 */
export function resolveSegmentRange(
  segments: ModeSource,
  anchor: number,
  focus: number,
): SegmentRange | null {
  const n = segments.length;
  if (anchor < 0 || anchor >= n || n === 0) {
    return null;
  }
  if (modeAt(segments, anchor) === 'blocked') {
    return null;
  }

  // walk from anchor to focus, stopping before any blocked segment
  const reached = clampFocus(segments, anchor, focus);
  let start = Math.min(anchor, reached);
  let end = Math.max(anchor, reached);

  // attached: snap start back to its base, extend end over followers
  while (start > 0 && modeAt(segments, start) === 'attached') {
    start--;
  }
  while (end + 1 < n && modeAt(segments, end + 1) === 'attached') {
    end++;
  }

  // trim to valid boundaries
  while (start <= end && modeAt(segments, start) !== 'allowed') {
    start++;
  }
  while (
    end >= start &&
    modeAt(segments, end) !== 'allowed' &&
    !(
      modeAt(segments, end) === 'attached' && isAttachedToAllowed(segments, end)
    )
  ) {
    end--;
  }
  return start <= end ? { start, end } : null;
}

/**
 * Find the next position where a caret can be placed, i.e. the first
 * `allowed` segment from the specified position (excluded) in the specified
 * direction.
 * @returns The position, or -1 if not found.
 */
export function findCaretPosition(
  segments: ModeSource,
  from: number,
  dir: 1 | -1,
): number {
  for (let p = from + dir; p >= 0 && p < segments.length; p += dir) {
    if (modeAt(segments, p) === 'allowed') {
      return p;
    }
  }
  return -1;
}

/**
 * Find the next position where the focus of a selection being extended can
 * move to from the specified position in the specified direction: this
 * skips `wrapped` and `attached` segments, and stops at `blocked` ones.
 * @returns The position, or -1 if the focus cannot move.
 */
export function findExtendPosition(
  segments: ModeSource,
  from: number,
  dir: 1 | -1,
): number {
  for (let p = from + dir; p >= 0 && p < segments.length; p += dir) {
    const mode = modeAt(segments, p);
    if (mode === 'blocked') {
      return -1;
    }
    if (mode === 'allowed') {
      return p;
    }
  }
  return -1;
}

/**
 * Find the allowed position nearest to the specified one within the range
 * [min, max], looking forward first and then backward.
 * @returns The position, or -1 if not found.
 */
export function findNearestAllowed(
  segments: ModeSource,
  pos: number,
  min: number,
  max: number,
): number {
  for (let p = pos; p <= max; p++) {
    if (modeAt(segments, p) === 'allowed') {
      return p;
    }
  }
  for (let p = pos - 1; p >= min; p--) {
    if (modeAt(segments, p) === 'allowed') {
      return p;
    }
  }
  return -1;
}
