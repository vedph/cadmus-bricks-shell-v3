import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { EnvService } from '@myrmidon/ngx-tools';
import { DataPinInfo, IndexLookupDefinition } from '@myrmidon/cadmus-core';

import { PinRefLookupService } from './pin-ref-lookup.service';

const API_URL = 'https://example.com/api/';

describe('PinRefLookupService', () => {
  let service: PinRefLookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(PinRefLookupService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(EnvService).set('apiUrl', API_URL);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose id "pin"', () => {
    expect(service.id).toBe('pin');
  });

  describe('getById', () => {
    it('should always resolve to undefined without issuing any request', () => {
      let result: unknown = 'not-undefined';

      service.getById('any-id').subscribe((item) => {
        result = item;
      });

      expect(result).toBeUndefined();
      httpMock.expectNone(() => true);
    });
  });

  describe('getName', () => {
    it('should return the item value', () => {
      expect(service.getName({ value: 'foo' })).toBe('foo');
    });

    it('should return an empty string when item is undefined', () => {
      expect(service.getName(undefined)).toBe('');
    });

    it('should return an empty string when the item has no value', () => {
      expect(service.getName({})).toBe('');
    });
  });

  describe('lookup', () => {
    it('should resolve to an empty array without issuing a request when options are not set', () => {
      let result: DataPinInfo[] | undefined;

      service.lookup({ limit: 10, text: 'foo' }).subscribe((items) => {
        result = items;
      });

      expect(result).toEqual([]);
      httpMock.expectNone(() => true);
    });

    it('should build a query from the definition and filter, and POST it to search/pins', () => {
      let result: DataPinInfo[] | undefined;
      const def: IndexLookupDefinition = {
        typeId: 'it.vedph.metadata',
        roleId: 'some-role',
        name: 'eid',
      };

      service
        .lookup({ limit: 5, text: 'abc', itemId: 'item1', partId: 'part1' }, def)
        .subscribe((items) => {
          result = items;
        });

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${API_URL}search/pins`,
      );
      expect(req.request.body.query).toBe(
        '[partTypeId=it.vedph.metadata] AND [roleId=some-role] AND [name=eid] AND [itemId=item1] AND [partId=part1] AND [value*=abc]',
      );
      expect(req.request.body.pageNumber).toBe(1);
      expect(req.request.body.pageSize).toBe(5);
      expect(req.request.params.get('pageNumber')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('5');

      const page = {
        pageNumber: 1,
        pageSize: 5,
        pageCount: 1,
        total: 1,
        items: [
          {
            itemId: 'item1',
            partId: 'part1',
            roleId: null,
            partTypeId: 'it.vedph.metadata',
            name: 'eid',
            value: 'abc',
          },
        ],
      };
      req.flush({ value: page });

      expect(result).toEqual(page.items);
    });

    it('should build a minimal query when only the definition name is set', () => {
      const def: IndexLookupDefinition = { name: 'eid' };

      service.lookup({ limit: 10, text: undefined }, def).subscribe();

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${API_URL}search/pins`,
      );
      expect(req.request.body.query).toBe('[name=eid]');

      req.flush({
        value: { pageNumber: 1, pageSize: 10, pageCount: 0, total: 0, items: [] },
      });
    });

    it('should return an empty array and log the error when the response carries an error', () => {
      let result: DataPinInfo[] | undefined;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const def: IndexLookupDefinition = { name: 'eid' };

      service.lookup({ limit: 10, text: 'x' }, def).subscribe((items) => {
        result = items;
      });

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${API_URL}search/pins`,
      );
      req.flush({ error: 'something went wrong' });

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return an empty array when the response has no items', () => {
      let result: DataPinInfo[] | undefined;
      const def: IndexLookupDefinition = { name: 'eid' };

      service.lookup({ limit: 10, text: 'x' }, def).subscribe((items) => {
        result = items;
      });

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${API_URL}search/pins`,
      );
      req.flush({ value: undefined });

      expect(result).toEqual([]);
    });
  });
});
