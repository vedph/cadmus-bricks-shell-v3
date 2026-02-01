import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ViafService } from './viaf.service';

describe('ViafService', () => {
  let service: ViafService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ViafService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
