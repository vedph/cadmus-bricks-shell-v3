import { CitScheme, CitSchemeSet } from '../models';
import { CitSchemeService } from './cit-scheme.service';
import { PatternCitParser } from './pattern.cit-parser';

const OD_SCHEME: CitScheme = {
  name: 'Iliad',
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

describe('PatternCitParser.toString', () => {
  const service: CitSchemeService = new CitSchemeService();
  service.configure({
    formats: {},
    schemes: {},
  } as CitSchemeSet);

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
