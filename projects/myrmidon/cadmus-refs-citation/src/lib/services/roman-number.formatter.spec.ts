import { RomanNumberFormatter } from './roman-number.formatter';

describe('RomanNumberFormatter', () => {
  describe('format', () => {
    it('formats a positive value as an uppercase Roman number by default', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.format(12)).toBe('XII');
    });

    it('formats a positive value as a lowercase Roman number when configured', () => {
      const formatter = new RomanNumberFormatter(true);
      expect(formatter.format(12)).toBe('xii');
    });

    it('formats a value of 1 correctly', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.format(1)).toBe('I');
    });

    it('returns an empty string for zero', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.format(0)).toBe('');
    });

    it('returns an empty string for a negative value', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.format(-5)).toBe('');
    });

    it('formats a large value using subtractive notation', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.format(1994)).toBe('MCMXCIV');
    });
  });

  describe('parse', () => {
    it('returns undefined for undefined text', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.parse(undefined)).toBeUndefined();
    });

    it('returns undefined for null text', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.parse(null)).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.parse('')).toBeUndefined();
    });

    it('parses a plain Roman number with no suffix pattern', () => {
      const formatter = new RomanNumberFormatter();
      expect(formatter.parse('XII')).toEqual({ n: 12 });
    });

    it('extracts and strips a suffix matching the given pattern', () => {
      const formatter = new RomanNumberFormatter();
      const result = formatter.parse('XIIa', '([a-z])$');
      expect(result).toEqual({ n: 12, suffix: 'a' });
    });

    it('leaves the suffix undefined when the suffix pattern does not match', () => {
      const formatter = new RomanNumberFormatter();
      const result = formatter.parse('XII', '([a-z])$');
      expect(result).toEqual({ n: 12 });
      expect(result?.suffix).toBeUndefined();
    });

    it('round-trips format/parse for a complex value', () => {
      const formatter = new RomanNumberFormatter();
      const text = formatter.format(1994);
      expect(formatter.parse(text)).toEqual({ n: 1994 });
    });
  });
});
