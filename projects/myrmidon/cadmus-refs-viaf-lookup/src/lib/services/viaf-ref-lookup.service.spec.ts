import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ViafRefLookupService } from './viaf-ref-lookup.service';

describe('ViafRefLookupService', () => {
  let service: ViafRefLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ViafRefLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
