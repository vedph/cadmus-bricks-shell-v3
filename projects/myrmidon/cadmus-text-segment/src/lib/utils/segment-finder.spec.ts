import { SpacedTextSegmenter } from '../services/spaced-text-segmenter';
import { TextSegmentBlock } from '../models';
import { findTextSegments } from './segment-finder';

const blocks = new SpacedTextSegmenter().getBlocks('Alpha beta\ngamma');

describe('findTextSegments', () => {
  it('should find nothing for empty query', () => {
    expect(
      findTextSegments(blocks, {
        query: '',
        crossSegments: false,
        caseSensitive: false,
      }),
    ).toEqual([]);
  });

  it('should find within segments, case insensitive', () => {
    const matches = findTextSegments(blocks, {
      query: 'a',
      crossSegments: false,
      caseSensitive: false,
    });
    // Alph[a] bet[a] g[a]mm[a] + [A]
    expect(matches).toEqual([[1], [5], [10], [13], [16]]);
  });

  it('should find within segments, case sensitive', () => {
    const matches = findTextSegments(blocks, {
      query: 'A',
      crossSegments: false,
      caseSensitive: true,
    });
    expect(matches).toEqual([[1]]);
  });

  it('should not find multi-char query within single-char segments', () => {
    expect(
      findTextSegments(blocks, {
        query: 'ph',
        crossSegments: false,
        caseSensitive: false,
      }),
    ).toEqual([]);
  });

  it('should find across segments', () => {
    const matches = findTextSegments(blocks, {
      query: 'a b',
      crossSegments: true,
      caseSensitive: false,
    });
    expect(matches).toEqual([[5, 6, 7]]);
  });

  it('should find non-overlapping matches across segments', () => {
    const matches = findTextSegments(blocks, {
      query: 'mm',
      crossSegments: true,
      caseSensitive: false,
    });
    expect(matches).toEqual([[14, 15]]);
  });

  it('should not cross block boundaries', () => {
    expect(
      findTextSegments(blocks, {
        query: 'ag',
        crossSegments: true,
        caseSensitive: false,
      }),
    ).toEqual([]);
  });

  it('should find in multi-char segments', () => {
    const words: TextSegmentBlock<unknown>[] = [
      {
        index: 0,
        segments: [
          { id: 1, index: 0, value: 'hello' },
          { id: 2, index: 1, value: ' ' },
          { id: 3, index: 2, value: 'world' },
        ],
      },
    ];
    expect(
      findTextSegments(words, {
        query: 'lo wo',
        crossSegments: true,
        caseSensitive: false,
      }),
    ).toEqual([[1, 2, 3]]);
    expect(
      findTextSegments(words, {
        query: 'or',
        crossSegments: false,
        caseSensitive: false,
      }),
    ).toEqual([[3]]);
  });

  it('should keep offsets right when lowercasing changes length', () => {
    // "İ" lowercases to 2 UTF-16 code units
    const special: TextSegmentBlock<unknown>[] = [
      {
        index: 0,
        segments: [
          { id: 1, index: 0, value: 'İ' },
          { id: 2, index: 1, value: 'x' },
          { id: 3, index: 2, value: 'y' },
        ],
      },
    ];
    expect(
      findTextSegments(special, {
        query: 'xy',
        crossSegments: true,
        caseSensitive: false,
      }),
    ).toEqual([[2, 3]]);
  });
});
