import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { PleiadesPlace, PleiadesSearchResult } from '../models';
import { PleiadesApiService } from './pleiades-api.service';
import {
  pleiadesPlaceToResult,
  PleiadesRefLookupService,
} from './pleiades-ref-lookup.service';

const RESULT: PleiadesSearchResult = {
  id: '570228',
  uriPrefix: 'https://pleiades.stoa.org/places/',
  name: 'Epidauros',
  type: 'https://pleiades.stoa.org/vocabularies/place-types/settlement',
  types: ['https://pleiades.stoa.org/vocabularies/place-types/settlement'],
  lat: 37.63,
  lng: 23.16,
  distance: null,
};

const PLACE: PleiadesPlace = {
  id: '570228',
  uri: 'https://pleiades.stoa.org/places/570228',
  title: 'Epidauros',
  description: null,
  details: null,
  provenance: null,
  rights: null,
  reviewState: 'published',
  created: '2024-02-25T00:00:00',
  modified: '2024-06-01T00:00:00',
  lat: 37.63,
  lng: 23.16,
  bbox: [23.16, 37.63, 23.17, 37.64],
  types: ['https://pleiades.stoa.org/vocabularies/place-types/settlement'],
  subjects: [],
  names: [],
  locations: [],
  connections: [],
  incomingConnections: [],
  linkedPlaces: [],
};

describe('PleiadesRefLookupService', () => {
  let service: PleiadesRefLookupService;
  let api: { search: ReturnType<typeof vi.fn>; getPlace: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      search: vi.fn(() =>
        of({ pageNumber: 1, pageSize: 10, total: 1, pageCount: 1, items: [RESULT] }),
      ),
      getPlace: vi.fn(() => of(PLACE)),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PleiadesApiService, useValue: api }],
    });
    service = TestBed.inject(PleiadesRefLookupService);
  });

  it('has id pleiades', () => {
    expect(service.id).toBe('pleiades');
  });

  it('returns no items for empty text without calling the API', async () => {
    expect(await firstValueFrom(service.lookup({ text: ' ', limit: 10 }))).toEqual([]);
    expect(api.search).not.toHaveBeenCalled();
  });

  it('searches toponyms by prefix of the last word', async () => {
    const items = await firstValueFrom(
      service.lookup({ text: 'via app', limit: 5 }),
    );
    expect(items).toEqual([RESULT]);
    expect(api.search).toHaveBeenCalledWith({
      scopes: ['plttl', 'nmrmz', 'nmatt'],
      text: 'via ^=app',
      pageNumber: 1,
      pageSize: 5,
    });
  });

  it('applies options and clamps the limit', async () => {
    await firstValueFrom(
      service.lookup(
        { text: 'roma', limit: 500 },
        { scopes: ['plttl'], placeTypes: ['settlement'], noTypeAhead: true },
      ),
    );
    expect(api.search).toHaveBeenCalledWith({
      scopes: ['plttl'],
      placeTypes: ['settlement'],
      text: 'roma',
      pageNumber: 1,
      pageSize: 100,
    });
  });

  it('returns no items on errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.search.mockReturnValue(throwError(() => ({ status: 500 })));
    expect(await firstValueFrom(service.lookup({ text: 'x', limit: 5 }))).toEqual([]);
    spy.mockRestore();
  });

  it('getById returns the place as a result', async () => {
    const item = await firstValueFrom(service.getById(' 570228 '));
    expect(api.getPlace).toHaveBeenCalledWith('570228');
    expect(item).toEqual(RESULT);
  });

  it('getById returns undefined for empty or missing IDs', async () => {
    expect(await firstValueFrom(service.getById(''))).toBeUndefined();
    api.getPlace.mockReturnValue(throwError(() => ({ status: 404 })));
    expect(await firstValueFrom(service.getById('1'))).toBeUndefined();
  });

  it('getName returns the name', () => {
    expect(service.getName(RESULT)).toBe('Epidauros');
    expect(service.getName(undefined)).toBe('');
  });

  it('pleiadesPlaceToResult handles places without types', () => {
    const result = pleiadesPlaceToResult({
      ...PLACE,
      uri: 'https://other.org/x',
      types: [],
      lat: null,
      lng: null,
    });
    expect(result.type).toBeNull();
    expect(result.uriPrefix).toBe('https://pleiades.stoa.org/places/');
    expect(result.lat).toBeNull();
  });
});
