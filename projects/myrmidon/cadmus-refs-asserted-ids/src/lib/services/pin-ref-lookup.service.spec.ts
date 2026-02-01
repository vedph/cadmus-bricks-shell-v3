import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PinRefLookupService } from './pin-ref-lookup.service';

describe('PinRefLookupService', () => {
  let service: PinRefLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PinRefLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
