import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NEVER, Observable, of, throwError } from 'rxjs';

import {
  IcoParseResult,
  IconclassService as IconclassApiService,
} from '@myrmidon/iconclass-api';
import type { IconclassBuilderResult } from '@myrmidon/iconclass-builder';

import { IconclassNotation } from '../iconclass.service';
import { IconclassRefLookupService } from '../iconclass-lookup.service';
import {
  IconclassBuilderDialogComponent,
  IconclassBuilderDialogData,
} from './iconclass-builder-dialog';

const NOTATION: IconclassNotation = {
  n: '95A(ERICHTHONIUS)68',
  p: [
    '9',
    '95',
    '95A',
    '95A(...)',
    '95A(ERICHTHONIUS)',
    '95A(ERICHTHONIUS)6',
    '95A(ERICHTHONIUS)68',
  ],
  b: '95A(ERICHTHONIUS)68',
  l: ['9k0'],
  txt: { en: '(story of) Erichthonius (Erechtheus) - death' },
  kw: { en: ['death'] },
};

function builderResult(language = 'en'): IconclassBuilderResult {
  return {
    id: NOTATION.n,
    text: language === 'en' ? NOTATION.txt.en : 'morte di Erittonio',
    language,
    parsed: {
      notation: NOTATION.n,
      base: NOTATION.b,
      isValid: true,
      hasChildren: false,
      segments: NOTATION.p.map((p) => ({
        type: 'Notation' as const,
        notation: p,
        code: p,
      })),
    },
  };
}

describe('IconclassBuilderDialogComponent', () => {
  let close: ReturnType<typeof vi.fn>;
  let getById: ReturnType<typeof vi.fn>;
  let parse: ReturnType<typeof vi.fn>;

  function create(data?: IconclassBuilderDialogData) {
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [IconclassBuilderDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: IconclassRefLookupService, useValue: { getById } },
        { provide: IconclassApiService, useValue: { parse } },
      ],
    });
    // the builder (which uses the API) is not needed to test the dialog
    TestBed.overrideComponent(IconclassBuilderDialogComponent, {
      set: { imports: [], template: '' },
    });
    return TestBed.createComponent(IconclassBuilderDialogComponent)
      .componentInstance;
  }

  beforeEach(() => {
    getById = vi.fn((): Observable<IconclassNotation | undefined> =>
      of(NOTATION),
    );
    parse = vi.fn(
      (): Observable<Partial<IcoParseResult>> =>
        of({ text: 'English text' }),
    );
  });

  it('should start from the item ID', () => {
    const dialog = create({ item: NOTATION });
    expect(dialog.initialId).toBe(NOTATION.n);
  });

  it('should start from the ID rather than from the item', () => {
    const dialog = create({ item: NOTATION, id: '11H' });
    expect(dialog.initialId).toBe('11H');
  });

  it('should start empty without data', () => {
    const dialog = create(undefined);
    expect(dialog.initialId).toBe('');
  });

  it('should close with the notation from the ICONCLASS API', () => {
    const dialog = create();
    dialog.accept(builderResult());
    expect(getById).toHaveBeenCalledWith(NOTATION.n);
    expect(close).toHaveBeenCalledWith(NOTATION);
    expect(dialog.resolving()).toBe(false);
  });

  it('should close with the built notation when the ICONCLASS API fails', () => {
    getById = vi.fn(() => throwError(() => new Error('offline')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dialog = create();
    dialog.accept(builderResult());
    const notation = close.mock.calls[0][0] as IconclassNotation;
    expect(notation.n).toBe(NOTATION.n);
    expect(notation.p).toEqual(NOTATION.p);
    expect(notation.txt).toEqual({ en: NOTATION.txt.en });
    expect(parse).not.toHaveBeenCalled();
  });

  it('should close with the built notation when the ICONCLASS API has no notation', () => {
    getById = vi.fn(() => of(undefined));
    const dialog = create();
    dialog.accept(builderResult());
    expect((close.mock.calls[0][0] as IconclassNotation).n).toBe(NOTATION.n);
  });

  it('should add the English text to a built notation in another language', () => {
    getById = vi.fn(() => of(undefined));
    const dialog = create();
    dialog.accept(builderResult('it'));
    expect(parse).toHaveBeenCalledWith(NOTATION.n, 'en');
    expect((close.mock.calls[0][0] as IconclassNotation).txt).toEqual({
      it: 'morte di Erittonio',
      en: 'English text',
    });
  });

  it('should build the notation without English text when parsing fails', () => {
    getById = vi.fn(() => of(undefined));
    parse = vi.fn(() => throwError(() => new Error('503')));
    const dialog = create();
    dialog.accept(builderResult('it'));
    expect((close.mock.calls[0][0] as IconclassNotation).txt).toEqual({
      it: 'morte di Erittonio',
    });
  });

  it('should not use the ICONCLASS API with noResolve', () => {
    const dialog = create({ noResolve: true });
    dialog.accept(builderResult());
    expect(getById).not.toHaveBeenCalled();
    expect((close.mock.calls[0][0] as IconclassNotation).l).toEqual([]);
  });

  it('should ignore accepts while resolving', () => {
    getById = vi.fn(() => NEVER);
    const dialog = create();
    dialog.accept(builderResult());
    dialog.accept(builderResult());
    expect(getById).toHaveBeenCalledTimes(1);
    expect(dialog.resolving()).toBe(true);
    expect(close).not.toHaveBeenCalled();
  });
});
