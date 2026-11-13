import { TextSegment } from '../models';
import { SpacedTextSegmenter } from './spaced-text-segmenter';

const SAMPLE = 'alpha beta\ngamma\ndelta epsilon waw\nzeta';

function joinValues(segments: readonly TextSegment<unknown>[] | null): string {
  return (segments ?? []).map((s) => s.value).join('');
}

describe('SpacedTextSegmenter', () => {
  describe('getBlocks', () => {
    it('should return no blocks for empty or undefined text', () => {
      const segmenter = new SpacedTextSegmenter();
      expect(segmenter.getBlocks()).toEqual([]);
      expect(segmenter.getBlocks('')).toEqual([]);
    });

    it('should build the blocks of the sample text', () => {
      const blocks = new SpacedTextSegmenter().getBlocks(SAMPLE);
      expect(blocks.length).toBe(4);
      expect(blocks.map((b) => b.index)).toEqual([0, 1, 2, 3]);
      expect(blocks.map((b) => joinValues(b.segments))).toEqual([
        'alpha beta',
        'gamma',
        'delta epsilon waw',
        'zeta',
      ]);
    });

    it('should assign IDs and indexes counting skipped LF', () => {
      const blocks = new SpacedTextSegmenter().getBlocks(SAMPLE);
      expect(blocks[0].segments[0]).toEqual({ id: 1, index: 0, value: 'a' });
      expect(blocks[0].segments[5]).toEqual({
        id: 6,
        index: 5,
        value: ' ',
        label: '_',
        selectionMode: 'wrapped',
      });
      expect(blocks[0].segments[9]).toEqual({ id: 10, index: 9, value: 'a' });
      // LF has ID 11 and index 10
      expect(blocks[1].segments[0]).toEqual({ id: 12, index: 11, value: 'g' });
    });

    it('should skip CR but count it', () => {
      const blocks = new SpacedTextSegmenter().getBlocks('a\r\nb');
      expect(blocks.length).toBe(2);
      expect(blocks[1].segments[0]).toEqual({ id: 4, index: 3, value: 'b' });
    });

    it('should include LF as the last block segment when requested', () => {
      const blocks = new SpacedTextSegmenter({ includeLf: true }).getBlocks(
        'ab\ncd',
      );
      expect(blocks[0].segments.length).toBe(3);
      expect(blocks[0].segments[2]).toEqual({
        id: 3,
        index: 2,
        value: '\n',
        label: '␊',
        selectionMode: 'wrapped',
      });
    });

    it('should keep empty blocks for empty lines', () => {
      const blocks = new SpacedTextSegmenter().getBlocks('a\n\nb');
      expect(blocks.map((b) => b.segments.length)).toEqual([1, 0, 1]);
    });

    it('should label control characters with control pictures', () => {
      const segmenter = new SpacedTextSegmenter();
      expect(segmenter.getLabel('\t')).toBe('␉');
      expect(segmenter.getLabel('\x00')).toBe('␀');
      expect(segmenter.getLabel('\x7f')).toBe('␡');
      expect(segmenter.getLabel('a')).toBeUndefined();
    });

    it('should use the configured space label', () => {
      const blocks = new SpacedTextSegmenter({ spaceLabel: '␣' }).getBlocks(
        'a b',
      );
      expect(blocks[0].segments[1].label).toBe('␣');
    });

    it('should set the combining mode for combining characters', () => {
      const text = 'é';
      expect(
        new SpacedTextSegmenter().getBlocks(text)[0].segments[1].selectionMode,
      ).toBe('wrapped');
      expect(
        new SpacedTextSegmenter({ combiningMode: 'attached' }).getBlocks(text)[0]
          .segments[1].selectionMode,
      ).toBe('attached');
    });

    it('should treat astral characters as single segments', () => {
      const blocks = new SpacedTextSegmenter().getBlocks('a\u{1F600}b');
      const segments = blocks[0].segments;
      expect(segments.length).toBe(3);
      expect(segments[1]).toEqual({ id: 2, index: 1, value: '\u{1F600}' });
      // the index is the UTF-16 offset
      expect(segments[2]).toEqual({ id: 3, index: 3, value: 'b' });
    });

    it('should build payloads with the payload factory', () => {
      const blocks = new SpacedTextSegmenter<{ code: number }>({
        payloadFactory: (c) => ({ code: c.codePointAt(0)! }),
      }).getBlocks('A');
      expect(blocks[0].segments[0].payload).toEqual({ code: 65 });
    });
  });

  describe('coordinates', () => {
    const segmenter = new SpacedTextSegmenter({ includeLf: true });
    const blocks = segmenter.getBlocks(SAMPLE);

    function coordsOf(text: string): string | null {
      const segments = segmenter.getCoordsSegments(blocks, text);
      return segments === null ? null : joinValues(segments);
    }

    it('should parse whole token 2.1', () => {
      expect(coordsOf('2.1')).toBe('gamma');
    });

    it('should parse token portion 1.2@2x2', () => {
      expect(coordsOf('1.2@2x2')).toBe('et');
    });

    it('should parse implicit run 1.2@3', () => {
      expect(coordsOf('1.2@3')).toBe('t');
      expect(coordsOf('1.2@3x1')).toBe('t');
    });

    it('should parse range 3.1@4x2-3.2@1', () => {
      expect(coordsOf('3.1@4x2-3.2@1')).toBe('ta e');
    });

    it('should parse range across blocks 1.2@4-4.1@1x2', () => {
      // note: beta@4 is "a"
      expect(coordsOf('1.2@4-4.1@1x2')).toBe(
        'a\ngamma\ndelta epsilon waw\nze',
      );
    });

    it('should parse whole tokens range', () => {
      expect(coordsOf('1.1-1.2')).toBe('alpha beta');
    });

    it('should return null for invalid coordinates', () => {
      expect(coordsOf('')).toBeNull();
      expect(coordsOf('x')).toBeNull();
      expect(coordsOf('1')).toBeNull();
      expect(coordsOf('0.1')).toBeNull();
      expect(coordsOf('1.1@0')).toBeNull();
      expect(coordsOf('1.1-1.2-1.3')).toBeNull();
    });

    it('should return null for out of range coordinates', () => {
      expect(coordsOf('9.1')).toBeNull();
      expect(coordsOf('1.3')).toBeNull();
      expect(coordsOf('1.2@4x2')).toBeNull();
      // end before start
      expect(coordsOf('2.1-1.1')).toBeNull();
    });

    function idsFor(text: string): TextSegment<unknown>[] {
      return segmenter.getCoordsSegments(blocks, text)!;
    }

    it('should get coords for whole token', () => {
      expect(segmenter.getSegmentCoords(blocks, idsFor('2.1'))).toBe('2.1');
    });

    it('should get coords for token portion', () => {
      expect(segmenter.getSegmentCoords(blocks, idsFor('1.2@2x2'))).toBe(
        '1.2@2x2',
      );
      expect(segmenter.getSegmentCoords(blocks, idsFor('1.2@3'))).toBe(
        '1.2@3',
      );
    });

    it('should get coords for ranges', () => {
      expect(segmenter.getSegmentCoords(blocks, idsFor('3.1@4x2-3.2@1'))).toBe(
        '3.1@4x2-3.2@1',
      );
      expect(segmenter.getSegmentCoords(blocks, idsFor('1.2@4-4.1@1x2'))).toBe(
        '1.2@4-4.1@1x2',
      );
      expect(segmenter.getSegmentCoords(blocks, idsFor('1.1-1.2'))).toBe(
        '1.1-1.2',
      );
    });

    it('should ignore whitespace at selection edges', () => {
      const segments = blocks[0].segments.slice(4, 7); // "a b"
      expect(segmenter.getSegmentCoords(blocks, segments)).toBe(
        '1.1@5-1.2@1',
      );
    });

    it('should return empty coords for whitespace only', () => {
      expect(
        segmenter.getSegmentCoords(blocks, [blocks[0].segments[5]]),
      ).toBe('');
      expect(segmenter.getSegmentCoords(blocks, [])).toBe('');
    });
  });
});
