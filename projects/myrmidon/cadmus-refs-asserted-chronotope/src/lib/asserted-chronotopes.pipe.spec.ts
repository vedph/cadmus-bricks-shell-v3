import { AssertedChronotopesPipe } from './asserted-chronotopes.pipe';
import { AssertedChronotope } from './asserted-chronotope/asserted-chronotope.component';

describe('AssertedChronotopesPipe', () => {
  let pipe: AssertedChronotopesPipe;

  beforeEach(() => {
    pipe = new AssertedChronotopesPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('should return null for an empty array', () => {
    expect(pipe.transform([])).toBeNull();
  });

  it('should render just the place value when only place is set', () => {
    const chronotope: AssertedChronotope = { place: { value: 'Rome' } };
    expect(pipe.transform(chronotope)).toBe('Rome');
  });

  it('should prepend the place tag in brackets when set', () => {
    const chronotope: AssertedChronotope = {
      place: { tag: 'ancient', value: 'Rome' },
    };
    expect(pipe.transform(chronotope)).toBe('[ancient] Rome');
  });

  it('should render just the date when only date is set', () => {
    const chronotope: AssertedChronotope = { date: { a: { value: 1200 } } };
    const result = pipe.transform(chronotope);
    expect(result).toBeTruthy();
    expect(result).not.toContain(',');
  });

  it('should join place and date with a comma when both are set', () => {
    const chronotope: AssertedChronotope = {
      place: { value: 'Rome' },
      date: { a: { value: 1200 } },
    };
    const result = pipe.transform(chronotope)!;
    expect(result.startsWith('Rome, ')).toBe(true);
  });

  it('should return an empty string for a chronotope with neither place nor date', () => {
    expect(pipe.transform({})).toBe('');
  });

  it('should join multiple chronotopes with "; "', () => {
    const chronotopes: AssertedChronotope[] = [
      { place: { value: 'Rome' } },
      { place: { value: 'Athens' } },
    ];
    expect(pipe.transform(chronotopes)).toBe('Rome; Athens');
  });

  it('should respect the tag-only place with no value', () => {
    const chronotope: AssertedChronotope = { place: { tag: 't' } as any };
    expect(pipe.transform(chronotope)).toBe('[t]');
  });
});
