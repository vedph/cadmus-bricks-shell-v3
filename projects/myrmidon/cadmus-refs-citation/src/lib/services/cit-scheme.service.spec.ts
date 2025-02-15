import {
  CIT_FORMATTER_ROMAN_UPPER,
  CitSchemeService,
} from './cit-scheme.service';
import { CitationModel, CitScheme, CitSchemeSet } from '../models';
import { PatternCitParser } from './pattern.cit-parser';

const OD_SCHEME: CitScheme = {
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
  },
  steps: {
    book: {
      numeric: true,
      format: 'agl',
      value: {
        range: {
          min: 1,
          max: 24,
        },
      },
    },
    verse: {
      numeric: true,
      suffixPattern: '([a-z])$',
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};

const DC_SCHEME: CitScheme = {
  name: 'Commedia',
  path: ['cantica', 'canto', 'verso'],
  optionalFrom: 'canto',
  textOptions: {
    pathPattern: '^\\s*(If\\.|Purg\\.|Par\\.)\\s*([IVX]+)\\s+(\\d+)\\s*$',
    template: '{cantica} {canto} {verso}',
  },
  color: 'BB4142',
  steps: {
    cantica: {
      color: 'BB4142',
      value: {
        set: ['If.', 'Purg.', 'Par.'],
      },
    },
    canto: {
      color: '7EC8B1',
      numeric: true,
      format: CIT_FORMATTER_ROMAN_UPPER,
      conditions: [
        {
          ascendants: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
          ],
          value: {
            range: {
              min: 1,
              max: 34,
            },
          },
        },
      ],
      value: {
        range: {
          min: 1,
          max: 33,
        },
      },
    },
    verso: {
      color: 'EFE6CC',
      numeric: true,
      value: {
        range: {
          min: 1,
        },
      },
    },
  },
};

describe('CitSchemeService', () => {
  const service: CitSchemeService = new CitSchemeService();
  service.configure({
    formats: {},
    schemes: {
      dc: DC_SCHEME,
      od: OD_SCHEME,
    },
  } as CitSchemeSet);

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should sort citations correctly based on the dc scheme', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a = parser.parse('If. III 12', scheme);
    const b = parser.parse('If. III 45', scheme);
    const c = parser.parse('If. IV 1', scheme);
    const d = parser.parse('Par. I 1', scheme);

    const citations: CitationModel[] = [d, a, c, b];
    service.sortCitations(citations, scheme);

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
    expect(citations[3]).toBe(d);
  });

  it('should sort citations with suffixes', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('od')!;
    const a = parser.parse('α 12', scheme);
    const b = parser.parse('α 12a', scheme);
    const c = parser.parse('α 12c', scheme);

    const citations: CitationModel[] = [c, a, b];
    service.sortCitations(citations, scheme);

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
  });

  it('should handle citations with different lengths', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a: CitationModel = [
      { step: 'cantica', value: 'If.', n: 1 },
      { step: 'canto', value: 'III', n: 3 },
    ];
    const b = parser.parse('If. III 45', scheme);
    const c = parser.parse('If. IV 1', scheme);

    const citations: CitationModel[] = [c, a, b];
    service.sortCitations(citations, scheme);

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
  });

  it('should handle empty citations', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a = parser.parse('If. III', scheme);
    const b = parser.parse('If. III 45', scheme);
    const c = parser.parse('If. IV 1', scheme);

    const citations: CitationModel[] = [c, a, [], b];
    service.sortCitations(citations, scheme);

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
    expect(citations[3]).toEqual([]);
  });
});
