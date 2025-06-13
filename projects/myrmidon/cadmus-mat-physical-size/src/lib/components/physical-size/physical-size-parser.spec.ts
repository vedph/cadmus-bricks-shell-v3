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

  it('returns null for empty string input', () => {
    const result = PhysicalSizeParser.parse('');
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

  // Additional tests for better coverage
  it('parses with overall tag only', () => {
    const result = PhysicalSizeParser.parse('(overall) 10mm x 20mm');
    expect(result).toEqual({
      tag: 'overall',
      w: { value: 10, unit: 'mm' },
      h: { value: 20, unit: 'mm' },
    });
  });

  it('parses with dimension tags only', () => {
    const result = PhysicalSizeParser.parse('10cm (width) x 20cm (height)');
    expect(result).toEqual({
      w: { value: 10, unit: 'cm', tag: 'width' },
      h: { value: 20, unit: 'cm', tag: 'height' },
    });
  });

  it('parses with note only', () => {
    const result = PhysicalSizeParser.parse('10cm x 20cm {some note}');
    expect(result).toEqual({
      w: { value: 10, unit: 'cm' },
      h: { value: 20, unit: 'cm' },
      note: 'some note',
    });
  });

  it('parses 3 dimensions with depth unit inheritance', () => {
    const result = PhysicalSizeParser.parse('10cm x 20cm x 5');
    expect(result).toEqual({
      w: { value: 10, unit: 'cm' },
      h: { value: 20, unit: 'cm' },
      d: { value: 5, unit: 'cm' },
    });
  });

  it('parses with decimal comma', () => {
    const result = PhysicalSizeParser.parse('12,5cm x 4,2cm');
    expect(result).toEqual({
      w: { value: 12.5, unit: 'cm' },
      h: { value: 4.2, unit: 'cm' },
    });
  });

  it('parses with × (multiplication sign)', () => {
    const result = PhysicalSizeParser.parse('12cm × 4cm');
    expect(result).toEqual({
      w: { value: 12, unit: 'cm' },
      h: { value: 4, unit: 'cm' },
    });
  });

  it('uses custom default unit', () => {
    const result = PhysicalSizeParser.parse('12 x 4', false, 'mm');
    expect(result).toEqual({
      w: { value: 12, unit: 'mm' },
      h: { value: 4, unit: 'mm' },
    });
  });

  // toString tests
  describe('toString', () => {
    it('returns null for null input', () => {
      const result = PhysicalSizeParser.toString(null);
      expect(result).toBeNull();
    });

    it('returns null for undefined input', () => {
      const result = PhysicalSizeParser.toString(undefined);
      expect(result).toBeNull();
    });

    it('returns null when width is missing', () => {
      const result = PhysicalSizeParser.toString({
        h: { value: 4, unit: 'cm' }
      });
      expect(result).toBeNull();
    });

    it('returns null when height is missing', () => {
      const result = PhysicalSizeParser.toString({
        w: { value: 4, unit: 'cm' }
      });
      expect(result).toBeNull();
    });

    it('converts basic 2D size to string', () => {
      const result = PhysicalSizeParser.toString({
        w: { value: 12.3, unit: 'cm' },
        h: { value: 4, unit: 'cm' },
      });
      expect(result).toBe('12.3cm x 4cm');
    });

    it('converts 2D size with hBeforeW to string', () => {
      const result = PhysicalSizeParser.toString({
        w: { value: 12.3, unit: 'cm' },
        h: { value: 4, unit: 'cm' },
      }, true);
      expect(result).toBe('4cm x 12.3cm');
    });

    it('converts full format to string', () => {
      const result = PhysicalSizeParser.toString({
        tag: 'overall',
        w: { value: 12.3, unit: 'cm', tag: 'width' },
        h: { value: 4, unit: 'cm', tag: 'height' },
        d: { value: 5, unit: 'mm', tag: 'depth' },
        note: 'test note',
      });
      expect(result).toBe('(overall) 12.3cm (width) x 4cm (height) x 5mm (depth) {test note}');
    });

    it('converts 3D size without tags to string', () => {
      const result = PhysicalSizeParser.toString({
        w: { value: 10, unit: 'cm' },
        h: { value: 20, unit: 'cm' },
        d: { value: 5, unit: 'mm' },
      });
      expect(result).toBe('10cm x 20cm x 5mm');
    });

    it('converts size with overall tag only', () => {
      const result = PhysicalSizeParser.toString({
        tag: 'frame',
        w: { value: 10, unit: 'cm' },
        h: { value: 20, unit: 'cm' },
      });
      expect(result).toBe('(frame) 10cm x 20cm');
    });

    it('converts size with note only', () => {
      const result = PhysicalSizeParser.toString({
        w: { value: 10, unit: 'cm' },
        h: { value: 20, unit: 'cm' },
        note: 'approximate',
      });
      expect(result).toBe('10cm x 20cm {approximate}');
    });
  });

  // Round-trip tests
  describe('round-trip parsing', () => {
    it('should parse and convert back to same string', () => {
      const original = '(tag) 12.3cm (w-tag) x 4.5mm (h-tag) x 2in (d-tag) {note}';
      const parsed = PhysicalSizeParser.parse(original);
      const converted = PhysicalSizeParser.toString(parsed);
      expect(converted).toBe(original);
    });

    it('should handle hBeforeW round-trip', () => {
      const original = '(tag) 4.5mm (h-tag) x 12.3cm (w-tag) x 2in (d-tag) {note}';
      const parsed = PhysicalSizeParser.parse(original, true);
      const converted = PhysicalSizeParser.toString(parsed, true);
      expect(converted).toBe(original);
    });

    it('should handle simple 2D round-trip', () => {
      const original = '10cm x 20mm';
      const parsed = PhysicalSizeParser.parse(original);
      const converted = PhysicalSizeParser.toString(parsed);
      expect(converted).toBe(original);
    });
  });
});
