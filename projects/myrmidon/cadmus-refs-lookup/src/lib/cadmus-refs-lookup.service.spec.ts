import { TestBed } from '@angular/core/testing';

import { CadmusRefsLookupService } from './cadmus-refs-lookup.service';

describe('CadmusRefsLookupService', () => {
  let service: CadmusRefsLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CadmusRefsLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
