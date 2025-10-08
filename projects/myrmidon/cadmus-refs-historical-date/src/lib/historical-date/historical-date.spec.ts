/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { HistoricalDate, HistoricalDateType } from './historical-date';

describe('Class: HistoricalDate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('new date should have undefined A and no B', () => {
    const d = new HistoricalDate();
    expect(d.a).toBeTruthy();
    expect(d.b).toBeFalsy();
    expect(d.a.isUndefined).toBeTruthy();
  });
  it('parse empty should be null', () => {
    const d = HistoricalDate.parse('');
    expect(d).toBeNull();
  });
  it('parse "23 AD" should get A=year', () => {
    const d = HistoricalDate.parse('23 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeFalsy();
    expect(a.isDubious).toBeFalsy();
    expect(a.day).toBeFalsy();
    expect(a.month).toBeFalsy();
    expect(a.hint).toBeFalsy();
  });
  it('parse "c.23 AD" should get A=approx. year', () => {
    const d = HistoricalDate.parse('c.23 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeFalsy();
    expect(a.day).toBeFalsy();
    expect(a.month).toBeFalsy();
    expect(a.hint).toBeFalsy();
  });
  it('parse "c.23 AD?" should get A=approx. and dub. year', () => {
    const d = HistoricalDate.parse('c.23 AD?')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeTruthy();
    expect(a.day).toBeFalsy();
    expect(a.month).toBeFalsy();
    expect(a.hint).toBeFalsy();
  });
  it('parse "c.12 may 23 AD" should get A=approx. DMY', () => {
    const d = HistoricalDate.parse('c.12 may 23 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeFalsy();
    expect(a.day).toBe(12);
    expect(a.month).toBe(5);
    expect(a.hint).toBeFalsy();
  });
  it('parse "c.12 may 23 BC?" should get A=approx. and dub. negative year', () => {
    const d = HistoricalDate.parse('c.12 may 23 BC?')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(-23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeTruthy();
    expect(a.day).toBe(12);
    expect(a.month).toBe(5);
    expect(a.hint).toBeFalsy();
  });
  it('parse "c.12 may 23/2 BC?" should get A=approx. and dub. negative span year', () => {
    const d = HistoricalDate.parse('c.12 may 23/2 BC?')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(-23);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeTruthy();
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeTruthy();
    expect(a.day).toBe(12);
    expect(a.month).toBe(5);
    expect(a.hint).toBeFalsy();
  });
  it('parse "25 BC {marriage of Julia and Marcellus}" should get A=year with hint', () => {
    const d = HistoricalDate.parse('25 BC {marriage of Julia and Marcellus}')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(-25);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeFalsy();
    expect(a.isDubious).toBeFalsy();
    expect(a.day).toBeFalsy();
    expect(a.month).toBeFalsy();
    expect(a.hint).toBe('marriage of Julia and Marcellus');
  });

  it('parse "123 AD -- 135 AD" should get A=123 and B=135', () => {
    const d = HistoricalDate.parse('123 AD -- 135 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(123);
    expect(a.isCentury).toBeFalsy();
    expect(a.isSpan).toBeFalsy();
    expect(a.isApproximate).toBeFalsy();
    expect(a.isDubious).toBeFalsy();
    expect(a.day).toBeFalsy();
    expect(a.month).toBeFalsy();
    expect(a.hint).toBeFalsy();
    const b = d.b!;
    expect(b.value).toBe(135);
    expect(b.isCentury).toBeFalsy();
    expect(b.isSpan).toBeFalsy();
    expect(b.isApproximate).toBeFalsy();
    expect(b.isDubious).toBeFalsy();
    expect(b.day).toBeFalsy();
    expect(b.month).toBeFalsy();
    expect(b.hint).toBeFalsy();
  });

  // slide tests for single points
  it('parse "1230:1240 AD" should get point with slide', () => {
    const d = HistoricalDate.parse('1230:1240 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(1230);
    expect(a.slide).toBe(10);
    expect(a.isCentury).toBeFalsy();
  });

  it('parse "III:V AD" should get century point with slide', () => {
    const d = HistoricalDate.parse('III:V AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(3);
    expect(a.slide).toBe(2);
    expect(a.isCentury).toBeTruthy();
  });

  it('parse "c.1230:1240 BC?" should get approximate dubious point with slide', () => {
    const d = HistoricalDate.parse('c.1230:1240 BC?')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(-1230);
    expect(a.slide).toBe(10);
    expect(a.isApproximate).toBeTruthy();
    expect(a.isDubious).toBeTruthy();
    expect(a.isCentury).toBeFalsy();
  });

  // slide tests for ranges
  it('parse "1230:1240 AD -- 1250:1260 AD" should get range with slides', () => {
    const d = HistoricalDate.parse('1230:1240 AD -- 1250:1260 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(1230);
    expect(a.slide).toBe(10);
    const b = d.b!;
    expect(b.value).toBe(1250);
    expect(b.slide).toBe(10);
  });

  it('parse "II:III BC -- IV:V AD" should get century range with slides', () => {
    const d = HistoricalDate.parse('II:III BC -- IV:V AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(-2);
    expect(a.slide).toBe(1);
    expect(a.isCentury).toBeTruthy();
    const b = d.b!;
    expect(b.value).toBe(4);
    expect(b.slide).toBe(1);
    expect(b.isCentury).toBeTruthy();
  });

  it('parse "1230:1240 -- 1250 AD" should get mixed range with slide in first', () => {
    const d = HistoricalDate.parse('1230:1240 -- 1250 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(1230);
    expect(a.slide).toBe(10);
    const b = d.b!;
    expect(b.value).toBe(1250);
    expect(b.slide).toBeFalsy();
  });

  it('parse "15 may 1230:1235 AD -- 20 jun 1240:1245 AD" should get full range with slides', () => {
    const d = HistoricalDate.parse(
      '15 may 1230:1235 AD -- 20 jun 1240:1245 AD'
    )!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(1230);
    expect(a.slide).toBe(5);
    expect(a.day).toBe(15);
    expect(a.month).toBe(5);
    const b = d.b!;
    expect(b.value).toBe(1240);
    expect(b.slide).toBe(5);
    expect(b.day).toBe(20);
    expect(b.month).toBe(6);
  });

  // toString tests with slides
  it('toString with slide should include slide in output', () => {
    const d = HistoricalDate.parse('1230:1240 AD')!;
    const str = d.toString();
    expect(str).toContain('1230:1240');
  });

  it('toString with century slide should include slide in output', () => {
    const d = HistoricalDate.parse('III:V AD')!;
    const str = d.toString();
    expect(str).toContain('III:V');
  });

  // toYear tests with slides
  it('toYear with year slide should return value plus half slide', () => {
    const d = HistoricalDate.parse('1230:1240 AD')!;
    const year = d.toYear();
    expect(year).toBe(1235); // 1230 + 10/2
  });

  it('toYear with century slide should return century year plus half slide', () => {
    const d = HistoricalDate.parse('III:V AD')!;
    const year = d.toYear();
    // III = 3rd century = 250, slide = 2, so 250 + 2/2 = 251
    expect(year).toBe(251);
  });

  it('toYear with terminus post slide should use base value plus delta', () => {
    const d = HistoricalDate.parse('1230:1240 AD --')!;
    const year = d.toYear();
    expect(year).toBe(1240); // 1230 + 10 (APPROX_DELTA)
  });

  it('toYear with range and slides should use slide end values', () => {
    const d = HistoricalDate.parse('1230:1240 AD -- 1250:1260 AD')!;
    const year = d.toYear();
    // min = 1240 (slide end), max = 1260 (slide end), middle = 1250
    expect(year).toBe(1250);
  });

  it('toYear with mixed range should handle slides correctly', () => {
    const d = HistoricalDate.parse('1230:1240 AD -- 1250 AD')!;
    const year = d.toYear();
    // min = 1240 (slide end), max = 1250, middle = 1245
    expect(year).toBe(1245);
  });

  it('parse should handle era integration correctly', () => {
    const d = HistoricalDate.parse('123 -- 135 AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    expect(d.a.value).toBe(123); // should be positive as era is integrated from second part
    expect(d.b!.value).toBe(135);
  });

  it('parse "810:805 BC" should handle slide correctly', () => {
    const d = HistoricalDate.parse('810:805 BC')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    expect(d.a.value).toBe(-810);
    expect(d.a.slide).toBe(-5); // negative slide since 805 < 810
  });
});
