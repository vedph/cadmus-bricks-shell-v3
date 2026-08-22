import { HistoricalDatePipe } from './historical-date.pipe';
import { HistoricalDate, HistoricalDateModel } from './historical-date/historical-date';

describe('HistoricalDatePipe', () => {
  let pipe: HistoricalDatePipe;

  beforeEach(() => {
    pipe = new HistoricalDatePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return null for a null/undefined value', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('should return null when the value has no "a" datation', () => {
    expect(pipe.transform({} as HistoricalDateModel)).toBeNull();
  });

  it('should render the text form of a single point date by default', () => {
    const model: HistoricalDateModel = { a: { value: 1450 } };
    const expected = new HistoricalDate(model).toString();
    expect(pipe.transform(model)).toBe(expected);
    expect(pipe.transform(model, 'text')).toBe(expected);
  });

  it('should render the text form of a range date', () => {
    const model: HistoricalDateModel = {
      a: { value: 1450 },
      b: { value: 1500 },
    };
    const expected = new HistoricalDate(model).toString();
    expect(pipe.transform(model)).toBe(expected);
    expect(expected).toContain('--');
  });

  it('should render the sort value when type is "value"', () => {
    const model: HistoricalDateModel = { a: { value: 1450 } };
    expect(pipe.transform(model, 'value')).toBe(1450);
  });

  it('should render the sort value for a range as the midpoint', () => {
    const model: HistoricalDateModel = {
      a: { value: 1450 },
      b: { value: 1500 },
    };
    expect(pipe.transform(model, 'value')).toBe((1450 + 1500) / 2);
  });

  it('should render an approximate century point using the "about" marker', () => {
    const model: HistoricalDateModel = {
      a: { value: 4, isCentury: true, isApproximate: true },
    };
    const text = pipe.transform(model) as string;
    expect(text).toContain('c.');
    expect(text).toContain('IV');
  });

  it('should render a dubious date with a trailing question mark', () => {
    const model: HistoricalDateModel = {
      a: { value: 1450, isDubious: true },
    };
    const text = pipe.transform(model) as string;
    expect(text).toContain('?');
  });

  it('should render a BC date with the BC era marker', () => {
    const model: HistoricalDateModel = { a: { value: -350 } };
    const text = pipe.transform(model) as string;
    expect(text).toContain('BC');
    expect(text).toContain('350');
  });

  it('should return a falsy sort value of 0 as null (value is falsy)', () => {
    // a datation with value 0 is considered undefined by the model, and
    // HistoricalDate.isUndefined() would be true, but the pipe only
    // checks !d.a, so an explicit a with value 0 still goes through
    const model: HistoricalDateModel = { a: { value: 0 } };
    expect(pipe.transform(model, 'value')).toBe(0);
    expect(pipe.transform(model, 'text')).toBe('');
  });
});
