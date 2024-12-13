import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalMeasurementSetComponent } from './physical-measurement-set.component';

describe('PhysicalSizeSetComponent', () => {
  let component: PhysicalMeasurementSetComponent;
  let fixture: ComponentFixture<PhysicalMeasurementSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalMeasurementSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
