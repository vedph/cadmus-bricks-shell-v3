import { ArrayIntersectPipe } from './array-intersect.pipe';

describe('ArrayIntersectPipe', () => {
  let pipe: ArrayIntersectPipe;

  beforeEach(() => {
    pipe = new ArrayIntersectPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the intersection of two arrays preserving value order', () => {
    const result = pipe.transform(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(result).toEqual(['b', 'c']);
  });

  it('should return an empty array when there is no intersection', () => {
    const result = pipe.transform(['a', 'b'], ['x', 'y']);
    expect(result).toEqual([]);
  });

  it('should preserve duplicates present in the source array', () => {
    const result = pipe.transform(['a', 'b', 'a'], ['a']);
    expect(result).toEqual(['a', 'a']);
  });

  it('should not mutate the original value array', () => {
    const value = ['a', 'b', 'c'];
    const result = pipe.transform(value, ['b']);
    expect(value).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(value);
  });

  it('should return value unchanged when value is null', () => {
    expect(pipe.transform(null, ['a'])).toBeNull();
  });

  it('should return value unchanged when value is undefined', () => {
    expect(pipe.transform(undefined, ['a'])).toBeUndefined();
  });

  it('should return value unchanged when value is an empty array', () => {
    const value: string[] = [];
    expect(pipe.transform(value, ['a'])).toBe(value);
  });

  it('should return value unchanged when no args are passed', () => {
    const value = ['a', 'b'];
    expect(pipe.transform(value)).toBe(value);
  });

  it('should return value unchanged when args[0] is undefined', () => {
    const value = ['a', 'b'];
    expect(pipe.transform(value, undefined)).toBe(value);
  });

  it('should return value unchanged when args[0] is an empty array', () => {
    const value = ['a', 'b'];
    expect(pipe.transform(value, [])).toBe(value);
  });

  it('should return value unchanged when value is not an array', () => {
    const value = 'not-an-array';
    expect(pipe.transform(value, ['a'])).toBe(value);
  });

  it('should return value unchanged when args[0] is not an array', () => {
    const value = ['a', 'b'];
    expect(pipe.transform(value, 'not-an-array')).toBe(value);
  });
});
