import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

import { SparqlService } from './sparql.service';
import { SparqlAskResponse, SparqlSelectResponse } from '../models';

describe('SparqlService', () => {
  let service: SparqlService;
  let httpMock: HttpTestingController;

  const ENDPOINT = 'https://example.org/sparql';
  const QUERY = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10';

  const SELECT_RESPONSE: SparqlSelectResponse = {
    head: { vars: ['s', 'p', 'o'] },
    results: {
      bindings: [
        {
          s: { type: 'uri', value: 'http://example.org/s' },
          p: { type: 'uri', value: 'http://example.org/p' },
          o: { type: 'literal', value: 'hello', 'xml:lang': 'en' },
        },
      ],
    },
  };

  const ASK_RESPONSE: SparqlAskResponse = {
    head: {},
    boolean: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(SparqlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('select', () => {
    it('sends a GET request with query and format params and Accept header', async () => {
      const promise = firstValueFrom(service.select(ENDPOINT, QUERY));

      const req = httpMock.expectOne(
        (r) =>
          r.url === ENDPOINT &&
          r.params.get('query') === QUERY &&
          r.params.get('format') === 'application/sparql-results+json'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Accept')).toBe(
        'application/sparql-results+json'
      );
      expect(req.request.params.has('default-graph-uri')).toBe(false);

      req.flush(SELECT_RESPONSE);

      const result = await promise;
      expect(result).toEqual(SELECT_RESPONSE);
    });

    it('includes default-graph-uri param when provided', async () => {
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, {
          defaultGraphUri: 'http://example.org/graph',
        })
      );

      const req = httpMock.expectOne(
        (r) => r.params.get('default-graph-uri') === 'http://example.org/graph'
      );
      req.flush(SELECT_RESPONSE);

      await promise;
    });

    it('uses proxy mode when proxyUrl is set, forwarding the encoded target URL', async () => {
      const proxyUrl = 'https://proxy.example.org/fetch';
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, { proxyUrl })
      );

      const req = httpMock.expectOne((r) => r.url === proxyUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Accept')).toBe(
        'application/sparql-results+json'
      );
      const targetUrl = req.request.params.get('uri')!;
      expect(targetUrl.startsWith(`${ENDPOINT}?`)).toBe(true);
      // URLSearchParams encodes spaces as '+', not '%20'
      const expectedParams = new URLSearchParams();
      expectedParams.set('query', QUERY);
      expectedParams.set('format', 'application/sparql-results+json');
      expect(targetUrl).toBe(`${ENDPOINT}?${expectedParams.toString()}`);

      req.flush(SELECT_RESPONSE);
      await promise;
    });

    it('includes default-graph-uri in the proxied target URL when provided', async () => {
      const proxyUrl = 'https://proxy.example.org/fetch';
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, {
          proxyUrl,
          defaultGraphUri: 'http://example.org/graph',
        })
      );

      const req = httpMock.expectOne((r) => r.url === proxyUrl);
      const targetUrl = req.request.params.get('uri')!;
      const expectedParams = new URLSearchParams();
      expectedParams.set('query', QUERY);
      expectedParams.set('format', 'application/sparql-results+json');
      expectedParams.set('default-graph-uri', 'http://example.org/graph');
      expect(targetUrl).toBe(`${ENDPOINT}?${expectedParams.toString()}`);

      req.flush(SELECT_RESPONSE);
      await promise;
    });

    it('warns on console when X-SPARQL-MaxRows header is present', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const promise = firstValueFrom(service.select(ENDPOINT, QUERY));

      const req = httpMock.expectOne(() => true);
      req.flush(SELECT_RESPONSE, {
        headers: { 'X-SPARQL-MaxRows': '1000' },
      });

      await promise;
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('truncated to 1000 rows')
      );
    });

    it('warns on console when X-SQL-State header signals a timeout', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const promise = firstValueFrom(service.select(ENDPOINT, QUERY));

      const req = httpMock.expectOne(() => true);
      req.flush(SELECT_RESPONSE, {
        headers: { 'X-SQL-State': 'S1TAT' },
      });

      await promise;
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('timed out')
      );
    });

    it('does not warn when no partial-result headers are present', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const promise = firstValueFrom(service.select(ENDPOINT, QUERY));

      const req = httpMock.expectOne(() => true);
      req.flush(SELECT_RESPONSE);

      await promise;
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('retries on failure and resolves once a retry succeeds', async () => {
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, { maxRetries: 2, retryDelay: 1 })
      );

      const req1 = httpMock.expectOne(() => true);
      req1.flush('boom', { status: 500, statusText: 'Server Error' });

      // let the exponential-backoff timer elapse before the retried request
      // is issued
      await new Promise((resolve) => setTimeout(resolve, 50));

      const req2 = httpMock.expectOne(() => true);
      req2.flush(SELECT_RESPONSE);

      const result = await promise;
      expect(result).toEqual(SELECT_RESPONSE);
    });

    it('propagates a user-facing error once retries are exhausted', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, { maxRetries: 1, retryDelay: 1 })
      );

      const req1 = httpMock.expectOne(() => true);
      req1.flush('boom', { status: 500, statusText: 'Server Error' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const req2 = httpMock.expectOne(() => true);
      req2.flush('boom again', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toEqual(
        expect.stringContaining('Server error:')
      );
    });

    it('does not retry when maxRetries is 0', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const promise = firstValueFrom(
        service.select(ENDPOINT, QUERY, { maxRetries: 0, retryDelay: 1 })
      );

      const req = httpMock.expectOne(() => true);
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toBeDefined();
      httpMock.expectNone(() => true);
    });
  });

  describe('ask', () => {
    it('sends a GET request and resolves the boolean result', async () => {
      const promise = firstValueFrom(service.ask(ENDPOINT, QUERY));

      const req = httpMock.expectOne(
        (r) =>
          r.url === ENDPOINT &&
          r.params.get('query') === QUERY &&
          r.params.get('format') === 'application/sparql-results+json'
      );
      expect(req.request.headers.get('Accept')).toBe(
        'application/sparql-results+json'
      );

      req.flush(ASK_RESPONSE);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('resolves false when the endpoint answers false', async () => {
      const promise = firstValueFrom(service.ask(ENDPOINT, QUERY));

      const req = httpMock.expectOne(() => true);
      req.flush({ head: {}, boolean: false } as SparqlAskResponse);

      const result = await promise;
      expect(result).toBe(false);
    });

    it('uses proxy mode when proxyUrl is set', async () => {
      const proxyUrl = 'https://proxy.example.org/fetch';
      const promise = firstValueFrom(
        service.ask(ENDPOINT, QUERY, { proxyUrl })
      );

      const req = httpMock.expectOne((r) => r.url === proxyUrl);
      const targetUrl = req.request.params.get('uri')!;
      expect(targetUrl.startsWith(`${ENDPOINT}?`)).toBe(true);

      req.flush(ASK_RESPONSE);
      await promise;
    });

    it('propagates a user-facing error on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const promise = firstValueFrom(
        service.ask(ENDPOINT, QUERY, { maxRetries: 0 })
      );

      const req = httpMock.expectOne(() => true);
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toEqual(
        expect.stringContaining('Server error:')
      );
    });
  });
});
