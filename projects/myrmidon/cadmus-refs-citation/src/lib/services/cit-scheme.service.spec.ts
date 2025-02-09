import { TestBed } from '@angular/core/testing';

import { CitSchemeService } from './cit-scheme.service';

describe('CitSchemeService', () => {
  let service: CitSchemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CitSchemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
