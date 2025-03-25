import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LookupDocReferenceComponent } from './ref-lookup-doc-reference.component';

describe('LookupDocReferenceComponent', () => {
  let component: LookupDocReferenceComponent;
  let fixture: ComponentFixture<LookupDocReferenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LookupDocReferenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LookupDocReferenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
