import {
  CIT_FORMATTER_ROMAN_UPPER,
  CitSchemeService,
} from './cit-scheme.service';
import { Citation, CitScheme, CitSchemeSet } from '../models';
import { PatternCitParser } from './pattern.cit-parser';

//#region Schemes
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    parserKey: 'od',
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
  },
  steps: {
    book: {
      type: 'numeric',
      format: 'agl',
      domain: {
        range: {
          min: 1,
          max: 24,
        },
      },
    },
    verse: {
      type: 'numeric',
      suffixPattern: '([a-z])$',
      domain: {
        range: {
          min: 1,
        },
      },
    },
  },
};

const DC_SCHEME: CitScheme = {
  id: 'dc',
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
      type: 'set',
      color: 'BB4142',
      domain: {
        set: ['If.', 'Purg.', 'Par.'],
      },
    },
    canto: {
      type: 'numeric',
      color: '7EC8B1',
      format: CIT_FORMATTER_ROMAN_UPPER,
      conditions: [
        {
          clauses: [
            {
              id: 'cantica',
              op: '=',
              value: 'If.',
            },
          ],
          domain: {
            range: {
              min: 1,
              max: 34,
            },
          },
        },
      ],
      domain: {
        range: {
          min: 1,
          max: 33,
        },
      },
    },
    verso: {
      type: 'numeric',
      color: 'EFE6CC',
      domain: {
        range: {
          min: 1,
        },
      },
    },
  },
};
//#endregion

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

  //#region sortCitations
  it('should sort citations correctly based on the dc scheme', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a = parser.parse('If. III 12', scheme.id)!;
    const b = parser.parse('If. III 45', scheme.id)!;
    const c = parser.parse('If. IV 1', scheme.id)!;
    const d = parser.parse('Par. I 1', scheme.id)!;

    const citations: Citation[] = [d, a, c, b];
    service.sortCitations(citations, 'dc');

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
    expect(citations[3]).toBe(d);
  });

  it('should sort citations with suffixes', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('od')!;
    const a = parser.parse('α 12', scheme.id)!;
    const b = parser.parse('α 12a', scheme.id)!;
    const c = parser.parse('α 12c', scheme.id)!;

    const citations: Citation[] = [c, a, b];
    service.sortCitations(citations, 'od');

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
  });

  it('should sort citations with different lengths', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a: Citation = {
      schemeId: 'dc',
      steps: [
        { stepId: 'cantica', value: 'If.', n: 1 },
        { stepId: 'canto', value: 'III', n: 3 },
      ],
    };
    const b = parser.parse('If. III 45', scheme.id)!;
    const c = parser.parse('If. IV 1', scheme.id)!;

    const citations: Citation[] = [c, a, b];
    service.sortCitations(citations, 'dc');

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
    expect(citations[2]).toBe(c);
  });

  it('should sort empty citations', () => {
    const parser = new PatternCitParser(service);
    const scheme = service.getScheme('dc')!;
    const a: Citation = { schemeId: 'dc', steps: [] };
    const b = parser.parse('If. III 123', scheme.id)!;

    const citations: Citation[] = [b, a];
    service.sortCitations(citations, 'dc');

    expect(citations[0]).toBe(a);
    expect(citations[1]).toBe(b);
  });
  // #endregion

  // #region getStepDomain
  it('should return undefined if the scheme is not found', () => {
    const result = service.getStepDomain('step');
    expect(result).toBeUndefined();
  });

  it('should return step value if no conditions or citation are provided', () => {
    const result = service.getStepDomain('cantica', undefined, 'dc');
    expect(result).toEqual({ set: ['If.', 'Purg.', 'Par.'] });
  });

  it('should return step value if citation is empty', () => {
    const result = service.getStepDomain('cantica', {
      schemeId: 'dc',
      steps: [],
    });
    expect(result).toEqual({ set: ['If.', 'Purg.', 'Par.'] });
  });

  it('should return undefined if step is not found', () => {
    const result = service.getStepDomain('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return step value if conditions are not met', () => {
    const citation: Citation = {
      schemeId: 'dc',
      steps: [{ stepId: 'cantica', value: 'Purg.', n: 2 }],
    };
    const result = service.getStepDomain('canto', citation);
    expect(result).toEqual({ range: { min: 1, max: 33 } });
  });

  it('should return step value if conditions are met', () => {
    const citation: Citation = {
      schemeId: 'dc',
      steps: [{ stepId: 'cantica', value: 'If.', n: 1 }],
    };
    const result = service.getStepDomain('canto', citation);
    expect(result).toEqual({ range: { min: 1, max: 34 } });
  });

  it('should return step value if multiple conditions are met', () => {
    const citation: Citation = {
      schemeId: 'dc',
      steps: [
        { stepId: 'cantica', value: 'If.', n: 1 },
        { stepId: 'canto', value: 'III', n: 3 },
      ],
    };
    const result = service.getStepDomain('verso', citation);
    expect(result).toEqual({ range: { min: 1 } });
  });
  // #endregion
});
