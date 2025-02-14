import { CitScheme, CitSchemeSet } from '../models';
import { CitSchemeService } from './cit-scheme.service';
import { PatternCitParser } from './pattern.cit-parser';

const IL_SCHEME: CitScheme = {
  name: 'Iliad',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([Α-Ω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
  },
  steps: {
    book: {
      numeric: true,
      format: 'agu',
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
    const result = parser.toString([], IL_SCHEME);
    expect(result).toBe('');
  });
  //#endregion
});
