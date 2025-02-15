import { CitMappedValues, CitScheme, CitSchemeSet } from '../models';
import { CitSchemeService } from './cit-scheme.service';
import { MapFormatter } from './map.formatter';
import { PatternCitParser } from './pattern.cit-parser';

const OD_SCHEME: CitScheme = {
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([α-ω])\\s+(\\d+(?:[a-z])?)\\s*$',
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
      suffixPattern: '^[a-z]$',
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
      format: '$ru',
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
    aglMap[String.fromCharCode(n)] = n - 0x3b0;
  }
  service.addFormatter('agl', aglFormatter);

  //#region toString
  it('should return empty string for empty citation', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString([], OD_SCHEME);
    expect(result).toBe('');
  });

  it('should return citation text for α 123', () => {
    const parser = new PatternCitParser(service);
    const result = parser.toString(
      [
        { step: 'book', value: 'α', n: 1 },
        { step: 'verse', value: '123', n: 123 },
      ],
      OD_SCHEME
    );
    expect(result).toBe('α 123');
  });
  //#endregion
});
