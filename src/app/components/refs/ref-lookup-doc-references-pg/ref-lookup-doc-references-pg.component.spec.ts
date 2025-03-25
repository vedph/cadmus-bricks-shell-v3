import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefLookupDocReferencesPgComponent } from './ref-lookup-doc-references-pg.component';

describe('RefLookupDocReferencesPgComponent', () => {
  let component: RefLookupDocReferencesPgComponent;
  let fixture: ComponentFixture<RefLookupDocReferencesPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefLookupDocReferencesPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RefLookupDocReferencesPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
