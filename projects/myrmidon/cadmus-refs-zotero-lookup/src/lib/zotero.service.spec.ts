import { TestBed } from '@angular/core/testing';

import { Zotero } from './zotero';

describe('Zotero', () => {
  let service: Zotero;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Zotero);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
