import { CitMappedValues, CitScheme, CitSchemeSet } from '../models';
import {
  CIT_FORMATTER_ROMAN_UPPER,
  CitSchemeService,
} from './cit-scheme.service';
import { MapFormatter } from './map.formatter';
import { PatternCitParser } from './pattern.cit-parser';

//#region Schemes
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
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

describe('PatternCitParser', () => {
  const service: CitSchemeService = new CitSchemeService();
  service.configure({
    formats: {},
    schemes: {
      od: OD_SCHEME,
      dc: DC_SCHEME,
    },
  } as CitSchemeSet);

  const aglFormatter = new MapFormatter();
  const aglMap: CitMappedValues = {};
  for (let n = 0x3b1; n <= 0x3c9; n++) {
    // skip final sigma
    if (n === 0x3c2) {
      continue;
    }
    aglMap[String.fromCharCode(n)] = n - 0x3b0;
  }
  aglFormatter.configure(aglMap);
  service.addFormatter('agl', aglFormatter);

  //#region parse
  it('should parse empty text', () => {
    const parser = new PatternCitParser(service);
    const result = parser.parse('', OD_SCHEME.id);
    expect(result).toEqual([]);
  });

  it('should parse α 123', () => {
    const parser = new PatternCitParser(service);
    const result = parser.parse('α 123', OD_SCHEME.id);
    expect(result.length).toBe(2);
    expect(result[0].step).toBe('book');
    expect(result[0].value).toBe('α');
    expect(result[0].n).toBe(1);

    expect(result[1].step).toBe('verse');
    expect(result[1].value).toBe('123');
    expect(result[1].n).toBe(123);
  });

  it('should parse α 123b', () => {
    const parser = new PatternCitParser(service);
    const result = parser.parse('α 123b', OD_SCHEME.id);
    expect(result.length).toBe(2);
    expect(result[0].step).toBe('book');
    expect(result[0].value).toBe('α');
    expect(result[0].n).toBe(1);

    expect(result[1].step).toBe('verse');
    expect(result[1].value).toBe('123');
    expect(result[1].n).toBe(123);
    expect(result[1].suffix).toBe('b');
  });

  it('should parse If. I 123', () => {
    const parser = new PatternCitParser(service);
    const result = parser.parse('If. I 123', DC_SCHEME.id);
    expect(result.length).toBe(3);

    expect(result[0].step).toBe('cantica');
    expect(result[0].value).toBe('If.');
    expect(result[0].n).toBe(1);

    expect(result[1].step).toBe('canto');
    expect(result[1].value).toBe('I');
    expect(result[1].n).toBe(1);

    expect(result[2].step).toBe('verso');
    expect(result[2].value).toBe('123');
    expect(result[2].n).toBe(123);
  });
  //#endregion

  //#region toString
  it('should return empty string for empty citation', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString([], OD_SCHEME.id);
    expect(result).toBe('');
  });

  it('should return citation text for α 123', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString(
      [
        { step: 'book', value: 'α', n: 1 },
        { step: 'verse', value: '123', n: 123 },
      ],
      OD_SCHEME.id
    );
    expect(result).toBe('@od:α 123');
  });

  it('should return citation text for α 123b', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString(
      [
        { step: 'book', value: 'α', n: 1 },
        { step: 'verse', value: '123', n: 123, suffix: 'b' },
      ],
      OD_SCHEME.id
    );
    expect(result).toBe('@od:α 123b');
  });

  it('should return citation text for If. I 123', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString(
      [
        { step: 'cantica', value: 'If.', n: 1 },
        { step: 'canto', value: 'I', n: 1 },
        { step: 'verso', value: '123', n: 123 },
      ],
      DC_SCHEME.id
    );
    expect(result).toBe('@dc:If. I 123');
  });
  //#endregion
});
