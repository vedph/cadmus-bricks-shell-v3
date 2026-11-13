import { Injectable, computed, linkedSignal, signal } from '@angular/core';

import {
  TextSegment,
  TextSegmentBlock,
  TextSegmentFindOptions,
} from '../models';
import {
  clampFocus,
  findCaretPosition,
  findExtendPosition,
  findNearestAllowed,
  resolveSegmentRange,
} from '../utils/selection-range';
import { findTextSegments } from '../utils/segment-finder';

interface BlockRange {
  // start position (inclusive) in the flat list of segments
  start: number;
  // end position (exclusive)
  end: number;
}

function sameIds(a: readonly number[], b: readonly number[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * The view state of a segmented text: selection, caret and search results.
 * This is provided by each `SegmentedTextView` instance, and contains all
 * the selection and navigation logic, independently from the DOM. The
 * selection is linear: it is defined by an anchor (where it started) and a
 * focus (where it ends, i.e. the caret), both kept as segment IDs, so that
 * it survives changes in the blocks when the same IDs are still present.
 * Actions return true when they changed the selection.
 */
@Injectable()
export class SegmentedTextStore<T = unknown> {
  private readonly _anchorId = signal<number | null>(null);
  private readonly _focusId = signal<number | null>(null);
  private readonly _selectedIds = signal<readonly number[]>([]);

  /**
   * The blocks of the text.
   */
  public readonly blocks = signal<readonly TextSegmentBlock<T>[]>([]);

  /**
   * All the segments of the text in their order, i.e. the flat list of
   * the blocks segments. A "position" is an index in this list.
   */
  public readonly segments = computed<readonly TextSegment<T>[]>(() =>
    this.blocks().flatMap((b) => b.segments),
  );

  /**
   * Map of positions keyed by segment ID.
   */
  public readonly positions = computed(() => {
    const map = new Map<number, number>();
    this.segments().forEach((s, i) => map.set(s.id, i));
    return map;
  });

  private readonly _blockRanges = computed<BlockRange[]>(() => {
    let start = 0;
    return this.blocks().map((b) => {
      const range = { start, end: start + b.segments.length };
      start = range.end;
      return range;
    });
  });

  /**
   * The IDs of the selected segments, in their text order.
   */
  public readonly selectedIds = this._selectedIds.asReadonly();

  /**
   * The set of the selected segments IDs, for fast lookup.
   */
  public readonly selectedSet = computed<ReadonlySet<number>>(
    () => new Set(this._selectedIds()),
  );

  /**
   * The selected segments, in their text order.
   */
  public readonly selectedSegments = computed<TextSegment<T>[]>(() => {
    const segments = this.segments();
    const positions = this.positions();
    return this._selectedIds()
      .map((id) => segments[positions.get(id)!])
      .filter((s) => !!s);
  });

  /**
   * The ID of the segment with the caret (the selection focus), if any.
   */
  public readonly caretId = computed<number | null>(() => {
    const id = this._focusId();
    return id !== null && this.positions().has(id) ? id : null;
  });

  /**
   * The current find options.
   */
  public readonly find = signal<TextSegmentFindOptions>({
    query: '',
    crossSegments: false,
    caseSensitive: false,
  });

  /**
   * The search matches in text order, each with its segments IDs.
   */
  public readonly matches = computed<number[][]>(() =>
    findTextSegments(this.blocks(), this.find()),
  );

  /**
   * The set of the IDs of all the segments in any search match.
   */
  public readonly hitSet = computed<ReadonlySet<number>>(
    () => new Set(this.matches().flat()),
  );

  /**
   * The index of the current match, or -1. This is reset whenever matches
   * change.
   */
  public readonly currentMatch = linkedSignal<number[][], number>({
    source: this.matches,
    computation: () => -1,
  });

  // ── internals ───────────────────────────────────────────────────────────

  private posOf(id: number | null): number {
    return id === null ? -1 : (this.positions().get(id) ?? -1);
  }

  private blockIndexOf(pos: number): number {
    const ranges = this._blockRanges();
    // binary search
    let lo = 0;
    let hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (pos < ranges[mid].start) {
        hi = mid - 1;
      } else if (pos >= ranges[mid].end) {
        lo = mid + 1;
      } else {
        return mid;
      }
    }
    return -1;
  }

  private setIds(ids: readonly number[]): boolean {
    if (sameIds(ids, this._selectedIds())) {
      return false;
    }
    this._selectedIds.set(ids);
    return true;
  }

  /**
   * Set anchor and focus, and select the range resolved between them.
   */
  private applyRange(anchor: number, focus: number): boolean {
    const segments = this.segments();
    // the focus cannot go past a blocked segment
    if (anchor > -1 && segments[anchor]?.selectionMode !== 'blocked') {
      focus = clampFocus(segments, anchor, focus);
    }
    this._anchorId.set(segments[anchor]?.id ?? null);
    this._focusId.set(segments[focus]?.id ?? null);
    const range = resolveSegmentRange(segments, anchor, focus);
    return this.setIds(
      range
        ? segments.slice(range.start, range.end + 1).map((s) => s.id)
        : [],
    );
  }

  /**
   * Move the focus to the specified position, extending the selection from
   * the current anchor, or collapsing it there.
   */
  private moveFocus(pos: number, extend: boolean): boolean {
    if (pos < 0) {
      return false;
    }
    const anchor = this.posOf(this._anchorId());
    return this.applyRange(extend && anchor > -1 ? anchor : pos, pos);
  }

  // ── actions ─────────────────────────────────────────────────────────────

  /**
   * Set the blocks of the text. The current selection is kept for the
   * segments which are still present.
   * @returns True if the selection changed.
   */
  public setBlocks(blocks: readonly TextSegmentBlock<T>[]): boolean {
    this.blocks.set(blocks);
    const positions = this.positions();
    if (this._anchorId() !== null && !positions.has(this._anchorId()!)) {
      this._anchorId.set(null);
    }
    if (this._focusId() !== null && !positions.has(this._focusId()!)) {
      this._focusId.set(null);
    }
    return this.setIds(this._selectedIds().filter((id) => positions.has(id)));
  }

  /**
   * Start a selection at the specified segment (e.g. on pointer down).
   * @param id The segment ID.
   * @param extend True to extend the current selection up to this segment
   * (e.g. on SHIFT+click) rather than starting a new one.
   */
  public startAt(id: number, extend = false): boolean {
    return this.moveFocus(this.posOf(id), extend);
  }

  /**
   * Extend the selection from its anchor to the specified segment (e.g.
   * while dragging).
   */
  public extendTo(id: number): boolean {
    if (id === this._focusId()) {
      return false;
    }
    return this.moveFocus(this.posOf(id), true);
  }

  /**
   * Move the caret by one segment in the specified direction.
   * @param dir The direction.
   * @param extend True to extend the selection, false to collapse it to the
   * segment with the caret.
   */
  public moveCaret(dir: 1 | -1, extend = false): boolean {
    const segments = this.segments();
    const focus = this.posOf(this._focusId());
    if (focus < 0) {
      // no caret yet: start from the text edge
      return this.moveFocus(
        findCaretPosition(segments, dir > 0 ? -1 : segments.length, dir),
        false,
      );
    }
    return this.moveFocus(
      extend
        ? findExtendPosition(segments, focus, dir)
        : findCaretPosition(segments, focus, dir),
      extend,
    );
  }

  /**
   * Move the caret to the same relative position in the previous or next
   * non-empty block.
   */
  public moveBlock(dir: 1 | -1, extend = false): boolean {
    const focus = this.posOf(this._focusId());
    if (focus < 0) {
      return this.moveCaret(dir, extend);
    }
    const ranges = this._blockRanges();
    const bi = this.blockIndexOf(focus);
    const offset = focus - ranges[bi].start;
    for (let b = bi + dir; b >= 0 && b < ranges.length; b += dir) {
      const r = ranges[b];
      if (r.end > r.start) {
        const target = Math.min(r.start + offset, r.end - 1);
        return this.moveFocus(
          findNearestAllowed(this.segments(), target, r.start, r.end - 1),
          extend,
        );
      }
    }
    return false;
  }

  /**
   * Move the caret to the start or end of its block.
   */
  public moveToBlockEdge(edge: 'start' | 'end', extend = false): boolean {
    const focus = this.posOf(this._focusId());
    if (focus < 0) {
      return this.moveToTextEdge(edge, extend);
    }
    const r = this._blockRanges()[this.blockIndexOf(focus)];
    return this.moveToEdge(r.start, r.end - 1, edge, extend);
  }

  /**
   * Move the caret to the start or end of the text.
   */
  public moveToTextEdge(edge: 'start' | 'end', extend = false): boolean {
    return this.moveToEdge(0, this.segments().length - 1, edge, extend);
  }

  private moveToEdge(
    min: number,
    max: number,
    edge: 'start' | 'end',
    extend: boolean,
  ): boolean {
    const segments = this.segments();
    let pos: number;
    if (edge === 'start') {
      pos = findCaretPosition(segments, min - 1, 1);
      if (pos > max) pos = -1;
    } else {
      pos = findCaretPosition(segments, max + 1, -1);
      if (pos < min) pos = -1;
    }
    return this.moveFocus(pos, extend);
  }

  /**
   * Select all the text, within the limits of blocked segments starting
   * from the first selectable segment.
   */
  public selectAll(): boolean {
    const segments = this.segments();
    const first = findCaretPosition(segments, -1, 1);
    if (first < 0) {
      return false;
    }
    return this.applyRange(first, segments.length - 1);
  }

  /**
   * Clear the selection and the caret.
   */
  public clear(): boolean {
    this._anchorId.set(null);
    this._focusId.set(null);
    return this.setIds([]);
  }

  /**
   * Directly select the specified segments, bypassing selection rules (e.g.
   * when selecting from coordinates or from a binding). Unknown IDs are
   * ignored, and the selection is sorted in text order.
   */
  public setSelectedIds(ids: readonly number[]): boolean {
    const positions = this.positions();
    const sorted = ids
      .filter((id) => positions.has(id))
      .sort((a, b) => positions.get(a)! - positions.get(b)!);
    const unique = sorted.filter((id, i) => i === 0 || sorted[i - 1] !== id);
    this._anchorId.set(unique.length ? unique[0] : null);
    this._focusId.set(unique.length ? unique[unique.length - 1] : null);
    return this.setIds(unique);
  }

  /**
   * Go to the next or previous search match (wrapping around), selecting it.
   * @returns The IDs of the match segments, or null if no match.
   */
  public goToMatch(dir: 1 | -1): number[] | null {
    const matches = this.matches();
    if (!matches.length) {
      return null;
    }
    const current = this.currentMatch();
    const next =
      current < 0
        ? dir > 0
          ? 0
          : matches.length - 1
        : (current + dir + matches.length) % matches.length;
    this.currentMatch.set(next);
    this.setSelectedIds(matches[next]);
    return matches[next];
  }
}
