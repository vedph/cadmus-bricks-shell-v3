import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssertionComponent } from './assertion.component';

describe('AssertionComponent', () => {
  let component: AssertionComponent;
  let fixture: ComponentFixture<AssertionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ AssertionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssertionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
