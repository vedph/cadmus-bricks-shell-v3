import { PhysicalSizeParser } from './physical-size-parser';

describe('PhysicalSizeParser', () => {
  it('returns null for null input', () => {
    const result = PhysicalSizeParser.parse(null);
    expect(result).toBeNull();
  });

  it('returns null for undefined input', () => {
    const result = PhysicalSizeParser.parse(undefined);
    expect(result).toBeNull();
  });

  it('returns null for invalid input', () => {
    const result = PhysicalSizeParser.parse('invalid input');
    expect(result).toBeNull();
  });

  it('parses full format correctly', () => {
    const result = PhysicalSizeParser.parse('(tag) 12.3cm (tag-1) x 4cm (tag-2) x 12mm (tag-3) {note}');
    expect(result).toEqual({
      tag: 'tag',
      w: { value: 12.3, unit: 'cm', tag: 'tag-1' },
      h: { value: 4, unit: 'cm', tag: 'tag-2' },
      d: { value: 12, unit: 'mm', tag: 'tag-3' },
      note: 'note',
    });
  });

  it('parses 2 dimensions', () => {
    const result = PhysicalSizeParser.parse('12.3cm x 4cm');
    expect(result).toEqual({
      w: { value: 12.3, unit: 'cm' },
      h: { value: 4, unit: 'cm' },
    });
  });

  it('respects hBeforeW parameter', () => {
    const result = PhysicalSizeParser.parse('12.3cm x 4cm', true);
    expect(result).toEqual({
      h: { value: 12.3, unit: 'cm' },
      w: { value: 4, unit: 'cm' },
    });
  });

  it('uses previous unit when not specified', () => {
    const result = PhysicalSizeParser.parse('12.3cm x 4');
    expect(result).toEqual({
      w: { value: 12.3, unit: 'cm' },
      h: { value: 4, unit: 'cm' },
    });
  });

  it('uses default unit when not specified', () => {
    const result = PhysicalSizeParser.parse('12.3 x 4');
    expect(result).toEqual({
      w: { value: 12.3, unit: 'cm' },
      h: { value: 4, unit: 'cm' },
    });
  });
});
