import type { IcoParsedNotation, IcoSegment } from '@myrmidon/iconclass-api';
import type { IconclassBuilderResult } from '@myrmidon/iconclass-builder';

import {
  iconclassBuilderResultToNotation,
  toIconclassOrgLanguage,
} from './iconclass-builder-helpers';

function segment(
  type: IcoSegment['type'],
  notation: string,
  code = notation,
): IcoSegment {
  return { type, notation, code };
}

function result(
  id: string,
  segments: IcoSegment[],
  language = 'en',
  text = 'some text',
  base?: string,
): IconclassBuilderResult {
  const parsed: IcoParsedNotation = {
    notation: id,
    base: base ?? id,
    isValid: true,
    hasChildren: false,
    text,
    segments,
  };
  return { id, text, language, parsed };
}

// the segments got from the API for 95A(ERICHTHONIUS)68: their notations
// are the path got from the public ICONCLASS API for the same notation
const ERICHTHONIUS_SEGMENTS = [
  segment('Notation', '9'),
  segment('Notation', '95'),
  segment('Notation', '95A'),
  segment('Placeholder', '95A(...)'),
  segment('Name', '95A(ERICHTHONIUS)'),
  segment('Notation', '95A(ERICHTHONIUS)6'),
  segment('Notation', '95A(ERICHTHONIUS)68'),
];

describe('toIconclassOrgLanguage', () => {
  it('should map the API codes differing from the ICONCLASS ones', () => {
    expect(toIconclassOrgLanguage('ja')).toBe('jp');
    expect(toIconclassOrgLanguage('cs')).toBe('cz');
  });

  it('should keep the other codes, lowercased', () => {
    expect(toIconclassOrgLanguage('it')).toBe('it');
    expect(toIconclassOrgLanguage('DE')).toBe('de');
  });

  it('should default to English', () => {
    expect(toIconclassOrgLanguage('')).toBe('en');
  });
});

describe('iconclassBuilderResultToNotation', () => {
  it('should build the notation in the lookup items shape', () => {
    const n = iconclassBuilderResultToNotation(
      result(
        '95A(ERICHTHONIUS)68',
        ERICHTHONIUS_SEGMENTS,
        'en',
        '(story of) Erichthonius (Erechtheus) - death',
      ),
    );
    expect(n).toEqual({
      n: '95A(ERICHTHONIUS)68',
      b: '95A(ERICHTHONIUS)68',
      p: [
        '9',
        '95',
        '95A',
        '95A(...)',
        '95A(ERICHTHONIUS)',
        '95A(ERICHTHONIUS)6',
        '95A(ERICHTHONIUS)68',
      ],
      l: [],
      txt: { en: '(story of) Erichthonius (Erechtheus) - death' },
      kw: {},
    });
  });

  it('should set the key from the last key segment, and the base', () => {
    const n = iconclassBuilderResultToNotation(
      result(
        '25F23(LION)(+12)',
        [
          segment('Notation', '25F23'),
          segment('Placeholder', '25F23(...)'),
          segment('Name', '25F23(LION)'),
          segment('Key', '25F23(LION)(+1)', '25Fk1'),
          segment('Key', '25F23(LION)(+12)', '25Fk12'),
        ],
        'en',
        'lion (+ heraldic)',
        '25F23(LION)',
      ),
    );
    expect(n.k).toBe('25Fk12');
    expect(n.b).toBe('25F23(LION)');
  });

  it('should have no key without key segments', () => {
    const n = iconclassBuilderResultToNotation(
      result('95A(ERICHTHONIUS)68', ERICHTHONIUS_SEGMENTS),
    );
    expect('k' in n).toBe(false);
  });

  it('should add the English text to a text in another language', () => {
    const n = iconclassBuilderResultToNotation(
      result('95A(ERICHTHONIUS)68', ERICHTHONIUS_SEGMENTS, 'ja', 'JP'),
      'EN',
    );
    expect(n.txt).toEqual({ jp: 'JP', en: 'EN' });
  });

  it('should not override the English text with the English one', () => {
    const n = iconclassBuilderResultToNotation(
      result('95A(ERICHTHONIUS)68', ERICHTHONIUS_SEGMENTS, 'en', 'built'),
      'other',
    );
    expect(n.txt).toEqual({ en: 'built' });
  });

  it('should fall back to the parsed text and to the ID as path', () => {
    const r = result('1', [], 'en', 'religion');
    r.text = null;
    const n = iconclassBuilderResultToNotation(r);
    expect(n.txt).toEqual({ en: 'religion' });
    expect(n.p).toEqual(['1']);
  });
});
