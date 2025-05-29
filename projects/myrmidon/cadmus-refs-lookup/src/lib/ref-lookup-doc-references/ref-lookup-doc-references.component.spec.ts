import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LookupDocReferencesComponent } from './ref-lookup-doc-references.component';

describe('LookupDocReferencesComponent', () => {
  let component: LookupDocReferencesComponent;
  let fixture: ComponentFixture<LookupDocReferencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LookupDocReferencesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LookupDocReferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
