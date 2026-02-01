import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DbpediaRefLookupService } from './dbpedia-ref-lookup.service';

describe('DbpediaRefLookupService', () => {
  let service: DbpediaRefLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DbpediaRefLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
