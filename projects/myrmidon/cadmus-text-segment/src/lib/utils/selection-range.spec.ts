import { TextSegmentSelectionMode } from '../models';
import {
  findCaretPosition,
  findExtendPosition,
  findNearestAllowed,
  resolveSegmentRange,
} from './selection-range';

/**
 * Build segments modes from a pattern: a=allowed, w=wrapped, t=attached,
 * b=blocked.
 */
function modes(pattern: string): { selectionMode?: TextSegmentSelectionMode }[] {
  const map: Record<string, TextSegmentSelectionMode | undefined> = {
    a: undefined,
    w: 'wrapped',
    t: 'attached',
    b: 'blocked',
  };
  return [...pattern].map((c) => ({ selectionMode: map[c] }));
}

describe('resolveSegmentRange', () => {
  it('should select a single allowed segment', () => {
    expect(resolveSegmentRange(modes('aaa'), 1, 1)).toEqual({
      start: 1,
      end: 1,
    });
  });

  it('should select forward and backward', () => {
    expect(resolveSegmentRange(modes('aaaa'), 1, 3)).toEqual({
      start: 1,
      end: 3,
    });
    expect(resolveSegmentRange(modes('aaaa'), 3, 1)).toEqual({
      start: 1,
      end: 3,
    });
  });

  it('should return null for empty segments or bad anchor', () => {
    expect(resolveSegmentRange([], 0, 0)).toBeNull();
    expect(resolveSegmentRange(modes('a'), 5, 0)).toBeNull();
  });

  it('should not start or end on wrapped segments', () => {
    // a a w a a: dragging from 0 to 2 selects only 0-1
    expect(resolveSegmentRange(modes('aawaa'), 0, 2)).toEqual({
      start: 0,
      end: 1,
    });
    // from the space to the right: starts after it
    expect(resolveSegmentRange(modes('aawaa'), 2, 4)).toEqual({
      start: 3,
      end: 4,
    });
    // wrapping the space is fine
    expect(resolveSegmentRange(modes('aawaa'), 0, 4)).toEqual({
      start: 0,
      end: 4,
    });
    // only the space: nothing
    expect(resolveSegmentRange(modes('aawaa'), 2, 2)).toBeNull();
  });

  it('should stop before blocked segments', () => {
    expect(resolveSegmentRange(modes('aabaa'), 0, 4)).toEqual({
      start: 0,
      end: 1,
    });
    expect(resolveSegmentRange(modes('aabaa'), 4, 0)).toEqual({
      start: 3,
      end: 4,
    });
  });

  it('should not select from a blocked anchor', () => {
    expect(resolveSegmentRange(modes('aabaa'), 2, 4)).toBeNull();
  });

  it('should trim wrapped segments before a blocked one', () => {
    expect(resolveSegmentRange(modes('aawba'), 0, 4)).toEqual({
      start: 0,
      end: 1,
    });
  });

  it('should include attached segments after the end', () => {
    // a t t w a
    expect(resolveSegmentRange(modes('attwa'), 0, 0)).toEqual({
      start: 0,
      end: 2,
    });
    // ending on the wrapped trims back to the attached ones
    expect(resolveSegmentRange(modes('attwa'), 0, 3)).toEqual({
      start: 0,
      end: 2,
    });
  });

  it('should start at the base of an attached segment', () => {
    expect(resolveSegmentRange(modes('atwa'), 1, 3)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it('should clamp focus', () => {
    expect(resolveSegmentRange(modes('aaa'), 0, 99)).toEqual({
      start: 0,
      end: 2,
    });
  });
});

describe('caret positions', () => {
  it('should find the next allowed caret position', () => {
    expect(findCaretPosition(modes('awba'), 0, 1)).toBe(3);
    expect(findCaretPosition(modes('awba'), 3, -1)).toBe(0);
    expect(findCaretPosition(modes('aw'), 0, 1)).toBe(-1);
    expect(findCaretPosition(modes('aa'), -1, 1)).toBe(0);
  });

  it('should find extend positions, stopping at blocked', () => {
    expect(findExtendPosition(modes('awa'), 0, 1)).toBe(2);
    expect(findExtendPosition(modes('aba'), 0, 1)).toBe(-1);
    expect(findExtendPosition(modes('a'), 0, 1)).toBe(-1);
  });

  it('should find nearest allowed', () => {
    expect(findNearestAllowed(modes('awwa'), 1, 0, 3)).toBe(3);
    expect(findNearestAllowed(modes('awww'), 2, 0, 3)).toBe(0);
    expect(findNearestAllowed(modes('www'), 1, 0, 2)).toBe(-1);
  });
});
