import { TextSegmentBlock, TextSegmentFindOptions } from '../models';

/**
 * Find text in the segments of the specified blocks.
 * @param blocks The blocks.
 * @param options The find options. When `crossSegments` is false, each
 * segment whose value contains the query is a match; when true, the values
 * of all the segments in each block are concatenated, and each occurrence of
 * the query in it is a match including all the segments it overlaps (matches
 * never cross block boundaries, and do not overlap each other).
 * @returns The matches in text order, each with the IDs of its segments.
 */
export function findTextSegments(
  blocks: readonly TextSegmentBlock<unknown>[],
  options: TextSegmentFindOptions,
): number[][] {
  const query = options.caseSensitive
    ? options.query
    : options.query.toLowerCase();
  if (!query) {
    return [];
  }
  const norm = (s: string) => (options.caseSensitive ? s : s.toLowerCase());
  const matches: number[][] = [];

  for (const block of blocks) {
    if (!options.crossSegments) {
      for (const segment of block.segments) {
        if (norm(segment.value).includes(query)) {
          matches.push([segment.id]);
        }
      }
      continue;
    }

    // concatenate the normalized values, keeping each segment's span
    // (normalization may change the length of a value)
    const starts: number[] = [];
    const ends: number[] = [];
    let text = '';
    for (const segment of block.segments) {
      starts.push(text.length);
      text += norm(segment.value);
      ends.push(text.length);
    }
    const n = block.segments.length;
    let from = 0;
    let at: number;
    // i is the index of the first segment which may overlap a match:
    // as matches are found in order, it only moves forward
    let i = 0;
    while ((at = text.indexOf(query, from)) > -1) {
      const end = at + query.length;
      while (i < n && ends[i] <= at) {
        i++;
      }
      const ids: number[] = [];
      for (let j = i; j < n && starts[j] < end; j++) {
        if (ends[j] > at) {
          ids.push(block.segments[j].id);
        }
      }
      matches.push(ids);
      from = end;
    }
  }
  return matches;
}
