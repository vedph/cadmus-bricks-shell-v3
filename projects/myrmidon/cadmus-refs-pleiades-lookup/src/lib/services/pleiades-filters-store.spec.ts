import { TestBed } from '@angular/core/testing';

import {
  PLEIADES_FILTERS_STORAGE_KEY,
  PleiadesFiltersStore,
} from './pleiades-filters-store';

const KEY = 'test.pleiades.filters.store';

describe('PleiadesFiltersStore', () => {
  let store: PleiadesFiltersStore;

  beforeEach(() => {
    localStorage.removeItem(KEY);
    TestBed.configureTestingModule({
      providers: [{ provide: PLEIADES_FILTERS_STORAGE_KEY, useValue: KEY }],
    });
    store = TestBed.inject(PleiadesFiltersStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(KEY);
  });

  it('has a default storage key', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(PLEIADES_FILTERS_STORAGE_KEY)).toBe(
      'cadmus-refs-pleiades-lookup.filters',
    );
  });

  it('loads undefined when nothing was saved', () => {
    expect(store.load()).toBeUndefined();
  });

  it('saves and loads filters under its key', () => {
    const filters = {
      scopes: [],
      placeTypes: ['/settlement'],
      swCornerLon: 170,
      swCornerLat: 10,
      neCornerLon: -170,
      neCornerLat: 20,
    };
    expect(store.save(filters)).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(filters);
    expect(store.load()).toEqual(filters);
  });

  it('replaces the saved filters', () => {
    store.save({ rankMin: 10 });
    store.save({ yearMax: 100 });
    expect(store.load()).toEqual({ yearMax: 100 });
  });

  it('clears the saved filters', () => {
    store.save({ rankMin: 10 });
    store.clear();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(store.load()).toBeUndefined();
  });

  it('loads undefined for invalid JSON or non-objects', () => {
    localStorage.setItem(KEY, '{oops');
    expect(store.load()).toBeUndefined();
    localStorage.setItem(KEY, '[1,2]');
    expect(store.load()).toBeUndefined();
    localStorage.setItem(KEY, '42');
    expect(store.load()).toBeUndefined();
  });

  it('does not throw when storage is not available', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(store.save({ rankMin: 10 })).toBe(false);
    expect(store.load()).toBeUndefined();
    expect(() => store.clear()).not.toThrow();
  });
});
