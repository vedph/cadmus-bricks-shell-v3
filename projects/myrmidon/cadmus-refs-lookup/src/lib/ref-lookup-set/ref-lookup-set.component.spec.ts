import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefLookupSetComponent } from './ref-lookup-set.component';

describe('RefLookupSetComponent', () => {
  let component: RefLookupSetComponent;
  let fixture: ComponentFixture<RefLookupSetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RefLookupSetComponent]
    });
    fixture = TestBed.createComponent(RefLookupSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
