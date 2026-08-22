import { TestBed } from '@angular/core/testing';

import { ExcelColumnPipe } from './excel-column.pipe';

describe('ExcelColumnPipe', () => {
  let pipe: ExcelColumnPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExcelColumnPipe],
    });
    pipe = TestBed.inject(ExcelColumnPipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for 0', () => {
    expect(pipe.transform(0)).toBe('');
  });

  it('should return empty string for negative numbers', () => {
    expect(pipe.transform(-1)).toBe('');
    expect(pipe.transform(-5)).toBe('');
  });

  it('should transform 1 to A', () => {
    expect(pipe.transform(1)).toBe('A');
  });

  it('should transform 2 to B', () => {
    expect(pipe.transform(2)).toBe('B');
  });

  it('should transform 25 to Y', () => {
    expect(pipe.transform(25)).toBe('Y');
  });

  it('should transform 26 to Z', () => {
    expect(pipe.transform(26)).toBe('Z');
  });

  it('should transform 27 to AA (first two-letter column)', () => {
    expect(pipe.transform(27)).toBe('AA');
  });

  it('should transform 28 to AB', () => {
    expect(pipe.transform(28)).toBe('AB');
  });

  it('should transform 52 to AZ (boundary before BA)', () => {
    expect(pipe.transform(52)).toBe('AZ');
  });

  it('should transform 53 to BA', () => {
    expect(pipe.transform(53)).toBe('BA');
  });

  it('should transform 54 to BB', () => {
    expect(pipe.transform(54)).toBe('BB');
  });

  it('should transform 701 to ZY (boundary before ZZ)', () => {
    expect(pipe.transform(701)).toBe('ZY');
  });

  it('should transform 702 to ZZ (last two-letter column)', () => {
    expect(pipe.transform(702)).toBe('ZZ');
  });

  it('should transform 703 to AAA (first three-letter column)', () => {
    expect(pipe.transform(703)).toBe('AAA');
  });

  it('should transform 704 to AAB', () => {
    expect(pipe.transform(704)).toBe('AAB');
  });

  it('should transform 16384 to XFD (Excel max column)', () => {
    expect(pipe.transform(16384)).toBe('XFD');
  });

  it('should transform 18278 to ZZZ', () => {
    expect(pipe.transform(18278)).toBe('ZZZ');
  });
});
