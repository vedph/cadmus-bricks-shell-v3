import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalGridLocationComponent } from './physical-grid-location.component';

describe('PhysicalGridLocationComponent', () => {
  let component: PhysicalGridLocationComponent;
  let fixture: ComponentFixture<PhysicalGridLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalGridLocationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalGridLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
