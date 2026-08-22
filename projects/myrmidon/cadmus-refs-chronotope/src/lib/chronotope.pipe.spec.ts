import { ChronotopePipe } from './chronotope.pipe';

describe('ChronotopePipe', () => {
  let pipe: ChronotopePipe;

  beforeEach(() => {
    pipe = new ChronotopePipe();
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

  it('should format tag only', () => {
    const result = pipe.transform({ tag: 'birth' });
    expect(result).toBe('[birth]');
  });

  it('should format place only', () => {
    const result = pipe.transform({ place: 'Rome' });
    expect(result).toBe('Rome');
  });

  it('should format tag and place', () => {
    const result = pipe.transform({ tag: 'birth', place: 'Rome' });
    expect(result).toBe('[birth] Rome');
  });

  it('should format date only', () => {
    const result = pipe.transform({ date: { a: { value: 45 } } });
    expect(result).toBe('45 AD');
  });

  it('should format place and date with comma separator', () => {
    const result = pipe.transform({
      place: 'Rome',
      date: { a: { value: 45 } },
    });
    expect(result).toBe('Rome, 45 AD');
  });

  it('should format tag, place and date', () => {
    const result = pipe.transform({
      tag: 'birth',
      place: 'Rome',
      date: { a: { value: 45 } },
    });
    expect(result).toBe('[birth] Rome, 45 AD');
  });

  it('should format tag and date without place (no comma)', () => {
    const result = pipe.transform({
      tag: 'birth',
      date: { a: { value: 45 } },
    });
    expect(result).toBe('[birth] 45 AD');
  });

  it('should return empty string for empty chronotope', () => {
    const result = pipe.transform({});
    expect(result).toBe('');
  });
});
