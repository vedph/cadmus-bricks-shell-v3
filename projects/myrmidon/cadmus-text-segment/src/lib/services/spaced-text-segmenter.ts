import {
  TextSegment,
  TextSegmentBlock,
  TextSegmentSelectionMode,
  TextSegmenter,
} from '../models';

/**
 * Options for `SpacedTextSegmenter`.
 */
export interface SpacedTextSegmenterOptions<T = unknown> {
  /**
   * True to include each LF as the last segment of its block. Default is
   * false, i.e. LF just ends the block.
   */
  includeLf?: boolean;
  /**
   * The label for a space. Default is `_`.
   */
  spaceLabel?: string;
  /**
   * The selection mode for Unicode combining characters. Default is
   * `wrapped`; use `attached` to keep each combining character together
   * with its base character in any selection.
   */
  combiningMode?: Extract<TextSegmentSelectionMode, 'wrapped' | 'attached'>;
  /**
   * An optional function to build the payload of each segment.
   * @param char The segment character.
   * @param id The segment ID.
   * @param index The segment index.
   */
  payloadFactory?: (char: string, id: number, index: number) => T | undefined;
}

/**
 * The location of a segment in a token.
 */
interface TokenLocation {
  // 1-based block ordinal
  y: number;
  // 1-based token ordinal in block
  x: number;
  // 1-based character ordinal in token
  at: number;
  // token length in segments
  length: number;
}

interface TokenIndex<T> {
  // tokens in each block: blocks[y-1][x-1] = token segments
  tokens: TextSegment<T>[][][];
  // locations keyed by segment ID
  locations: Map<number, TokenLocation>;
  // flat positions keyed by segment ID
  positions: Map<number, number>;
  // all the segments in their order
  segments: TextSegment<T>[];
}

interface CoordsPoint {
  y: number;
  x: number;
  at?: number;
  run?: number;
}

const POINT_REGEX = /^(\d+)\.(\d+)(?:@(\d+)(?:x(\d+))?)?$/;
const WS_REGEX = /^\s+$/u;
const COMBINING_REGEX = /^\p{M}+$/u;

/**
 * A text segmenter where each character is a segment, and each line is a
 * block. Its coordinates are token-based and optionally character-based
 * within tokens, a token being any sequence of non-whitespace characters.
 * A point has form `Y.X@AxR` where `Y` is the block ordinal (1-N), `X` the
 * token ordinal in its block (1-N), and optionally `A` is the ordinal of the
 * first character in the token (1-N) and `R` the count of characters
 * (1-N, omitted when 1). A range spanning several tokens has two points
 * separated by `-`, both inclusive: the start point starts at `A` (and
 * extends to the end of its token), the end point ends at `A+R-1` of its
 * token. For instance, in `alpha beta`, `1.2@2x2` is `et` and
 * `1.1@4x2-1.2@1` is `ha b`.
 *
 * Segment IDs are code point ordinals (1-N), and indexes are the UTF-16
 * offsets in the source text (so that `text.substring(index, index +
 * value.length) === value`). CR and LF are not segments (unless LF is
 * included via options), but they still count for IDs and indexes.
 */
export class SpacedTextSegmenter<T = unknown> implements TextSegmenter<T> {
  private readonly _options: Required<
    Omit<SpacedTextSegmenterOptions<T>, 'payloadFactory'>
  > &
    Pick<SpacedTextSegmenterOptions<T>, 'payloadFactory'>;
  private readonly _indexes = new WeakMap<object, TokenIndex<T>>();

  constructor(options?: SpacedTextSegmenterOptions<T>) {
    this._options = {
      includeLf: options?.includeLf ?? false,
      spaceLabel: options?.spaceLabel ?? '_',
      combiningMode: options?.combiningMode ?? 'wrapped',
      payloadFactory: options?.payloadFactory,
    };
  }

  /**
   * Get the label for the specified character, if it needs one: ASCII
   * control characters get their Unicode Control Pictures symbols (U+2400),
   * and space gets the configured space label.
   */
  public getLabel(char: string): string | undefined {
    const code = char.charCodeAt(0);
    if (char.length === 1) {
      if (code < 0x20) return String.fromCharCode(0x2400 + code);
      if (code === 0x20) return this._options.spaceLabel;
      if (code === 0x7f) return '␡';
    }
    return undefined;
  }

  private createSegment(char: string, id: number, index: number): TextSegment<T> {
    const segment: TextSegment<T> = { id, index, value: char };
    const label = this.getLabel(char);
    if (label !== undefined) {
      segment.label = label;
    }
    if (WS_REGEX.test(char)) {
      segment.selectionMode = 'wrapped';
    } else if (COMBINING_REGEX.test(char)) {
      segment.selectionMode = this._options.combiningMode;
    }
    const payload = this._options.payloadFactory?.(char, id, index);
    if (payload !== undefined) {
      segment.payload = payload;
    }
    return segment;
  }

  /**
   * Get blocks of segments from the specified text: one segment per
   * character (code point), one block per line.
   */
  public getBlocks(text?: string): TextSegmentBlock<T>[] {
    if (!text) {
      return [];
    }
    const blocks: TextSegmentBlock<T>[] = [{ index: 0, segments: [] }];
    let id = 0;
    let index = 0;
    for (const char of text) {
      id++;
      const at = index;
      index += char.length;
      if (char === '\r') {
        continue;
      }
      const block = blocks[blocks.length - 1];
      if (char === '\n') {
        if (this._options.includeLf) {
          block.segments.push(this.createSegment(char, id, at));
        }
        blocks.push({ index: blocks.length, segments: [] });
        continue;
      }
      block.segments.push(this.createSegment(char, id, at));
    }
    return blocks;
  }

  private getIndex(blocks: readonly TextSegmentBlock<T>[]): TokenIndex<T> {
    let index = this._indexes.get(blocks);
    if (index) {
      return index;
    }
    index = {
      tokens: [],
      locations: new Map(),
      positions: new Map(),
      segments: [],
    };
    for (const block of blocks) {
      const tokens: TextSegment<T>[][] = [];
      let token: TextSegment<T>[] | null = null;
      for (const segment of block.segments) {
        index.positions.set(segment.id, index.segments.length);
        index.segments.push(segment);
        if (WS_REGEX.test(segment.value)) {
          token = null;
          continue;
        }
        if (!token) {
          token = [];
          tokens.push(token);
        }
        token.push(segment);
      }
      index.tokens.push(tokens);
    }
    index.tokens.forEach((tokens, yi) =>
      tokens.forEach((token, xi) =>
        token.forEach((segment, ai) =>
          index!.locations.set(segment.id, {
            y: yi + 1,
            x: xi + 1,
            at: ai + 1,
            length: token.length,
          }),
        ),
      ),
    );
    this._indexes.set(blocks, index);
    return index;
  }

  /**
   * Get the coordinates of the specified segments, assumed to be contiguous
   * and in text order. Whitespace segments at the edges are ignored.
   * @returns The coordinates, or an empty string if the segments contain
   * no token character.
   */
  public getSegmentCoords(
    blocks: readonly TextSegmentBlock<T>[],
    segments: readonly TextSegment<T>[],
  ): string {
    const index = this.getIndex(blocks);
    const located = segments
      .map((s) => index.locations.get(s.id))
      .filter((l): l is TokenLocation => !!l);
    if (!located.length) {
      return '';
    }
    const first = located[0];
    const last = located[located.length - 1];
    const run = (r: number) => (r > 1 ? `x${r}` : '');

    // single token
    if (first.y === last.y && first.x === last.x) {
      if (first.at === 1 && last.at === last.length) {
        return `${first.y}.${first.x}`;
      }
      return `${first.y}.${first.x}@${first.at}${run(last.at - first.at + 1)}`;
    }

    // several tokens
    const start =
      first.at === 1
        ? `${first.y}.${first.x}`
        : `${first.y}.${first.x}@${first.at}${run(first.length - first.at + 1)}`;
    const end =
      last.at === last.length
        ? `${last.y}.${last.x}`
        : `${last.y}.${last.x}@1${run(last.at)}`;
    return `${start}-${end}`;
  }

  private static parsePoint(text: string): CoordsPoint | null {
    const m = POINT_REGEX.exec(text.trim());
    if (!m) {
      return null;
    }
    const point: CoordsPoint = { y: +m[1], x: +m[2] };
    if (m[3] !== undefined) point.at = +m[3];
    if (m[4] !== undefined) point.run = +m[4];
    if (
      point.y < 1 ||
      point.x < 1 ||
      point.at === 0 ||
      point.run === 0
    ) {
      return null;
    }
    return point;
  }

  /**
   * Get the segments included by the specified coordinates.
   * @returns The segments, or null if the coordinates are not valid, or
   * refer to a non-existing location.
   */
  public getCoordsSegments(
    blocks: readonly TextSegmentBlock<T>[],
    coords: string,
  ): TextSegment<T>[] | null {
    const parts = (coords || '').split('-');
    if (parts.length > 2) {
      return null;
    }
    const points = parts.map((p) => SpacedTextSegmenter.parsePoint(p));
    if (points.some((p) => !p)) {
      return null;
    }
    const index = this.getIndex(blocks);

    // get the [first, last] character (0-based) picked from a point's token
    const pick = (
      p: CoordsPoint,
      whole: 'start' | 'end' | 'both',
    ): TextSegment<T>[] | null => {
      const token = index.tokens[p.y - 1]?.[p.x - 1];
      if (!token) {
        return null;
      }
      if (p.at === undefined) {
        return token;
      }
      const run = p.run ?? 1;
      const last = p.at + run - 1;
      if (last > token.length) {
        return null;
      }
      // a start point always extends to the token end
      if (whole === 'start') {
        return token.slice(p.at - 1);
      }
      return token.slice(p.at - 1, last);
    };

    if (points.length === 1) {
      return pick(points[0]!, 'both');
    }
    const head = pick(points[0]!, 'start');
    const tail = pick(points[1]!, 'end');
    if (!head?.length || !tail?.length) {
      return null;
    }
    const start = index.positions.get(head[0].id)!;
    const end = index.positions.get(tail[tail.length - 1].id)!;
    if (start > end) {
      return null;
    }
    return index.segments.slice(start, end + 1);
  }
}
