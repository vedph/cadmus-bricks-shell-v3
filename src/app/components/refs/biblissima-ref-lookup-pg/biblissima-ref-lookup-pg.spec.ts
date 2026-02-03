import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiblissimaRefLookupPg } from './biblissima-ref-lookup-pg';

describe('BiblissimaRefLookupPg', () => {
  let component: BiblissimaRefLookupPg;
  let fixture: ComponentFixture<BiblissimaRefLookupPg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiblissimaRefLookupPg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiblissimaRefLookupPg);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
