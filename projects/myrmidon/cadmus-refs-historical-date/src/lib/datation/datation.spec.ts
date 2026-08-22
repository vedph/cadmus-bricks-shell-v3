import { TestBed } from '@angular/core/testing';
import { Datation } from './datation';

describe('Class: Datation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('default Datation should be 0', () => {
    const d = new Datation();
    expect(d.value).toBe(0);
  });

  it('getCentury from 480 BC should be -5', () => {
    const d = Datation.parse('480 BC')!;
    const c = d.getCentury();
    expect(c).toBe(-5);
  });
  it('getCentury from 31 AD should be 1', () => {
    const d = Datation.parse('31 AD')!;
    const c = d.getCentury();
    expect(c).toBe(1);
  });

  it('parse empty should be null', () => {
    const d = Datation.parse('');
    expect(d).toBeNull();
  });
  it('parse whitespaces should be null', () => {
    const d = Datation.parse('  ');
    expect(d).toBeNull();
  });
  it('parse "45" should get year', () => {
    const d = Datation.parse('45')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeFalsy();
    expect(d.isDubious).toBeFalsy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "c.45" should get approximate year', () => {
    const d = Datation.parse('c.45')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeTruthy();
    expect(d.isDubious).toBeFalsy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "45?" should get dubious year', () => {
    const d = Datation.parse('45?')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeFalsy();
    expect(d.isDubious).toBeTruthy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "c.45?" should get approximate and dubious year', () => {
    const d = Datation.parse('c.45?')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeTruthy();
    expect(d.isDubious).toBeTruthy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "45 {a hint here}" should get year with hint', () => {
    const d = Datation.parse('45 {a hint here}')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeFalsy();
    expect(d.isDubious).toBeFalsy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBe('a hint here');
  });
  it('parse "45 BC" should get negative year', () => {
    const d = Datation.parse('45 BC')!;
    expect(d.value).toBe(-45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeFalsy();
    expect(d.isDubious).toBeFalsy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "45 AD" should get positive year', () => {
    const d = Datation.parse('45 AD')!;
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    expect(d.isApproximate).toBeFalsy();
    expect(d.isDubious).toBeFalsy();
    expect(d.day).toBeFalsy();
    expect(d.month).toBeFalsy();
    expect(d.hint).toBeFalsy();
  });
  it('parse "45/44 BC" should be years span', () => {
    const d = Datation.parse('45/44 BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-45);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeTruthy();
  });
  it('parse "132/133 AD" should be years span', () => {
    const d = Datation.parse('132/133 AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(132);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeTruthy();
  });
  it('parse "III" should be century', () => {
    const d = Datation.parse('III')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(3);
    expect(d.isCentury).toBeTruthy();
  });
  it('parse "III AD" should be positive century', () => {
    const d = Datation.parse('III AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(3);
    expect(d.isCentury).toBeTruthy();
  });
  it('parse "III BC" should be negative century', () => {
    const d = Datation.parse('III BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-3);
    expect(d.isCentury).toBeTruthy();
  });
  it('parse "may 45" should be month and year', () => {
    const d = Datation.parse('may 45')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.month).toBe(5);
  });
  it('parse "3 may 45" should be day, month and year', () => {
    const d = Datation.parse('3 may 45')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.month).toBe(5);
    expect(d.day).toBe(3);
  });
  it('parse "30 may 45" should be day, month and year', () => {
    const d = Datation.parse('30 may 45')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(45);
    expect(d.isCentury).toBeFalsy();
    expect(d.month).toBe(5);
    expect(d.day).toBe(30);
  });
  it('parse "c. 2 May 23/2 BC? {hint}" should be DMY with span, approx. and dub.', () => {
    const d = Datation.parse('c. 2 May 23/2 BC? {hint}')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-23);
    expect(d.isCentury).toBeFalsy();
    expect(d.isApproximate).toBeTruthy();
    expect(d.month).toBe(5);
    expect(d.day).toBe(2);
    expect(d.isDubious).toBeTruthy();
    expect(d.hint).toBe('hint');
  });
  it('parse "may IX AD" should be month', () => {
    const d = Datation.parse('may IX AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(9);
    expect(d.isCentury).toBe(true);
    expect(d.month).toBe(5);
  });
  it('parse "30 may IX AD" should be month', () => {
    const d = Datation.parse('30 may IX AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(9);
    expect(d.isCentury).toBe(true);
    expect(d.month).toBe(5);
    expect(d.day).toBe(30);
  });
  it('parse "c.30 may IX AD" should be day, month, century approx.', () => {
    const d = Datation.parse('c.30 may IX AD')!;
    expect(d).toBeTruthy();
    expect(d.isApproximate).toBe(true);
    expect(d.value).toBe(9);
    expect(d.isCentury).toBe(true);
    expect(d.month).toBe(5);
    expect(d.day).toBe(30);
  });
  it('parse "c.30 may IX AD ?" should be day, month, century approx. and dub.', () => {
    const d = Datation.parse('c.30 may IX AD ?')!;
    expect(d).toBeTruthy();
    expect(d.isApproximate).toBe(true);
    expect(d.isDubious).toBe(true);
    expect(d.value).toBe(9);
    expect(d.isCentury).toBe(true);
    expect(d.month).toBe(5);
    expect(d.day).toBe(30);
  });

  // toString
  it('toString() from 45 should be "45 AD"', () => {
    const d = new Datation();
    d.value = 45;
    const s = d.toString();
    expect(s).toBe('45 AD');
  });
  it('toString() from century=-4 should be "IV BC"', () => {
    const d = new Datation();
    d.value = -4;
    d.isCentury = true;
    const s = d.toString();
    expect(s).toBe('IV BC');
  });
  it('toString() from century=-4, about, dubious, hint should be OK', () => {
    const d = new Datation();
    d.value = -4;
    d.isCentury = true;
    d.isApproximate = true;
    d.isDubious = true;
    d.hint = 'hint';
    const s = d.toString();
    expect(s).toBe('c. IV BC ? {hint}');
  });

  // slide tests
  it('parse "1230:1240" should get year with slide', () => {
    const d = Datation.parse('1230:1240')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(1230);
    expect(d.slide).toBe(10);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
  });

  it('parse "50:45 BC" should get negative year with slide', () => {
    const d = Datation.parse('50:45 BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-50); // start at 50 BC
    expect(d.slide).toBe(5); // slide 5 years forward to 45 BC
    expect(d.isCentury).toBeFalsy();
  });

  it('parse "III:V AD" should get century with slide', () => {
    const d = Datation.parse('III:V AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(3);
    expect(d.slide).toBe(2);
    expect(d.isCentury).toBeTruthy();
  });

  it('parse "IV:II BC" should get negative century with slide', () => {
    const d = Datation.parse('IV:II BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-4); // start at IV BC (4th century BC)
    expect(d.slide).toBe(2); // slide 2 centuries forward to II BC
    expect(d.isCentury).toBeTruthy();
  });

  it('parse "c.1230:1240?" should get approximate dubious year with slide', () => {
    const d = Datation.parse('c.1230:1240?')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(1230);
    expect(d.slide).toBe(10);
    expect(d.isApproximate).toBeTruthy();
    expect(d.isDubious).toBeTruthy();
    expect(d.isCentury).toBeFalsy();
  });

  it('parse "15 may 1230:1235 AD {hint}" should get full date with slide and hint', () => {
    const d = Datation.parse('15 may 1230:1235 AD {hint}')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(1230);
    expect(d.slide).toBe(5);
    expect(d.day).toBe(15);
    expect(d.month).toBe(5);
    expect(d.hint).toBe('hint');
    expect(d.isCentury).toBeFalsy();
  });

  it('parse "12/13:15" should get span with slide', () => {
    const d = Datation.parse('12/13:15')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(12);
    expect(d.slide).toBe(3);
    expect(d.isSpan).toBeTruthy();
    expect(d.isCentury).toBeFalsy();
  });

  it('parse 40:50 AD with roundtrip to text should be OK', () => {
    const d = Datation.parse('40:50 AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(40);
    expect(d.slide).toBe(10);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    const s = d.toString();
    expect(s).toBe('40:50 AD');
  });

  it('parse 50:40 BC with roundtrip to text should be OK', () => {
    const d = Datation.parse('50:40 BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-50);
    expect(d.slide).toBe(10);
    expect(d.isCentury).toBeFalsy();
    expect(d.isSpan).toBeFalsy();
    const s = d.toString();
    expect(s).toBe('50:40 BC');
  });

  it('parse X:XI AD with roundtrip to text should be OK', () => {
    const d = Datation.parse('X:XI AD')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(10);
    expect(d.slide).toBe(1);
    expect(d.isCentury).toBeTruthy();
    expect(d.isSpan).toBeFalsy();
    const s = d.toString();
    expect(s).toBe('X:XI AD');
  });

  it('parse XI:X BC with roundtrip to text should be OK', () => {
    const d = Datation.parse('XI:X BC')!;
    expect(d).toBeTruthy();
    expect(d.value).toBe(-11);
    expect(d.slide).toBe(1);
    expect(d.isCentury).toBeTruthy();
    expect(d.isSpan).toBeFalsy();
    const s = d.toString();
    expect(s).toBe('XI:X BC');
  });

  it('getSlideEnd() should return correct end value', () => {
    const d = new Datation();
    d.value = 1230;
    d.slide = 10;
    expect(d.getSlideEnd()).toBe(1240);
  });

  it('getSlideEnd() should return value when no slide', () => {
    const d = new Datation();
    d.value = 1230;
    expect(d.getSlideEnd()).toBe(1230);
  });

  it('getSortValue() should use middle of slide range', () => {
    const d = new Datation();
    d.value = 1230;
    d.slide = 10;
    expect(d.getSortValue()).toBe(1235); // 1230 + 10/2
  });

  // sanitizeHint
  describe('sanitizeHint()', () => {
    it('should return undefined for undefined', () => {
      expect(Datation.sanitizeHint(undefined)).toBeUndefined();
    });
    it('should return undefined for null', () => {
      expect(Datation.sanitizeHint(null)).toBeUndefined();
    });
    it('should return undefined for empty string', () => {
      expect(Datation.sanitizeHint('')).toBeUndefined();
    });
    it('should return undefined for whitespace-only string', () => {
      expect(Datation.sanitizeHint('   ')).toBeUndefined();
    });
    it('should replace -- with an EM space', () => {
      expect(Datation.sanitizeHint('a--b')).toBe('a—b');
    });
    it('should strip braces', () => {
      expect(Datation.sanitizeHint('{hint}')).toBe('hint');
    });
    it('should flatten and trim whitespace', () => {
      expect(Datation.sanitizeHint('  a   b  \t c  ')).toBe('a b c');
    });
  });

  // reset
  describe('reset()', () => {
    it('should reset all fields to their defaults', () => {
      const d = new Datation({
        value: 45,
        isCentury: true,
        isSpan: true,
        isApproximate: true,
        isDubious: true,
        day: 3,
        month: 5,
        hint: 'hint',
        slide: 10,
      });
      d.reset();
      expect(d.value).toBe(0);
      expect(d.isCentury).toBeFalsy();
      expect(d.isSpan).toBeFalsy();
      expect(d.day).toBe(0);
      expect(d.month).toBe(0);
      expect(d.hint).toBeUndefined();
      expect(d.slide).toBe(0);
      // reset() explicitly clears isApproximate, but NOT isDubious
      // (current behavior, possibly an asymmetry/oversight in the source)
      expect(d.isApproximate).toBeFalsy();
      expect(d.isDubious).toBeTruthy();
    });
  });

  // getSpanEnd
  describe('getSpanEnd()', () => {
    it('should return the value itself when not a span', () => {
      const d = new Datation();
      d.value = 56;
      expect(d.getSpanEnd()).toBe(56);
    });
    it('should return value+1 for a positive span', () => {
      const d = new Datation();
      d.value = 56;
      d.isSpan = true;
      expect(d.getSpanEnd()).toBe(57);
    });
    it('should return value+1 (towards zero) for a negative span', () => {
      const d = new Datation();
      d.value = -776;
      d.isSpan = true;
      expect(d.getSpanEnd()).toBe(-775);
    });
    it('should return 0 for a century', () => {
      const d = new Datation();
      d.value = 4;
      d.isCentury = true;
      d.isSpan = true;
      expect(d.getSpanEnd()).toBe(0);
    });
  });

  // copyFrom
  describe('copyFrom()', () => {
    it('should copy all properties from the source', () => {
      const d = new Datation();
      d.copyFrom({
        value: 10,
        isCentury: true,
        isSpan: true,
        isApproximate: true,
        isDubious: true,
        day: 1,
        month: 2,
        hint: 'h',
        slide: 3,
      });
      expect(d.value).toBe(10);
      expect(d.isCentury).toBe(true);
      expect(d.isSpan).toBe(true);
      expect(d.isApproximate).toBe(true);
      expect(d.isDubious).toBe(true);
      expect(d.day).toBe(1);
      expect(d.month).toBe(2);
      expect(d.hint).toBe('h');
      expect(d.slide).toBe(3);
    });
    it('should set hint to undefined when source hint is falsy', () => {
      const d = new Datation();
      d.copyFrom({ value: 10, hint: '' });
      expect(d.hint).toBeUndefined();
    });
  });

  // isUndefined
  describe('isUndefined()', () => {
    it('should be true when value is 0', () => {
      const d = new Datation();
      expect(d.isUndefined()).toBe(true);
    });
    it('should be false when value is not 0', () => {
      const d = new Datation();
      d.value = 1;
      expect(d.isUndefined()).toBe(false);
    });
  });

  // getCentury edge case
  it('getCentury() should return 0 for an undefined (0) value', () => {
    const d = new Datation();
    expect(d.getCentury()).toBe(0);
  });

  // toString with various format tokens
  describe('toString() format tokens', () => {
    it('should return empty string for an undefined datation', () => {
      const d = new Datation();
      expect(d.toString()).toBe('');
    });
    it('should format day, month, year with generic format', () => {
      const d = new Datation();
      d.value = 45;
      d.day = 3;
      d.month = 5;
      const s = d.toString();
      expect(s).toBe('3 may 45 AD');
    });
    it('should format 2-digit day and month (dd/MM)', () => {
      const d = new Datation();
      d.value = 45;
      d.day = 3;
      d.month = 5;
      const s = d.toString('ddwMM');
      expect(s).toBe('03 05');
    });
    it('should format month name (MMM)', () => {
      const d = new Datation();
      d.value = 45;
      d.month = 12;
      const s = d.toString('MMM');
      expect(s).toBe('dec');
    });
    it('should format lowercase century (c) and value (v)', () => {
      const d = new Datation();
      d.value = -4;
      d.isCentury = true;
      const s = d.toString('cwv');
      expect(s).toBe('iv iv');
    });
    it('should format era uppercase (E)', () => {
      const d = new Datation();
      d.value = -4;
      const s = d.toString('E');
      expect(s).toBe('BC');
    });
    it('should format ea/ep conditionally on era', () => {
      const bc = new Datation();
      bc.value = -4;
      expect(bc.toString('ea')).toBe('BC');
      expect(bc.toString('ep')).toBe('');

      const ad = new Datation();
      ad.value = 4;
      expect(ad.toString('ea')).toBe('');
      expect(ad.toString('ep')).toBe('AD');
    });
    it('should format dubious marker (p/P)', () => {
      const d = new Datation();
      d.value = 4;
      d.isDubious = true;
      expect(d.toString('Vp')).toBe('4?');
    });
    it('should format sort value (s/S)', () => {
      const d = new Datation();
      d.value = 1230;
      d.slide = 10;
      expect(d.toString('s')).toBe('1235');
    });
    it('should include non-reserved literal characters as-is', () => {
      // letters used as format codes (v,c,a,p,d,M,e,h,w,s and uppercase)
      // are reserved, so a literal decoration must avoid them
      const d = new Datation();
      d.value = 45;
      const s = d.toString('V()');
      expect(s).toBe('45()');
    });
    it('should format a span in lowercase (v) too, using the full end year', () => {
      const d = new Datation();
      d.value = -776;
      d.isSpan = true;
      const s = d.toString('v');
      // span end is the full year (776-1=775), not a truncated notation
      expect(s).toBe('776/775');
    });
  });

  // stripFormatStringEra
  describe('stripFormatStringEra()', () => {
    it('should return "i" for an empty format', () => {
      expect(Datation.stripFormatStringEra('')).toBe('i');
    });
    it('should convert g/G to i/I', () => {
      expect(Datation.stripFormatStringEra('g')).toBe('i');
      expect(Datation.stripFormatStringEra('G')).toBe('I');
    });
    it('should strip ea/ep/Ea/Ep markers, along with a preceding w/W if any', () => {
      // the leading 'w' is consumed together with the era marker, per the
      // method's own doc comment ("remove ea ep Ea Ep with preceding w/W")
      expect(Datation.stripFormatStringEra('VwEa')).toBe('V');
      expect(Datation.stripFormatStringEra('VwEp')).toBe('V');
    });
    it('should strip a bare era marker with no preceding w/W', () => {
      expect(Datation.stripFormatStringEra('VEa')).toBe('V');
    });
  });

  // getErasOptionsForRegex
  describe('getErasOptionsForRegex()', () => {
    it('should return default BC/AD patterns', () => {
      const result = Datation.getErasOptionsForRegex();
      expect(result).toEqual(['BC', 'AD']);
    });
    it('should escape regex-special characters in custom eras', () => {
      const result = Datation.getErasOptionsForRegex({
        aboutText: 'c.',
        bcText: 'B.C.',
        adText: 'A.D.',
        dayNames: [],
        monthNames: [],
      });
      expect(result).toEqual(['B\\.C\\.', 'A\\.D\\.']);
    });
  });

  // additional parse edge cases
  it('parse invalid text with no match should be null', () => {
    const d = Datation.parse('###');
    expect(d).toBeNull();
  });

  it('parse "IX" should get a positive century (no era defaults to AD sign)', () => {
    const d = Datation.parse('IX')!;
    expect(d).toBeTruthy();
    expect(d.isCentury).toBeTruthy();
    expect(d.value).toBe(9);
  });
});
