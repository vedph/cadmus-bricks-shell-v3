import { TestBed } from '@angular/core/testing';

import { TextMeasureService } from './text-measure.service';

describe('TextMeasureService', () => {
  let service: TextMeasureService;

  beforeEach(() => {
    service = TestBed.inject(TextMeasureService);
  });

  it('should measure empty text as 0', () => {
    expect(service.measure('', 'Roboto', '16px')).toBe(0);
  });

  it('should measure longer text as wider', () => {
    const a = service.measure('a', 'Roboto', '16px');
    const b = service.measure('abc', 'Roboto', '16px');
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });

  it('should cache measures', () => {
    const a = service.measure('abc', 'Roboto', '16px');
    expect(service.measure('abc', 'Roboto', '16px')).toBe(a);
  });

  it('should bump version on invalidate', () => {
    const v = service.version();
    service.invalidate();
    expect(service.version()).toBe(v + 1);
  });

  it('should estimate from font size', () => {
    expect(TextMeasureService.estimate('ab', '10px')).toBeCloseTo(12);
    expect(TextMeasureService.estimate('a', '1rem')).toBeCloseTo(9.6);
    expect(TextMeasureService.estimate('a', '12pt')).toBeCloseTo(9.6);
  });
});
