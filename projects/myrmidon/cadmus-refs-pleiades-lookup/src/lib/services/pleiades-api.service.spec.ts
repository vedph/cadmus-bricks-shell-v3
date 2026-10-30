import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PleiadesLookupEntry } from '../models';
import { PLEIADES_API_URL, PleiadesApiService } from './pleiades-api.service';

const URL = 'http://test/api/';

function entry(id: number, shortName: string | null): PleiadesLookupEntry {
  return {
    id,
    fullName:
      'https://pleiades.stoa.org/vocabularies/place-types/' + (shortName || ''),
    shortName,
    group: null,
  };
}

describe('PleiadesApiService', () => {
  let service: PleiadesApiService;
  let http: HttpTestingController;

  function setup(url = URL) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLEIADES_API_URL, useValue: url },
      ],
    });
    service = TestBed.inject(PleiadesApiService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  it('appends a trailing slash to the URL', () => {
    setup('http://test/api');
    expect(service.url).toBe('http://test/api/');
  });

  it('getLookup sends only the set params', () => {
    setup();
    service.getLookup({ group: 'state', pageSize: 0 }).subscribe();
    const req = http.expectOne((r) => r.url === URL + 'lookup');
    expect(req.request.params.get('group')).toBe('state');
    expect(req.request.params.get('pageSize')).toBe('0');
    expect(req.request.params.has('prefix')).toBe(false);
    req.flush({ pageNumber: 1, pageSize: 0, total: 0, pageCount: 0, items: [] });
  });

  it('getPlaceTypes filters, sorts and caches the types', () => {
    setup();
    let types: PleiadesLookupEntry[] = [];
    service.getPlaceTypes().subscribe((t) => (types = t));
    const req = http.expectOne((r) => r.url === URL + 'lookup');
    expect(req.request.params.get('prefix')).toBe(
      'https://pleiades.stoa.org/vocabularies/place-types/',
    );
    expect(req.request.params.get('pageSize')).toBe('0');
    req.flush({
      pageNumber: 1,
      pageSize: 0,
      total: 3,
      pageCount: 1,
      items: [entry(3, null), entry(2, 'temple'), entry(1, 'abbey')],
    });
    expect(types.map((t) => t.shortName)).toEqual(['abbey', 'temple']);

    // cached
    let again: PleiadesLookupEntry[] = [];
    service.getPlaceTypes().subscribe((t) => (again = t));
    http.expectNone(URL + 'lookup');
    expect(again).toEqual(types);
  });

  it('getPlaceTypes does not cache errors', () => {
    setup();
    let failed = false;
    service.getPlaceTypes().subscribe({ error: () => (failed = true) });
    http
      .expectOne((r) => r.url === URL + 'lookup')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    expect(failed).toBe(true);

    service.getPlaceTypes().subscribe();
    http
      .expectOne((r) => r.url === URL + 'lookup')
      .flush({ pageNumber: 1, pageSize: 0, total: 0, pageCount: 0, items: [] });
  });

  it('search builds the query params', () => {
    setup();
    service
      .search({ text: '^=epid', scopes: ['plttl'], placeTypes: ['settlement'] })
      .subscribe();
    const req = http.expectOne((r) => r.url === URL + 'qsearch');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('text')).toBe('^=epid');
    expect(req.request.params.get('scopes')).toBe('plttl');
    expect(req.request.params.get('placeType')).toBe('/settlement');
    req.flush({ pageNumber: 1, pageSize: 20, total: 0, pageCount: 0, items: [] });
  });

  it('search propagates errors', () => {
    setup();
    let status = 0;
    service.search({}).subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne((r) => r.url === URL + 'qsearch')
      .flush({ errors: {} }, { status: 400, statusText: 'Bad Request' });
    expect(status).toBe(400);
  });

  it('getPlace encodes the ID', () => {
    setup();
    service.getPlace('a/b').subscribe();
    http.expectOne(URL + 'places/a%2Fb').flush({});
  });

  it('getNearby builds the params', () => {
    setup();
    service
      .getNearby('579885', { distance: 10000, limit: 2, placeTypes: ['fort'] })
      .subscribe();
    const req = http.expectOne((r) => r.url === URL + 'places/579885/nearby');
    expect(req.request.params.get('distance')).toBe('10000');
    expect(req.request.params.get('limit')).toBe('2');
    expect(req.request.params.get('placeType')).toBe('/fort');
    req.flush([]);
  });

  it('getNearby omits unset params', () => {
    setup();
    service.getNearby('1').subscribe();
    const req = http.expectOne((r) => r.url === URL + 'places/1/nearby');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });
});
