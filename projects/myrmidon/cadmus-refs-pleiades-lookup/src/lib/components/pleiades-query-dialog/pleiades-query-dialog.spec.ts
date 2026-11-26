import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PleiadesSearchResult } from '../../models';
import {
  PleiadesQueryDialogComponent,
  PleiadesQueryDialogData,
} from './pleiades-query-dialog';

const PLACE: PleiadesSearchResult = {
  id: '570406',
  uriPrefix: 'https://pleiades.stoa.org/places/',
  name: 'Epidauros',
  type: 'settlement',
  types: ['settlement'],
  lat: 37.6,
  lng: 23.1,
  distance: null,
};

describe('PleiadesQueryDialogComponent', () => {
  function create(data?: PleiadesQueryDialogData) {
    TestBed.configureTestingModule({
      imports: [PleiadesQueryDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    // the query component (with its map) is not needed to test the data
    TestBed.overrideComponent(PleiadesQueryDialogComponent, {
      set: { imports: [], template: '' },
    });
    return TestBed.createComponent(PleiadesQueryDialogComponent)
      .componentInstance;
  }

  it('should have no request without data', () => {
    const dialog = create(undefined);
    expect(dialog.request).toBeUndefined();
    expect(dialog.autoSearch).toBe(false);
  });

  it('should search the toponyms of the item name', () => {
    const dialog = create({ item: PLACE });
    expect(dialog.request).toEqual({
      text: 'Epidauros',
      scopes: ['plttl', 'nmrmz', 'nmatt'],
    });
    expect(dialog.autoSearch).toBe(true);
  });

  it('should prefer the request to the item', () => {
    const request = { text: 'Athens', scopes: ['plttl' as const] };
    const dialog = create({ item: PLACE, request });
    expect(dialog.request).toBe(request);
    expect(dialog.autoSearch).toBe(false);
  });

  it('should honor an explicit autoSearch', () => {
    const dialog = create({ item: PLACE, autoSearch: false });
    expect(dialog.autoSearch).toBe(false);
  });

  it('should close with the picked place', () => {
    const dialog = create({ item: PLACE });
    const ref = TestBed.inject(MatDialogRef);
    dialog.pick(PLACE);
    expect(ref.close).toHaveBeenCalledWith(PLACE);
  });
});
