import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { EnvService } from '@myrmidon/ngx-tools';
import { Item } from '@myrmidon/cadmus-core';

import { ItemRefLookupService } from './item-ref-lookup.service';

const API_URL = 'https://example.com/api/';

describe('ItemRefLookupService', () => {
  let service: ItemRefLookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemRefLookupService);
    httpMock = TestBed.inject(HttpTestingController);
    // ensure a known apiUrl is used by the underlying ItemService
    TestBed.inject(EnvService).set('apiUrl', API_URL);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose id "item"', () => {
    expect(service.id).toBe('item');
  });

  describe('lookup', () => {
    it('should GET items filtered by text and map the page to its items', () => {
      let result: Item[] | undefined;

      service.lookup({ limit: 10, text: 'foo' }).subscribe((items) => {
        result = items;
      });

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url === `${API_URL}items`,
      );
      expect(req.request.params.get('title')).toBe('foo');
      expect(req.request.params.get('pageNumber')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');

      const page = {
        pageNumber: 1,
        pageSize: 10,
        pageCount: 1,
        total: 1,
        items: [{ id: 'i1', title: 'Item 1' }],
      };
      req.flush(page);

      expect(result).toEqual(page.items);
    });

    it('should default the page size to 10 when no limit is set', () => {
      service.lookup({ limit: 0, text: undefined }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url === `${API_URL}items`,
      );
      expect(req.request.params.get('pageSize')).toBe('10');
      expect(req.request.params.has('title')).toBe(false);

      req.flush({
        pageNumber: 1,
        pageSize: 10,
        pageCount: 0,
        total: 0,
        items: [],
      });
    });

    it('should propagate an error after retries are exhausted', () => {
      let error: unknown;
      let nextCalled = false;

      service.lookup({ limit: 10, text: 'foo' }).subscribe({
        next: () => (nextCalled = true),
        error: (err) => (error = err),
      });

      // the underlying ItemService retries the request 3 times on error,
      // so the request is issued 4 times in total before failing.
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne(
          (r) => r.method === 'GET' && r.url === `${API_URL}items`,
        );
        req.flush('error', { status: 500, statusText: 'Server Error' });
      }

      expect(error).toBeTruthy();
      expect(nextCalled).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return undefined without issuing a request when id is falsy', () => {
      let result: Item | undefined = { id: 'x' } as Item;

      service.getById('').subscribe((item) => {
        result = item;
      });

      expect(result).toBeUndefined();
      httpMock.expectNone(() => true);
    });

    it('should GET the item by id without requesting its parts', () => {
      let result: Item | undefined;

      service.getById('i1').subscribe((item) => {
        result = item;
      });

      const req = httpMock.expectOne(`${API_URL}items/i1`);
      expect(req.request.method).toBe('GET');

      const item = { id: 'i1', title: 'Item 1' };
      req.flush(item);

      expect(result).toEqual(item);
    });

    it('should map a null response to undefined', () => {
      let result: Item | undefined = { id: 'x' } as Item;

      service.getById('i1').subscribe((item) => {
        result = item;
      });

      const req = httpMock.expectOne(`${API_URL}items/i1`);
      req.flush(null as unknown as Item);

      expect(result).toBeUndefined();
    });

    it('should resolve to undefined on a 404 instead of erroring, since noErrIfNotFound is passed', () => {
      let result: Item | undefined = { id: 'x' } as Item;
      let error: unknown;

      service.getById('missing').subscribe({
        next: (item) => (result = item),
        error: (err) => (error = err),
      });

      // retry(3) re-issues the request on every error, including 404s,
      // so it takes 4 requests before catchError's noErrIfNotFound check runs.
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne(`${API_URL}items/missing`);
        req.flush('not found', { status: 404, statusText: 'Not Found' });
      }

      expect(error).toBeUndefined();
      expect(result).toBeUndefined();
    });
  });

  describe('getName', () => {
    it('should return the item title', () => {
      expect(service.getName({ title: 'My Item' } as Item)).toBe('My Item');
    });
  });
});
