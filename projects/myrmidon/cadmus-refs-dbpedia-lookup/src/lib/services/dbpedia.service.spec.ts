import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DbpediaService } from './dbpedia.service';

describe('DbpediaService', () => {
  let service: DbpediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DbpediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
