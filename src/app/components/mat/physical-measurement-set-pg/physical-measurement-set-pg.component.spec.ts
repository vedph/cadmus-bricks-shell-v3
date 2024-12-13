import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalMeasurementSetPgComponent } from './physical-measurement-set-pg.component';

describe('PhysicalSizeSetPgComponent', () => {
  let component: PhysicalMeasurementSetPgComponent;
  let fixture: ComponentFixture<PhysicalMeasurementSetPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalMeasurementSetPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementSetPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
