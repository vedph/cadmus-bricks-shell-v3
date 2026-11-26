import type { RefLookupMoreDialogConfig } from '@myrmidon/cadmus-refs-lookup';
import type { IconclassBuilderResult } from '@myrmidon/iconclass-builder';

import type { IconclassLocalizedMap, IconclassNotation } from './iconclass.service';

/**
 * The language codes used by the Iconclass API (BCP 47) which differ from
 * those used by the public ICONCLASS data (see ICONCLASS_LANGUAGES), as
 * keys of the `txt` and `kw` maps of IconclassNotation.
 */
const ICONCLASS_ORG_LANGUAGES: Readonly<Record<string, string>> = {
  ja: 'jp',
  cs: 'cz',
};

/**
 * Get the language code used by the public ICONCLASS data (e.g. `jp`)
 * from the corresponding code used by the Iconclass API (e.g. `ja`).
 * @param language The Iconclass API language code.
 * @returns The ICONCLASS data language code.
 */
export function toIconclassOrgLanguage(language: string): string {
  const code = (language || 'en').toLowerCase();
  return ICONCLASS_ORG_LANGUAGES[code] || code;
}

/**
 * Build an IconclassNotation, i.e. the item of IconclassRefLookupService,
 * from the identifier built with the Iconclass builder. This is the
 * fallback used when the notation cannot be got from the public ICONCLASS
 * API: the result has the identifier (`n`), its base (`b`), its path
 * (`p`, from the parsed segments, which are the same steps of the ICONCLASS
 * path), its key (`k`, from the last key segment), and its label (`txt`)
 * in the builder's language, plus English when specified. Keywords (`kw`),
 * children (`c`), related notations (`r`) and keys codes (`l`) are not
 * available.
 * @param result The builder result.
 * @param englishText The English text of the identifier, used when the
 * builder language is not English.
 * @returns The notation.
 */
export function iconclassBuilderResultToNotation(
  result: IconclassBuilderResult,
  englishText?: string | null,
): IconclassNotation {
  const parsed = result.parsed;
  const segments = parsed?.segments || [];

  const txt: IconclassLocalizedMap<string> = {};
  const language = toIconclassOrgLanguage(result.language);
  const text = result.text || parsed?.text;
  if (text) {
    txt[language] = text;
  }
  if (englishText && language !== 'en') {
    txt['en'] = englishText;
  }

  const notation: IconclassNotation = {
    n: result.id,
    b: parsed?.base || result.id,
    p: segments.length ? segments.map((s) => s.notation) : [result.id],
    l: [],
    txt,
    kw: {},
  };

  const keys = segments.filter((s) => s.type === 'Key');
  if (keys.length) {
    notation.k = keys[keys.length - 1].code;
  }
  return notation;
}

/**
 * The default configuration of the dialog hosting the Iconclass builder,
 * used as `moreDialogConfig` of the ICONCLASS lookup.
 */
export const ICONCLASS_BUILDER_DIALOG_CONFIG: RefLookupMoreDialogConfig = {
  title: 'Iconclass builder',
  width: '95vw',
  maxWidth: '1400px',
  height: '90vh',
  maxHeight: '90vh',
};
