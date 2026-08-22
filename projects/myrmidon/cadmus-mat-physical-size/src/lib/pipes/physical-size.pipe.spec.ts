import { PhysicalSizePipe } from './physical-size.pipe';
import { PhysicalSize } from '../components/physical-size/physical-size.component';

describe('PhysicalSizePipe', () => {
  let pipe: PhysicalSizePipe;

  beforeEach(() => {
    pipe = new PhysicalSizePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  //#region falsy inputs
  it('returns null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('returns null for false input', () => {
    expect(pipe.transform(false)).toBeNull();
  });

  it('returns empty string for an empty size object', () => {
    expect(pipe.transform({} as PhysicalSize)).toBe('');
  });
  //#endregion

  //#region basic formatting
  it('formats width and height with same unit collapsed to a single trailing unit', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
    };
    expect(pipe.transform(size)).toBe('20.00 × 10.00 cm');
  });

  it('formats width and height with different units shown per-dimension', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'mm' },
    };
    expect(pipe.transform(size)).toBe('20.00 cm × 10.00 mm');
  });

  it('formats width, height and depth with same unit collapsed', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
      d: { value: 5, unit: 'cm' },
    };
    expect(pipe.transform(size)).toBe('20.00 × 10.00 × 5.00 cm');
  });

  it('formats width, height and depth with mixed units per-dimension', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
      d: { value: 5, unit: 'mm' },
    };
    expect(pipe.transform(size)).toBe('20.00 cm × 10.00 cm × 5.00 mm');
  });

  it('formats only width when height and depth are missing', () => {
    const size: PhysicalSize = { w: { value: 20, unit: 'cm' } };
    expect(pipe.transform(size)).toBe('20.00 cm');
  });

  it('formats only height when width and depth are missing', () => {
    const size: PhysicalSize = { h: { value: 10, unit: 'cm' } };
    expect(pipe.transform(size)).toBe('10.00 cm');
  });

  it('omits a dimension whose value is zero', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
      d: { value: 0, unit: 'cm' },
    };
    expect(pipe.transform(size)).toBe('20.00 × 10.00 cm');
  });
  //#endregion

  //#region hBeforeW
  it('puts width before height by default (hBeforeW omitted)', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
    };
    expect(pipe.transform(size)).toBe('20.00 × 10.00 cm');
  });

  it('puts height before width when hBeforeW is true', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
    };
    expect(pipe.transform(size, true)).toBe('10.00 × 20.00 cm');
  });

  it('keeps depth last even when hBeforeW is true', () => {
    const size: PhysicalSize = {
      w: { value: 20, unit: 'cm' },
      h: { value: 10, unit: 'cm' },
      d: { value: 5, unit: 'cm' },
    };
    expect(pipe.transform(size, true)).toBe('10.00 × 20.00 × 5.00 cm');
  });
  //#endregion

  //#region decimal formatting
  it('formats decimal values with two decimal digits', () => {
    const size: PhysicalSize = {
      w: { value: 12.3, unit: 'cm' },
      h: { value: 4.567, unit: 'cm' },
    };
    expect(pipe.transform(size)).toBe('12.30 × 4.57 cm');
  });
  //#endregion
});
