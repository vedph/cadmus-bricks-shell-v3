/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { HistoricalDate, HistoricalDateType } from './historical-date';
import { Datation } from '../datation/datation';

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

  it('parse "c.1240:1230 BC?" should get approximate dubious point with slide', () => {
    const d = HistoricalDate.parse('c.1240:1230 BC?')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.point);
    const a = d.a;
    expect(a.value).toBe(-1240);
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

  it('parse "III:II BC -- IV:V AD" should get century range with slides', () => {
    const d = HistoricalDate.parse('III:II BC -- IV:V AD')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.range);
    const a = d.a;
    expect(a.value).toBe(-3);
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
    expect(d.a.slide).toBe(5);
  });

  it('parse null should be null', () => {
    expect(HistoricalDate.parse(null)).toBeNull();
  });

  it('parse undefined should be null', () => {
    expect(HistoricalDate.parse(undefined)).toBeNull();
  });

  it('parse "--" (both empty) should be an undefined date', () => {
    const d = HistoricalDate.parse('--')!;
    expect(d).toBeTruthy();
    expect(d.getDateType()).toBe(HistoricalDateType.undefined);
    expect(d.isUndefined()).toBe(true);
  });

  // getStartPoint / setStartPoint / getEndPoint / setEndPoint
  describe('start/end point accessors', () => {
    it('getStartPoint/getEndPoint should be undefined when not a range', () => {
      const d = new HistoricalDate();
      expect(d.getStartPoint()).toBeUndefined();
      expect(d.getEndPoint()).toBeUndefined();
    });

    it('setStartPoint should turn the date into a range with an undefined end', () => {
      const d = new HistoricalDate();
      d.setStartPoint(new Datation({ value: 100 }));
      expect(d.getDateType()).toBe(HistoricalDateType.range);
      expect(d.getStartPoint()?.value).toBe(100);
      expect(d.getEndPoint()?.value).toBe(0);
      expect(d.getEndPoint()?.isUndefined()).toBe(true);
    });

    it('setStartPoint should not overwrite an existing end point', () => {
      const d = new HistoricalDate();
      d.setEndPoint(new Datation({ value: 200 }));
      d.setStartPoint(new Datation({ value: 100 }));
      expect(d.getStartPoint()?.value).toBe(100);
      expect(d.getEndPoint()?.value).toBe(200);
    });

    it('setEndPoint should set the end point', () => {
      const d = new HistoricalDate();
      d.setStartPoint(new Datation({ value: 100 }));
      d.setEndPoint(new Datation({ value: 200 }));
      expect(d.getEndPoint()?.value).toBe(200);
    });
  });

  // getSinglePoint / setSinglePoint
  describe('single point accessors', () => {
    it('getSinglePoint should be undefined when the date is a range', () => {
      const d = new HistoricalDate();
      d.setStartPoint(new Datation({ value: 100 }));
      expect(d.getSinglePoint()).toBeUndefined();
    });

    it('setSinglePoint should turn the date into a point and drop any end', () => {
      const d = new HistoricalDate();
      d.setStartPoint(new Datation({ value: 100 }));
      d.setEndPoint(new Datation({ value: 200 }));
      d.setSinglePoint(new Datation({ value: 50 }));
      expect(d.getDateType()).toBe(HistoricalDateType.point);
      expect(d.getSinglePoint()?.value).toBe(50);
      expect(d.b).toBeUndefined();
    });
  });

  // validate
  describe('validate()', () => {
    it('should return null for a point date', () => {
      const d = HistoricalDate.parse('45 AD')!;
      expect(d.validate()).toBeNull();
    });

    it('should return null for a correctly ordered range', () => {
      const d = HistoricalDate.parse('100 AD -- 200 AD')!;
      expect(d.validate()).toBeNull();
    });

    it('should return an error message when A is past B', () => {
      const d = HistoricalDate.parse('200 AD -- 100 AD')!;
      expect(d.validate()).toBe('Point A is past point B');
    });

    it('should return null for an open-ended range (terminus ante)', () => {
      const d = HistoricalDate.parse('-- 100 AD')!;
      expect(d.validate()).toBeNull();
    });

    it('should return null for an open-ended range (terminus post)', () => {
      const d = HistoricalDate.parse('100 AD --')!;
      expect(d.validate()).toBeNull();
    });
  });

  // isAbout / isDubious
  describe('isAbout()', () => {
    it('should be false for a plain point', () => {
      const d = HistoricalDate.parse('45 AD')!;
      expect(d.isAbout()).toBe(false);
    });

    it('should be true for an approximate point', () => {
      const d = HistoricalDate.parse('c.45 AD')!;
      expect(d.isAbout()).toBe(true);
    });

    it('should reflect A in a range when A is defined', () => {
      const d = HistoricalDate.parse('c.100 AD -- 200 AD')!;
      expect(d.isAbout()).toBe(true);
    });

    it('should reflect B in a range only when A is undefined (terminus ante)', () => {
      const d = HistoricalDate.parse('-- c.200 AD')!;
      expect(d.isAbout()).toBe(true);
    });

    it('should not consider B when A is defined, even if B is approximate', () => {
      const d = HistoricalDate.parse('100 AD -- c.200 AD')!;
      expect(d.isAbout()).toBe(false);
    });
  });

  describe('isDubious()', () => {
    it('should be false for a plain point', () => {
      const d = HistoricalDate.parse('45 AD')!;
      expect(d.isDubious()).toBe(false);
    });

    it('should be true for a dubious point', () => {
      const d = HistoricalDate.parse('45 AD?')!;
      expect(d.isDubious()).toBe(true);
    });

    it('should reflect A in a range when A is defined', () => {
      const d = HistoricalDate.parse('100 AD? -- 200 AD')!;
      expect(d.isDubious()).toBe(true);
    });

    it('should reflect B in a range only when A is undefined (terminus ante)', () => {
      const d = HistoricalDate.parse('-- 200 AD?')!;
      expect(d.isDubious()).toBe(true);
    });
  });

  // toYear with useTerminusSpan
  describe('toYear() with useTerminusSpan', () => {
    it('should return 0 for an undefined date', () => {
      const d = HistoricalDate.parse('--')!;
      expect(d.toYear()).toBe(0);
    });

    it('should not add the approximation delta when useTerminusSpan=false (terminus post)', () => {
      const d = HistoricalDate.parse('1230:1240 AD --')!;
      expect(d.toYear(false)).toBe(1230);
    });

    it('should not subtract the approximation delta when useTerminusSpan=false (terminus ante)', () => {
      const d = HistoricalDate.parse('-- 1250 AD')!;
      expect(d.toYear(false)).toBe(1250);
      expect(d.toYear(true)).toBe(1240);
    });

    it('should compute the central year of a century point', () => {
      const d = HistoricalDate.parse('IV AD')!;
      // IV AD => 4th century AD => central year 350
      expect(d.toYear()).toBe(350);
    });

    it('should compute the central year of a BC century point', () => {
      const d = HistoricalDate.parse('IV BC')!;
      // IV BC => central year -350
      expect(d.toYear()).toBe(-350);
    });
  });
});
