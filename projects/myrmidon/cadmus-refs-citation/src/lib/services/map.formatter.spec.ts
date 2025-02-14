import { CitMappedValues } from '../models';
import { MapFormatter } from './map.formatter';

describe('MapFormatter', () => {
  let formatter: MapFormatter;

  beforeEach(() => {
    formatter = new MapFormatter();
  });

  it('should not be configured initially', () => {
    expect(formatter.isConfigured()).toBe(false);
  });

  it('should be configured after calling configure', () => {
    const mappedValues: CitMappedValues = { one: 1, two: 2 };
    formatter.configure(mappedValues);
    expect(formatter.isConfigured()).toBe(true);
  });

  it('should format a number correctly', () => {
    const mappedValues: CitMappedValues = { one: 1, two: 2 };
    formatter.configure(mappedValues);
    expect(formatter.format(1)).toBe('one');
    expect(formatter.format(2)).toBe('two');
    expect(formatter.format(3)).toBe('3');
  });

  it('should parse a text correctly', () => {
    const mappedValues: CitMappedValues = { one: 1, two: 2 };
    formatter.configure(mappedValues);
    expect(formatter.parse('one')).toEqual({ n: 1, suffix: undefined });
    expect(formatter.parse('two')).toEqual({ n: 2, suffix: undefined });
    expect(formatter.parse('three')).toBeUndefined();
  });

  it('should parse a text with suffix correctly', () => {
    const mappedValues: CitMappedValues = { one: 1, two: 2 };
    formatter.configure(mappedValues);
    expect(formatter.parse('oneA', 'A')).toEqual({ n: 1, suffix: 'A' });
    expect(formatter.parse('twoB', 'B')).toEqual({ n: 2, suffix: 'B' });
    expect(formatter.parse('threeC', 'C')).toBeUndefined();
  });

  it('should return undefined when parsing an empty text', () => {
    expect(formatter.parse(null)).toBeUndefined();
    expect(formatter.parse(undefined)).toBeUndefined();
    expect(formatter.parse('')).toBeUndefined();
  });

  it('should return the original number as string if not configured', () => {
    expect(formatter.format(1)).toBe('1');
    expect(formatter.format(2)).toBe('2');
  });
});
