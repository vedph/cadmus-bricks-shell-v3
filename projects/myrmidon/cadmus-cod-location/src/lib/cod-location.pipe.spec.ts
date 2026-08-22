import { CodLocationPipe } from './cod-location.pipe';
import { CodLocationEndleaf } from './cod-location-parser';

describe('CodLocationPipe', () => {
  let pipe: CodLocationPipe;

  beforeEach(() => {
    pipe = new CodLocationPipe();
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

  it('should transform a plain location to its string form', () => {
    expect(pipe.transform({ n: 12 })).toBe('12');
  });

  it('should transform a recto location', () => {
    expect(pipe.transform({ n: 12, v: false })).toBe('12r');
  });

  it('should transform a verso location', () => {
    expect(pipe.transform({ n: 12, v: true })).toBe('12v');
  });

  it('should transform a location with column and line', () => {
    expect(pipe.transform({ n: 12, v: false, c: 'a', l: 3 })).toBe('12ra.3');
  });

  it('should transform a location with system, suffix and word', () => {
    expect(
      pipe.transform({
        s: 'x',
        n: 12,
        rmn: true,
        sfx: 'bis',
        v: true,
        c: 'a',
        l: 3,
        word: 'exemplum',
      }),
    ).toBe('x:^12"bis"va.3@exemplum');
  });

  it('should transform a front endleaf location', () => {
    expect(
      pipe.transform({
        endleaf: CodLocationEndleaf.FrontEndleaf,
        s: 'x',
        n: 12,
        rmn: true,
      }),
    ).toBe('(x:^12)');
  });

  it('should transform a back cover location', () => {
    expect(
      pipe.transform({
        endleaf: CodLocationEndleaf.BackCover,
        s: 'x',
        sfx: 'cover',
      }),
    ).toBe('[/x:"cover"]');
  });

  it('should pass through ignored extra arguments', () => {
    expect(pipe.transform({ n: 5 }, 'ignored', 42)).toBe('5');
  });
});
