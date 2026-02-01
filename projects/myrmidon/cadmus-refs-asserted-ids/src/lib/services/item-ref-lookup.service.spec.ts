import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ItemRefLookupService } from './item-ref-lookup.service';

describe('ItemRefLookupService', () => {
  let service: ItemRefLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemRefLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
