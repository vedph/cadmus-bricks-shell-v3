import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Zotero } from './zotero';

describe('Zotero', () => {
  let service: Zotero;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Zotero);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
