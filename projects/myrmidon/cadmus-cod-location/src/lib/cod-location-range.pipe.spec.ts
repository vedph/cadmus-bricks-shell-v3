import { CodLocationRangePipe } from './cod-location-range.pipe';
import { CodLocationRange } from './cod-location-parser';

describe('CodLocationRangePipe', () => {
  let pipe: CodLocationRangePipe;

  beforeEach(() => {
    pipe = new CodLocationRangePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return null for null value', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('should return null for undefined value', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('should return null for empty string value', () => {
    expect(pipe.transform('')).toBeNull();
  });

  it('should return null for an empty array', () => {
    expect(pipe.transform([])).toBeNull();
  });

  it('should transform an array with a single range (start=end) to a single location string', () => {
    const ranges: CodLocationRange[] = [
      { start: { n: 1, v: false }, end: { n: 1, v: false } },
    ];
    expect(pipe.transform(ranges)).toBe('1r');
  });

  it('should transform an array with a proper range to a dashed string', () => {
    const ranges: CodLocationRange[] = [
      { start: { n: 1, v: false }, end: { n: 3, v: true } },
    ];
    expect(pipe.transform(ranges)).toBe('1r-3v');
  });

  it('should transform an array with multiple ranges separated by space', () => {
    const ranges: CodLocationRange[] = [
      { start: { n: 1, v: false }, end: { n: 3, v: true } },
      { start: { n: 4, v: false }, end: { n: 4, v: false } },
      { start: { n: 7, v: false }, end: { n: 11, v: true } },
    ];
    expect(pipe.transform(ranges)).toBe('1r-3v 4r 7r-11v');
  });

  it('should wrap a single non-array range object into an array before transforming', () => {
    const range: CodLocationRange = {
      start: { n: 1, v: false },
      end: { n: 3, v: true },
    };
    expect(pipe.transform(range)).toBe('1r-3v');
  });

  it('should pass through ignored extra arguments', () => {
    const ranges: CodLocationRange[] = [
      { start: { n: 1 }, end: { n: 1 } },
    ];
    expect(pipe.transform(ranges, 'ignored')).toBe('1');
  });
});
