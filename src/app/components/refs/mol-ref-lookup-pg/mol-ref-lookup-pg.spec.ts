import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MolRefLookupPg } from './mol-ref-lookup-pg';

describe('MolRefLookupPg', () => {
  let component: MolRefLookupPg;
  let fixture: ComponentFixture<MolRefLookupPg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MolRefLookupPg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MolRefLookupPg);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
